// LavaMoat Prelude
;(function() {

  // define SES
  // "templateRequire" calls are inlined in "generatePrelude"
  const SES = // define ses
(function(){
  const exports = {}
  const module = { exports }
  ;(function(){
// START of injected code from ses
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.SES = factory());
}(this, function () { 'use strict';

  // we'd like to abandon, but we can't, so just scream and break a lot of
  // stuff. However, since we aren't really aborting the process, be careful to
  // not throw an Error object which could be captured by child-Realm code and
  // used to access the (too-powerful) primal-realm Error object.

  function throwTantrum(s, err = undefined) {
    const msg = `please report internal shim error: ${s}`;

    // we want to log these 'should never happen' things.
    // eslint-disable-next-line no-console
    console.error(msg);
    if (err) {
      // eslint-disable-next-line no-console
      console.error(`${err}`);
      // eslint-disable-next-line no-console
      console.error(`${err.stack}`);
    }

    // eslint-disable-next-line no-debugger
    debugger;
    throw msg;
  }

  function assert(condition, message) {
    if (!condition) {
      throwTantrum(message);
    }
  }

  /**
   * safeStringifyFunction()
   * Remove code modifications introduced by ems and nyx in
   * test mode which intefere with Function.toString().
   */
  function safeStringifyFunction(fn) {
    let src = `'use strict'; (${fn})`;

    // esm module creates "runtime" as "_" + hex(3) + "\u200D"

    // Restore eval which is modified by esm module.
    // (0, eval) => (0, <runtime>.e)
    src = src.replace(/\(0,\s*_[0-9a-fA-F]{3}\u200D\.e\)/g, '(0, eval)');

    // Restore globals such as Reflect which are modified by esm module.
    // Reflect => <runtime>.e.Reflect
    src = src.replace(/_[0-9a-fA-F]{3}\u200D\.g\./g, '');

    // Remove code coverage which is injected by nyc module.
    src = src.replace(/cov_[^+]+\+\+[;,]/g, '');

    return src;
  }

  // buildChildRealm is immediately turned into a string, and this function is
  // never referenced again, because it closes over the wrong intrinsics

  function buildChildRealm(unsafeRec, BaseRealm) {
    const { callAndWrapError } = unsafeRec;
    const {
      initRootRealm,
      initCompartment,
      getRealmGlobal,
      realmEvaluate
    } = BaseRealm;

    const { create, defineProperties } = Object;

    class Realm {
      constructor() {
        // The Realm constructor is not intended to be used with the new operator
        // or to be subclassed. It may be used as the value of an extends clause
        // of a class definition but a super call to the Realm constructor will
        // cause an exception.

        // When Realm is called as a function, an exception is also raised because
        // a class constructor cannot be invoked without 'new'.
        throw new TypeError('Realm is not a constructor');
      }

      static makeRootRealm(options = {}) {
        // This is the exposed interface.

        // Bypass the constructor.
        const r = create(Realm.prototype);
        callAndWrapError(initRootRealm, [unsafeRec, r, options]);
        return r;
      }

      static makeCompartment(options = {}) {
        // Bypass the constructor.
        const r = create(Realm.prototype);
        callAndWrapError(initCompartment, [unsafeRec, r, options]);
        return r;
      }

      // we omit the constructor because it is empty. All the personalization
      // takes place in one of the two static methods,
      // makeRootRealm/makeCompartment

      get global() {
        // this is safe against being called with strange 'this' because
        // baseGetGlobal immediately does a trademark check (it fails unless
        // this 'this' is present in a weakmap that is only populated with
        // legitimate Realm instances)
        return callAndWrapError(getRealmGlobal, [this]);
      }

      evaluate(x, endowments, options = {}) {
        // safe against strange 'this', as above
        return callAndWrapError(realmEvaluate, [this, x, endowments, options]);
      }
    }

    defineProperties(Realm, {
      toString: {
        value: () => 'function Realm() { [shim code] }',
        writable: false,
        enumerable: false,
        configurable: true
      }
    });

    defineProperties(Realm.prototype, {
      toString: {
        value: () => '[object Realm]',
        writable: false,
        enumerable: false,
        configurable: true
      }
    });

    return Realm;
  }

  // The parentheses means we don't bind the 'buildChildRealm' name inside the
  // child's namespace. this would accept an anonymous function declaration.
  // function expression (not a declaration) so it has a completion value.
  const buildChildRealmString = safeStringifyFunction(buildChildRealm);

  function buildCallAndWrapError() {
    // This Object and Reflect are brand new, from a new unsafeRec, so no user
    // code has been run or had a chance to manipulate them. Don't ever run this
    // function *after* user code has had a chance to pollute its environment,
    // or it could be used to gain access to BaseRealm and primal-realm Error
    // objects.
    const { getPrototypeOf } = Object;
    const { apply } = Reflect;
    const uncurryThis = fn => (thisArg, ...args) => apply(fn, thisArg, args);
    const mapGet = uncurryThis(Map.prototype.get);
    const setHas = uncurryThis(Set.prototype.has);

    const errorNameToErrorConstructor = new Map([
      ['EvalError', EvalError],
      ['RangeError', RangeError],
      ['ReferenceError', ReferenceError],
      ['SyntaxError', SyntaxError],
      ['TypeError', TypeError],
      ['URIError', URIError]
    ]);
    const errorConstructors = new Set([
      EvalError.prototype,
      RangeError.prototype,
      ReferenceError.prototype,
      SyntaxError.prototype,
      TypeError.prototype,
      URIError.prototype,
      Error.prototype
    ]);

    function callAndWrapError(target, args) {
      try {
        return apply(target, undefined, args);
      } catch (err) {
        // 1. Thrown primitives
        if (Object(err) !== err) {
          // err is a primitive value, which is safe to rethrow
          throw err;
        }

        // 2. Current realm errors
        if (setHas(errorConstructors, getPrototypeOf(err))) {
          // err is a from the current realm, which is safe to rethrow.
          // Object instances (normally) only contain intrinsics from the
          // same realm. An error containing intrinsics from different
          // realms would have to be manually constucted, which imply that
          // such intrinsics were available, and confinement was already lost.
          throw err;
        }

        // 3. Other realm errors
        let eName, eMessage, eStack;
        try {
          // The other environment might seek to use 'err' to reach the
          // parent's intrinsics and corrupt them. In addition, exceptions
          // raised in the primal realm need to be converted to the current
          // realm.

          // `${err.name}` will cause string coercion of 'err.name'.
          // If err.name is an object (probably a String of another Realm),
          // the coercion uses err.name.toString(), which is under the control
          // of the other realm. If err.name were a primitive (e.g. a number),
          // it would use Number.toString(err.name), using the child's version
          // of Number (which the child could modify to capture its argument for
          // later use), however primitives don't have properties like .prototype
          // so they aren't useful for an attack.
          eName = `${err.name}`;
          eMessage = `${err.message}`;
          eStack = `${err.stack || eMessage}`;
          // eName/eMessage/eStack are now realm-independent primitive strings, and
          // safe to expose.
        } catch (ignored) {
          // if err.name.toString() throws, keep the (parent realm) Error away.
          throw new Error('unknown error');
        }
        const ErrorConstructor =
          mapGet(errorNameToErrorConstructor, eName) || Error;
        try {
          throw new ErrorConstructor(eMessage);
        } catch (err2) {
          err2.stack = eStack; // replace with the captured inner stack
          throw err2;
        }
      }
    }

    return callAndWrapError;
  }

  const buildCallAndWrapErrorString = safeStringifyFunction(
    buildCallAndWrapError
  );

  // Declare shorthand functions. Sharing these declarations across modules
  // improves both consistency and minification. Unused declarations are
  // dropped by the tree shaking process.

  // we capture these, not just for brevity, but for security. If any code
  // modifies Object to change what 'assign' points to, the Realm shim would be
  // corrupted.

  const {
    assign,
    create,
    freeze,
    defineProperties, // Object.defineProperty is allowed to fail
    // silentlty, use Object.defineProperties instead.
    getOwnPropertyDescriptor,
    getOwnPropertyDescriptors,
    getOwnPropertyNames,
    getPrototypeOf,
    setPrototypeOf
  } = Object;

  const {
    apply,
    ownKeys // Reflect.ownKeys includes Symbols and unenumerables,
    // unlike Object.keys()
  } = Reflect;

  /**
   * uncurryThis() See
   * http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
   * which only lives at
   * http://web.archive.org/web/20160805225710/http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
   *
   * Performance:
   * 1. The native call is about 10x faster on FF than chrome
   * 2. The version using Function.bind() is about 100x slower on FF,
   *    equal on chrome, 2x slower on Safari
   * 3. The version using a spread and Reflect.apply() is about 10x
   *    slower on FF, equal on chrome, 2x slower on Safari
   *
   * const bind = Function.prototype.bind;
   * const uncurryThis = bind.bind(bind.call);
   */
  const uncurryThis = fn => (thisArg, ...args) => apply(fn, thisArg, args);

  // We also capture these for security: changes to Array.prototype after the
  // Realm shim runs shouldn't affect subsequent Realm operations.
  const objectHasOwnProperty = uncurryThis(
      Object.prototype.hasOwnProperty
    ),
    arrayFilter = uncurryThis(Array.prototype.filter),
    arrayPop = uncurryThis(Array.prototype.pop),
    arrayJoin = uncurryThis(Array.prototype.join),
    arrayConcat = uncurryThis(Array.prototype.concat),
    regexpTest = uncurryThis(RegExp.prototype.test),
    stringIncludes = uncurryThis(String.prototype.includes);

  // These value properties of the global object are non-writable,
  // non-configurable data properties.
  const frozenGlobalPropertyNames = [
    // *** 18.1 Value Properties of the Global Object

    'Infinity',
    'NaN',
    'undefined'
  ];

  // All the following stdlib items have the same name on both our intrinsics
  // object and on the global object. Unlike Infinity/NaN/undefined, these
  // should all be writable and configurable. This is divided into two
  // sets. The stable ones are those the shim can freeze early because
  // we don't expect anyone will want to mutate them. The unstable ones
  // are the ones that we correctly initialize to writable and
  // configurable so that they can still be replaced or removed.
  const stableGlobalPropertyNames = [
    // *** 18.2 Function Properties of the Global Object

    // 'eval', // comes from safeEval instead
    'isFinite',
    'isNaN',
    'parseFloat',
    'parseInt',

    'decodeURI',
    'decodeURIComponent',
    'encodeURI',
    'encodeURIComponent',

    // *** 18.3 Constructor Properties of the Global Object

    'Array',
    'ArrayBuffer',
    'Boolean',
    'DataView',
    // 'Date',  // Unstable
    // 'Error',  // Unstable
    'EvalError',
    'Float32Array',
    'Float64Array',
    // 'Function',  // comes from safeFunction instead
    'Int8Array',
    'Int16Array',
    'Int32Array',
    'Map',
    'Number',
    'Object',
    // 'Promise',  // Unstable
    // 'Proxy',  // Unstable
    'RangeError',
    'ReferenceError',
    // 'RegExp',  // Unstable
    'Set',
    // 'SharedArrayBuffer'  // removed on Jan 5, 2018
    'String',
    'Symbol',
    'SyntaxError',
    'TypeError',
    'Uint8Array',
    'Uint8ClampedArray',
    'Uint16Array',
    'Uint32Array',
    'URIError',
    'WeakMap',
    'WeakSet',

    // *** 18.4 Other Properties of the Global Object

    // 'Atomics', // removed on Jan 5, 2018
    'JSON',
    'Math',
    'Reflect',

    // *** Annex B

    'escape',
    'unescape'

    // *** ECMA-402

    // 'Intl'  // Unstable

    // *** ESNext

    // 'Realm' // Comes from createRealmGlobalObject()
  ];

  const unstableGlobalPropertyNames = [
    'Date',
    'Error',
    'Promise',
    'Proxy',
    'RegExp',
    'Intl'
  ];

  function getSharedGlobalDescs(unsafeGlobal) {
    const descriptors = {};

    function describe(names, writable, enumerable, configurable) {
      for (const name of names) {
        const desc = getOwnPropertyDescriptor(unsafeGlobal, name);
        if (desc) {
          // Abort if an accessor is found on the unsafe global object
          // instead of a data property. We should never get into this
          // non standard situation.
          assert(
            'value' in desc,
            `unexpected accessor on global property: ${name}`
          );

          descriptors[name] = {
            value: desc.value,
            writable,
            enumerable,
            configurable
          };
        }
      }
    }

    describe(frozenGlobalPropertyNames, false, false, false);
    // The following is correct but expensive.
    // describe(stableGlobalPropertyNames, true, false, true);
    // Instead, for now, we let these get optimized.
    //
    // TODO: We should provide an option to turn this optimization off,
    // by feeding "true, false, true" here instead.
    describe(stableGlobalPropertyNames, false, false, false);
    // These we keep replaceable and removable, because we expect
    // others, e.g., SES, may want to do so.
    describe(unstableGlobalPropertyNames, true, false, true);

    return descriptors;
  }

  // Adapted from SES/Caja - Copyright (C) 2011 Google Inc.
  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/startSES.js
  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/repairES5.js

  /**
   * Replace the legacy accessors of Object to comply with strict mode
   * and ES2016 semantics, we do this by redefining them while in 'use strict'.
   *
   * todo: list the issues resolved
   *
   * This function can be used in two ways: (1) invoked directly to fix the primal
   * realm's Object.prototype, and (2) converted to a string to be executed
   * inside each new RootRealm to fix their Object.prototypes. Evaluation requires
   * the function to have no dependencies, so don't import anything from
   * the outside.
   */

  // todo: this file should be moved out to a separate repo and npm module.
  function repairAccessors() {
    const {
      defineProperty,
      defineProperties,
      getOwnPropertyDescriptor,
      getPrototypeOf,
      prototype: objectPrototype
    } = Object;

    // On some platforms, the implementation of these functions act as
    // if they are in sloppy mode: if they're invoked badly, they will
    // expose the global object, so we need to repair these for
    // security. Thus it is our responsibility to fix this, and we need
    // to include repairAccessors. E.g. Chrome in 2016.

    try {
      // Verify that the method is not callable.
      // eslint-disable-next-line no-restricted-properties, no-underscore-dangle
      (0, objectPrototype.__lookupGetter__)('x');
    } catch (ignore) {
      // Throws, no need to patch.
      return;
    }

    function toObject(obj) {
      if (obj === undefined || obj === null) {
        throw new TypeError(`can't convert undefined or null to object`);
      }
      return Object(obj);
    }

    function asPropertyName(obj) {
      if (typeof obj === 'symbol') {
        return obj;
      }
      return `${obj}`;
    }

    function aFunction(obj, accessor) {
      if (typeof obj !== 'function') {
        throw TypeError(`invalid ${accessor} usage`);
      }
      return obj;
    }

    defineProperties(objectPrototype, {
      __defineGetter__: {
        value: function __defineGetter__(prop, func) {
          const O = toObject(this);
          defineProperty(O, prop, {
            get: aFunction(func, 'getter'),
            enumerable: true,
            configurable: true
          });
        }
      },
      __defineSetter__: {
        value: function __defineSetter__(prop, func) {
          const O = toObject(this);
          defineProperty(O, prop, {
            set: aFunction(func, 'setter'),
            enumerable: true,
            configurable: true
          });
        }
      },
      __lookupGetter__: {
        value: function __lookupGetter__(prop) {
          let O = toObject(this);
          prop = asPropertyName(prop);
          let desc;
          while (O && !(desc = getOwnPropertyDescriptor(O, prop))) {
            O = getPrototypeOf(O);
          }
          return desc && desc.get;
        }
      },
      __lookupSetter__: {
        value: function __lookupSetter__(prop) {
          let O = toObject(this);
          prop = asPropertyName(prop);
          let desc;
          while (O && !(desc = getOwnPropertyDescriptor(O, prop))) {
            O = getPrototypeOf(O);
          }
          return desc && desc.set;
        }
      }
    });
  }

  // Adapted from SES/Caja
  // Copyright (C) 2011 Google Inc.
  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/startSES.js
  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/repairES5.js

  /**
   * This block replaces the original Function constructor, and the original
   * %GeneratorFunction% %AsyncFunction% and %AsyncGeneratorFunction%, with
   * safe replacements that throw if invoked.
   *
   * These are all reachable via syntax, so it isn't sufficient to just
   * replace global properties with safe versions. Our main goal is to prevent
   * access to the Function constructor through these starting points.

   * After this block is done, the originals must no longer be reachable, unless
   * a copy has been made, and funtions can only be created by syntax (using eval)
   * or by invoking a previously saved reference to the originals.
   */

  // todo: this file should be moved out to a separate repo and npm module.
  function repairFunctions() {
    const { defineProperties, getPrototypeOf, setPrototypeOf } = Object;

    /**
     * The process to repair constructors:
     * 1. Create an instance of the function by evaluating syntax
     * 2. Obtain the prototype from the instance
     * 3. Create a substitute tamed constructor
     * 4. Replace the original constructor with the tamed constructor
     * 5. Replace tamed constructor prototype property with the original one
     * 6. Replace its [[Prototype]] slot with the tamed constructor of Function
     */
    function repairFunction(name, declaration) {
      let FunctionInstance;
      try {
        // eslint-disable-next-line no-new-func
        FunctionInstance = (0, eval)(declaration);
      } catch (e) {
        if (e instanceof SyntaxError) {
          // Prevent failure on platforms where async and/or generators
          // are not supported.
          return;
        }
        // Re-throw
        throw e;
      }
      const FunctionPrototype = getPrototypeOf(FunctionInstance);

      // Prevents the evaluation of source when calling constructor on the
      // prototype of functions.
      const TamedFunction = function() {
        throw new TypeError('Not available');
      };
      defineProperties(TamedFunction, { name: { value: name } });

      // (new Error()).constructors does not inherit from Function, because Error
      // was defined before ES6 classes. So we don't need to repair it too.

      // (Error()).constructor inherit from Function, which gets a tamed
      // constructor here.

      // todo: in an ES6 class that does not inherit from anything, what does its
      // constructor inherit from? We worry that it inherits from Function, in
      // which case instances could give access to unsafeFunction. markm says
      // we're fine: the constructor inherits from Object.prototype

      // This line replaces the original constructor in the prototype chain
      // with the tamed one. No copy of the original is peserved.
      defineProperties(FunctionPrototype, {
        constructor: { value: TamedFunction }
      });

      // This line sets the tamed constructor's prototype data property to
      // the original one.
      defineProperties(TamedFunction, {
        prototype: { value: FunctionPrototype }
      });

      if (TamedFunction !== Function.prototype.constructor) {
        // Ensures that all functions meet "instanceof Function" in a realm.
        setPrototypeOf(TamedFunction, Function.prototype.constructor);
      }
    }

    // Here, the order of operation is important: Function needs to be repaired
    // first since the other repaired constructors need to inherit from the tamed
    // Function function constructor.

    // note: this really wants to be part of the standard, because new
    // constructors may be added in the future, reachable from syntax, and this
    // list must be updated to match.

    // "plain arrow functions" inherit from Function.prototype

    repairFunction('Function', '(function(){})');
    repairFunction('GeneratorFunction', '(function*(){})');
    repairFunction('AsyncFunction', '(async function(){})');
    repairFunction('AsyncGeneratorFunction', '(async function*(){})');
  }

  // this module must never be importable outside the Realm shim itself

  // A "context" is a fresh unsafe Realm as given to us by existing platforms.
  // We need this to implement the shim. However, when Realms land for real,
  // this feature will be provided by the underlying engine instead.

  // note: in a node module, the top-level 'this' is not the global object
  // (it's *something* but we aren't sure what), however an indirect eval of
  // 'this' will be the correct global object.

  const unsafeGlobalSrc = "'use strict'; this";
  const unsafeGlobalEvalSrc = `(0, eval)("'use strict'; this")`;

  // This method is only exported for testing purposes.
  function createNewUnsafeGlobalForNode() {
    // Note that webpack and others will shim 'vm' including the method
    // 'runInNewContext', so the presence of vm is not a useful check

    // TODO: Find a better test that works with bundlers
    // eslint-disable-next-line no-new-func
    const isNode = new Function(
      'try {return this===global}catch(e){return false}'
    )();

    if (!isNode) {
      return undefined;
    }

    // eslint-disable-next-line global-require
    const vm = require('vm');

    // Use unsafeGlobalEvalSrc to ensure we get the right 'this'.
    const unsafeGlobal = vm.runInNewContext(unsafeGlobalEvalSrc);

    return unsafeGlobal;
  }

  // This method is only exported for testing purposes.
  function createNewUnsafeGlobalForBrowser() {
    if (typeof document === 'undefined') {
      return undefined;
    }
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';

    document.body.appendChild(iframe);
    const unsafeGlobal = iframe.contentWindow.eval(unsafeGlobalSrc);

    // We keep the iframe attached to the DOM because removing it
    // causes its global object to lose intrinsics, its eval()
    // function to evaluate code, etc.

    // TODO: can we remove and garbage-collect the iframes?

    return unsafeGlobal;
  }

  const getNewUnsafeGlobal = () => {
    const newUnsafeGlobalForBrowser = createNewUnsafeGlobalForBrowser();
    const newUnsafeGlobalForNode = createNewUnsafeGlobalForNode();
    if (
      (!newUnsafeGlobalForBrowser && !newUnsafeGlobalForNode) ||
      (newUnsafeGlobalForBrowser && newUnsafeGlobalForNode)
    ) {
      throw new Error('unexpected platform, unable to create Realm');
    }
    return newUnsafeGlobalForBrowser || newUnsafeGlobalForNode;
  };

  // The unsafeRec is shim-specific. It acts as the mechanism to obtain a fresh
  // set of intrinsics together with their associated eval and Function
  // evaluators. These must be used as a matched set, since the evaluators are
  // tied to a set of intrinsics, aka the "undeniables". If it were possible to
  // mix-and-match them from different contexts, that would enable some
  // attacks.
  function createUnsafeRec(unsafeGlobal, allShims = []) {
    const sharedGlobalDescs = getSharedGlobalDescs(unsafeGlobal);

    const unsafeEval = unsafeGlobal.eval;
    const unsafeFunction = unsafeGlobal.Function;
    const callAndWrapError = unsafeEval(buildCallAndWrapErrorString)();

    return freeze({
      unsafeGlobal,
      sharedGlobalDescs,
      unsafeEval,
      unsafeFunction,
      callAndWrapError,
      allShims
    });
  }

  const repairAccessorsString = safeStringifyFunction(repairAccessors);
  const repairFunctionsString = safeStringifyFunction(repairFunctions);

  // Create a new unsafeRec from a brand new context, with new intrinsics and a
  // new global object
  function createNewUnsafeRec(allShims) {
    const unsafeGlobal = getNewUnsafeGlobal();
    const unsafeRec = createUnsafeRec(unsafeGlobal, allShims);
    const { unsafeEval } = unsafeRec;
    unsafeEval(repairAccessorsString)();
    unsafeEval(repairFunctionsString)();
    return unsafeRec;
  }

  // Create a new unsafeRec from the current context, where the Realm shim is
  // being parsed and executed, aka the "Primal Realm"
  function createCurrentUnsafeRec() {
    const unsafeEval = eval;
    const unsafeGlobal = unsafeEval(unsafeGlobalSrc);
    repairAccessors();
    repairFunctions();
    return createUnsafeRec(unsafeGlobal);
  }

  // todo: think about how this interacts with endowments, check for conflicts
  // between the names being optimized and the ones added by endowments

  /**
   * Simplified validation of indentifier names: may only contain alphanumeric
   * characters (or "$" or "_"), and may not start with a digit. This is safe
   * and does not reduces the compatibility of the shim. The motivation for
   * this limitation was to decrease the complexity of the implementation,
   * and to maintain a resonable level of performance.
   * Note: \w is equivalent [a-zA-Z_0-9]
   * See 11.6.1 Identifier Names
   */
  const identifierPattern = /^[a-zA-Z_$][\w$]*$/;

  /**
   * In JavaScript you cannot use these reserved words as variables.
   * See 11.6.1 Identifier Names
   */
  const keywords = new Set([
    // 11.6.2.1 Keywords
    'await',
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'export',
    'extends',
    'finally',
    'for',
    'function',
    'if',
    'import',
    'in',
    'instanceof',
    'new',
    'return',
    'super',
    'switch',
    'this',
    'throw',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'with',
    'yield',

    // Also reserved when parsing strict mode code
    'let',
    'static',

    // 11.6.2.2 Future Reserved Words
    'enum',

    // Also reserved when parsing strict mode code
    'implements',
    'package',
    'protected',
    'interface',
    'private',
    'public',

    // Reserved but not mentioned in specs
    'await',

    'null',
    'true',
    'false',

    'this',
    'arguments'
  ]);

  /**
   * getOptimizableGlobals()
   * What variable names might it bring into scope? These include all
   * property names which can be variable names, including the names
   * of inherited properties. It excludes symbols and names which are
   * keywords. We drop symbols safely. Currently, this shim refuses
   * service if any of the names are keywords or keyword-like. This is
   * safe and only prevent performance optimization.
   */
  function getOptimizableGlobals(globalObject, localObject = {}) {
    const globalNames = getOwnPropertyNames(globalObject);
    // getOwnPropertyNames does ignore Symbols so we don't need this extra check:
    // typeof name === 'string' &&
    const constants = arrayFilter(globalNames, name => {
      // Exclude globals that will be hidden behind an object positioned
      // closer in the resolution scope chain, typically the endowments.
      if (name in localObject) {
        return false;
      }

      // Ensure we have a valid identifier. We use regexpTest rather than
      // /../.test() to guard against the case where RegExp has been poisoned.
      if (
        name === 'eval' ||
        keywords.has(name) ||
        !regexpTest(identifierPattern, name)
      ) {
        return false;
      }

      const desc = getOwnPropertyDescriptor(globalObject, name);
      return (
        //
        // The getters will not have .writable, don't let the falsyness of
        // 'undefined' trick us: test with === false, not ! . However descriptors
        // inherit from the (potentially poisoned) global object, so we might see
        // extra properties which weren't really there. Accessor properties have
        // 'get/set/enumerable/configurable', while data properties have
        // 'value/writable/enumerable/configurable'.
        desc.configurable === false &&
        desc.writable === false &&
        //
        // Checks for data properties because they're the only ones we can
        // optimize (accessors are most likely non-constant). Descriptors can't
        // can't have accessors and value properties at the same time, therefore
        // this check is sufficient. Using explicit own property deal with the
        // case where Object.prototype has been poisoned.
        objectHasOwnProperty(desc, 'value')
      );
    });

    return constants;
  }

  /**
   * ScopeHandler manages a Proxy which serves as the global scope for the
   * safeEvaluator operation (the Proxy is the argument of a 'with' binding).
   * As described in createSafeEvaluator(), it has several functions:
   * - allow the very first (and only the very first) use of 'eval' to map to
   *   the real (unsafe) eval function, so it acts as a 'direct eval' and can
   *    access its lexical scope (which maps to the 'with' binding, which the
   *   ScopeHandler also controls).
   * - ensure that all subsequent uses of 'eval' map to the safeEvaluator,
   *   which lives as the 'eval' property of the safeGlobal.
   * - route all other property lookups at the safeGlobal.
   * - hide the unsafeGlobal which lives on the scope chain above the 'with'.
   * - ensure the Proxy invariants despite some global properties being frozen.
   *
   * @returns {ProxyHandler<any> & Record<string, any>}
   */
  function buildScopeHandler(
    unsafeRec,
    safeGlobal,
    endowments = {},
    sloppyGlobals = false
  ) {
    const { unsafeGlobal, unsafeEval } = unsafeRec;

    const { freeze, getOwnPropertyDescriptor } = Object;
    const { get: reflectGet, set: reflectSet } = Reflect;

    /**
     * alwaysThrowHandler is a proxy handler which throws on any trap called.
     * It's made from a proxy with a get trap that throws. Its target is
     * an immutable (frozen) object and is safe to share, except accross realms
     */
    const alwaysThrowHandler = new Proxy(freeze({}), {
      get(target, prop) {
        // todo: replace with throwTantrum
        throw new TypeError(
          `unexpected scope handler trap called: ${String(prop)}`
        );
      }
    });

    return {
      // The scope handler throws if any trap other than get/set/has are run
      // (e.g. getOwnPropertyDescriptors, apply, getPrototypeOf).
      // eslint-disable-next-line no-proto
      __proto__: alwaysThrowHandler,

      // This flag allow us to determine if the eval() call is an done by the
      // realm's code or if it is user-land invocation, so we can react differently.
      // We use a property and not an accessor to avoid increasing the stack trace
      // and reduce the possibility of OOM.
      useUnsafeEvaluator: false,

      get(shadow, prop) {
        if (typeof prop === 'symbol') {
          // Safe to return a primal realm Object here because the only code that
          // can do a get() on a non-string is the internals of with() itself,
          // and the only thing it does is to look for properties on it. User
          // code cannot do a lookup on non-strings.
          return undefined;
        }

        // Special treatment for eval. The very first lookup of 'eval' gets the
        // unsafe (real direct) eval, so it will get the lexical scope that uses
        // the 'with' context.
        if (prop === 'eval') {
          // test that it is true rather than merely truthy
          if (this.useUnsafeEvaluator === true) {
            // revoke before use
            this.useUnsafeEvaluator = false;
            return unsafeEval;
          }
          // fall through
        }

        // Properties of the endowments.
        if (prop in endowments) {
          // Ensure that the 'this' value on getters resolves
          // to the safeGlobal, not to the endowments object.
          return reflectGet(endowments, prop, safeGlobal);
        }

        // Properties of the global.
        return reflectGet(safeGlobal, prop);
      },

      // eslint-disable-next-line class-methods-use-this
      set(shadow, prop, value) {
        // Properties of the endowments.
        if (prop in endowments) {
          const desc = getOwnPropertyDescriptor(endowments, prop);
          if ('value' in desc) {
            // Work around a peculiar behavior in the specs, where
            // value properties are defined on the receiver.
            return reflectSet(endowments, prop, value);
          }
          // Ensure that the 'this' value on setters resolves
          // to the safeGlobal, not to the endowments object.
          return reflectSet(endowments, prop, value, safeGlobal);
        }

        // Properties of the global.
        return reflectSet(safeGlobal, prop, value);
      },

      // we need has() to return false for some names to prevent the lookup  from
      // climbing the scope chain and eventually reaching the unsafeGlobal
      // object, which is bad.

      // note: unscopables! every string in Object[Symbol.unscopables]

      // todo: we'd like to just have has() return true for everything, and then
      // use get() to raise a ReferenceError for anything not on the safe global.
      // But we want to be compatible with ReferenceError in the normal case and
      // the lack of ReferenceError in the 'typeof' case. Must either reliably
      // distinguish these two cases (the trap behavior might be different), or
      // we rely on a mandatory source-to-source transform to change 'typeof abc'
      // to XXX. We already need a mandatory parse to prevent the 'import',
      // since it's a special form instead of merely being a global variable/

      // note: if we make has() return true always, then we must implement a
      // set() trap to avoid subverting the protection of strict mode (it would
      // accept assignments to undefined globals, when it ought to throw
      // ReferenceError for such assignments)

      has(shadow, prop) {
        // proxies stringify 'prop', so no TOCTTOU danger here

        if (sloppyGlobals) {
          // Everything is potentially available.
          return true;
        }

        // unsafeGlobal: hide all properties of unsafeGlobal at the
        // expense of 'typeof' being wrong for those properties. For
        // example, in the browser, evaluating 'document = 3', will add
        // a property to safeGlobal instead of throwing a
        // ReferenceError.
        if (
          prop === 'eval' ||
          prop in endowments ||
          prop in safeGlobal ||
          prop in unsafeGlobal
        ) {
          return true;
        }

        return false;
      },

      // note: this is likely a bug of safari
      // https://bugs.webkit.org/show_bug.cgi?id=195534

      getPrototypeOf() {
        return null;
      }
    };
  }

  const buildScopeHandlerString = safeStringifyFunction(buildScopeHandler);

  function buildSafeEval(unsafeRec, safeEvalOperation) {
    const { callAndWrapError } = unsafeRec;

    const { defineProperties } = Object;

    // We use the the concise method syntax to create an eval without a
    // [[Construct]] behavior (such that the invocation "new eval()" throws
    // TypeError: eval is not a constructor"), but which still accepts a
    // 'this' binding.
    const safeEval = {
      eval() {
        return callAndWrapError(safeEvalOperation, arguments);
      }
    }.eval;

    // safeEval's prototype RootRealm's value and instanceof Function
    // is true inside the realm. It doesn't point at the primal realm
    // value, and there is no defense against leaking primal realm
    // intrinsics.

    defineProperties(safeEval, {
      toString: {
        // We break up the following literal string so that an
        // apparent direct eval syntax does not appear in this
        // file. Thus, we avoid rejection by the overly eager
        // rejectDangerousSources.
        value: () => `function ${'eval'}() { [shim code] }`,
        writable: false,
        enumerable: false,
        configurable: true
      }
    });

    return safeEval;
  }
  const buildSafeEvalString = safeStringifyFunction(buildSafeEval);

  function buildSafeFunction(unsafeRec, safeFunctionOperation) {
    const { callAndWrapError, unsafeFunction } = unsafeRec;

    const { defineProperties } = Object;

    const safeFunction = function Function() {
      return callAndWrapError(safeFunctionOperation, arguments);
    };

    // Ensure that Function from any compartment in a root realm can be used
    // with instance checks in any compartment of the same root realm.

    defineProperties(safeFunction, {
      // Ensure that any function created in any compartment in a root realm is an
      // instance of Function in any compartment of the same root ralm.
      prototype: { value: unsafeFunction.prototype },

      // Provide a custom output without overwriting the
      // Function.prototype.toString which is called by some third-party
      // libraries.
      toString: {
        value: () => 'function Function() { [shim code] }',
        writable: false,
        enumerable: false,
        configurable: true
      }
    });

    return safeFunction;
  }
  const buildSafeFunctionString = safeStringifyFunction(buildSafeFunction);

  function applyTransforms(rewriterState, transforms) {
    const { create, getOwnPropertyDescriptors } = Object;
    const { apply } = Reflect;
    const uncurryThis = fn => (thisArg, ...args) => apply(fn, thisArg, args);
    const arrayReduce = uncurryThis(Array.prototype.reduce);

    // Clone before calling transforms.
    rewriterState = {
      src: `${rewriterState.src}`,
      endowments: create(
        null,
        getOwnPropertyDescriptors(rewriterState.endowments)
      )
    };

    // Rewrite the source, threading through rewriter state as necessary.
    rewriterState = arrayReduce(
      transforms,
      (rs, transform) => (transform.rewrite ? transform.rewrite(rs) : rs),
      rewriterState
    );

    // Clone after transforms
    rewriterState = {
      src: `${rewriterState.src}`,
      endowments: create(
        null,
        getOwnPropertyDescriptors(rewriterState.endowments)
      )
    };

    return rewriterState;
  }

  const applyTransformsString = safeStringifyFunction(applyTransforms);

  // https://www.ecma-international.org/ecma-262/9.0/index.html#sec-html-like-comments
  // explains that JavaScript parsers may or may not recognize html
  // comment tokens "<" immediately followed by "!--" and "--"
  // immediately followed by ">" in non-module source text, and treat
  // them as a kind of line comment. Since otherwise both of these can
  // appear in normal JavaScript source code as a sequence of operators,
  // we have the terrifying possibility of the same source code parsing
  // one way on one correct JavaScript implementation, and another way
  // on another.
  //
  // This shim takes the conservative strategy of just rejecting source
  // text that contains these strings anywhere. Note that this very
  // source file is written strangely to avoid mentioning these
  // character strings explicitly.

  // We do not write the regexp in a straightforward way, so that an
  // apparennt html comment does not appear in this file. Thus, we avoid
  // rejection by the overly eager rejectDangerousSources.
  const htmlCommentPattern = new RegExp(`(?:${'<'}!--|--${'>'})`);

  function rejectHtmlComments(s) {
    const index = s.search(htmlCommentPattern);
    if (index !== -1) {
      const linenum = s.slice(0, index).split('\n').length; // more or less
      throw new SyntaxError(
        `possible html comment syntax rejected around line ${linenum}`
      );
    }
  }

  // The proposed dynamic import expression is the only syntax currently
  // proposed, that can appear in non-module JavaScript code, that
  // enables direct access to the outside world that cannot be
  // surpressed or intercepted without parsing and rewriting. Instead,
  // this shim conservatively rejects any source text that seems to
  // contain such an expression. To do this safely without parsing, we
  // must also reject some valid programs, i.e., those containing
  // apparent import expressions in literal strings or comments.

  // The current conservative rule looks for the identifier "import"
  // followed by either an open paren or something that looks like the
  // beginning of a comment. We assume that we do not need to worry
  // about html comment syntax because that was already rejected by
  // rejectHtmlComments.

  // this \s *must* match all kinds of syntax-defined whitespace. If e.g.
  // U+2028 (LINE SEPARATOR) or U+2029 (PARAGRAPH SEPARATOR) is treated as
  // whitespace by the parser, but not matched by /\s/, then this would admit
  // an attack like: import\u2028('power.js') . We're trying to distinguish
  // something like that from something like importnotreally('power.js') which
  // is perfectly safe.

  const importPattern = /\bimport\s*(?:\(|\/[/*])/;

  function rejectImportExpressions(s) {
    const index = s.search(importPattern);
    if (index !== -1) {
      const linenum = s.slice(0, index).split('\n').length; // more or less
      throw new SyntaxError(
        `possible import expression rejected around line ${linenum}`
      );
    }
  }

  // The shim cannot correctly emulate a direct eval as explained at
  // https://github.com/Agoric/realms-shim/issues/12
  // Without rejecting apparent direct eval syntax, we would
  // accidentally evaluate these with an emulation of indirect eval. Tp
  // prevent future compatibility problems, in shifting from use of the
  // shim to genuine platform support for the proposal, we should
  // instead statically reject code that seems to contain a direct eval
  // expression.
  //
  // As with the dynamic import expression, to avoid a full parse, we do
  // this approximately with a regexp, that will also reject strings
  // that appear safely in comments or strings. Unlike dynamic import,
  // if we miss some, this only creates future compat problems, not
  // security problems. Thus, we are only trying to catch innocent
  // occurrences, not malicious one. In particular, `(eval)(...)` is
  // direct eval syntax that would not be caught by the following regexp.

  const someDirectEvalPattern = /\beval\s*(?:\(|\/[/*])/;

  function rejectSomeDirectEvalExpressions(s) {
    const index = s.search(someDirectEvalPattern);
    if (index !== -1) {
      const linenum = s.slice(0, index).split('\n').length; // more or less
      throw new SyntaxError(
        `possible direct eval expression rejected around line ${linenum}`
      );
    }
  }

  function rejectDangerousSources(s) {
    rejectHtmlComments(s);
    rejectImportExpressions(s);
    rejectSomeDirectEvalExpressions(s);
  }

  // Export a rewriter transform.
  const rejectDangerousSourcesTransform = {
    rewrite(rs) {
      rejectDangerousSources(rs.src);
      return rs;
    }
  };

  // Portions adapted from V8 - Copyright 2016 the V8 project authors.

  function buildOptimizer(constants) {
    // No need to build an oprimizer when there are no constants.
    if (constants.length === 0) return '';
    // Use 'this' to avoid going through the scope proxy, which is unecessary
    // since the optimizer only needs references to the safe global.
    return `const {${arrayJoin(constants, ',')}} = this;`;
  }

  function createScopedEvaluatorFactory(unsafeRec, constants) {
    const { unsafeFunction } = unsafeRec;

    const optimizer = buildOptimizer(constants);

    // Create a function in sloppy mode, so that we can use 'with'. It returns
    // a function in strict mode that evaluates the provided code using direct
    // eval, and thus in strict mode in the same scope. We must be very careful
    // to not create new names in this scope

    // 1: we use 'with' (around a Proxy) to catch all free variable names. The
    // first 'arguments[0]' holds the Proxy which safely wraps the safeGlobal
    // 2: 'optimizer' catches common variable names for speed
    // 3: The inner strict function is effectively passed two parameters:
    //    a) its arguments[0] is the source to be directly evaluated.
    //    b) its 'this' is the this binding seen by the code being
    //       directly evaluated.

    // everything in the 'optimizer' string is looked up in the proxy
    // (including an 'arguments[0]', which points at the Proxy). 'function' is
    // a keyword, not a variable, so it is not looked up. then 'eval' is looked
    // up in the proxy, that's the first time it is looked up after
    // useUnsafeEvaluator is turned on, so the proxy returns the real the
    // unsafeEval, which satisfies the IsDirectEvalTrap predicate, so it uses
    // the direct eval and gets the lexical scope. The second 'arguments[0]' is
    // looked up in the context of the inner function. The *contents* of
    // arguments[0], because we're using direct eval, are looked up in the
    // Proxy, by which point the useUnsafeEvaluator switch has been flipped
    // back to 'false', so any instances of 'eval' in that string will get the
    // safe evaluator.

    return unsafeFunction(`
    with (arguments[0]) {
      ${optimizer}
      return function() {
        'use strict';
        return eval(arguments[0]);
      };
    }
  `);
  }

  function createSafeEvaluatorFactory(
    unsafeRec,
    safeGlobal,
    transforms,
    sloppyGlobals
  ) {
    const { unsafeEval } = unsafeRec;
    const applyTransforms = unsafeEval(applyTransformsString);

    function factory(endowments = {}, options = {}) {
      // todo clone all arguments passed to returned function
      const localTransforms = options.transforms || [];
      const realmTransforms = transforms || [];

      const mandatoryTransforms = [rejectDangerousSourcesTransform];
      const allTransforms = arrayConcat(
        localTransforms,
        realmTransforms,
        mandatoryTransforms
      );

      function safeEvalOperation(src) {
        let rewriterState = { src, endowments };
        rewriterState = applyTransforms(rewriterState, allTransforms);

        // Combine all optimizable globals.
        const globalConstants = getOptimizableGlobals(
          safeGlobal,
          rewriterState.endowments
        );
        const localConstants = getOptimizableGlobals(rewriterState.endowments);
        const constants = arrayConcat(globalConstants, localConstants);

        const scopedEvaluatorFactory = createScopedEvaluatorFactory(
          unsafeRec,
          constants
        );

        const scopeHandler = unsafeEval(buildScopeHandlerString)(
          unsafeRec,
          safeGlobal,
          rewriterState.endowments,
          sloppyGlobals
        );
        const scopeProxyRevocable = Proxy.revocable({}, scopeHandler);
        const scopeProxy = scopeProxyRevocable.proxy;
        const scopedEvaluator = apply(scopedEvaluatorFactory, safeGlobal, [
          scopeProxy
        ]);

        scopeHandler.useUnsafeEvaluator = true;
        let err;
        try {
          // Ensure that "this" resolves to the safe global.
          return apply(scopedEvaluator, safeGlobal, [rewriterState.src]);
        } catch (e) {
          // stash the child-code error in hopes of debugging the internal failure
          err = e;
          throw e;
        } finally {
          if (scopeHandler.useUnsafeEvaluator) {
            // the proxy switches this off immediately after ths
            // first access, but if that's not the case we prevent
            // further variable resolution on the scope and abort.
            scopeProxyRevocable.revoke();
            throwTantrum('handler did not revoke useUnsafeEvaluator', err);
          }
        }
      }

      return safeEvalOperation;
    }

    return factory;
  }

  function createSafeEvaluator(unsafeRec, safeEvalOperation) {
    const { unsafeEval, unsafeFunction } = unsafeRec;

    const safeEval = unsafeEval(buildSafeEvalString)(
      unsafeRec,
      safeEvalOperation
    );

    assert(getPrototypeOf(safeEval).constructor !== Function, 'hide Function');
    assert(
      getPrototypeOf(safeEval).constructor !== unsafeFunction,
      'hide unsafeFunction'
    );

    return safeEval;
  }

  function createSafeEvaluatorWhichTakesEndowments(safeEvaluatorFactory) {
    return (x, endowments, options = {}) =>
      safeEvaluatorFactory(endowments, options)(x);
  }

  /**
   * A safe version of the native Function which relies on
   * the safety of evalEvaluator for confinement.
   */
  function createFunctionEvaluator(unsafeRec, safeEvalOperation) {
    const { unsafeGlobal, unsafeEval, unsafeFunction } = unsafeRec;

    function safeFunctionOperation(...params) {
      const functionBody = `${arrayPop(params) || ''}`;
      let functionParams = `${arrayJoin(params, ',')}`;
      if (!regexpTest(/^[\w\s,]*$/, functionParams)) {
        throw new SyntaxError(
          'shim limitation: Function arg must be simple ASCII identifiers, possibly separated by commas: no default values, pattern matches, or non-ASCII parameter names'
        );
        // this protects against Matt Austin's clever attack:
        // Function("arg=`", "/*body`){});({x: this/**/")
        // which would turn into
        //     (function(arg=`
        //     /*``*/){
        //      /*body`){});({x: this/**/
        //     })
        // which parses as a default argument of `\n/*``*/){\n/*body` , which
        // is a pair of template literals back-to-back (so the first one
        // nominally evaluates to the parser to use on the second one), which
        // can't actually execute (because the first literal evals to a string,
        // which can't be a parser function), but that doesn't matter because
        // the function is bypassed entirely. When that gets evaluated, it
        // defines (but does not invoke) a function, then evaluates a simple
        // {x: this} expression, giving access to the safe global.
      }

      // Is this a real functionBody, or is someone attempting an injection
      // attack? This will throw a SyntaxError if the string is not actually a
      // function body. We coerce the body into a real string above to prevent
      // someone from passing an object with a toString() that returns a safe
      // string the first time, but an evil string the second time.
      // eslint-disable-next-line no-new, new-cap
      new unsafeFunction(functionBody);

      if (stringIncludes(functionParams, ')')) {
        // If the formal parameters string include ) - an illegal
        // character - it may make the combined function expression
        // compile. We avoid this problem by checking for this early on.

        // note: v8 throws just like this does, but chrome accepts
        // e.g. 'a = new Date()'
        throw new unsafeGlobal.SyntaxError(
          'shim limitation: Function arg string contains parenthesis'
        );
        // todo: shim integrity threat if they change SyntaxError
      }

      // todo: check to make sure this .length is safe. markm says safe.
      if (functionParams.length > 0) {
        // If the formal parameters include an unbalanced block comment, the
        // function must be rejected. Since JavaScript does not allow nested
        // comments we can include a trailing block comment to catch this.
        functionParams += '\n/*``*/';
      }

      const src = `(function(${functionParams}){\n${functionBody}\n})`;

      return safeEvalOperation(src);
    }

    const safeFunction = unsafeEval(buildSafeFunctionString)(
      unsafeRec,
      safeFunctionOperation
    );

    assert(
      getPrototypeOf(safeFunction).constructor !== Function,
      'hide Function'
    );
    assert(
      getPrototypeOf(safeFunction).constructor !== unsafeFunction,
      'hide unsafeFunction'
    );

    return safeFunction;
  }

  // Mimic private members on the realm instances.
  // We define it in the same module and do not export it.
  const RealmRecForRealmInstance = new WeakMap();

  function getRealmRecForRealmInstance(realm) {
    // Detect non-objects.
    assert(Object(realm) === realm, 'bad object, not a Realm instance');
    // Realm instance has no realmRec. Should not proceed.
    assert(RealmRecForRealmInstance.has(realm), 'Realm instance has no record');

    return RealmRecForRealmInstance.get(realm);
  }

  function registerRealmRecForRealmInstance(realm, realmRec) {
    // Detect non-objects.
    assert(Object(realm) === realm, 'bad object, not a Realm instance');
    // Attempt to change an existing realmRec on a realm instance. Should not proceed.
    assert(
      !RealmRecForRealmInstance.has(realm),
      'Realm instance already has a record'
    );

    RealmRecForRealmInstance.set(realm, realmRec);
  }

  // Initialize the global variables for the new Realm.
  function setDefaultBindings(safeGlobal, safeEval, safeFunction) {
    defineProperties(safeGlobal, {
      eval: {
        value: safeEval,
        writable: true,
        configurable: true
      },
      Function: {
        value: safeFunction,
        writable: true,
        configurable: true
      }
    });
  }

  function createRealmRec(unsafeRec, transforms, sloppyGlobals) {
    const { sharedGlobalDescs, unsafeGlobal } = unsafeRec;

    const safeGlobal = create(unsafeGlobal.Object.prototype, sharedGlobalDescs);

    const safeEvaluatorFactory = createSafeEvaluatorFactory(
      unsafeRec,
      safeGlobal,
      transforms,
      sloppyGlobals
    );
    const safeEvalOperation = safeEvaluatorFactory();
    const safeEval = createSafeEvaluator(unsafeRec, safeEvalOperation);
    const safeFunction = createFunctionEvaluator(unsafeRec, safeEvalOperation);
    const safeEvalWhichTakesEndowments = createSafeEvaluatorWhichTakesEndowments(
      safeEvaluatorFactory
    );

    setDefaultBindings(safeGlobal, safeEval, safeFunction);

    const realmRec = freeze({
      safeGlobal,
      safeEval,
      safeEvalWhichTakesEndowments,
      safeFunction
    });

    return realmRec;
  }

  /**
   * A root realm uses a fresh set of new intrinics. Here we first create
   * a new unsafe record, which inherits the shims. Then we proceed with
   * the creation of the realm record, and we apply the shims.
   */
  function initRootRealm(parentUnsafeRec, self, options) {
    // note: 'self' is the instance of the Realm.

    // todo: investigate attacks via Array.species
    // todo: this accepts newShims='string', but it should reject that
    const { shims: newShims, transforms, sloppyGlobals } = options;
    const allShims = arrayConcat(parentUnsafeRec.allShims, newShims);

    // The unsafe record is created already repaired.
    const unsafeRec = createNewUnsafeRec(allShims);
    const { unsafeEval } = unsafeRec;

    const Realm = unsafeEval(buildChildRealmString)(
      unsafeRec,
      // eslint-disable-next-line no-use-before-define
      BaseRealm
    );

    // Add a Realm descriptor to sharedGlobalDescs, so it can be defined onto the
    // safeGlobal like the rest of the globals.
    unsafeRec.sharedGlobalDescs.Realm = {
      value: Realm,
      writable: true,
      configurable: true
    };

    // Creating the realmRec provides the global object, eval() and Function()
    // to the realm.
    const realmRec = createRealmRec(unsafeRec, transforms, sloppyGlobals);

    // Apply all shims in the new RootRealm. We don't do this for compartments.
    const { safeEvalWhichTakesEndowments } = realmRec;
    for (const shim of allShims) {
      safeEvalWhichTakesEndowments(shim);
    }

    // The realmRec acts as a private field on the realm instance.
    registerRealmRecForRealmInstance(self, realmRec);
  }

  /**
   * A compartment shares the intrinsics of its root realm. Here, only a
   * realmRec is necessary to hold the global object, eval() and Function().
   */
  function initCompartment(unsafeRec, self, options = {}) {
    // note: 'self' is the instance of the Realm.

    const { transforms, sloppyGlobals } = options;
    const realmRec = createRealmRec(unsafeRec, transforms, sloppyGlobals);

    // The realmRec acts as a private field on the realm instance.
    registerRealmRecForRealmInstance(self, realmRec);
  }

  function getRealmGlobal(self) {
    const { safeGlobal } = getRealmRecForRealmInstance(self);
    return safeGlobal;
  }

  function realmEvaluate(self, x, endowments = {}, options = {}) {
    // todo: don't pass in primal-realm objects like {}, for safety. OTOH its
    // properties are copied onto the new global 'target'.
    // todo: figure out a way to membrane away the contents to safety.
    const { safeEvalWhichTakesEndowments } = getRealmRecForRealmInstance(self);
    return safeEvalWhichTakesEndowments(x, endowments, options);
  }

  const BaseRealm = {
    initRootRealm,
    initCompartment,
    getRealmGlobal,
    realmEvaluate
  };

  // Create the current unsafeRec from the current "primal" environment (the realm
  // where the Realm shim is loaded and executed).
  const currentUnsafeRec = createCurrentUnsafeRec();

  /**
   * The "primal" realm class is defined in the current "primal" environment,
   * and is part of the shim. There is no need to facade this class via evaluation
   * because both share the same intrinsics.
   */
  const Realm = buildChildRealm(currentUnsafeRec, BaseRealm);

  // Adapted from SES/Caja - Copyright (C) 2011 Google Inc.
  // Copyright (C) 2018 Agoric

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

  // based upon:
  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/startSES.js
  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/repairES5.js
  // then copied from proposal-frozen-realms deep-freeze.js
  // then copied from SES/src/bundle/deepFreeze.js

  /**
   * @typedef HardenerOptions
   * @type {object}
   * @property {WeakSet=} fringeSet WeakSet to use for the fringeSet
   * @property {Function=} naivePrepareObject Call with object before hardening
   */

  /**
   * Create a `harden` function.
   *
   * @param {Iterable} initialFringe Objects considered already hardened
   * @param {HardenerOptions=} options Options for creation
   */
  function makeHardener(initialFringe, options = {}) {
    const { freeze, getOwnPropertyDescriptors, getPrototypeOf } = Object;
    const { ownKeys } = Reflect;

    // Objects that we won't freeze, either because we've frozen them already,
    // or they were one of the initial roots (terminals). These objects form
    // the "fringe" of the hardened object graph.
    let { fringeSet } = options;
    if (fringeSet) {
      if (
        typeof fringeSet.add !== 'function' ||
        typeof fringeSet.has !== 'function'
      ) {
        throw new TypeError(
          `options.fringeSet must have add() and has() methods`,
        );
      }

      // Populate the supplied fringeSet with our initialFringe.
      if (initialFringe) {
        for (const fringe of initialFringe) {
          fringeSet.add(fringe);
        }
      }
    } else {
      // Use a new empty fringe.
      fringeSet = new WeakSet(initialFringe);
    }

    const naivePrepareObject = options && options.naivePrepareObject;

    function harden(root) {
      const toFreeze = new Set();
      const prototypes = new Map();
      const paths = new WeakMap();

      // If val is something we should be freezing but aren't yet,
      // add it to toFreeze.
      function enqueue(val, path) {
        if (Object(val) !== val) {
          // ignore primitives
          return;
        }
        const type = typeof val;
        if (type !== 'object' && type !== 'function') {
          // future proof: break until someone figures out what it should do
          throw new TypeError(`Unexpected typeof: ${type}`);
        }
        if (fringeSet.has(val) || toFreeze.has(val)) {
          // Ignore if this is an exit, or we've already visited it
          return;
        }
        // console.log(`adding ${val} to toFreeze`, val);
        toFreeze.add(val);
        paths.set(val, path);
      }

      function freezeAndTraverse(obj) {
        // Apply the naive preparer if they specified one.
        if (naivePrepareObject) {
          naivePrepareObject(obj);
        }

        // Now freeze the object to ensure reactive
        // objects such as proxies won't add properties
        // during traversal, before they get frozen.

        // Object are verified before being enqueued,
        // therefore this is a valid candidate.
        // Throws if this fails (strict mode).
        freeze(obj);

        // we rely upon certain commitments of Object.freeze and proxies here

        // get stable/immutable outbound links before a Proxy has a chance to do
        // something sneaky.
        const proto = getPrototypeOf(obj);
        const descs = getOwnPropertyDescriptors(obj);
        const path = paths.get(obj) || 'unknown';

        // console.log(`adding ${proto} to prototypes under ${path}`);
        if (proto !== null && !prototypes.has(proto)) {
          prototypes.set(proto, path);
          paths.set(proto, `${path}.__proto__`);
        }

        ownKeys(descs).forEach(name => {
          const pathname = `${path}.${String(name)}`;
          // todo uncurried form
          // todo: getOwnPropertyDescriptors is guaranteed to return well-formed
          // descriptors, but they still inherit from Object.prototype. If
          // someone has poisoned Object.prototype to add 'value' or 'get'
          // properties, then a simple 'if ("value" in desc)' or 'desc.value'
          // test could be confused. We use hasOwnProperty to be sure about
          // whether 'value' is present or not, which tells us for sure that this
          // is a data property.
          const desc = descs[name];
          if ('value' in desc) {
            // todo uncurried form
            enqueue(desc.value, `${pathname}`);
          } else {
            enqueue(desc.get, `${pathname}(get)`);
            enqueue(desc.set, `${pathname}(set)`);
          }
        });
      }

      function dequeue() {
        // New values added before forEach() has finished will be visited.
        toFreeze.forEach(freezeAndTraverse); // todo curried forEach
      }

      function checkPrototypes() {
        prototypes.forEach((path, p) => {
          if (!(toFreeze.has(p) || fringeSet.has(p))) {
            // all reachable properties have already been frozen by this point
            let msg;
            try {
              msg = `prototype ${p} of ${path} is not already in the fringeSet`;
            } catch (e) {
              // `${(async _=>_).__proto__}` fails in most engines
              msg =
                'a prototype of something is not already in the fringeset (and .toString failed)';
              try {
                console.log(msg);
                console.log('the prototype:', p);
                console.log('of something:', path);
              } catch (_e) {
                // console.log might be missing in restrictive SES realms
              }
            }
            throw new TypeError(msg);
          }
        });
      }

      function commit() {
        // todo curried forEach
        // we capture the real WeakSet.prototype.add above, in case someone
        // changes it. The two-argument form of forEach passes the second
        // argument as the 'this' binding, so we add to the correct set.
        toFreeze.forEach(fringeSet.add, fringeSet);
      }

      enqueue(root);
      dequeue();
      // console.log("fringeSet", fringeSet);
      // console.log("prototype set:", prototypes);
      // console.log("toFreeze set:", toFreeze);
      checkPrototypes();
      commit();

      return root;
    }

    return harden;
  }

  function tameDate() {
    const unsafeDate = Date;
    // Date(anything) gives a string with the current time
    // new Date(x) coerces x into a number and then returns a Date
    // new Date() returns the current time, as a Date object
    // new Date(undefined) returns a Date object which stringifies to 'Invalid Date'

    const newDateConstructor = function Date(...args) {
      if (new.target === undefined) {
        // we were not called as a constructor
        // this would normally return a string with the current time
        return 'Invalid Date';
      }
      // constructor behavior: if we get arguments, we can safely pass them through
      if (args.length > 0) {
        return Reflect.construct(unsafeDate, args, new.target);
        // todo: test that our constructor can still be subclassed
      }
      // no arguments: return a Date object, but invalid
      return Reflect.construct(unsafeDate, [NaN], new.target);
    };

    Object.defineProperties(
      newDateConstructor,
      Object.getOwnPropertyDescriptors(unsafeDate),
    );
    // that will copy the .prototype too, so this next line is unnecessary
    // newDateConstructor.prototype = unsafeDate.prototype;
    unsafeDate.prototype.constructor = newDateConstructor;
    // disable Date.now
    newDateConstructor.now = () => NaN;

    Date = newDateConstructor; // eslint-disable-line no-global-assign
  }

  function tameMath() {
    // Math.random = () => 4; // https://www.xkcd.com/221
    Math.random = () => {
      throw Error('disabled');
    };
  }

  /* eslint-disable-next-line no-redeclare */
  /* global Intl */

  function tameIntl() {
    // todo: somehow fix these. These almost certainly don't enable the reading
    // of side-channels, but we want things to be deterministic across
    // runtimes. Best bet is to just disallow calling these functions without
    // an explicit locale name.

    // the whitelist may have deleted Intl entirely, so tolerate that
    if (typeof Intl !== 'undefined') {
      Intl.DateTimeFormat = () => {
        throw Error('disabled');
      };
      Intl.NumberFormat = () => {
        throw Error('disabled');
      };
      Intl.getCanonicalLocales = () => {
        throw Error('disabled');
      };
    }
    // eslint-disable-next-line no-extend-native
    Object.prototype.toLocaleString = () => {
      throw new Error('toLocaleString suppressed');
    };
  }

  function tameError() {
    if (!Object.isExtensible(Error)) {
      throw Error('huh Error is not extensible');
    }
    /* this worked back when we were running it on a global, but stopped
    working when we turned it into a shim */
    /*
    Object.defineProperty(Error.prototype, "stack",
                          { get() { return 'stack suppressed'; } });
    */
    delete Error.captureStackTrace;
    if ('captureStackTrace' in Error) {
      throw Error('hey we could not remove Error.captureStackTrace');
    }

    // we might do this in the future
    /*
    const unsafeError = Error;
    const newErrorConstructor = function Error(...args) {
      return Reflect.construct(unsafeError, args, new.target);
    };

    newErrorConstructor.prototype = unsafeError.prototype;
    newErrorConstructor.prototype.construct = newErrorConstructor;

    Error = newErrorConstructor;

    EvalError.__proto__ = newErrorConstructor;
    RangeError.__proto__ = newErrorConstructor;
    ReferenceError.__proto__ = newErrorConstructor;
    SyntaxError.__proto__ = newErrorConstructor;
    TypeError.__proto__ = newErrorConstructor;
    URIError.__proto__ = newErrorConstructor;
    */
  }

  function tameRegExp() {
    delete RegExp.prototype.compile;
    if ('compile' in RegExp.prototype) {
      throw Error('hey we could not remove RegExp.prototype.compile');
    }

    // We want to delete RegExp.$1, as well as any other surprising properties.
    // On some engines we can't just do 'delete RegExp.$1'.
    const unsafeRegExp = RegExp;

    // eslint-disable-next-line no-global-assign
    RegExp = function RegExp(...args) {
      return Reflect.construct(unsafeRegExp, args, new.target);
    };
    RegExp.prototype = unsafeRegExp.prototype;
    unsafeRegExp.prototype.constructor = RegExp;

    if ('$1' in RegExp) {
      throw Error('hey we could not remove RegExp.$1');
    }
  }

  /* global getAnonIntrinsics */

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

  /* This is evaluated in an environment in which getAnonIntrinsics() is
     already defined (by prepending the definition of getAnonIntrinsics to the
     stringified removeProperties()), hence we don't use the following
     import */
  // import { getAnonIntrinsics } from './anonIntrinsics.js';

  function removeProperties(global, whitelist) {
    // walk global object, test against whitelist, delete

    const uncurryThis = fn => (thisArg, ...args) =>
      Reflect.apply(fn, thisArg, args);
    const {
      getOwnPropertyDescriptor: gopd,
      getOwnPropertyNames: gopn,
      keys,
    } = Object;
    const cleaning = new WeakMap();
    const getProto = Object.getPrototypeOf;
    const hop = uncurryThis(Object.prototype.hasOwnProperty);

    const whiteTable = new WeakMap();

    function addToWhiteTable(rootValue, rootPermit) {
      /**
       * The whiteTable should map from each path-accessible primordial
       * object to the permit object that describes how it should be
       * cleaned.
       *
       * We initialize the whiteTable only so that {@code getPermit} can
       * process "*" inheritance using the whitelist, by walking actual
       * inheritance chains.
       */
      const whitelistSymbols = [true, false, '*', 'maybeAccessor'];
      function register(value, permit) {
        if (value !== Object(value)) {
          return;
        }
        if (typeof permit !== 'object') {
          if (whitelistSymbols.indexOf(permit) < 0) {
            throw new Error(
              `syntax error in whitelist; unexpected value: ${permit}`,
            );
          }
          return;
        }
        if (whiteTable.has(value)) {
          throw new Error('primordial reachable through multiple paths');
        }
        whiteTable.set(value, permit);
        keys(permit).forEach(name => {
          // Use gopd to avoid invoking an accessor property.
          // Accessor properties for which permit !== 'maybeAccessor'
          // are caught later by clean().
          const desc = gopd(value, name);
          if (desc) {
            register(desc.value, permit[name]);
          }
        });
      }
      register(rootValue, rootPermit);
    }

    /**
     * Should the property named {@code name} be whitelisted on the
     * {@code base} object, and if so, with what Permit?
     *
     * <p>If it should be permitted, return the Permit (where Permit =
     * true | "maybeAccessor" | "*" | Record(Permit)), all of which are
     * truthy. If it should not be permitted, return false.
     */
    function getPermit(base, name) {
      let permit = whiteTable.get(base);
      if (permit) {
        if (hop(permit, name)) {
          return permit[name];
        }
        // Allow escaping of magical names like '__proto__'.
        if (hop(permit, `ESCAPE${name}`)) {
          return permit[`ESCAPE${name}`];
        }
      }
      // eslint-disable-next-line no-constant-condition
      while (true) {
        base = getProto(base); // eslint-disable-line no-param-reassign
        if (base === null) {
          return false;
        }
        permit = whiteTable.get(base);
        if (permit && hop(permit, name)) {
          const result = permit[name];
          if (result === '*') {
            return result;
          }
          return false;
        }
      }
    }

    /**
     * Removes all non-whitelisted properties found by recursively and
     * reflectively walking own property chains.
     *
     * <p>Inherited properties are not checked, because we require that
     * inherited-from objects are otherwise reachable by this traversal.
     */
    function clean(value, prefix, num) {
      if (value !== Object(value)) {
        return;
      }
      if (cleaning.get(value)) {
        return;
      }

      const proto = getProto(value);
      if (proto !== null && !whiteTable.has(proto)) {
        // reportItemProblem(rootReports, ses.severities.NOT_ISOLATED,
        //                  'unexpected intrinsic', prefix + '.__proto__');
        throw new Error(`unexpected intrinsic ${prefix}.__proto__`);
      }

      cleaning.set(value, true);
      gopn(value).forEach(name => {
        const path = prefix + (prefix ? '.' : '') + name;
        const p = getPermit(value, name);
        if (p) {
          const desc = gopd(value, name);
          if (hop(desc, 'value')) {
            // Is a data property
            const subValue = desc.value;
            clean(subValue, path);
          } else if (p !== 'maybeAccessor') {
            // We are not saying that it is safe for the prop to be
            // unexpectedly an accessor; rather, it will be deleted
            // and thus made safe.
            // reportProperty(ses.severities.SAFE_SPEC_VIOLATION,
            //               'Not a data property', path);
            delete value[name]; // eslint-disable-line no-param-reassign
          } else {
            clean(desc.get, `${path}<getter>`);
            clean(desc.set, `${path}<setter>`);
          }
        } else {
          delete value[name]; // eslint-disable-line no-param-reassign
        }
      });
    }

    addToWhiteTable(global, whitelist.namedIntrinsics);
    const intr = getAnonIntrinsics(global);
    addToWhiteTable(intr, whitelist.anonIntrinsics);
    clean(global, '');
  }

  // Copyright (C) 2011 Google Inc.
  // Copyright (C) 2018 Agoric
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  // https://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.

  // TODO(erights): We should test for
  // We now have a reason to omit Proxy from the whitelist.
  // The makeBrandTester in repairES5 uses Allen's trick at
  // https://esdiscuss.org/topic/tostringtag-spoofing-for-null-and-undefined#content-59
  // , but testing reveals that, on FF 35.0.1, a proxy on an exotic
  // object X will pass this brand test when X will. This is fixed as of
  // FF Nightly 38.0a1.

  /**
   * <p>Qualifying platforms generally include all JavaScript platforms
   * shown on <a href="http://kangax.github.com/es5-compat-table/"
   * >ECMAScript 5 compatibility table</a> that implement {@code
   * Object.getOwnPropertyNames}. At the time of this writing,
   * qualifying browsers already include the latest released versions of
   * Internet Explorer (9), Firefox (4), Chrome (11), and Safari
   * (5.0.5), their corresponding standalone (e.g., server-side) JavaScript
   * engines, Rhino 1.73, and BESEN.
   *
   * <p>On such not-quite-ES5 platforms, some elements of these
   * emulations may lose SES safety, as enumerated in the comment on
   * each problem record in the {@code baseProblems} and {@code
   * supportedProblems} array below. The platform must at least provide
   * {@code Object.getOwnPropertyNames}, because it cannot reasonably be
   * emulated.
   *
   * <p>This file is useful by itself, as it has no dependencies on the
   * rest of SES. It creates no new global bindings, but merely repairs
   * standard globals or standard elements reachable from standard
   * globals. If the future-standard {@code WeakMap} global is present,
   * as it is currently on FF7.0a1, then it will repair it in place. The
   * one non-standard element that this file uses is {@code console} if
   * present, in order to report the repairs it found necessary, in
   * which case we use its {@code log, info, warn}, and {@code error}
   * methods. If {@code console.log} is absent, then this file performs
   * its repairs silently.
   *
   * <p>Generally, this file should be run as the first script in a
   * JavaScript context (i.e. a browser frame), as it relies on other
   * primordial objects and methods not yet being perturbed.
   *
   * <p>TODO(erights): This file tries to protect itself from some
   * post-initialization perturbation by stashing some of the
   * primordials it needs for later use, but this attempt is currently
   * incomplete. We need to revisit this when we support Confined-ES5,
   * as a variant of SES in which the primordials are not frozen. See
   * previous failed attempt at <a
   * href="https://codereview.appspot.com/5278046/" >Speeds up
   * WeakMap. Preparing to support unfrozen primordials.</a>. From
   * analysis of this failed attempt, it seems that the only practical
   * way to support CES is by use of two frames, where most of initSES
   * runs in a SES frame, and so can avoid worrying about most of these
   * perturbations.
   */
  function getAnonIntrinsics$1(global) {

    const gopd = Object.getOwnPropertyDescriptor;
    const getProto = Object.getPrototypeOf;

    // ////////////// Undeniables and Intrinsics //////////////

    /**
     * The undeniables are the primordial objects which are ambiently
     * reachable via compositions of strict syntax, primitive wrapping
     * (new Object(x)), and prototype navigation (the equivalent of
     * Object.getPrototypeOf(x) or x.__proto__). Although we could in
     * theory monkey patch primitive wrapping or prototype navigation,
     * we won't. Hence, without parsing, the following are undeniable no
     * matter what <i>other</i> monkey patching we do to the primordial
     * environment.
     */

    // The first element of each undeniableTuple is a string used to
    // name the undeniable object for reporting purposes. It has no
    // other programmatic use.
    //
    // The second element of each undeniableTuple should be the
    // undeniable itself.
    //
    // The optional third element of the undeniableTuple, if present,
    // should be an example of syntax, rather than use of a monkey
    // patchable API, evaluating to a value from which the undeniable
    // object in the second element can be reached by only the
    // following steps:
    // If the value is primitve, convert to an Object wrapper.
    // Is the resulting object either the undeniable object, or does
    // it inherit directly from the undeniable object?

    function* aStrictGenerator() {} // eslint-disable-line no-empty-function
    const Generator = getProto(aStrictGenerator);
    async function* aStrictAsyncGenerator() {} // eslint-disable-line no-empty-function
    const AsyncGenerator = getProto(aStrictAsyncGenerator);
    async function aStrictAsyncFunction() {} // eslint-disable-line no-empty-function
    const AsyncFunctionPrototype = getProto(aStrictAsyncFunction);

    // TODO: this is dead code, but could be useful: make this the
    // 'undeniables' object available via some API.

    const undeniableTuples = [
      ['Object.prototype', Object.prototype, {}],
      ['Function.prototype', Function.prototype, function foo() {}],
      ['Array.prototype', Array.prototype, []],
      ['RegExp.prototype', RegExp.prototype, /x/],
      ['Boolean.prototype', Boolean.prototype, true],
      ['Number.prototype', Number.prototype, 1],
      ['String.prototype', String.prototype, 'x'],
      ['%Generator%', Generator, aStrictGenerator],
      ['%AsyncGenerator%', AsyncGenerator, aStrictAsyncGenerator],
      ['%AsyncFunction%', AsyncFunctionPrototype, aStrictAsyncFunction],
    ];

    undeniableTuples.forEach(tuple => {
      const name = tuple[0];
      const undeniable = tuple[1];
      let start = tuple[2];
      if (start === undefined) {
        return;
      }
      start = Object(start);
      if (undeniable === start) {
        return;
      }
      if (undeniable === getProto(start)) {
        return;
      }
      throw new Error(`Unexpected undeniable: ${undeniable}`);
    });

    function registerIteratorProtos(registery, base, name) {
      const iteratorSym =
        (global.Symbol && global.Symbol.iterator) || '@@iterator'; // used instead of a symbol on FF35

      if (base[iteratorSym]) {
        const anIter = base[iteratorSym]();
        const anIteratorPrototype = getProto(anIter);
        registery[name] = anIteratorPrototype; // eslint-disable-line no-param-reassign
        const anIterProtoBase = getProto(anIteratorPrototype);
        if (anIterProtoBase !== Object.prototype) {
          if (!registery.IteratorPrototype) {
            if (getProto(anIterProtoBase) !== Object.prototype) {
              throw new Error(
                '%IteratorPrototype%.__proto__ was not Object.prototype',
              );
            }
            registery.IteratorPrototype = anIterProtoBase; // eslint-disable-line no-param-reassign
          } else if (registery.IteratorPrototype !== anIterProtoBase) {
            throw new Error(`unexpected %${name}%.__proto__`);
          }
        }
      }
    }

    /**
     * Get the intrinsics not otherwise reachable by named own property
     * traversal. See
     * https://people.mozilla.org/~jorendorff/es6-draft.html#sec-well-known-intrinsic-objects
     * and the instrinsics section of whitelist.js
     *
     * <p>Unlike getUndeniables(), the result of sampleAnonIntrinsics()
     * does depend on the current state of the primordials, so we must
     * run this again after all other relevant monkey patching is done,
     * in order to properly initialize cajaVM.intrinsics
     */

    // TODO: we can probably unwrap this into the outer function, and stop
    // using a separately named 'sampleAnonIntrinsics'
    function sampleAnonIntrinsics() {
      const result = {};

      // If there are still other ThrowTypeError objects left after
      // noFuncPoison-ing, this should be caught by
      // test_THROWTYPEERROR_NOT_UNIQUE below, so we assume here that
      // this is the only surviving ThrowTypeError intrinsic.
      // eslint-disable-next-line prefer-rest-params
      result.ThrowTypeError = gopd(arguments, 'callee').get;

      // Get the ES6 %ArrayIteratorPrototype%,
      // %StringIteratorPrototype%, %MapIteratorPrototype%,
      // %SetIteratorPrototype% and %IteratorPrototype% intrinsics, if
      // present.
      registerIteratorProtos(result, [], 'ArrayIteratorPrototype');
      registerIteratorProtos(result, '', 'StringIteratorPrototype');
      if (typeof Map === 'function') {
        registerIteratorProtos(result, new Map(), 'MapIteratorPrototype');
      }
      if (typeof Set === 'function') {
        registerIteratorProtos(result, new Set(), 'SetIteratorPrototype');
      }

      // Get the ES6 %GeneratorFunction% intrinsic, if present.
      if (getProto(Generator) !== Function.prototype) {
        throw new Error('Generator.__proto__ was not Function.prototype');
      }
      const GeneratorFunction = Generator.constructor;
      if (getProto(GeneratorFunction) !== Function.prototype.constructor) {
        throw new Error(
          'GeneratorFunction.__proto__ was not Function.prototype.constructor',
        );
      }
      result.GeneratorFunction = GeneratorFunction;
      const genProtoBase = getProto(Generator.prototype);
      if (genProtoBase !== result.IteratorPrototype) {
        throw new Error('Unexpected Generator.prototype.__proto__');
      }

      // Get the ES6 %AsyncGeneratorFunction% intrinsic, if present.
      if (getProto(AsyncGenerator) !== Function.prototype) {
        throw new Error('AsyncGenerator.__proto__ was not Function.prototype');
      }
      const AsyncGeneratorFunction = AsyncGenerator.constructor;
      if (getProto(AsyncGeneratorFunction) !== Function.prototype.constructor) {
        throw new Error(
          'AsyncGeneratorFunction.__proto__ was not Function.prototype.constructor',
        );
      }
      result.AsyncGeneratorFunction = AsyncGeneratorFunction;
      const AsyncGeneratorPrototype = AsyncGenerator.prototype;
      result.AsyncIteratorPrototype = getProto(AsyncGeneratorPrototype);
      // it appears that the only way to get an AsyncIteratorPrototype is
      // through this getProto() process, so there's nothing to check it
      // against
      if (getProto(result.AsyncIteratorPrototype) !== Object.prototype) {
        throw new Error(
          'AsyncIteratorPrototype.__proto__ was not Object.prototype',
        );
      }

      // Get the ES6 %AsyncFunction% intrinsic, if present.
      if (getProto(AsyncFunctionPrototype) !== Function.prototype) {
        throw new Error(
          'AsyncFunctionPrototype.__proto__ was not Function.prototype',
        );
      }
      const AsyncFunction = AsyncFunctionPrototype.constructor;
      if (getProto(AsyncFunction) !== Function.prototype.constructor) {
        throw new Error(
          'AsyncFunction.__proto__ was not Function.prototype.constructor',
        );
      }
      result.AsyncFunction = AsyncFunction;

      // Get the ES6 %TypedArray% intrinsic, if present.
      (function getTypedArray() {
        if (!global.Float32Array) {
          return;
        }
        const TypedArray = getProto(global.Float32Array);
        if (TypedArray === Function.prototype) {
          return;
        }
        if (getProto(TypedArray) !== Function.prototype) {
          // http://bespin.cz/~ondras/html/classv8_1_1ArrayBufferView.html
          // has me worried that someone might make such an intermediate
          // object visible.
          throw new Error('TypedArray.__proto__ was not Function.prototype');
        }
        result.TypedArray = TypedArray;
      })();

      Object.keys(result).forEach(name => {
        if (result[name] === undefined) {
          throw new Error(`Malformed intrinsic: ${name}`);
        }
      });

      return result;
    }

    return sampleAnonIntrinsics();
  }

  function getNamedIntrinsics(unsafeGlobal, whitelist) {
    const { defineProperty, getOwnPropertyDescriptor, ownKeys } = Reflect;

    const namedIntrinsics = {};

    const propertyNames = ownKeys(whitelist.namedIntrinsics);

    for (const name of propertyNames) {
      const desc = getOwnPropertyDescriptor(unsafeGlobal, name);
      if (desc) {
        // Abort if an accessor is found on the unsafe global object
        // instead of a data property. We should never get into this
        // non standard situation.
        if ('get' in desc || 'set' in desc) {
          throw new TypeError(`unexpected accessor on global property: ${name}`);
        }

        defineProperty(namedIntrinsics, name, desc);
      }
    }

    return namedIntrinsics;
  }

  function getAllPrimordials(global, anonIntrinsics) {

    const root = {
      global, // global plus all the namedIntrinsics
      anonIntrinsics,
    };
    // todo: re-examine exactly which "global" we're freezing

    return root;
  }

  function getAllPrimordials$1(namedIntrinsics, anonIntrinsics) {

    const root = {
      namedIntrinsics,
      anonIntrinsics,
    };

    return root;
  }

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

  const t = true;
  const j = true; // included in the Jessie runtime

  let TypedArrayWhitelist; // defined and used below

  var whitelist = {
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
        constructor: false,
      },
      ArrayIteratorPrototype: {},
      StringIteratorPrototype: {},
      MapIteratorPrototype: {},
      SetIteratorPrototype: {},
      // AsyncIteratorPrototype does not inherit from IteratorPrototype
      AsyncIteratorPrototype: {},

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
        length: '*', // Not sure why this is needed
        prototype: {
          // 25.4
          prototype: {
            next: '*',
            return: '*',
            throw: '*',
            constructor: '*', // Not sure why this is needed
          },
        },
      },
      AsyncGeneratorFunction: {
        // 25.3
        length: '*',
        prototype: {
          // 25.5
          prototype: {
            next: '*',
            return: '*',
            throw: '*',
            constructor: '*', // Not sure why this is needed
          },
        },
      },
      AsyncFunction: {
        // 25.7
        length: '*',
        prototype: '*',
      },

      TypedArray: (TypedArrayWhitelist = {
        // 22.2
        length: '*', // does not inherit from Function.prototype on Chrome
        name: '*', // ditto
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
          BYTES_PER_ELEMENT: '*',
        },
      }),
    },

    namedIntrinsics: {
      // In order according to
      // http://www.ecma-international.org/ecma-262/ with chapter
      // numbers where applicable

      // 18 The Global Object

      // 18.1
      Infinity: j,
      NaN: j,
      undefined: j,

      // 18.2
      eval: j, // realms-shim depends on having indirect eval in the globals
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
        assign: t, // ES-Harmony
        create: t,
        defineProperties: t, // ES-Harmony
        defineProperty: t,
        entries: t, // ES-Harmony
        freeze: j,
        getOwnPropertyDescriptor: t,
        getOwnPropertyDescriptors: t, // proposed ES-Harmony
        getOwnPropertyNames: t,
        getOwnPropertySymbols: t, // ES-Harmony
        getPrototypeOf: t,
        is: j, // ES-Harmony
        isExtensible: t,
        isFrozen: t,
        isSealed: t,
        keys: t,
        preventExtensions: j,
        seal: j,
        setPrototypeOf: t, // ES-Harmony
        values: t, // ES-Harmony

        prototype: {
          // B.2.2
          // We need to prefix __proto__ with ESCAPE so that it doesn't
          // just change the prototype of this object.
          ESCAPE__proto__: 'maybeAccessor',
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
          valueOf: '*',

          // Generally allowed
          [Symbol.iterator]: '*',
          [Symbol.toPrimitive]: '*',
          [Symbol.toStringTag]: '*',
          [Symbol.unscopables]: '*',
        },
      },

      Function: {
        // 19.2
        length: t,
        prototype: {
          apply: t,
          bind: t,
          call: t,
          [Symbol.hasInstance]: '*',

          // 19.2.4 instances
          length: '*',
          name: '*', // ES-Harmony
          prototype: '*',
          arity: '*', // non-std, deprecated in favor of length

          // Generally allowed
          [Symbol.species]: 'maybeAccessor', // ES-Harmony?
        },
      },

      Boolean: {
        // 19.3
        prototype: t,
      },

      Symbol: {
        // 19.4               all ES-Harmony
        asyncIterator: t, // proposed? ES-Harmony
        for: t,
        hasInstance: t,
        isConcatSpreadable: t,
        iterator: t,
        keyFor: t,
        match: t,
        matchAll: t,
        replace: t,
        search: t,
        species: t,
        split: t,
        toPrimitive: t,
        toStringTag: t,
        unscopables: t,
        prototype: t,
      },

      Error: {
        // 19.5
        prototype: {
          name: '*',
          message: '*',
        },
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
        prototype: t,
      },
      RangeError: {
        prototype: t,
      },
      ReferenceError: {
        prototype: t,
      },
      SyntaxError: {
        prototype: t,
      },
      TypeError: {
        prototype: t,
      },
      URIError: {
        prototype: t,
      },

      // 20 Numbers and Dates

      Number: {
        // 20.1
        EPSILON: t, // ES-Harmony
        isFinite: j, // ES-Harmony
        isInteger: t, // ES-Harmony
        isNaN: j, // ES-Harmony
        isSafeInteger: j, // ES-Harmony
        MAX_SAFE_INTEGER: j, // ES-Harmony
        MAX_VALUE: t,
        MIN_SAFE_INTEGER: j, // ES-Harmony
        MIN_VALUE: t,
        NaN: t,
        NEGATIVE_INFINITY: t,
        parseFloat: t, // ES-Harmony
        parseInt: t, // ES-Harmony
        POSITIVE_INFINITY: t,
        prototype: {
          toExponential: t,
          toFixed: t,
          toPrecision: t,
        },
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
        acosh: t, // ES-Harmony
        asin: t,
        asinh: t, // ES-Harmony
        atan: t,
        atanh: t, // ES-Harmony
        atan2: t,
        cbrt: t, // ES-Harmony
        ceil: j,
        clz32: t, // ES-Harmony
        cos: t,
        cosh: t, // ES-Harmony
        exp: t,
        expm1: t, // ES-Harmony
        floor: j,
        fround: t, // ES-Harmony
        hypot: t, // ES-Harmony
        imul: t, // ES-Harmony
        log: j,
        log1p: t, // ES-Harmony
        log10: j, // ES-Harmony
        log2: j, // ES-Harmony
        max: j,
        min: j,
        pow: j,
        random: t, // questionable
        round: j,
        sign: t, // ES-Harmony
        sin: t,
        sinh: t, // ES-Harmony
        sqrt: j,
        tan: t,
        tanh: t, // ES-Harmony
        trunc: j, // ES-Harmony
      },

      // no-arg Date constructor is questionable
      Date: {
        // 20.3
        now: t, // questionable
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
          toGMTString: t,
        },
      },

      // 21 Text Processing

      String: {
        // 21.2
        fromCharCode: j,
        fromCodePoint: t, // ES-Harmony
        raw: j, // ES-Harmony
        prototype: {
          charAt: t,
          charCodeAt: t,
          codePointAt: t, // ES-Harmony
          concat: t,
          endsWith: j, // ES-Harmony
          includes: t, // ES-Harmony
          indexOf: j,
          lastIndexOf: j,
          localeCompare: t,
          match: t,
          normalize: t, // ES-Harmony
          padEnd: t, // ES-Harmony
          padStart: t, // ES-Harmony
          repeat: t, // ES-Harmony
          replace: t,
          search: t,
          slice: j,
          split: t,
          startsWith: j, // ES-Harmony
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

          trimLeft: t, // non-standard
          trimRight: t, // non-standard

          // 21.1.4 instances
          length: '*',
        },
      },

      RegExp: {
        // 21.2
        prototype: {
          exec: t,
          flags: 'maybeAccessor',
          global: 'maybeAccessor',
          ignoreCase: 'maybeAccessor',
          [Symbol.match]: '*', // ES-Harmony
          multiline: 'maybeAccessor',
          [Symbol.replace]: '*', // ES-Harmony
          [Symbol.search]: '*', // ES-Harmony
          source: 'maybeAccessor',
          [Symbol.split]: '*', // ES-Harmony
          sticky: 'maybeAccessor',
          test: t,
          unicode: 'maybeAccessor', // ES-Harmony
          dotAll: 'maybeAccessor', // proposed ES-Harmony

          // B.2.5
          compile: false, // UNSAFE. Purposely suppressed

          // 21.2.6 instances
          lastIndex: '*',
          options: '*', // non-std
        },
      },

      // 22 Indexed Collections

      Array: {
        // 22.1
        from: j,
        isArray: t,
        of: j, // ES-Harmony?
        prototype: {
          concat: t,
          copyWithin: t, // ES-Harmony
          entries: t, // ES-Harmony
          every: t,
          fill: t, // ES-Harmony
          filter: j,
          find: t, // ES-Harmony
          findIndex: t, // ES-Harmony
          forEach: j,
          includes: t, // ES-Harmony
          indexOf: j,
          join: t,
          keys: t, // ES-Harmony
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
          values: t, // ES-Harmony

          // 22.1.4 instances
          length: '*',
        },
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
          values: j,
        },
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
          values: j,
        },
      },

      WeakMap: {
        // 23.3
        prototype: {
          // Note: coordinate this list with maintenance of repairES5.js
          delete: j,
          get: j,
          has: j,
          set: j,
        },
      },

      WeakSet: {
        // 23.4
        prototype: {
          add: j,
          delete: j,
          has: j,
        },
      },

      // 24 Structured Data

      ArrayBuffer: {
        // 24.1            all ES-Harmony
        isView: t,
        length: t, // does not inherit from Function.prototype on Chrome
        name: t, // ditto
        prototype: {
          byteLength: 'maybeAccessor',
          slice: t,
        },
      },

      // 24.2 TODO: Omitting SharedArrayBuffer for now

      DataView: {
        // 24.3               all ES-Harmony
        length: t, // does not inherit from Function.prototype on Chrome
        name: t, // ditto
        BYTES_PER_ELEMENT: '*', // non-standard. really?
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
          setUint32: t,
        },
      },

      // 24.4 TODO: Omitting Atomics for now

      JSON: {
        // 24.5
        parse: j,
        stringify: j,
      },

      // 25 Control Abstraction Objects

      Promise: {
        // 25.4
        all: j,
        race: j,
        reject: j,
        resolve: j,
        makeHandled: t, // eventual-send
        prototype: {
          catch: t,
          then: j,
          finally: t, // proposed ES-Harmony

          // eventual-send
          delete: t,
          get: t,
          put: t,
          post: t,
          invoke: t,
          fapply: t,
          fcall: t,

          // nanoq.js
          del: t,

          // Temporary compat with the old makeQ.js
          send: t,
          end: t,
        },
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
        defer: t,
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
        setPrototypeOf: t,
      },

      Proxy: {
        // 26.2
        revocable: t,
      },

      // Appendix B

      // B.2.1
      escape: t,
      unescape: t,

      // B.2.5 (RegExp.prototype.compile) is marked 'false' up in 21.2

      // Other

      StringMap: {
        // A specialized approximation of ES-Harmony's Map.
        prototype: {}, // Technically, the methods should be on the prototype,
        // but doing so while preserving encapsulation will be
        // needlessly expensive for current usage.
      },

      Realm: {
        makeRootRealm: t,
        makeCompartment: t,
        prototype: {
          global: 'maybeAccessor',
          evaluate: t,
        },
      },

      SES: {
        confine: t,
        confineExpr: t,
        harden: t,
      },

      Nat: j,
      def: j,
    },
  };

  function makeConsole(parentConsole) {
    /* 'parentConsole' is the parent Realm's original 'console' object. We must
       wrap it, exposing a 'console' with a 'console.log' (and perhaps others)
       to the local realm, without allowing access to the original 'console',
       its return values, or its exception objects, any of which could be used
       to break confinement via the unsafe Function constructor. */

    // callAndWrapError is copied from proposal-realms/shim/src/realmFacade.js
    // Like Realm.apply except that it catches anything thrown and rethrows it
    // as an Error from this realm

    const errorConstructors = new Map([
      ['EvalError', EvalError],
      ['RangeError', RangeError],
      ['ReferenceError', ReferenceError],
      ['SyntaxError', SyntaxError],
      ['TypeError', TypeError],
      ['URIError', URIError],
    ]);

    function callAndWrapError(target, ...args) {
      try {
        return target(...args);
      } catch (err) {
        if (Object(err) !== err) {
          // err is a primitive value, which is safe to rethrow
          throw err;
        }
        let eName;
        let eMessage;
        let eStack;
        try {
          // The child environment might seek to use 'err' to reach the
          // parent's intrinsics and corrupt them. `${err.name}` will cause
          // string coercion of 'err.name'. If err.name is an object (probably
          // a String of the parent Realm), the coercion uses
          // err.name.toString(), which is under the control of the parent. If
          // err.name were a primitive (e.g. a number), it would use
          // Number.toString(err.name), using the child's version of Number
          // (which the child could modify to capture its argument for later
          // use), however primitives don't have properties like .prototype so
          // they aren't useful for an attack.
          eName = `${err.name}`;
          eMessage = `${err.message}`;
          eStack = `${err.stack || eMessage}`;
          // eName/eMessage/eStack are now child-realm primitive strings, and
          // safe to expose
        } catch (ignored) {
          // if err.name.toString() throws, keep the (parent realm) Error away
          // from the child
          throw new Error('unknown error');
        }
        const ErrorConstructor = errorConstructors.get(eName) || Error;
        try {
          throw new ErrorConstructor(eMessage);
        } catch (err2) {
          err2.stack = eStack; // replace with the captured inner stack
          throw err2;
        }
      }
    }

    const newConsole = {};
    const passThrough = [
      'log',
      'info',
      'warn',
      'error',
      'group',
      'groupEnd',
      'trace',
      'time',
      'timeLog',
      'timeEnd',
    ];
    // TODO: those are the properties that MDN documents. Node.js has a bunch
    // of additional ones that I didn't include, which might be appropriate.

    passThrough.forEach(name => {
      // TODO: do we reveal the presence/absence of these properties to the
      // child realm, thus exposing nondeterminism (and a hint of what platform
      // you might be on) when it is constructed with {consoleMode: allow} ? Or
      // should we expose the same set all the time, but silently ignore calls
      // to the missing ones, to hide that variation? We might even consider
      // adding console.* to the child realm all the time, even without
      // consoleMode:allow, but ignore the calls unless the mode is enabled.
      if (name in parentConsole) {
        const orig = parentConsole[name];
        // TODO: in a stack trace, this appears as
        // "Object.newConsole.(anonymous function) [as trace]"
        // can we make that "newConsole.trace" ?
        newConsole[name] = function newerConsole(...args) {
          callAndWrapError(orig, ...args);
        };
      }
    });

    return newConsole;
  }

  function makeMakeRequire(r, harden) {
    function makeRequire(config) {
      const cache = new Map();

      function build(what) {
        // This approach denies callers the ability to use inheritance to
        // manage their config objects, but a simple "if (what in config)"
        // predicate would also be truthy for e.g. "toString" and other
        // properties of Object.prototype, and require('toString') should be
        // legal if and only if the config object included an own-property
        // named 'toString'. Incidentally, this could have been
        // "config.hasOwnProperty(what)" but eslint complained.
        if (!Object.prototype.hasOwnProperty.call(config, what)) {
          throw new Error(`Cannot find module '${what}'`);
        }
        const c = config[what];

        // some modules are hard-coded ways to access functionality that SES
        // provides directly
        if (what === '@agoric/harden') {
          return harden;
        }

        // If the config points at a simple function, it must be a pure
        // function with no dependencies (i.e. no 'require' or 'import', no
        // calls to other functions defined in the same file but outside the
        // function body). We stringify it and evaluate it inside this realm.
        if (typeof c === 'function') {
          return r.evaluate(`(${c})`);
        }

        // else we treat it as an object with an 'attenuatorSource' property
        // that defines an attenuator function, which we evaluate. We then
        // invoke it with the config object, which can contain authorities that
        // it can wrap. The return value from this invocation is the module
        // object that gets returned from require(). The attenuator function
        // and the module it returns are in-realm, the authorities it wraps
        // will be out-of-realm.
        const src = `(${c.attenuatorSource})`;
        const attenuator = r.evaluate(src);
        return attenuator(c);
      }

      function newRequire(whatArg) {
        const what = `${whatArg}`;
        if (!cache.has(what)) {
          cache.set(what, harden(build(what)));
        }
        return cache.get(what);
      }

      return newRequire;
    }

    return makeRequire;
  }

  /**
   * @fileoverview Exports {@code ses.dataPropertiesToRepair}, a recursively
   * defined JSON record enumerating the optimal set of prototype properties
   * on primordials that need to be repaired before hardening.
   *
   * //provides ses.dataPropertiesToRepair
   * @author JF Paradis
   */

  /**
   * <p>The optimal set of prototype properties that need to be repaired
   * before hardening is applied on enviromments subject to the override
   * mistake.
   *
   * <p>Because "repairing" replaces data properties with accessors, every
   * time a repaired property is accessed, the associated getter is invoked,
   * which degrades the runtime performance of all code executing in the
   * repaired enviromment, compared to the non-repaired case. In order
   * to maintain performance, we only repair the properties of objects
   * for which hardening causes a breakage of their intended usage. There
   * are three cases:
   * <ul>Overriding properties on objects typically used as maps,
   *     namely {@code "Object"} and {@code "Array"}. In the case of arrays,
   *     a given program might not be aware that non-numerical properties are
   *     stored on the undelying object instance, not on the array. When an
   *     object is typically used as a map, we repair all of its prototype
   *     properties.
   * <ul>Overriding properties on objects that provide defaults on their
   *     prototype that programs typically override by assignment, such as
   *     {@code "Error.prototype.message"} and {@code "Function.prototype.name"}
   *     (both default to "").
   * <ul>Setting a prototype chain. The constructor is typically set by
   *     assignment, for example {@code "Child.prototype.constructor = Child"}.
   *
   * <p>Each JSON record enumerates the disposition of the properties on
   * some corresponding primordial object, with the root record containing:
   * <ul>
   * <li>The record for the global object.
   * <li>The record for the anonymous intrinsics.
   * </ul>
   *
   * <p>For each such record, the values associated with its property
   * names can be:
   * <ul>
   * <li>Another record, in which case this property is simply left
   *     unrepaired and that next record represents the disposition of
   *     the object which is its value. For example, {@code "Object"}
   *     leads to another record explaining what properties {@code
   *     "Object"} may have and how each such property, if present,
   *     and its value should be repaired.
   * <li>true, in which case this property is simply repaired. The
   *     value associated with that property is not traversed. For
   * 	   example, {@code "Function.prototype.name"} leads to true,
   *     meaning that the {@code "name"} property of {@code
   *     "Function.prototype"} should be repaired (which is needed
   *     when inheriting from @code{Function} and setting the subclass's
   *     {@code "prototype.name"} property). If the property is
   *     already an accessor property, it is not repaired (because
   *     accessors are not subject to the override mistake).
   * <li>"*", all properties on this object are repaired.
   * <li>falsey, in which case this property is skipped.
   * </ul>
   *
   * <p>We factor out {@code true} into the variable {@code t} just to
   * get a bit better compression from simple minifiers.
   */

  const t$1 = true;

  var dataPropertiesToRepair = {
    namedIntrinsics: {
      Object: {
        prototype: '*',
      },

      Array: {
        prototype: '*',
      },

      Function: {
        prototype: {
          constructor: t$1, // set by "regenerator-runtime"
          bind: t$1, // set by "underscore"
          name: t$1,
          toString: t$1,
        },
      },

      Error: {
        prototype: {
          constructor: t$1, // set by "fast-json-patch"
          message: t$1,
          name: t$1, // set by "precond"
          toString: t$1, // set by "bluebird"
        },
      },

      Promise: {
        prototype: {
          constructor: t$1, // set by "core-js"
        },
      },
    },

    anonIntrinsics: {
      TypedArray: {
        prototype: '*',
      },

      GeneratorFunction: {
        prototype: {
          constructor: t$1,
          name: t$1,
          toString: t$1,
        },
      },

      AsyncFunction: {
        prototype: {
          constructor: t$1,
          name: t$1,
          toString: t$1,
        },
      },

      AsyncGeneratorFunction: {
        prototype: {
          constructor: t$1,
          name: t$1,
          toString: t$1,
        },
      },

      IteratorPrototype: '*',
    },
  };

  // Adapted from SES/Caja
  // Copyright (C) 2011 Google Inc.
  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/startSES.js
  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/repairES5.js

  function repairDataProperties(intrinsics, repairPlan) {
    // Object.defineProperty is allowed to fail silently,
    // use Object.defineProperties instead.

    const {
      defineProperties,
      getOwnPropertyDescriptor,
      getOwnPropertyDescriptors,
      prototype: { hasOwnProperty },
    } = Object;

    const { ownKeys } = Reflect;

    /**
     * For a special set of properties (defined in the repairPlan), it ensures
     * that the effect of freezing does not suppress the ability to override
     * these properties on derived objects by simple assignment.
     *
     * Because of lack of sufficient foresight at the time, ES5 unfortunately
     * specified that a simple assignment to a non-existent property must fail if
     * it would override a non-writable data property of the same name. (In
     * retrospect, this was a mistake, but it is now too late and we must live
     * with the consequences.) As a result, simply freezing an object to make it
     * tamper proof has the unfortunate side effect of breaking previously correct
     * code that is considered to have followed JS best practices, if this
     * previous code used assignment to override.
     */
    function enableDerivedOverride(obj, prop, desc) {
      if ('value' in desc && desc.configurable) {
        const { value } = desc;

        // eslint-disable-next-line no-inner-declarations
        function getter() {
          return value;
        }

        // Re-attach the data property on the object so
        // it can be found by the deep-freeze traversal process.
        getter.value = value;

        // eslint-disable-next-line no-inner-declarations
        function setter(newValue) {
          if (obj === this) {
            throw new TypeError(
              `Cannot assign to read only property '${prop}' of object '${obj}'`,
            );
          }
          if (hasOwnProperty.call(this, prop)) {
            this[prop] = newValue;
          } else {
            defineProperties(this, {
              [prop]: {
                value: newValue,
                writable: true,
                enumerable: desc.enumerable,
                configurable: desc.configurable,
              },
            });
          }
        }

        defineProperties(obj, {
          [prop]: {
            get: getter,
            set: setter,
            enumerable: desc.enumerable,
            configurable: desc.configurable,
          },
        });
      }
    }

    function repairOneProperty(obj, prop) {
      if (!obj) {
        return;
      }
      const desc = getOwnPropertyDescriptor(obj, prop);
      if (!desc) {
        return;
      }
      enableDerivedOverride(obj, prop, desc);
    }

    function repairAllProperties(obj) {
      if (!obj) {
        return;
      }
      const descs = getOwnPropertyDescriptors(obj);
      if (!descs) {
        return;
      }
      ownKeys(descs).forEach(prop =>
        enableDerivedOverride(obj, prop, descs[prop]),
      );
    }

    function walkRepairPlan(obj, plan) {
      if (!obj) {
        return;
      }
      if (!plan) {
        return;
      }
      ownKeys(plan).forEach(prop => {
        const subPlan = plan[prop];
        const subObj = obj[prop];
        switch (subPlan) {
          case true:
            repairOneProperty(obj, prop);
            break;

          case '*':
            repairAllProperties(subObj);
            break;

          default:
            if (Object(subPlan) !== subPlan) {
              throw TypeError(`Repair plan subPlan ${subPlan} is invalid`);
            }
            walkRepairPlan(subObj, subPlan);
        }
      });
    }

    // Do the repair.
    walkRepairPlan(intrinsics, repairPlan);
  }

  // Copyright (C) 2018 Agoric

  const FORWARDED_REALMS_OPTIONS = ['transforms'];

  function createSESWithRealmConstructor(creatorStrings, Realm) {
    function makeSESRootRealm(options) {
      // eslint-disable-next-line no-param-reassign
      options = Object(options); // Todo: sanitize
      const shims = [];

      const {
        dataPropertiesToRepair: optDataPropertiesToRepair,
        shims: optionalShims,
        sloppyGlobals,
        whitelist: optWhitelist,
        ...optionsRest
      } = options;

      const wl = JSON.parse(JSON.stringify(optWhitelist || whitelist));
      const repairPlan =
        optDataPropertiesToRepair !== undefined
          ? JSON.parse(JSON.stringify(optDataPropertiesToRepair))
          : dataPropertiesToRepair;

      // Forward the designated Realms options.
      const realmsOptions = {};
      FORWARDED_REALMS_OPTIONS.forEach(key => {
        if (key in optionsRest) {
          realmsOptions[key] = optionsRest[key];
        }
      });

      if (sloppyGlobals) {
        throw TypeError(`\
sloppyGlobals cannot be specified for makeSESRootRealm!
You probably want a Compartment instead, like:
  const c = s.global.Realm.makeCompartment({ sloppyGlobals: true })`);
      }

      // "allow" enables real Date.now(), anything else gets NaN
      // (it'd be nice to allow a fixed numeric value, but too hard to
      // implement right now)
      if (options.dateNowMode !== 'allow') {
        shims.push(`(${tameDate})();`);
      }

      if (options.mathRandomMode !== 'allow') {
        shims.push(`(${tameMath})();`);
      }

      // Intl is disabled entirely for now, deleted by removeProperties. If we
      // want to bring it back (under the control of this option), we'll need
      // to add it to the whitelist too, as well as taming it properly.
      if (options.intlMode !== 'allow') {
        // this shim also disables Object.prototype.toLocaleString
        shims.push(`(${tameIntl})();`);
      }

      if (options.errorStackMode !== 'allow') {
        shims.push(`(${tameError})();`);
      } else {
        // if removeProperties cleans these things from Error, v8 won't provide
        // stack traces or even toString on exceptions, and then Node.js prints
        // uncaught exceptions as "undefined" instead of a type/message/stack.
        // So if we're allowing stack traces, make sure the whitelist is
        // augmented to include them.
        wl.namedIntrinsics.Error.captureStackTrace = true;
        wl.namedIntrinsics.Error.stackTraceLimit = true;
        wl.namedIntrinsics.Error.prepareStackTrace = true;
      }

      if (options.regexpMode !== 'allow') {
        shims.push(`(${tameRegExp})();`);
      }

      // The getAnonIntrinsics function might be renamed by e.g. rollup. The
      // removeProperties() function references it by name, so we need to force
      // it to have a specific name.
      const removeProp = `const getAnonIntrinsics = (${getAnonIntrinsics$1});
               (${removeProperties})(this, ${JSON.stringify(wl)})`;
      shims.push(removeProp);

      // Add options.shims.
      if (optionalShims) {
        shims.push(...optionalShims);
      }

      const r = Realm.makeRootRealm({ ...realmsOptions, shims });

      // Build a harden() with an empty fringe. It will be populated later when
      // we call harden(allIntrinsics).
      const makeHardenerSrc = `(${makeHardener})`;
      const harden = r.evaluate(makeHardenerSrc)();

      const b = r.evaluate(creatorStrings);
      b.createSESInThisRealm(r.global, creatorStrings, r);

      // Allow harden to be accessible via the SES global.
      r.global.SES.harden = harden;

      if (options.consoleMode === 'allow') {
        const s = `(${makeConsole})`;
        r.global.console = r.evaluate(s)(console);
      }

      // Extract the intrinsics from the global.
      const anonIntrinsics = r.evaluate(`(${getAnonIntrinsics$1})`)(r.global);
      const namedIntrinsics = r.evaluate(`(${getNamedIntrinsics})`)(
        r.global,
        whitelist,
      );

      // Gather the intrinsics only.
      const allIntrinsics = r.evaluate(`(${getAllPrimordials$1})`)(
        namedIntrinsics,
        anonIntrinsics,
      );

      // Gather the primordials and the globals.
      const allPrimordials = r.evaluate(`(${getAllPrimordials})`)(
        r.global,
        anonIntrinsics,
      );

      // Repair the override mistake on the intrinsics only.
      r.evaluate(`(${repairDataProperties})`)(allIntrinsics, repairPlan);

      // Finally freeze all the primordials, and the global object. This must
      // be the last thing we do that modifies the Realm's globals.
      harden(allPrimordials);

      // build the makeRequire helper, glue it to the new Realm
      r.makeRequire = harden(r.evaluate(`(${makeMakeRequire})`)(r, harden));
      return r;
    }
    const SES = {
      makeSESRootRealm,
    };

    return SES;
  }

  const creatorStrings = "(function (exports) {\n  'use strict';\n\n  // Adapted from SES/Caja - Copyright (C) 2011 Google Inc.\n  // Copyright (C) 2018 Agoric\n\n  // Licensed under the Apache License, Version 2.0 (the \"License\");\n  // you may not use this file except in compliance with the License.\n  // You may obtain a copy of the License at\n  //\n  // http://www.apache.org/licenses/LICENSE-2.0\n  //\n  // Unless required by applicable law or agreed to in writing, software\n  // distributed under the License is distributed on an \"AS IS\" BASIS,\n  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  // See the License for the specific language governing permissions and\n  // limitations under the License.\n\n  // based upon:\n  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/startSES.js\n  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/repairES5.js\n  // then copied from proposal-frozen-realms deep-freeze.js\n  // then copied from SES/src/bundle/deepFreeze.js\n\n  /**\n   * @typedef HardenerOptions\n   * @type {object}\n   * @property {WeakSet=} fringeSet WeakSet to use for the fringeSet\n   * @property {Function=} naivePrepareObject Call with object before hardening\n   */\n\n  /**\n   * Create a `harden` function.\n   *\n   * @param {Iterable} initialFringe Objects considered already hardened\n   * @param {HardenerOptions=} options Options for creation\n   */\n  function makeHardener(initialFringe, options = {}) {\n    const { freeze, getOwnPropertyDescriptors, getPrototypeOf } = Object;\n    const { ownKeys } = Reflect;\n\n    // Objects that we won't freeze, either because we've frozen them already,\n    // or they were one of the initial roots (terminals). These objects form\n    // the \"fringe\" of the hardened object graph.\n    let { fringeSet } = options;\n    if (fringeSet) {\n      if (\n        typeof fringeSet.add !== 'function' ||\n        typeof fringeSet.has !== 'function'\n      ) {\n        throw new TypeError(\n          `options.fringeSet must have add() and has() methods`,\n        );\n      }\n\n      // Populate the supplied fringeSet with our initialFringe.\n      if (initialFringe) {\n        for (const fringe of initialFringe) {\n          fringeSet.add(fringe);\n        }\n      }\n    } else {\n      // Use a new empty fringe.\n      fringeSet = new WeakSet(initialFringe);\n    }\n\n    const naivePrepareObject = options && options.naivePrepareObject;\n\n    function harden(root) {\n      const toFreeze = new Set();\n      const prototypes = new Map();\n      const paths = new WeakMap();\n\n      // If val is something we should be freezing but aren't yet,\n      // add it to toFreeze.\n      function enqueue(val, path) {\n        if (Object(val) !== val) {\n          // ignore primitives\n          return;\n        }\n        const type = typeof val;\n        if (type !== 'object' && type !== 'function') {\n          // future proof: break until someone figures out what it should do\n          throw new TypeError(`Unexpected typeof: ${type}`);\n        }\n        if (fringeSet.has(val) || toFreeze.has(val)) {\n          // Ignore if this is an exit, or we've already visited it\n          return;\n        }\n        // console.log(`adding ${val} to toFreeze`, val);\n        toFreeze.add(val);\n        paths.set(val, path);\n      }\n\n      function freezeAndTraverse(obj) {\n        // Apply the naive preparer if they specified one.\n        if (naivePrepareObject) {\n          naivePrepareObject(obj);\n        }\n\n        // Now freeze the object to ensure reactive\n        // objects such as proxies won't add properties\n        // during traversal, before they get frozen.\n\n        // Object are verified before being enqueued,\n        // therefore this is a valid candidate.\n        // Throws if this fails (strict mode).\n        freeze(obj);\n\n        // we rely upon certain commitments of Object.freeze and proxies here\n\n        // get stable/immutable outbound links before a Proxy has a chance to do\n        // something sneaky.\n        const proto = getPrototypeOf(obj);\n        const descs = getOwnPropertyDescriptors(obj);\n        const path = paths.get(obj) || 'unknown';\n\n        // console.log(`adding ${proto} to prototypes under ${path}`);\n        if (proto !== null && !prototypes.has(proto)) {\n          prototypes.set(proto, path);\n          paths.set(proto, `${path}.__proto__`);\n        }\n\n        ownKeys(descs).forEach(name => {\n          const pathname = `${path}.${String(name)}`;\n          // todo uncurried form\n          // todo: getOwnPropertyDescriptors is guaranteed to return well-formed\n          // descriptors, but they still inherit from Object.prototype. If\n          // someone has poisoned Object.prototype to add 'value' or 'get'\n          // properties, then a simple 'if (\"value\" in desc)' or 'desc.value'\n          // test could be confused. We use hasOwnProperty to be sure about\n          // whether 'value' is present or not, which tells us for sure that this\n          // is a data property.\n          const desc = descs[name];\n          if ('value' in desc) {\n            // todo uncurried form\n            enqueue(desc.value, `${pathname}`);\n          } else {\n            enqueue(desc.get, `${pathname}(get)`);\n            enqueue(desc.set, `${pathname}(set)`);\n          }\n        });\n      }\n\n      function dequeue() {\n        // New values added before forEach() has finished will be visited.\n        toFreeze.forEach(freezeAndTraverse); // todo curried forEach\n      }\n\n      function checkPrototypes() {\n        prototypes.forEach((path, p) => {\n          if (!(toFreeze.has(p) || fringeSet.has(p))) {\n            // all reachable properties have already been frozen by this point\n            let msg;\n            try {\n              msg = `prototype ${p} of ${path} is not already in the fringeSet`;\n            } catch (e) {\n              // `${(async _=>_).__proto__}` fails in most engines\n              msg =\n                'a prototype of something is not already in the fringeset (and .toString failed)';\n              try {\n                console.log(msg);\n                console.log('the prototype:', p);\n                console.log('of something:', path);\n              } catch (_e) {\n                // console.log might be missing in restrictive SES realms\n              }\n            }\n            throw new TypeError(msg);\n          }\n        });\n      }\n\n      function commit() {\n        // todo curried forEach\n        // we capture the real WeakSet.prototype.add above, in case someone\n        // changes it. The two-argument form of forEach passes the second\n        // argument as the 'this' binding, so we add to the correct set.\n        toFreeze.forEach(fringeSet.add, fringeSet);\n      }\n\n      enqueue(root);\n      dequeue();\n      // console.log(\"fringeSet\", fringeSet);\n      // console.log(\"prototype set:\", prototypes);\n      // console.log(\"toFreeze set:\", toFreeze);\n      checkPrototypes();\n      commit();\n\n      return root;\n    }\n\n    return harden;\n  }\n\n  function tameDate() {\n    const unsafeDate = Date;\n    // Date(anything) gives a string with the current time\n    // new Date(x) coerces x into a number and then returns a Date\n    // new Date() returns the current time, as a Date object\n    // new Date(undefined) returns a Date object which stringifies to 'Invalid Date'\n\n    const newDateConstructor = function Date(...args) {\n      if (new.target === undefined) {\n        // we were not called as a constructor\n        // this would normally return a string with the current time\n        return 'Invalid Date';\n      }\n      // constructor behavior: if we get arguments, we can safely pass them through\n      if (args.length > 0) {\n        return Reflect.construct(unsafeDate, args, new.target);\n        // todo: test that our constructor can still be subclassed\n      }\n      // no arguments: return a Date object, but invalid\n      return Reflect.construct(unsafeDate, [NaN], new.target);\n    };\n\n    Object.defineProperties(\n      newDateConstructor,\n      Object.getOwnPropertyDescriptors(unsafeDate),\n    );\n    // that will copy the .prototype too, so this next line is unnecessary\n    // newDateConstructor.prototype = unsafeDate.prototype;\n    unsafeDate.prototype.constructor = newDateConstructor;\n    // disable Date.now\n    newDateConstructor.now = () => NaN;\n\n    Date = newDateConstructor; // eslint-disable-line no-global-assign\n  }\n\n  function tameMath() {\n    // Math.random = () => 4; // https://www.xkcd.com/221\n    Math.random = () => {\n      throw Error('disabled');\n    };\n  }\n\n  /* eslint-disable-next-line no-redeclare */\n  /* global Intl */\n\n  function tameIntl() {\n    // todo: somehow fix these. These almost certainly don't enable the reading\n    // of side-channels, but we want things to be deterministic across\n    // runtimes. Best bet is to just disallow calling these functions without\n    // an explicit locale name.\n\n    // the whitelist may have deleted Intl entirely, so tolerate that\n    if (typeof Intl !== 'undefined') {\n      Intl.DateTimeFormat = () => {\n        throw Error('disabled');\n      };\n      Intl.NumberFormat = () => {\n        throw Error('disabled');\n      };\n      Intl.getCanonicalLocales = () => {\n        throw Error('disabled');\n      };\n    }\n    // eslint-disable-next-line no-extend-native\n    Object.prototype.toLocaleString = () => {\n      throw new Error('toLocaleString suppressed');\n    };\n  }\n\n  function tameError() {\n    if (!Object.isExtensible(Error)) {\n      throw Error('huh Error is not extensible');\n    }\n    /* this worked back when we were running it on a global, but stopped\n    working when we turned it into a shim */\n    /*\n    Object.defineProperty(Error.prototype, \"stack\",\n                          { get() { return 'stack suppressed'; } });\n    */\n    delete Error.captureStackTrace;\n    if ('captureStackTrace' in Error) {\n      throw Error('hey we could not remove Error.captureStackTrace');\n    }\n\n    // we might do this in the future\n    /*\n    const unsafeError = Error;\n    const newErrorConstructor = function Error(...args) {\n      return Reflect.construct(unsafeError, args, new.target);\n    };\n\n    newErrorConstructor.prototype = unsafeError.prototype;\n    newErrorConstructor.prototype.construct = newErrorConstructor;\n\n    Error = newErrorConstructor;\n\n    EvalError.__proto__ = newErrorConstructor;\n    RangeError.__proto__ = newErrorConstructor;\n    ReferenceError.__proto__ = newErrorConstructor;\n    SyntaxError.__proto__ = newErrorConstructor;\n    TypeError.__proto__ = newErrorConstructor;\n    URIError.__proto__ = newErrorConstructor;\n    */\n  }\n\n  function tameRegExp() {\n    delete RegExp.prototype.compile;\n    if ('compile' in RegExp.prototype) {\n      throw Error('hey we could not remove RegExp.prototype.compile');\n    }\n\n    // We want to delete RegExp.$1, as well as any other surprising properties.\n    // On some engines we can't just do 'delete RegExp.$1'.\n    const unsafeRegExp = RegExp;\n\n    // eslint-disable-next-line no-global-assign\n    RegExp = function RegExp(...args) {\n      return Reflect.construct(unsafeRegExp, args, new.target);\n    };\n    RegExp.prototype = unsafeRegExp.prototype;\n    unsafeRegExp.prototype.constructor = RegExp;\n\n    if ('$1' in RegExp) {\n      throw Error('hey we could not remove RegExp.$1');\n    }\n  }\n\n  /* global getAnonIntrinsics */\n\n  // Copyright (C) 2011 Google Inc.\n  // Copyright (C) 2018 Agoric\n  //\n  // Licensed under the Apache License, Version 2.0 (the \"License\");\n  // you may not use this file except in compliance with the License.\n  // You may obtain a copy of the License at\n  //\n  // http://www.apache.org/licenses/LICENSE-2.0\n  //\n  // Unless required by applicable law or agreed to in writing, software\n  // distributed under the License is distributed on an \"AS IS\" BASIS,\n  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  // See the License for the specific language governing permissions and\n  // limitations under the License.\n\n  /* This is evaluated in an environment in which getAnonIntrinsics() is\n     already defined (by prepending the definition of getAnonIntrinsics to the\n     stringified removeProperties()), hence we don't use the following\n     import */\n  // import { getAnonIntrinsics } from './anonIntrinsics.js';\n\n  function removeProperties(global, whitelist) {\n    // walk global object, test against whitelist, delete\n\n    const uncurryThis = fn => (thisArg, ...args) =>\n      Reflect.apply(fn, thisArg, args);\n    const {\n      getOwnPropertyDescriptor: gopd,\n      getOwnPropertyNames: gopn,\n      keys,\n    } = Object;\n    const cleaning = new WeakMap();\n    const getProto = Object.getPrototypeOf;\n    const hop = uncurryThis(Object.prototype.hasOwnProperty);\n\n    const whiteTable = new WeakMap();\n\n    function addToWhiteTable(rootValue, rootPermit) {\n      /**\n       * The whiteTable should map from each path-accessible primordial\n       * object to the permit object that describes how it should be\n       * cleaned.\n       *\n       * We initialize the whiteTable only so that {@code getPermit} can\n       * process \"*\" inheritance using the whitelist, by walking actual\n       * inheritance chains.\n       */\n      const whitelistSymbols = [true, false, '*', 'maybeAccessor'];\n      function register(value, permit) {\n        if (value !== Object(value)) {\n          return;\n        }\n        if (typeof permit !== 'object') {\n          if (whitelistSymbols.indexOf(permit) < 0) {\n            throw new Error(\n              `syntax error in whitelist; unexpected value: ${permit}`,\n            );\n          }\n          return;\n        }\n        if (whiteTable.has(value)) {\n          throw new Error('primordial reachable through multiple paths');\n        }\n        whiteTable.set(value, permit);\n        keys(permit).forEach(name => {\n          // Use gopd to avoid invoking an accessor property.\n          // Accessor properties for which permit !== 'maybeAccessor'\n          // are caught later by clean().\n          const desc = gopd(value, name);\n          if (desc) {\n            register(desc.value, permit[name]);\n          }\n        });\n      }\n      register(rootValue, rootPermit);\n    }\n\n    /**\n     * Should the property named {@code name} be whitelisted on the\n     * {@code base} object, and if so, with what Permit?\n     *\n     * <p>If it should be permitted, return the Permit (where Permit =\n     * true | \"maybeAccessor\" | \"*\" | Record(Permit)), all of which are\n     * truthy. If it should not be permitted, return false.\n     */\n    function getPermit(base, name) {\n      let permit = whiteTable.get(base);\n      if (permit) {\n        if (hop(permit, name)) {\n          return permit[name];\n        }\n        // Allow escaping of magical names like '__proto__'.\n        if (hop(permit, `ESCAPE${name}`)) {\n          return permit[`ESCAPE${name}`];\n        }\n      }\n      // eslint-disable-next-line no-constant-condition\n      while (true) {\n        base = getProto(base); // eslint-disable-line no-param-reassign\n        if (base === null) {\n          return false;\n        }\n        permit = whiteTable.get(base);\n        if (permit && hop(permit, name)) {\n          const result = permit[name];\n          if (result === '*') {\n            return result;\n          }\n          return false;\n        }\n      }\n    }\n\n    /**\n     * Removes all non-whitelisted properties found by recursively and\n     * reflectively walking own property chains.\n     *\n     * <p>Inherited properties are not checked, because we require that\n     * inherited-from objects are otherwise reachable by this traversal.\n     */\n    function clean(value, prefix, num) {\n      if (value !== Object(value)) {\n        return;\n      }\n      if (cleaning.get(value)) {\n        return;\n      }\n\n      const proto = getProto(value);\n      if (proto !== null && !whiteTable.has(proto)) {\n        // reportItemProblem(rootReports, ses.severities.NOT_ISOLATED,\n        //                  'unexpected intrinsic', prefix + '.__proto__');\n        throw new Error(`unexpected intrinsic ${prefix}.__proto__`);\n      }\n\n      cleaning.set(value, true);\n      gopn(value).forEach(name => {\n        const path = prefix + (prefix ? '.' : '') + name;\n        const p = getPermit(value, name);\n        if (p) {\n          const desc = gopd(value, name);\n          if (hop(desc, 'value')) {\n            // Is a data property\n            const subValue = desc.value;\n            clean(subValue, path);\n          } else if (p !== 'maybeAccessor') {\n            // We are not saying that it is safe for the prop to be\n            // unexpectedly an accessor; rather, it will be deleted\n            // and thus made safe.\n            // reportProperty(ses.severities.SAFE_SPEC_VIOLATION,\n            //               'Not a data property', path);\n            delete value[name]; // eslint-disable-line no-param-reassign\n          } else {\n            clean(desc.get, `${path}<getter>`);\n            clean(desc.set, `${path}<setter>`);\n          }\n        } else {\n          delete value[name]; // eslint-disable-line no-param-reassign\n        }\n      });\n    }\n\n    addToWhiteTable(global, whitelist.namedIntrinsics);\n    const intr = getAnonIntrinsics(global);\n    addToWhiteTable(intr, whitelist.anonIntrinsics);\n    clean(global, '');\n  }\n\n  // Copyright (C) 2011 Google Inc.\n  // Copyright (C) 2018 Agoric\n  //\n  // Licensed under the Apache License, Version 2.0 (the \"License\");\n  // you may not use this file except in compliance with the License.\n  // You may obtain a copy of the License at\n  //\n  // https://www.apache.org/licenses/LICENSE-2.0\n  //\n  // Unless required by applicable law or agreed to in writing, software\n  // distributed under the License is distributed on an \"AS IS\" BASIS,\n  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  // See the License for the specific language governing permissions and\n  // limitations under the License.\n\n  // TODO(erights): We should test for\n  // We now have a reason to omit Proxy from the whitelist.\n  // The makeBrandTester in repairES5 uses Allen's trick at\n  // https://esdiscuss.org/topic/tostringtag-spoofing-for-null-and-undefined#content-59\n  // , but testing reveals that, on FF 35.0.1, a proxy on an exotic\n  // object X will pass this brand test when X will. This is fixed as of\n  // FF Nightly 38.0a1.\n\n  /**\n   * <p>Qualifying platforms generally include all JavaScript platforms\n   * shown on <a href=\"http://kangax.github.com/es5-compat-table/\"\n   * >ECMAScript 5 compatibility table</a> that implement {@code\n   * Object.getOwnPropertyNames}. At the time of this writing,\n   * qualifying browsers already include the latest released versions of\n   * Internet Explorer (9), Firefox (4), Chrome (11), and Safari\n   * (5.0.5), their corresponding standalone (e.g., server-side) JavaScript\n   * engines, Rhino 1.73, and BESEN.\n   *\n   * <p>On such not-quite-ES5 platforms, some elements of these\n   * emulations may lose SES safety, as enumerated in the comment on\n   * each problem record in the {@code baseProblems} and {@code\n   * supportedProblems} array below. The platform must at least provide\n   * {@code Object.getOwnPropertyNames}, because it cannot reasonably be\n   * emulated.\n   *\n   * <p>This file is useful by itself, as it has no dependencies on the\n   * rest of SES. It creates no new global bindings, but merely repairs\n   * standard globals or standard elements reachable from standard\n   * globals. If the future-standard {@code WeakMap} global is present,\n   * as it is currently on FF7.0a1, then it will repair it in place. The\n   * one non-standard element that this file uses is {@code console} if\n   * present, in order to report the repairs it found necessary, in\n   * which case we use its {@code log, info, warn}, and {@code error}\n   * methods. If {@code console.log} is absent, then this file performs\n   * its repairs silently.\n   *\n   * <p>Generally, this file should be run as the first script in a\n   * JavaScript context (i.e. a browser frame), as it relies on other\n   * primordial objects and methods not yet being perturbed.\n   *\n   * <p>TODO(erights): This file tries to protect itself from some\n   * post-initialization perturbation by stashing some of the\n   * primordials it needs for later use, but this attempt is currently\n   * incomplete. We need to revisit this when we support Confined-ES5,\n   * as a variant of SES in which the primordials are not frozen. See\n   * previous failed attempt at <a\n   * href=\"https://codereview.appspot.com/5278046/\" >Speeds up\n   * WeakMap. Preparing to support unfrozen primordials.</a>. From\n   * analysis of this failed attempt, it seems that the only practical\n   * way to support CES is by use of two frames, where most of initSES\n   * runs in a SES frame, and so can avoid worrying about most of these\n   * perturbations.\n   */\n  function getAnonIntrinsics$1(global) {\n\n    const gopd = Object.getOwnPropertyDescriptor;\n    const getProto = Object.getPrototypeOf;\n\n    // ////////////// Undeniables and Intrinsics //////////////\n\n    /**\n     * The undeniables are the primordial objects which are ambiently\n     * reachable via compositions of strict syntax, primitive wrapping\n     * (new Object(x)), and prototype navigation (the equivalent of\n     * Object.getPrototypeOf(x) or x.__proto__). Although we could in\n     * theory monkey patch primitive wrapping or prototype navigation,\n     * we won't. Hence, without parsing, the following are undeniable no\n     * matter what <i>other</i> monkey patching we do to the primordial\n     * environment.\n     */\n\n    // The first element of each undeniableTuple is a string used to\n    // name the undeniable object for reporting purposes. It has no\n    // other programmatic use.\n    //\n    // The second element of each undeniableTuple should be the\n    // undeniable itself.\n    //\n    // The optional third element of the undeniableTuple, if present,\n    // should be an example of syntax, rather than use of a monkey\n    // patchable API, evaluating to a value from which the undeniable\n    // object in the second element can be reached by only the\n    // following steps:\n    // If the value is primitve, convert to an Object wrapper.\n    // Is the resulting object either the undeniable object, or does\n    // it inherit directly from the undeniable object?\n\n    function* aStrictGenerator() {} // eslint-disable-line no-empty-function\n    const Generator = getProto(aStrictGenerator);\n    async function* aStrictAsyncGenerator() {} // eslint-disable-line no-empty-function\n    const AsyncGenerator = getProto(aStrictAsyncGenerator);\n    async function aStrictAsyncFunction() {} // eslint-disable-line no-empty-function\n    const AsyncFunctionPrototype = getProto(aStrictAsyncFunction);\n\n    // TODO: this is dead code, but could be useful: make this the\n    // 'undeniables' object available via some API.\n\n    const undeniableTuples = [\n      ['Object.prototype', Object.prototype, {}],\n      ['Function.prototype', Function.prototype, function foo() {}],\n      ['Array.prototype', Array.prototype, []],\n      ['RegExp.prototype', RegExp.prototype, /x/],\n      ['Boolean.prototype', Boolean.prototype, true],\n      ['Number.prototype', Number.prototype, 1],\n      ['String.prototype', String.prototype, 'x'],\n      ['%Generator%', Generator, aStrictGenerator],\n      ['%AsyncGenerator%', AsyncGenerator, aStrictAsyncGenerator],\n      ['%AsyncFunction%', AsyncFunctionPrototype, aStrictAsyncFunction],\n    ];\n\n    undeniableTuples.forEach(tuple => {\n      const name = tuple[0];\n      const undeniable = tuple[1];\n      let start = tuple[2];\n      if (start === undefined) {\n        return;\n      }\n      start = Object(start);\n      if (undeniable === start) {\n        return;\n      }\n      if (undeniable === getProto(start)) {\n        return;\n      }\n      throw new Error(`Unexpected undeniable: ${undeniable}`);\n    });\n\n    function registerIteratorProtos(registery, base, name) {\n      const iteratorSym =\n        (global.Symbol && global.Symbol.iterator) || '@@iterator'; // used instead of a symbol on FF35\n\n      if (base[iteratorSym]) {\n        const anIter = base[iteratorSym]();\n        const anIteratorPrototype = getProto(anIter);\n        registery[name] = anIteratorPrototype; // eslint-disable-line no-param-reassign\n        const anIterProtoBase = getProto(anIteratorPrototype);\n        if (anIterProtoBase !== Object.prototype) {\n          if (!registery.IteratorPrototype) {\n            if (getProto(anIterProtoBase) !== Object.prototype) {\n              throw new Error(\n                '%IteratorPrototype%.__proto__ was not Object.prototype',\n              );\n            }\n            registery.IteratorPrototype = anIterProtoBase; // eslint-disable-line no-param-reassign\n          } else if (registery.IteratorPrototype !== anIterProtoBase) {\n            throw new Error(`unexpected %${name}%.__proto__`);\n          }\n        }\n      }\n    }\n\n    /**\n     * Get the intrinsics not otherwise reachable by named own property\n     * traversal. See\n     * https://people.mozilla.org/~jorendorff/es6-draft.html#sec-well-known-intrinsic-objects\n     * and the instrinsics section of whitelist.js\n     *\n     * <p>Unlike getUndeniables(), the result of sampleAnonIntrinsics()\n     * does depend on the current state of the primordials, so we must\n     * run this again after all other relevant monkey patching is done,\n     * in order to properly initialize cajaVM.intrinsics\n     */\n\n    // TODO: we can probably unwrap this into the outer function, and stop\n    // using a separately named 'sampleAnonIntrinsics'\n    function sampleAnonIntrinsics() {\n      const result = {};\n\n      // If there are still other ThrowTypeError objects left after\n      // noFuncPoison-ing, this should be caught by\n      // test_THROWTYPEERROR_NOT_UNIQUE below, so we assume here that\n      // this is the only surviving ThrowTypeError intrinsic.\n      // eslint-disable-next-line prefer-rest-params\n      result.ThrowTypeError = gopd(arguments, 'callee').get;\n\n      // Get the ES6 %ArrayIteratorPrototype%,\n      // %StringIteratorPrototype%, %MapIteratorPrototype%,\n      // %SetIteratorPrototype% and %IteratorPrototype% intrinsics, if\n      // present.\n      registerIteratorProtos(result, [], 'ArrayIteratorPrototype');\n      registerIteratorProtos(result, '', 'StringIteratorPrototype');\n      if (typeof Map === 'function') {\n        registerIteratorProtos(result, new Map(), 'MapIteratorPrototype');\n      }\n      if (typeof Set === 'function') {\n        registerIteratorProtos(result, new Set(), 'SetIteratorPrototype');\n      }\n\n      // Get the ES6 %GeneratorFunction% intrinsic, if present.\n      if (getProto(Generator) !== Function.prototype) {\n        throw new Error('Generator.__proto__ was not Function.prototype');\n      }\n      const GeneratorFunction = Generator.constructor;\n      if (getProto(GeneratorFunction) !== Function.prototype.constructor) {\n        throw new Error(\n          'GeneratorFunction.__proto__ was not Function.prototype.constructor',\n        );\n      }\n      result.GeneratorFunction = GeneratorFunction;\n      const genProtoBase = getProto(Generator.prototype);\n      if (genProtoBase !== result.IteratorPrototype) {\n        throw new Error('Unexpected Generator.prototype.__proto__');\n      }\n\n      // Get the ES6 %AsyncGeneratorFunction% intrinsic, if present.\n      if (getProto(AsyncGenerator) !== Function.prototype) {\n        throw new Error('AsyncGenerator.__proto__ was not Function.prototype');\n      }\n      const AsyncGeneratorFunction = AsyncGenerator.constructor;\n      if (getProto(AsyncGeneratorFunction) !== Function.prototype.constructor) {\n        throw new Error(\n          'AsyncGeneratorFunction.__proto__ was not Function.prototype.constructor',\n        );\n      }\n      result.AsyncGeneratorFunction = AsyncGeneratorFunction;\n      const AsyncGeneratorPrototype = AsyncGenerator.prototype;\n      result.AsyncIteratorPrototype = getProto(AsyncGeneratorPrototype);\n      // it appears that the only way to get an AsyncIteratorPrototype is\n      // through this getProto() process, so there's nothing to check it\n      // against\n      if (getProto(result.AsyncIteratorPrototype) !== Object.prototype) {\n        throw new Error(\n          'AsyncIteratorPrototype.__proto__ was not Object.prototype',\n        );\n      }\n\n      // Get the ES6 %AsyncFunction% intrinsic, if present.\n      if (getProto(AsyncFunctionPrototype) !== Function.prototype) {\n        throw new Error(\n          'AsyncFunctionPrototype.__proto__ was not Function.prototype',\n        );\n      }\n      const AsyncFunction = AsyncFunctionPrototype.constructor;\n      if (getProto(AsyncFunction) !== Function.prototype.constructor) {\n        throw new Error(\n          'AsyncFunction.__proto__ was not Function.prototype.constructor',\n        );\n      }\n      result.AsyncFunction = AsyncFunction;\n\n      // Get the ES6 %TypedArray% intrinsic, if present.\n      (function getTypedArray() {\n        if (!global.Float32Array) {\n          return;\n        }\n        const TypedArray = getProto(global.Float32Array);\n        if (TypedArray === Function.prototype) {\n          return;\n        }\n        if (getProto(TypedArray) !== Function.prototype) {\n          // http://bespin.cz/~ondras/html/classv8_1_1ArrayBufferView.html\n          // has me worried that someone might make such an intermediate\n          // object visible.\n          throw new Error('TypedArray.__proto__ was not Function.prototype');\n        }\n        result.TypedArray = TypedArray;\n      })();\n\n      Object.keys(result).forEach(name => {\n        if (result[name] === undefined) {\n          throw new Error(`Malformed intrinsic: ${name}`);\n        }\n      });\n\n      return result;\n    }\n\n    return sampleAnonIntrinsics();\n  }\n\n  function getNamedIntrinsics(unsafeGlobal, whitelist) {\n    const { defineProperty, getOwnPropertyDescriptor, ownKeys } = Reflect;\n\n    const namedIntrinsics = {};\n\n    const propertyNames = ownKeys(whitelist.namedIntrinsics);\n\n    for (const name of propertyNames) {\n      const desc = getOwnPropertyDescriptor(unsafeGlobal, name);\n      if (desc) {\n        // Abort if an accessor is found on the unsafe global object\n        // instead of a data property. We should never get into this\n        // non standard situation.\n        if ('get' in desc || 'set' in desc) {\n          throw new TypeError(`unexpected accessor on global property: ${name}`);\n        }\n\n        defineProperty(namedIntrinsics, name, desc);\n      }\n    }\n\n    return namedIntrinsics;\n  }\n\n  function getAllPrimordials(global, anonIntrinsics) {\n\n    const root = {\n      global, // global plus all the namedIntrinsics\n      anonIntrinsics,\n    };\n    // todo: re-examine exactly which \"global\" we're freezing\n\n    return root;\n  }\n\n  function getAllPrimordials$1(namedIntrinsics, anonIntrinsics) {\n\n    const root = {\n      namedIntrinsics,\n      anonIntrinsics,\n    };\n\n    return root;\n  }\n\n  // Copyright (C) 2011 Google Inc.\n  // Copyright (C) 2018 Agoric\n  //\n  // Licensed under the Apache License, Version 2.0 (the \"License\");\n  // you may not use this file except in compliance with the License.\n  // You may obtain a copy of the License at\n  //\n  // http://www.apache.org/licenses/LICENSE-2.0\n  //\n  // Unless required by applicable law or agreed to in writing, software\n  // distributed under the License is distributed on an \"AS IS\" BASIS,\n  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  // See the License for the specific language governing permissions and\n  // limitations under the License.\n\n  /**\n   * @fileoverview Exports {@code ses.whitelist}, a recursively defined\n   * JSON record enumerating all the naming paths in the ES5.1 spec,\n   * those de-facto extensions that we judge to be safe, and SES and\n   * Dr. SES extensions provided by the SES runtime.\n   *\n   * <p>Assumes only ES3. Compatible with ES5, ES5-strict, or\n   * anticipated ES6.\n   *\n   * //provides ses.whitelist\n   * @author Mark S. Miller,\n   * @overrides ses, whitelistModule\n   */\n\n  /**\n   * <p>Each JSON record enumerates the disposition of the properties on\n   * some corresponding primordial object, with the root record\n   * representing the global object. For each such record, the values\n   * associated with its property names can be\n   * <ul>\n   * <li>Another record, in which case this property is simply\n   *     whitelisted and that next record represents the disposition of\n   *     the object which is its value. For example, {@code \"Object\"}\n   *     leads to another record explaining what properties {@code\n   *     \"Object\"} may have and how each such property, if present,\n   *     and its value should be tamed.\n   * <li>true, in which case this property is simply whitelisted. The\n   *     value associated with that property is still traversed and\n   *     tamed, but only according to the taming of the objects that\n   *     object inherits from. For example, {@code \"Object.freeze\"} leads\n   *     to true, meaning that the {@code \"freeze\"} property of {@code\n   *     Object} should be whitelisted and the value of the property (a\n   *     function) should be further tamed only according to the\n   *     markings of the other objects it inherits from, like {@code\n   *     \"Function.prototype\"} and {@code \"Object.prototype\").\n   *     If the property is an accessor property, it is not\n   *     whitelisted (as invoking an accessor might not be meaningful,\n   *     yet the accessor might return a value needing taming).\n   * <li>\"maybeAccessor\", in which case this accessor property is simply\n   *     whitelisted and its getter and/or setter are tamed according to\n   *     inheritance. If the property is not an accessor property, its\n   *     value is tamed according to inheritance.\n   * <li>\"*\", in which case this property on this object is whitelisted,\n   *     as is this property as inherited by all objects that inherit\n   *     from this object. The values associated with all such properties\n   *     are still traversed and tamed, but only according to the taming\n   *     of the objects that object inherits from. For example, {@code\n   *     \"Object.prototype.constructor\"} leads to \"*\", meaning that we\n   *     whitelist the {@code \"constructor\"} property on {@code\n   *     Object.prototype} and on every object that inherits from {@code\n   *     Object.prototype} that does not have a conflicting mark. Each\n   *     of these is tamed as if with true, so that the value of the\n   *     property is further tamed according to what other objects it\n   *     inherits from.\n   * <li>false, which suppresses permission inherited via \"*\".\n   * </ul>\n   *\n   * <p>TODO: We want to do for constructor: something weaker than '*',\n   * but rather more like what we do for [[Prototype]] links, which is\n   * that it is whitelisted only if it points at an object which is\n   * otherwise reachable by a whitelisted path.\n   *\n   * <p>The members of the whitelist are either\n   * <ul>\n   * <li>(uncommented) defined by the ES5.1 normative standard text,\n   * <li>(questionable) provides a source of non-determinism, in\n   *     violation of pure object-capability rules, but allowed anyway\n   *     since we've given up on restricting JavaScript to a\n   *     deterministic subset.\n   * <li>(ES5 Appendix B) common elements of de facto JavaScript\n   *     described by the non-normative Appendix B.\n   * <li>(Harmless whatwg) extensions documented at\n   *     <a href=\"http://wiki.whatwg.org/wiki/Web_ECMAScript\"\n   *     >http://wiki.whatwg.org/wiki/Web_ECMAScript</a> that seem to be\n   *     harmless. Note that the RegExp constructor extensions on that\n   *     page are <b>not harmless</b> and so must not be whitelisted.\n   * <li>(ES-Harmony proposal) accepted as \"proposal\" status for\n   *     EcmaScript-Harmony.\n   * </ul>\n   *\n   * <p>With the above encoding, there are some sensible whitelists we\n   * cannot express, such as marking a property both with \"*\" and a JSON\n   * record. This is an expedient decision based only on not having\n   * encountered such a need. Should we need this extra expressiveness,\n   * we'll need to refactor to enable a different encoding.\n   *\n   * <p>We factor out {@code true} into the variable {@code t} just to\n   * get a bit better compression from simple minifiers.\n   */\n\n  const t = true;\n  const j = true; // included in the Jessie runtime\n\n  let TypedArrayWhitelist; // defined and used below\n\n  var whitelist = {\n    // The accessible intrinsics which are not reachable by own\n    // property name traversal are listed here so that they are\n    // processed by the whitelist, although this also makes them\n    // accessible by this path.  See\n    // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-well-known-intrinsic-objects\n    // Of these, ThrowTypeError is the only one from ES5. All the\n    // rest were introduced in ES6.\n    anonIntrinsics: {\n      ThrowTypeError: {},\n      IteratorPrototype: {\n        // 25.1\n        // Technically, for SES-on-ES5, we should not need to\n        // whitelist 'next'. However, browsers are accidentally\n        // relying on it\n        // https://bugs.chromium.org/p/v8/issues/detail?id=4769#\n        // https://bugs.webkit.org/show_bug.cgi?id=154475\n        // and we will be whitelisting it as we transition to ES6\n        // anyway, so we unconditionally whitelist it now.\n        next: '*',\n        constructor: false,\n      },\n      ArrayIteratorPrototype: {},\n      StringIteratorPrototype: {},\n      MapIteratorPrototype: {},\n      SetIteratorPrototype: {},\n      // AsyncIteratorPrototype does not inherit from IteratorPrototype\n      AsyncIteratorPrototype: {},\n\n      // The %GeneratorFunction% intrinsic is the constructor of\n      // generator functions, so %GeneratorFunction%.prototype is\n      // the %Generator% intrinsic, which all generator functions\n      // inherit from. A generator function is effectively the\n      // constructor of its generator instances, so, for each\n      // generator function (e.g., \"g1\" on the diagram at\n      // http://people.mozilla.org/~jorendorff/figure-2.png )\n      // its .prototype is a prototype that its instances inherit\n      // from. Paralleling this structure, %Generator%.prototype,\n      // i.e., %GeneratorFunction%.prototype.prototype, is the\n      // object that all these generator function prototypes inherit\n      // from. The .next, .return and .throw that generator\n      // instances respond to are actually the builtin methods they\n      // inherit from this object.\n      GeneratorFunction: {\n        // 25.2\n        length: '*', // Not sure why this is needed\n        prototype: {\n          // 25.4\n          prototype: {\n            next: '*',\n            return: '*',\n            throw: '*',\n            constructor: '*', // Not sure why this is needed\n          },\n        },\n      },\n      AsyncGeneratorFunction: {\n        // 25.3\n        length: '*',\n        prototype: {\n          // 25.5\n          prototype: {\n            next: '*',\n            return: '*',\n            throw: '*',\n            constructor: '*', // Not sure why this is needed\n          },\n        },\n      },\n      AsyncFunction: {\n        // 25.7\n        length: '*',\n        prototype: '*',\n      },\n\n      TypedArray: (TypedArrayWhitelist = {\n        // 22.2\n        length: '*', // does not inherit from Function.prototype on Chrome\n        name: '*', // ditto\n        from: t,\n        of: t,\n        BYTES_PER_ELEMENT: '*',\n        prototype: {\n          buffer: 'maybeAccessor',\n          byteLength: 'maybeAccessor',\n          byteOffset: 'maybeAccessor',\n          copyWithin: '*',\n          entries: '*',\n          every: '*',\n          fill: '*',\n          filter: '*',\n          find: '*',\n          findIndex: '*',\n          forEach: '*',\n          includes: '*',\n          indexOf: '*',\n          join: '*',\n          keys: '*',\n          lastIndexOf: '*',\n          length: 'maybeAccessor',\n          map: '*',\n          reduce: '*',\n          reduceRight: '*',\n          reverse: '*',\n          set: '*',\n          slice: '*',\n          some: '*',\n          sort: '*',\n          subarray: '*',\n          values: '*',\n          BYTES_PER_ELEMENT: '*',\n        },\n      }),\n    },\n\n    namedIntrinsics: {\n      // In order according to\n      // http://www.ecma-international.org/ecma-262/ with chapter\n      // numbers where applicable\n\n      // 18 The Global Object\n\n      // 18.1\n      Infinity: j,\n      NaN: j,\n      undefined: j,\n\n      // 18.2\n      eval: j, // realms-shim depends on having indirect eval in the globals\n      isFinite: t,\n      isNaN: t,\n      parseFloat: t,\n      parseInt: t,\n      decodeURI: t,\n      decodeURIComponent: t,\n      encodeURI: t,\n      encodeURIComponent: t,\n\n      // 19 Fundamental Objects\n\n      Object: {\n        // 19.1\n        assign: t, // ES-Harmony\n        create: t,\n        defineProperties: t, // ES-Harmony\n        defineProperty: t,\n        entries: t, // ES-Harmony\n        freeze: j,\n        getOwnPropertyDescriptor: t,\n        getOwnPropertyDescriptors: t, // proposed ES-Harmony\n        getOwnPropertyNames: t,\n        getOwnPropertySymbols: t, // ES-Harmony\n        getPrototypeOf: t,\n        is: j, // ES-Harmony\n        isExtensible: t,\n        isFrozen: t,\n        isSealed: t,\n        keys: t,\n        preventExtensions: j,\n        seal: j,\n        setPrototypeOf: t, // ES-Harmony\n        values: t, // ES-Harmony\n\n        prototype: {\n          // B.2.2\n          // We need to prefix __proto__ with ESCAPE so that it doesn't\n          // just change the prototype of this object.\n          ESCAPE__proto__: 'maybeAccessor',\n          __defineGetter__: t,\n          __defineSetter__: t,\n          __lookupGetter__: t,\n          __lookupSetter__: t,\n\n          constructor: '*',\n          hasOwnProperty: t,\n          isPrototypeOf: t,\n          propertyIsEnumerable: t,\n          toLocaleString: '*',\n          toString: '*',\n          valueOf: '*',\n\n          // Generally allowed\n          [Symbol.iterator]: '*',\n          [Symbol.toPrimitive]: '*',\n          [Symbol.toStringTag]: '*',\n          [Symbol.unscopables]: '*',\n        },\n      },\n\n      Function: {\n        // 19.2\n        length: t,\n        prototype: {\n          apply: t,\n          bind: t,\n          call: t,\n          [Symbol.hasInstance]: '*',\n\n          // 19.2.4 instances\n          length: '*',\n          name: '*', // ES-Harmony\n          prototype: '*',\n          arity: '*', // non-std, deprecated in favor of length\n\n          // Generally allowed\n          [Symbol.species]: 'maybeAccessor', // ES-Harmony?\n        },\n      },\n\n      Boolean: {\n        // 19.3\n        prototype: t,\n      },\n\n      Symbol: {\n        // 19.4               all ES-Harmony\n        asyncIterator: t, // proposed? ES-Harmony\n        for: t,\n        hasInstance: t,\n        isConcatSpreadable: t,\n        iterator: t,\n        keyFor: t,\n        match: t,\n        matchAll: t,\n        replace: t,\n        search: t,\n        species: t,\n        split: t,\n        toPrimitive: t,\n        toStringTag: t,\n        unscopables: t,\n        prototype: t,\n      },\n\n      Error: {\n        // 19.5\n        prototype: {\n          name: '*',\n          message: '*',\n        },\n      },\n      // In ES6 the *Error \"subclasses\" of Error inherit from Error,\n      // since constructor inheritance generally mirrors prototype\n      // inheritance. As explained at\n      // https://code.google.com/p/google-caja/issues/detail?id=1963 ,\n      // debug.js hides away the Error constructor itself, and so needs\n      // to rewire these \"subclass\" constructors. Until we have a more\n      // general mechanism, please maintain this list of whitelisted\n      // subclasses in sync with the list in debug.js of subclasses to\n      // be rewired.\n      EvalError: {\n        prototype: t,\n      },\n      RangeError: {\n        prototype: t,\n      },\n      ReferenceError: {\n        prototype: t,\n      },\n      SyntaxError: {\n        prototype: t,\n      },\n      TypeError: {\n        prototype: t,\n      },\n      URIError: {\n        prototype: t,\n      },\n\n      // 20 Numbers and Dates\n\n      Number: {\n        // 20.1\n        EPSILON: t, // ES-Harmony\n        isFinite: j, // ES-Harmony\n        isInteger: t, // ES-Harmony\n        isNaN: j, // ES-Harmony\n        isSafeInteger: j, // ES-Harmony\n        MAX_SAFE_INTEGER: j, // ES-Harmony\n        MAX_VALUE: t,\n        MIN_SAFE_INTEGER: j, // ES-Harmony\n        MIN_VALUE: t,\n        NaN: t,\n        NEGATIVE_INFINITY: t,\n        parseFloat: t, // ES-Harmony\n        parseInt: t, // ES-Harmony\n        POSITIVE_INFINITY: t,\n        prototype: {\n          toExponential: t,\n          toFixed: t,\n          toPrecision: t,\n        },\n      },\n\n      Math: {\n        // 20.2\n        E: j,\n        LN10: j,\n        LN2: j,\n        LOG10E: t,\n        LOG2E: t,\n        PI: j,\n        SQRT1_2: t,\n        SQRT2: t,\n\n        abs: j,\n        acos: t,\n        acosh: t, // ES-Harmony\n        asin: t,\n        asinh: t, // ES-Harmony\n        atan: t,\n        atanh: t, // ES-Harmony\n        atan2: t,\n        cbrt: t, // ES-Harmony\n        ceil: j,\n        clz32: t, // ES-Harmony\n        cos: t,\n        cosh: t, // ES-Harmony\n        exp: t,\n        expm1: t, // ES-Harmony\n        floor: j,\n        fround: t, // ES-Harmony\n        hypot: t, // ES-Harmony\n        imul: t, // ES-Harmony\n        log: j,\n        log1p: t, // ES-Harmony\n        log10: j, // ES-Harmony\n        log2: j, // ES-Harmony\n        max: j,\n        min: j,\n        pow: j,\n        random: t, // questionable\n        round: j,\n        sign: t, // ES-Harmony\n        sin: t,\n        sinh: t, // ES-Harmony\n        sqrt: j,\n        tan: t,\n        tanh: t, // ES-Harmony\n        trunc: j, // ES-Harmony\n      },\n\n      // no-arg Date constructor is questionable\n      Date: {\n        // 20.3\n        now: t, // questionable\n        parse: t,\n        UTC: t,\n        prototype: {\n          // Note: coordinate this list with maintanence of repairES5.js\n          getDate: t,\n          getDay: t,\n          getFullYear: t,\n          getHours: t,\n          getMilliseconds: t,\n          getMinutes: t,\n          getMonth: t,\n          getSeconds: t,\n          getTime: t,\n          getTimezoneOffset: t,\n          getUTCDate: t,\n          getUTCDay: t,\n          getUTCFullYear: t,\n          getUTCHours: t,\n          getUTCMilliseconds: t,\n          getUTCMinutes: t,\n          getUTCMonth: t,\n          getUTCSeconds: t,\n          setDate: t,\n          setFullYear: t,\n          setHours: t,\n          setMilliseconds: t,\n          setMinutes: t,\n          setMonth: t,\n          setSeconds: t,\n          setTime: t,\n          setUTCDate: t,\n          setUTCFullYear: t,\n          setUTCHours: t,\n          setUTCMilliseconds: t,\n          setUTCMinutes: t,\n          setUTCMonth: t,\n          setUTCSeconds: t,\n          toDateString: t,\n          toISOString: t,\n          toJSON: t,\n          toLocaleDateString: t,\n          toLocaleString: t,\n          toLocaleTimeString: t,\n          toTimeString: t,\n          toUTCString: t,\n\n          // B.2.4\n          getYear: t,\n          setYear: t,\n          toGMTString: t,\n        },\n      },\n\n      // 21 Text Processing\n\n      String: {\n        // 21.2\n        fromCharCode: j,\n        fromCodePoint: t, // ES-Harmony\n        raw: j, // ES-Harmony\n        prototype: {\n          charAt: t,\n          charCodeAt: t,\n          codePointAt: t, // ES-Harmony\n          concat: t,\n          endsWith: j, // ES-Harmony\n          includes: t, // ES-Harmony\n          indexOf: j,\n          lastIndexOf: j,\n          localeCompare: t,\n          match: t,\n          normalize: t, // ES-Harmony\n          padEnd: t, // ES-Harmony\n          padStart: t, // ES-Harmony\n          repeat: t, // ES-Harmony\n          replace: t,\n          search: t,\n          slice: j,\n          split: t,\n          startsWith: j, // ES-Harmony\n          substring: t,\n          toLocaleLowerCase: t,\n          toLocaleUpperCase: t,\n          toLowerCase: t,\n          toUpperCase: t,\n          trim: t,\n\n          // B.2.3\n          substr: t,\n          anchor: t,\n          big: t,\n          blink: t,\n          bold: t,\n          fixed: t,\n          fontcolor: t,\n          fontsize: t,\n          italics: t,\n          link: t,\n          small: t,\n          strike: t,\n          sub: t,\n          sup: t,\n\n          trimLeft: t, // non-standard\n          trimRight: t, // non-standard\n\n          // 21.1.4 instances\n          length: '*',\n        },\n      },\n\n      RegExp: {\n        // 21.2\n        prototype: {\n          exec: t,\n          flags: 'maybeAccessor',\n          global: 'maybeAccessor',\n          ignoreCase: 'maybeAccessor',\n          [Symbol.match]: '*', // ES-Harmony\n          multiline: 'maybeAccessor',\n          [Symbol.replace]: '*', // ES-Harmony\n          [Symbol.search]: '*', // ES-Harmony\n          source: 'maybeAccessor',\n          [Symbol.split]: '*', // ES-Harmony\n          sticky: 'maybeAccessor',\n          test: t,\n          unicode: 'maybeAccessor', // ES-Harmony\n          dotAll: 'maybeAccessor', // proposed ES-Harmony\n\n          // B.2.5\n          compile: false, // UNSAFE. Purposely suppressed\n\n          // 21.2.6 instances\n          lastIndex: '*',\n          options: '*', // non-std\n        },\n      },\n\n      // 22 Indexed Collections\n\n      Array: {\n        // 22.1\n        from: j,\n        isArray: t,\n        of: j, // ES-Harmony?\n        prototype: {\n          concat: t,\n          copyWithin: t, // ES-Harmony\n          entries: t, // ES-Harmony\n          every: t,\n          fill: t, // ES-Harmony\n          filter: j,\n          find: t, // ES-Harmony\n          findIndex: t, // ES-Harmony\n          forEach: j,\n          includes: t, // ES-Harmony\n          indexOf: j,\n          join: t,\n          keys: t, // ES-Harmony\n          lastIndexOf: j,\n          map: j,\n          pop: j,\n          push: j,\n          reduce: j,\n          reduceRight: j,\n          reverse: t,\n          shift: j,\n          slice: j,\n          some: t,\n          sort: t,\n          splice: t,\n          unshift: j,\n          values: t, // ES-Harmony\n\n          // 22.1.4 instances\n          length: '*',\n        },\n      },\n\n      // 22.2 Typed Array stuff\n      // TODO: Not yet organized according to spec order\n\n      Int8Array: TypedArrayWhitelist,\n      Uint8Array: TypedArrayWhitelist,\n      Uint8ClampedArray: TypedArrayWhitelist,\n      Int16Array: TypedArrayWhitelist,\n      Uint16Array: TypedArrayWhitelist,\n      Int32Array: TypedArrayWhitelist,\n      Uint32Array: TypedArrayWhitelist,\n      Float32Array: TypedArrayWhitelist,\n      Float64Array: TypedArrayWhitelist,\n\n      // 23 Keyed Collections          all ES-Harmony\n\n      Map: {\n        // 23.1\n        prototype: {\n          clear: j,\n          delete: j,\n          entries: j,\n          forEach: j,\n          get: j,\n          has: j,\n          keys: j,\n          set: j,\n          size: 'maybeAccessor',\n          values: j,\n        },\n      },\n\n      Set: {\n        // 23.2\n        prototype: {\n          add: j,\n          clear: j,\n          delete: j,\n          entries: j,\n          forEach: j,\n          has: j,\n          keys: j,\n          size: 'maybeAccessor',\n          values: j,\n        },\n      },\n\n      WeakMap: {\n        // 23.3\n        prototype: {\n          // Note: coordinate this list with maintenance of repairES5.js\n          delete: j,\n          get: j,\n          has: j,\n          set: j,\n        },\n      },\n\n      WeakSet: {\n        // 23.4\n        prototype: {\n          add: j,\n          delete: j,\n          has: j,\n        },\n      },\n\n      // 24 Structured Data\n\n      ArrayBuffer: {\n        // 24.1            all ES-Harmony\n        isView: t,\n        length: t, // does not inherit from Function.prototype on Chrome\n        name: t, // ditto\n        prototype: {\n          byteLength: 'maybeAccessor',\n          slice: t,\n        },\n      },\n\n      // 24.2 TODO: Omitting SharedArrayBuffer for now\n\n      DataView: {\n        // 24.3               all ES-Harmony\n        length: t, // does not inherit from Function.prototype on Chrome\n        name: t, // ditto\n        BYTES_PER_ELEMENT: '*', // non-standard. really?\n        prototype: {\n          buffer: 'maybeAccessor',\n          byteOffset: 'maybeAccessor',\n          byteLength: 'maybeAccessor',\n          getFloat32: t,\n          getFloat64: t,\n          getInt8: t,\n          getInt16: t,\n          getInt32: t,\n          getUint8: t,\n          getUint16: t,\n          getUint32: t,\n          setFloat32: t,\n          setFloat64: t,\n          setInt8: t,\n          setInt16: t,\n          setInt32: t,\n          setUint8: t,\n          setUint16: t,\n          setUint32: t,\n        },\n      },\n\n      // 24.4 TODO: Omitting Atomics for now\n\n      JSON: {\n        // 24.5\n        parse: j,\n        stringify: j,\n      },\n\n      // 25 Control Abstraction Objects\n\n      Promise: {\n        // 25.4\n        all: j,\n        race: j,\n        reject: j,\n        resolve: j,\n        makeHandled: t, // eventual-send\n        prototype: {\n          catch: t,\n          then: j,\n          finally: t, // proposed ES-Harmony\n\n          // eventual-send\n          delete: t,\n          get: t,\n          put: t,\n          post: t,\n          invoke: t,\n          fapply: t,\n          fcall: t,\n\n          // nanoq.js\n          del: t,\n\n          // Temporary compat with the old makeQ.js\n          send: t,\n          end: t,\n        },\n      },\n\n      // nanoq.js\n      Q: {\n        all: t,\n        race: t,\n        reject: t,\n        resolve: t,\n\n        join: t,\n        isPassByCopy: t,\n        passByCopy: t,\n        makeRemote: t,\n        makeFar: t,\n\n        // Temporary compat with the old makeQ.js\n        shorten: t,\n        isPromise: t,\n        async: t,\n        rejected: t,\n        promise: t,\n        delay: t,\n        memoize: t,\n        defer: t,\n      },\n\n      // 26 Reflection\n\n      Reflect: {\n        // 26.1\n        apply: t,\n        construct: t,\n        defineProperty: t,\n        deleteProperty: t,\n        get: t,\n        getOwnPropertyDescriptor: t,\n        getPrototypeOf: t,\n        has: t,\n        isExtensible: t,\n        ownKeys: t,\n        preventExtensions: t,\n        set: t,\n        setPrototypeOf: t,\n      },\n\n      Proxy: {\n        // 26.2\n        revocable: t,\n      },\n\n      // Appendix B\n\n      // B.2.1\n      escape: t,\n      unescape: t,\n\n      // B.2.5 (RegExp.prototype.compile) is marked 'false' up in 21.2\n\n      // Other\n\n      StringMap: {\n        // A specialized approximation of ES-Harmony's Map.\n        prototype: {}, // Technically, the methods should be on the prototype,\n        // but doing so while preserving encapsulation will be\n        // needlessly expensive for current usage.\n      },\n\n      Realm: {\n        makeRootRealm: t,\n        makeCompartment: t,\n        prototype: {\n          global: 'maybeAccessor',\n          evaluate: t,\n        },\n      },\n\n      SES: {\n        confine: t,\n        confineExpr: t,\n        harden: t,\n      },\n\n      Nat: j,\n      def: j,\n    },\n  };\n\n  function makeConsole(parentConsole) {\n    /* 'parentConsole' is the parent Realm's original 'console' object. We must\n       wrap it, exposing a 'console' with a 'console.log' (and perhaps others)\n       to the local realm, without allowing access to the original 'console',\n       its return values, or its exception objects, any of which could be used\n       to break confinement via the unsafe Function constructor. */\n\n    // callAndWrapError is copied from proposal-realms/shim/src/realmFacade.js\n    // Like Realm.apply except that it catches anything thrown and rethrows it\n    // as an Error from this realm\n\n    const errorConstructors = new Map([\n      ['EvalError', EvalError],\n      ['RangeError', RangeError],\n      ['ReferenceError', ReferenceError],\n      ['SyntaxError', SyntaxError],\n      ['TypeError', TypeError],\n      ['URIError', URIError],\n    ]);\n\n    function callAndWrapError(target, ...args) {\n      try {\n        return target(...args);\n      } catch (err) {\n        if (Object(err) !== err) {\n          // err is a primitive value, which is safe to rethrow\n          throw err;\n        }\n        let eName;\n        let eMessage;\n        let eStack;\n        try {\n          // The child environment might seek to use 'err' to reach the\n          // parent's intrinsics and corrupt them. `${err.name}` will cause\n          // string coercion of 'err.name'. If err.name is an object (probably\n          // a String of the parent Realm), the coercion uses\n          // err.name.toString(), which is under the control of the parent. If\n          // err.name were a primitive (e.g. a number), it would use\n          // Number.toString(err.name), using the child's version of Number\n          // (which the child could modify to capture its argument for later\n          // use), however primitives don't have properties like .prototype so\n          // they aren't useful for an attack.\n          eName = `${err.name}`;\n          eMessage = `${err.message}`;\n          eStack = `${err.stack || eMessage}`;\n          // eName/eMessage/eStack are now child-realm primitive strings, and\n          // safe to expose\n        } catch (ignored) {\n          // if err.name.toString() throws, keep the (parent realm) Error away\n          // from the child\n          throw new Error('unknown error');\n        }\n        const ErrorConstructor = errorConstructors.get(eName) || Error;\n        try {\n          throw new ErrorConstructor(eMessage);\n        } catch (err2) {\n          err2.stack = eStack; // replace with the captured inner stack\n          throw err2;\n        }\n      }\n    }\n\n    const newConsole = {};\n    const passThrough = [\n      'log',\n      'info',\n      'warn',\n      'error',\n      'group',\n      'groupEnd',\n      'trace',\n      'time',\n      'timeLog',\n      'timeEnd',\n    ];\n    // TODO: those are the properties that MDN documents. Node.js has a bunch\n    // of additional ones that I didn't include, which might be appropriate.\n\n    passThrough.forEach(name => {\n      // TODO: do we reveal the presence/absence of these properties to the\n      // child realm, thus exposing nondeterminism (and a hint of what platform\n      // you might be on) when it is constructed with {consoleMode: allow} ? Or\n      // should we expose the same set all the time, but silently ignore calls\n      // to the missing ones, to hide that variation? We might even consider\n      // adding console.* to the child realm all the time, even without\n      // consoleMode:allow, but ignore the calls unless the mode is enabled.\n      if (name in parentConsole) {\n        const orig = parentConsole[name];\n        // TODO: in a stack trace, this appears as\n        // \"Object.newConsole.(anonymous function) [as trace]\"\n        // can we make that \"newConsole.trace\" ?\n        newConsole[name] = function newerConsole(...args) {\n          callAndWrapError(orig, ...args);\n        };\n      }\n    });\n\n    return newConsole;\n  }\n\n  function makeMakeRequire(r, harden) {\n    function makeRequire(config) {\n      const cache = new Map();\n\n      function build(what) {\n        // This approach denies callers the ability to use inheritance to\n        // manage their config objects, but a simple \"if (what in config)\"\n        // predicate would also be truthy for e.g. \"toString\" and other\n        // properties of Object.prototype, and require('toString') should be\n        // legal if and only if the config object included an own-property\n        // named 'toString'. Incidentally, this could have been\n        // \"config.hasOwnProperty(what)\" but eslint complained.\n        if (!Object.prototype.hasOwnProperty.call(config, what)) {\n          throw new Error(`Cannot find module '${what}'`);\n        }\n        const c = config[what];\n\n        // some modules are hard-coded ways to access functionality that SES\n        // provides directly\n        if (what === '@agoric/harden') {\n          return harden;\n        }\n\n        // If the config points at a simple function, it must be a pure\n        // function with no dependencies (i.e. no 'require' or 'import', no\n        // calls to other functions defined in the same file but outside the\n        // function body). We stringify it and evaluate it inside this realm.\n        if (typeof c === 'function') {\n          return r.evaluate(`(${c})`);\n        }\n\n        // else we treat it as an object with an 'attenuatorSource' property\n        // that defines an attenuator function, which we evaluate. We then\n        // invoke it with the config object, which can contain authorities that\n        // it can wrap. The return value from this invocation is the module\n        // object that gets returned from require(). The attenuator function\n        // and the module it returns are in-realm, the authorities it wraps\n        // will be out-of-realm.\n        const src = `(${c.attenuatorSource})`;\n        const attenuator = r.evaluate(src);\n        return attenuator(c);\n      }\n\n      function newRequire(whatArg) {\n        const what = `${whatArg}`;\n        if (!cache.has(what)) {\n          cache.set(what, harden(build(what)));\n        }\n        return cache.get(what);\n      }\n\n      return newRequire;\n    }\n\n    return makeRequire;\n  }\n\n  /**\n   * @fileoverview Exports {@code ses.dataPropertiesToRepair}, a recursively\n   * defined JSON record enumerating the optimal set of prototype properties\n   * on primordials that need to be repaired before hardening.\n   *\n   * //provides ses.dataPropertiesToRepair\n   * @author JF Paradis\n   */\n\n  /**\n   * <p>The optimal set of prototype properties that need to be repaired\n   * before hardening is applied on enviromments subject to the override\n   * mistake.\n   *\n   * <p>Because \"repairing\" replaces data properties with accessors, every\n   * time a repaired property is accessed, the associated getter is invoked,\n   * which degrades the runtime performance of all code executing in the\n   * repaired enviromment, compared to the non-repaired case. In order\n   * to maintain performance, we only repair the properties of objects\n   * for which hardening causes a breakage of their intended usage. There\n   * are three cases:\n   * <ul>Overriding properties on objects typically used as maps,\n   *     namely {@code \"Object\"} and {@code \"Array\"}. In the case of arrays,\n   *     a given program might not be aware that non-numerical properties are\n   *     stored on the undelying object instance, not on the array. When an\n   *     object is typically used as a map, we repair all of its prototype\n   *     properties.\n   * <ul>Overriding properties on objects that provide defaults on their\n   *     prototype that programs typically override by assignment, such as\n   *     {@code \"Error.prototype.message\"} and {@code \"Function.prototype.name\"}\n   *     (both default to \"\").\n   * <ul>Setting a prototype chain. The constructor is typically set by\n   *     assignment, for example {@code \"Child.prototype.constructor = Child\"}.\n   *\n   * <p>Each JSON record enumerates the disposition of the properties on\n   * some corresponding primordial object, with the root record containing:\n   * <ul>\n   * <li>The record for the global object.\n   * <li>The record for the anonymous intrinsics.\n   * </ul>\n   *\n   * <p>For each such record, the values associated with its property\n   * names can be:\n   * <ul>\n   * <li>Another record, in which case this property is simply left\n   *     unrepaired and that next record represents the disposition of\n   *     the object which is its value. For example, {@code \"Object\"}\n   *     leads to another record explaining what properties {@code\n   *     \"Object\"} may have and how each such property, if present,\n   *     and its value should be repaired.\n   * <li>true, in which case this property is simply repaired. The\n   *     value associated with that property is not traversed. For\n   * \t   example, {@code \"Function.prototype.name\"} leads to true,\n   *     meaning that the {@code \"name\"} property of {@code\n   *     \"Function.prototype\"} should be repaired (which is needed\n   *     when inheriting from @code{Function} and setting the subclass's\n   *     {@code \"prototype.name\"} property). If the property is\n   *     already an accessor property, it is not repaired (because\n   *     accessors are not subject to the override mistake).\n   * <li>\"*\", all properties on this object are repaired.\n   * <li>falsey, in which case this property is skipped.\n   * </ul>\n   *\n   * <p>We factor out {@code true} into the variable {@code t} just to\n   * get a bit better compression from simple minifiers.\n   */\n\n  const t$1 = true;\n\n  var dataPropertiesToRepair = {\n    namedIntrinsics: {\n      Object: {\n        prototype: '*',\n      },\n\n      Array: {\n        prototype: '*',\n      },\n\n      Function: {\n        prototype: {\n          constructor: t$1, // set by \"regenerator-runtime\"\n          bind: t$1, // set by \"underscore\"\n          name: t$1,\n          toString: t$1,\n        },\n      },\n\n      Error: {\n        prototype: {\n          constructor: t$1, // set by \"fast-json-patch\"\n          message: t$1,\n          name: t$1, // set by \"precond\"\n          toString: t$1, // set by \"bluebird\"\n        },\n      },\n\n      Promise: {\n        prototype: {\n          constructor: t$1, // set by \"core-js\"\n        },\n      },\n    },\n\n    anonIntrinsics: {\n      TypedArray: {\n        prototype: '*',\n      },\n\n      GeneratorFunction: {\n        prototype: {\n          constructor: t$1,\n          name: t$1,\n          toString: t$1,\n        },\n      },\n\n      AsyncFunction: {\n        prototype: {\n          constructor: t$1,\n          name: t$1,\n          toString: t$1,\n        },\n      },\n\n      AsyncGeneratorFunction: {\n        prototype: {\n          constructor: t$1,\n          name: t$1,\n          toString: t$1,\n        },\n      },\n\n      IteratorPrototype: '*',\n    },\n  };\n\n  // Adapted from SES/Caja\n  // Copyright (C) 2011 Google Inc.\n  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/startSES.js\n  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/repairES5.js\n\n  function repairDataProperties(intrinsics, repairPlan) {\n    // Object.defineProperty is allowed to fail silently,\n    // use Object.defineProperties instead.\n\n    const {\n      defineProperties,\n      getOwnPropertyDescriptor,\n      getOwnPropertyDescriptors,\n      prototype: { hasOwnProperty },\n    } = Object;\n\n    const { ownKeys } = Reflect;\n\n    /**\n     * For a special set of properties (defined in the repairPlan), it ensures\n     * that the effect of freezing does not suppress the ability to override\n     * these properties on derived objects by simple assignment.\n     *\n     * Because of lack of sufficient foresight at the time, ES5 unfortunately\n     * specified that a simple assignment to a non-existent property must fail if\n     * it would override a non-writable data property of the same name. (In\n     * retrospect, this was a mistake, but it is now too late and we must live\n     * with the consequences.) As a result, simply freezing an object to make it\n     * tamper proof has the unfortunate side effect of breaking previously correct\n     * code that is considered to have followed JS best practices, if this\n     * previous code used assignment to override.\n     */\n    function enableDerivedOverride(obj, prop, desc) {\n      if ('value' in desc && desc.configurable) {\n        const { value } = desc;\n\n        // eslint-disable-next-line no-inner-declarations\n        function getter() {\n          return value;\n        }\n\n        // Re-attach the data property on the object so\n        // it can be found by the deep-freeze traversal process.\n        getter.value = value;\n\n        // eslint-disable-next-line no-inner-declarations\n        function setter(newValue) {\n          if (obj === this) {\n            throw new TypeError(\n              `Cannot assign to read only property '${prop}' of object '${obj}'`,\n            );\n          }\n          if (hasOwnProperty.call(this, prop)) {\n            this[prop] = newValue;\n          } else {\n            defineProperties(this, {\n              [prop]: {\n                value: newValue,\n                writable: true,\n                enumerable: desc.enumerable,\n                configurable: desc.configurable,\n              },\n            });\n          }\n        }\n\n        defineProperties(obj, {\n          [prop]: {\n            get: getter,\n            set: setter,\n            enumerable: desc.enumerable,\n            configurable: desc.configurable,\n          },\n        });\n      }\n    }\n\n    function repairOneProperty(obj, prop) {\n      if (!obj) {\n        return;\n      }\n      const desc = getOwnPropertyDescriptor(obj, prop);\n      if (!desc) {\n        return;\n      }\n      enableDerivedOverride(obj, prop, desc);\n    }\n\n    function repairAllProperties(obj) {\n      if (!obj) {\n        return;\n      }\n      const descs = getOwnPropertyDescriptors(obj);\n      if (!descs) {\n        return;\n      }\n      ownKeys(descs).forEach(prop =>\n        enableDerivedOverride(obj, prop, descs[prop]),\n      );\n    }\n\n    function walkRepairPlan(obj, plan) {\n      if (!obj) {\n        return;\n      }\n      if (!plan) {\n        return;\n      }\n      ownKeys(plan).forEach(prop => {\n        const subPlan = plan[prop];\n        const subObj = obj[prop];\n        switch (subPlan) {\n          case true:\n            repairOneProperty(obj, prop);\n            break;\n\n          case '*':\n            repairAllProperties(subObj);\n            break;\n\n          default:\n            if (Object(subPlan) !== subPlan) {\n              throw TypeError(`Repair plan subPlan ${subPlan} is invalid`);\n            }\n            walkRepairPlan(subObj, subPlan);\n        }\n      });\n    }\n\n    // Do the repair.\n    walkRepairPlan(intrinsics, repairPlan);\n  }\n\n  // Copyright (C) 2018 Agoric\n\n  const FORWARDED_REALMS_OPTIONS = ['transforms'];\n\n  function createSESWithRealmConstructor(creatorStrings, Realm) {\n    function makeSESRootRealm(options) {\n      // eslint-disable-next-line no-param-reassign\n      options = Object(options); // Todo: sanitize\n      const shims = [];\n\n      const {\n        dataPropertiesToRepair: optDataPropertiesToRepair,\n        shims: optionalShims,\n        sloppyGlobals,\n        whitelist: optWhitelist,\n        ...optionsRest\n      } = options;\n\n      const wl = JSON.parse(JSON.stringify(optWhitelist || whitelist));\n      const repairPlan =\n        optDataPropertiesToRepair !== undefined\n          ? JSON.parse(JSON.stringify(optDataPropertiesToRepair))\n          : dataPropertiesToRepair;\n\n      // Forward the designated Realms options.\n      const realmsOptions = {};\n      FORWARDED_REALMS_OPTIONS.forEach(key => {\n        if (key in optionsRest) {\n          realmsOptions[key] = optionsRest[key];\n        }\n      });\n\n      if (sloppyGlobals) {\n        throw TypeError(`\\\nsloppyGlobals cannot be specified for makeSESRootRealm!\nYou probably want a Compartment instead, like:\n  const c = s.global.Realm.makeCompartment({ sloppyGlobals: true })`);\n      }\n\n      // \"allow\" enables real Date.now(), anything else gets NaN\n      // (it'd be nice to allow a fixed numeric value, but too hard to\n      // implement right now)\n      if (options.dateNowMode !== 'allow') {\n        shims.push(`(${tameDate})();`);\n      }\n\n      if (options.mathRandomMode !== 'allow') {\n        shims.push(`(${tameMath})();`);\n      }\n\n      // Intl is disabled entirely for now, deleted by removeProperties. If we\n      // want to bring it back (under the control of this option), we'll need\n      // to add it to the whitelist too, as well as taming it properly.\n      if (options.intlMode !== 'allow') {\n        // this shim also disables Object.prototype.toLocaleString\n        shims.push(`(${tameIntl})();`);\n      }\n\n      if (options.errorStackMode !== 'allow') {\n        shims.push(`(${tameError})();`);\n      } else {\n        // if removeProperties cleans these things from Error, v8 won't provide\n        // stack traces or even toString on exceptions, and then Node.js prints\n        // uncaught exceptions as \"undefined\" instead of a type/message/stack.\n        // So if we're allowing stack traces, make sure the whitelist is\n        // augmented to include them.\n        wl.namedIntrinsics.Error.captureStackTrace = true;\n        wl.namedIntrinsics.Error.stackTraceLimit = true;\n        wl.namedIntrinsics.Error.prepareStackTrace = true;\n      }\n\n      if (options.regexpMode !== 'allow') {\n        shims.push(`(${tameRegExp})();`);\n      }\n\n      // The getAnonIntrinsics function might be renamed by e.g. rollup. The\n      // removeProperties() function references it by name, so we need to force\n      // it to have a specific name.\n      const removeProp = `const getAnonIntrinsics = (${getAnonIntrinsics$1});\n               (${removeProperties})(this, ${JSON.stringify(wl)})`;\n      shims.push(removeProp);\n\n      // Add options.shims.\n      if (optionalShims) {\n        shims.push(...optionalShims);\n      }\n\n      const r = Realm.makeRootRealm({ ...realmsOptions, shims });\n\n      // Build a harden() with an empty fringe. It will be populated later when\n      // we call harden(allIntrinsics).\n      const makeHardenerSrc = `(${makeHardener})`;\n      const harden = r.evaluate(makeHardenerSrc)();\n\n      const b = r.evaluate(creatorStrings);\n      b.createSESInThisRealm(r.global, creatorStrings, r);\n\n      // Allow harden to be accessible via the SES global.\n      r.global.SES.harden = harden;\n\n      if (options.consoleMode === 'allow') {\n        const s = `(${makeConsole})`;\n        r.global.console = r.evaluate(s)(console);\n      }\n\n      // Extract the intrinsics from the global.\n      const anonIntrinsics = r.evaluate(`(${getAnonIntrinsics$1})`)(r.global);\n      const namedIntrinsics = r.evaluate(`(${getNamedIntrinsics})`)(\n        r.global,\n        whitelist,\n      );\n\n      // Gather the intrinsics only.\n      const allIntrinsics = r.evaluate(`(${getAllPrimordials$1})`)(\n        namedIntrinsics,\n        anonIntrinsics,\n      );\n\n      // Gather the primordials and the globals.\n      const allPrimordials = r.evaluate(`(${getAllPrimordials})`)(\n        r.global,\n        anonIntrinsics,\n      );\n\n      // Repair the override mistake on the intrinsics only.\n      r.evaluate(`(${repairDataProperties})`)(allIntrinsics, repairPlan);\n\n      // Finally freeze all the primordials, and the global object. This must\n      // be the last thing we do that modifies the Realm's globals.\n      harden(allPrimordials);\n\n      // build the makeRequire helper, glue it to the new Realm\n      r.makeRequire = harden(r.evaluate(`(${makeMakeRequire})`)(r, harden));\n      return r;\n    }\n    const SES = {\n      makeSESRootRealm,\n    };\n\n    return SES;\n  }\n\n  function createSESInThisRealm(global, creatorStrings, parentRealm) {\n    // eslint-disable-next-line no-param-reassign,no-undef\n    global.SES = createSESWithRealmConstructor(creatorStrings, Realm);\n    // todo: wrap exceptions, effectively undoing the wrapping that\n    // Realm.evaluate does\n\n    const errorConstructors = new Map([\n      ['EvalError', EvalError],\n      ['RangeError', RangeError],\n      ['ReferenceError', ReferenceError],\n      ['SyntaxError', SyntaxError],\n      ['TypeError', TypeError],\n      ['URIError', URIError],\n    ]);\n\n    // callAndWrapError is copied from the Realm shim. Our SES.confine (from\n    // inside the realm) delegates to Realm.evaluate (from outside the realm),\n    // but we need the exceptions to come from our own realm, so we use this to\n    // reverse the shim's own callAndWrapError. TODO: look for a reasonable way\n    // to avoid the double-wrapping, maybe by changing the shim/Realms-spec to\n    // provide the safeEvaluator as a Realm.evaluate method (inside a realm).\n    // That would make this trivial: global.SES = Realm.evaluate (modulo\n    // potential 'this' issues)\n\n    // the comments here were written from the POV of a parent defending itself\n    // against a malicious child realm. In this case, we are the child.\n\n    function callAndWrapError(target, ...args) {\n      try {\n        return target(...args);\n      } catch (err) {\n        if (Object(err) !== err) {\n          // err is a primitive value, which is safe to rethrow\n          throw err;\n        }\n        let eName;\n        let eMessage;\n        let eStack;\n        try {\n          // The child environment might seek to use 'err' to reach the\n          // parent's intrinsics and corrupt them. `${err.name}` will cause\n          // string coercion of 'err.name'. If err.name is an object (probably\n          // a String of the parent Realm), the coercion uses\n          // err.name.toString(), which is under the control of the parent. If\n          // err.name were a primitive (e.g. a number), it would use\n          // Number.toString(err.name), using the child's version of Number\n          // (which the child could modify to capture its argument for later\n          // use), however primitives don't have properties like .prototype so\n          // they aren't useful for an attack.\n          eName = `${err.name}`;\n          eMessage = `${err.message}`;\n          eStack = `${err.stack || eMessage}`;\n          // eName/eMessage/eStack are now child-realm primitive strings, and\n          // safe to expose\n        } catch (ignored) {\n          // if err.name.toString() throws, keep the (parent realm) Error away\n          // from the child\n          throw new Error('unknown error');\n        }\n        const ErrorConstructor = errorConstructors.get(eName) || Error;\n        try {\n          throw new ErrorConstructor(eMessage);\n        } catch (err2) {\n          err2.stack = eStack; // replace with the captured inner stack\n          throw err2;\n        }\n      }\n    }\n\n    // We must not allow other child code to access that object. SES.confine\n    // closes over the parent's Realm object so it shouldn't be accessible from\n    // the outside.\n\n    // eslint-disable-next-line no-param-reassign\n    global.SES.confine = (code, endowments) =>\n      callAndWrapError(() => parentRealm.evaluate(code, endowments));\n    // eslint-disable-next-line no-param-reassign\n    global.SES.confineExpr = (code, endowments) =>\n      callAndWrapError(() => parentRealm.evaluate(`(${code})`, endowments));\n  }\n\n  exports.createSESInThisRealm = createSESInThisRealm;\n  exports.createSESWithRealmConstructor = createSESWithRealmConstructor;\n\n  return exports;\n\n}({}))";

  // Copyright (C) 2018 Agoric

  const SES = createSESWithRealmConstructor(creatorStrings, Realm);

  return SES;

}));

