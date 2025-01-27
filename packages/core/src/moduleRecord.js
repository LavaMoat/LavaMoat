// @ts-check

/**
 * @import {LavamoatModuleRecord as LMR,
 *   DefaultModuleInitArgs,
 *   ModuleInitializer,
 *   ModuleRecordType} from '@lavamoat/types'
 * @import {SetOptional} from 'type-fest'
 * @import {File} from '@babel/types'
 */

/**
 * A module record
 *
 * @template {any[]} [InitArgs=DefaultModuleInitArgs] - Arguments for
 *   {@link LavamoatModuleRecord.moduleInitializer}. Default is
 *   `DefaultModuleInitArgs`
 * @implements {LMR<InitArgs>}
 */
class LavamoatModuleRecord {
  /**
   * Assigns properties!
   *
   * @param {LavamoatModuleRecordOptions<InitArgs>} params
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
    /**
     * Module specifier
     *
     * @type {string}
     */
    this.specifier = specifier
    /**
     * A filepath if {@link type} is `js`; otherwise the same value as
     * {@link specifier}
     *
     * @type {string}
     */
    this.file = file
    /**
     * The type of module
     *
     * @type {ModuleRecordType}
     */
    this.type = type
    /**
     * The containing package name if {@link type} is `js`; otherwise the same
     * value as {@link specifier}
     *
     * @type {string}
     */
    this.packageName = packageName
    /**
     * Content of module (source code)
     *
     * Only applicable if {@link type} is `js`.
     *
     * @type {string | undefined}
     */
    this.content = content
    /**
     * Map of specifiers to resolved filepaths or specifiers
     *
     * @type {Record<string, string>}
     */
    this.importMap = importMap
    /**
     * Parsed AST, if any
     *
     * @type {File | undefined}
     */
    this.ast = ast
    /**
     * Module initializer function
     *
     * @type {ModuleInitializer<InitArgs> | undefined}
     */
    this.moduleInitializer = moduleInitializer
  }
}

module.exports = { LavamoatModuleRecord }

/**
 * Options for {@link LavamoatModuleRecord} constructor.
 *
 * The only difference between this type and the
 * {@link LMR LavamoatModuleRecord interface} is that `importMap` is optional
 * here.
 *
 * @template {any[]} [InitArgs=DefaultModuleInitArgs] - Arguments for
 *   {@link LavamoatModuleRecordOptions.moduleInitializer}. Default is
 *   `DefaultModuleInitArgs`
 * @typedef {SetOptional<LMR<InitArgs>, 'importMap'>} LavamoatModuleRecordOptions
 */
