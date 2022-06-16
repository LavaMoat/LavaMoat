### instructions

```bash
yarn
yarn lavamoat
yarn start
```


### explanation

In this example the policy autogeneration and build scripts use the browserify js api and live in `build.js`. For convenience, the npm scripts `"lavamoat"` and `"start"` call `build.js`, using an environment variable to specify when to automatically generate the policy.

**note: the whitespace in the plugin field is important**

```json
"scripts": {
  "lavamoat": "AUTOCONFIG=1 node ./build.js",
  "start": "node ./build.js && serve ."
},
```

##### policy autogeneration

When using the policy autogeneration, `lavamoat-browserify` options are specified as

```js
const lavamoatOpts = {
  policy: './lavamoat/browserify/policy.json',
  writeAutoPolicy: true,
}
```

Here we are specifying the `lavamoat-browserify` plugin and providing it with the option `writeAutoPolicy`. This tells the plugin to parse each module and generate a policy file, writing it at `./lavamoat/browserify/policy.json`. Ignore the bundle output.

##### build

The scripts "start" performs our build with browserify, and starts a static asset server.

```js
const lavamoatOpts = {
  policy: './lavamoat/browserify/policy.json',
}
```

Here we are specifying the `lavamoat-browserify` plugin and providing it with the argument `--policy`. This tells the plugin to build, using the policy at `./lavamoat/browserify/policy.json`. We save the bundle output in `bundle.js`. Since `writeAutoPolicy` is not specified, it skips parsing the module content.
