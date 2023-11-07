# Some Config Files Are Here

In here, config files some.

## TypeScript Configuration

We have three (3) TypeScript configuration files here:

- `tsconfig.workspace.json` - "Base" config for workspaces in this repo.
- `tsconfig.src.json` - Config for files within a workspace's `src/` directory (sources).
- `tsconfig.test.json` Config for files within a workspace's `test/` directory (tests).

In addition, we have a `tsconfig.json` in the workspace (project) root, configured for incremental builds. This file maintains references to `tsconfig.json` files in each workspace which needs types to be checked and/or built.

In addition the root `tsconfig.json` serves as the "default" for files in the repo which do not otherwise have an ancestor `tsconfig.json` file.

### How to Configure a Workspace for TypeScript

> For the talented & gifted, you can skip this and copy the setup in e.g., `packages/aa`.

1. Create a `tsconfig.json` file in the workspace and set its contents to:

   ```json
   {
     "extends": "../../.config/tsconfig.workspace.json",
     "references": [
       { "path": "./src/tsconfig.json" },
       { "path": "./test/tsconfig.json" }
     ]
   }
   ```

   If you don't want to typecheck your tests, omit the second object in the `references` array.

   This file should only contain references to one or more other configuration files, and is not itself responsible for controlling input/output.

2. Create a `src/tsconfig.json` file in the workspace and set its contents to:

   ```json
   {
     "extends": "../../../.config/tsconfig.src.json",
     "compilerOptions": {
       "outDir": "../types"
     },
     "include": ["."]
   }
   ```

   This file controls how and where `tsc` emits declarations; our convention is to dump them all in `types/`. We also want to publish these types along with our packages (see step 6).

   `tsconfig.src.json` contains `checkJs: true`; `tsc` will expect _all_ `.js` files to be well-typed. If that's not applicable to the package you're setting up, override the value to `false` and add `// @ts-check` to the top of each file needing typechecking. 

   If you are a glutton for punishment, add `strict: true` to this config file. It's not the default for this repository tho.

3. If you are typechecking your tests, create a `test/tsconfig.json` file in the workspace and set its contents to:

   ```json
   {
     "extends": "../../../.config/tsconfig.test.json",
     "include": ["."],
     "references": [{ "path": "../src/tsconfig.json" }]
   }
   ```

   You may need to omit e.g., test fixtures; you can use the `exclude` prop for this. `tsc` will not build declarations from files in `test`.

4. Add a `types` prop in your workspace's `package.json` pointing to the declaration file that corresponds to your entry point. Generally this is `types/index.d.ts`.
   > If your entry point is not in `src/`, you will need to add `"rootDir": ".."` to `src/tsconfig.json`'s `compilerOptions`, then add `../index.js` (or whatever it is) to the `includes` property.
5. _If you have an `exports` field_, [read this](https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-exports) and do that.
6. Add `types`, `!tsconfig.json` and `!*.tsbuildinfo` to the `files` prop of your `package.json`. If it doesn't exist, create it, and add whatever other files you need to put in the published package. Check your work with `npm pack --dry-run`.

## ESLint Configuration

This directory contains the following configuration(s):

- [`eslintrc.typed-workspace.js`](./eslintrc.typed-workspace.js) - to be extended in the `.eslintrc.js` of a TypeScript-enabled workspace.

  This config uses a type-aware parser (`@typescript-eslint/parser`) to provide more accurate linting, which works on both TypeScript sources and JavaScript sources (those which are type-checked, anyhow).

### How to Configure a Workspace for ESLint

All workspaces will inherit config from the [root ESLint config][].

Please use a CJS file named `.eslintrc.js` (for consistency).

#### TypeScript-Enabled Workspaces

For TS-enabled workspaces, **an `.eslintrc.js` file is required**.

Scaffold your `.eslintrc.js` like so:

```js
// @ts-check

/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  extends: '../../.config/eslintrc.typed-workspace',
}
```

#### Everything Else

For other workspaces, **`.eslintrc.js` is optional**. It is only necessary if the workspace needs no changes from the [root ESLint config][].

It's recommended to use this as a starting point, as it will give you in-editor feedback if your config is invalid:

```js
// @ts-check

/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  // go to town here
}
```

### Resources

- [ESLint Configuration Docs](https://eslint.org/docs/user-guide/configuring)

[root ESLint config]: ../.eslintrc.js
