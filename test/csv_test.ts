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
});
