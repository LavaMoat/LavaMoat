const { parseForConfig: nodeParseForConfig } = require('lavamoat/src/parseForConfig')

module.exports = { parseForConfig }


async function parseForConfig ({ packageDir, entryId, rootPackageName }) {
    // for the survey, we want to skip resolving dependencies (other packages)
    const shouldResolve = (requestedName) => {
    const looksLikePackage = !(requestedName.startsWith('.') || requestedName.startsWith('/'))
    return !looksLikePackage
  }
  return nodeParseForConfig({ cwd: packageDir, entryId, rootPackageName, shouldResolve })
}
