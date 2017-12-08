import * as utils from '../utils';

import {expect} from 'chai';

describe('utils', () => {
  it('should render a template', () => {
    expect(utils.renderTemplate('blah ${x} blah', {x: 'blah'})).to.equal('blah blah blah');
  });

  it('should render the same value repeatedly', () => {
    expect(utils.renderTemplate('${x} ${x} ${x}', {x: 'blah'})).to.equal('blah blah blah');
  });

  it('should escape html entities', () => {
    expect(utils.htmlEntities('&<>')).to.equal('&amp;&lt;&gt;');
  });

  it('should normalize newlines', () => {
    expect(utils.normalizeValues({
      a: 'foo\nbar',
      b: 'foo\r\nbar',
      c: 'foo\rbar'
    })).to.deep.equal({
      a: 'foo\nbar',
      b: 'foo\nbar',
      c: 'foo\nbar'
    });
  });

  it('should determine supersets', () => {
    expect(utils.isSupersetOf({}, {})).to.be.true;
    expect(utils.isSupersetOf({a: 1}, {a: 1})).to.be.true;
    expect(utils.isSupersetOf({a: 1, b: 2}, {a: 1})).to.be.true;
    expect(utils.isSupersetOf({a: 1}, {a: 1, b: 2})).to.be.false;
    expect(utils.isSupersetOf({a: 1}, {a: 2})).to.be.false;
  });
});
