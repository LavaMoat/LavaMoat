// @ts-check

/**
 * @import {LavamoatModuleRecord as LMR,
 *   DefaultModuleInitArgs,
 *   ModuleInitializer,
 *   ModuleRecordType} from '@lavamoat/types'
 * @import {File} from '@babel/types'
 */

/**
 * @todo Move to constants module / consolidate
 */
const ROOT_SLUG = '$root$'

/**
 * A module record
 *
 * @template {readonly [any, ...any[]]} [InitArgs=DefaultModuleInitArgs] -
 *   Arguments for {@link LavamoatModuleRecord.moduleInitializer}. Default is
 *   `DefaultModuleInitArgs`
 * @implements {LMR<InitArgs>}
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
   * @type {File | undefined}
   */
  ast

  /**
   * Module initializer function
   *
   * @type {ModuleInitializer<InitArgs> | undefined}
   */
  moduleInitializer
  /**
   * @type {Readonly<boolean>}
   */
  isRoot

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
    isRoot = false,
  }) {
    this.specifier = specifier
    this.file = file
    this.type = type
    this.packageName = packageName
    this.content = content
    this.importMap = importMap
    this.ast = ast
    this.moduleInitializer = moduleInitializer
    this.isRoot = isRoot || this.packageName === ROOT_SLUG
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
 * @template {readonly any[]} [InitArgs=DefaultModuleInitArgs] - Arguments for
 *   {@link LavamoatModuleRecordOptions.moduleInitializer}. Default is
 *   `DefaultModuleInitArgs`
 * @typedef {Omit<LMR<InitArgs>, 'importMap'> & {
 *   importMap?: LMR['importMap']
 * }} LavamoatModuleRecordOptions
 */
