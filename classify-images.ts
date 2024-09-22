#!/usr/bin/env node

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

import child_process from 'child_process';
import escape from 'escape-html';
import fs from 'fs';
import {Command} from 'commander';

import {dedent} from './utils';
import path from 'path';

const temp = require('temp').track();

function list(val: string) {
  return val.split(',');
}

interface CLIArgs {
  port?: number;
  output: string;
  labels: string[];
  shortcuts: string[] | null;
  max_width?: number;
  randomOrder?: boolean;
}

const program = new Command();
program
  .version('2.1.1')
  .usage('[options] /path/to/images/*.jpg | images.txt')
  .option('-p, --port <n>', 'Run on this port (default 4321)', parseInt)
  .option('-o, --output <file>', 'Path to output CSV file (default output.csv)', 'output.csv')
  .option('-l, --labels <csv>', 'Comma-separated list of choices of labels', list, ['Yes', 'No'])
  .option(
    '--shortcuts <a,b,c>',
    'Comma-separated list of keyboard shortcuts for labels. Default is 1, 2, etc.',
    list,
    null,
  )
  .option(
    '-w, --max_width <pixels>',
    'Make the images this width when displaying in-browser',
    parseInt,
  )
  .option(
    '-r, --random-order',
    'Serve images in random order, rather than sequentially. This is useful for ' +
      'generating valid subsamples or for minimizing collisions during group localturking.',
  )
  .parse();

if (program.args.length == 0) {
  console.error('You must specify at least one image file!\n');
  program.help(); // exits
}
const options = program.opts<CLIArgs>();
let {shortcuts} = options;
if (!shortcuts) {
  shortcuts = options.labels.map((_, idx) => (idx + 1).toString());
} else if (shortcuts.length !== options.labels.length) {
  console.error('Number of shortcuts must match number of labels');
  process.exit(1);
}

if (fs.existsSync(options.output)) {
  console.warn(dedent`
    Output file ${options.output} already exists.
    Its contents will be assumed to be previously-generated labels.
    If you want to start from scratch, either delete this file,
    rename it or specify a different output via --output`);
}

const csvInfo = temp.openSync({suffix: '.csv'});
const templateInfo = temp.openSync({suffix: '.html'});

let staticDir: string | null = null;
let images = program.args;
if (images.length === 1 && images[0].endsWith('.txt')) {
  fs.writeSync(csvInfo.fd, 'path\n');
  fs.writeSync(csvInfo.fd, fs.readFileSync(images[0], 'utf8'));
} else {
  const anyOutsideCwd = images.some(p => path.isAbsolute(p) || p.startsWith('..'));
  if (anyOutsideCwd) {
    staticDir = path.dirname(images[0]);
    images = images.map(p => path.relative(staticDir!, p));
  } else {
    staticDir = '.';
  }
  fs.writeSync(csvInfo.fd, 'path\n' + images.join('\n') + '\n');
}
fs.closeSync(csvInfo.fd);

// Add keyboard shortcuts. 1=first button, etc.
const buttonsHtml = options.labels
  .map((label, idx) => {
    const buttonText = `${label} (${shortcuts[idx]})`;
    return `<button type="submit" data-key='${shortcuts[idx]}' name="label" value="${label}">${escape(buttonText)}</button>`;
  })
  .join('&nbsp;');

const widthHtml = options.max_width ? ` width="${options.max_width}"` : '';
const undoHtml = dedent`
    </form>
    <form action="/delete-last" method="POST" style="display: inline-block">
      <input type="submit" id="undo-button" data-key="z" value="Undo Last (z)">
    </form>`;
let html = buttonsHtml + undoHtml + '\n<p><img src="${path}" ' + widthHtml + '></p>';

html += dedent`
    <style>
      form { display: inline-block; }
      #undo-button { margin-left: 20px; }
    </style>`;

fs.writeSync(templateInfo.fd, html);
fs.closeSync(templateInfo.fd);

const opts = [];
if (staticDir) {
  opts.push('--static-dir', staticDir);
}
if (options.port) {
  opts.push('--port', options.port.toString());
}
if (options.randomOrder) {
  opts.push('--random-order');
}
const bin = ['localturk'];
// const bin = ['yarn', 'ts-node', 'localturk.ts'];
const args = [...bin, ...opts, templateInfo.path, csvInfo.path, options.output];
console.log('Running ', args.join(' '));
child_process.spawn(args[0], args.slice(1), {stdio: 'inherit'});
