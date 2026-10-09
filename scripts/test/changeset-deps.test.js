// @ts-check
'use strict'

/**
 * Tests for scripts/changeset-deps.js.
 *
 * Each test that needs git history builds a throw-away repo under `os.tmpdir()`
 * and injects a runner bound to it, so no test ever touches the real repo.
 *
 * @packageDocumentation
 */

const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { mkdir, mkdtemp, rm, writeFile } = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')

const {
  buildChangesetContent,
  computeChangesets,
  findBoundarySha,
  findFixDepsCommits,
  getChangedPackageJsonFiles,
  getPublicWorkspaces,
  getRuntimeDepChanges,
  makeGitRunner,
  resolveBootstrapSha,
} = require('../changeset-deps.js')

/** @typedef {(args: string[]) => Promise<string>} GitRunner */

/** Root manifest used by fixtures that need workspace discovery. */
const ROOT_MANIFEST = JSON.stringify({
  name: 'root',
  private: true,
  workspaces: ['packages/*'],
})

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/**
 * Write a file tree into `dir`. Non-string contents are JSON-serialised.
 *
 * @param {string} dir
 * @param {Record<string, unknown>} files
 * @returns {Promise<void>}
 */
async function writeTree(dir, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel)
    await mkdir(path.dirname(abs), { recursive: true })
    await writeFile(
      abs,
      typeof content === 'string' ? content : JSON.stringify(content, null, 2)
    )
  }
}

/**
 * Create a temporary directory and initialize a git repo in it.
 *
 * @returns {Promise<{ dir: string; git: GitRunner }>}
 */
async function makeRepo() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'changeset-deps-test-'))
  const git = makeGitRunner(dir)
  // Predictable branch name independent of the host's init.defaultBranch.
  await git(['init', '--initial-branch=main'])
  await git(['config', 'user.name', 'Test'])
  await git(['config', 'user.email', 'test@example.com'])
  await git(['config', 'commit.gpgsign', 'false'])
  return { dir, git }
}

/**
 * Write files, stage everything, and commit with the given message.
 *
 * @param {string} dir Repo root
 * @param {GitRunner} git
 * @param {Record<string, unknown>} files Relative path → content
 * @param {string} message
 * @returns {Promise<string>} Full SHA of the new commit
 */
async function commit(dir, git, files, message) {
  await writeTree(dir, files)
  await git(['add', '.'])
  await git(['commit', '-m', message])
  return git(['rev-parse', 'HEAD'])
}

/**
 * Remove a temp dir.
 *
 * @param {string} dir
 * @returns {Promise<void>}
 */
const cleanup = (dir) => rm(dir, { recursive: true, force: true })

// ---------------------------------------------------------------------------
// Unit tests: pure helpers
// ---------------------------------------------------------------------------

