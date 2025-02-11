const { isGitUrl, gitInfo, isCommitHash } = require('./isgit')

let githubCache = new Map()

// TODO: this might be slow. Would be nice to indicate progress somehow. Maybe some concurrency too if we're careful not to trip up API limits
const belongs = async (user, project, commit) => {
  const url = `https://github.com/${user}/${project}/branch_commits/${commit}`

  if (githubCache.has(url)) {
    return githubCache.get(url)
  }
  return await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  })
    .then((res) => {
      if (!res.ok) {
        if (res.status === 404) {
          return {} // 404 is equivalent to "not there"
        }
        throw new Error(`[${res.status}] Failed to look up ${user}/${project}`)
      }
      return res.json()
    })
    .then((data) => {
      const result = data?.branches?.length > 0 || data?.tags?.length > 0
      githubCache.set(url, result)
      return result
    })
}

const tag2commit = async (user, project, tag) => {
  const url = `https://github.com/${user}/${project}/tree/${tag}`

  if (githubCache.has(url)) {
    return githubCache.get(url)
  }
  return await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  })
    .then((res) => {
      if (!res.ok) {
        if (res.status === 404) {
          return {} // 404 is equivalent to "not there"
        }
        throw new Error(`[${res.status}] Failed to look up ${user}/${project}`)
      }
      return res.json()
    })
    .then((data) => {
      const { currentOid, refType } = data?.payload?.refInfo || {}

      return {
        commit: currentOid,
        isTag: (refType || '').toUpperCase() === 'TAG',
      }
    })
}

class ValidateGitUrl {
  constructor({ packages }) {
    githubCache = new Map() // TODO: instantiate properly, this is a temporary cludge to minimize memory leaks in case it's used programatically.
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
          if (!isCommitHash(info.committish)) {
            errors.push({
              message: `GIT URLs in lockfile must use a commit hash.
    expected: ${packageName}#COMMITHASH_40_CHARACTERS_LONG
    actual: ${specifier}
    `,
              package: packageName,
            })
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

        if (info.type === 'github') {
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
      }
    }

    return {
      type: errors.length === 0 ? 'success' : 'error',
      errors,
    }
  }
}
exports.ValidateGitUrl = ValidateGitUrl
exports.belongs = belongs
exports.tag2commit = tag2commit
