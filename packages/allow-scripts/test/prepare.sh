#!/bin/sh
for d in ./test/projects/*/
do
  (cd "$d" && ../../../src/cli.js auto --experimental-bins);
done

