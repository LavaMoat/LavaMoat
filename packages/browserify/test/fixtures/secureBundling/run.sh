#!/bin/bash
set -e

if [ "$WRITE_AUTO_POLICY" == "1" ]; then
  ../../../../node/src/index.js build.js --projectRoot '../../../' --writeAutoPolicy
else
  ../../../../node/src/index.js build.js --projectRoot '../../../'
fi