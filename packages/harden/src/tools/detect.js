import { readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { parseDocument } from 'yaml'

/**
 * @import {PackageJson} from "type-fest"
 */

/**
 * @import {
 *   DetectedPM,
 *   Facts
 * } from "./types.js"
 */

/**
 * @param {string} cwd
 * @returns {Promise<Facts>}
 */
export async function collectFacts(cwd) {
  const exists = async (/** @type {string} */ file) => {
    try {
      await access(join(cwd, file))
      return true
    } catch {
      return false
    }
  }

  const readJson = async (/** @type {string} */ file) => {
    try {
      const content = await readFile(join(cwd, file), 'utf8')
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  const readYarnConfig = async () => {
    try {
      const content = await readFile(join(cwd, '.yarnrc.yml'), 'utf8')
      const doc = parseDocument(content)
      return doc.toJSON()
    } catch {
      return null
    }
  }
  const readPnpmWorkspace = async () => {
    try {
      const content = await readFile(join(cwd, 'pnpm-workspace.yaml'), 'utf8')
      const doc = parseDocument(content)
      return doc.toJSON()
    } catch {
      return null
    }
  }

  const packageJson = await readJson('package.json')
  const packageLock = await readJson('package-lock.json')

  return {
    cwd,
    packageJson,
    packageManagerField: packageJson?.packageManager ?? null,
    hasPackageLock: packageLock !== null,
    lockfileVersion: packageLock?.lockfileVersion ?? null,
    hasNpmrc: await exists('.npmrc'),
    hasYarnLock: await exists('yarn.lock'),
    hasYarnrc: await exists('.yarnrc'),
    hasYarnrcYml: await exists('.yarnrc.yml'),
    yarnConfig: await readYarnConfig(),
    hasYarnState: await exists('.yarn/install-state.gz'),
    hasPnpmLock: await exists('pnpm-lock.yaml'),
    hasPnpmWorkspace: await exists('pnpm-workspace.yaml'),
    pnpmWorkspace: await readPnpmWorkspace(),
    directGitDeps: findDirectGitDeps(packageJson),
  }
}

// TODO: improve coverage for https://docs.npmjs.com/cli/v11/configuring-npm/package-json#github-urls
const GIT_DEP_PATTERN = /^(git\+|git:|github:)/

/**
 * @param {PackageJson | null} packageJson
 * @returns {string[]}
 */
function findDirectGitDeps(packageJson) {
  if (!packageJson) return []
  const allDeps = [
    ...Object.values(packageJson.dependencies || {}),
    ...Object.values(packageJson.devDependencies || {}),
    ...Object.values(packageJson.optionalDependencies || {}),
  ]
  const gitDeps = allDeps.filter(
    (v) => typeof v === 'string' && GIT_DEP_PATTERN.test(v)
  )
  return /** @type {string[]} */ (gitDeps)
}

/**
 * @param {Facts} facts
 * @returns {DetectedPM | null}
 */
export function detectPackageManager(facts) {
  // packageManager field is most authoritative
  if (facts.packageManagerField) {
    const match = facts.packageManagerField.match(/^(npm|yarn|pnpm)@(.+)$/)
    if (match) {
      return {
        name: /** @type {DetectedPM['name']} */ (match[1]),
        version: match[2],
      }
    }
  }

  // Detect from lockfiles
  if (facts.hasYarnLock) {
    return { name: 'yarn', version: null }
  }
  if (facts.hasPnpmLock) {
    return { name: 'pnpm', version: null }
  }
  if (facts.hasPackageLock) {
    return { name: 'npm', version: null }
  }

  return null
}

/**
 * @param {Facts} facts
 * @returns {boolean}
 */
export function isYarnV1(facts) {
  if (facts.packageManagerField) {
    const match = facts.packageManagerField.match(/^yarn@(\d+)/)
    if (match) {
      return parseInt(match[1], 10) < 2
    }
  }
  // .yarnrc without .yarnrc.yml indicates v1
  if (facts.hasYarnrc && !facts.hasYarnrcYml) {
    return true
  }
  return false
}
