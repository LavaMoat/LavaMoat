if ('event' in globalThis) {
  // @ts-expect-error - untyped
  globalThis.event = undefined
  // Yes, that's the whole repair.
  // https://dev.to/naugtur/sometimes-the-best-thing-to-do-is-an-explicit-nothing-2i71
}
