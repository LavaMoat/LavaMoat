# Some Config Files Are Here

> All config files in this directory should be documented in this `README`.

## TypeScript Configuration

We have three (3) TypeScript configuration files here:

- [`tsconfig.workspace.json`][] - "Base" config for workspaces in this repo.
- [`tsconfig.src.json`][] - Config for files within a workspace's `src/` directory (sources).
- [`tsconfig.test.json`][] Config for files within a workspace's `test/` directory (tests).

In addition, [the `tsconfig.json` in workspace root][root `tsconfig.json`] is configured for incremental builds. This file maintains references to `tsconfig.json` files in each workspace which needs types to be checked and/or built.

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

3. _If you are typechecking your tests_, create a `test/tsconfig.json` file in the workspace and set its contents to:

   ```json
   {
     "extends": "../../../.config/tsconfig.test.json",
     "include": ["."],
     "references": [{ "path": "../src/tsconfig.json" }]
   }
   ```

   You may need to omit e.g., test fixtures; you can use the `exclude` prop for this.

4. Add a `types` prop in your workspace's `package.json` pointing to the declaration file that corresponds to your entry point. Generally this is `types/index.d.ts`.
   > If your entry point is not in `src/`, you will need to add `"rootDir": ".."` to `src/tsconfig.json`'s `compilerOptions`, then add `../index.js` (or whatever it is) to the `includes` property.
5. _If you have an `exports` field_, [read this](https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-exports) and do that.
6. Add `types`, `!tsconfig.json` and `!*.tsbuildinfo` to the `files` prop of your `package.json`. If it doesn't exist, create it, and add whatever other files you need to put in the published package. Check your work with `npm pack --dry-run`.
7. Add your workspace to the `references` array in the [root `tsconfig.json`][] file, like so:

   ```json
   {
     "references": [
       {
         "path": "./packages/some-other-workspace/tsconfig.json"
       },
       {
         "path": "./packages/<WORKSPACE-NAME>/tsconfig.json"
       }
     ]
   }
   ```

> [!TIP] Use Strict
>
> Use `{"strict": true}` in the `compilerOptions` of your `src/tsconfig.json` for maximum safety against `null` and `undefined` values.
>
> This is less important for tests.

### TypeScript-Related Miscellany

This section contains sundry hints & tips picked up from working in this monorepo with TypeScript.

#### Importing `package.json` from `src/`

If you want import the workspace's `package.json` from any code in `src/`, TS will complain. The solution this will cause TS to write types to `types/src/*.d.ts` instead of `types/*.d.ts`. Try the following:

1. Add [`"resolveJsonModule": true`](https://www.typescriptlang.org/tsconfig#resolveJsonModule) to the `compilerOptions` of your `src/tsconfig.json`.
2. Add [`"rootDir": ".."`](https://www.typescriptlang.org/tsconfig#rootDir) to the `compilerOptions` of your `src/tsconfig.json`.
3. Modify the `types` reference in your workspace's `package.json` to point to `types/src/index.d.ts` instead of `types/index.d.ts`.

#### Caught Exceptions in Strict Mode

In strict mode, any caught exception will be of type `unknown`, because it's nearly impossible to infer what it could be.

_Any code which interacts with a value of type `unknown` cannot make any assumptions about its type whatsoever,_ so you must use a [_type assertion_](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions) to get it to the type you want.

> [!TIP] Type Assertions in JS
>
> A type assertion in JS looks like:
>
> ```js
> const newValue = /** @type {SomeType} */ (value)
> ```
>
> **The parentheses are required.** You cannot redefine the type of `value` this way; you can only assign it to a new variable or use it in an expression.

```js
try {
  doSomethingThatThrows()
} catch (e) {
  // this will be a TS error because `e` is `unknown`
  if (e.code === 'ENOENT') {
    // ...
  }
  // this could be used for many exceptions thrown from Node.js APIs
  // but only use it if you're sure!
  if (/** @type {NodeJS.ErrnoException} */ (e).code === 'ENOENT') {
    // this will be a TS error because the type assertion is not "permanent";
    // i.e. `e`` is still `unknown`
    throw new Error(`File not found: ${e.code}`)
  }
  // if you're not-so-sure about it, do something like this.
  if (e && typeof e === 'object' && 'code' in e && e.code === 'ENOENT') {
    // this is NOT a TS error because TS has now inferred the type
    throw new Error(`File not found: ${e.code}`)
  }
  // this is also fine (when not mixing global contexts), but `e` will
  // be a basic MDN-style Error object.
  if (e instanceof Error) {
    // ...
  }
}
```

Read on for a better way.

#### Type Guards

A better way is to define a custom _type guard_ ([playground example](https://www.typescriptlang.org/play#example/type-guards)):

```js
/**
 * Type guard for {@link NodeJS.ErrnoException}
 *
 * @param {unknown} e
 * @returns {e is NodeJS.ErrnoException}
 */
function isErrnoException(e) {
  return Boolean(
    e && typeof e === 'object' && 'code' in e && typeof e.code === 'string'
  )
}

// usage:

try {
  doSomethingThatThrows()
} catch (e) {
  if (isErrnoException(e) && e.code === 'ENOENT') {
    // ...
  }
}
```

> [!NOTE] Type Guards Return Booleans
>
> Type guards return the type `<param> is T`, but the _value_ must always be a `boolean`.

#### Assertion Functions

If you're more of the assertive type, you can create an [_assertion function_](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions) instead:

```js
/**
 * Assertion function for {@link NodeJS.ErrnoException}
 *
 * @param {unknown} e
 * @returns {asserts e is NodeJS.ErrnoException}
 */
function assertErrnoException(e) {
  if (e && typeof e === 'object' && 'code' in e && typeof e.code === 'string') {
    return
  }
  // this does not error even if `e` is unknown, because anything can be coerced
  // to a string. ESLint might not like it, though!
  throw new Error(`Assertion failed: isErrnoException: ${e}`)
}

// usage:

try {
  doSomethingThatThrows()
} catch (e) {
  assertErrNoException(e)
  // do something with e.code
}
```

## ESLint Configuration

This directory contains the following configuration(s):

- [`eslintrc.typed-workspace.js`][] - to be extended in the `.eslintrc.js` of a TypeScript-enabled workspace.

  This config uses a type-aware parser ([@typescript-eslint/parser](https://npm.im/@typescript-eslint/parser)) to provide more accurate linting, which works on both TypeScript sources and JavaScript sources (those which are type-checked, anyhow).

### How to Configure a Workspace for ESLint

If you're adding a new workspace, this is how to configure it for proper linting.

> [!IMPORTANT] ESLint Config Inheritance
>
> **All** workspaces inherit config from the [root ESLint config][].

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

> [!NOTE]
> Any configuration within the above object applies to all files within this workspace; this means it _should not_ be an object containing a single `overrides` property.

### Resources

- [ESLint Configuration Docs](https://eslint.org/docs/user-guide/configuring)

[root ESLint config]: ../.eslintrc.js
[`tsconfig.workspace.json`]: ./tsconfig.workspace.json
[`tsconfig.src.json`]: ./tsconfig.src.json
[`tsconfig.test.json`]: ./tsconfig.test.json
[root `tsconfig.json`]: ../tsconfig.json
[`eslintrc.typed-workspace.js`]: ./eslintrc.typed-workspace.js
