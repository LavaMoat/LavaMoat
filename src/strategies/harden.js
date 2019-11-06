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
    checkModuleExportsCache: (moduleId) => {
      // do nothing
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