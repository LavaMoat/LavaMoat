const { existsSync, readFileSync } = require('node:fs')
const { join } = require('node:path')
const { globSync } = require('glob')
const { isGitSpecifier, gitInfo, isUnsafeUrl } = require('./isgit')

const getDependencies = (packageJson) => {
  const dependencies = packageJson.dependencies || {}
  const devDependencies = packageJson.devDependencies || {}
  const optionalDependencies = packageJson.optionalDependencies || {}
  const allDependencies = {
    ...dependencies,
    ...devDependencies,
    ...optionalDependencies,
  }
  return allDependencies
}
const getDirectDependenciesForPath = async (rootPath) => {
  const topPkg = join(rootPath, 'package.json')
  if (!existsSync(topPkg)) {
    throw Error(`Project's package.json not found`)
  }

  const packageJson = JSON.parse(readFileSync(join(rootPath, 'package.json')))
  const dependencies = getDependencies(packageJson)
  if (packageJson.workspaces) {
    // get dependencies from all packagejson files in the workspace
    const workspaces = packageJson.workspaces
    const workspacePaths = workspaces.packages || workspaces
    if (!Array.isArray(workspacePaths)) {
      throw Error(`workspaces field in package.json must be an array`)
    }
    const globbedWorkspaces = workspacePaths.flatMap((workspacePath) =>
      globSync(workspacePath, { ignore: 'node_modules/**', cwd: rootPath })
    )
    const workspaceDependencies = globbedWorkspaces.map((workspacePath) => {
      try {
        const workspacePackageJson = JSON.parse(
          readFileSync(join(rootPath, workspacePath, 'package.json'))
        )
        return getDependencies(workspacePackageJson)
      } catch (e) {
        console.warn(
          `Warning: couldn't read package.json in workspace: ${workspacePath}`
        )
      }
    })
    return Object.assign(dependencies, ...workspaceDependencies)
  } else {
    return dependencies
  }
}

const validateGitSpecifier = (packageName, specifier) => {
  if (isUnsafeUrl(specifier)) {
    return {
      message: `GIT URLs must use HTTPS.
    expected: ${specifier.replace('http:', 'https:')}
    actual: ${specifier}
    `,
      package: packageName,
    }
  }
  const { committish } = gitInfo(specifier)

  if (!committish || !/^[0-9a-f]+$/.test(committish)) {
    return {
      message: `GIT URLs must use a commit hash.
    expected: ${specifier.replace(/#.*/, '')}#COMMITHASH_40_CHARACTERS_LONG
    actual: ${specifier}
    `,
      package: packageName,
    }
  }
  if (!/^[0-9a-f]{40}$/.test(committish)) {
    return {
      message: `GIT URLs in package.json dependencies must use a full-length commit hash.
    expected: ${specifier.replace(/#.*/, '')}#COMMITHASH_40_CHARACTERS_LONG
    actual: ${specifier}
    `,
      package: packageName,
    }
  }
}

const processDependencies = (dependencies) => {
  const gitDependencies = Object.entries(dependencies).filter(([, value]) =>
    isGitSpecifier(value)
  )
  const errors = gitDependencies.reduce((acc, [packageName, specifier]) => {
    const result = validateGitSpecifier(packageName, specifier)
    if (result) {
      result.validator = 'packageJson'
      acc.push(result)
    }
    return acc
  }, [])

  return {
    dependencies: Object.fromEntries(gitDependencies),
    errors,
  }
}

exports.processDependencies = processDependencies
exports.scanDirectGitDependencies = async (path) => {
  const dependencies = await getDirectDependenciesForPath(path)
  return processDependencies(dependencies)
}
