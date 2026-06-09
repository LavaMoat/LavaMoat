// @ts-check
import { readFile, access } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * @typedef {{
 *   cwd: string
 *   packageJson: Record<string, any> | null
 *   packageManagerField: string | null
 *   hasPackageLock: boolean
 *   lockfileVersion: number | null
 *   hasNpmrc: boolean
 *   hasYarnLock: boolean
 *   hasYarnrc: boolean
 *   hasYarnrcYml: boolean
 *   hasPnpmLock: boolean
 *   hasPnpmWorkspace: boolean
 *   directGitDeps: string[]
 * }} Facts
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
    hasPnpmLock: await exists('pnpm-lock.yaml'),
    hasPnpmWorkspace: await exists('pnpm-workspace.yaml'),
    directGitDeps: findDirectGitDeps(packageJson),
  }
}

const GIT_DEP_PATTERN = /^(git\+|git:|github:)/

/**
 * @param {Record<string, any> | null} packageJson
 * @returns {string[]}
 */
function findDirectGitDeps(packageJson) {
  if (!packageJson) return []
  const allDeps = [
    ...Object.values(packageJson.dependencies || {}),
    ...Object.values(packageJson.devDependencies || {}),
  ]
  return allDeps.filter((v) => typeof v === 'string' && GIT_DEP_PATTERN.test(v))
}

/**
 * @typedef {{ name: 'npm' | 'yarn' | 'pnpm'; version: string | null }} DetectedPM
 */

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
        name: /** @type {'npm' | 'yarn' | 'pnpm'} */ (match[1]),
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
