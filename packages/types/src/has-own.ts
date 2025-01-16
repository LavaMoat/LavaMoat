/**
 * Type definition for
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn Object.hasOwn},
 * which is inexplicably missing from the TypeScript standard libraries.
 *
 * This is copied from
 * {@link https://github.com/microsoft/TypeScript/issues/44253#issuecomment-2242970533 this comment}
 *
 * @packageDocumentation
 * @see {@link https://github.com/microsoft/TypeScript/issues/44253}
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// #region copied verbatim

// https://github.com/microsoft/TypeScript/issues/1260#issuecomment-1288111146
// Creates a union of all keys of all objects in the Terface union
type AllKeys<Terface> = Terface extends any
  ? keyof Terface & (string | number | symbol)
  : never
// Creates a new interface adding the missing keys to Terface
type Wrap<Terface, Keys extends string | number | symbol> = Terface & {
  [K in Exclude<Keys, keyof Terface>]?: undefined
}

// Distributes the union and automatically add the missing keys
type NicerUndefineds<
  Terface,
  Keys extends AllKeys<Terface> = AllKeys<Terface>,
> = Terface extends any ? Wrap<Terface, Keys> : never

declare global {
  interface ObjectConstructor {
    hasOwn<
      K extends string | number | symbol,
      O extends Record<any, any>,
      OK extends NicerUndefineds<O> extends {
        [k in K]?: infer VType
      }
        ? VType extends never
          ? { [k in K]: unknown } & O
          : { [k in K]: VType } & O
        : { [k in K]: unknown } & O,
    >(
      obj: O,
      k: K
    ): obj is OK
  }
}

// #endregion

export {}
