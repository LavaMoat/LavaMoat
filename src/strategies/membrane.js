const { Membrane } = require('es-membrane')
// const ObservableMembrane = require('observable-membrane')

// z = {}
// x = { get: () => z, check: (a) => a === z }
// y = createMembrane(x)
// console.log('y.get() === z', y.get() === z)
// console.log('y.check(y.get())', y.check(y.get()))


const { createView } = createMultiMembrane()

const moduleRegistry = new Map()


// module X
defineModule('x', function (require) {
  const ref = {}
  return {
    get () { return ref },
    check (target) { return target === ref },
  }
})

// module Y
defineModule('y', function (require) {
  const x = require('x')
  return {
    get () { return x.get() },
  }
})

// module Z
defineModule('z', function (require) {
  const x = require('x')
  const y = require('y')
  return {
    test () { return x.check(y.get()) },
  }
})


function defineModule (id, initFn) {
  const requireFn = createReqFor(id)
  const moduleExports = initFn(requireFn)
  moduleRegistry.set(id, moduleExports)
}

function createReqFor (destinationId) {
  return function req (originId) {
    const moduleExports = moduleRegistry.get(originId)
    const viewOfModuleExports = createView(moduleExports, originId, destinationId)
    return viewOfModuleExports
  }
}

const z = moduleRegistry.get('z')
console.log('z.test()', z.test())

function createMembrane (wetDocument) {

  // // observable-membrane:

  // const membrane = new ObservableMembrane({
  //   valueObserved(target, key) {
  //     // where target is the object that was accessed
  //     // and key is the key that was read
  //     console.log('accessed ', key)
  //   }
  // })

  // return membrane.getReadOnlyProxy(wetDocument)

  // es-membrane:

  /* The object graph names I want are "dry" and "wet".
  * "wet" is what I own.
  * "dry" is what I don't trust.
  */

  // Establish the Membrane.
  var dryWetMB = new Membrane({
    // These are configuration options.
  })

  // Establish "wet" ObjectGraphHandler.
  var wetHandler = dryWetMB.getHandlerByName("wet", { mustCreate: true })

  // Establish "dry" ObjectGraphHandler.
  var dryHandler = dryWetMB.getHandlerByName("dry", { mustCreate: true })

  // Establish "wet" view of an object.
  // Get a "dry" view of the same object.
  var dryDocument = dryWetMB.convertArgumentToProxy(
    wetHandler,
    dryHandler,
    wetDocument
  )
  // dryDocument is a Proxy whose target is wetDocument, and whose handler is dryHandler.

  // Return "top-level" document proxy.
  return dryDocument

}


function createMultiMembrane () {

  // Establish the Membrane.
  var membrane = new Membrane({
    // These are configuration options.
  })

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