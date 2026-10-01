# Release Workflow

LavaMoat follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) and uses [Changesets][] to manage package versions and changelogs.

## How to Publish to npm

1. **Review, approve, then merge** the currently-open [Version Packages pull request](https://github.com/LavaMoat/LavaMoat/pulls?q=is%3Aopen+is%3Apr+head%3Achangeset-release%2Fmain+sort%3Aupdated-desc).
   > See [How Releases Work](#how-releases-work) for more information.
2. Monitor the publishing workflow in CI.
3. When ready, approve the staged packages via CLI or npm's web interface. Be sure to check that the time of publication is correct!

## How Releases Work

The [Changesets GitHub Action][changesets-action] automates all parts of the release process _except_ the publish to the public npm registry.

This is the process:

1. A contributor creates a PR targeting the main branch (`main`). PRs _must_ include a changeset describing the change and the packages affected.
   > Run `npm run changeset` in the repo root to launch the interactive changeset wizard. It will ask which packages changed and at what semver bump level. Commit the generated file in `.changeset/` along with your code changes.
   >
   > Note: a PR will fail checks if the commit message is not in [Conventional Commits][] format.
2. The contributor's PR is reviewed, approved, then _squashed & merged_ into `main`.
3. The Changesets Action triggers. If changesets are found, it opens (or updates) a **Version Packages** pull request (`chore: version packages`) that bumps package versions and updates changelogs. There will only ever be one such PR at a time, targeting `main` from branch `changeset-release/main`.
   > Expect to see an open Version Packages PR most of the time!
4. As additional PRs from contributors are merged into `main`, the Changesets Action rewrites the Version Packages PR to incorporate the new changesets.
5. A maintainer reviews the Version Packages PR and, when satisfied, merges it into `main`. The Changesets Action triggers again — this time no changesets are found, so it runs `changeset git-tag`, creating a git tag and GitHub Release for each bumped package and setting `published=true`.
6. The `published=true` signal causes the **Pack** job to run, which builds each released workspace and uploads tarballs as a GitHub Actions artifact.
7. The **Publish** job picks up those tarballs and calls `npm stage publish` for each one, using npm's [Trusted Publishing][] (OIDC) for authentication. The publish environment requires approval before the job runs.
8. Go to step 1.

## Manual / Emergency Publish

If you need to trigger a publish outside the normal flow (e.g. to re-publish a failed release), use the **workflow_dispatch** trigger on the [Release & Publish](https://github.com/LavaMoat/LavaMoat/actions/workflows/release-please.yml) workflow. Provide a JSON array of workspace **names** (or paths) to publish:

```json
["@lavamoat/aa", "packages/node"]
```

## Contributing a Changeset

```bash
# From the repo root:
npm run changeset

# Follow the prompts to select changed packages and bump levels.
# Commit the generated .changeset/<random-name>.md along with your code.
```

Changesets that describe only dependency bumps or internal-only changes can use an **empty** changeset (`npx changeset --empty`) to skip the version bump.

## A Note About Lifecycle Scripts

`npm`'s `ignore-scripts` flag disables _all lifecycle scripts_ for _all packages_. This means, for example, a `prepublishOnly` script _will not automatically run_ upon an `npm publish`.

This is intentional. Thus, any actions that must happen pre-publish (or pre-_anything_) must be invoked _explicitly_ in our `package.json` scripts.

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
| preinstall-always-fail    | @lavamoat/preinstall-always-fail    |                                                 |
| react-native-lockdown     | @lavamoat/react-native-lockdown     |                                                 |
| tofu                      | lavamoat-tofu                       |                                                 |
| webpack                   | @lavamoat/webpack                   | @lavamoat/aa, lavamoat-core                     |
| yarn-plugin-allow-scripts | @lavamoat/yarn-plugin-allow-scripts |                                                 |

[Changesets]: https://changesets.dev
[changesets-action]: https://github.com/changesets/action
[Conventional Commits]: https://www.conventionalcommits.org/en/v1.0.0/#summary
[Trusted Publishing]: https://docs.npmjs.com/trusted-publishers
