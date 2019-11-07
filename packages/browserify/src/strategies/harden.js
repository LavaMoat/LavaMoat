module.exports = createStrategy

function createStrategy ({ harden }) {
  const protectedModuleExportsCache = new Map()
  return {
    checkModuleInitializerCache: (moduleId) => {
      // do nothing
    },
    cacheModuleInitializer: (moduleId, moduleInitializer) => {
      // do nothing
    },
    checkModuleObjCache: (moduleId) => {
      // do nothing
    },
    cacheModuleObj: (moduleObj, moduleId) => {
      // do nothing
      // this may cause an inf loop if the module recurses across modules
      // 67 -> 70 -> 67 -> ...
    },
    checkProtectedModuleExportsCache: (moduleId) => {
      return protectedModuleExportsCache.get(moduleId)
    },
    protectForInitializationTime: (moduleExports, moduleId) => {
      const protectedModuleExports = harden(moduleExports)
      protectedModuleExportsCache.set(moduleId, protectedModuleExports)
      return protectedModuleExports
    },
    protectForRequireTime: (moduleExports, parentPackageName) => {
      // do nothing
      return moduleExports
    },
  }
}