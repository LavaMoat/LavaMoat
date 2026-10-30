const realGlobalThis = globalThis

repair((globalRef) => {
  Object.defineProperty(process, 'env', {
    value: Object.freeze({
      FROBNICATE: 'frobnicated',
      ENCABULATE: 'encabulated',
    }),
    configurable: false,
    writable: false,
  })
})
