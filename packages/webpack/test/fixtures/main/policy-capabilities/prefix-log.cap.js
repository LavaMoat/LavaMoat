// Capability implementation file.
// Wraps console.log in the compartment to prefix each message.
defineCapability('prefix-log', {
  ambient: false,
  endow({ options, compartmentGlobalThis }) {
    const prefix = options[0] || '[cap]'
    const originalLog = compartmentGlobalThis.console
      ? compartmentGlobalThis.console.log
      : console.log
    compartmentGlobalThis.console = Object.assign(
      Object.create(null),
      compartmentGlobalThis.console || console,
      {
        log(...args) {
          originalLog.call(this, prefix, ...args)
        },
      }
    )
  },
})
