
module.exports = {
  checkForResolutionOverride
}

function checkForResolutionOverride (resolutions, parentPackageName, requestedName) {
  if (resolutions && resolutions[parentPackageName]) {
    const packageResolutions = resolutions[parentPackageName]
    const resolutionsConfig = packageResolutions[requestedName]
    if (resolutionsConfig) {
      return resolutionsConfig
    }
  }
}
