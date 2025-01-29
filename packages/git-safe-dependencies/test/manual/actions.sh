#!/bin/bash

time node ../../src/cli-actions.js --workflows=./workflows
echo "_________________________________________________________ exit" $?

time node ../../src/cli-actions.js --workflows=./workflows2 --ignore=./workflows2/ignore.json
echo "_________________________________________________________ exit" $?