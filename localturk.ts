#!/usr/bin/env node

/**
 * "Local Turk" server for running Mechanical Turk-like tasks locally.
 *
 * Usage:
 *
 *   localturk [--options] template.html tasks.csv outputs.csv
 */

import errorhandler from 'errorhandler';
import express from 'express';
import serveStatic from 'serve-static';
import fs from 'fs-extra';
import path from 'path';
import {Command} from 'commander';
import open from 'open';
import Reservoir from 'reservoir';
import _ from 'lodash';

import * as csv from './csv';
import {makeTemplate} from './sample-template';
import * as utils from './utils';

function collect(val: string, memo: Record<string, string>) {
  const idx = val.indexOf('=');
  if (idx === -1) {
    throw new Error('Expected --var key=value');
  }
  const key = val.slice(0, idx);
  const value = val.slice(idx + 1);
  memo[key] = value;
  return memo;
}

interface CLIArgs {
  port: number;
  var: Record<string, string>;
  staticDir: string;
  randomOrder: boolean;
  writeTemplate: boolean;
}

const program = new Command() as (Command & CLIArgs);

program
  .version('2.1.1')
  .usage('[options] template.html tasks.csv outputs.csv')
  .option('-p, --port <n>', 'Run on this port (default 4321)', parseInt)
  .option('--var <items>', 'Provide additional varibles to the template. Maybe be specified multiple times.', collect, {})
  .option('-s, --static-dir <dir>',
          'Serve static content from this directory. Default is same directory as template file.')
  .option('-r, --random-order',
          'Serve images in random order, rather than sequentially. This is useful for ' +
          'generating valid subsamples or for minimizing collisions during group localturking.')
  .option('-w, --write-template', 'Generate a stub template file based on the input CSV.')
  .parse(process.argv);

const {args, randomOrder, writeTemplate} = program;
if (!((3 === args.length && !writeTemplate) ||
     (1 === args.length && writeTemplate))) {
  program.help();
}
if (writeTemplate) {
  // tasks.csv is the only input with --write-template.
  args.unshift('');
  args.push('');
}

const [templateFile, tasksFile, outputsFile] = args;
const port = program.port || 4321;
// --static-dir is particularly useful for classify-images, where the template file is in a
// temporary directory but the image files could be anywhere.
const staticDir = program['staticDir'] || path.dirname(templateFile);

type Task = {[key: string]: string};
let flash = '';  // this is used to show warnings in the web UI.

async function renderTemplate({task, numCompleted, numTotal}: TaskStats) {
  const template = await fs.readFile(templateFile, {encoding: 'utf8'});
  const fullDict: Record<string, string> = {};
  for (const k in task) {
    fullDict[k] = utils.htmlEntities(task[k]);
  }
  // Note: these two fields are not available in mechanical turk.
  fullDict['ALL_JSON'] = utils.htmlEntities(JSON.stringify(task, null, 2));
  fullDict['ALL_JSON_RAW'] = JSON.stringify(task);
  for (var [k, v] of Object.entries(program.var)) {
    fullDict[k] = utils.htmlEntities(v as string);
  }
  const userHtml = utils.renderTemplate(template, fullDict);

  const thisFlash = flash;
  flash = '';

  const sourceInputs = _.map(task, (v, k) =>
      `<input type=hidden name="${k}" value="${utils.htmlEntities(v)}">`
    ).join('\n');

  return utils.dedent`
    <!doctype html>
    <html>
    <title>${numCompleted} / ${numTotal} - localturk</title>
    <body><form action=/submit method=post>
    <p>${numCompleted} / ${numTotal} <span style="background: yellow">${thisFlash}</span></p>
    ${sourceInputs}
    ${userHtml}
    <hr/><input type=submit />
    </form>
    <script>
    // Support keyboard shortcuts via, e.g. <.. data-key="1" />
    window.addEventListener("keydown", function(e) {
      if (document.activeElement !== document.body) return;
      var key = e.key;
      const el = document.querySelector('[data-key="' + key + '"]');
      if (el) {
        e.preventDefault();
        el.click();
      }
    });
    </script>
    </body>
    </html>
  `;
}

async function readCompletedTasks(): Promise<Task[]> {
  if (!fs.pathExistsSync(outputsFile)) return [];
  return csv.readAllRowObjects(outputsFile);
}

function isTaskCompleted(task: Task, completedTasks: readonly Task[]) {
  const normTask = utils.normalizeValues(task);
  for (const d of completedTasks) {
    if (utils.isSupersetOf(d, normTask)) return true;
  }
  return false;
}

async function checkTaskOutput(task: Task) {
  // Check whether the output has any keys that aren't in the input.
  // This is a common mistake that can happen if you forget to set a name on
  // your form elements.
  const headers = await csv.readHeaders(tasksFile);
  for (const k in task) {
    if (headers.indexOf(k) === -1) return;  // there's a new key.
  }
  flash = 'No new keys in output. Make sure your &lt;input&gt; elements have "name" attributes';
}

interface TaskStats {
  task?: Task;
  numCompleted: number;
  numTotal: number;
}

async function getNextTask(): Promise<TaskStats> {
  const completedTasks = (await readCompletedTasks()).map(utils.normalizeValues);
  let sampler = randomOrder ? Reservoir<Task>() : null;
  let nextTask: Task | undefined;
  let numTotal = 0;
  for await (const task of csv.readRowObjects(tasksFile)) {
    numTotal++;
    if (!sampler && nextTask) {
      continue;  // we're only counting at this point.
    }
    if (isTaskCompleted(utils.normalizeValues(task), completedTasks)) {
      continue;
    }

    if (sampler) {
      sampler.pushSome(task);
    } else {
      nextTask = task;
    }
  }

  return {
    task: sampler ? sampler[0] : nextTask,
    numCompleted: _.size(completedTasks),
    numTotal,
  }
}

const app = express();
app.use(errorhandler());
app.use(express.json({limit: "50mb"}));
app.use(express.urlencoded({limit: "50mb", extended: false, parameterLimit: 50_000}));
app.use(serveStatic(path.resolve(staticDir)));

app.get('/', utils.wrapPromise(async (req, res) => {
  const nextTask = await getNextTask();
  if (nextTask.task) {
    console.log(nextTask.task);
    const html = await renderTemplate(nextTask);
    res.send(html);
  } else {
    res.send('DONE');
    process.exit(0);
  }
}));

app.post('/submit', utils.wrapPromise(async (req, res) => {
  const task: Task = req.body;
  await csv.appendRow(outputsFile, task);
  checkTaskOutput(task);  // sets the "flash" variable with any errors.
  console.log('Saved ' + JSON.stringify(task));
  res.redirect('/');
}));

app.post('/delete-last', utils.wrapPromise(async (req, res) => {
  const row = await csv.deleteLastRow(outputsFile);
  console.log('Deleting', row);
  res.redirect('/');
}));


if (writeTemplate) {
  (async () => {
    const columns = await csv.readHeaders(tasksFile);
    console.log(makeTemplate(columns));
  })().catch(e => {
    console.error(e);
  });
} else {
  app.listen(port);
  const url = `http://localhost:${port}`;
  console.log('Running local turk on', url);
  open(url);
}
