#!/usr/bin/env node

/**
 * "Local Turk" server for running Mechanical Turk-like tasks locally.
 *
 * Usage:
 *
 *   localturk [--options] template.html tasks.csv outputs.csv
 */

import * as bodyParser from 'body-parser';
import * as errorhandler from 'errorhandler';
import * as express from 'express';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as program from 'commander';
import open = require('open');
import * as _ from 'lodash';

import * as csv from './csv';
import * as utils from './utils';
import { outputFile } from 'fs-extra';

program
  .version('2.0.0')
  .usage('[options] template.html tasks.csv outputs.csv')
  .option('-p, --port <n>', 'Run on this port (default 4321)', parseInt)
  .option('-w, --write-template', 'Generate a stub template file based on the input CSV.')
  .parse(process.argv);

const {args} = program;
if (3 !== args.length) {
  program.help();
}

const [templateFile, tasksFile, outputsFile] = args;
const port = program.port || 4321;

type Task = {[key: string]: string};

async function renderTemplate(task: Task) {
  const template = await fs.readFile(templateFile, {encoding: 'utf8'});
  const fullDict = {};
  for (const k in task) {
    fullDict[k] = utils.htmlEntities(task[k]);
  }
  fullDict['ALL_JSON'] = utils.htmlEntities(JSON.stringify(task, null, 2));
  fullDict['ALL_JSON_RAW'] = JSON.stringify(task);
  return utils.renderTemplate(template, fullDict);
}

async function readCompletedTasks(): Promise<Task[]> {
  if (!fs.pathExistsSync(outputsFile)) return [];
  const tasks = [];
  for await (const task of csv.readRowObjects(outputsFile)) {
    tasks.push(task);
  }
  return tasks;
}

function isTaskCompleted(task, completedTasks) {
  for (const d of completedTasks) {
    var match = true;
    for (var k in task) {
      var dNorm = d[k].replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      var taskNorm = task[k].replace(/\r/g, '\n');
      if (!(k in d) || dNorm != taskNorm) {
        match = false;
        break;
      }
    }

    if (match) return true;
  }
  return false;
}

interface TaskStats {
  task?: Task;
  numCompleted: number;
  numTotal: number;
}

async function getNextTask(): Promise<TaskStats> {
  const completedTasks = await readCompletedTasks();
  let nextTask: Task;
  let numTotal = 0;
  for await (const task of csv.readRowObjects(tasksFile)) {
    numTotal++;
    if (!nextTask && !isTaskCompleted(task, completedTasks)) {
      nextTask = task;
    }
  }

  return {
    task: nextTask,
    numCompleted: _.size(completedTasks),
    numTotal,
  }
}

if (program['write-template']) {
  // TODO(danvk): implement.
  process.exit(0);
}

const app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(errorhandler());
app.use(express.static(path.resolve(path.dirname(templateFile))));

app.get('/', utils.wrapPromise(async (req, res) => {
  const {task, numCompleted, numTotal} = await getNextTask();
  console.log(task);
  if (task) {
    const templateHtml = await renderTemplate(task);
    const sourceInputs = _.map(task, (v, k) =>
        `<input type=hidden name="${k}" value="${utils.htmlEntities(v)}">`
      ).join('\n');
    const html = `<!doctype html>
    <html>
    <title>${numCompleted} / ${numTotal} - localturk</title>
    <body><form action=/submit method=post>
    <p>${numCompleted} / ${numTotal} </p>
    ${sourceInputs}
    ${templateHtml}
    <hr/><input type=submit />
    </form>
    </body>
    </html>
    `;
    res.send(html);
  } else {
    res.send('DONE');
    process.exit(0);
  }
}));

app.post('/submit', utils.wrapPromise(async (req, res) => {
  const task: Task = req.body;
  await csv.appendRow(outputsFile, task);
  // TODO(danvk): check that task contains non-input keys.
  console.log('Saved ' + JSON.stringify(task));
  res.redirect('/');
}));

app.post('/delete-last', utils.wrapPromise(async (req, res) => {
  const row = await csv.deleteLastRow(outputsFile);
  console.log('Deleting', row);
  res.redirect('/');
}));

app.listen(port);
const url = `http://localhost:${port}`;
console.log('Running local turk on', url);
open(url);
