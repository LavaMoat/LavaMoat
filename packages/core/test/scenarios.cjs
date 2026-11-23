// @ts-check
/**
 * Scenario loader – yields {@link Scenario} objects from committed fixture
 * directories.
 *
 * `loadScenarios()` → `fixtures/scenarios/shared/` (consumed by all platforms)
 * `loadCoreScenarios()` → `fixtures/scenarios/core/` (core-only tests)
 *
 * @module
 */

'use strict'

const fs = require('node:fs')
const path = require('node:path')

/** Core-only fixtures live in test/fixtures/scenarios/core/ */
const CORE_FIXTURES_ROOT = path.join(__dirname, 'fixtures', 'scenarios', 'core')

/** Shared fixtures are published as the `scenarios/` directory at package root */
const SHARED_FIXTURES_ROOT = path.join(__dirname, '..', 'scenarios')

/**
 * Path of a fixture's policy file, relative to the fixture directory.
 *
 * This is the default policy location used by `@lavamoat/node`.
 */
const POLICY_PATH = path.join('lavamoat', 'node', 'policy.json')

/**
 * @import {LavaMoatPolicy} from '@lavamoat/types'
 * @import {Scenario} from './scenario'
 */

/**
 * Read a fixture's policy from its `lavamoat/node/policy.json`.
 *
 * A fixture without a policy file gets the default (empty) policy.
 *
 * @param {string} fixtureDir Absolute path to the fixture directory
 * @returns {LavaMoatPolicy}
 */
function loadPolicy(fixtureDir) {
  /** @type {string} */
  let source
  try {
    source = fs.readFileSync(path.join(fixtureDir, POLICY_PATH), 'utf8')
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ENOENT') {
      return { resources: {} }
    }
    throw err
  }
  return JSON.parse(source)
}

/**
 * Read a fixture directory and return a populated {@link Scenario} object.
 *
 * @param {string} fixtureDir Absolute path to the fixture directory
 * @returns {Scenario}
 */
function loadFixture(fixtureDir) {
  // `$schema` is for editors only; it is not part of a `Scenario`
  const { $schema: _$schema, ...json } = JSON.parse(
    fs.readFileSync(path.join(fixtureDir, 'scenario.json'), 'utf8')
  )
  return {
    ...json,
    dir: fixtureDir,
    entryPath: path.join(fixtureDir, 'entry.js'),
    setupPath: json.setupPath
      ? path.join(fixtureDir, json.setupPath)
      : undefined,
    policy: loadPolicy(fixtureDir),
  }
}

/**
 * Yield all scenarios from a fixtures sub-tree.
 *
 * Directory layout: `<base>/<group>/<slug>/scenario.json`
 *
 * @param {string} base Absolute path to `shared/` or `core/`
 * @returns {Generator<Scenario>}
 */
function* iterFixtures(base) {
  if (!fs.existsSync(base)) return
  for (const groupEnt of fs
    .readdirSync(base, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (!groupEnt.isDirectory()) continue
    const groupDir = path.join(base, groupEnt.name)
    for (const slugEnt of fs
      .readdirSync(groupDir, { withFileTypes: true })
      .sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (!slugEnt.isDirectory()) continue
      const fixtureDir = path.join(groupDir, slugEnt.name)
      if (!fs.existsSync(path.join(fixtureDir, 'scenario.json'))) continue
      yield loadFixture(fixtureDir)
    }
  }
}

/**
 * Async generator that yields all **shared** scenarios.
 *
 * Shared scenarios are platform-agnostic and consumed by `@lavamoat/node` and
 * other platform test suites.
 *
 * @returns {AsyncGenerator<Scenario>}
 */
async function* loadScenarios() {
  for (const scenario of iterFixtures(SHARED_FIXTURES_ROOT)) {
    yield scenario
  }
}

/**
 * Async generator that yields **core-only** scenarios (inline test migrations
 * from `globals.spec.js`, `builtin.spec.js`, `circular-deps.spec.js`).
 *
 * @returns {AsyncGenerator<Scenario>}
 */
async function* loadCoreScenarios() {
  for (const scenario of iterFixtures(CORE_FIXTURES_ROOT)) {
    yield scenario
  }
}

module.exports = { loadScenarios, loadCoreScenarios, loadFixture }
