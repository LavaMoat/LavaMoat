// this throws if we scuttled props of compartment globalThis instead of startCompartment globalThis by mistake
const global = new Compartment().globalThis
Object.getOwnPropertyNames(global).forEach(name => global[name])
