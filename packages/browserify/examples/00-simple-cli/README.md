### instructions

```bash
yarn
yarn lavamoat
yarn start
```

### explanation

In this example the config autogeneration and build scripts use the browserify cli and live as scripts in `package.json`.

**note: the whitespace in the plugin field is important**

```json
"scripts": {
  "lavamoat": "browserify index.js --plugin [ lavamoat-browserify --writeAutoConfig --config ./lavamoat-config.json ] > /dev/null",
  "start": "browserify index.js --plugin [ lavamoat-browserify --config ./lavamoat-config.json ] > bundle.js && serve ."
},
```

##### config autogeneration

The scripts `"lavamoat"` performs our config autogeneration. This task should only be run after updating dependencies.

```bash
browserify index.js \
  --plugin [ \
    lavamoat-browserify \
    --writeAutoConfig \
    --config ./lavamoat-config.json \
  ] > /dev/null
```

Here we are specifying the `lavamoat-browserify` plugin and providing it with the flag `--writeAutoConfig`. This tells the plugin to parse each module and generate a config file, writing it at `./lavamoat-config.json`, as specified by `--config`. We ignore the bundle output.

##### build

The scripts "start" performs our build with browserify, and starts a static asset server.

```bash
browserify index.js \
  --plugin [ \
    lavamoat-browserify \
    --config ./lavamoat-config.json \
  ] > bundle.js
```

Here we are specifying the `lavamoat-browserify` plugin and providing it with the argument `--config`. This tells the plugin to build, using the config at `./lavamoat-config.json`. We save the bundle output in `bundle.js`. Since `--writeAutoConfig` is not specified, it skips parsing the module content.
