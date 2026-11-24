// Declaring types here and importing them in scuttle.js 
// leads to typescript getting confused into generating 
// a self-referential cycle in the generated .d.ts files:
// types/src/scuttle.d.ts
// import type { LavaMoatScuttleOpts } from './scuttle.d.ts';

export type {
    LavaMoatScuttleOpts
} from './scuttle.js'

export { scuttle } from './scuttle.js'
