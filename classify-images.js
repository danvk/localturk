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

var fs = require('fs');
var program = require('commander');
var temp = require('temp').track();
var child_process = require('child_process');

function list(val) {
  return val.split(',');
}

program
  .version('1.1.0')
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
  console.warn('Output file ' + program.output + ' already exists.');
  console.warn('Its contents will be assumed to be previously-generated labels.');
  console.warn('If you want to start from scratch, either delete this file,');
  console.warn('rename it or specify a different output via --output.\n');
}

var csvInfo = temp.openSync({suffix: '.csv'}),
    templateInfo = temp.openSync({suffix: '.html'});

fs.writeSync(csvInfo.fd, 'path\n' + program.args.join('\n') + '\n');
fs.closeSync(csvInfo.fd);

var buttonsHtml = program.labels.map(function(label) {
  return '<input type="submit" name="type" value="' + label + '">'
}).join('&nbsp;');
var widthHtml = program.max_width ? ' width="' + program.max_width + '"' : '';
var html = buttonsHtml + '\n<p><img src="${path}" ' + widthHtml + '></p>';

fs.writeSync(templateInfo.fd, html);
fs.closeSync(templateInfo.fd);

var args = ['localturk', '-q', '--static_dir', '.', templateInfo.path, csvInfo.path, program.output];
console.log('Running ', args.join(' '));
child_process.spawn(args[0], args.slice(1), {stdio: 'inherit'});
