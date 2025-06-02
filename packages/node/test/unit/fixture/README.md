# test/unit/fixture/

This directory contains the sources of _package fixtures_ common to the various unit test suites in `@lavamoat/node`.

These fixtures do not need to be used correctly; using the snapshots is sufficient for testing (and is faster).

## This Directory

This directory contains a `package.json` which defines the [`start`](#regenerating-all-fixtures) script to (re-)generate all fixtures at once.

> [!NOTE]
>
> The `start` script in each fixture ([see below](#creating-a-fixture)) wants [snapshot-fs](https://npm.im/snapshot-fs) which is a tool to generates JSON snapshots. Because it uses `npx`, it is _unsafe_ to run it in CI. **Only run these `start` scripts from your local development environment** (where it is only marginally less unsafe due to it not being automated).

For reasons of reducing maintenance overhead, this directory is a _workspace root_; it has a `workspaces` property in its `package.json` which includes all subdirectories.

> [!CAUTION]
>
> Don't try to `npm install` in this directory; this will foul things up.

## Creating a Fixture

It's easiest to just copy an existing fixture and modify it as needed, but these are the important points:

- Each fixture's `package.json` should have:
  - A unique `name`
  - The _same_ `start` script (`"npx snapshot-fs \"$npm_config_local_prefix/../json-fixture/$npm_package_name.json\""`)
  - `private: true` (paranoia reasons)
- Each fixture should have its own `node_modules` directory, which contains dependencies.
- Do not attempt to share dependencies between fixtures; just copy them.
- The `node_modules` directory in each fixture should be committed to version control.
- If you need a specific dependency from `npm` (avoid this please), it must be vendored in `node_modules`. You do not need to use `bundleDependencies` unless you happen to be testing that.

> [!CAUTION]
>
> Don't try to `npm install` in any of the fixture directories; this, too, will floul things up.

## Generating JSON Snapshots

All fixtures will have a `start` script which uses [snapshot-fs](https://npm.im/snapshot-fs) to generate and write a snapshot to [the `json-fixture` directory](../json-fixture). The snapshot will be named `<package-name>.json`.

If you change something in a one of these fixtures, then you should re-run the `start` script to update the snapshot.

### Generating a JSON Snapshot for a Single Fixture

To generate a JSON snapshot for a single fixture, run the `start` script in the fixture's directory. For example, if you want to generate a snapshot for the `hints` fixture, you would run (from this directory):

```shell
npm run -w hints start
```

## Generating All JSON Snapshots

To (re-)generate snapshots for _all_ fixtures at once, run:

```shell
npm start
```

> [!TIP]
>
> _For more information on JSON snapshots & use in tests, see [../json-fixture/README.md](../json-fixture/README.md)._
