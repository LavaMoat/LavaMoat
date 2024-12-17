#!/bin/bash

time node ../../src/cli.js ./yarn.lock
echo "_________________________________________________________ exit" $?
time node ../../src/cli.js ./yarn.lock --ignore=yarn.lock.ignore.json
echo "_________________________________________________________ exit" $?
time node ../../src/cli.js ./yarn2.lock --type yarn
echo "_________________________________________________________ exit" $?
time node ../../src/cli.js ./package-lock.json
echo "_________________________________________________________ exit" $?