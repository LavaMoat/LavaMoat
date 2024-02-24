/**
 * Possible value of {@link LavamoatModuleRecord.type}.
 *
 * _Note:_ `js` means "source code", **not** "JavaScript source code"
 */
export type ModuleRecordType = 'builtin' | 'native' | 'js'

/**
 * LavaMoat's internal "module record" type
 *
 * @template InitArgs - Arguments to pass to the module initializer
 */
export interface LavamoatModuleRecord<
  InitArgs extends any[] = DefaultModuleInitArgs,
> {
  /**
   * Module specifier
   */
  specifier: string

  /**
   * Path to module file.
   *
   * If a builtin, this is the same as `specifier`
   */
  file: string

  /**
   * Module type
   */
  type: ModuleRecordType

  /**
   * Package name
   *
   * If a builtin, this is the same as `specifier`
   */
  packageName: string

  /**
   * Content of the module file (raw source code)
   */
  content?: string

  /**
   * Import map
   */
  importMap: Record<string, string>

  /**
   * Parsed AST of {@link content}
   */
  ast?: import('@babel/types').File

  /**
   * Module initializer function
   */
  moduleInitializer?: ModuleInitializer<InitArgs>
}

/**
 * Module initializer function; provides non-global variables to module scope
 *
 * @template InitArgs - Arguments to pass to the module initializer
 */
export type ModuleInitializer<InitArgs extends any[] = DefaultModuleInitArgs> =
  (...args: InitArgs) => void

/**
 * Default {@link ModuleInitializer} arguments
 */
export type DefaultModuleInitArgs = [
  exports: Record<string, unknown>,
  require: (id: string) => unknown,
  module: Record<string, unknown>,
]