describe('buildChangesetContent', () => {
  it('emits a valid changeset with patch bump', () => {
    const content = buildChangesetContent(
      ['@lavamoat/node'],
      'Update yaml (#42)',
      [{ field: 'dependencies', name: 'yaml', from: '^2.7.0', to: '^2.9.0' }]
    )
    assert.equal(
      content,
      "---\n'@lavamoat/node': patch\n---\n\nUpdate yaml (#42)\n"
    )
  })

  it('lists every package in the front matter of a single changeset', () => {
    const content = buildChangesetContent(
      ['@lavamoat/node', '@lavamoat/webpack', 'lavamoat-core'],
      'Upgrade ses (#2111)',
      [
        { field: 'dependencies', name: 'ses', from: '2.2.0', to: '2.3.0' },
        { field: 'dependencies', name: 'ses', from: '2.2.0', to: '2.3.0' },
        { field: 'dependencies', name: 'ses', from: '2.2.0', to: '2.3.0' },
      ]
    )
    assert.equal(
      content,
      "---\n'@lavamoat/node': patch\n'@lavamoat/webpack': patch\n'lavamoat-core': patch\n---\n\nUpgrade ses (#2111)\n"
    )
  })

  it('deduplicates identical dep changes across packages', () => {
    const content = buildChangesetContent(
      ['@test/a', '@test/b'],
      'Update group (#3)',
      [
        { field: 'dependencies', name: 'x', from: '1.0.0', to: '2.0.0' },
        { field: 'dependencies', name: 'y', from: '1.0.0', to: '2.0.0' },
        { field: 'dependencies', name: 'x', from: '1.0.0', to: '2.0.0' },
      ]
    )
    assert.equal(content.match(/→/g)?.length, 2)
  })

  it('keeps distinct changes to the same dep', () => {
    // e.g. two packages that were on different versions before the update
    const content = buildChangesetContent(
      ['@test/a', '@test/b'],
      'Update x (#4)',
      [
        { field: 'dependencies', name: 'x', from: '1.0.0', to: '3.0.0' },
        { field: 'dependencies', name: 'x', from: '2.0.0', to: '3.0.0' },
      ]
    )
    assert.match(content, /`x`: `1\.0\.0` → `3\.0\.0`/)
    assert.match(content, /`x`: `2\.0\.0` → `3\.0\.0`/)
  })

  it('appends continuation lines when multiple deps changed', () => {
    const content = buildChangesetContent(
      ['@lavamoat/node'],
      'Update endo (#99)',
      [
        {
          field: 'dependencies',
          name: '@endo/ses',
          from: '0.18.0',
          to: '0.19.0',
        },
        {
          field: 'dependencies',
          name: '@endo/marshal',
          from: '0.18.0',
          to: '0.19.0',
        },
      ]
    )
    assert.match(content, /`@endo\/ses`.*→/)
    assert.match(content, /`@endo\/marshal`.*→/)
  })

  it('does NOT append continuation lines for exactly one dep change', () => {
    const content = buildChangesetContent(
      ['@lavamoat/node'],
      'Update yaml (#1)',
      [{ field: 'dependencies', name: 'yaml', from: '1.0.0', to: '2.0.0' }]
    )
    assert.doesNotMatch(content, /→/)
  })
})

// ---------------------------------------------------------------------------
// Integration tests: git-backed
// ---------------------------------------------------------------------------

describe('findBoundarySha', () => {
  /** @type {string} */
  let dir
  /** @type {GitRunner} */
  let git

  /** @type {string} */
  let releaseSha

  before(async () => {
    ;({ dir, git } = await makeRepo())
    releaseSha = await commit(
      dir,
      git,
      { 'a.txt': '1' },
      'chore: release main (#1)'
    )
    await git(['tag', 'lavamoat-core-v1.0.0'])
    await commit(dir, git, { 'b.txt': '2' }, 'feat: something after release')
  })

  after(() => cleanup(dir))

  it('falls back to the nearest reachable tag', async () => {
    assert.equal(await findBoundarySha(git), releaseSha)
  })

  it('prefers a "chore: version packages" commit over the fallback', async () => {
    const versionSha = await commit(
      dir,
      git,
      { 'dummy.txt': 'bump' },
      'chore: version packages'
    )
    // Another commit after, so HEAD !== boundary
    await commit(dir, git, { 'dummy2.txt': 'more' }, 'fix: something else')
    assert.equal(await findBoundarySha(git), versionSha)
  })

  it('peels an annotated tag to its commit', async () => {
    const { dir: d2, git: g2 } = await makeRepo()
    try {
      const sha = await commit(d2, g2, { 'a.txt': '1' }, 'chore: release')
      await g2(['tag', '-a', '@lavamoat/aa@5.0.1', '-m', '@lavamoat/aa@5.0.1'])
      await commit(d2, g2, { 'b.txt': '2' }, 'feat: later')
      assert.equal(await findBoundarySha(g2), sha)
    } finally {
      await cleanup(d2)
    }
  })

  it('picks the nearest of several ancestor tags', async () => {
    const { dir: d2, git: g2 } = await makeRepo()
    try {
      await commit(d2, g2, { 'a.txt': '1' }, 'chore: release (#1)')
      await g2(['tag', 'old-v1.0.0'])
      const newer = await commit(
        d2,
        g2,
        { 'b.txt': '2' },
        'chore: release (#2)'
      )
      await g2(['tag', 'new-v2.0.0'])
      await commit(d2, g2, { 'c.txt': '3' }, 'feat: later')
      assert.equal(await findBoundarySha(g2), newer)
    } finally {
      await cleanup(d2)
    }
  })

  it('ignores tags that are not ancestors of HEAD', async () => {
    const { dir: d2, git: g2 } = await makeRepo()
    try {
      const base = await commit(d2, g2, { 'a.txt': '1' }, 'chore: release (#1)')
      await g2(['tag', 'v1.0.0'])
      // A newer tag on a branch that HEAD never merged
      await g2(['checkout', '-b', 'side'])
      await commit(d2, g2, { 'side.txt': 's' }, 'chore: side release')
      await g2(['tag', 'v9.9.9'])
      await g2(['checkout', 'main'])
      await commit(d2, g2, { 'b.txt': '2' }, 'feat: later')
      assert.equal(await findBoundarySha(g2), base)
    } finally {
      await cleanup(d2)
    }
  })

  it('rejects when neither boundary is found', async () => {
    const { dir: d2, git: g2 } = await makeRepo()
    try {
      await commit(d2, g2, { 'README.md': 'hello' }, 'initial commit')
      await assert.rejects(findBoundarySha(g2), /no tag is reachable from HEAD/)
    } finally {
      await cleanup(d2)
    }
  })
})

