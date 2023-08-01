# Release Workflow

LavaMoat follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) and uses [Conventional Commits][] to enable automation.

## Automated Release Process

The [Release Please][] GitHub Action automates all parts of the release process _except_ the publish to the public npm registry.

This is how it works:

1. A contributor creates a PR targeting the default branch (`main`) with commit messages in the [Conventional Commits][] format. PRs may contain changes across packages. _Note: a PR will fail checks if the commit is not in a valid format._
2. Once this PR is merged into its target branch (`main`), Release Please creates a pull request (or updates one if it already exists). The description will contain the current changelog; the commits will contain updates to the `package.json` and `CHANGELOG.md` files. _Draft_ releases for each package will be created at this time; one per package to be released. _Expect to see an open Release Please PR often!_
3. As additional contributor PRs are merged into `main`, the Release Please PR will be rebased and updated to reflect these changes. Dependencies will be automatically bumped between packages as needed--and kept at the latest version regardless of breaking changes.
4. A maintainer reviews a Release Please PR, and when they are satisfied with the changes, they rebase into `main`. This will trigger Release Please again, but this time the draft GitHub Releases will become official and tags will be pushed. This will be a _single commit_ containing one or more tags (one per package released). Release Please will now delete its PR branch.

Once a Release Please PR has been merged into `main`, _the maintainer who merged it **should** publish the package to npm as soon as possible_. See the next section.

> Release Please [recommends](https://github.com/googleapis/release-please#linear-git-commit-history-use-squash-merge) PRs are _squashed_ instead of simply rebased.
>
> Please also note [how to represent multiple changes in a single commit message](https://github.com/googleapis/release-please#what-if-my-pr-contains-multiple-fixes-or-features).

## Humans Publish to npm

[Lerna][] handles the publishing duties for us, but a human must trigger it. The process is straightforward:

1. Ensure you are logged in to npm; use `npm login` and/or `npm whoami`. **Do not do this on an untrusted machine.**
2. In your `LavaMoat` working copy, checkout `main` and pull it from `origin`.
3. Execute `npm ci` ("clean install"; not "continuous integration") to install using the lockfile (`package-lock.json`). This will obliterate any `node_modules` and `packages/*/node_modules` directories.
4. Execute `npm run publish`. The `rebuild`, `test:prep` and `test` scripts will be run. Once this is complete, Lerna will ask for confirmation. Approve, and Lerna will publish _all_ packages that have not yet been published. At this time you may also be asked for 2FA.

## Addendum: Workspace Dependency Table

| folder                    | npm name                            | deps                                            |
| ------------------------- | ----------------------------------- | ----------------------------------------------- |
| aa                        | @lavamoat/aa                        |                                                 |
| allow-scripts             | @lavamoat/allow-scripts             | @lavamoat/aa                                    |
| browserify                | lavamoat-browserify                 | @lavamoat/aa, @lavamoat/lavapack, lavamoat-core |
| core                      | lavamoat-core                       | lavamoat-tofu                                   |
| lavapack                  | @lavamoat/lavapack                  | lavamoat-core                                   |
| node                      | lavamoat                            | @lavamoat/aa, lavamoat-core, lavamoat-tofu      |
| perf                      | lavamoat-perf                       | lavamoat-browserify, lavamoat                   |
| preinstall-always-fail    | @lavamoat/preinstall-always-fail    |                                                 |
| survey                    | survey                              | lavamoat, lavamoat-tofu                         |
| tofu                      | lavamoat-tofu                       |                                                 |
| viz                       | lavamoat-viz                        | lavamoat-core                                   |
| yarn-plugin-allow-scripts | @lavamoat/yarn-plugin-allow-scripts |                                                 |

[Release Please]: https://github.com/google-github-actions/release-please-action
[Conventional Commits]: https://www.conventionalcommits.org/en/v1.0.0/#summary
[Lerna]: https://lerna.js.org
