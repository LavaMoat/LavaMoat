const { parseForConfig, LavamoatModuleRecord } = require('../src/index.js')

module.exports = {
  generateConfigFromFiles
}

async function generateConfigFromFiles ({ files, ...opts }) {
  const isBuiltin = () => false

  const config = await parseForConfig(Object.assign({
    moduleSpecifier: files.find(file => file.entry).specifier,
    resolveHook: (requestedName, parentAddress) => {
      return files.find(file.specifier === parentAddress).importMap[requestedName]
    },
    importHook: async (address) => {
      return new LavamoatModuleRecord(files.find(file => file.specifier === address))
    },
    isBuiltin: () => false,
    includeDebugInfo: false,
  }, opts))

  return config
}