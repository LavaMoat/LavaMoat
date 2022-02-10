
class LavamoatModuleRecord {
  constructor ({
    specifier,
    file,
    type,
    packageName,
    content,
    importMap = {},
    ast,
    moduleInitializer
  }) {
    this.specifier = specifier
    this.file = file
    this.type = type
    this.packageName = packageName
    this.content = content
    this.importMap = importMap
    this.ast = ast
    this.moduleInitializer = moduleInitializer
  }
}

module.exports = { LavamoatModuleRecord }