// END of injected code from ses
  })()
  return module.exports
})()

  const realm = SES.makeSESRootRealm({
    mathRandomMode: 'allow',
    errorStackMode: 'allow',
  })

  return loadBundle


  // this performs an unsafeEval in the context of the provided endowments
  function unsafeEvalWithEndowments(code, endowments) {
    with (endowments) {
      return eval(code)
    }
  }

  // this function is returned from the top level closure
  // it is called by the modules collection that will be appended to this file
  function loadBundle (modules, _, entryPoints) {
    const globalRef = (typeof self !== 'undefined') ? self : global
    // create SES-wrapped internalRequire
    const makeInternalRequire = realm.evaluate(`(${unsafeMakeInternalRequire})`, { console })
    const internalRequire = makeInternalRequire({
      modules,
      realm,
      unsafeEvalWithEndowments,
      globalRef,
    })
    // run each of entryPoints (ignores any exports of entryPoints)
    for (let entryId of entryPoints) {
      internalRequire(entryId)
    }
  }

  // this is serialized and run in SES
  // mostly just exists to expose variables to internalRequire
  function unsafeMakeInternalRequire ({
    modules,
    realm,
    unsafeEvalWithEndowments,
    globalRef,
  }) {
    // "templateRequire" calls are inlined in "generatePrelude"
    const { getEndowmentsForConfig } = // define makeGetEndowmentsForConfig
(function(){
  const exports = {}
  const module = { exports }
  ;(function(){
// START of injected code from makeGetEndowmentsForConfig
// the contents of this file will be copied into the prelude template
// this module has been written so that it required directly or copied and added to the template with a small wrapper
module.exports = makeGetEndowmentsForConfig

// utilities for generating the endowments object based on a globalRef and a config

// The config uses a period-deliminated path notation to pull out deep values from objects
// These utilities help create an object populated with only the deep properties specified in the config

function makeGetEndowmentsForConfig () {

  return {
    getEndowmentsForConfig,
    deepGetAndBind,
    deepGet,
    deepDefine,
  }

  function getEndowmentsForConfig (globalRef, config) {
    if (!config.globals) return {}
    const endowments = {}
    Object.entries(config.globals).forEach(([globalPath, configValue]) => {
      // write access handled elsewhere
      if (configValue === 'write') return
      if (configValue !== true) {
        throw new Error('LavaMoat - unknown value for config globals')
      }
      const value = deepGetAndBind(globalRef, globalPath)
      if (value === undefined) return
      // TODO: actually match prop descriptor
      const propDesc = {
        value,
        configurable: true,
        writable: true,
        enumerable: true,
      }
      deepDefine(endowments, globalPath, propDesc)
    })
    return endowments
  }

  function deepGetAndBind(globalRef, pathName) {
    const pathParts = pathName.split('.')
    const parentPath = pathParts.slice(0,-1).join('.')
    const childKey = pathParts[pathParts.length-1]
    const parent = parentPath ? deepGet(globalRef, parentPath) : globalRef
    if (!parent) return parent
    const value = parent[childKey]
    if (typeof value === 'function') {
      // bind and copy
      const newValue = value.bind(parent)
      Object.defineProperties(newValue, Object.getOwnPropertyDescriptors(value))
      return newValue
    } else {
      // return as is
      return value
    }
  }

  function deepGet (obj, pathName) {
    let result = obj
    pathName.split('.').forEach(pathPart => {
      if (result === null) {
        result = undefined
        return
      }
      if (result === undefined) {
        return
      }
      result = result[pathPart]
    })
    return result
  }

  function deepDefine (obj, pathName, propDesc) {
    let parent = obj
    const pathParts = pathName.split('.')
    const lastPathPart = pathParts[pathParts.length-1]
    const allButLastPart = pathParts.slice(0,-1)
    allButLastPart.forEach(pathPart => {
      const prevParent = parent
      parent = parent[pathPart]
      if (parent === null) {
        throw new Error('DeepSet - unable to set "'+pathName+'" on null')
      }
      if (parent === undefined) {
        parent = {}
        prevParent[pathPart] = parent
      }
    })
    Object.defineProperty(parent, lastPathPart, propDesc)
  }

}
// END of injected code from makeGetEndowmentsForConfig
  })()
  return module.exports
})()()
    const { prepareRealmGlobalFromConfig } = // define makePrepareRealmGlobalFromConfig
(function(){
  const exports = {}
  const module = { exports }
  ;(function(){
// START of injected code from makePrepareRealmGlobalFromConfig
// the contents of this file will be copied into the prelude template
// this module has been written so that it required directly or copied and added to the template with a small wrapper
module.exports = makePrepareRealmGlobalFromConfig

// utilities for exposing configuring the exposed endowments on the container global

// The config uses a period-deliminated path notation to pull out deep values from objects
// These utilities help modify the container global to expose the allowed globals from the globalStore OR the platform global

function makePrepareRealmGlobalFromConfig () {

  return {
    prepareRealmGlobalFromConfig,
    getTopLevelReadAccessFromPackageConfig,
    getTopLevelWriteAccessFromPackageConfig,
  }

  function getTopLevelReadAccessFromPackageConfig (globalsConfig) {
    const result = Object.entries(globalsConfig)
      .filter(([key, value]) => value === 'read' || value === true || (value === 'write' && key.split('.').length > 1))
      .map(([key]) => key.split('.')[0])
    // return unique array
    return Array.from(new Set(result))
  }

  function getTopLevelWriteAccessFromPackageConfig (globalsConfig) {
    const result = Object.entries(globalsConfig)
      .filter(([key, value]) => value === 'write' && key.split('.').length === 1)
      .map(([key]) => key)
    return result
  }

  function prepareRealmGlobalFromConfig (moduleRealmGlobal, globalsConfig, endowments, globalStore) {
    // lookup top level read + write access keys
    const topLevelWriteAccessKeys = getTopLevelWriteAccessFromPackageConfig(globalsConfig)
    const topLevelReadAccessKeys = getTopLevelReadAccessFromPackageConfig(globalsConfig)
    const globalThisRefs = ['self', 'window', 'globalThis', 'global']

    // define accessors

    // allow read access via globalStore or moduleRealmGlobal
    topLevelReadAccessKeys.forEach(key => {
      Object.defineProperty(moduleRealmGlobal, key, {
        get () {
          if (globalStore.has(key)) {
            return globalStore.get(key)
          } else {
            return endowments[key]
          }
        },
        set () {
          // TODO: there should be a config to throw vs silently ignore
          console.warn(`LavaMoat: ignoring write attempt to read-access global "${key}"`)
        }
      })
    })

    // allow write access to globalStore
    // read access via globalStore or moduleRealmGlobal
    topLevelWriteAccessKeys.forEach(key => {
      Object.defineProperty(moduleRealmGlobal, key, {
        get () {
          if (globalStore.has(key)) {
            return globalStore.get(key)
          } else {
            return endowments[key]
          }
        },
        set (value) {
          globalStore.set(key, value)
        },
        enumerable: true,
        configurable: true,
      })
    })

    // set circular globalRefs
    globalThisRefs.forEach(key => {
      // if globalRef is actually an endowment, ignore
      if (topLevelReadAccessKeys.includes(key)) return
      if (topLevelWriteAccessKeys.includes(key)) return
      // set circular ref to global
      moduleRealmGlobal[key] = moduleRealmGlobal
    })
    // support certain globalThis getters
    const origFunction = moduleRealmGlobal.Function
    const newFunction = (src) => {
      return origFunction(src).bind(moduleRealmGlobal)
    }
    Object.defineProperties(newFunction, Object.getOwnPropertyDescriptors(origFunction))
    moduleRealmGlobal.Function = newFunction
  }

}
// END of injected code from makePrepareRealmGlobalFromConfig
  })()
  return module.exports
})()()
    const { Membrane } = // define cytoplasm
(function(){
  const exports = {}
  const module = { exports }
  ;(function(){
// START of injected code from cytoplasm
// theres some things we may need to enforce differently when in and out of strict mode
// e.g. fn.arguments
"use strict"

class ObjectGraph {
  constructor ({ label, createHandler }) {
    this.rawToBridged = new WeakMap()
    this.handlerForRef = new WeakMap()
    this.label = label
    this.createHandler = createHandler || (() => Reflect)
  }

  getHandlerForRef (rawRef) {
    if (this.handlerForRef.has(rawRef)) {
      return this.handlerForRef.get(rawRef)
    }
    const handler = this.createHandler({
      setHandlerForRef: (ref, newHandler) => this.handlerForRef.set(ref, newHandler)
    })
    this.handlerForRef.set(rawRef, handler)
    return handler
  }
}

class Membrane {
  constructor () {
    this.primordials = [Object, Object.prototype]
    this.bridgedToRaw = new WeakMap()
    this.rawToOrigin = new WeakMap()
  }
  makeObjectGraph ({ label, createHandler }) {
    return new ObjectGraph({ label, createHandler })
  }
  // if rawObj is not part of inGraph, should we explode?
  bridge (inRef, inGraph, outGraph) {
    // skip if should be passed directly (danger)
    if (this.shouldSkipBridge(inRef)) {
      // console.log(`membrane.bridge should skip in:${inGraph.label} -> out:${outGraph.label}`)
      return inRef
    }
    // unwrap ref if bridged to "in"
    let rawRef
    if (this.bridgedToRaw.has(inRef)) {
      rawRef = this.bridgedToRaw.get(inRef)
      const origin = this.rawToOrigin.get(rawRef)
      // console.log('rawToOrigin get', origin)
      // if this ref originates in the outGraph, return raw!
      if (origin === outGraph) {
        // console.log(`membrane.bridge inRef known headed home in:${inGraph.label} -> out:${outGraph.label}`)
        return rawRef
      }
      // console.log(`membrane.bridge inRef known origin:${origin.label} in:${inGraph.label} -> out:${outGraph.label}`)
      // set the raw ref so it can be wrapped for outGraph
    } else {
      // console.log(`inRef is proxy`, !!inRef._isProxy, '<---')
      if (this.rawToOrigin.has(rawRef)) {
        throw new Error('something broke')
      }

      // console.log(`membrane.bridge inRef new ref (${typeof inRef}) in:${inGraph.label} -> out:${outGraph.label}`)
      // we've never seen this ref before - must be raw and from inGraph
      rawRef = inRef
      // console.log('rawToOrigin set', inGraph.label)
      this.rawToOrigin.set(rawRef, inGraph)
    }
    // if outGraph already has bridged iterface for rawRef, use it
    // check if cache available
    if (outGraph.rawToBridged.has(rawRef)) {
      // console.log(`membrane.bridge cache hit in:${inGraph.label} -> out:${outGraph.label}`)
      return outGraph.rawToBridged.get(rawRef)
    }

    const originGraph = this.rawToOrigin.get(rawRef)
    const proxyTarget = getProxyTargetForValue(rawRef)
    const distortionHandler = originGraph.getHandlerForRef(rawRef)
    const membraneProxyHandler = createMembraneProxyHandler(distortionHandler, rawRef, originGraph, outGraph, this.bridge.bind(this))
    const proxyHandler = respectProxyInvariants(proxyTarget, membraneProxyHandler)
    const bridgedRef = new Proxy(proxyTarget, proxyHandler)
    // cache both ways
    outGraph.rawToBridged.set(rawRef, bridgedRef)
    this.bridgedToRaw.set(bridgedRef, rawRef)
    if (!this.rawToOrigin.has(rawRef)) {
      throw new Error('something broke')
    }
    // all done
    return bridgedRef
  }

  shouldSkipBridge (value) {
    // skip if a simple value
    if (Object(value) !== value) return true
    // skip if primodial
    if (this.primordials.includes(value)) return true
    // otherwise we cant skip it
    return false
  }
}

// handler stack

// ProxyInvariantHandler calls next() <-- needs to have final say
//   MembraneHandler calls next() <-- needs to see distortion result
//     LocalWritesHandler sets behavior


// currently creating handler per-object
// perf: create only once?
//   better to create one each time with rawRef bound?
//   or find a way to map target to rawRef
function createMembraneProxyHandler (prevProxyHandler, rawRef, inGraph, outGraph, bridge) {
  const proxyHandler = {
    getPrototypeOf: createHandlerFn(prevProxyHandler.getPrototypeOf, rawRef, inGraph, outGraph, bridge),
    setPrototypeOf: createHandlerFn(prevProxyHandler.setPrototypeOf, rawRef, inGraph, outGraph, bridge),
    isExtensible: createHandlerFn(prevProxyHandler.isExtensible, rawRef, inGraph, outGraph, bridge),
    preventExtensions: createHandlerFn(prevProxyHandler.preventExtensions, rawRef, inGraph, outGraph, bridge),
    getOwnPropertyDescriptor: createHandlerFn(prevProxyHandler.getOwnPropertyDescriptor, rawRef, inGraph, outGraph, bridge),
    defineProperty: createHandlerFn(prevProxyHandler.defineProperty, rawRef, inGraph, outGraph, bridge),
    has: createHandlerFn(prevProxyHandler.has, rawRef, inGraph, outGraph, bridge),
    get: createHandlerFn(prevProxyHandler.get, rawRef, inGraph, outGraph, bridge),
    set: createHandlerFn(prevProxyHandler.set, rawRef, inGraph, outGraph, bridge),
    deleteProperty: createHandlerFn(prevProxyHandler.deleteProperty, rawRef, inGraph, outGraph, bridge),
    ownKeys: createHandlerFn(prevProxyHandler.ownKeys, rawRef, inGraph, outGraph, bridge),
    apply: createHandlerFn(prevProxyHandler.apply, rawRef, inGraph, outGraph, bridge),
    construct: createHandlerFn(prevProxyHandler.construct, rawRef, inGraph, outGraph, bridge),
  }
  return proxyHandler
}

// TODO ensure we're enforcing all proxy invariants
function respectProxyInvariants (proxyTarget, rawProxyHandler) {
  // the defaults arent needed for the membraneProxyHandler,
  // but might be for an imcomplete proxy handler
  const handlerWithDefaults = Object.assign({}, Reflect, rawProxyHandler)
  const respectfulProxyHandler = Object.assign({}, handlerWithDefaults)
  // add respect
  respectfulProxyHandler.getOwnPropertyDescriptor = (_, key) => {
    // ensure propDesc matches proxy target's non-configurable property
    const propDesc = handlerWithDefaults.getOwnPropertyDescriptor(_, key)
    if (propDesc && !propDesc.configurable) {
      const proxyTargetPropDesc = Reflect.getOwnPropertyDescriptor(proxyTarget, key)
      const proxyTargetPropIsConfigurable = (!proxyTargetPropDesc || proxyTargetPropDesc.configurable)
      // console.warn('@@ getOwnPropertyDescriptor - non configurable', String(key), !!proxyTargetPropIsConfigurable)
      // if proxy target is configurable (and real target is not) update the proxy target to ensure the invariant holds
      if (proxyTargetPropIsConfigurable) {
        Reflect.defineProperty(proxyTarget, key, propDesc)
      }
    }
    return propDesc
  }
  // return modified handler
  return respectfulProxyHandler
}

function createHandlerFn (reflectFn, rawRef, inGraph, outGraph, bridge) {
  return function (_, ...outArgs) {
    const inArgs = outArgs.map(arg => bridge(arg, outGraph, inGraph))
    let value, inErr
    try {
      value = reflectFn(rawRef, ...inArgs)
    } catch (err) {
      inErr = err
    }
    if (inErr !== undefined) {
      const outErr = bridge(inErr, inGraph, outGraph)
      throw outErr
    } else {
      return bridge(value, inGraph, outGraph)
    }
  }
}

// use replacement proxyTarget for flexible distortions less restrained by "Proxy invariant"
// e.g. hide otherwise non-configurable properties
function getProxyTargetForValue (value) {
  if (typeof value === 'function') {
    if (value.prototype) {
      return function(){}
    } else {
      return () => {}
    }
  } else {
    if (Array.isArray(value)) {
      return []
    } else {
      return {}
    }
  }
}

module.exports = { Membrane, ObjectGraph }

// END of injected code from cytoplasm
  })()
  return module.exports
})()
    const createReadOnlyDistortion = // define cytoplasm/distortions/readOnly
(function(){
  const exports = {}
  const module = { exports }
  ;(function(){
// START of injected code from cytoplasm/distortions/readOnly
module.exports = createDistortion

// still allows functions that cause side effects
function createDistortion ({ setHandlerForRef }) {
  return {
    // prevent direct mutability
    setPrototypeOf: () => false,
    preventExtensions: () => false,
    defineProperty: () => false,
    set: (target, key, value, receiver) => {
      //Override mistake workaround
      if (target === receiver) {
        return false
      }

      //Indirect set, redirect to a defineProperty
      return Reflect.defineProperty(receiver, key, {value, enumerable: true, writable: true, configurable: true})
    },
    deleteProperty: () => false,
    // special case: instantiated children should be mutable
    construct: (...args) => {
      // construct child
      const result = Reflect.construct(...args)
      // set child as mutable
      setHandlerForRef(result, Reflect)
      // return constructed child
      return result
    },
    // default behavior
    apply: Reflect.apply,
    get: Reflect.get,
    getOwnPropertyDescriptor: Reflect.getOwnPropertyDescriptor,
    getPrototypeOf: Reflect.getPrototypeOf,
    has: Reflect.has,
    isExtensible: Reflect.isExtensible,
    ownKeys: Reflect.ownKeys,
  }
}
// END of injected code from cytoplasm/distortions/readOnly
  })()
  return module.exports
})()

    const lavamoatConfig = (function(){
  // START of injected code from lavamoatConfig
  return {
  "resources": {
    "<root>": {
      "packages": {
        "secp256k1": true
      }
    },
    "buffer": {
      "globals": {
        "console": true
      },
      "packages": {
        "base64-js": true,
        "ieee754": true
      }
    },
    "safe-buffer": {
      "packages": {
        "buffer": true
      }
    },
    "secp256k1": {
      "packages": {
        "safe-buffer": true
      }
    }
  }
}
  // END of injected code from lavamoatConfig
    })()

    // convert all module source to string
    // this could happen at build time,
    // but shipping it as code makes it easier to debug, maybe
    for (let moduleData of Object.values(modules)) {
      let moduleSource = `(${moduleData.source})`
      if (moduleData.file) {
        const moduleSourceLabel = `// moduleSource: ${moduleData.file}`
        moduleSource += `\n\n${moduleSourceLabel}`
      }
      moduleData.sourceString = moduleSource
    }

    const moduleCache = new Map()
    const globalStore = new Map()
    const membraneSpaceForPackage = new Map()
    const membrane = new Membrane()

    return internalRequire


    // this function instantiaties a module from a moduleId.
    // 1. loads the config for the module
    // 2. instantiates in the config specified environment
    // 3. calls config specified strategy for "protectExportsInstantiationTime"
    function internalRequire (moduleId) {
      if (moduleCache.has(moduleId)) {
        const moduleExports = moduleCache.get(moduleId).exports
        return moduleExports
      }
      const moduleData = modules[moduleId]

      // if we dont have it, throw an error
      if (!moduleData) {
        const err = new Error('Cannot find module \'' + moduleId + '\'')
        err.code = 'MODULE_NOT_FOUND'
        throw err
      }

      // prepare the module to be initialized
      const packageName = moduleData.package
      const moduleSource = moduleData.sourceString
      const configForModule = getConfigForPackage(lavamoatConfig, packageName)
      const isEntryModule = moduleData.package === '<root>'

      // create the initial moduleObj
      let moduleObj = { exports: {} }
      // cache moduleObj here
      moduleCache.set(moduleId, moduleObj)
      // this is important for multi-module circles in the dep graph
      // if you dont cache before running the moduleInitializer

      // prepare endowments
      const endowmentsFromConfig = getEndowmentsForConfig(globalRef, configForModule)
      let endowments = Object.assign({}, lavamoatConfig.defaultGlobals, endowmentsFromConfig)
      // special case for exposing window
      if (endowments.window) {
        endowments = Object.assign({}, endowments.window, endowments)
      }

      // the default environment is "unfrozen" for the app root modules, "frozen" for dependencies
      // this may be a bad default, but was meant to ease app development
      // "frozen" means in a SES container
      // "unfrozen" means via unsafeEvalWithEndowments
      const environment = configForModule.environment || (isEntryModule ? 'unfrozen' : 'frozen')
      const runInSes = environment !== 'unfrozen'

      let moduleInitializer = {}
      // determine if its a SES-wrapped or naked module initialization
      if (runInSes) {
        // set the module initializer as the SES-wrapped version
        const moduleRealm = realm.global.Realm.makeCompartment()
        const globalsConfig = configForModule.globals
        const packageMembraneSpace = getMembraneGraphForPackage(packageName)
        const endowmentsMembraneSpace = getMembraneGraphForPackage('<endowments>')
        const membraneEndowments = membrane.bridge(endowments, endowmentsMembraneSpace, packageMembraneSpace)
        prepareRealmGlobalFromConfig(moduleRealm.global, globalsConfig, membraneEndowments, globalStore)
        // execute in module realm with modified realm global
        try {
          moduleInitializer = moduleRealm.evaluate(`${moduleSource}`)
        } catch (err) {
          console.warn(`LavaMoat - Error evaluating module "${moduleId}" from package "${packageName}"`)
          throw err
        }
      } else {
        endowments.global = globalRef
        // set the module initializer as the unwrapped version
        moduleInitializer = unsafeEvalWithEndowments(`${moduleSource}`, endowments)
      }
      if (typeof moduleInitializer !== 'function') {
        throw new Error('LavaMoat - moduleInitializer is not defined correctly')
      }

      // browserify goop:
      // this "modules" interface is exposed to the browserify moduleInitializer
      // https://github.com/browserify/browser-pack/blob/cd0bd31f8c110e19a80429019b64e887b1a82b2b/prelude.js#L38
      // browserify's browser-resolve uses "arguments[4]" to do direct module initializations
      // browserify seems to do this when module references are redirected by the "browser" field
      // this proxy shims this behavior
      // TODO: would be better to just fix this by removing the indirection (maybe in https://github.com/browserify/module-deps?)
      // though here and in the original browser-pack prelude it has a side effect that it is re-instantiated from the original module (no shared closure state)
      const directModuleInstantiationInterface = new Proxy({}, {
        get (_, targetModuleId) {
          const fakeModuleDefinition = [fakeModuleInitializer]
          return fakeModuleDefinition

          function fakeModuleInitializer () {
            const targetModuleExports = requireRelativeWithContext(targetModuleId)
            moduleObj.exports = targetModuleExports
          }
        }
      })

      // initialize the module with the correct context
      try {
        moduleInitializer.call(moduleObj.exports, requireRelativeWithContext, moduleObj, moduleObj.exports, null, directModuleInstantiationInterface)
      } catch (err) {
        console.warn(`LavaMoat - Error instantiating module "${moduleId}" from package "${packageName}"`)
        throw err
      }

      return moduleObj.exports
      // this is passed to the module initializer
      // it adds the context of the parent module
      // this could be replaced via "Function.prototype.bind" if its more performant
      function requireRelativeWithContext (requestedName) {
        const parentModuleExports = moduleObj.exports
        const parentModuleData = moduleData
        const parentPackageConfig = configForModule
        const parentModuleId = moduleId
        return requireRelative({ requestedName, parentModuleExports, parentModuleData, parentPackageConfig, parentModuleId })
      }

    }

    // this resolves a module given a requestedName (eg relative path to parent) and a parentModule context
    // the exports are processed via "protectExportsRequireTime" per the module's configuration
    function requireRelative ({ requestedName, parentModuleExports, parentModuleData, parentPackageConfig, parentModuleId }) {
      const parentModulePackageName = parentModuleData.package
      const parentModuleDepsMap = parentModuleData.deps
      const parentPackagesWhitelist = parentPackageConfig.packages

      // resolve the moduleId from the requestedName
      // this is just a warning if the entry is missing in the deps map (local requestedName -> global moduleId)
      // if it is missing we try to fetch it anyways using the requestedName as the moduleId
      // The dependency whitelist should still be enforced elsewhere
      const moduleId = parentModuleDepsMap[requestedName] || requestedName
      if (!(requestedName in parentModuleData.deps)) {
        console.warn(`missing dep: ${parentModulePackageName} requested ${requestedName}`)
      }

      // browserify goop:
      // recursive requires dont hit cache so it inf loops, so we shortcircuit
      // this only seems to happen with a few browserify builtins (nodejs builtin module polyfills)
      // we could likely allow any requestedName since it can only refer to itself
      if (moduleId === parentModuleId) {
        if (['timers', 'buffer'].includes(requestedName) === false) {
          throw new Error(`LavaMoat - recursive require detected: "${requestedName}"`)
        }
        return parentModuleExports
      }

      // load module
      const moduleExports = internalRequire(moduleId)

      // look up config for module
      const moduleData = modules[moduleId]
      const packageName = moduleData.package
      const configForModule = getConfigForPackage(lavamoatConfig, packageName)

      // disallow requiring packages that are not in the parent's whitelist
      const isSamePackage = packageName === parentModulePackageName
      const isInParentWhitelist = packageName in parentPackagesWhitelist
      if (!isSamePackage && !isInParentWhitelist) {
        throw new Error(`LavaMoat - required package not in whitelist: package "${parentModulePackageName}" requested "${packageName}" as "${requestedName}"`)
      }

      // moduleExports require-time protection
      if (parentModulePackageName && isSamePackage) {
        // return raw if same package
        return moduleExports
      } else {
        const inGraph = getMembraneGraphForPackage(packageName)
        const outGraph = getMembraneGraphForPackage(parentModulePackageName)
        // set graph of moduleExports to read-only
        deepWalk(moduleExports, (value) => {
          // skip plain values
          if (membrane.shouldSkipBridge(value)) return
          // set this ref to read-only
          inGraph.handlerForRef.set(value, createReadOnlyDistortion({
            setHandlerForRef: (ref, newHandler) => inGraph.handlerForRef.set(ref, newHandler)
          }))
        })

        const protectedExports = membrane.bridge(moduleExports, inGraph, outGraph)
        return protectedExports
      }
    }

    function getMembraneGraphForPackage (packageName) {
      if (membraneSpaceForPackage.has(packageName)) {
        return membraneSpaceForPackage.get(packageName)
      }

      const membraneSpace = membrane.makeObjectGraph({
        label: packageName,
        // default is a transparent membrane handler
        createHandler: () => Reflect,
      })
      membraneSpaceForPackage.set(packageName, membraneSpace)
      return membraneSpace
    }

    function deepWalk (value, visitor) {
      // the value itself
      visitor(value)
      // the own properties
      Object.values(Object.getOwnPropertyDescriptors(value)).map(entry => {
        if ('value' in entry) visitor(entry.value)
      })
      // the prototype
      const proto = Object.getPrototypeOf(value)
      if (proto) visitor(proto)
    }

    // this gets the lavaMoat config for a module by packageName
    // if there were global defaults (e.g. everything gets "console") they could be applied here
    function getConfigForPackage (config, packageName) {
      const packageConfig = (config.resources || {})[packageName] || {}
      packageConfig.globals = packageConfig.globals || {}
      packageConfig.packages = packageConfig.packages || {}
      return packageConfig
    }

    //# sourceURL=internalRequire
  }

})()
({1:{ package: "base64-js", deps: {}, source: (function () {
  /* source: ${sourceMeta.file} */
  return function (require,module,exports) {
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

  }
}).call(this)
},2:{ package: "buffer", deps: {"base64-js":1,"buffer":2,"ieee754":3}, source: (function () {
  /* source: ${sourceMeta.file} */
  return function (require,module,exports) {
(function (Buffer){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var customInspectSymbol =
  (typeof Symbol === 'function' && typeof Symbol.for === 'function')
    ? Symbol.for('nodejs.util.inspect.custom')
    : null

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    var proto = { foo: function () { return 42 } }
    Object.setPrototypeOf(proto, Uint8Array.prototype)
    Object.setPrototypeOf(arr, proto)
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  Object.setPrototypeOf(buf, Buffer.prototype)
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw new TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype)
Object.setPrototypeOf(Buffer, Uint8Array)

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(buf, Buffer.prototype)

  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}
if (customInspectSymbol) {
  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += hexSliceLookupTable[buf[i]]
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(newBuf, Buffer.prototype)

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  } else if (typeof val === 'boolean') {
    val = Number(val)
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

// Create lookup table for `toString('hex')`
// See: https://github.com/feross/buffer/issues/219
var hexSliceLookupTable = (function () {
  var alphabet = '0123456789abcdef'
  var table = new Array(256)
  for (var i = 0; i < 16; ++i) {
    var i16 = i * 16
    for (var j = 0; j < 16; ++j) {
      table[i16 + j] = alphabet[i] + alphabet[j]
    }
  }
  return table
})()

}).call(this,require("buffer").Buffer)
  }
}).call(this)
},3:{ package: "ieee754", deps: {}, source: (function () {
  /* source: ${sourceMeta.file} */
  return function (require,module,exports) {
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

  }
}).call(this)
},4:{ package: "<root>", deps: {"secp256k1/lib/js/bn":6}, source: (function () {
  /* source: ${sourceMeta.file} */
  return function (require,module,exports) {
(function (global){
const BN = require('secp256k1/lib/js/bn')

// use `global.process` so it works correctly under node
const nTimes = Number.parseInt(global.process.env.PERF_N || 5, 10)

Array(nTimes).fill().forEach((_, index) => {

  new BN()

})


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
  }
}).call(this)
},5:{ package: "safe-buffer", deps: {"buffer":2}, source: (function () {
  /* source: ${sourceMeta.file} */
  return function (require,module,exports) {
/* eslint-disable node/no-deprecated-api */
var buffer = require('buffer')
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.prototype = Object.create(Buffer.prototype)

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}

  }
}).call(this)
},6:{ package: "secp256k1", deps: {"./optimized":7,"safe-buffer":5}, source: (function () {
  /* source: ${sourceMeta.file} */
  return function (require,module,exports) {
'use strict'
var Buffer = require('safe-buffer').Buffer
var optimized = require('./optimized')

function BN () {
  this.negative = 0
  this.words = null
  this.length = 0
}

BN.fromNumber = function (n) {
  var bn = new BN()
  bn.words = [n & 0x03ffffff]
  bn.length = 1
  return bn
}

BN.fromBuffer = function (b32) {
  var bn = new BN()

  bn.words = new Array(10)
  bn.words[0] = (b32[28] & 0x03) << 24 | b32[29] << 16 | b32[30] << 8 | b32[31]
  bn.words[1] = (b32[25] & 0x0F) << 22 | b32[26] << 14 | b32[27] << 6 | b32[28] >>> 2
  bn.words[2] = (b32[22] & 0x3F) << 20 | b32[23] << 12 | b32[24] << 4 | b32[25] >>> 4
  bn.words[3] = (b32[19] & 0xFF) << 18 | b32[20] << 10 | b32[21] << 2 | b32[22] >>> 6

  bn.words[4] = (b32[15] & 0x03) << 24 | b32[16] << 16 | b32[17] << 8 | b32[18]
  bn.words[5] = (b32[12] & 0x0F) << 22 | b32[13] << 14 | b32[14] << 6 | b32[15] >>> 2
  bn.words[6] = (b32[9] & 0x3F) << 20 | b32[10] << 12 | b32[11] << 4 | b32[12] >>> 4
  bn.words[7] = (b32[6] & 0xFF) << 18 | b32[7] << 10 | b32[8] << 2 | b32[9] >>> 6

  bn.words[8] = (b32[2] & 0x03) << 24 | b32[3] << 16 | b32[4] << 8 | b32[5]
  bn.words[9] = b32[0] << 14 | b32[1] << 6 | b32[2] >>> 2

  bn.length = 10
  return bn.strip()
}

BN.prototype.toBuffer = function () {
  var w = this.words
  for (var i = this.length; i < 10; ++i) w[i] = 0

  return Buffer.from([
    (w[9] >>> 14) & 0xFF, (w[9] >>> 6) & 0xFF, (w[9] & 0x3F) << 2 | ((w[8] >>> 24) & 0x03), // 0, 1, 2
    (w[8] >>> 16) & 0xFF, (w[8] >>> 8) & 0xFF, w[8] & 0xFF, // 3, 4, 5

    (w[7] >>> 18) & 0xFF, (w[7] >>> 10) & 0xFF, (w[7] >>> 2) & 0xFF, // 6, 7, 8
    ((w[7] & 0x03) << 6) | ((w[6] >>> 20) & 0x3F), (w[6] >>> 12) & 0xFF, (w[6] >>> 4) & 0xFF, // 9, 10, 11
    ((w[6] & 0x0F) << 4) | ((w[5] >>> 22) & 0x0F), (w[5] >>> 14) & 0xFF, (w[5] >>> 6) & 0xFF, // 12, 13, 14
    ((w[5] & 0x3F) << 2) | ((w[4] >>> 24) & 0x03), (w[4] >>> 16) & 0xFF, (w[4] >>> 8) & 0xFF, w[4] & 0xFF, // 15, 16, 17, 18

    (w[3] >>> 18) & 0xFF, (w[3] >>> 10) & 0xFF, (w[3] >>> 2) & 0xFF, // 19, 20, 21
    ((w[3] & 0x03) << 6) | ((w[2] >>> 20) & 0x3F), (w[2] >>> 12) & 0xFF, (w[2] >>> 4) & 0xFF, // 22, 23, 24
    ((w[2] & 0x0F) << 4) | ((w[1] >>> 22) & 0x0F), (w[1] >>> 14) & 0xFF, (w[1] >>> 6) & 0xFF, // 25, 26, 27
    ((w[1] & 0x3F) << 2) | ((w[0] >>> 24) & 0x03), (w[0] >>> 16) & 0xFF, (w[0] >>> 8) & 0xFF, w[0] & 0xFF // 28, 29, 30, 31
  ])
}

BN.prototype.clone = function () {
  var r = new BN()
  r.words = new Array(this.length)
  for (var i = 0; i < this.length; i++) r.words[i] = this.words[i]
  r.length = this.length
  r.negative = this.negative
  return r
}

BN.prototype.strip = function () {
  while (this.length > 1 && (this.words[this.length - 1] | 0) === 0) this.length--
  return this
}

BN.prototype.normSign = function () {
  // -0 = 0
  if (this.length === 1 && this.words[0] === 0) this.negative = 0
  return this
}

BN.prototype.isEven = function () {
  return (this.words[0] & 1) === 0
}

BN.prototype.isOdd = function () {
  return (this.words[0] & 1) === 1
}

BN.prototype.isZero = function () {
  return this.length === 1 && this.words[0] === 0
}

BN.prototype.ucmp = function (num) {
  if (this.length !== num.length) return this.length > num.length ? 1 : -1

  for (var i = this.length - 1; i >= 0; --i) {
    if (this.words[i] !== num.words[i]) return this.words[i] > num.words[i] ? 1 : -1
  }

  return 0
}

BN.prototype.gtOne = function () {
  return this.length > 1 || this.words[0] > 1
}

BN.prototype.isOverflow = function () {
  return this.ucmp(BN.n) >= 0
}

BN.prototype.isHigh = function () {
  return this.ucmp(BN.nh) === 1
}

BN.prototype.bitLengthGT256 = function () {
  return this.length > 10 || (this.length === 10 && this.words[9] > 0x003fffff)
}

BN.prototype.iuaddn = function (num) {
  this.words[0] += num

  for (var i = 0; this.words[i] > 0x03ffffff && i < this.length; ++i) {
    this.words[i] -= 0x04000000
    this.words[i + 1] += 1
  }

  if (i === this.length) {
    this.words[i] = 1
    this.length += 1
  }

  return this
}

BN.prototype.iadd = function (num) {
  // (-this) + num -> -(this - num)
  // this + (-num) -> this - num
  if (this.negative !== num.negative) {
    if (this.negative !== 0) {
      this.negative = 0
      this.isub(num)
      this.negative ^= 1
    } else {
      num.negative = 0
      this.isub(num)
      num.negative = 1
    }

    return this.normSign()
  }

  // a.length > b.length
  var a
  var b
  if (this.length > num.length) {
    a = this
    b = num
  } else {
    a = num
    b = this
  }

  for (var i = 0, carry = 0; i < b.length; ++i) {
    var word = a.words[i] + b.words[i] + carry
    this.words[i] = word & 0x03ffffff
    carry = word >>> 26
  }

  for (; carry !== 0 && i < a.length; ++i) {
    word = a.words[i] + carry
    this.words[i] = word & 0x03ffffff
    carry = word >>> 26
  }

  this.length = a.length
  if (carry !== 0) {
    this.words[this.length++] = carry
  } else if (a !== this) {
    for (; i < a.length; ++i) {
      this.words[i] = a.words[i]
    }
  }

  return this
}

BN.prototype.add = function (num) {
  return this.clone().iadd(num)
}

BN.prototype.isub = function (num) {
  // (-this) - num -> -(this + num)
  // this - (-num) -> this + num
  if (this.negative !== num.negative) {
    if (this.negative !== 0) {
      this.negative = 0
      this.iadd(num)
      this.negative = 1
    } else {
      num.negative = 0
      this.iadd(num)
      num.negative = 1
    }

    return this.normSign()
  }

  var cmp = this.ucmp(num)
  if (cmp === 0) {
    this.negative = 0
    this.words[0] = 0
    this.length = 1
    return this
  }

  // a > b
  var a
  var b
  if (cmp > 0) {
    a = this
    b = num
  } else {
    a = num
    b = this
  }

  for (var i = 0, carry = 0; i < b.length; ++i) {
    var word = a.words[i] - b.words[i] + carry
    carry = word >> 26
    this.words[i] = word & 0x03ffffff
  }

  for (; carry !== 0 && i < a.length; ++i) {
    word = a.words[i] + carry
    carry = word >> 26
    this.words[i] = word & 0x03ffffff
  }

  if (carry === 0 && i < a.length && a !== this) {
    for (; i < a.length; ++i) this.words[i] = a.words[i]
  }

  this.length = Math.max(this.length, i)

  if (a !== this) this.negative ^= 1

  return this.strip().normSign()
}

BN.prototype.sub = function (num) {
  return this.clone().isub(num)
}

BN.umulTo = function (num1, num2, out) {
  out.length = num1.length + num2.length - 1

  var a1 = num1.words[0]
  var b1 = num2.words[0]
  var r1 = a1 * b1

  var carry = (r1 / 0x04000000) | 0
  out.words[0] = r1 & 0x03ffffff

  for (var k = 1, maxK = out.length; k < maxK; k++) {
    var ncarry = carry >>> 26
    var rword = carry & 0x03ffffff
    for (var j = Math.max(0, k - num1.length + 1), maxJ = Math.min(k, num2.length - 1); j <= maxJ; j++) {
      var i = k - j
      var a = num1.words[i]
      var b = num2.words[j]
      var r = a * b + rword
      ncarry += (r / 0x04000000) | 0
      rword = r & 0x03ffffff
    }
    out.words[k] = rword
    carry = ncarry
  }

  if (carry !== 0) out.words[out.length++] = carry

  return out.strip()
}

BN.umulTo10x10 = Math.imul ? optimized.umulTo10x10 : BN.umulTo

BN.umulnTo = function (num, k, out) {
  if (k === 0) {
    out.words = [0]
    out.length = 1
    return out
  }

  for (var i = 0, carry = 0; i < num.length; ++i) {
    var r = num.words[i] * k + carry
    out.words[i] = r & 0x03ffffff
    carry = (r / 0x04000000) | 0
  }

  if (carry > 0) {
    out.words[i] = carry
    out.length = num.length + 1
  } else {
    out.length = num.length
  }

  return out
}

BN.prototype.umul = function (num) {
  var out = new BN()
  out.words = new Array(this.length + num.length)

  if (this.length === 10 && num.length === 10) {
    return BN.umulTo10x10(this, num, out)
  } else if (this.length === 1) {
    return BN.umulnTo(num, this.words[0], out)
  } else if (num.length === 1) {
    return BN.umulnTo(this, num.words[0], out)
  } else {
    return BN.umulTo(this, num, out)
  }
}

BN.prototype.isplit = function (output) {
  output.length = Math.min(this.length, 9)
  for (var i = 0; i < output.length; ++i) output.words[i] = this.words[i]

  if (this.length <= 9) {
    this.words[0] = 0
    this.length = 1
    return this
  }

  // Shift by 9 limbs
  var prev = this.words[9]
  output.words[output.length++] = prev & 0x003fffff

  for (i = 10; i < this.length; ++i) {
    var word = this.words[i]
    this.words[i - 10] = ((word & 0x003fffff) << 4) | (prev >>> 22)
    prev = word
  }
  prev >>>= 22
  this.words[i - 10] = prev

  if (prev === 0 && this.length > 10) {
    this.length -= 10
  } else {
    this.length -= 9
  }

  return this
}

BN.prototype.fireduce = function () {
  if (this.isOverflow()) this.isub(BN.n)
  return this
}

BN.prototype.ureduce = function () {
  var num = this.clone().isplit(BN.tmp).umul(BN.nc).iadd(BN.tmp)
  if (num.bitLengthGT256()) {
    num = num.isplit(BN.tmp).umul(BN.nc).iadd(BN.tmp)
    if (num.bitLengthGT256()) num = num.isplit(BN.tmp).umul(BN.nc).iadd(BN.tmp)
  }

  return num.fireduce()
}

BN.prototype.ishrn = function (n) {
  var mask = (1 << n) - 1
  var m = 26 - n

  for (var i = this.length - 1, carry = 0; i >= 0; --i) {
    var word = this.words[i]
    this.words[i] = (carry << m) | (word >>> n)
    carry = word & mask
  }

  if (this.length > 1 && this.words[this.length - 1] === 0) this.length -= 1

  return this
}

BN.prototype.uinvm = function () {
  var x = this.clone()
  var y = BN.n.clone()

  // A * x + B * y = x
  var A = BN.fromNumber(1)
  var B = BN.fromNumber(0)

  // C * x + D * y = y
  var C = BN.fromNumber(0)
  var D = BN.fromNumber(1)

  while (x.isEven() && y.isEven()) {
    for (var k = 1, m = 1; (x.words[0] & m) === 0 && (y.words[0] & m) === 0 && k < 26; ++k, m <<= 1);
    x.ishrn(k)
    y.ishrn(k)
  }

  var yp = y.clone()
  var xp = x.clone()

  while (!x.isZero()) {
    for (var i = 0, im = 1; (x.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
    if (i > 0) {
      x.ishrn(i)
      while (i-- > 0) {
        if (A.isOdd() || B.isOdd()) {
          A.iadd(yp)
          B.isub(xp)
        }

        A.ishrn(1)
        B.ishrn(1)
      }
    }

    for (var j = 0, jm = 1; (y.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
    if (j > 0) {
      y.ishrn(j)
      while (j-- > 0) {
        if (C.isOdd() || D.isOdd()) {
          C.iadd(yp)
          D.isub(xp)
        }

        C.ishrn(1)
        D.ishrn(1)
      }
    }

    if (x.ucmp(y) >= 0) {
      x.isub(y)
      A.isub(C)
      B.isub(D)
    } else {
      y.isub(x)
      C.isub(A)
      D.isub(B)
    }
  }

  if (C.negative === 1) {
    C.negative = 0
    var result = C.ureduce()
    result.negative ^= 1
    return result.normSign().iadd(BN.n)
  } else {
    return C.ureduce()
  }
}

BN.prototype.imulK = function () {
  this.words[this.length] = 0
  this.words[this.length + 1] = 0
  this.length += 2

  for (var i = 0, lo = 0; i < this.length; ++i) {
    var w = this.words[i] | 0
    lo += w * 0x3d1
    this.words[i] = lo & 0x03ffffff
    lo = w * 0x40 + ((lo / 0x04000000) | 0)
  }

  if (this.words[this.length - 1] === 0) {
    this.length -= 1
    if (this.words[this.length - 1] === 0) this.length -= 1
  }

  return this
}

BN.prototype.redIReduce = function () {
  this.isplit(BN.tmp).imulK().iadd(BN.tmp)
  if (this.bitLengthGT256()) this.isplit(BN.tmp).imulK().iadd(BN.tmp)

  var cmp = this.ucmp(BN.p)
  if (cmp === 0) {
    this.words[0] = 0
    this.length = 1
  } else if (cmp > 0) {
    this.isub(BN.p)
  } else {
    this.strip()
  }

  return this
}

BN.prototype.redNeg = function () {
  if (this.isZero()) return BN.fromNumber(0)

  return BN.p.sub(this)
}

BN.prototype.redAdd = function (num) {
  return this.clone().redIAdd(num)
}

BN.prototype.redIAdd = function (num) {
  this.iadd(num)
  if (this.ucmp(BN.p) >= 0) this.isub(BN.p)

  return this
}

BN.prototype.redIAdd7 = function () {
  this.iuaddn(7)
  if (this.ucmp(BN.p) >= 0) this.isub(BN.p)

  return this
}

BN.prototype.redSub = function (num) {
  return this.clone().redISub(num)
}

BN.prototype.redISub = function (num) {
  this.isub(num)
  if (this.negative !== 0) this.iadd(BN.p)

  return this
}

BN.prototype.redMul = function (num) {
  return this.umul(num).redIReduce()
}

BN.prototype.redSqr = function () {
  return this.umul(this).redIReduce()
}

BN.prototype.redSqrt = function () {
  if (this.isZero()) return this.clone()

  var wv2 = this.redSqr()
  var wv4 = wv2.redSqr()
  var wv12 = wv4.redSqr().redMul(wv4)
  var wv14 = wv12.redMul(wv2)
  var wv15 = wv14.redMul(this)

  var out = wv15
  for (var i = 0; i < 54; ++i) out = out.redSqr().redSqr().redSqr().redSqr().redMul(wv15)
  out = out.redSqr().redSqr().redSqr().redSqr().redMul(wv14)
  for (i = 0; i < 5; ++i) out = out.redSqr().redSqr().redSqr().redSqr().redMul(wv15)
  out = out.redSqr().redSqr().redSqr().redSqr().redMul(wv12)
  out = out.redSqr().redSqr().redSqr().redSqr().redSqr().redSqr().redMul(wv12)

  if (out.redSqr().ucmp(this) === 0) {
    return out
  } else {
    return null
  }
}

BN.prototype.redInvm = function () {
  var a = this.clone()
  var b = BN.p.clone()

  var x1 = BN.fromNumber(1)
  var x2 = BN.fromNumber(0)

  while (a.gtOne() && b.gtOne()) {
    for (var i = 0, im = 1; (a.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
    if (i > 0) {
      a.ishrn(i)
      while (i-- > 0) {
        if (x1.isOdd()) x1.iadd(BN.p)
        x1.ishrn(1)
      }
    }

    for (var j = 0, jm = 1; (b.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
    if (j > 0) {
      b.ishrn(j)
      while (j-- > 0) {
        if (x2.isOdd()) x2.iadd(BN.p)
        x2.ishrn(1)
      }
    }

    if (a.ucmp(b) >= 0) {
      a.isub(b)
      x1.isub(x2)
    } else {
      b.isub(a)
      x2.isub(x1)
    }
  }

  var res
  if (a.length === 1 && a.words[0] === 1) {
    res = x1
  } else {
    res = x2
  }

  if (res.negative !== 0) res.iadd(BN.p)

  if (res.negative !== 0) {
    res.negative = 0
    return res.redIReduce().redNeg()
  } else {
    return res.redIReduce()
  }
}

BN.prototype.getNAF = function (w) {
  var naf = []
  var ws = 1 << (w + 1)
  var wsm1 = ws - 1
  var ws2 = ws >> 1

  var k = this.clone()
  while (!k.isZero()) {
    for (var i = 0, m = 1; (k.words[0] & m) === 0 && i < 26; ++i, m <<= 1) naf.push(0)

    if (i !== 0) {
      k.ishrn(i)
    } else {
      var mod = k.words[0] & wsm1
      if (mod >= ws2) {
        naf.push(ws2 - mod)
        k.iuaddn(mod - ws2).ishrn(1)
      } else {
        naf.push(mod)
        k.words[0] -= mod
        if (!k.isZero()) {
          for (i = w - 1; i > 0; --i) naf.push(0)
          k.ishrn(w)
        }
      }
    }
  }

  return naf
}

BN.prototype.inspect = function () {
  if (this.isZero()) return '0'

  var buffer = this.toBuffer().toString('hex')
  for (var i = 0; buffer[i] === '0'; ++i);
  return buffer.slice(i)
}

BN.n = BN.fromBuffer(Buffer.from('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141', 'hex'))
BN.nh = BN.n.clone().ishrn(1)
BN.nc = BN.fromBuffer(Buffer.from('000000000000000000000000000000014551231950B75FC4402DA1732FC9BEBF', 'hex'))
BN.p = BN.fromBuffer(Buffer.from('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F', 'hex'))
BN.psn = BN.p.sub(BN.n)
BN.tmp = new BN()
BN.tmp.words = new Array(10)

// WTF?! it speed-up benchmark on ~20%
;(function () {
  var x = BN.fromNumber(1)
  x.words[3] = 0
})()

module.exports = BN

  }
}).call(this)
},7:{ package: "secp256k1", deps: {}, source: (function () {
  /* source: ${sourceMeta.file} */
  return function (require,module,exports) {
'use strict'
exports.umulTo10x10 = function (num1, num2, out) {
  var a = num1.words
  var b = num2.words
  var o = out.words
  var c = 0
  var lo
  var mid
  var hi
  var a0 = a[0] | 0
  var al0 = a0 & 0x1fff
  var ah0 = a0 >>> 13
  var a1 = a[1] | 0
  var al1 = a1 & 0x1fff
  var ah1 = a1 >>> 13
  var a2 = a[2] | 0
  var al2 = a2 & 0x1fff
  var ah2 = a2 >>> 13
  var a3 = a[3] | 0
  var al3 = a3 & 0x1fff
  var ah3 = a3 >>> 13
  var a4 = a[4] | 0
  var al4 = a4 & 0x1fff
  var ah4 = a4 >>> 13
  var a5 = a[5] | 0
  var al5 = a5 & 0x1fff
  var ah5 = a5 >>> 13
  var a6 = a[6] | 0
  var al6 = a6 & 0x1fff
  var ah6 = a6 >>> 13
  var a7 = a[7] | 0
  var al7 = a7 & 0x1fff
  var ah7 = a7 >>> 13
  var a8 = a[8] | 0
  var al8 = a8 & 0x1fff
  var ah8 = a8 >>> 13
  var a9 = a[9] | 0
  var al9 = a9 & 0x1fff
  var ah9 = a9 >>> 13
  var b0 = b[0] | 0
  var bl0 = b0 & 0x1fff
  var bh0 = b0 >>> 13
  var b1 = b[1] | 0
  var bl1 = b1 & 0x1fff
  var bh1 = b1 >>> 13
  var b2 = b[2] | 0
  var bl2 = b2 & 0x1fff
  var bh2 = b2 >>> 13
  var b3 = b[3] | 0
  var bl3 = b3 & 0x1fff
  var bh3 = b3 >>> 13
  var b4 = b[4] | 0
  var bl4 = b4 & 0x1fff
  var bh4 = b4 >>> 13
  var b5 = b[5] | 0
  var bl5 = b5 & 0x1fff
  var bh5 = b5 >>> 13
  var b6 = b[6] | 0
  var bl6 = b6 & 0x1fff
  var bh6 = b6 >>> 13
  var b7 = b[7] | 0
  var bl7 = b7 & 0x1fff
  var bh7 = b7 >>> 13
  var b8 = b[8] | 0
  var bl8 = b8 & 0x1fff
  var bh8 = b8 >>> 13
  var b9 = b[9] | 0
  var bl9 = b9 & 0x1fff
  var bh9 = b9 >>> 13

  out.length = 19
  /* k = 0 */
  lo = Math.imul(al0, bl0)
  mid = Math.imul(al0, bh0)
  mid += Math.imul(ah0, bl0)
  hi = Math.imul(ah0, bh0)
  var w0 = c + lo + ((mid & 0x1fff) << 13)
  c = hi + (mid >>> 13) + (w0 >>> 26)
  w0 &= 0x3ffffff
  /* k = 1 */
  lo = Math.imul(al1, bl0)
  mid = Math.imul(al1, bh0)
  mid += Math.imul(ah1, bl0)
  hi = Math.imul(ah1, bh0)
  lo += Math.imul(al0, bl1)
  mid += Math.imul(al0, bh1)
  mid += Math.imul(ah0, bl1)
  hi += Math.imul(ah0, bh1)
  var w1 = c + lo + ((mid & 0x1fff) << 13)
  c = hi + (mid >>> 13) + (w1 >>> 26)
  w1 &= 0x3ffffff
  /* k = 2 */
  lo = Math.imul(al2, bl0)
  mid = Math.imul(al2, bh0)
  mid += Math.imul(ah2, bl0)
  hi = Math.imul(ah2, bh0)
  lo += Math.imul(al1, bl1)
  mid += Math.imul(al1, bh1)
  mid += Math.imul(ah1, bl1)
  hi += Math.imul(ah1, bh1)
  lo += Math.imul(al0, bl2)
  mid += Math.imul(al0, bh2)
  mid += Math.imul(ah0, bl2)
  hi += Math.imul(ah0, bh2)
  var w2 = c + lo + ((mid & 0x1fff) << 13)
  c = hi + (mid >>> 13) + (w2 >>> 26)
  w2 &= 0x3ffffff
  /* k = 3 */
  lo = Math.imul(al3, bl0)
  mid = Math.imul(al3, bh0)
  mid += Math.imul(ah3, bl0)
  hi = Math.imul(ah3, bh0)
  lo += Math.imul(al2, bl1)
  mid += Math.imul(al2, bh1)
  mid += Math.imul(ah2, bl1)
  hi += Math.imul(ah2, bh1)
  lo += Math.imul(al1, bl2)
  mid += Math.imul(al1, bh2)
  mid += Math.imul(ah1, bl2)
  hi += Math.imul(ah1, bh2)
  lo += Math.imul(al0, bl3)
  mid += Math.imul(al0, bh3)
  mid += Math.imul(ah0, bl3)
  hi += Math.imul(ah0, bh3)
  var w3 = c + lo + ((mid & 0x1fff) << 13)
  c = hi + (mid >>> 13) + (w3 >>> 26)
  w3 &= 0x3ffffff
  /* k = 4 */
  lo = Math.imul(al4, bl0)
  mid = Math.imul(al4, bh0)
  mid += Math.imul(ah4, bl0)
  hi = Math.imul(ah4, bh0)
  lo += Math.imul(al3, bl1)
  mid += Math.imul(al3, bh1)
  mid += Math.imul(ah3, bl1)
  hi += Math.imul(ah3, bh1)
  lo += Math.imul(al2, bl2)
  mid += Math.imul(al2, bh2)
  mid += Math.imul(ah2, bl2)
  hi += Math.imul(ah2, bh2)
  lo += Math.imul(al1, bl3)
  mid += Math.imul(al1, bh3)
  mid += Math.imul(ah1, bl3)
  hi += Math.imul(ah1, bh3)
  lo += Math.imul(al0, bl4)
  mid += Math.imul(al0, bh4)
  mid += Math.imul(ah0, bl4)
  hi += Math.imul(ah0, bh4)
  var w4 = c + lo + ((mid & 0x1fff) << 13)
  c = hi + (mid >>> 13) + (w4 >>> 26)
  w4 &= 0x3ffffff
  /* k = 5 */
  lo = Math.imul(al5, bl0)
  mid = Math.imul(al5, bh0)
  mid += Math.imul(ah5, bl0)
  hi = Math.imul(ah5, bh0)
  lo += Math.imul(al4, bl1)
  mid += Math.imul(al4, bh1)
  mid += Math.imul(ah4, bl1)
  hi += Math.imul(ah4, bh1)
  lo += Math.imul(al3, bl2)
  mid += Math.imul(al3, bh2)
  mid += Math.imul(ah3, bl2)
  hi += Math.imul(ah3, bh2)
  lo += Math.imul(al2, bl3)
  mid += Math.imul(al2, bh3)
  mid += Math.imul(ah2, bl3)
  hi += Math.imul(ah2, bh3)
  lo += Math.imul(al1, bl4)
  mid += Math.imul(al1, bh4)
  mid += Math.imul(ah1, bl4)
  hi += Math.imul(ah1, bh4)
  lo += Math.imul(al0, bl5)
  mid += Math.imul(al0, bh5)
  mid += Math.imul(ah0, bl5)
  hi += Math.imul(ah0, bh5)
  var w5 = c + lo + ((mid & 0x1fff) << 13)
  c = hi + (mid >>> 13) + (w5 >>> 26)
  w5 &= 0x3ffffff
  /* k = 6 */
  lo = Math.imul(al6, bl0)
  mid = Math.imul(al6, bh0)
  mid += Math.imul(ah6, bl0)
  hi = Math.imul(ah6, bh0)
  lo += Math.imul(al5, bl1)
  mid += Math.imul(al5, bh1)
  mid += Math.imul(ah5, bl1)
  hi += Math.imul(ah5, bh1)
  lo += Math.imul(al4, bl2)
  mid += Math.imul(al4, bh2)
  mid += Math.imul(ah4, bl2)
  hi += Math.imul(ah4, bh2)
  lo += Math.imul(al3, bl3)
  mid += Math.imul(al3, bh3)
  mid += Math.imul(ah3, bl3)
  hi += Math.imul(ah3, bh3)
  lo += Math.imul(al2, bl4)
  mid += Math.imul(al2, bh4)
  mid += Math.imul(ah2, bl4)
  hi += Math.imul(ah2, bh4)
  lo += Math.imul(al1, bl5)
  mid += Math.imul(al1, bh5)
  mid += Math.imul(ah1, bl5)
  hi += Math.imul(ah1, bh5)
  lo += Math.imul(al0, bl6)
  mid += Math.imul(al0, bh6)
  mid += Math.imul(ah0, bl6)
  hi += Math.imul(ah0, bh6)
  var w6 = c + lo + ((mid & 0x1fff) << 13)
  c = hi + (mid >>> 13) + (w6 >>> 26)
  w6 &= 0x3ffffff
  /* k = 7 */
  lo = Math.imul(al7, bl0)
  mid = Math.imul(al7, bh0)
  mid += Math.imul(ah7, bl0)
  hi = Math.imul(ah7, bh0)
  lo += Math.imul(al6, bl1)
  mid += Math.imul(al6, bh1)
  mid += Math.imul(ah6, bl1)
  hi += Math.imul(ah6, bh1)
  lo += Math.imul(al5, bl2)
  mid += Math.imul(al5, bh2)
  mid += Math.imul(ah5, bl2)
  hi += Math.imul(ah5, bh2)
  lo += Math.imul(al4, bl3)
  mid += Math.imul(al4, bh3)
  mid += Math.imul(ah4, bl3)
  hi += Math.imul(ah4, bh3)
  lo += Math.imul(al3, bl4)
  mid += Math.imul(al3, bh4)
  mid += Math.imul(ah3, bl4)
  hi += Math.imul(ah3, bh4)
  lo += Math.imul(al2, bl5)
  mid += Math.imul(al2, bh5)
  mid += Math.imul(ah2, bl5)
  hi += Math.imul(ah2, bh5)
  lo += Math.imul(al1, bl6)
  mid += Math.imul(al1, bh6)
  mid += Math.imul(ah1, bl6)
  hi += Math.imul(ah1, bh6)
  lo += Math.imul(al0, bl7)
  mid += Math.imul(al0, bh7)
  mid += Math.imul(ah0, bl7)
  hi += Math.imul(ah0, bh7)
  var w7 = c + lo + ((mid & 0x1fff) << 13)
  c = hi + (mid >>> 13) + (w7 >>> 26)
  w7 &= 0x3ffffff
  /* k = 8 */
  lo = Math.imul(al8, bl0)
  mid = Math.imul(al8, bh0)
  mid += Math.imul(ah8, bl0)
  hi = Math.imul(ah8, bh0)
  lo += Math.imul(al7, bl1)
  mid += Math.imul(al7, bh1)
  mid += Math.imul(ah7, bl1)
  hi += Math.imul(ah7, bh1)
  lo += Math.imul(al6, bl2)
  mid += Math.imul(al6, bh2)
  mid += Math.imul(ah6, bl2)
  hi += Math.imul(ah6, bh2)
  lo += Math.imul(al5, bl3)
  mid += Math.imul(al5, bh3)
  mid += Math.imul(ah5, bl3)
  hi += Math.imul(ah5, bh3)
  lo += Math.imul(al4, bl4)
  mid += Math.imul(al4, bh4)
  mid += Math.imul(ah4, bl4)
  hi += Math.imul(ah4, bh4)
  lo += Math.imul(al3, bl5)
  mid += Math.imul(al3, bh5)
  mid += Math.imul(ah3, bl5)
  hi += Math.imul(ah3, bh5)
  lo += Math.imul(al2, bl6)
  mid += Math.imul(al2, bh6)
  mid += Math.imul(ah2, bl6)
  hi += Math.imul(ah2, bh6)
  lo += Math.imul(al1, bl7)
  mid += Math.imul(al1, bh7)
  mid += Math.imul(ah1, bl7)
  hi += Math.imul(ah1, bh7)
  lo += Math.imul(al0, bl8)
  mid += Math.imul(al0, bh8)
  mid += Math.imul(ah0, bl8)
  hi += Math.imul(ah0, bh8)
  var w8 = c + lo + ((mid & 0x1fff) << 13)
  c = hi + (mid >>> 13) + (w8 >>> 26)
  w8 &= 0x3ffffff
  /* k = 9 */
  lo = Math.imul(al9, bl0)
  mid = Math.imul(al9, bh0)
  mid += Math.imul(ah9, bl0)
  hi = Math.imul(ah9, bh0)
  lo += Math.imul(al8, bl1)
  mid += Math.imul(al8, bh1)
  mid += Math.imul(ah8, bl1)
  hi += Math.imul(ah8, bh1)
  lo += Math.imul(al7, bl2)
  mid += Math.imul(al7, bh2)
  mid += Math.imul(ah7, bl2)
  hi += Math.imul(ah7, bh2)
  lo += Math.imul(al6, bl3)
  mid += Math.imul(al6, bh3)
  mid += Math.imul(ah6, bl3)
  hi += Math.imul(ah6, bh3)
  lo += Math.imul(al5, bl4)
  mid += Math.imul(al5, bh4)
  mid += Math.imul(ah5, bl4)
  hi += Math.imul(ah5, bh4)
  lo += Math.imul(al4, bl5)
  mid += Math.imul(al4, bh5)
  mid += Math.imul(ah4, bl5)
  hi += Math.imul(ah4, bh5)
  lo += Math.imul(al3, bl6)
  mid += Math.imul(al3, bh6)
  mid += Math.imul(ah3, bl6)
  hi += Math.imul(ah3, bh6)
  lo += Math.imul(al2, bl7)
  mid += Math.imul(al2, bh7)
  mid += Math.imul(ah2, bl7)
  hi += Math.imul(ah2, bh7)
  lo += Math.imul(al1, bl8)
  mid += Math.imul(al1, bh8)
  mid += Math.imul(ah1, bl8)
  hi += Math.imul(ah1, bh8)
  lo += Math.imul(al0, bl9)
  mid += Math.imul(al0, bh9)
  mid += Math.imul(ah0, bl9)
  hi += Math.imul(ah0, bh9)
  var w9 = c + lo + ((mid & 0x1fff) << 13)
  c = hi + (mid >>> 13) + (w9 >>> 26)
  w9 &= 0x3ffffff
  /* k = 10 */
  lo = Math.imul(al9, bl1)
  mid = Math.imul(al9, bh1)
  mid += Math.imul(ah9, bl1)
  hi = Math.imul(ah9, bh1)
  lo += Math.imul(al8, bl2)
  mid += Math.imul(al8, bh2)
  mid += Math.imul(ah8, bl2)
  hi += Math.imul(ah8, bh2)
  lo += Math.imul(al7, bl3)
  mid += Math.imul(al7, bh3)
  mid += Math.imul(ah7, bl3)
  hi += Math.imul(ah7, bh3)
  lo += Math.imul(al6, bl4)
  mid += Math.imul(al6, bh4)
  mid += Math.imul(ah6, bl4)
  hi += Math.imul(ah6, bh4)
  lo += Math.imul(al5, bl5)
  mid += Math.imul(al5, bh5)
  mid += Math.imul(ah5, bl5)
  hi += Math.imul(ah5, bh5)
  lo += Math.imul(al4, bl6)
  mid += Math.imul(al4, bh6)
  mid += Math.imul(ah4, bl6)
  hi += Math.imul(ah4, bh6)
  lo += Math.imul(al3, bl7)
  mid += Math.imul(al3, bh7)
  mid += Math.imul(ah3, bl7)
  hi += Math.imul(ah3, bh7)
  lo += Math.imul(al2, bl8)
  mid += Math.imul(al2, bh8)
  mid += Math.imul(ah2, bl8)
  hi += Math.imul(ah2, bh8)
  lo += Math.imul(al1, bl9)
  mid += Math.imul(al1, bh9)
  mid += Math.imul(ah1, bl9)
  hi += Math.imul(ah1, bh9)
  var w10 = c + lo + ((mid & 0x1fff) << 13)
  c = hi + (mid >>> 13) + (w10 >>> 26)
  w10 &= 0x3ffffff
  /* k = 11 */
  lo = Math.imul(al9, bl2)
  mid = Math.imul(al9, bh2)
  mid += Math.imul(ah9, bl2)
  hi = Math.imul(ah9, bh2)
  lo += Math.imul(al8, bl3)
  mid += Math.imul(al8, bh3)
  mid += Math.imul(ah8, bl3)
  hi += Math.imul(ah8, bh3)
  lo += Math.imul(al7, bl4)
  mid += Math.imul(al7, bh4)
  mid += Math.imul(ah7, bl4)
  hi += Math.imul(ah7, bh4)
  lo += Math.imul(al6, bl5)
  mid += Math.imul(al6, bh5)
  mid += Math.imul(ah6, bl5)
  hi += Math.imul(ah6, bh5)
  lo += Math.imul(al5, bl6)
  mid += Math.imul(al5, bh6)
  mid += Math.imul(ah5, bl6)
  hi += Math.imul(ah5, bh6)
  lo += Math.imul(al4, bl7)
  mid += Math.imul(al4, bh7)
  mid += Math.imul(ah4, bl7)
  hi += Math.imul(ah4, bh7)
  lo += Math.imul(al3, bl8)
  mid += Math.imul(al3, bh8)
  mid += Math.imul(ah3, bl8)
  hi += Math.imul(ah3, bh8)
  lo += Math.imul(al2, bl9)
  mid += Math.imul(al2, bh9)
  mid += Math.imul(ah2, bl9)
  hi += Math.imul(ah2, bh9)
  var w11 = c + lo + ((mid & 0x1fff) << 13)
  c = hi + (mid >>> 13) + (w11 >>> 26)
  w11 &= 0x3ffffff
  /* k = 12 */
  lo = Math.imul(al9, bl3)
  mid = Math.imul(al9, bh3)
  mid += Math.imul(ah9, bl3)
  hi = Math.imul(ah9, bh3)
  lo += Math.imul(al8, bl4)
  mid += Math.imul(al8, bh4)
  mid += Math.imul(ah8, bl4)
  hi += Math.imul(ah8, bh4)
  lo += Math.imul(al7, bl5)
  mid += Math.imul(al7, bh5)
  mid += Math.imul(ah7, bl5)
  hi += Math.imul(ah7, bh5)
  lo += Math.imul(al6, bl6)
  mid += Math.imul(al6, bh6)
  mid += Math.imul(ah6, bl6)
  hi += Math.imul(ah6, bh6)
  lo += Math.imul(al5, bl7)
  mid += Math.imul(al5, bh7)
  mid += Math.imul(ah5, bl7)
  hi += Math.imul(ah5, bh7)
  lo += Math.imul(al4, bl8)
  mid += Math.imul(al4, bh8)
  mid += Math.imul(ah4, bl8)
  hi += Math.imul(ah4, bh8)
  lo += Math.imul(al3, bl9)
  mid += Math.imul(al3, bh9)
  mid += Math.imul(ah3, bl9)
  hi += Math.imul(ah3, bh9)
  var w12 = c + lo + ((mid & 0x1fff) << 13)
  c = hi + (mid >>> 13) + (w12 >>> 26)
  w12 &= 0x3ffffff
  /* k = 13 */
  lo = Math.imul(al9, bl4)
  mid = Math.imul(al9, bh4)
  mid += Math.imul(ah9, bl4)
  hi = Math.imul(ah9, bh4)
  lo += Math.imul(al8, bl5)
  mid += Math.imul(al8, bh5)
  mid += Math.imul(ah8, bl5)
  hi += Math.imul(ah8, bh5)
  lo += Math.imul(al7, bl6)
  mid += Math.imul(al7, bh6)
  mid += Math.imul(ah7, bl6)
  hi += Math.imul(ah7, bh6)
  lo += Math.imul(al6, bl7)
  mid += Math.imul(al6, bh7)
  mid += Math.imul(ah6, bl7)
  hi += Math.imul(ah6, bh7)
  lo += Math.imul(al5, bl8)
  mid += Math.imul(al5, bh8)
  mid += Math.imul(ah5, bl8)
  hi += Math.imul(ah5, bh8)
  lo += Math.imul(al4, bl9)
  mid += Math.imul(al4, bh9)
  mid += Math.imul(ah4, bl9)
  hi += Math.imul(ah4, bh9)
  var w13 = c + lo + ((mid & 0x1fff) << 13)
  c = hi + (mid >>> 13) + (w13 >>> 26)
  w13 &= 0x3ffffff
  /* k = 14 */
  lo = Math.imul(al9, bl5)
  mid = Math.imul(al9, bh5)
  mid += Math.imul(ah9, bl5)
  hi = Math.imul(ah9, bh5)
  lo += Math.imul(al8, bl6)
  mid += Math.imul(al8, bh6)
  mid += Math.imul(ah8, bl6)
  hi += Math.imul(ah8, bh6)
  lo += Math.imul(al7, bl7)
  mid += Math.imul(al7, bh7)
  mid += Math.imul(ah7, bl7)
  hi += Math.imul(ah7, bh7)
  lo += Math.imul(al6, bl8)
  mid += Math.imul(al6, bh8)
  mid += Math.imul(ah6, bl8)
  hi += Math.imul(ah6, bh8)
  lo += Math.imul(al5, bl9)
  mid += Math.imul(al5, bh9)
  mid += Math.imul(ah5, bl9)
  hi += Math.imul(ah5, bh9)
  var w14 = c + lo + ((mid & 0x1fff) << 13)
  c = hi + (mid >>> 13) + (w14 >>> 26)
  w14 &= 0x3ffffff
  /* k = 15 */
  lo = Math.imul(al9, bl6)
  mid = Math.imul(al9, bh6)
  mid += Math.imul(ah9, bl6)
  hi = Math.imul(ah9, bh6)
  lo += Math.imul(al8, bl7)
  mid += Math.imul(al8, bh7)
  mid += Math.imul(ah8, bl7)
  hi += Math.imul(ah8, bh7)
  lo += Math.imul(al7, bl8)
  mid += Math.imul(al7, bh8)
  mid += Math.imul(ah7, bl8)
  hi += Math.imul(ah7, bh8)
  lo += Math.imul(al6, bl9)
  mid += Math.imul(al6, bh9)
  mid += Math.imul(ah6, bl9)
  hi += Math.imul(ah6, bh9)
  var w15 = c + lo + ((mid & 0x1fff) << 13)
  c = hi + (mid >>> 13) + (w15 >>> 26)
  w15 &= 0x3ffffff
  /* k = 16 */
  lo = Math.imul(al9, bl7)
  mid = Math.imul(al9, bh7)
  mid += Math.imul(ah9, bl7)
  hi = Math.imul(ah9, bh7)
  lo += Math.imul(al8, bl8)
  mid += Math.imul(al8, bh8)
  mid += Math.imul(ah8, bl8)
  hi += Math.imul(ah8, bh8)
  lo += Math.imul(al7, bl9)
  mid += Math.imul(al7, bh9)
  mid += Math.imul(ah7, bl9)
  hi += Math.imul(ah7, bh9)
  var w16 = c + lo + ((mid & 0x1fff) << 13)
  c = hi + (mid >>> 13) + (w16 >>> 26)
  w16 &= 0x3ffffff
  /* k = 17 */
  lo = Math.imul(al9, bl8)
  mid = Math.imul(al9, bh8)
  mid += Math.imul(ah9, bl8)
  hi = Math.imul(ah9, bh8)
  lo += Math.imul(al8, bl9)
  mid += Math.imul(al8, bh9)
  mid += Math.imul(ah8, bl9)
  hi += Math.imul(ah8, bh9)
  var w17 = c + lo + ((mid & 0x1fff) << 13)
  c = hi + (mid >>> 13) + (w17 >>> 26)
  w17 &= 0x3ffffff
  /* k = 18 */
  lo = Math.imul(al9, bl9)
  mid = Math.imul(al9, bh9)
  mid += Math.imul(ah9, bl9)
  hi = Math.imul(ah9, bh9)
  var w18 = c + lo + ((mid & 0x1fff) << 13)
  c = hi + (mid >>> 13) + (w18 >>> 26)
  w18 &= 0x3ffffff
  o[0] = w0
  o[1] = w1
  o[2] = w2
  o[3] = w3
  o[4] = w4
  o[5] = w5
  o[6] = w6
  o[7] = w7
  o[8] = w8
  o[9] = w9
  o[10] = w10
  o[11] = w11
  o[12] = w12
  o[13] = w13
  o[14] = w14
  o[15] = w15
  o[16] = w16
  o[17] = w17
  o[18] = w18
  if (c !== 0) {
    o[19] = c
    out.length++
  }
  return out
}

  }
}).call(this)
}},{},[4]);
