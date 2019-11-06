module.exports = createStrategy

function createStrategy ({ makeMagicCopy }) {
  const moduleExportsCache = new Map()
  const magicCopyForPackage = new Map()
  return {
    checkModuleInitializerCache: (moduleId) => {
      // do nothing
    },
    cacheModuleInitializer: (moduleId, moduleInitializer) => {
      // do nothing
    },
    checkModuleExportsCache: (moduleId) => {
      return moduleExportsCache.get(moduleId)
    },
    cacheModuleExports: (moduleId, moduleExports) => {
      moduleExportsCache.set(moduleId, moduleExports)
    },
    protectForInstantiationTime: (moduleExports) => {
      // do nothing
      return moduleExports
    },
    protectForRequireTime: (moduleExports, parentPackageName) => {
      let magicCopy = magicCopyForPackage.get(parentPackageName)
      if (!magicCopy) {
        magicCopy = makeMagicCopy()
        magicCopyForPackage.set(parentPackageName, magicCopy)
      }
      return magicCopy(moduleExports)
    },
  }
}