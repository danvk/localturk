import * as csvParse from 'csv-parse';
import * as fs from 'fs';

if (!(Symbol as any)['asyncIterator']) {
  (Symbol as any)['asyncIterator'] = Symbol();
}

const csvOptions: csvParse.Options = {
  skip_empty_lines: true
};

/** Read just the headers from a CSV file. */
export async function readHeaders(file: string) {
  const parser = csvParse(csvOptions);
  const stream = fs.createReadStream(file, 'utf8');
  return new Promise((resolve, reject) => {
    parser.on('data', (row: string[]) => {
      resolve(row);
      parser.pause();
      stream.destroy();
    });
    parser.on('error', reject);
    stream.pipe(parser);
  });
}

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
  return ('then' in x);
}

/** Read a CSV file line-by-line. */
export async function* readRows(file: string) {
  const parser = csvParse(csvOptions);
  const stream = fs.createReadStream(file, 'utf8');

  let isDone = false;
  let dataCallback;
  const mkBarrier = () => new Promise<void>((resolve, reject) => {
    dataCallback = resolve;
  });

  // TODO(danvk): use a deque
  const rows: (RowResult|Promise<void>)[] = [mkBarrier()];
  parser.on('readable', () => {
    let row;
    while (row = parser.read()) {
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

  while (rows.length) {
    const row = rows.shift();
    if (isPromise(row)) {
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

/**
 * Append one row to a CSV file.
 *
 * If the row contains a new header, the entire file will be rewritten.
 */
export async function appendRow(file: string, row: {[column: string]: string}) {

}
