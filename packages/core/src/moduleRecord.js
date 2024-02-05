// @ts-check

/**
 * A module record
 *
 * @template {any[]} [InitArgs=DefaultModuleInitArgs] - Arguments for
 *   {@link LavamoatModuleRecord.moduleInitializer}. Default is
 *   `DefaultModuleInitArgs`
 */
class LavamoatModuleRecord {
  /**
   * Module specifier
   *
   * @type {string}
   */
  specifier

  /**
   * A filepath if {@link type} is `js`; otherwise the same value as
   * {@link specifier}
   *
   * @type {string}
   */
  file

  /**
   * The type of module
   *
   * @type {ModuleRecordType}
   */
  type

  /**
   * The containing package name if {@link type} is `js`; otherwise the same
   * value as {@link specifier}
   *
   * @type {string}
   */
  packageName

  /**
   * Content of module (source code)
   *
   * Only applicable if {@link type} is `js`.
   *
   * @type {string | undefined}
   */
  content

  /**
   * Map of specifiers to resolved filepaths or specifiers
   *
   * @type {Record<string, string>}
   */
  importMap

  /**
   * Parsed AST, if any
   *
   * @type {import('@babel/types').File | undefined}
   */
  ast

  /**
   * Module initializer function
   *
   * @type {ModuleInitializer<InitArgs> | undefined}
   */
  moduleInitializer

  /**
   * Assigns properties!
   *
   * @param {LavamoatModuleRecordOptions<InitArgs>} opts
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
 * Options for {@link LavamoatModuleRecord} constructor.
 *
 * @template {any[]} [InitArgs=DefaultModuleInitArgs] - Arguments for
 *   {@link LavamoatModuleRecordOptions.moduleInitializer}. Default is
 *   `DefaultModuleInitArgs`
 * @typedef LavamoatModuleRecordOptions
 * @property {string} specifier - Module specifier
 * @property {string} file - Path to module file (or specifier)
 * @property {ModuleRecordType} type - Module type
 * @property {string} packageName - Package containing module (or specifier)
 * @property {string} [content] - Content of module (source)
 * @property {Record<string, string>} [importMap] - Import map
 * @property {import('@babel/types').File} [ast] - Parsed AST
 * @property {ModuleInitializer<InitArgs>} [moduleInitializer] - Module
 *   initializer function
 */

/**
 * Possible value of {@link LavamoatModuleRecord.type}.
 *
 * _Note:_ `js` means "source code", **not** "JavaScript source code"
 *
 * @typedef {'builtin' | 'native' | 'js'} ModuleRecordType
 */

/**
 * Default {@link ModuleInitializer} arguments
 *
 * @typedef {[
 *   exports: Record<string, any>,
 *   require: (id: string) => unknown,
 *   module: Record<string, any>,
 * ]} DefaultModuleInitArgs
 */

/**
 * Module initializer function; provides non-global variables to module scope
 *
 * @template {any[]} [InitArgs=DefaultModuleInitArgs] - Arguments for the
 *   function. Default is `DefaultModuleInitArgs`
 * @typedef {(...args: InitArgs) => void} ModuleInitializer
 */
