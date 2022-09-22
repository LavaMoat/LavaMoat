#!/bin/bash
set -e

if [ "$WRITE_AUTO_POLICY" == "1" ]; then
  ../../../../node/src/cli.js build.js --projectRoot '../../../' --writeAutoPolicy
else
  ../../../../node/src/cli.js build.js --projectRoot '../../../'
fi