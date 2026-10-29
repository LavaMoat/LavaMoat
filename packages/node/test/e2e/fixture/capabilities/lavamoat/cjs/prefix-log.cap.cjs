// Capability implementation file.
// Wraps console.log in the compartment to prefix each message.

'use strict'

defineCapability('prefix-log', {
  ambient: false,
  endow({ options, endowments }) {
    const prefix = options[0] || '[cap]'
    const originalLog = endowments.console
      ? endowments.console.log
      : console.log
    endowments.console = Object.assign(
      Object.create(null),
      endowments.console || console,
      {
        log(...args) {
          originalLog.call(this, prefix, ...args)
        },
      }
    )
  },
})
