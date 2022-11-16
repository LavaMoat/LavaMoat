#!/usr/bin/env node

//@ts-check

const { protectProject } = require('./index.js')

const command = process.argv[2]

switch (command) {
  case "project":
    protectProject()

  break;
  case "env":
  case "devenv":
  case "dev":

  break;
  default:
    console.log('Choose one of the subcommands: project devenv')
}