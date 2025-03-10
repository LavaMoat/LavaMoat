#!/bin/bash

node ../../src/cli.js --projectRoot=./npm
echo "_________________________________________________________ exit" $?
node ../../src/cli.js --projectRoot=./npm-workspaces
echo "_________________________________________________________ exit" $?
node ../../src/cli.js --projectRoot=./npm-realistic
echo "_________________________________________________________ exit" $?
node ../../src/cli.js --projectRoot=./yarn-berry
echo "_________________________________________________________ exit" $?
node ../../src/cli.js --projectRoot=./yarn-berry-realistic
echo "_________________________________________________________ exit" $?
node ../../src/cli.js --projectRoot=./yarn-classic
echo "_________________________________________________________ exit" $?
node ../../src/cli.js --projectRoot=./yarn-classic-nopackage
echo "_________________________________________________________ exit" $?
node ../../src/cli.js --projectRoot=./yarn-classic-realistic
echo "_________________________________________________________ exit" $?
node ../../src/cli.js --projectRoot=./yarn-classic-realistic --ignore=./yarn-classic-realistic/yarn.lock.ignore.json
echo "_________________________________________________________ exit" $?
node ../../src/cli.js --projectRoot=./yarn-mmm
echo "_________________________________________________________ exit" $?