describe('findFixDepsCommits', () => {
  /** @type {string} */
  let dir
  /** @type {GitRunner} */
  let git
  /** @type {string} */
  let boundarySha

  before(async () => {
    ;({ dir, git } = await makeRepo())
    boundarySha = await commit(
      dir,
      git,
      { '.changeset/config.json': '{}' },
      'chore: add changesets'
    )
  })

  after(() => cleanup(dir))

  it('detects fix(deps) commits after the boundary', async () => {
    await commit(dir, git, { 'a.txt': '1' }, 'fix(deps): update yaml (#1)')
    const commits = await findFixDepsCommits(git, boundarySha)
    assert.equal(commits.length, 1)
    assert.equal(commits[0].summary, 'Update yaml (#1)')
  })

  it('ignores chore(deps) commits', async () => {
    await commit(
      dir,
      git,
      { 'b.txt': '2' },
      'chore(deps): update ava to v8 (#2)'
    )
    const commits = await findFixDepsCommits(git, boundarySha)
    // Still only the one fix(deps) commit from the previous test
    assert.equal(commits.length, 1)
    assert.ok(commits.every((c) => c.subject.startsWith('fix(deps)')))
  })

  it('ignores commits at or before the boundary', async () => {
    const { dir: d2, git: g2 } = await makeRepo()
    try {
      const b = await commit(
        d2,
        g2,
        { 'x.txt': 'a' },
        'fix(deps): old commit (#0)'
      )
      await commit(d2, g2, { 'y.txt': 'b' }, 'fix(deps): new commit (#1)')
      // Boundary at the first fix(deps) commit: only the second should appear
      const commits = await findFixDepsCommits(g2, b)
      assert.equal(commits.length, 1)
      assert.match(commits[0].summary, /New commit/)
    } finally {
      await cleanup(d2)
    }
  })

  it('capitalises the first letter of the summary', async () => {
    const { dir: d2, git: g2 } = await makeRepo()
    try {
      const b = await commit(d2, g2, { 'init.txt': '' }, 'chore: init')
      await commit(d2, g2, { 'x.txt': '' }, 'fix(deps): update something (#5)')
      const commits = await findFixDepsCommits(g2, b)
      assert.equal(commits[0].summary, 'Update something (#5)')
    } finally {
      await cleanup(d2)
    }
  })
})

