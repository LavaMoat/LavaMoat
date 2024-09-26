import {
  loadAllPackageConfigurations,
  printMissingPoliciesIfAny,
} from '@lavamoat/allow-scripts'
import { Plugin, type Project, type Locator } from '@yarnpkg/core'
import { dirname } from 'node:path'

// Disable lifecycle scripts for transitive git deps with a yarn classic lockfile
if (typeof process.env['YARN_IGNORE_SCRIPTS'] === 'undefined') {
  process.env['YARN_IGNORE_SCRIPTS'] = 'true'
}

interface ExtendedProject extends Project {
  allowScriptsConfig?: Map<string, boolean>
}

// Yarn inserts spurious / for absolute paths on Windows
const yarnCwdToPath = (cwd: string): string =>
  // eslint-disable-next-line no-useless-escape
  process.platform === 'win32' ? cwd.replace(/^[\/]/, '') : cwd

const isPackageScriptAllowed = async (
  project: ExtendedProject,
  npm_package_json: string
): Promise<boolean> => {
  if (!project.allowScriptsConfig) {
    project.allowScriptsConfig = new Map<string, boolean>()
  }
  const {
    canonicalNamesByPath,
    configs: { lifecycle },
  } = await loadAllPackageConfigurations({
    rootDir: yarnCwdToPath(project.cwd),
  })
  const scriptDir = dirname(npm_package_json)
  const packageName = canonicalNamesByPath.get(scriptDir)
  if (!packageName) {
    process.stderr.write(
      `FATAL ERROR: allow-scripts blocked execution of unexpected package script. ${JSON.stringify(
        {
          package: packageName,
          manifestPath: npm_package_json,
        }
      )}`
    )
    process.exit(1)
  }
  if (lifecycle.disallowedPatterns.includes(packageName)) {
    project.allowScriptsConfig.set(packageName, false)
    return false
  }
  if (lifecycle.allowedPatterns.includes(packageName)) {
    project.allowScriptsConfig.set(packageName, true)
    return true
  }
  return null
}

const plugin: Plugin = {
  hooks: {
    wrapScriptExecution: (
      executor: () => Promise<number>,
      project: ExtendedProject,
      _locator: Locator,
      npm_lifecycle_event: string,
      { env: { npm_package_json, npm_package_name } }: { env: any }
    ): Promise<() => Promise<number>> => {
      return new Promise((resolve, _reject) =>
        isPackageScriptAllowed(project, npm_package_json).then((isAllowed) => {
          if (!isAllowed) {
            console.error(
              isAllowed === null
                ? `  allow-scripts blocking execution of unconfigured package script. ${JSON.stringify([npm_package_name, npm_lifecycle_event, npm_package_json])}`
                : `  allow-scripts blocking execution of disallowed package script. ${JSON.stringify([npm_package_name, npm_lifecycle_event, npm_package_json])}`
            )
            return resolve(() => Promise.resolve(0))
          }
          return resolve(executor)
        })
      )
    },
    afterAllInstalled: (project: ExtendedProject) => {
      loadAllPackageConfigurations({
        rootDir: yarnCwdToPath(project.cwd),
      }).then((result) => {
        const {
          configs: { lifecycle },
          somePoliciesAreMissing,
        } = result
        const extraMissingPolicies = project.allowScriptsConfig
          ? (() => {
              const missingPolicies = new Set<string>()
              for (const [name, _isAllowed] of project.allowScriptsConfig) {
                const policyValue = lifecycle.allowConfig[name]
                switch (typeof policyValue) {
                  case 'boolean':
                    continue
                  case 'undefined':
                    missingPolicies.add(name)
                    continue
                  default:
                    throw new Error(
                      `Undefined type ${typeof policyValue} for allow-scripts policy value '${policyValue}'`
                    )
                }
              }
              return missingPolicies
            })()
          : new Set<string>()

        if (extraMissingPolicies.size || somePoliciesAreMissing) {
          console.error(
            '\n@lavamoat/allow-scripts has detected dependencies without configuration. explicit configuration required.'
          )
          console.error(
            'run "allow-scripts auto" from the project root to automatically populate the configuration.\n'
          )
          printMissingPoliciesIfAny(lifecycle)
          for (const policy of extraMissingPolicies) {
            console.error(policy)
          }
          process.exit(1)
        }
      })
    },
  },
}

export default plugin
