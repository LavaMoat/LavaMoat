module.exports = createStrategy

function createStrategy ({ makeMagicCopy }) {
  const moduleObjCache = new Map()
  const magicCopyForPackage = new Map()
  return {
    checkModuleInitializerCache: (moduleId) => {
      // do nothing
    },
    cacheModuleInitializer: (moduleId, moduleInitializer) => {
      // do nothing
    },
    checkModuleObjCache: (moduleId) => {
      return moduleObjCache.get(moduleId)
    },
    cacheModuleObj: (moduleObj, moduleId) => {
      moduleObjCache.set(moduleId, moduleObj)
    },
    checkProtectedModuleExportsCache: (moduleId) => {
      // do nothing
    },
    protectForInitializationTime: (moduleExports, moduleId) => {
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