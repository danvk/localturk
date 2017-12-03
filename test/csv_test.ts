import * as fs from 'fs-extra';

import * as csv from '../csv';

import {expect} from 'chai';

describe('csv', () => {
  it('should read CSV headers', async () => {
    const headers = await csv.readHeaders('./test/test.csv');
    expect(headers).to.deep.equal([
      'id',
      'First',
      'Last'
    ]);
  });

  it('should read quoted CSV headers', async () => {
    const headers = await csv.readHeaders('./test/quoted.csv');
    expect(headers).to.deep.equal([
      'id',
      'First Name',
      'Last,Name'
    ]);
  });

  it('should read lines in a simple CSV file', async () => {
    const rows = [];
    for await (const row of csv.readRows('./test/test.csv')) {
      rows.push(row);
    }
    expect(rows).to.deep.equal([
      ['id', 'First', 'Last'],
      ['1', 'Jane', 'Doe'],
      ['2', 'John', 'Doer'],
    ]);
  });

  it('should read lines in a complex CSV file', async () => {
    const rows = [];
    for await (const row of csv.readRows('./test/quoted.csv')) {
      rows.push(row);
    }
    expect(rows).to.deep.equal([
      ['id', 'First Name', 'Last,Name'],
      ['1', 'Jane\nDoe', 'Doe'],
      ['2', 'John', 'Doer\nQuoter'],
    ]);
  });
});
