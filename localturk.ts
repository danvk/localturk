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
import open = require('open');

import * as csv from './csv';
import * as utils from './utils';

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

type Task = {[key: string]: string};

async function renderTemplate(templateFile: string, task: Task) {
  let template = await fs.readFile(templateFile, {encoding: 'utf8'});
  const fullDict = {};
  for (const k in task) {
    fullDict[k] = utils.htmlEntities(task[k]);
  }
  fullDict['ALL_JSON'] = utils.htmlEntities(JSON.stringify(task, null, 2));
  fullDict['ALL_JSON_RAW'] = JSON.stringify(task);
  return utils.renderTemplate(template, fullDict);
}