describe('getPublicWorkspaces', () => {
  /** @type {string[]} */
  const dirs = []

  /**
   * Write a file tree into a fresh temp dir (no git needed).
   *
   * @param {Record<string, unknown>} files
   * @returns {Promise<string>}
   */
  async function makeTree(files) {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'changeset-deps-ws-'))
    dirs.push(dir)
    await writeTree(dir, files)
    return dir
  }

  /**
   * Manifest paths in sorted order. Insertion order of the map is not part of
   * the contract (manifests are read concurrently).
   *
   * @param {Map<string, string>} workspaces
   * @returns {string[]}
   */
  const sortedKeys = (workspaces) => [...workspaces.keys()].sort()

  after(() => Promise.all(dirs.map(cleanup)))

  it('returns public workspaces matched by the root globs', async () => {
    const dir = await makeTree({
      'package.json': ROOT_MANIFEST,
      'packages/a/package.json': { name: '@test/a' },
      'packages/b/package.json': { name: '@test/b' },
    })
    const workspaces = await getPublicWorkspaces(dir)
    assert.deepEqual(sortedKeys(workspaces), [
      'packages/a/package.json',
      'packages/b/package.json',
    ])
    assert.equal(workspaces.get('packages/a/package.json'), '@test/a')
    assert.equal(workspaces.get('packages/b/package.json'), '@test/b')
  })

  it('excludes private workspaces', async () => {
    const dir = await makeTree({
      'package.json': ROOT_MANIFEST,
      'packages/a/package.json': { name: '@test/a' },
      'packages/secret/package.json': { name: '@test/secret', private: true },
    })
    assert.deepEqual(sortedKeys(await getPublicWorkspaces(dir)), [
      'packages/a/package.json',
    ])
  })

  it('excludes manifests without a name and dirs without a manifest', async () => {
    const dir = await makeTree({
      'package.json': ROOT_MANIFEST,
      'packages/a/package.json': { name: '@test/a' },
      'packages/nameless/package.json': { version: '1.0.0' },
      'packages/empty/test/.keep': '',
    })
    assert.deepEqual(sortedKeys(await getPublicWorkspaces(dir)), [
      'packages/a/package.json',
    ])
  })

  it('ignores package.json files outside the workspace globs', async () => {
    const dir = await makeTree({
      'package.json': ROOT_MANIFEST,
      'packages/a/package.json': { name: '@test/a' },
      'packages/a/test/fixture/package.json': { name: 'fixture' },
      'examples/demo/package.json': { name: 'demo' },
      'packages/a/node_modules/dep/package.json': { name: 'dep' },
    })
    assert.deepEqual(sortedKeys(await getPublicWorkspaces(dir)), [
      'packages/a/package.json',
    ])
  })

  it('honors multiple globs, the object form, and negated patterns', async () => {
    const dir = await makeTree({
      'package.json': {
        name: 'root',
        private: true,
        workspaces: { packages: ['packages/*', 'tools/*/', '!packages/skip'] },
      },
      'packages/a/package.json': { name: '@test/a' },
      'packages/skip/package.json': { name: '@test/skip' },
      'tools/t/package.json': { name: '@test/t' },
    })
    assert.deepEqual(sortedKeys(await getPublicWorkspaces(dir)), [
      'packages/a/package.json',
      'tools/t/package.json',
    ])
  })

  it('returns an empty map when no workspaces are declared', async () => {
    const dir = await makeTree({ 'package.json': { name: 'solo' } })
    assert.equal((await getPublicWorkspaces(dir)).size, 0)
  })

  describe('rejects patterns that escape the workspace root', () => {
    for (const pattern of [
      '../sibling/*',
      '..',
      'packages/../../outside',
      'packages/*/../../..',
      '!../sibling',
      '/etc/*',
      'C:\\elsewhere\\*',
      '..\\sibling\\*',
    ]) {
      it(JSON.stringify(pattern), async () => {
        const dir = await makeTree({
          'package.json': { name: 'root', workspaces: ['packages/*', pattern] },
        })
        await assert.rejects(
          getPublicWorkspaces(dir),
          /escapes the workspace root/
        )
      })
    }
  })

  it('allows patterns containing ".." that stay inside the root', async () => {
    const dir = await makeTree({
      'package.json': {
        name: 'root',
        workspaces: ['tools/../packages/*', 'tools..x/*'],
      },
      'packages/a/package.json': { name: '@test/a' },
      'tools..x/b/package.json': { name: '@test/b' },
    })
    const names = [...(await getPublicWorkspaces(dir)).values()].sort()
    assert.deepEqual(names, ['@test/a', '@test/b'])
  })
})

