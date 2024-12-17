class ValidateGitUrl {
  constructor({ packages }) {
    this.packages = packages
  }

  validate() {
    const dependencies = Object.entries(this.packages).map(([key, dep]) => {
      const [name, specifier] = key.split('@')
      return { url: dep.resolved, packageName: name, specifier }
    })
    const errors = []

    // Regular expression to match various Git URL formats
    const gitUrlRegex =
      /^(git\+https:\/\/|github:|git:\/\/|https:\/\/([a-z]+\.)*github\.com|ssh:\/\/git@|git@).+$/

    dependencies.forEach(({ url, packageName, specifier }) => {
      if (gitUrlRegex.test(url)) {
        const parts = specifier.split('#')
        if (!(parts.length === 2 && /^[0-9a-f]{40}$/.test(parts[1]))) {
          errors.push({
            message: `GIT URLs must use a commit hash.
      expected: ${packageName}#COMMITHASH
      actual: ${specifier}
      `,
            package: packageName,
          })
        }
        const urlParts = url.split('#')
        if (urlParts[1] !== parts[1]) {
          errors.push({
            message: `There's a mismatch between the specified git hash and URL to be fetched. Was the lockfile tampered with?
      specifier: ${specifier}
      url: ${url}
      `,
            package: packageName,
          })
        }
      }
    })

    return {
      type: errors.length === 0 ? 'success' : 'error',
      errors,
    }
  }
}
exports.ValidateGitUrl = ValidateGitUrl
