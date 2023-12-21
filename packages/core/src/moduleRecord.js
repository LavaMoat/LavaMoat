// @ts-check

class LavamoatModuleRecord {
  /**
   * @param {LavamoatModuleRecordOptions} opts
   */
  constructor({
    specifier,
    file,
    type,
    packageName,
    content,
    importMap = {},
    ast,
    moduleInitializer,
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

/**
 * @typedef LavamoatModuleRecordOptions
 * @property {string} specifier
 * @property {string} file
 * @property {'builtin' | 'native' | 'js'} type
 * @property {string} packageName
 * @property {string} [content]
 * @property {Record<string, string>} [importMap]
 * @property {import('@babel/types').File} [ast]
 * @property {(...args: any[]) => any} [moduleInitializer]
 * @todo `moduleInitializer` probably needs narrowing
 *
 * @todo `@babel/types` should be a prod dep
 */
