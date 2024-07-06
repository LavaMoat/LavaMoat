#!/bin/sh

builder build plugin

# yarn berry does not recognize node: prefixed builtin references
sed -i \
  "s/\(['\"]\)node:\([^'\"][^'\"]*['\"]\)/\1\2/g" \
  bundles/*/*.js
