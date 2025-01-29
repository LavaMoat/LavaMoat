# LavaMoat Contributor's Guide

<!-- markdownlint-disable no-inline-html -->

## Code of Conduct

This project and everyone participating in it is governed by the [LavaMoat Code of Conduct][coc].

By participating, you are expected to uphold this code. Please report unacceptable behavior to [lavamoat@consenys.net][moderation-email].

## I Have a Question

Before you ask:

1. Ensure you've read [the documentation](/) and especially the [FAQ][].
2. Search for existing [Issues][] to see if someone else has already asked the same question.

Still got a question? Feel free to ask in [LavaMoat's issue tracker][issues-new];

## I Found a Bug

:::danger[Reporting Security Issues]

Do not report security issues, vulnerabilities or bugs including sensitive information to the issue tracker (or elsewhere in public)!

Security issues must be sent by email to [security@metamask.io][security-email].

:::

Not surprising! But _slow down._ Before you submit a bug report, please read the following guidelines.

### Before Submitting a Bug Report

- Make sure that you are using the **latest version of LavaMoat**.
- Search for existing [Issues][] to see if the bug is known.

If you can't find an existing issue—or the issue is still reproducible using the latest LavaMoat—then you should submit a bug report!

### Submitting a Bug Report

- Open an [Issue][issues-new].
- **Describe** the problem you're seeing.
- Explain the **expected behavior** compared to the **actual behavior**.
- Provide a **[minimal, complete, and verifiable example][mcve]**. If you can't, get as close as you can!
- Provide platform information:
  - Operating System: (e.g. macOS, Windows, Linux)
  - Node.js version: (e.g. 18.0.0)
  - Package manager & version: (e.g. npm 10.x, yarn)
  - Any other relevant software versions

Keep an eye on your notifications, as maintainers may ask for more information.

Thanks for helping us improve LavaMoat!

## I Have An Idea For a New Feature

This section guides you through submitting an enhancement suggestion for LavaMoat, **including completely new features** or **minor improvements to existing functionality**.

### Before Submitting an Enhancement Suggestion

- Ensure your idea fits within [LavaMoat's scope][faq].
- Could it be an add-on? Ask yourself if the idea would be better suited as a standalone project which enhances LavaMoat.
- Ensure that you are using the latest version of LavaMoat.
- Search for existing [issues with the `enhancement` label][issues-label-enhancement]
- Ensure the enhancement hasn't already been implemented. 😆

### Submitting an Enhancement Suggestion

Enhancement suggestions are tracked [in GitHub][issues].

- Use a **clear and descriptive title** for the issue to identify the suggestion.
- **Describe the use-case**. Who is this for? What problem does it solve?
- Provide a **step-by-step description of the suggested enhancement** in as many details as possible.
- **Avoid prescribing implementation details**; those can be discussed in a future pull request.

:::caution[About Maintenance Burden]

When deciding what features to add to LavaMoat, its team must consider the _maintenance burden_ of any given feature. Even if _you_ implement the feature, the maintainers must still maintain it. This means that some otherwise-excellent feature ideas may be rejected if they are deemed too costly to maintain. Don't take it personally!

:::

## I Want To Contribute Code

:::caution[Before You Begin]

When contributing code, you must ensure your contribution fulfills the requirements of the [Developer's Certificate of Origin][dco]. Roughly summarized, this means _you must have the right to contribute the code that you're contributing_ and that LavaMoat-the-project may indefinitely use your contribution under its license terms.

:::

### Development Environment

This section describes how to configure your development environment to hack on LavaMoat.

#### Platform

LavaMoat officially supports building on the following operating systems and architectures:

- Latest Ubuntu LTS [`x86_64`]
- Debian Stable [`x86_64`]
- Latest Alpine Linux Stable [`x86_64`]

On a best-effort basis, development should also be expected to work on:

- macOS 13.5+ [`x86_64` / `aarch64`]
- Windows Subsystem for Linux 1 [`x86_64`]
- Windows Subsystem for Linux 2 [`x86_64` / `aarch64`]
- Latest Ubuntu LTS [`aarch64`]
- Debian Stable [`aarch64`]
- Latest Alpine Linux Stable [`aarch64`]

Developer experience reports for supported and unsupported platforms and compatibility fixes are welcome.

#### Node.js

LavaMoat is distributed as a [Node.js][node] command-line tool. You'll want to install the active LTS version (see the [Node.js release schedule][release-schedule] for more information).

:::tip

Don't have Node.js installed? You can [download and install Node.js from the official site][node-download].

:::

#### npm

LavaMoat uses [npm][] for package management. Please refer to the `engines.npm` field of `package.json` for supported versions.

#### Editor

You can use any editor you like. We recommend something that understands TypeScript.

#### Fork, Clone, Install, Setup

1. Fork [LavaMoat/LavaMoat][lavamoat]
2. Clone your fork to your local machine:

   ```shell frame="none"
   git clone https://github.com/your-username/LavaMoat
   ```

3. Navigate to the `LavaMoat` directory and run `npm install`.
4. Run `npm run setup` to build the project and install Git hooks.
5. To work with upstream changes, add a new Git remote to your working copy:

   ```shell frame="none"
   git remote add upstream https://github.com/LavaMoat/LavaMoat
   ```

### Working with Code

The process of submitting a pull request follows this pattern:

1. [Create a new branch](#step1)
2. [Make your changes](#step2)
3. [Rebase onto upstream](#step3)
4. [Run the tests](#step4)
5. [Double check your submission](#step5)
6. [Push your changes](#step6)
7. [Submit the pull request](#step7)

Details about each step are found below.

#### Step 1: Create a new branch<a name="step1"></a>

The first step to sending a pull request is to create a new branch in your ESLint fork. Give the branch a descriptive name that describes what it is you're fixing, such as:

```shell
git checkout -b issue1234
```

You should do all of your development for the issue in this branch.

**Note:** Do not combine fixes for multiple issues into one branch. Use a separate branch for each issue you're working on.

### Step 2: Make your changes<a name="step2"></a>

Make the changes to the code and tests, following the [code conventions](./code-conventions) as you go. Once you have finished, commit the changes to your branch:

```shell
git add -A
git commit
```

LavaMoat follows the [Conventional Commits][] convention for commit messages, which helps automate the [release workflow][]. Here's an example commit message:

```text
tag: Short description of what you did

Longer description here if necessary

Fixes #1234
```

The first line of the commit message (the summary) must have a specific format. This format is checked by Git hook and CI.

The `tag` is one of the following:

- `fix` - for a bug fix.
- `feat` - either for a backwards-compatible enhancement or for a rule change that adds reported problems.
- `fix!` - for a backwards-incompatible bug fix.
- `feat!` - for a backwards-incompatible enhancement or feature.
- `docs` - changes to documentation only.
- `chore` - for changes that aren't user-facing.

The `scope` (in parentheses) is typically the _directory name_ relative to `packages/` of the affected package (workspace). For example:

```text
chore(webpack): frobnicate the widget
```

If multiple projects are affected, separate them by commas:

```text
fix(core,node): fix a bug in lavamoat-core and lavamoat-node
```

If the change affects all projects, omit the scope entirely:

```text
chore: update keywords in package.json files
```

The message summary should be a one-sentence description of the change. If the pull request addresses an issue, then the issue number should be mentioned in the body of the commit message in the format `Fixes #1234`. If the commit doesn't completely fix the issue, then use `Refs #1234` instead of `Fixes #1234`.

Here are some good commit message summary examples:

```text
feat!(core): added default behavior

fix: semicolons no longer breaking everything

chore(webpack): upgrade to browserify v5
```

### Step 3: Rebase onto upstream<a name="step3"></a>

Before you send the pull request, be sure to rebase onto the upstream source. This ensures your code is running on the latest available code.

```shell
git fetch upstream
git rebase upstream/main
```

### Step 4: Run the tests<a name="step4"></a>

After rebasing, be sure to run all of the tests once again to make sure nothing broke:

```shell
npm test
```

If there are any failing tests, update your code until all tests pass.

**If you forgot to write tests, now would be a good time to add them!**

### Step 5: Double check your submission<a name="step5"></a>

With your code ready to go, this is a good time to double-check your submission to make sure it follows our conventions. Here are the things to check:

- The commit message is properly formatted.
- The change introduces no functional regression. Be sure to run `npm test` to verify your changes before submitting a pull request.
- Make separate pull requests for unrelated changes. Large pull requests with multiple unrelated changes may be closed without merging.
- All changes must be accompanied by tests, even if the feature you're working on previously had no tests.
- All user-facing changes must be accompanied by appropriate documentation.

### Step 6: Push your changes<a name="step6"></a>

Next, push your changes to your clone:

```shell
git push origin issue1234
```

If you are unable to push because some references are old, force-push instead:

```shell
git push -f origin issue1234
```

:::caution[Force Pushing]

Force-pushing is a potentially dangerous operation. Read this post about [how to safely use force-push][force-push].

:::

### Step 7: Send the pull request<a name="step7"></a>

Now you're ready to send the pull request. Go to your Lav aMoat fork and then follow the [GitHub documentation][github-pr] on how to send a pull request.

The pull request title is autogenerated from the summary of the first commit, but it can be edited before the pull request is submitted.

The description of a pull request should explain what you did and how its effects can be seen.

## Following Up

Once your pull request is sent, it's time for the team to review it. As such, please make sure to:

1. Monitor the status of the GitHub Actions CI build for your pull request. If it fails, please investigate why; the CI build must pass before your pull request can be merged.
2. Respond to comments left on the pull request from LavaMoat maintainers. Remember, we want to help you land your code, so please be receptive to our feedback.
3. We may ask you to make changes, rebase, or squash your commits.

:::tip[CI Not Running?]

A LavaMoat maintainer may need to manually start initial CI build—especially if you are a first-time contributor.

:::

### Updating the Pull Request Title

If your pull request title is in the incorrect format, you'll be asked to update it. You can do so via the GitHub user interface.

### Updating the Code

If we ask you to make code changes, there's no need to close the pull request and create a new one. Make your changes in your working copy's branch, commit them, then push:

```shell
git add -A
git commit
git push origin issue1234
```

When updating the code, it's usually better to add additional commits to your branch rather than amending the original commit, because reviewers can easily tell which changes were made in response to a particular review. A LavaMoat maintainer may choose to squash or rebase your commit manually prior to merging it.

The commit messages in subsequent commits do not need to be in any specific format because these commits do not show up in the changelog.

### Rebasing

If your code is out-of-date, we might ask you to rebase. That means we want you to apply your changes on top of the latest upstream code. Rebase using these commands:

```shell
git fetch upstream
git rebase upstream/main
```

You might find that there are conflicts when you attempt to rebase. Please [resolve the conflicts][github-conflicts] and then force-push to your branch:

```shell
git push origin issue1234 -f
```

### Thank You

The LavaMoat team thanks you for contributing! "You're welcome" is appreciated, but not necessary. 😄

[coc]: /contributor/code-of-conduct
[dco]: https://developercertificate.org
[faq]: /about/faq
[issues]: https://github.com/LavaMoat/LavaMoat/issues
[issues-new]: https://github.com/LavaMoat/LavaMoat/issues/new
[issues-label-enhancement]: https://github.com/lavamoat/lavamoat/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement
[mcve]: https://stackoverflow.com/help/minimal-reproducible-example
[security-email]: mailto:security@metamask.io
[moderation-email]: mailto:lavamoat@consensys.net
[node-download]: https://nodejs.org/en/download
[node]: https://nodejs.org
[npm]: https://www.npmjs.com/package/npm
[release-schedule]: https://github.com/nodejs/Release#release-schedule
[lavamoat]: https://github.com/lavamoat/lavamoat
[github-pr]: https://help.github.com/articles/creating-a-pull-request
[github-conflicts]: https://help.github.com/articles/resolving-merge-conflicts-after-a-git-rebase/
[conventional commits]: https://www.conventionalcommits.org/https://www.conventionalcommits.org/
[release workflow]: /contributor/release
[force-push]: https://adamj.eu/tech/2023/10/31/git-force-push-safely/
