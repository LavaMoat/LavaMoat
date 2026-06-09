🌋🌋## How to establish a safe project config

1. enter project repository and find the topmost `package.json` file
2. look at `package.json` for `packageManager` field - contains the most precise information if present.
3. detect package manager
   3.1. enter the folder where `package.json` is
   3.2. to detect yarn look for `yarn.lock`(indicates yarn is used)
   3.2.1. `.yarnrc`(yarn v1)
   3.2.2.`.yarnrc.yml` (yarn v2+)
   3.3. to detect pnpm look for `pnpm-lock.yaml` (indicates pnpm is used) and `pnpm-workspace.yaml` (contains workspace config)
   3.4. to detect npm look for `package-lock.json` (indicates npm is used) and `.npmrc` (contains npm config)
4. `package.json["packageManager"]` from (2) MUST NOT differ from what the presence of files in (3.2-3.4) indicates.
5. proceed with package manager specific vetting (see below)
6. look for `lavamoat` field in `package.json` for lavamoat config - if present - `@lavamoat/allow-scripts` is in use.

### npm

> minimum acceptable version: 11.10.0
> recommended version: 11.15.0+

1. check version of npm.
   1.1. if `package-lock.json` contains `lockfileVersion` field with a value below `3`, npm version is below 7

unfortunately, there's no good way to check npm version from a project config. The best we can do is to check if `package.json` contains `packageManager` field, but it's rare for npm users as it's a `corepack` related config.

npm version can be indicated by putting `npm` field in `engines` field of `package.json`, but it's not widely used and not enforced by npm itself.

```js
 "engines": {
    "npm": ">=11.15.0"
  },
```

All we get is a warning on install

```sh
npm warn EBADENGINE Unsupported engine {
npm warn EBADENGINE   package: 'project-name@0.0.0',
npm warn EBADENGINE   required: { npm: '>=11.15.0' },
npm warn EBADENGINE   current: { node: 'v24.14.1', npm: '11.11.0' }
npm warn EBADENGINE }

```

2. validate `.npmrc`
   2.1. required fields:

- `ignore-scripts` MUST BE `true`
- `min-release-age` MUST BE a positive number
- `allow-git` MUST BE `none` or `root`
  2.2. optional fields:
- `git=false` is a recommended trick to disable git dependencies that works in old versions of npm but will prevent `allow-git=root` from working (note the root value was broken until 11.12.3 or even later)

### yarn v1

> yarn v1 should not be used

1. check version of yarn
   1.1. if `package.json` contains `packageManager` field, inspect yarn version. If not provided, it's yarn v1
2. validate `.yarnrc`
   2.1. required fields:
   - `ignore-scripts true` MUST BE set. Note no `=` in this file, it's a space.

### yarn v2+

> minimum acceptable version: 4.15.0
> recommended version: 4.15.0+

1. check version of yarn
   1.1. if `package.json` contains `packageManager` field, inspect yarn version. If not provided, look for `.yarnrc.yml` file and check if it contains `yarnPath` field with a value that indicates yarn version in the file name.
2. validate `.yarnrc.yml`
   2.1. required fields:
   - `enableScripts` MUST BE set to `false`
   - `approvedGitRepositories` must be set (enables skipping git dependencies for preexisting projects, better to always have it in. expected value is `[]`)
   - `npmMinimalAgeGate` MUST BE set to a positive number (note that here it's in minutes not days)

### pnpm

> minimum acceptable version: 11.0.0
> recommended version: 11.0.0+

1. check version of pnpm
   1.1. if `package.json` contains `packageManager` field, inspect pnpm version. If not provided, assume invalid.
2. validate `pnpm-workspace.yaml`
   2.1. required fields:
   - `minimumReleaseAge` MUST BE set to a positive number
   - version 11+ defaults everything else we care about to the right values.
3. if `allowBuilds` is set in `pnpm-workspace.yaml`, @lavamoat/allow-scripts may be unnecessary. It's recommended to pin exact versions of packages in `allowBuilds`.
