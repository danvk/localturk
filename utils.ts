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
