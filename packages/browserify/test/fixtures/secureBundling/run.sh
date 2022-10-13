#!/bin/bash
set -e

if [ "$WRITE_AUTO_POLICY" == "1" ]; then
  ../node/src/cli.js test/fixtures/secureBundling/build.js --projectRoot './' --policyPath test/fixtures/secureBundling/lavamoat/node/policy.json --writeAutoPolicy
else
  ../node/src/cli.js test/fixtures/secureBundling/build.js --projectRoot './' --policyPath test/fixtures/secureBundling/lavamoat/node/policy.json
fi