/**
 * Type definition for
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn Object.hasOwn},
 * which is inexplicably missing from the TypeScript standard libraries.
 *
 * This is copied from
 * {@link https://github.com/microsoft/TypeScript/issues/44253#issuecomment-2242970533 this comment}
 *
 * **WARNING**: This is broken for discriminated unions. It will not work as
 * expected if the type of the object is within a discriminated union.
 *
 * @packageDocumentation
 * @see {@link https://github.com/microsoft/TypeScript/issues/44253}
 */

import { OmitIndexSignature } from 'type-fest'

/* eslint-disable @typescript-eslint/no-explicit-any */

// https://github.com/microsoft/TypeScript/issues/1260#issuecomment-1288111146
// Creates a union of all keys of all objects in the Terface union
type AllKeys<Terface> = Terface extends any
  ? keyof Terface & PropertyKey
  : never
// Creates a new interface adding the missing keys to Terface
type Wrap<Terface, Keys extends PropertyKey> = Terface & {
  [K in Exclude<Keys, keyof OmitIndexSignature<Terface>>]?: undefined
}

// Distributes the union and automatically add the missing keys
type NicerUndefineds<
  Terface,
  Keys extends AllKeys<Terface> = AllKeys<Terface>,
> = Terface extends any ? Wrap<Terface, Keys> : never

declare global {
  interface ObjectConstructor {
    hasOwn<
      K extends PropertyKey,
      O extends Record<any, any>,
      OK extends NicerUndefineds<O> extends { [k in K]?: infer VType }
        ? { [k in K]: VType } & O
        : { [k in K]: unknown } & O,
    >(
      obj: O,
      k: K
    ): obj is OK
  }
}

export {}
