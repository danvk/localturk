import * as fs from 'fs-extra';

import * as csv from '../csv';

describe('csv', () => {
  it('should read CSV headers', async () => {
    const headers = await csv.readHeaders('./test/test.csv');
    expect(headers).toEqual(['id', 'First', 'Last']);
  });

  it('should read quoted CSV headers', async () => {
    const headers = await csv.readHeaders('./test/quoted.csv');
    expect(headers).toEqual(['id', 'First Name', 'Last,Name']);
  });

  it('should read lines in a simple CSV file', async () => {
    const rows = [];
    for await (const row of csv.readRows('./test/test.csv')) {
      rows.push(row);
    }
    expect(rows).toEqual([
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
    expect(rows).toEqual([
      ['id', 'First Name', 'Last,Name'],
      ['1', 'Jane\nDoe', 'Doe'],
      ['2', 'John', 'Doer\nQuoter'],
    ]);
  });

  it('should read line from a CSV file without a trailing newline', async () => {
    const rows = [];
    for await (const row of csv.readRows('./sample/outputs.csv')) {
      rows.push(row);
    }
    expect(rows).toEqual([
      ['image1', 'image2', 'line1', 'line2'],
      [
        'images/0.png',
        'images/1.png',
        'Lorem ipsum dolor sit amet, consectetur adipsiscing elit.',
        'Integer vulputate augue a sem pellentesque pharetra.',
      ],
    ]);
  });

  const read = (file: string) => fs.readFile(file, {encoding: 'utf8'});
  const ensureDeleted = async (file: string) => {
    try {
      await fs.unlink(file);
    } catch (e) {}
  };

  it('should write a CSV file', async () => {
    const rows = [
      ['id', 'First', 'Last'],
      ['1', 'Jane', 'Doe'],
      ['2', 'Dan', 'VK'],
    ];
    await csv.writeCsv('/tmp/test.csv', rows);
    const data = await read('/tmp/test.csv');
    expect(data).toEqual('id,First,Last\n' + '1,Jane,Doe\n' + '2,Dan,VK\n');
  });

  it('should write a complex CSV file', async () => {
    const rows = [
      ['id', 'First,Last', 'Last,First'],
      ['1', 'Jane,Doe', 'Doe,Jane'],
      ['2', 'Dan,\nVK', 'VK,Dan'],
    ];
    await csv.writeCsv('/tmp/test.csv', rows);
    const data = await read('/tmp/test.csv');
    expect(data).toEqual(
      'id,"First,Last","Last,First"\n' + '1,"Jane,Doe","Doe,Jane"\n' + '2,"Dan,\nVK","VK,Dan"\n',
    );
  });

  it('should write a fresh CSV file', async () => {
    await ensureDeleted('/tmp/test.csv');
    await csv.appendRow('/tmp/test.csv', {a: '1', b: '2'});
    expect(await read('/tmp/test.csv')).toEqual('a,b\n1,2\n');
  });

  it('should append to a CSV file', async () => {
    await ensureDeleted('/tmp/test.csv');
    await csv.appendRow('/tmp/test.csv', {a: '1', b: '2'});
    await csv.appendRow('/tmp/test.csv', {b: '1', a: '2'});
    expect(await read('/tmp/test.csv')).toEqual('a,b\n1,2\n2,1\n');
  });

  it('should append a column to a CSV file', async () => {
    await ensureDeleted('/tmp/test.csv');
    await csv.appendRow('/tmp/test.csv', {a: '1', b: '2'});
    expect(await read('/tmp/test.csv')).toEqual('a,b\n1,2\n');
    await csv.appendRow('/tmp/test.csv', {b: '1', a: '2'});
    expect(await read('/tmp/test.csv')).toEqual('a,b\n1,2\n2,1\n');
    await csv.appendRow('/tmp/test.csv', {b: '3', c: '4'});
    expect(await read('/tmp/test.csv')).toEqual('a,b,c\n1,2,\n2,1,\n,3,4\n');
  });

  it('should append to a CSV file without trailing newline', async () => {
    fs.copyFileSync('./sample/outputs.csv', '/tmp/test.csv');
    await csv.appendRow('/tmp/test.csv', {
      image1: 'a.png',
      image2: 'b.png',
      line1: 'line1',
      line2: 'line2',
    });
    const rows = [];
    for await (const row of csv.readRows('/tmp/test.csv')) {
      rows.push(row);
    }
    expect(rows).toEqual([
      ['image1', 'image2', 'line1', 'line2'],
      [
        'images/0.png',
        'images/1.png',
        'Lorem ipsum dolor sit amet, consectetur adipsiscing elit.',
        'Integer vulputate augue a sem pellentesque pharetra.',
      ],
      ['a.png', 'b.png', 'line1', 'line2'],
    ]);
  });

  it('should remove a row from a complex CSV file', async () => {
    const rows = [
      ['id', 'First,Last', 'Last,First'],
      ['1', 'Jane,Doe', 'Doe,Jane'],
      ['2', 'Dan,\nVK', 'VK,Dan'],
    ];
    await csv.writeCsv('/tmp/test.csv', rows);
    const deleted = await csv.deleteLastRow('/tmp/test.csv');
    expect(deleted).toEqual(['2', 'Dan,\nVK', 'VK,Dan']);
    const data = await read('/tmp/test.csv');
    expect(data).toEqual('id,"First,Last","Last,First"\n' + '1,"Jane,Doe","Doe,Jane"\n');
  });

  it('should read rows from a CSV file with Windows line endings', async () => {
    const rows = [];
    for await (const row of csv.readRows('./test/windows.csv')) {
      rows.push(row);
    }
    expect(rows).toEqual([
      ['A', 'B'],
      ['1', '2'],
    ]);
  });

  it('should append to a CSV file with Windows line endings', async () => {
    fs.copyFileSync('./test/windows.csv', '/tmp/test.csv');
    expect(csv.detectLineEnding('/tmp/test.csv')).toEqual('\r\n');
    await csv.appendRow('/tmp/test.csv', {A: '3', B: '4'});
    expect(await read('/tmp/test.csv')).toEqual(`A,B\r\n1,2\r\n3,4\r\n`);
  });

  it('should append to a CSV file with Windows line endings and no trailing newline', async () => {
    fs.writeFileSync('/tmp/test.csv', `A,B\r\n1,2`);
    expect(csv.detectLineEnding('/tmp/test.csv')).toEqual('\r\n');
    expect(await read('/tmp/test.csv')).toEqual(`A,B\r\n1,2`); // no trailing newline
    await csv.appendRow('/tmp/test.csv', {A: '3', B: '4'});
    expect(await read('/tmp/test.csv')).toEqual(`A,B\r\n1,2\r\n3,4\r\n`);
  });

  it('should preserve line endings when adding a new column', async () => {
    fs.copyFileSync('./test/windows.csv', '/tmp/test.csv');
    await csv.appendRow('/tmp/test.csv', {A: '3', C: '4'});
    expect(await read('/tmp/test.csv')).toEqual(`A,B,C\r\n1,2,\r\n3,,4\r\n`);
  });
});
