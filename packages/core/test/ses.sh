#!/bin/bash
# note this works in bash on windows too.
diff -wq ../../node_modules/ses/dist/lockdown.umd.js ./lib/lockdown.umd.js 
if [[ $? -gt 0 ]]; then
    echo 'ERROR: vendored SES in core differs from dependency.'
    echo ' To fix, run: npm run lib:ses'
    exit 1
fi