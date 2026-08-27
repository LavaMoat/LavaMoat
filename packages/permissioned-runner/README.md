# @lavamoat/permissioned-runner

Script-execution wrapper used by [`@lavamoat/harden`](../harden) to harden the runtime of `npm run` / `yarn run` / `pnpm run` scripts.

The package ships:

- An npm-style CLI (`lavamoat-permissioned-runner`, wired via `bin`) that npm and pnpm invoke as `script-shell`.
- A yarn 4 plugin source that must be concatenated with the wrapper into a single self-contained file to be loaded by yarn. Use the `bundleYarnPlugin()` function exported from this package to obtain that string.

## Programmatic API

```js
import { bundleYarnPlugin } from '@lavamoat/permissioned-runner'

const source = bundleYarnPlugin()
// write `source` to `lavamoat/.runner-plugin.js` in the target project
```