describe('getChangedPackageJsonFiles', () => {
  /** @type {string} */
  let dir
  /** @type {GitRunner} */
  let git
  /** @type {string} */
  let sha

  before(async () => {
    ;({ dir, git } = await makeRepo())
    await commit(
      dir,
      git,
      {
        'package.json': {
          name: 'root',
          private: true,
          workspaces: ['packages/*', 'tools/*'],
        },
        'packages/a/package.json': { name: '@test/a' },
        'packages/secret/package.json': { name: '@test/secret', private: true },
        'tools/t/package.json': { name: '@test/t' },
        'packages/a/test/fixture/package.json': { name: 'fixture' },
      },
      'chore: init'
    )
    // One commit touching every kind of package.json at once
    sha = await commit(
      dir,
      git,
      {
        'package.json': {
          name: 'root',
          private: true,
          workspaces: ['packages/*', 'tools/*'],
          devDependencies: { x: '1.0.0' },
        },
        'packages/a/package.json': {
          name: '@test/a',
          dependencies: { y: '1' },
        },
        'packages/secret/package.json': {
          name: '@test/secret',
          private: true,
          dependencies: { y: '1' },
        },
        'tools/t/package.json': { name: '@test/t', dependencies: { y: '1' } },
        'packages/a/test/fixture/package.json': {
          name: 'fixture',
          dependencies: { y: '1' },
        },
        'packages/a/index.js': '',
      },
      'fix(deps): update y (#1)'
    )
  })

  after(() => cleanup(dir))

  it('returns only public workspace manifests touched by the commit', async () => {
    const files = await getChangedPackageJsonFiles(
      git,
      sha,
      await getPublicWorkspaces(dir)
    )
    assert.deepEqual(files.sort(), [
      'packages/a/package.json',
      'tools/t/package.json',
    ])
  })

  it('returns nothing when the commit touched no public workspace manifest', async () => {
    const files = await getChangedPackageJsonFiles(
      git,
      sha,
      new Map([['packages/other/package.json', '@test/other']])
    )
    assert.deepEqual(files, [])
  })
})

describe('getRuntimeDepChanges', () => {
  /** @type {string} */
  let dir
  /** @type {GitRunner} */
  let git

  before(async () => {
    ;({ dir, git } = await makeRepo())
    await commit(
      dir,
      git,
      {
        'packages/pkg-a/package.json': {
          name: '@test/pkg-a',
          dependencies: { yaml: '^2.7.0' },
          devDependencies: { ava: '^6.0.0' },
        },
      },
      'chore: add pkg-a'
    )
  })

  after(() => cleanup(dir))

  it('detects a changed production dep', async () => {
    const sha = await commit(
      dir,
      git,
      {
        'packages/pkg-a/package.json': {
          name: '@test/pkg-a',
          dependencies: { yaml: '^2.9.0' },
          devDependencies: { ava: '^6.0.0' },
        },
      },
      'fix(deps): update yaml (#1)'
    )
    const changes = await getRuntimeDepChanges(
      git,
      sha,
      'packages/pkg-a/package.json'
    )
    assert.deepEqual(changes, [
      { field: 'dependencies', name: 'yaml', from: '^2.7.0', to: '^2.9.0' },
    ])
  })

  it('returns empty for a devDependency-only change', async () => {
    const sha = await commit(
      dir,
      git,
      {
        'packages/pkg-a/package.json': {
          name: '@test/pkg-a',
          dependencies: { yaml: '^2.9.0' },
          devDependencies: { ava: '^7.0.0' }, // only dev dep changed
        },
      },
      'chore(deps): update ava (#2)'
    )
    const changes = await getRuntimeDepChanges(
      git,
      sha,
      'packages/pkg-a/package.json'
    )
    assert.equal(changes.length, 0)
  })

  it('handles a newly added dep (no parent version)', async () => {
    const sha = await commit(
      dir,
      git,
      {
        'packages/pkg-a/package.json': {
          name: '@test/pkg-a',
          dependencies: { yaml: '^2.9.0', 'new-dep': '1.0.0' },
          devDependencies: { ava: '^7.0.0' },
        },
      },
      'fix(deps): add new-dep (#3)'
    )
    const changes = await getRuntimeDepChanges(
      git,
      sha,
      'packages/pkg-a/package.json'
    )
    const newDep = changes.find((c) => c.name === 'new-dep')
    assert.ok(newDep)
    assert.equal(newDep.from, '(added)')
  })
})

