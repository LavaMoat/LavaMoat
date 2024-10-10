This fixture uses `git` and `github` dependency references in order to cover for special installation behavior of such packages from such references in yarn.

The resolutions point to identical sources but use dictinct commit hashes in order to avoid being skipped by caching.

References:
- https://github.com/yarnpkg/berry/blob/%40yarnpkg/core/4.1.3/packages/plugin-git/sources/GitFetcher.ts
- https://github.com/yarnpkg/berry/blob/%40yarnpkg/core/4.1.3/packages/plugin-git/sources/GitFetcher.ts
- https://github.com/yarnpkg/berry/issues/6258
