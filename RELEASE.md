# Release Workflow

LavaMoat follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) and uses [Conventional Commits][] to enable automation.

## How to Publish to npm

1. **Review, approve, then merge** the currently-open [Release Please pull request](https://github.com/LavaMoat/LavaMoat/pulls?q=is%3Aopen+is%3Apr+label%3A%22autorelease%3A+pending%22+sort%3Aupdated-desc).
   > See [How Releases Work](#how-releases-work) for more information.
2. _Immediately after_ merging, **checkout** the `main` branch and **pull** the changes from [LavaMoat/LavaMoat][] into your working copy.
   > It is recommended you make a clean clone or use a separate local copy for publishing.
   > Never publish from a fork.
   > Pulling `main` _should_ be a fast-forward operation; if it isn't, please start from a clean clone to be on the safe side.
3. **Assert** you are logged in to the npm registry; use `npm login` and/or `npm whoami`. _Do not do this on an untrusted machine._
4. **Assert** your working copy has no modifications (e.g., via `git status`).
5. **Assert** you are running Node.js v18.0.0 or later (via `node --version`) and npm v9.8.1 or later (via `npm --version`).
6. **Execute** `npm ci` ("Clean Install"; not "Continuous Integration").
   > This operation will obliterate any `node_modules` and `packages/*/node_modules` directories before installation.
7. This step depends on whether you are publishing a new package:

   - If you _are not_ publishing a new package, **execute** `npm run release`
   - If you _are_ publishing a new package, **execute** `npm run release --newPkg=<package-name>`

   In both cases, Artifacts will be rebuilt and the default set of tests will run. _Do not attempt to publish individual packages!_

   An error 404 likely means you lack permissions to publish and require an invite to the [organisation](https://www.npmjs.com/org/lavamoat).

8. **Check the output** of `npm pack` to ensure the correct files are being published.
9. If prompted, **enter** your 2FA passcode or **visit** the URL `npm` provides you. Once authenticated, the publish will proceed.
10. **Verify** the published package(s) on [npm](https://www.npmjs.com/search?q=lavamoat).
11. For extra credit, **verify** the [GitHub Releases](https://github.com/LavaMoat/LavaMoat/releases).

## How Releases Work

The [Release Please][] GitHub Action automates all parts of the release process _except_ the publish to the public npm registry.

This is the process:

1. A contributor creates a PR targeting the main branch (`main`). PRs may contain changes across packages. They _may not_ contain version bumps.
   > Note: a PR will fail checks if the commit message is not in [Conventional Commits][] format.
2. The contributor's PR is reviewed, approved, then _squashed & merged_ into `main.`
   > Release Please [recommends](https://github.com/googleapis/release-please#linear-git-commit-history-use-squash-merge) PRs are _squashed_ instead of simply rebased. History must also be kept linear; no merge commits.
   >
   > Please also read [how to represent multiple changes in a single commit message](https://github.com/googleapis/release-please#what-if-my-pr-contains-multiple-fixes-or-features).
3. The Release Please Action triggers, and it creates (or updates) a "release" pull request (there will only ever be one at a time); we call this the _Release Please PR_. The PR will contain a _single commit_, and its description will contain an auto-generated changelog. Release Please will also create a _Draft_ GitHub Release _for each_ package to be released.
   > This pull request will have title "chore: main" and the label `autorelease: pending`. It will have been opened by user `@github-actions[bot]`.
   >
   > Expect to see an open Release Please PR most of the time!
4. As additional PRs from contributors are merged into `main`, the Release Please Action will rebase and update the Release Please PR to reflect these changes. Dependencies will be automatically bumped between packages as needed—and kept at the latest version _regardless_ of any major version bumps.
5. A maintainer reviews a Release Please PR, and when they are satisfied with the changes, they merge it into `main`. This will trigger the Release Please Action again—but this time, the GitHub Releases will come out of "draft" status and be "official". Release Please will now delete its PR branch.
   > The Release Please PR does not need to be squashed, since it will only contain a single commit and be kept up-to-date with `main`.
6. The maintainer must immediately [publish to npm](#how-to-publish-to-npm).
7. Go to step 1.

## A Note About Lifecycle Scripts

`npm`'s `ignore-scripts` flag disables _all lifecycle scripts_ for _all packages_. This means, for example, a `prepublishOnly` script _will not automatically run_ upon an `npm publish`.

This is intentional. Thus, any actions that must happen pre-publish (or pre-_anything_) must be invoked _explicitly_ in our `package.json` scripts.

This does _not_, however, prevent a maintainer from running `npm publish` without having rebuilt and tested beforehand! So: _don't do that._ **Use `npm run publish` only**.

## Publishing, Under the Hood

If `npm` ignored workspaces that have already been published, we wouldn't need any extra tooling. But it does not ignore them, and instead aborts the operation. To avoid this, we need to first analyze the workspaces and query the registry for each to determine which packages have already been published. We filter those packages out of the list of packages to be published.

This "has this been published already?" query (done via `npm view`) will naturally fail if the package does not yet exist. Since we have no way of knowing whether it _should_ exist--or perhaps was a typo--the maintainer must explicitly declare the names of the new, never-published packages. This is done via the `--newPkg` flag to `npm run release`, which makes its way into the publishing script.

The publishing script is located in [`scripts/publish.js`](./scripts/publish.js).

## Addendum: Workspace Dependency Table

| folder                    | npm name                            | deps                                            |
| ------------------------- | ----------------------------------- | ----------------------------------------------- |
| aa                        | @lavamoat/aa                        |                                                 |
| allow-scripts             | @lavamoat/allow-scripts             | @lavamoat/aa                                    |
| browserify                | lavamoat-browserify                 | @lavamoat/aa, @lavamoat/lavapack, lavamoat-core |
| core                      | lavamoat-core                       | lavamoat-tofu                                   |
| lavapack                  | @lavamoat/lavapack                  | lavamoat-core                                   |
| laverna                   | @lavamoat/laverna                   |                                                 |
| node                      | lavamoat                            | @lavamoat/aa, lavamoat-core, lavamoat-tofu      |
| perf                      | lavamoat-perf                       |                                                 |
| preinstall-always-fail    | @lavamoat/preinstall-always-fail    |                                                 |
| survey                    | survey                              | lavamoat, lavamoat-core, lavamoat-tofu          |
| tofu                      | lavamoat-tofu                       |                                                 |
| webpack                   | @lavamoat/webpack                   | @lavamoat/aa, lavamoat-core                     |
| viz[^viz]                 | lavamoat-viz                        | lavamoat-core                                   |
| yarn-plugin-allow-scripts | @lavamoat/yarn-plugin-allow-scripts |                                                 |

[^viz]: `lavamoat-viz` is currently (un)maintained on the [`lavamoat-viz`](https://github.com/LavaMoat/LavaMoat/tree/lavamoat-viz) branch; there are tentative intentions to resume development in the future.

[Release Please]: https://github.com/google-github-actions/release-please-action
[Conventional Commits]: https://www.conventionalcommits.org/en/v1.0.0/#summary
[LavaMoat/LavaMoat]: https://github.com/LavaMoat/LavaMoat
