// @ts-check

/**
 * Do not import this; use `import('@lavamoat/types').LavamoatModuleRecord`
 * instead.
 *
 * @remarks
 * Unfortunately, one cannot implement something imported directly via JSDoc
 * @template {any[]} [InitArgs=DefaultInitArgs] Default is `DefaultInitArgs`
 * @typedef {import('@lavamoat/types').LavamoatModuleRecord<InitArgs>} LMR
 */

/**
 * Do not import this; use `import('@lavamoat/types').DefaultModuleInitArgs`
 * instead.
 *
 * @remarks
 * This is here due to
 * https://github.com/hosseinmd/prettier-plugin-jsdoc/issues/229
 * @typedef {import('@lavamoat/types').DefaultModuleInitArgs} DefaultInitArgs
 */

/**
 * A module record
 *
 * @template {any[]} [InitArgs=DefaultInitArgs] - Arguments for
 *   {@link LavamoatModuleRecord.moduleInitializer}. Default is
 *   `DefaultInitArgs`
 * @implements {LMR<InitArgs>}
 */
class LavamoatModuleRecord {
  /**
   * Assigns properties!
   *
   * @param {LMR<InitArgs>} params
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
     * @type {import('@lavamoat/types').ModuleRecordType}
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
     * @type {import('@babel/types').File | undefined}
     */
    this.ast = ast
    /**
     * Module initializer function
     *
     * @type {import('@lavamoat/types').ModuleInitializer<InitArgs>
     *   | undefined}
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
 * @template {any[]} [InitArgs=DefaultInitArgs] - Arguments for
 *   {@link LavamoatModuleRecordOptions.moduleInitializer}. Default is
 *   `DefaultInitArgs`
 * @typedef {import('type-fest').SetOptional<
 *   import('@lavamoat/types').LavamoatModuleRecord<InitArgs>,
 *   'importMap'
 * >} LavamoatModuleRecordOptions
 */
