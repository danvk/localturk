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

  it('should write a CSV file', async () => {
    const rows = [
      ['id', 'First', 'Last'],
      ['1', 'Jane', 'Doe'],
      ['2', 'Dan', 'VK']
    ];
    await csv.writeCsv('/tmp/test.csv', rows);
    const data = await fs.readFile('/tmp/test.csv', {encoding: 'utf8'});
    expect(data).to.equal(
      'id,First,Last\n' +
      '1,Jane,Doe\n' +
      '2,Dan,VK\n'
    );
  });

  it('should write a complex CSV file', async () => {
    const rows = [
      ['id', 'First,Last', 'Last,First'],
      ['1', 'Jane,Doe', 'Doe,Jane'],
      ['2', 'Dan,\nVK', 'VK,Dan']
    ];
    await csv.writeCsv('/tmp/test.csv', rows);
    const data = await fs.readFile('/tmp/test.csv', {encoding: 'utf8'});
    expect(data).to.equal(
      'id,"First,Last","Last,First"\n' +
      '1,"Jane,Doe","Doe,Jane"\n' +
      '2,"Dan,\nVK","VK,Dan"\n'
    );
  });
});
