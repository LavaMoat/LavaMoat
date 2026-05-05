/**
 * Provides {@link createExecParsers}, a factory that builds synchronous
 * `ParserImplementation` objects for the execution path.
 *
 * Folds `@endo/evasive-transform`, `@endo/module-source`, and the
 * LavaMoat-specific local transforms into a single Babel
 * parse-traverse-generate cycle per module. No `lavamoat-tofu` visitors —
 * policy inspection only happens during policy generation, not execution.
 *
 * @packageDocumentation
 * @internal
 */

import { makeEvasiveTransformVisitor } from '@endo/evasive-transform/visitor.js'
import { createParsers } from '@endo/parser-pipeline'
import { createExecVisitor } from './exec-visitor.js'
import { log as defaultLog } from '../log.js'

/**
 * @import {ParserImplementation} from "@endo/compartment-mapper"
 * @import {LogFn} from "@endo/parser-pipeline"
 * @import {ExecParserFactoryOptions} from "../internal.js"
 */

/**
 * Creates synchronous `ParserImplementation` objects for all languages used
 * during execution.
 *
 * Returns a record keyed by language (e.g. `mjs`, `cjs`) whose values are
 * drop-in replacements for compartment-mapper's `parserForLanguage` entries.
 *
 * @param {ExecParserFactoryOptions} [options]
 * @returns {Record<string, ParserImplementation>}
 */
export const createExecParsers = ({ log = defaultLog } = {}) =>
  createParsers({
    log: /** @type {LogFn} */ (log.debug.bind(log)),
    visitorFactories: [
      () => ({ visitor: makeEvasiveTransformVisitor() }),
      createExecVisitor,
    ],
  }).sync
