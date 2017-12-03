#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var program = require("commander");
program
    .version('2.0.0')
    .usage('[options] template.html tasks.csv outputs.csv')
    .option('-p, --port <n>', 'Run on this port (default 4321)', parseInt)
    .option('-w, --write_template', 'Generate a stub template file based on the input CSV.')
    .parse(process.argv);
var args = program.args;
if (3 !== args.length) {
    program.help();
}
var templateFile = args[0], tasksFile = args[1], outputsFile = args[2];
var port = program.port || 4321;
