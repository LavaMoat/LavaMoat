# lavamoat-webpack

this is the start of a webpack plugin for LavaMoat.

### internals

webpack's runtime hooks are not documented at the time of this writing.
below seems to be the correct way to hook lavamoat into the runtime while maintaining further extensibility.

```
MainTemplate
  render()
    renderBootstrap()
      :bootStrap
        :localVars
        :require <------------- lavamoat kernel here
        :requireExtensions
        :beforeStartup
        :startup
        :afterStartup
    render  <------------- SES wrap here
      bootstrapSource
      :modules <------------- package + config data here
    renderWithEntry
```

we need to force-disable `concatenateModules` to keep modules sandboxed by package.

`requireFn` implementation is part of the lavamoat kernel, it looks something like this.

```js
function require(moduleId) {
  // TODO: check cache first
  const packageName = packageFromId(moduleId)
  const config = configForPackage(packageName)
  const moduleSrc = srcForModule(moduleId)
  const moduleExports = lavamoatInitModule(moduleSrc, config)
  return moduleExports
}