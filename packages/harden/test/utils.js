/* eslint-disable n/no-unsupported-features/node-builtins */
import { execFile } from 'node:child_process'
import { rmSync } from 'node:fs'
import { cp, mkdtemp, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir, platform } from 'node:os'
import { promisify } from 'node:util'

export const execFileAsync = promisify(execFile)

export const DEBUG = false
export const PKGMGR_LIST = ['npm', 'yarn', 'pnpm']
export const PROJECTS_DIR = new URL('./projects/', import.meta.url).pathname

export const isWindows = platform() === 'win32'

// https://github.com/nodejs/node/issues/38490
export const fixWindowsExecPath = (inPath) =>
  '"' + inPath.replace(/"/g, '\\"') + '"'

export const portableExecPath = (inPath, debugLogging) => {
  if (!isWindows) {
    return inPath
  }
  const portablePath = fixWindowsExecPath(inPath)
  if (debugLogging && inPath !== portablePath) {
    console.log(
      `@lavamoat/allow-scripts: transforming absolute path from ${inPath} to ${portablePath}`
    )
  }
  return portablePath
}

export function getProjectDir(name) {
  return join(PROJECTS_DIR, name)
}

/**
 * Copies a fixture project to a temp dir and returns the temp path.
 *
 * @param {import('ava').ExecutionContext<unknown>} t
 * @param {string} name
 */
export async function copyProject(t, name) {
  if (DEBUG) {
    return getProjectDir(name)
  }
  const tmp = await mkdtemp(join(tmpdir(), `harden-test-${name}-`))
  await cp(getProjectDir(name), tmp, { recursive: true })
  t.log(`--- setting up test in ${tmp}`)
  return tmp
}

/**
 * Returns a normalized unified diff between originalDir and modifiedDir. Paths
 * and timestamps are replaced with stable placeholders.
 *
 * @param {string} originalDir
 * @param {string} modifiedDir
 */
export async function diffDirs(originalDir, modifiedDir) {
  let stdout
  try {
    ;({ stdout } = await execFileAsync('diff', [
      '-u',
      '-N',
      originalDir,
      modifiedDir,
    ]))
  } catch (err) {
    if (err && typeof err === 'object' && /** @type {any} */ (err).code === 1) {
      stdout = /** @type {any} */ (err).stdout
    } else {
      throw err
    }
  }

  const files = await readdir(modifiedDir, {
    recursive: true,
    withFileTypes: true,
  })
  const fileList = files
    .filter((f) => f.isFile())
    .map((f) =>
      f.parentPath
        ? f.parentPath.slice(modifiedDir.length + 1) + '/' + f.name
        : f.name
    )
    .filter((p) => !p.startsWith('node_modules/'))
    .sort()
    .join('\n')

  const diff = (stdout ?? '')
    .replaceAll(modifiedDir, '<modified>')
    .replaceAll(originalDir, '<original>')
    .replace(/^(---|\+\+\+) (.+?)\s+\S+\s+\S+\s+\S+$/gm, '$1 $2')
    .replace(/^\s*diff -u -N .+$/gm, '\n')

  return `--- files ---\n${fileList}\n--- diff ---\n${diff}`
}

export function logPrint() {
  const log = []
  return {
    forget: () => {},
    print: (...args) => {
      log.push(args.join(' '))
    },
    log,
  }
}

export function cleanupInstallArtifacts(cwd) {
  rmSync(join(cwd, 'pnpm-lock.yaml'), { force: true })
  rmSync(join(cwd, 'yarn.lock'), { force: true })
  rmSync(join(cwd, '.pnp.cjs'), { force: true })
  rmSync(join(cwd, 'package-lock.json'), { force: true })
}
