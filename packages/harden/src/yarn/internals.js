// You will need to install @yarnpkg/core and @yarnpkg/fslib
import { Configuration, Project } from '@yarnpkg/core'
import { npath } from '@yarnpkg/fslib'

export async function findPackagesWithScripts() {
  // Yarn uses its own portable paths for cross-platform consistency
  const cwd = npath.toPortablePath(process.cwd())

  // 1. Load the project configuration (reads .yarnrc.yml)
  const configuration = await Configuration.find(cwd, null)

  // 2. Hydrate the project state (This automatically reads and parses install-state.gz)
  const { project } = await Project.find(configuration, cwd)
  await project.restoreInstallState() // Ensure install-state.gz is loaded

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
      packagesWithScripts.push(pkg)
    }
  }

  return packagesWithScripts
}
