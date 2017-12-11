/**
 * This is an optimization for a common use case of localturk: classifying
 * images. When you use this script, you can skip creating a CSV file of inputs
 * and an HTML template.
 *
 * Usage:
 *
 *   classify-images -o labels.csv --labels Yes,No,Maybe *.jpg
 *
 * This will present a web UI for classifying each image and put the output in
 * labels.csv.
 */

import * as child_process from 'child_process';
import * as escape from 'escape-html';
import * as fs from 'fs';
import * as program from 'commander';

import {dedent} from './utils';

const temp = require('temp').track();

function list(val) {
  return val.split(',');
}

program
  .version('2.0.2')
  .usage('[options] /path/to/images/*.jpg')
  .option('-o, --output <file>',
          'Path to output CSV file (default output.csv)', 'output.csv')
  .option('-l, --labels <csv>',
          'Comma-separated list of choices of labels', list, ['Yes', 'No'])
  .option('-w, --max_width <pixels>',
          'Make the images this width when displaying in-browser', parseInt)
  .parse(process.argv)

if (program.args.length == 0) {
  console.error('You must specify at least one image file!\n');
  program.help();  // exits
}

if (fs.existsSync(program.output)) {
  console.warn(dedent`
    Output file ${program.output} already exists.
    Its contents will be assumed to be previously-generated labels.
    If you want to start from scratch, either delete this file,
    rename it or specify a different output via --output`);
}

const csvInfo = temp.openSync({suffix: '.csv'});
const templateInfo = temp.openSync({suffix: '.html'});

fs.writeSync(csvInfo.fd, 'path\n' + program.args.join('\n') + '\n');
fs.closeSync(csvInfo.fd);

const buttonsHtml = program.labels.map((label, idx) => {
  const buttonText = `${label} (${1 + idx})`;
  return `<button type="submit" data-key='${1+idx}' name="label" value="${label}">${escape(buttonText)}</button>`;
}).join('&nbsp;');

const widthHtml = program.max_width ? ` width="${program.max_width}"` : '';
const undoHtml = dedent`
    </form>
    <form action="/delete-last" method="POST" style="display: inline-block">
      <input type="submit" id="undo-button" data-key="z" value="Undo Last (z)">
    </form>`;
let html = buttonsHtml + undoHtml + '\n<p><img src="${path}" ' + widthHtml + '></p>';

// Add keyboard shortcuts. 1=first button, etc.
html += dedent`
    <style>
      form { display: inline-block; }
      #undo-button { margin-left: 20px; }
    </style>`;

fs.writeSync(templateInfo.fd, html);
fs.closeSync(templateInfo.fd);

const args = ['localturk', '--static-dir', '.', templateInfo.path, csvInfo.path, program.output];
console.log('Running ', args.join(' '));
child_process.spawn(args[0], args.slice(1), {stdio: 'inherit'});
