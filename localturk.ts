#!/usr/bin/env node

/**
 * "Local Turk" server for running Mechanical Turk-like tasks locally.
 *
 * Usage:
 *
 *   localturk [--options] template.html tasks.csv outputs.csv
 */

import * as express from 'express';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as program from 'commander';
import * as open from 'open';

program
  .version('2.0.0')
  .usage('[options] template.html tasks.csv outputs.csv')
  .option('-p, --port <n>', 'Run on this port (default 4321)', parseInt)
  .option('-w, --write_template', 'Generate a stub template file based on the input CSV.')
  .parse(process.argv);

const {args} = program;
if (3 !== args.length) {
  program.help();
}

const [templateFile, tasksFile, outputsFile] = args;
const port = program.port || 4321;
