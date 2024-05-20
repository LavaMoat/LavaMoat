module.exports = {
  fakeEslint: (configuration) => {
    console.log('ESLint configuration: ', configuration)
    const plugins = configuration.plugins
    plugins.forEach((plugin) => {
      console.log(`Loading plugin: ${plugin}`)
      const pluginNamespace = require(plugin)
      console.log('Plugin loaded', pluginNamespace)
    })
  },
}
