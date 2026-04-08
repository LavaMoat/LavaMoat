/**
 * Provides {@link DEFAULT_ENDO_OPTIONS}
 *
 * @packageDocumentation
 * @internal
 */

import { defaultParserForLanguage } from '@endo/compartment-mapper/import-parsers.js'
import { NATIVE_PARSER_FILE_EXT, NATIVE_PARSER_NAME } from '../constants.js'
import { createExecParser } from '../exec/exec-parser.js'
import { importHook, importNowHook } from './import-hook.js'
import { syncModuleTransforms } from './module-transforms.js'
import parseNative from './parse-native.js'

/**
 * @import {CaptureLiteOptions} from '@endo/compartment-mapper';
 * @import {ExecuteOptions} from '../types.js'
 */

const { freeze } = Object

const execParser = createExecParser()

/**
 * Common options for `@endo/compartment-mapper` functions
 *
 * @satisfies {CaptureLiteOptions | ExecuteOptions}
 * @internal
 */
export const DEFAULT_ENDO_OPTIONS = freeze(
  /** @type {const} */ ({
    globals: globalThis,
    importHook,
    importNowHook,
    syncModuleTransforms: {
      cjs: syncModuleTransforms.cjs,
    },
    parserForLanguage: {
      ...defaultParserForLanguage,
      mjs: execParser,
      [NATIVE_PARSER_NAME]: parseNative,
    },
    languageForExtension: {
      [NATIVE_PARSER_FILE_EXT]: NATIVE_PARSER_NAME,
      /**
       * This makes extensionless files default to CommonJS.
       */
      '': 'cjs',
    },
  })
)
