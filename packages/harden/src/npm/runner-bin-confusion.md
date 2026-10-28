# Bin confusion protection in the npm runner

## Problem

Some package bins are often pre-installed in CI environments. Some of them must be resolved to globals in case a dependency is attempting a [bin script confusion attack](https://socket.dev/blog/npm-bin-script-confusion). Others are popular/common enough that they should never be overridden - eg. `tsc` should only ever come from a direct `typescript` dependency if it exists.

Moving `node_modules/.bin` to the end of `PATH` (already done by `run-script-wrapper.cjs`) is not enough for the latter: if `tsc` is not installed globally, any dependency declaring a `tsc` bin can win.

## Design

`node_modules/.bin_override` is created dynamically with links for known bin names and put **first** in `PATH`.

- `binOpinions` in [`runner.cjs`](./runner.cjs) lists the bins to pin:
  - `node`, `npm`, `npx`, `node-gyp` point to their global location. `node` is `process.execPath`; `npm` and `npx` are resolved relative to the bin dir of the npm running the script (`dirname($npm_execpath)`); `node-gyp` uses `$npm_config_node_gyp`, which npm and pnpm set to their bundled `node-gyp.js` (their own `node-gyp-bin` shim uses it too).
  - `tsc`, `lerna`, `parcel`, `webpack` point to the bin of a local direct dependency (`typescript`, `lerna`, `parcel`, `webpack`), read from that package's own `package.json` `bin` field - never via `node_modules/.bin`.
- Opinions are iterated, not the dependencies from `package.json`. Dependencies without an opinion are ignored. Opinions that say a local dependency is preferred are not applied if it doesn't exist (not a direct dependency in `dependencies`/`devDependencies`, or not installed).
- Global links are skipped if the target doesn't exist (eg. `npm_execpath` points to pnpm).

## Responsibilities

`makeRunScriptWrapper` (shared by npm, pnpm and the yarn plugin):

- reads `package.json` via the `readPackageJson` callback (also used for `scriptsConfig`) and passes the direct dependency names to the optional `prepareBinOverrides` callback,
- skips calling it if:
  - `node_modules/.bin_override` already exists - it lives in `node_modules`, so a clean install clears it,
  - `node_modules` doesn't exist,
  - permissions are set (`process.permission`) - means we're in a nested run and fs access might be limited,
- prepends `node_modules/.bin_override` to `PATH` if it exists and is not in `PATH` already. In nested runs the package manager prepends its own entries again (`node_modules/.bin` gets moved to the end, its `node-gyp-bin` shim stays ahead of `.bin_override`), so the dir is guaranteed to be present, not to stay first.

Missing callback means that part is not run. Only the npm runner (also used for pnpm via `scriptShell`) implements it; the yarn plugin doesn't yet.

`prepareBinOverrides` in the npm runner builds the links in a temp dir and renames it into place, so concurrent runs never see a partial result.

## Limitations

- Adding or removing a pinned dependency without a clean install leaves a stale `.bin_override`. Delete it to regenerate.
- In workspaces only `<workspace>/node_modules` is considered, hoisted dependencies are not looked up.
- POSIX only (symlinks), same as the rest of the runner.
