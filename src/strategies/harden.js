module.exports = createStrategy

function createStrategy ({ harden }) {
  const moduleObjCache = new Map()
  const protectedModuleExportsCache = new Map()
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