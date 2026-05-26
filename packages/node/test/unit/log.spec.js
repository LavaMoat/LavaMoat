import '../../src/preamble.js'

import test from 'ava'
import { createLogger, disableWarnings, LogLevels } from '../../src/log.js'

/**
 * @import {Logger} from "@lavamoat/vog/log.js"
 */

/**
 * Creates a logger with a spy reporter passed as the underlying reporter so the
 * filter reporter installed by `createLogger` wraps it. Returns the logger and
 * an accessor for the list of captured log-type strings.
 *
 * @returns {{
 *   instance: Logger
 *   types: () => string[]
 * }}
 */
const makeSpyLogger = () => {
  /** @type {string[]} */
  const logTypes = []
  const instance = createLogger({
    level: LogLevels.debug,
    reporters: [
      {
        /** @param {{ type: string }} logObj */
        log(logObj) {
          logTypes.push(logObj.type)
        },
      },
    ],
  })
  return {
    instance,
    types: () => logTypes,
  }
}

// Tests must be serial: `disableWarnings()` mutates module-level state that
// cannot be reversed. The "warnings enabled" test MUST run before
// "warnings disabled".

test.serial('by default, warn entries pass through', (t) => {
  const { instance, types } = makeSpyLogger()
  instance.warn('this is a warning')
  t.true(types().includes('warn'), 'warn should appear in captured entries')
})

test.serial(
  'disableWarnings suppresses warn; info and error still emit',
  (t) => {
    t.plan(3)
    disableWarnings()

    const { instance, types } = makeSpyLogger()
    instance.warn('this should be suppressed')
    instance.info('this should still appear')
    instance.error('errors should still appear')

    t.false(types().includes('warn'), 'warn entries should be suppressed')
    t.true(types().includes('info'), 'info entries should still emit')
    t.true(types().includes('error'), 'error entries should still emit')
  }
)
