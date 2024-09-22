import * as utils from '../utils';

describe('utils', () => {
  it('should render a template', () => {
    expect(utils.renderTemplate('blah ${x} blah', {x: 'blah'})).toEqual('blah blah blah');
  });

  it('should render the same value repeatedly', () => {
    expect(utils.renderTemplate('${x} ${x} ${x}', {x: 'blah'})).toEqual('blah blah blah');
  });

  it('should escape html entities', () => {
    expect(utils.htmlEntities('&<>')).toEqual('&amp;&lt;&gt;');
  });

  it('should normalize newlines', () => {
    expect(
      utils.normalizeValues({
        a: 'foo\nbar',
        b: 'foo\r\nbar',
        c: 'foo\rbar',
      }),
    ).toEqual({
      a: 'foo\nbar',
      b: 'foo\nbar',
      c: 'foo\nbar',
    });
  });

  it('should determine supersets', () => {
    expect(utils.isSupersetOf({}, {})).toBe(true);
    expect(utils.isSupersetOf({a: 1}, {a: 1})).toBe(true);
    expect(utils.isSupersetOf({a: 1, b: 2}, {a: 1})).toBe(true);
    expect(utils.isSupersetOf({a: 1}, {a: 1, b: 2})).toBe(false);
    expect(utils.isSupersetOf({a: 1}, {a: 2})).toBe(false);
  });
});
