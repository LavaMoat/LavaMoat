if ('event' in globalThis) {
  // @ts-ignore
  globalThis.event = undefined
  // Yes, that's the whole repair.
  // https://dev.to/naugtur/sometimes-the-best-thing-to-do-is-an-explicit-nothing-2i71
}
