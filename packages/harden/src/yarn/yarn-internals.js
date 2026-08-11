// You will need to install @yarnpkg/core and @yarnpkg/fslib
import { Configuration, Project } from '@yarnpkg/core'
import { npath } from '@yarnpkg/fslib'
// import { getPluginConfiguration } from '@yarnpkg/cli'

/**
 * @import {
 *   Facts,
 *   PrintApi
 * } from "../tools/types.js"
 */

const projectCache = new Map()

/**
 * Get the Yarn project for a given location, using caching to avoid redundant
 * work. Yarn's project loading is relatively expensive, so we cache it based on
 * the portable path of the location.
 *
 * @param {string} location - The file system path to the project.
 * @returns {Promise<{ project: Project; configuration: Configuration }>} - The
 *   loaded Yarn project and its configuration.
 */
async function getProject(location) {
  // Yarn uses its own portable paths for cross-platform consistency
  const cwd = npath.toPortablePath(location)
  if (projectCache.has(cwd)) {
    return projectCache.get(cwd)
  }

  const configuration = await Configuration.find(cwd, null, {
    strict: false,
  })
  const { project } = await Project.find(configuration, cwd)
  projectCache.set(cwd, { project, configuration })
  return { project, configuration }
}

/**
 * Ensures the project is in a state where skipped builds can be detected
 *
 * @param {Facts} facts
 * @param {PrintApi} print
 */
export async function ensureWorkspaceInitialized(facts, print) {
  if (facts.hasYarnLock && facts.hasYarnState) {
    return
  }
  // An attempt to programmatically run Project.install was headed towards pulling in all of yarn cli as dependencies, so instead we just shell out to `yarn install` which will have the same effect of initializing the workspace and generating the install state.
  // Running `yarn install --non-interactive --immutable=facts.hasYarnLock` in the target directory has its own problems with errors being likely.
  print(
    `Yarn workspace is not fully initialized. Please run 'yarn install' in the project directory to initialize the workspace and allow harden to detect existing lifecycle scripts.`
  )
}

/**
 * Find packages with lifecycle scripts in a Yarn project. This reads the
 * project's install state to find packages that have been marked as having
 * lifecycle scripts (skippedBuilds).
 *
 * @param {Facts} facts
 * @returns {Promise<{ name: string; version: string | null }[]>} - A list of
 *   packages with lifecycle scripts.
 */
export async function findPackagesWithScripts(facts) {
  if (!facts.hasYarnLock || !facts.hasYarnState) {
    return []
  }
  const { project } = await getProject(facts.cwd)
  await project.restoreInstallState({
    // restoreBuildState: true,
  }) // Ensure install-state.gz is loaded

  /* skippedBuilds is a Set of locators like
 Set(1) {
  '7236ef23340e2b1a75c0eb90a39c17e5a0ccdd494c7e52c8d0a926917b6292547bcfb215aa637fd09b1e6572b6b9874adcbfe2f2f77c4a3cb497e42779766999'
}
  the locator hash needs to be looked up in the project to get a name and version of the package

*/
  const packagesWithScripts = []
  for (const locatorStr of project.skippedBuilds) {
    const pkg = project.storedPackages.get(locatorStr)
    if (pkg) {
      packagesWithScripts.push({ name: pkg.name, version: pkg.version ?? null })
    }
  }

  return packagesWithScripts
}
