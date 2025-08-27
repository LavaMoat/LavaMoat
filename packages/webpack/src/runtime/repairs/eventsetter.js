if ('event' in globalThis) {
  // @ts-ignore
  // eslint-disable-next-line no-self-assign
  globalThis.event = globalThis.event
  // Yes, that's the whole repair.
  // https://dev.to/naugtur/sometimes-the-best-thing-to-do-is-an-explicit-nothing-2i71
}
