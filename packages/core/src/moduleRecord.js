
class LavamoatModuleRecord {
  constructor ({ specifier, type, packageName, packageVersion, content, imports, ast }) {
    this.specifier = specifier
    this.type = type
    this.packageName = packageName
    this.packageVersion = packageVersion
    this.content = content
    this.imports = imports
    this.ast = ast
  }
}

module.exports = { LavamoatModuleRecord }