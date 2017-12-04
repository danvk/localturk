import * as express from 'express';

export function htmlEntities(str: string) {
  return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
}

/* Does ${k} --> v interpolation */
export function renderTemplate(template: string, data: {[key: string]: string}) {
  return template.replace(/\$\{([^}]*)\}/, (substr, key) => {
    return data[key];
  });
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