describe('computeChangesets', () => {
  /** @type {string} */
  let dir
  /** @type {GitRunner} */
  let git

  before(async () => {
    ;({ dir, git } = await makeRepo())
    // Seed the .changeset dir, two public packages, and a private one
    await commit(
      dir,
      git,
      {
        'package.json': ROOT_MANIFEST,
        '.changeset/config.json': '{}',
        'packages/pkg-a/package.json': {
          name: '@test/pkg-a',
          dependencies: { yaml: '^2.7.0' },
        },
        'packages/pkg-b/package.json': {
          name: '@test/pkg-b',
          dependencies: { lodash: '^4.17.0' },
        },
        'packages/private-pkg/package.json': {
          name: '@test/private-pkg',
          private: true,
          dependencies: { some: '^1.0.0' },
        },
      },
      'chore: init'
    )
    await git(['tag', 'v0.0.0'])
  })

  after(() => cleanup(dir))

  it('emits a changeset for a public package with a changed prod dep', async () => {
    const sha = await commit(
      dir,
      git,
      {
        'packages/pkg-a/package.json': {
          name: '@test/pkg-a',
          dependencies: { yaml: '^2.9.0' },
        },
      },
      'fix(deps): update yaml to ^2.9.0 (#10)'
    )

    const results = await computeChangesets(git, dir)
    assert.equal(results.length, 1)
    assert.equal(results[0].sha, sha)
    assert.equal(
      path.basename(results[0].filePath),
      `renovate-${sha.slice(0, 7)}.md`
    )
    assert.deepEqual(results[0].pkgNames, ['@test/pkg-a'])
    assert.match(results[0].content, /'@test\/pkg-a': patch/)
    assert.match(results[0].content, /Update yaml to \^2\.9\.0 \(#10\)/)
  })

  it('emits nothing for a chore(deps) commit', async () => {
    const before = (await computeChangesets(git, dir)).length
    await commit(
      dir,
      git,
      {
        'packages/pkg-a/package.json': {
          name: '@test/pkg-a',
          dependencies: { yaml: '^2.9.0' },
          devDependencies: { ava: '^6.0.0' },
        },
      },
      'chore(deps): update ava to v6 (#11)'
    )
    assert.equal((await computeChangesets(git, dir)).length, before)
  })

  it('emits nothing for a private package', async () => {
    const sha = await commit(
      dir,
      git,
      {
        'packages/private-pkg/package.json': {
          name: '@test/private-pkg',
          private: true,
          dependencies: { some: '^2.0.0' },
        },
      },
      'fix(deps): update some to v2 (#12)'
    )
    const results = await computeChangesets(git, dir)
    assert.equal(results.filter((r) => r.sha === sha).length, 0)
  })

  it('emits one changeset listing every package a grouped commit bumps', async () => {
    const sha = await commit(
      dir,
      git,
      {
        'packages/pkg-a/package.json': {
          name: '@test/pkg-a',
          dependencies: { yaml: '^3.0.0' },
        },
        'packages/pkg-b/package.json': {
          name: '@test/pkg-b',
          dependencies: { lodash: '^4.18.0' },
        },
        // Touched in the same commit, but private: must not be listed
        'packages/private-pkg/package.json': {
          name: '@test/private-pkg',
          private: true,
          dependencies: { some: '^3.0.0' },
        },
      },
      'fix(deps): update group (#13)'
    )
    const fromGrouped = (await computeChangesets(git, dir)).filter(
      (r) => r.sha === sha
    )
    assert.equal(fromGrouped.length, 1)
    const [changeset] = fromGrouped
    assert.equal(
      path.basename(changeset.filePath),
      `renovate-${sha.slice(0, 7)}.md`
    )
    assert.deepEqual(changeset.pkgNames, ['@test/pkg-a', '@test/pkg-b'])
    assert.match(
      changeset.content,
      /^---\n'@test\/pkg-a': patch\n'@test\/pkg-b': patch\n---\n/
    )
    // Distinct changes from both packages appear as continuation lines
    assert.match(changeset.content, /`yaml`: `\^2\.9\.0` → `\^3\.0\.0`/)
    assert.match(changeset.content, /`lodash`: `\^4\.17\.0` → `\^4\.18\.0`/)
  })

  it('omits packages from a grouped commit that changed only devDependencies', async () => {
    const sha = await commit(
      dir,
      git,
      {
        'packages/pkg-a/package.json': {
          name: '@test/pkg-a',
          dependencies: { yaml: '^3.1.0' },
        },
        'packages/pkg-b/package.json': {
          name: '@test/pkg-b',
          dependencies: { lodash: '^4.18.0' },
          devDependencies: { ava: '^6.0.0' },
        },
      },
      'fix(deps): update yaml and ava (#14)'
    )
    const fromCommit = (await computeChangesets(git, dir)).filter(
      (r) => r.sha === sha
    )
    assert.equal(fromCommit.length, 1)
    assert.deepEqual(fromCommit[0].pkgNames, ['@test/pkg-a'])
    assert.doesNotMatch(fromCommit[0].content, /pkg-b/)
  })

  it('skips a package whose package.json does not exist in the working tree', async () => {
    const { dir: d2, git: g2 } = await makeRepo()
    try {
      await commit(
        d2,
        g2,
        {
          'package.json': ROOT_MANIFEST,
          '.changeset/config.json': '{}',
          'packages/ghost/package.json': {
            name: '@test/ghost',
            dependencies: { x: '^1.0.0' },
          },
        },
        'chore: init'
      )
      await g2(['tag', 'v0.0.0'])
      await commit(
        d2,
        g2,
        {
          'packages/ghost/package.json': {
            name: '@test/ghost',
            dependencies: { x: '^2.0.0' },
          },
        },
        'fix(deps): update x (#20)'
      )
      // Simulate a package deleted from the working tree after the commit
      await cleanup(path.join(d2, 'packages/ghost'))
      assert.deepEqual(await computeChangesets(g2, d2), [])
    } finally {
      await cleanup(d2)
    }
  })

  it('ignores commits older than the boundary', async () => {
    // The boundary is the last release-please tag; a fix(deps) commit before
    // it was already released.
    const { dir: d2, git: g2 } = await makeRepo()
    try {
      await commit(
        d2,
        g2,
        {
          'package.json': ROOT_MANIFEST,
          'packages/pkg/package.json': {
            name: '@test/pkg',
            dependencies: { x: '^1.0.0' },
          },
        },
        'chore: init'
      )
      await commit(
        d2,
        g2,
        {
          'packages/pkg/package.json': {
            name: '@test/pkg',
            dependencies: { x: '^2.0.0' },
          },
        },
        'fix(deps): OLD commit, already released (#0)'
      )
      await commit(d2, g2, { 'release.txt': '' }, 'chore: release main (#1)')
      await g2(['tag', 'pkg-v1.0.1'])
      await commit(
        d2,
        g2,
        { '.changeset/config.json': '{}' },
        'chore(ci): migrate to Changesets'
      )
      assert.deepEqual(await computeChangesets(g2, d2), [])
    } finally {
      await cleanup(d2)
    }
  })

  describe('with bootstrapSha', () => {
    /** @type {string} */
    let d2
    /** @type {GitRunner} */
    let g2
    /** @type {string} */
    let initSha
    /** @type {string} */
    let oldFixSha
    /** @type {string} */
    let releaseSha
    /** @type {string} */
    let newFixSha

    // init → fix(deps) #1 → "chore: version packages" (tagged) → fix(deps) #2
    before(async () => {
      ;({ dir: d2, git: g2 } = await makeRepo())
      initSha = await commit(
        d2,
        g2,
        {
          'package.json': ROOT_MANIFEST,
          'packages/pkg/package.json': {
            name: '@test/pkg',
            dependencies: { x: '^1.0.0' },
          },
        },
        'chore: init'
      )
      oldFixSha = await commit(
        d2,
        g2,
        {
          'packages/pkg/package.json': {
            name: '@test/pkg',
            dependencies: { x: '^2.0.0' },
          },
        },
        'fix(deps): update x to v2 (#1)'
      )
      releaseSha = await commit(
        d2,
        g2,
        { 'release.txt': '' },
        'chore: version packages'
      )
      await g2(['tag', 'pkg-v1.0.1'])
      newFixSha = await commit(
        d2,
        g2,
        {
          'packages/pkg/package.json': {
            name: '@test/pkg',
            dependencies: { x: '^3.0.0' },
          },
        },
        'fix(deps): update x to v3 (#2)'
      )
    })

    after(() => cleanup(d2))

    /**
     * @param {string | undefined} bootstrapSha
     * @returns {Promise<string[]>} SHAs of commits that produced changesets
     */
    const shasFor = async (bootstrapSha) =>
      (await computeChangesets(g2, d2, { bootstrapSha }))
        .map((r) => r.sha)
        .sort()

    it('uses detection when omitted', async () => {
      assert.deepEqual(await shasFor(undefined), [newFixSha])
    })

    it('overrides detection when set before the detected boundary', async () => {
      assert.deepEqual(await shasFor(initSha), [newFixSha, oldFixSha].sort())
    })

    it('overrides detection when set after the detected boundary', async () => {
      assert.deepEqual(await shasFor(newFixSha), [])
    })

    it('accepts an abbreviated SHA', async () => {
      assert.deepEqual(
        await shasFor(initSha.slice(0, 7)),
        [newFixSha, oldFixSha].sort()
      )
    })

    it('treats the bootstrap commit itself as exclusive', async () => {
      assert.deepEqual(await shasFor(oldFixSha), [newFixSha])
      assert.deepEqual(await shasFor(releaseSha), [newFixSha])
    })
  })
})

describe('resolveBootstrapSha', () => {
  /** @type {string} */
  let dir
  /** @type {GitRunner} */
  let git
  /** @type {string} */
  let baseSha
  /** @type {string} */
  let sideSha

  before(async () => {
    ;({ dir, git } = await makeRepo())
    baseSha = await commit(dir, git, { 'a.txt': '1' }, 'chore: init')
    await git(['checkout', '-b', 'side'])
    sideSha = await commit(dir, git, { 'side.txt': 's' }, 'feat: side work')
    await git(['checkout', 'main'])
    await commit(dir, git, { 'b.txt': '2' }, 'feat: main work')
  })

  after(() => cleanup(dir))

  it('returns the full SHA for a full SHA', async () => {
    assert.equal(await resolveBootstrapSha(git, baseSha), baseSha)
  })

  it('expands an abbreviated SHA', async () => {
    assert.equal(await resolveBootstrapSha(git, baseSha.slice(0, 8)), baseSha)
  })

  it('rejects an unknown SHA', async () => {
    await assert.rejects(
      resolveBootstrapSha(git, 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef'),
      /is not a known commit/
    )
  })

  it('rejects an empty string', async () => {
    await assert.rejects(resolveBootstrapSha(git, ''), /is not a known commit/)
  })

  it('rejects a commit that is not an ancestor of HEAD', async () => {
    await assert.rejects(
      resolveBootstrapSha(git, sideSha),
      /is not an ancestor of HEAD/
    )
  })
})
