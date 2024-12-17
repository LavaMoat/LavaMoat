const gitinfo = require('hosted-git-info')
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

const isCodeloadUrl = (url) => url.startsWith('https://codeload.github.com/')
class ValidateGitUrl {
  constructor({ packages }) {
    this.packages = packages
  }

  async validate() {
    const dependencies = Object.entries(this.packages).map(([key, dep]) => {
      const [name, specifier] = key.split('@')
      return { url: dep.resolved, packageName: name, specifier }
    })
    const errors = []

    // Regular expression to match various Git URL formats
    const gitUrlRegex =
      /^(git\+https:\/\/|github:|git:\/\/|https:\/\/([a-z]+\.)*github\.com|ssh:\/\/git@|git@).+$/

    for (const dep of dependencies) {
      const { url, packageName, specifier } = dep
      if (gitUrlRegex.test(url)) {
        const parts = specifier.split('#')

        const urlHash = isCodeloadUrl(url)
          ? url.split('/').pop()
          : url.split('#')[1]
        // console.log({url, urlHash, part1: parts[1]})
        if (urlHash && urlHash !== parts[1] && urlHash.startsWith(parts[1])) {
          errors.push({
            message: `Short commit hash is used in the specifier. Use the full commit hash.
      specifier: ${specifier}
      url: ${url}
      `,
            package: packageName,
          })
          continue
        }
        if (!(parts.length === 2 && /^[0-9a-f]{40}$/.test(parts[1]))) {
          errors.push({
            message: `GIT URLs must use a commit hash.
      expected: ${packageName}#COMMITHASH
      actual: ${specifier}
      `,
            package: packageName,
          })
          continue
        }
        if (urlHash && urlHash !== parts[1]) {
          errors.push({
            message: `There's a mismatch between the specified git hash and URL to be fetched. Was the lockfile tampered with?
      specifier: ${specifier}
      url: ${url}
      `,
            package: packageName,
          })
          continue
        }
        const info = gitinfo.fromUrl(url)
        if (info && info.type === 'github') {
          const isFound = await belongs(info.user, info.project, urlHash)
          if (!isFound) {
            errors.push({
              message: `The specified commit hash for ${packageName} does not exist in the repository. It might exist on a fork, but you should not trust that.
    specifier: ${specifier}
    url: ${url}
    `,
              package: packageName,
            })
          }
        } else {
          if (!info && isCodeloadUrl(url)) {
            continue
          }
          errors.push({
            message: `The specified git URL is not a GitHub repo URL. Do not install from random people's repositories.
    specifier: ${specifier}
    url: ${url}`,
            package: packageName,
          })
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
