/**
 * Provides {@link LavamoatModuleRecord} class.
 *
 * @packageDocumentation
 */

import type {
  DefaultModuleInitArgs,
  LavamoatModuleRecord as ILavamoatModuleRecord,
  ModuleInitializer,
  ModuleRecordType,
} from '@lavamoat/types'
import type { File } from '@babel/types'

/**
 * The sentinel `packageName` value used for the application entry-point module.
 *
 * Pass this as `packageName` when constructing a {@link LavamoatModuleRecord}
 * for the root/entry module.
 */
export const ROOT_SLUG = '$root$'

/**
 * Options for {@link LavamoatModuleRecord} constructor.
 *
 * The only difference between this type and the
 * {@link ILavamoatModuleRecord} interface is that `importMap` is optional.
 *
 * @template InitArgs - Arguments for
 *   {@link LavamoatModuleRecordOptions.moduleInitializer}. Default is
 *   `DefaultModuleInitArgs`
 */
export type LavamoatModuleRecordOptions<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  InitArgs extends readonly any[] = DefaultModuleInitArgs,
> = Omit<ILavamoatModuleRecord<InitArgs>, 'importMap' | 'isRoot'> & {
  importMap?: ILavamoatModuleRecord['importMap']
  isRoot?: boolean
}

/**
 * A LavaMoat module record — a container for a module's metadata and source
 * content used during policy generation.
 *
 * @template InitArgs - Arguments for
 *   {@link LavamoatModuleRecord.moduleInitializer}. Default is
 *   `DefaultModuleInitArgs`
 */
export class LavamoatModuleRecord<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  InitArgs extends readonly any[] = DefaultModuleInitArgs,
> implements ILavamoatModuleRecord<InitArgs>
{
  /**
   * Module specifier
   */
  specifier: string

  /**
   * A filepath if {@link type} is `js`; otherwise the same value as
   * {@link specifier}
   */
  file: string

  /**
   * The type of module
   */
  type: ModuleRecordType

  /**
   * The containing package name if {@link type} is `js`; otherwise the same
   * value as {@link specifier}
   */
  packageName: string

  /**
   * Content of module (source code)
   *
   * Only applicable if {@link type} is `js`.
   */
  content?: string

  /**
   * Map of specifiers to resolved filepaths or specifiers
   */
  importMap: Record<string, string>

  /**
   * Parsed AST, if any
   */
  ast?: File

  /**
   * Module initializer function
   */
  moduleInitializer?: ModuleInitializer<InitArgs>

  /**
   * Whether this is the root module
   */
  isRoot: boolean

  /**
   * Creates a new module record.
   *
   * @param params - Constructor options
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
  }: LavamoatModuleRecordOptions<InitArgs>) {
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
