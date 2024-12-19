const { isGitUrl, gitInfo } = require('./isgit')

const belongs = async (user, project, commit) => {
  return await fetch(
    `https://github.com/${user}/${project}/branch_commits/${commit}`,
    {
      headers: {
        Accept: 'application/json',
      },
    }
  )
    .then((res) => {
      if (!res.ok) {
        return {}
      }
      return res.json()
    })
    .then((data) => data?.branches?.length > 0 || data?.tags?.length > 0)
}

class ValidateGitUrl {
  constructor({ packages }) {
    this.packages = packages
  }

  async validate(knownDirectDependencies) {
    const dependencies = Object.entries(this.packages).map(([key, dep]) => {
      const [name, specifier] = key.split('@')
      return { url: dep.resolved, packageName: name, specifier }
    })
    const errors = []

    for (const dep of dependencies) {
      const { url, packageName, specifier } = dep
      if (isGitUrl(url)) {
        const info = gitInfo(url)
        if (!info) {
          errors.push({
            message: `Could not parse '${url}' as a git URL`,
            package: packageName,
          })
          continue
        }
        if (knownDirectDependencies && knownDirectDependencies[packageName]) {
          const directInfo = gitInfo(knownDirectDependencies[packageName])
          if (!directInfo) {
            errors.push({
              message: `Could not parse '${knownDirectDependencies[packageName]}' as a git URL`,
              package: packageName,
            })
            continue
          }

          if (info.committish !== directInfo.committish) {
            errors.push({
              message: `There's a mismatch between the specified git hash and URL to be fetched.
    specifier: ${specifier}
    url: ${url}
    `,
              package: packageName,
            })
            continue
          }
          if (!/^[0-9a-f]{40}$/.test(info.committish)) {
            errors.push({
              message: `GIT URLs in lockfile must use a commit hash.
    expected: ${packageName}#COMMITHASH_40_CHARACTERS_LONG
    actual: ${specifier}
    `,
              package: packageName,
            })
            continue
          }
          if (info && info.type === 'github') {
            const isFound = await belongs(
              info.user,
              info.project,
              info.committish
            )
            if (!isFound) {
              errors.push({
                message: `The specified commit hash for ${packageName} does not exist in the repository. It might exist on a fork, but you should not trust that.
    specifier: ${specifier}
    url: ${url}
    `,
                package: packageName,
              })
            }
            continue
          }
        } else {
          if (info.type !== 'github') {
            errors.push({
              message: `The git URL of a transitive dependency is not a GitHub repo URL. It could be anything...
    specifier: ${specifier}
    url: ${url}
    `,
              package: packageName,
            })
            continue
          }
        }
      }
    }

    return {
      type: errors.length === 0 ? 'success' : 'error',
      errors,
    }
  }
}
exports.ValidateGitUrl = ValidateGitUrl
