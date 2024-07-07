#!/bin/sh

builder build plugin $@

# yarn berry does not recognize node: prefixed builtin references
sed -i \
  -e "s/\(require\s*(\s*['\"]\)node:/\1/g" \
  -e 's/npm_config_node_gyp = __require.resolve/npm_config_node_gyp = resolve/' \
  bundles/*/*.js
