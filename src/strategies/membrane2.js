const { Membrane } = require('es-membrane')

const { defineModule, getRawModule } = createModuleSystem()

//
// define modules
//

// module X
defineModule('x', (require) => {
  const ref = {}
  return {
    get () { return ref },
    check (target) { return target === ref },
  }
})

// module Y
defineModule('y', (require) => {
  const x = require('x')
  return {
    get () { return x.get() },
  }
})

// module Z
defineModule('z', (require) => {
  const x = require('x')
  const y = require('y')
  return {
    test () { return x.check(y.get()) },
  }
})

//
// test membrane interaction
//

const x = getRawModule('x')
const y = getRawModule('y')
const z = getRawModule('z')

// check ref equality via raw modules
console.log('raw module ref check:', x.get() === y.get()) //=> false
// check ref equality via membrane interaction
console.log('membrane ref check:', z.test()) //=> true

//
// module system infrastructure
//

function createModuleSystem () {
  const { createView } = createMembrane()
  const moduleRegistry = new Map()

  return { defineModule, getRawModule }

  function getRawModule (id) {
    return moduleRegistry.get(id)
  }

  function defineModule (id, initFn) {
    const requireFn = createRequireFnFor(id)
    const moduleExports = initFn(requireFn)
    moduleRegistry.set(id, moduleExports)
  }

  function createRequireFnFor (destinationId) {
    return function require (originId) {
      const moduleExports = moduleRegistry.get(originId)
      const viewOfModuleExports = createView(moduleExports, originId, destinationId)
      return viewOfModuleExports
    }
  }

}

function createMembrane () {
  const membrane = new Membrane({})
  const handlers = new Map()

  return { createView }

  function createHandler (id) {
    handlers.set(id, membrane.getHandlerByName(id, { mustCreate: true }))
  }

  function createView (obj, originId, destinationId) {
    // add handler for space if missing
    if (!handlers.has(originId)) createHandler(originId)
    if (!handlers.has(destinationId)) createHandler(destinationId)
    // perform wrap
    return membrane.convertArgumentToProxy(
      handlers.get(originId),
      handlers.get(destinationId),
      obj
    )
  }

}