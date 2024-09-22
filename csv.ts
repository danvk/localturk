import csvParse from 'csv-parse';
import {stringify} from 'csv-stringify/sync';
import * as fs from 'fs-extra';

const csvOptions: csvParse.Options = {
  skip_empty_lines: true,
};

interface Row {
  type: 'row';
  value: string[];
}
interface Error {
  type: 'error';
  error: any;
}
interface Done {
  type: 'done';
}
type RowResult = Row | Error | Done;

function isPromise(x: any): x is Promise<any> {
  return 'then' in x;
}

/** Read a CSV file line-by-line. */
export async function* readRows(file: string) {
  const parser = csvParse.parse(csvOptions);
  const stream = fs.createReadStream(file, 'utf8');

  let dataCallback: () => void | undefined;
  const mkBarrier = () =>
    new Promise<void>((resolve, reject) => {
      dataCallback = resolve;
    });

  // TODO(danvk): use a deque
  const rows: (RowResult | Promise<void>)[] = [mkBarrier()];
  parser.on('readable', () => {
    let row;
    while ((row = parser.read())) {
      rows.push({type: 'row', value: row});
    }
    const oldCb = dataCallback;
    rows.push(mkBarrier());
    oldCb();
  });
  parser.on('error', error => {
    rows.push({type: 'error', error});
    parser.pause();
    dataCallback();
  });
  parser.on('finish', () => {
    rows.push({type: 'done'});
    dataCallback();
  });
  stream.pipe(parser);

  while (true) {
    const row = rows.shift();
    if (!row) {
      break;
    } else if (isPromise(row)) {
      await row;
    } else {
      if (row.type === 'row') {
        yield row.value;
      } else if (row.type === 'error') {
        throw new Error(row.error);
      } else if (row.type === 'done') {
        break;
      }
    }
  }
}

/** Read just the headers from a CSV file. */
export async function readHeaders(file: string) {
  for await (const row of readRows(file)) {
    return row;
  }
  throw new Error(`Unexpected empty file: ${file}`);
}

/** Write a CSV file */
export async function writeCsv(file: string, rows: string[][]) {
  // TODO(danvk): make this less memory-intensive
  const output = stringify(rows);
  await fs.writeFile(file, output, {encoding: 'utf8'});
}

/**
 * Append one row to a CSV file.
 *
 * If the row contains a new header, the entire file will be rewritten.
 */
export async function appendRow(file: string, row: {[column: string]: string}) {
  const exists = await fs.pathExists(file);
  if (!exists) {
    // Easy: write the whole file.
    const header = Object.keys(row);
    const rows = [header, header.map(k => row[k])];
    return writeCsv(file, rows);
  }

  const lines = readRows(file);
  const headerRow = await lines.next();
  if (headerRow.done) {
    throw new Error(`CSV file ${file} was empty`);
  }
  const headers = headerRow.value;
  const headerToIndex: {[header: string]: number} = {};
  headers.forEach((header, i) => {
    headerToIndex[header] = i;
  });

  // Check if there are any new headers in the row.
  const newHeaders = [];
  for (const k in row) {
    if (!(k in headerToIndex)) {
      newHeaders.push(k);
    }
  }

  if (newHeaders.length) {
    const fullHeaders = headers.concat(newHeaders);
    const rows = [fullHeaders];
    const emptyCols = newHeaders.map(() => '');
    for await (const row of lines) {
      rows.push(row.concat(emptyCols));
    }
    rows.push(fullHeaders.map(k => row[k] || ''));
    await writeCsv(file, rows);
  } else {
    // write the new row
    const newRow = headers.map(k => row[k] || '');
    await lines.return(); // close the file for reading.
    // Add a newline if the file doesn't end with one.
    const f = fs.openSync(file, 'a+');
    const {size} = fs.fstatSync(f);
    const {buffer} = await fs.read(f, Buffer.alloc(1), 0, 1, size - 1);
    const hasTrailingNewline = buffer[0] == '\n'.charCodeAt(0);
    const lineStr = (hasTrailingNewline ? '' : '\n') + stringify([newRow]);
    await fs.appendFile(f, lineStr);
    await fs.close(f);
  }
}

export async function deleteLastRow(file: string) {
  const rows = [];
  for await (const row of readRows(file)) {
    rows.push(row);
  }
  await writeCsv(file, rows.slice(0, -1));
  return rows[rows.length - 1];
}

export async function* readRowObjects(file: string) {
  let header: string[] | undefined;
  for await (const row of readRows(file)) {
    if (!header) {
      header = row;
    } else {
      const rowObj: {[column: string]: string} = {};
      for (const [i, col] of row.entries()) {
        rowObj[header[i]] = col;
      }
      yield rowObj;
    }
  }
}

export async function readAllRowObjects(file: string) {
  const objs: {[column: string]: string}[] = [];
  for await (const obj of readRowObjects(file)) {
    objs.push(obj);
  }
  return objs;
}
