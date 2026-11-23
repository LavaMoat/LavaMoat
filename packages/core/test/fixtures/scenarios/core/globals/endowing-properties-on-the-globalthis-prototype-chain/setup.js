'use strict'
// Define abc on the prototype of globalThis (as beforeCreateKernel did with vmGlobalThis)
const globalProto = Reflect.getPrototypeOf(globalThis)
globalProto.abc = () => 123
