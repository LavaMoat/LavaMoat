#!/bin/sh

builder build plugin $@

# yarn berry does not recognize node: prefixed builtin references
sed \
  's/npm_config_node_gyp = __require.resolve/npm_config_node_gyp = resolve/' \
  -i \
  bundles/*/*.js

sed \
  "s/\(require\s*(\s*['\"]\)node:/\1/g" \
  -i \
  bundles/*/*.js
