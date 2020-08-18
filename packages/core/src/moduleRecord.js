
class LavamoatModuleRecord {
  constructor ({
    specifier,
    file,
    type,
    packageName,
    packageVersion,
    content,
    importMap = {},
    ast,
    moduleInitializer
  }) {
    this.specifier = specifier
    this.file = file
    this.type = type
    this.packageName = packageName
    this.packageVersion = packageVersion
    this.content = content
    this.importMap = importMap
    this.ast = ast
    this.moduleInitializer = moduleInitializer
  }
}

module.exports = { LavamoatModuleRecord }
