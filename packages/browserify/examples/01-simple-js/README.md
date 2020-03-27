### instructions

```bash
yarn
yarn lavamoat
yarn start
```


### explanation

In this example the config autogeneration and build scripts use the browserify js api and live in `build.js`. For convenience, the npm scripts `"lavamoat"` and `"start"` call `build.js`, using an environment variable to specify when to automatically generate the config.

**note: the whitespace in the plugin field is important**

```json
"scripts": {
  "lavamoat": "AUTOCONFIG=1 node ./build.js",
  "start": "node ./build.js && serve ."
},
```

##### config autogeneration

When using the config autogeneration, `lavamoat-browserify` options are specified as

```js
const lavamoatOpts = {
  config: './lavamoat-config.json',
  writeAutoConfig: true,
}
```

Here we are specifying the `lavamoat-browserify` plugin and providing it with the option `writeAutoConfig`. This tells the plugin to parse each module and generate a config file, writing it at `./lavamoat-config.json`. Ignore the bundle output.

##### build

The scripts "start" performs our build with browserify, and starts a static asset server.

```js
const lavamoatOpts = {
  config: './lavamoat-config.json',
}
```

Here we are specifying the `lavamoat-browserify` plugin and providing it with the argument `--config`. This tells the plugin to build, using the config at `./lavamoat-config.json`. We save the bundle output in `bundle.js`. Since `writeAutoConfig` is not specified, it skips parsing the module content.
