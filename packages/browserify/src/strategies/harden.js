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
    cacheModuleExports: (moduleId, moduleExports) => {
      // do nothing
    },
    checkProtectedModuleExportsCache: (moduleId) => {
      return protectedModuleExportsCache.get(moduleId)
    },
    cacheProtectedModuleExports: (moduleId, protectedModuleExports) => {
      protectedModuleExportsCache.set(moduleId, protectedModuleExports)
    },
    protectForInstantiationTime: (moduleExports) => {
      return harden(moduleExports)
    },
    protectForRequireTime: (moduleExports, parentPackageName) => {
      // do nothing
      return moduleExports
    },
  }
}