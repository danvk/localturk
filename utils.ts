import * as express from 'express';
import * as _ from 'lodash';

export function htmlEntities(str: string) {
  return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
}

type Task = {[key: string]: string};

/** Does ${k} --> v interpolation */
export function renderTemplate(template: string, data: Task) {
  return template.replace(/\$\{([^}]*)\}/g, (substr, key) => {
    return data[key];
  });
}

/** Are all the (k, v) pairs in b also in a? */
export function isSupersetOf(a: any, b: any) {
  for (const k in b) {
    if (!(k in a)) return false;
    if (a[k] !== b[k]) return false;
  }
  return true;
}

/** Normalize newlines in values, replacing \r\n and \r with \n */
export function normalizeValues(obj: Task) {
  return _.mapValues(obj, v => v.replace(/\r\n/g, '\n').replace(/\r/g, '\n'));
}

/**
 * Ensure that rejected promises returned from an express RequestHandler become error responses.
 *
 * This is helpful if you want to use async/await in express get/post handlers:
 *
 *     app.get('/path', wrapPromise(async (request, response) => { ... }))
 */
export function wrapPromise(
  handler: (
    request: express.Request,
    response: express.Response,
    next: express.NextFunction,
  ) => Promise<any>,
): express.RequestHandler {
  return (request, response, next) => {
    handler(request, response, next).catch(e => {
      console.error(e);
      next(e);
    });
  };
}
