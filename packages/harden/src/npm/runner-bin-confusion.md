# Bin confusion protection in the npm runner

## Problem

Some package bins are often pre-installed in CI environments. Some of them must be resolved to globals in case a dependency is attempting a [bin script confusion attack](https://socket.dev/blog/npm-bin-script-confusion). Others are popular/common enough that they should never be overridden - eg. `tsc` should only ever come from a direct `typescript` dependency if it exists.

Moving `node_modules/.bin` to the end of `PATH` (already done by `run-script-wrapper.cjs`) is not enough for the latter: if `tsc` is not installed globally, any dependency declaring a `tsc` bin can win.

## How it's handled

`node_modules/.bin_override` is created dynamically with links for known bin names and put **first** in `PATH`.

- `binOpinions` in [`runner.cjs`](./runner.cjs) lists the bins to pin:
  - `node`, `npm`, `npx`, `node-gyp` point to their global location. `node` is `process.execPath`; `npm` and `npx` are resolved relative to the bin dir of the npm running the script (`dirname($npm_execpath)`); `node-gyp` uses `$npm_config_node_gyp`, which npm and pnpm set to their bundled `node-gyp.js` (their own `node-gyp-bin` shim uses it too).
  - `tsc`, `lerna`, `parcel`, `webpack` point to the bin of a local direct dependency (`typescript`, `lerna`, `parcel`, `webpack`), read from that package's own `package.json` `bin` field - never via `node_modules/.bin`.
- Dependencies without an opinion are ignored. Opinions that say a local dependency is preferred are not applied if it doesn't exist (not a direct dependency in `dependencies`/`devDependencies`, or not installed).
