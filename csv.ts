import * as csvParse from 'csv-parse';
import * as fs from 'fs';

if (!(Symbol as any)['asyncIterator']) {
  (Symbol as any)['asyncIterator'] = Symbol();
}

/** Read just the headers from a CSV file. */
export async function readHeaders(file: string) {
  const parser = csvParse({skip_empty_lines: true});
  const stream = fs.createReadStream(file, 'utf8');
  return new Promise((resolve, reject) => {
    parser.on('data', (row) => {
      resolve(row);
      parser.pause();
      stream.destroy();
    });
    parser.on('error', reject);
    stream.pipe(parser);
  });
}

/** Read a CSV file line-by-line. */
export async function* readRows(file: string) {

}

/**
 * Append one row to a CSV file.
 *
 * If the row contains a new header, the entire file will be rewritten.
 */
export async function appendRow(file: string, row: {[column: string]: string}) {

}
