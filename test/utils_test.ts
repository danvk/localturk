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
});
