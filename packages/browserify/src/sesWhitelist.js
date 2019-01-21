(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.SesWhitelist = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildWhitelist = buildWhitelist;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// Copyright (C) 2011 Google Inc.
// Copyright (C) 2018 Agoric
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Exports {@code ses.whitelist}, a recursively defined
 * JSON record enumerating all the naming paths in the ES5.1 spec,
 * those de-facto extensions that we judge to be safe, and SES and
 * Dr. SES extensions provided by the SES runtime.
 *
 * <p>Assumes only ES3. Compatible with ES5, ES5-strict, or
 * anticipated ES6.
 *
 * //provides ses.whitelist
 * @author Mark S. Miller,
 * @overrides ses, whitelistModule
 */

/**
 * <p>Each JSON record enumerates the disposition of the properties on
 * some corresponding primordial object, with the root record
 * representing the global object. For each such record, the values
 * associated with its property names can be
 * <ul>
 * <li>Another record, in which case this property is simply
 *     whitelisted and that next record represents the disposition of
 *     the object which is its value. For example, {@code "Object"}
 *     leads to another record explaining what properties {@code
 *     "Object"} may have and how each such property, if present,
 *     and its value should be tamed.
 * <li>true, in which case this property is simply whitelisted. The
 *     value associated with that property is still traversed and
 *     tamed, but only according to the taming of the objects that
 *     object inherits from. For example, {@code "Object.freeze"} leads
 *     to true, meaning that the {@code "freeze"} property of {@code
 *     Object} should be whitelisted and the value of the property (a
 *     function) should be further tamed only according to the
 *     markings of the other objects it inherits from, like {@code
 *     "Function.prototype"} and {@code "Object.prototype").
 *     If the property is an accessor property, it is not
 *     whitelisted (as invoking an accessor might not be meaningful,
 *     yet the accessor might return a value needing taming).
 * <li>"maybeAccessor", in which case this accessor property is simply
 *     whitelisted and its getter and/or setter are tamed according to
 *     inheritance. If the property is not an accessor property, its
 *     value is tamed according to inheritance.
 * <li>"*", in which case this property on this object is whitelisted,
 *     as is this property as inherited by all objects that inherit
 *     from this object. The values associated with all such properties
 *     are still traversed and tamed, but only according to the taming
 *     of the objects that object inherits from. For example, {@code
 *     "Object.prototype.constructor"} leads to "*", meaning that we
 *     whitelist the {@code "constructor"} property on {@code
 *     Object.prototype} and on every object that inherits from {@code
 *     Object.prototype} that does not have a conflicting mark. Each
 *     of these is tamed as if with true, so that the value of the
 *     property is further tamed according to what other objects it
 *     inherits from.
 * <li>false, which suppresses permission inherited via "*".
 * </ul>
 *
 * <p>TODO: We want to do for constructor: something weaker than '*',
 * but rather more like what we do for [[Prototype]] links, which is
 * that it is whitelisted only if it points at an object which is
 * otherwise reachable by a whitelisted path.
 *
 * <p>The members of the whitelist are either
 * <ul>
 * <li>(uncommented) defined by the ES5.1 normative standard text,
 * <li>(questionable) provides a source of non-determinism, in
 *     violation of pure object-capability rules, but allowed anyway
 *     since we've given up on restricting JavaScript to a
 *     deterministic subset.
 * <li>(ES5 Appendix B) common elements of de facto JavaScript
 *     described by the non-normative Appendix B.
 * <li>(Harmless whatwg) extensions documented at
 *     <a href="http://wiki.whatwg.org/wiki/Web_ECMAScript"
 *     >http://wiki.whatwg.org/wiki/Web_ECMAScript</a> that seem to be
 *     harmless. Note that the RegExp constructor extensions on that
 *     page are <b>not harmless</b> and so must not be whitelisted.
 * <li>(ES-Harmony proposal) accepted as "proposal" status for
 *     EcmaScript-Harmony.
 * </ul>
 *
 * <p>With the above encoding, there are some sensible whitelists we
 * cannot express, such as marking a property both with "*" and a JSON
 * record. This is an expedient decision based only on not having
 * encountered such a need. Should we need this extra expressiveness,
 * we'll need to refactor to enable a different encoding.
 *
 * <p>We factor out {@code true} into the variable {@code t} just to
 * get a bit better compression from simple minifiers.
 */
function buildWhitelist() {
  "use strict";

  var _prototype, _prototype2, _prototype3;

  var t = true;
  var j = true; // included in the Jessie runtime

  var TypedArrayWhitelist; // defined and used below

  var whitelist = {
    cajaVM: {
      // Caja support
      // The accessible intrinsics which are not reachable by own
      // property name traversal are listed here so that they are
      // processed by the whitelist, although this also makes them
      // accessible by this path.  See
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-well-known-intrinsic-objects
      // Of these, ThrowTypeError is the only one from ES5. All the
      // rest were introduced in ES6.
      anonIntrinsics: {
        ThrowTypeError: {},
        IteratorPrototype: {
          // 25.1
          // Technically, for SES-on-ES5, we should not need to
          // whitelist 'next'. However, browsers are accidentally
          // relying on it
          // https://bugs.chromium.org/p/v8/issues/detail?id=4769#
          // https://bugs.webkit.org/show_bug.cgi?id=154475
          // and we will be whitelisting it as we transition to ES6
          // anyway, so we unconditionally whitelist it now.
          next: '*',
          constructor: false
        },
        ArrayIteratorPrototype: {},
        StringIteratorPrototype: {},
        MapIteratorPrototype: {},
        SetIteratorPrototype: {},
        // The %GeneratorFunction% intrinsic is the constructor of
        // generator functions, so %GeneratorFunction%.prototype is
        // the %Generator% intrinsic, which all generator functions
        // inherit from. A generator function is effectively the
        // constructor of its generator instances, so, for each
        // generator function (e.g., "g1" on the diagram at
        // http://people.mozilla.org/~jorendorff/figure-2.png )
        // its .prototype is a prototype that its instances inherit
        // from. Paralleling this structure, %Generator%.prototype,
        // i.e., %GeneratorFunction%.prototype.prototype, is the
        // object that all these generator function prototypes inherit
        // from. The .next, .return and .throw that generator
        // instances respond to are actually the builtin methods they
        // inherit from this object.
        GeneratorFunction: {
          // 25.2
          length: '*',
          // Not sure why this is needed
          prototype: {
            // 25.3
            prototype: {
              next: '*',
              return: '*',
              throw: '*',
              constructor: '*' // Not sure why this is needed

            }
          }
        },
        // TODO: 25.5 AsyncFunction
        TypedArray: TypedArrayWhitelist = {
          // 22.2
          length: '*',
          // does not inherit from Function.prototype on Chrome
          name: '*',
          // ditto
          from: t,
          of: t,
          BYTES_PER_ELEMENT: '*',
          prototype: {
            buffer: 'maybeAccessor',
            byteLength: 'maybeAccessor',
            byteOffset: 'maybeAccessor',
            copyWithin: '*',
            entries: '*',
            every: '*',
            fill: '*',
            filter: '*',
            find: '*',
            findIndex: '*',
            forEach: '*',
            includes: '*',
            indexOf: '*',
            join: '*',
            keys: '*',
            lastIndexOf: '*',
            length: 'maybeAccessor',
            map: '*',
            reduce: '*',
            reduceRight: '*',
            reverse: '*',
            set: '*',
            slice: '*',
            some: '*',
            sort: '*',
            subarray: '*',
            values: '*',
            BYTES_PER_ELEMENT: '*'
          }
        }
      },
      log: t,
      tamperProof: t,
      constFunc: t,
      Nat: j,
      def: j,
      is: t,
      compileExpr: t,
      confine: j,
      compileModule: t,
      // experimental
      compileProgram: t,
      // Cannot be implemented in just ES5.1.
      eval: t,
      Function: t,
      sharedImports: t,
      makeImports: t,
      copyToImports: t,
      GuardT: {
        coerce: t
      },
      makeTableGuard: t,
      Trademark: {
        stamp: t
      },
      guard: t,
      passesGuard: t,
      stamp: t,
      makeSealerUnsealerPair: t,
      makeArrayLike: {
        canBeFullyLive: t
      }
    },
    // In order according to
    // http://www.ecma-international.org/ecma-262/ with chapter
    // numbers where applicable
    // 18 The Global Object
    // 18.1
    Infinity: j,
    NaN: j,
    undefined: j,
    // 18.2
    // eval: t,                      // Whitelisting under separate control
    // by TAME_GLOBAL_EVAL in startSES.js
    isFinite: t,
    isNaN: t,
    parseFloat: t,
    parseInt: t,
    decodeURI: t,
    decodeURIComponent: t,
    encodeURI: t,
    encodeURIComponent: t,
    // 19 Fundamental Objects
    Object: {
      // 19.1
      assign: t,
      // ES-Harmony
      create: t,
      defineProperties: t,
      // ES-Harmony
      defineProperty: t,
      entries: t,
      // ES-Harmony
      freeze: j,
      getOwnPropertyDescriptor: t,
      getOwnPropertyDescriptors: t,
      // proposed ES-Harmony
      getOwnPropertyNames: t,
      getOwnPropertySymbols: t,
      // ES-Harmony
      getPrototypeOf: t,
      is: j,
      // ES-Harmony
      isExtensible: t,
      isFrozen: t,
      isSealed: t,
      keys: t,
      preventExtensions: j,
      seal: j,
      setPrototypeOf: t,
      // ES-Harmony
      values: t,
      // ES-Harmony
      prototype: (_prototype = {
        // B.2.2
        // __proto__: t, whitelisted manually in startSES.js
        __defineGetter__: t,
        __defineSetter__: t,
        __lookupGetter__: t,
        __lookupSetter__: t,
        constructor: '*',
        hasOwnProperty: t,
        isPrototypeOf: t,
        propertyIsEnumerable: t,
        toLocaleString: '*',
        toString: '*',
        valueOf: '*'
      }, _defineProperty(_prototype, Symbol.iterator, '*'), _defineProperty(_prototype, Symbol.toPrimitive, '*'), _defineProperty(_prototype, Symbol.toStringTag, '*'), _defineProperty(_prototype, Symbol.unscopables, '*'), _prototype)
    },
    Function: {
      // 19.2
      length: t,
      prototype: (_prototype2 = {
        apply: t,
        bind: t,
        call: t
      }, _defineProperty(_prototype2, Symbol.hasInstance, '*'), _defineProperty(_prototype2, "length", '*'), _defineProperty(_prototype2, "name", '*'), _defineProperty(_prototype2, "prototype", '*'), _defineProperty(_prototype2, "arity", '*'), _defineProperty(_prototype2, Symbol.species, 'maybeAccessor'), _prototype2)
    },
    Boolean: {
      // 19.3
      prototype: t
    },
    Symbol: {
      // 19.4               all ES-Harmony
      asyncIterator: t,
      // proposed? ES-Harmony
      for: t,
      hasInstance: t,
      isConcatSpreadable: t,
      iterator: t,
      keyFor: t,
      match: t,
      replace: t,
      search: t,
      species: t,
      split: t,
      toPrimitive: t,
      toStringTag: t,
      unscopables: t,
      prototype: t
    },
    Error: {
      // 19.5
      prototype: {
        name: '*',
        message: '*'
      }
    },
    // In ES6 the *Error "subclasses" of Error inherit from Error,
    // since constructor inheritance generally mirrors prototype
    // inheritance. As explained at
    // https://code.google.com/p/google-caja/issues/detail?id=1963 ,
    // debug.js hides away the Error constructor itself, and so needs
    // to rewire these "subclass" constructors. Until we have a more
    // general mechanism, please maintain this list of whitelisted
    // subclasses in sync with the list in debug.js of subclasses to
    // be rewired.
    EvalError: {
      prototype: t
    },
    RangeError: {
      prototype: t
    },
    ReferenceError: {
      prototype: t
    },
    SyntaxError: {
      prototype: t
    },
    TypeError: {
      prototype: t
    },
    URIError: {
      prototype: t
    },
    // 20 Numbers and Dates
    Number: {
      // 20.1
      EPSILON: t,
      // ES-Harmony
      isFinite: j,
      // ES-Harmony
      isInteger: t,
      // ES-Harmony
      isNaN: j,
      // ES-Harmony
      isSafeInteger: j,
      // ES-Harmony
      MAX_SAFE_INTEGER: j,
      // ES-Harmony
      MAX_VALUE: t,
      MIN_SAFE_INTEGER: j,
      // ES-Harmony
      MIN_VALUE: t,
      NaN: t,
      NEGATIVE_INFINITY: t,
      parseFloat: t,
      // ES-Harmony
      parseInt: t,
      // ES-Harmony
      POSITIVE_INFINITY: t,
      prototype: {
        toExponential: t,
        toFixed: t,
        toPrecision: t
      }
    },
    Math: {
      // 20.2
      E: j,
      LN10: j,
      LN2: j,
      LOG10E: t,
      LOG2E: t,
      PI: j,
      SQRT1_2: t,
      SQRT2: t,
      abs: j,
      acos: t,
      acosh: t,
      // ES-Harmony
      asin: t,
      asinh: t,
      // ES-Harmony
      atan: t,
      atanh: t,
      // ES-Harmony
      atan2: t,
      cbrt: t,
      // ES-Harmony
      ceil: j,
      clz32: t,
      // ES-Harmony
      cos: t,
      cosh: t,
      // ES-Harmony
      exp: t,
      expm1: t,
      // ES-Harmony
      floor: j,
      fround: t,
      // ES-Harmony
      hypot: t,
      // ES-Harmony
      imul: t,
      // ES-Harmony
      log: j,
      log1p: t,
      // ES-Harmony
      log10: j,
      // ES-Harmony
      log2: j,
      // ES-Harmony
      max: j,
      min: j,
      pow: j,
      random: t,
      // questionable
      round: j,
      sign: t,
      // ES-Harmony
      sin: t,
      sinh: t,
      // ES-Harmony
      sqrt: j,
      tan: t,
      tanh: t,
      // ES-Harmony
      trunc: j // ES-Harmony

    },
    // no-arg Date constructor is questionable
    Date: {
      // 20.3
      now: t,
      // questionable
      parse: t,
      UTC: t,
      prototype: {
        // Note: coordinate this list with maintanence of repairES5.js
        getDate: t,
        getDay: t,
        getFullYear: t,
        getHours: t,
        getMilliseconds: t,
        getMinutes: t,
        getMonth: t,
        getSeconds: t,
        getTime: t,
        getTimezoneOffset: t,
        getUTCDate: t,
        getUTCDay: t,
        getUTCFullYear: t,
        getUTCHours: t,
        getUTCMilliseconds: t,
        getUTCMinutes: t,
        getUTCMonth: t,
        getUTCSeconds: t,
        setDate: t,
        setFullYear: t,
        setHours: t,
        setMilliseconds: t,
        setMinutes: t,
        setMonth: t,
        setSeconds: t,
        setTime: t,
        setUTCDate: t,
        setUTCFullYear: t,
        setUTCHours: t,
        setUTCMilliseconds: t,
        setUTCMinutes: t,
        setUTCMonth: t,
        setUTCSeconds: t,
        toDateString: t,
        toISOString: t,
        toJSON: t,
        toLocaleDateString: t,
        toLocaleString: t,
        toLocaleTimeString: t,
        toTimeString: t,
        toUTCString: t,
        // B.2.4
        getYear: t,
        setYear: t,
        toGMTString: t
      }
    },
    // 21 Text Processing
    String: {
      // 21.2
      fromCharCode: j,
      fromCodePoint: t,
      // ES-Harmony
      raw: j,
      // ES-Harmony
      prototype: {
        charAt: t,
        charCodeAt: t,
        codePointAt: t,
        // ES-Harmony
        concat: t,
        endsWith: j,
        // ES-Harmony
        includes: t,
        // ES-Harmony
        indexOf: j,
        lastIndexOf: j,
        localeCompare: t,
        match: t,
        normalize: t,
        // ES-Harmony
        padEnd: t,
        // ES-Harmony
        padStart: t,
        // ES-Harmony
        repeat: t,
        // ES-Harmony
        replace: t,
        search: t,
        slice: j,
        split: t,
        startsWith: j,
        // ES-Harmony
        substring: t,
        toLocaleLowerCase: t,
        toLocaleUpperCase: t,
        toLowerCase: t,
        toUpperCase: t,
        trim: t,
        // B.2.3
        substr: t,
        anchor: t,
        big: t,
        blink: t,
        bold: t,
        fixed: t,
        fontcolor: t,
        fontsize: t,
        italics: t,
        link: t,
        small: t,
        strike: t,
        sub: t,
        sup: t,
        trimLeft: t,
        // non-standard
        trimRight: t,
        // non-standard
        // 21.1.4 instances
        length: '*'
      }
    },
    RegExp: {
      // 21.2
      prototype: (_prototype3 = {
        exec: t,
        flags: 'maybeAccessor',
        global: 'maybeAccessor',
        ignoreCase: 'maybeAccessor'
      }, _defineProperty(_prototype3, Symbol.match, '*'), _defineProperty(_prototype3, "multiline", 'maybeAccessor'), _defineProperty(_prototype3, Symbol.replace, '*'), _defineProperty(_prototype3, Symbol.search, '*'), _defineProperty(_prototype3, "source", 'maybeAccessor'), _defineProperty(_prototype3, Symbol.split, '*'), _defineProperty(_prototype3, "sticky", 'maybeAccessor'), _defineProperty(_prototype3, "test", t), _defineProperty(_prototype3, "unicode", 'maybeAccessor'), _defineProperty(_prototype3, "dotAll", 'maybeAccessor'), _defineProperty(_prototype3, "lastIndex", '*'), _defineProperty(_prototype3, "options", '*'), _prototype3)
    },
    // 22 Indexed Collections
    Array: {
      // 22.1
      from: j,
      isArray: t,
      of: j,
      // ES-Harmony?
      prototype: {
        concat: t,
        copyWithin: t,
        // ES-Harmony
        entries: t,
        // ES-Harmony
        every: t,
        fill: t,
        // ES-Harmony
        filter: j,
        find: t,
        // ES-Harmony
        findIndex: t,
        // ES-Harmony
        forEach: j,
        includes: t,
        // ES-Harmony
        indexOf: j,
        join: t,
        keys: t,
        // ES-Harmony
        lastIndexOf: j,
        map: j,
        pop: j,
        push: j,
        reduce: j,
        reduceRight: j,
        reverse: t,
        shift: j,
        slice: j,
        some: t,
        sort: t,
        splice: t,
        unshift: j,
        values: t,
        // ES-Harmony
        // B.2.5
        compile: false,
        // UNSAFE. Purposely suppressed
        // 22.1.4 instances
        length: '*'
      }
    },
    // 22.2 Typed Array stuff
    // TODO: Not yet organized according to spec order
    Int8Array: TypedArrayWhitelist,
    Uint8Array: TypedArrayWhitelist,
    Uint8ClampedArray: TypedArrayWhitelist,
    Int16Array: TypedArrayWhitelist,
    Uint16Array: TypedArrayWhitelist,
    Int32Array: TypedArrayWhitelist,
    Uint32Array: TypedArrayWhitelist,
    Float32Array: TypedArrayWhitelist,
    Float64Array: TypedArrayWhitelist,
    // 23 Keyed Collections          all ES-Harmony
    Map: {
      // 23.1
      prototype: {
        clear: j,
        delete: j,
        entries: j,
        forEach: j,
        get: j,
        has: j,
        keys: j,
        set: j,
        size: 'maybeAccessor',
        values: j
      }
    },
    Set: {
      // 23.2
      prototype: {
        add: j,
        clear: j,
        delete: j,
        entries: j,
        forEach: j,
        has: j,
        keys: j,
        size: 'maybeAccessor',
        values: j
      }
    },
    WeakMap: {
      // 23.3
      prototype: {
        // Note: coordinate this list with maintenance of repairES5.js
        delete: j,
        get: j,
        has: j,
        set: j
      }
    },
    WeakSet: {
      // 23.4
      prototype: {
        add: j,
        delete: j,
        has: j
      }
    },
    // 24 Structured Data
    ArrayBuffer: {
      // 24.1            all ES-Harmony
      isView: t,
      length: t,
      // does not inherit from Function.prototype on Chrome
      name: t,
      // ditto
      prototype: {
        byteLength: 'maybeAccessor',
        slice: t
      }
    },
    // 24.2 TODO: Omitting SharedArrayBuffer for now
    DataView: {
      // 24.3               all ES-Harmony
      length: t,
      // does not inherit from Function.prototype on Chrome
      name: t,
      // ditto
      BYTES_PER_ELEMENT: '*',
      // non-standard. really?
      prototype: {
        buffer: 'maybeAccessor',
        byteOffset: 'maybeAccessor',
        byteLength: 'maybeAccessor',
        getFloat32: t,
        getFloat64: t,
        getInt8: t,
        getInt16: t,
        getInt32: t,
        getUint8: t,
        getUint16: t,
        getUint32: t,
        setFloat32: t,
        setFloat64: t,
        setInt8: t,
        setInt16: t,
        setInt32: t,
        setUint8: t,
        setUint16: t,
        setUint32: t
      }
    },
    // 24.4 TODO: Omitting Atomics for now
    JSON: {
      // 24.5
      parse: j,
      stringify: j
    },
    // 25 Control Abstraction Objects
    Promise: {
      // 25.4
      all: j,
      race: j,
      reject: j,
      resolve: j,
      prototype: {
        catch: t,
        then: j,
        finally: t,
        // proposed ES-Harmony
        // nanoq.js
        get: t,
        put: t,
        del: t,
        post: t,
        invoke: t,
        fapply: t,
        fcall: t,
        // Temporary compat with the old makeQ.js
        send: t,
        delete: t,
        end: t
      }
    },
    // nanoq.js
    Q: {
      all: t,
      race: t,
      reject: t,
      resolve: t,
      join: t,
      isPassByCopy: t,
      passByCopy: t,
      makeRemote: t,
      makeFar: t,
      // Temporary compat with the old makeQ.js
      shorten: t,
      isPromise: t,
      async: t,
      rejected: t,
      promise: t,
      delay: t,
      memoize: t,
      defer: t
    },
    // 26 Reflection
    Reflect: {
      // 26.1
      apply: t,
      construct: t,
      defineProperty: t,
      deleteProperty: t,
      get: t,
      getOwnPropertyDescriptor: t,
      getPrototypeOf: t,
      has: t,
      isExtensible: t,
      ownKeys: t,
      preventExtensions: t,
      set: t,
      setPrototypeOf: t
    },
    Proxy: {
      // 26.2
      revocable: t
    },
    // Appendix B
    // B.2.1
    escape: t,
    unescape: t,
    // Other
    StringMap: {
      // A specialized approximation of ES-Harmony's Map.
      prototype: {} // Technically, the methods should be on the prototype,
      // but doing so while preserving encapsulation will be
      // needlessly expensive for current usage.

    }
  };
  return whitelist;
}

},{}]},{},[1])(1)
});
