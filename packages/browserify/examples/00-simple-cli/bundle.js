// LavaMoat Prelude
(function() {

  const debugMode = false

  // identify the globalRef
  const globalRef = (typeof self !== 'undefined') ? self : global

  // create the SES rootRealm
  // "templateRequire" calls are inlined in "generatePrelude"
  const SES = // define ses
(function(){
  const global = globalRef
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

  function getSharedGlobalDescs(
    unsafeGlobal,
    configurableGlobals = false
  ) {
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

    if (configurableGlobals) {
      describe(frozenGlobalPropertyNames, true, false, true);
      // The following is correct but expensive.
      describe(stableGlobalPropertyNames, true, false, true);
    } else {
      // Instead, for now, we let these get optimized.
      describe(frozenGlobalPropertyNames, false, false, false);
      describe(stableGlobalPropertyNames, false, false, false);
    }
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
  function createUnsafeRec(
    unsafeGlobal,
    allShims = [],
    configurableGlobals = false
  ) {
    const sharedGlobalDescs = getSharedGlobalDescs(
      unsafeGlobal,
      configurableGlobals
    );

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
  function createNewUnsafeRec(allShims, configurableGlobals = false) {
    const unsafeGlobal = getNewUnsafeGlobal();
    const unsafeRec = createUnsafeRec(
      unsafeGlobal,
      allShims,
      configurableGlobals
    );
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
    const {
      shims: newShims,
      transforms,
      sloppyGlobals,
      configurableGlobals
    } = options;
    const allShims = arrayConcat(parentUnsafeRec.allShims, newShims);

    // The unsafe record is created already repaired.
    const unsafeRec = createNewUnsafeRec(allShims, configurableGlobals);
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

      TypeError: {
        prototype: {
          constructor: t$1, // set by "readable-stream"
          name: t$1, // set by "readable-stream"
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

  const FORWARDED_REALMS_OPTIONS = ['transforms', 'configurableGlobals'];

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

  const creatorStrings = "(function (exports) {\n  'use strict';\n\n  // Adapted from SES/Caja - Copyright (C) 2011 Google Inc.\n  // Copyright (C) 2018 Agoric\n\n  // Licensed under the Apache License, Version 2.0 (the \"License\");\n  // you may not use this file except in compliance with the License.\n  // You may obtain a copy of the License at\n  //\n  // http://www.apache.org/licenses/LICENSE-2.0\n  //\n  // Unless required by applicable law or agreed to in writing, software\n  // distributed under the License is distributed on an \"AS IS\" BASIS,\n  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  // See the License for the specific language governing permissions and\n  // limitations under the License.\n\n  // based upon:\n  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/startSES.js\n  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/repairES5.js\n  // then copied from proposal-frozen-realms deep-freeze.js\n  // then copied from SES/src/bundle/deepFreeze.js\n\n  /**\n   * @typedef HardenerOptions\n   * @type {object}\n   * @property {WeakSet=} fringeSet WeakSet to use for the fringeSet\n   * @property {Function=} naivePrepareObject Call with object before hardening\n   */\n\n  /**\n   * Create a `harden` function.\n   *\n   * @param {Iterable} initialFringe Objects considered already hardened\n   * @param {HardenerOptions=} options Options for creation\n   */\n  function makeHardener(initialFringe, options = {}) {\n    const { freeze, getOwnPropertyDescriptors, getPrototypeOf } = Object;\n    const { ownKeys } = Reflect;\n\n    // Objects that we won't freeze, either because we've frozen them already,\n    // or they were one of the initial roots (terminals). These objects form\n    // the \"fringe\" of the hardened object graph.\n    let { fringeSet } = options;\n    if (fringeSet) {\n      if (\n        typeof fringeSet.add !== 'function' ||\n        typeof fringeSet.has !== 'function'\n      ) {\n        throw new TypeError(\n          `options.fringeSet must have add() and has() methods`,\n        );\n      }\n\n      // Populate the supplied fringeSet with our initialFringe.\n      if (initialFringe) {\n        for (const fringe of initialFringe) {\n          fringeSet.add(fringe);\n        }\n      }\n    } else {\n      // Use a new empty fringe.\n      fringeSet = new WeakSet(initialFringe);\n    }\n\n    const naivePrepareObject = options && options.naivePrepareObject;\n\n    function harden(root) {\n      const toFreeze = new Set();\n      const prototypes = new Map();\n      const paths = new WeakMap();\n\n      // If val is something we should be freezing but aren't yet,\n      // add it to toFreeze.\n      function enqueue(val, path) {\n        if (Object(val) !== val) {\n          // ignore primitives\n          return;\n        }\n        const type = typeof val;\n        if (type !== 'object' && type !== 'function') {\n          // future proof: break until someone figures out what it should do\n          throw new TypeError(`Unexpected typeof: ${type}`);\n        }\n        if (fringeSet.has(val) || toFreeze.has(val)) {\n          // Ignore if this is an exit, or we've already visited it\n          return;\n        }\n        // console.log(`adding ${val} to toFreeze`, val);\n        toFreeze.add(val);\n        paths.set(val, path);\n      }\n\n      function freezeAndTraverse(obj) {\n        // Apply the naive preparer if they specified one.\n        if (naivePrepareObject) {\n          naivePrepareObject(obj);\n        }\n\n        // Now freeze the object to ensure reactive\n        // objects such as proxies won't add properties\n        // during traversal, before they get frozen.\n\n        // Object are verified before being enqueued,\n        // therefore this is a valid candidate.\n        // Throws if this fails (strict mode).\n        freeze(obj);\n\n        // we rely upon certain commitments of Object.freeze and proxies here\n\n        // get stable/immutable outbound links before a Proxy has a chance to do\n        // something sneaky.\n        const proto = getPrototypeOf(obj);\n        const descs = getOwnPropertyDescriptors(obj);\n        const path = paths.get(obj) || 'unknown';\n\n        // console.log(`adding ${proto} to prototypes under ${path}`);\n        if (proto !== null && !prototypes.has(proto)) {\n          prototypes.set(proto, path);\n          paths.set(proto, `${path}.__proto__`);\n        }\n\n        ownKeys(descs).forEach(name => {\n          const pathname = `${path}.${String(name)}`;\n          // todo uncurried form\n          // todo: getOwnPropertyDescriptors is guaranteed to return well-formed\n          // descriptors, but they still inherit from Object.prototype. If\n          // someone has poisoned Object.prototype to add 'value' or 'get'\n          // properties, then a simple 'if (\"value\" in desc)' or 'desc.value'\n          // test could be confused. We use hasOwnProperty to be sure about\n          // whether 'value' is present or not, which tells us for sure that this\n          // is a data property.\n          const desc = descs[name];\n          if ('value' in desc) {\n            // todo uncurried form\n            enqueue(desc.value, `${pathname}`);\n          } else {\n            enqueue(desc.get, `${pathname}(get)`);\n            enqueue(desc.set, `${pathname}(set)`);\n          }\n        });\n      }\n\n      function dequeue() {\n        // New values added before forEach() has finished will be visited.\n        toFreeze.forEach(freezeAndTraverse); // todo curried forEach\n      }\n\n      function checkPrototypes() {\n        prototypes.forEach((path, p) => {\n          if (!(toFreeze.has(p) || fringeSet.has(p))) {\n            // all reachable properties have already been frozen by this point\n            let msg;\n            try {\n              msg = `prototype ${p} of ${path} is not already in the fringeSet`;\n            } catch (e) {\n              // `${(async _=>_).__proto__}` fails in most engines\n              msg =\n                'a prototype of something is not already in the fringeset (and .toString failed)';\n              try {\n                console.log(msg);\n                console.log('the prototype:', p);\n                console.log('of something:', path);\n              } catch (_e) {\n                // console.log might be missing in restrictive SES realms\n              }\n            }\n            throw new TypeError(msg);\n          }\n        });\n      }\n\n      function commit() {\n        // todo curried forEach\n        // we capture the real WeakSet.prototype.add above, in case someone\n        // changes it. The two-argument form of forEach passes the second\n        // argument as the 'this' binding, so we add to the correct set.\n        toFreeze.forEach(fringeSet.add, fringeSet);\n      }\n\n      enqueue(root);\n      dequeue();\n      // console.log(\"fringeSet\", fringeSet);\n      // console.log(\"prototype set:\", prototypes);\n      // console.log(\"toFreeze set:\", toFreeze);\n      checkPrototypes();\n      commit();\n\n      return root;\n    }\n\n    return harden;\n  }\n\n  function tameDate() {\n    const unsafeDate = Date;\n    // Date(anything) gives a string with the current time\n    // new Date(x) coerces x into a number and then returns a Date\n    // new Date() returns the current time, as a Date object\n    // new Date(undefined) returns a Date object which stringifies to 'Invalid Date'\n\n    const newDateConstructor = function Date(...args) {\n      if (new.target === undefined) {\n        // we were not called as a constructor\n        // this would normally return a string with the current time\n        return 'Invalid Date';\n      }\n      // constructor behavior: if we get arguments, we can safely pass them through\n      if (args.length > 0) {\n        return Reflect.construct(unsafeDate, args, new.target);\n        // todo: test that our constructor can still be subclassed\n      }\n      // no arguments: return a Date object, but invalid\n      return Reflect.construct(unsafeDate, [NaN], new.target);\n    };\n\n    Object.defineProperties(\n      newDateConstructor,\n      Object.getOwnPropertyDescriptors(unsafeDate),\n    );\n    // that will copy the .prototype too, so this next line is unnecessary\n    // newDateConstructor.prototype = unsafeDate.prototype;\n    unsafeDate.prototype.constructor = newDateConstructor;\n    // disable Date.now\n    newDateConstructor.now = () => NaN;\n\n    Date = newDateConstructor; // eslint-disable-line no-global-assign\n  }\n\n  function tameMath() {\n    // Math.random = () => 4; // https://www.xkcd.com/221\n    Math.random = () => {\n      throw Error('disabled');\n    };\n  }\n\n  /* eslint-disable-next-line no-redeclare */\n  /* global Intl */\n\n  function tameIntl() {\n    // todo: somehow fix these. These almost certainly don't enable the reading\n    // of side-channels, but we want things to be deterministic across\n    // runtimes. Best bet is to just disallow calling these functions without\n    // an explicit locale name.\n\n    // the whitelist may have deleted Intl entirely, so tolerate that\n    if (typeof Intl !== 'undefined') {\n      Intl.DateTimeFormat = () => {\n        throw Error('disabled');\n      };\n      Intl.NumberFormat = () => {\n        throw Error('disabled');\n      };\n      Intl.getCanonicalLocales = () => {\n        throw Error('disabled');\n      };\n    }\n    // eslint-disable-next-line no-extend-native\n    Object.prototype.toLocaleString = () => {\n      throw new Error('toLocaleString suppressed');\n    };\n  }\n\n  function tameError() {\n    if (!Object.isExtensible(Error)) {\n      throw Error('huh Error is not extensible');\n    }\n    /* this worked back when we were running it on a global, but stopped\n    working when we turned it into a shim */\n    /*\n    Object.defineProperty(Error.prototype, \"stack\",\n                          { get() { return 'stack suppressed'; } });\n    */\n    delete Error.captureStackTrace;\n    if ('captureStackTrace' in Error) {\n      throw Error('hey we could not remove Error.captureStackTrace');\n    }\n\n    // we might do this in the future\n    /*\n    const unsafeError = Error;\n    const newErrorConstructor = function Error(...args) {\n      return Reflect.construct(unsafeError, args, new.target);\n    };\n\n    newErrorConstructor.prototype = unsafeError.prototype;\n    newErrorConstructor.prototype.construct = newErrorConstructor;\n\n    Error = newErrorConstructor;\n\n    EvalError.__proto__ = newErrorConstructor;\n    RangeError.__proto__ = newErrorConstructor;\n    ReferenceError.__proto__ = newErrorConstructor;\n    SyntaxError.__proto__ = newErrorConstructor;\n    TypeError.__proto__ = newErrorConstructor;\n    URIError.__proto__ = newErrorConstructor;\n    */\n  }\n\n  function tameRegExp() {\n    delete RegExp.prototype.compile;\n    if ('compile' in RegExp.prototype) {\n      throw Error('hey we could not remove RegExp.prototype.compile');\n    }\n\n    // We want to delete RegExp.$1, as well as any other surprising properties.\n    // On some engines we can't just do 'delete RegExp.$1'.\n    const unsafeRegExp = RegExp;\n\n    // eslint-disable-next-line no-global-assign\n    RegExp = function RegExp(...args) {\n      return Reflect.construct(unsafeRegExp, args, new.target);\n    };\n    RegExp.prototype = unsafeRegExp.prototype;\n    unsafeRegExp.prototype.constructor = RegExp;\n\n    if ('$1' in RegExp) {\n      throw Error('hey we could not remove RegExp.$1');\n    }\n  }\n\n  /* global getAnonIntrinsics */\n\n  // Copyright (C) 2011 Google Inc.\n  // Copyright (C) 2018 Agoric\n  //\n  // Licensed under the Apache License, Version 2.0 (the \"License\");\n  // you may not use this file except in compliance with the License.\n  // You may obtain a copy of the License at\n  //\n  // http://www.apache.org/licenses/LICENSE-2.0\n  //\n  // Unless required by applicable law or agreed to in writing, software\n  // distributed under the License is distributed on an \"AS IS\" BASIS,\n  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  // See the License for the specific language governing permissions and\n  // limitations under the License.\n\n  /* This is evaluated in an environment in which getAnonIntrinsics() is\n     already defined (by prepending the definition of getAnonIntrinsics to the\n     stringified removeProperties()), hence we don't use the following\n     import */\n  // import { getAnonIntrinsics } from './anonIntrinsics.js';\n\n  function removeProperties(global, whitelist) {\n    // walk global object, test against whitelist, delete\n\n    const uncurryThis = fn => (thisArg, ...args) =>\n      Reflect.apply(fn, thisArg, args);\n    const {\n      getOwnPropertyDescriptor: gopd,\n      getOwnPropertyNames: gopn,\n      keys,\n    } = Object;\n    const cleaning = new WeakMap();\n    const getProto = Object.getPrototypeOf;\n    const hop = uncurryThis(Object.prototype.hasOwnProperty);\n\n    const whiteTable = new WeakMap();\n\n    function addToWhiteTable(rootValue, rootPermit) {\n      /**\n       * The whiteTable should map from each path-accessible primordial\n       * object to the permit object that describes how it should be\n       * cleaned.\n       *\n       * We initialize the whiteTable only so that {@code getPermit} can\n       * process \"*\" inheritance using the whitelist, by walking actual\n       * inheritance chains.\n       */\n      const whitelistSymbols = [true, false, '*', 'maybeAccessor'];\n      function register(value, permit) {\n        if (value !== Object(value)) {\n          return;\n        }\n        if (typeof permit !== 'object') {\n          if (whitelistSymbols.indexOf(permit) < 0) {\n            throw new Error(\n              `syntax error in whitelist; unexpected value: ${permit}`,\n            );\n          }\n          return;\n        }\n        if (whiteTable.has(value)) {\n          throw new Error('primordial reachable through multiple paths');\n        }\n        whiteTable.set(value, permit);\n        keys(permit).forEach(name => {\n          // Use gopd to avoid invoking an accessor property.\n          // Accessor properties for which permit !== 'maybeAccessor'\n          // are caught later by clean().\n          const desc = gopd(value, name);\n          if (desc) {\n            register(desc.value, permit[name]);\n          }\n        });\n      }\n      register(rootValue, rootPermit);\n    }\n\n    /**\n     * Should the property named {@code name} be whitelisted on the\n     * {@code base} object, and if so, with what Permit?\n     *\n     * <p>If it should be permitted, return the Permit (where Permit =\n     * true | \"maybeAccessor\" | \"*\" | Record(Permit)), all of which are\n     * truthy. If it should not be permitted, return false.\n     */\n    function getPermit(base, name) {\n      let permit = whiteTable.get(base);\n      if (permit) {\n        if (hop(permit, name)) {\n          return permit[name];\n        }\n        // Allow escaping of magical names like '__proto__'.\n        if (hop(permit, `ESCAPE${name}`)) {\n          return permit[`ESCAPE${name}`];\n        }\n      }\n      // eslint-disable-next-line no-constant-condition\n      while (true) {\n        base = getProto(base); // eslint-disable-line no-param-reassign\n        if (base === null) {\n          return false;\n        }\n        permit = whiteTable.get(base);\n        if (permit && hop(permit, name)) {\n          const result = permit[name];\n          if (result === '*') {\n            return result;\n          }\n          return false;\n        }\n      }\n    }\n\n    /**\n     * Removes all non-whitelisted properties found by recursively and\n     * reflectively walking own property chains.\n     *\n     * <p>Inherited properties are not checked, because we require that\n     * inherited-from objects are otherwise reachable by this traversal.\n     */\n    function clean(value, prefix, num) {\n      if (value !== Object(value)) {\n        return;\n      }\n      if (cleaning.get(value)) {\n        return;\n      }\n\n      const proto = getProto(value);\n      if (proto !== null && !whiteTable.has(proto)) {\n        // reportItemProblem(rootReports, ses.severities.NOT_ISOLATED,\n        //                  'unexpected intrinsic', prefix + '.__proto__');\n        throw new Error(`unexpected intrinsic ${prefix}.__proto__`);\n      }\n\n      cleaning.set(value, true);\n      gopn(value).forEach(name => {\n        const path = prefix + (prefix ? '.' : '') + name;\n        const p = getPermit(value, name);\n        if (p) {\n          const desc = gopd(value, name);\n          if (hop(desc, 'value')) {\n            // Is a data property\n            const subValue = desc.value;\n            clean(subValue, path);\n          } else if (p !== 'maybeAccessor') {\n            // We are not saying that it is safe for the prop to be\n            // unexpectedly an accessor; rather, it will be deleted\n            // and thus made safe.\n            // reportProperty(ses.severities.SAFE_SPEC_VIOLATION,\n            //               'Not a data property', path);\n            delete value[name]; // eslint-disable-line no-param-reassign\n          } else {\n            clean(desc.get, `${path}<getter>`);\n            clean(desc.set, `${path}<setter>`);\n          }\n        } else {\n          delete value[name]; // eslint-disable-line no-param-reassign\n        }\n      });\n    }\n\n    addToWhiteTable(global, whitelist.namedIntrinsics);\n    const intr = getAnonIntrinsics(global);\n    addToWhiteTable(intr, whitelist.anonIntrinsics);\n    clean(global, '');\n  }\n\n  // Copyright (C) 2011 Google Inc.\n  // Copyright (C) 2018 Agoric\n  //\n  // Licensed under the Apache License, Version 2.0 (the \"License\");\n  // you may not use this file except in compliance with the License.\n  // You may obtain a copy of the License at\n  //\n  // https://www.apache.org/licenses/LICENSE-2.0\n  //\n  // Unless required by applicable law or agreed to in writing, software\n  // distributed under the License is distributed on an \"AS IS\" BASIS,\n  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  // See the License for the specific language governing permissions and\n  // limitations under the License.\n\n  // TODO(erights): We should test for\n  // We now have a reason to omit Proxy from the whitelist.\n  // The makeBrandTester in repairES5 uses Allen's trick at\n  // https://esdiscuss.org/topic/tostringtag-spoofing-for-null-and-undefined#content-59\n  // , but testing reveals that, on FF 35.0.1, a proxy on an exotic\n  // object X will pass this brand test when X will. This is fixed as of\n  // FF Nightly 38.0a1.\n\n  /**\n   * <p>Qualifying platforms generally include all JavaScript platforms\n   * shown on <a href=\"http://kangax.github.com/es5-compat-table/\"\n   * >ECMAScript 5 compatibility table</a> that implement {@code\n   * Object.getOwnPropertyNames}. At the time of this writing,\n   * qualifying browsers already include the latest released versions of\n   * Internet Explorer (9), Firefox (4), Chrome (11), and Safari\n   * (5.0.5), their corresponding standalone (e.g., server-side) JavaScript\n   * engines, Rhino 1.73, and BESEN.\n   *\n   * <p>On such not-quite-ES5 platforms, some elements of these\n   * emulations may lose SES safety, as enumerated in the comment on\n   * each problem record in the {@code baseProblems} and {@code\n   * supportedProblems} array below. The platform must at least provide\n   * {@code Object.getOwnPropertyNames}, because it cannot reasonably be\n   * emulated.\n   *\n   * <p>This file is useful by itself, as it has no dependencies on the\n   * rest of SES. It creates no new global bindings, but merely repairs\n   * standard globals or standard elements reachable from standard\n   * globals. If the future-standard {@code WeakMap} global is present,\n   * as it is currently on FF7.0a1, then it will repair it in place. The\n   * one non-standard element that this file uses is {@code console} if\n   * present, in order to report the repairs it found necessary, in\n   * which case we use its {@code log, info, warn}, and {@code error}\n   * methods. If {@code console.log} is absent, then this file performs\n   * its repairs silently.\n   *\n   * <p>Generally, this file should be run as the first script in a\n   * JavaScript context (i.e. a browser frame), as it relies on other\n   * primordial objects and methods not yet being perturbed.\n   *\n   * <p>TODO(erights): This file tries to protect itself from some\n   * post-initialization perturbation by stashing some of the\n   * primordials it needs for later use, but this attempt is currently\n   * incomplete. We need to revisit this when we support Confined-ES5,\n   * as a variant of SES in which the primordials are not frozen. See\n   * previous failed attempt at <a\n   * href=\"https://codereview.appspot.com/5278046/\" >Speeds up\n   * WeakMap. Preparing to support unfrozen primordials.</a>. From\n   * analysis of this failed attempt, it seems that the only practical\n   * way to support CES is by use of two frames, where most of initSES\n   * runs in a SES frame, and so can avoid worrying about most of these\n   * perturbations.\n   */\n  function getAnonIntrinsics$1(global) {\n\n    const gopd = Object.getOwnPropertyDescriptor;\n    const getProto = Object.getPrototypeOf;\n\n    // ////////////// Undeniables and Intrinsics //////////////\n\n    /**\n     * The undeniables are the primordial objects which are ambiently\n     * reachable via compositions of strict syntax, primitive wrapping\n     * (new Object(x)), and prototype navigation (the equivalent of\n     * Object.getPrototypeOf(x) or x.__proto__). Although we could in\n     * theory monkey patch primitive wrapping or prototype navigation,\n     * we won't. Hence, without parsing, the following are undeniable no\n     * matter what <i>other</i> monkey patching we do to the primordial\n     * environment.\n     */\n\n    // The first element of each undeniableTuple is a string used to\n    // name the undeniable object for reporting purposes. It has no\n    // other programmatic use.\n    //\n    // The second element of each undeniableTuple should be the\n    // undeniable itself.\n    //\n    // The optional third element of the undeniableTuple, if present,\n    // should be an example of syntax, rather than use of a monkey\n    // patchable API, evaluating to a value from which the undeniable\n    // object in the second element can be reached by only the\n    // following steps:\n    // If the value is primitve, convert to an Object wrapper.\n    // Is the resulting object either the undeniable object, or does\n    // it inherit directly from the undeniable object?\n\n    function* aStrictGenerator() {} // eslint-disable-line no-empty-function\n    const Generator = getProto(aStrictGenerator);\n    async function* aStrictAsyncGenerator() {} // eslint-disable-line no-empty-function\n    const AsyncGenerator = getProto(aStrictAsyncGenerator);\n    async function aStrictAsyncFunction() {} // eslint-disable-line no-empty-function\n    const AsyncFunctionPrototype = getProto(aStrictAsyncFunction);\n\n    // TODO: this is dead code, but could be useful: make this the\n    // 'undeniables' object available via some API.\n\n    const undeniableTuples = [\n      ['Object.prototype', Object.prototype, {}],\n      ['Function.prototype', Function.prototype, function foo() {}],\n      ['Array.prototype', Array.prototype, []],\n      ['RegExp.prototype', RegExp.prototype, /x/],\n      ['Boolean.prototype', Boolean.prototype, true],\n      ['Number.prototype', Number.prototype, 1],\n      ['String.prototype', String.prototype, 'x'],\n      ['%Generator%', Generator, aStrictGenerator],\n      ['%AsyncGenerator%', AsyncGenerator, aStrictAsyncGenerator],\n      ['%AsyncFunction%', AsyncFunctionPrototype, aStrictAsyncFunction],\n    ];\n\n    undeniableTuples.forEach(tuple => {\n      const name = tuple[0];\n      const undeniable = tuple[1];\n      let start = tuple[2];\n      if (start === undefined) {\n        return;\n      }\n      start = Object(start);\n      if (undeniable === start) {\n        return;\n      }\n      if (undeniable === getProto(start)) {\n        return;\n      }\n      throw new Error(`Unexpected undeniable: ${undeniable}`);\n    });\n\n    function registerIteratorProtos(registery, base, name) {\n      const iteratorSym =\n        (global.Symbol && global.Symbol.iterator) || '@@iterator'; // used instead of a symbol on FF35\n\n      if (base[iteratorSym]) {\n        const anIter = base[iteratorSym]();\n        const anIteratorPrototype = getProto(anIter);\n        registery[name] = anIteratorPrototype; // eslint-disable-line no-param-reassign\n        const anIterProtoBase = getProto(anIteratorPrototype);\n        if (anIterProtoBase !== Object.prototype) {\n          if (!registery.IteratorPrototype) {\n            if (getProto(anIterProtoBase) !== Object.prototype) {\n              throw new Error(\n                '%IteratorPrototype%.__proto__ was not Object.prototype',\n              );\n            }\n            registery.IteratorPrototype = anIterProtoBase; // eslint-disable-line no-param-reassign\n          } else if (registery.IteratorPrototype !== anIterProtoBase) {\n            throw new Error(`unexpected %${name}%.__proto__`);\n          }\n        }\n      }\n    }\n\n    /**\n     * Get the intrinsics not otherwise reachable by named own property\n     * traversal. See\n     * https://people.mozilla.org/~jorendorff/es6-draft.html#sec-well-known-intrinsic-objects\n     * and the instrinsics section of whitelist.js\n     *\n     * <p>Unlike getUndeniables(), the result of sampleAnonIntrinsics()\n     * does depend on the current state of the primordials, so we must\n     * run this again after all other relevant monkey patching is done,\n     * in order to properly initialize cajaVM.intrinsics\n     */\n\n    // TODO: we can probably unwrap this into the outer function, and stop\n    // using a separately named 'sampleAnonIntrinsics'\n    function sampleAnonIntrinsics() {\n      const result = {};\n\n      // If there are still other ThrowTypeError objects left after\n      // noFuncPoison-ing, this should be caught by\n      // test_THROWTYPEERROR_NOT_UNIQUE below, so we assume here that\n      // this is the only surviving ThrowTypeError intrinsic.\n      // eslint-disable-next-line prefer-rest-params\n      result.ThrowTypeError = gopd(arguments, 'callee').get;\n\n      // Get the ES6 %ArrayIteratorPrototype%,\n      // %StringIteratorPrototype%, %MapIteratorPrototype%,\n      // %SetIteratorPrototype% and %IteratorPrototype% intrinsics, if\n      // present.\n      registerIteratorProtos(result, [], 'ArrayIteratorPrototype');\n      registerIteratorProtos(result, '', 'StringIteratorPrototype');\n      if (typeof Map === 'function') {\n        registerIteratorProtos(result, new Map(), 'MapIteratorPrototype');\n      }\n      if (typeof Set === 'function') {\n        registerIteratorProtos(result, new Set(), 'SetIteratorPrototype');\n      }\n\n      // Get the ES6 %GeneratorFunction% intrinsic, if present.\n      if (getProto(Generator) !== Function.prototype) {\n        throw new Error('Generator.__proto__ was not Function.prototype');\n      }\n      const GeneratorFunction = Generator.constructor;\n      if (getProto(GeneratorFunction) !== Function.prototype.constructor) {\n        throw new Error(\n          'GeneratorFunction.__proto__ was not Function.prototype.constructor',\n        );\n      }\n      result.GeneratorFunction = GeneratorFunction;\n      const genProtoBase = getProto(Generator.prototype);\n      if (genProtoBase !== result.IteratorPrototype) {\n        throw new Error('Unexpected Generator.prototype.__proto__');\n      }\n\n      // Get the ES6 %AsyncGeneratorFunction% intrinsic, if present.\n      if (getProto(AsyncGenerator) !== Function.prototype) {\n        throw new Error('AsyncGenerator.__proto__ was not Function.prototype');\n      }\n      const AsyncGeneratorFunction = AsyncGenerator.constructor;\n      if (getProto(AsyncGeneratorFunction) !== Function.prototype.constructor) {\n        throw new Error(\n          'AsyncGeneratorFunction.__proto__ was not Function.prototype.constructor',\n        );\n      }\n      result.AsyncGeneratorFunction = AsyncGeneratorFunction;\n      const AsyncGeneratorPrototype = AsyncGenerator.prototype;\n      result.AsyncIteratorPrototype = getProto(AsyncGeneratorPrototype);\n      // it appears that the only way to get an AsyncIteratorPrototype is\n      // through this getProto() process, so there's nothing to check it\n      // against\n      if (getProto(result.AsyncIteratorPrototype) !== Object.prototype) {\n        throw new Error(\n          'AsyncIteratorPrototype.__proto__ was not Object.prototype',\n        );\n      }\n\n      // Get the ES6 %AsyncFunction% intrinsic, if present.\n      if (getProto(AsyncFunctionPrototype) !== Function.prototype) {\n        throw new Error(\n          'AsyncFunctionPrototype.__proto__ was not Function.prototype',\n        );\n      }\n      const AsyncFunction = AsyncFunctionPrototype.constructor;\n      if (getProto(AsyncFunction) !== Function.prototype.constructor) {\n        throw new Error(\n          'AsyncFunction.__proto__ was not Function.prototype.constructor',\n        );\n      }\n      result.AsyncFunction = AsyncFunction;\n\n      // Get the ES6 %TypedArray% intrinsic, if present.\n      (function getTypedArray() {\n        if (!global.Float32Array) {\n          return;\n        }\n        const TypedArray = getProto(global.Float32Array);\n        if (TypedArray === Function.prototype) {\n          return;\n        }\n        if (getProto(TypedArray) !== Function.prototype) {\n          // http://bespin.cz/~ondras/html/classv8_1_1ArrayBufferView.html\n          // has me worried that someone might make such an intermediate\n          // object visible.\n          throw new Error('TypedArray.__proto__ was not Function.prototype');\n        }\n        result.TypedArray = TypedArray;\n      })();\n\n      Object.keys(result).forEach(name => {\n        if (result[name] === undefined) {\n          throw new Error(`Malformed intrinsic: ${name}`);\n        }\n      });\n\n      return result;\n    }\n\n    return sampleAnonIntrinsics();\n  }\n\n  function getNamedIntrinsics(unsafeGlobal, whitelist) {\n    const { defineProperty, getOwnPropertyDescriptor, ownKeys } = Reflect;\n\n    const namedIntrinsics = {};\n\n    const propertyNames = ownKeys(whitelist.namedIntrinsics);\n\n    for (const name of propertyNames) {\n      const desc = getOwnPropertyDescriptor(unsafeGlobal, name);\n      if (desc) {\n        // Abort if an accessor is found on the unsafe global object\n        // instead of a data property. We should never get into this\n        // non standard situation.\n        if ('get' in desc || 'set' in desc) {\n          throw new TypeError(`unexpected accessor on global property: ${name}`);\n        }\n\n        defineProperty(namedIntrinsics, name, desc);\n      }\n    }\n\n    return namedIntrinsics;\n  }\n\n  function getAllPrimordials(global, anonIntrinsics) {\n\n    const root = {\n      global, // global plus all the namedIntrinsics\n      anonIntrinsics,\n    };\n    // todo: re-examine exactly which \"global\" we're freezing\n\n    return root;\n  }\n\n  function getAllPrimordials$1(namedIntrinsics, anonIntrinsics) {\n\n    const root = {\n      namedIntrinsics,\n      anonIntrinsics,\n    };\n\n    return root;\n  }\n\n  // Copyright (C) 2011 Google Inc.\n  // Copyright (C) 2018 Agoric\n  //\n  // Licensed under the Apache License, Version 2.0 (the \"License\");\n  // you may not use this file except in compliance with the License.\n  // You may obtain a copy of the License at\n  //\n  // http://www.apache.org/licenses/LICENSE-2.0\n  //\n  // Unless required by applicable law or agreed to in writing, software\n  // distributed under the License is distributed on an \"AS IS\" BASIS,\n  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  // See the License for the specific language governing permissions and\n  // limitations under the License.\n\n  /**\n   * @fileoverview Exports {@code ses.whitelist}, a recursively defined\n   * JSON record enumerating all the naming paths in the ES5.1 spec,\n   * those de-facto extensions that we judge to be safe, and SES and\n   * Dr. SES extensions provided by the SES runtime.\n   *\n   * <p>Assumes only ES3. Compatible with ES5, ES5-strict, or\n   * anticipated ES6.\n   *\n   * //provides ses.whitelist\n   * @author Mark S. Miller,\n   * @overrides ses, whitelistModule\n   */\n\n  /**\n   * <p>Each JSON record enumerates the disposition of the properties on\n   * some corresponding primordial object, with the root record\n   * representing the global object. For each such record, the values\n   * associated with its property names can be\n   * <ul>\n   * <li>Another record, in which case this property is simply\n   *     whitelisted and that next record represents the disposition of\n   *     the object which is its value. For example, {@code \"Object\"}\n   *     leads to another record explaining what properties {@code\n   *     \"Object\"} may have and how each such property, if present,\n   *     and its value should be tamed.\n   * <li>true, in which case this property is simply whitelisted. The\n   *     value associated with that property is still traversed and\n   *     tamed, but only according to the taming of the objects that\n   *     object inherits from. For example, {@code \"Object.freeze\"} leads\n   *     to true, meaning that the {@code \"freeze\"} property of {@code\n   *     Object} should be whitelisted and the value of the property (a\n   *     function) should be further tamed only according to the\n   *     markings of the other objects it inherits from, like {@code\n   *     \"Function.prototype\"} and {@code \"Object.prototype\").\n   *     If the property is an accessor property, it is not\n   *     whitelisted (as invoking an accessor might not be meaningful,\n   *     yet the accessor might return a value needing taming).\n   * <li>\"maybeAccessor\", in which case this accessor property is simply\n   *     whitelisted and its getter and/or setter are tamed according to\n   *     inheritance. If the property is not an accessor property, its\n   *     value is tamed according to inheritance.\n   * <li>\"*\", in which case this property on this object is whitelisted,\n   *     as is this property as inherited by all objects that inherit\n   *     from this object. The values associated with all such properties\n   *     are still traversed and tamed, but only according to the taming\n   *     of the objects that object inherits from. For example, {@code\n   *     \"Object.prototype.constructor\"} leads to \"*\", meaning that we\n   *     whitelist the {@code \"constructor\"} property on {@code\n   *     Object.prototype} and on every object that inherits from {@code\n   *     Object.prototype} that does not have a conflicting mark. Each\n   *     of these is tamed as if with true, so that the value of the\n   *     property is further tamed according to what other objects it\n   *     inherits from.\n   * <li>false, which suppresses permission inherited via \"*\".\n   * </ul>\n   *\n   * <p>TODO: We want to do for constructor: something weaker than '*',\n   * but rather more like what we do for [[Prototype]] links, which is\n   * that it is whitelisted only if it points at an object which is\n   * otherwise reachable by a whitelisted path.\n   *\n   * <p>The members of the whitelist are either\n   * <ul>\n   * <li>(uncommented) defined by the ES5.1 normative standard text,\n   * <li>(questionable) provides a source of non-determinism, in\n   *     violation of pure object-capability rules, but allowed anyway\n   *     since we've given up on restricting JavaScript to a\n   *     deterministic subset.\n   * <li>(ES5 Appendix B) common elements of de facto JavaScript\n   *     described by the non-normative Appendix B.\n   * <li>(Harmless whatwg) extensions documented at\n   *     <a href=\"http://wiki.whatwg.org/wiki/Web_ECMAScript\"\n   *     >http://wiki.whatwg.org/wiki/Web_ECMAScript</a> that seem to be\n   *     harmless. Note that the RegExp constructor extensions on that\n   *     page are <b>not harmless</b> and so must not be whitelisted.\n   * <li>(ES-Harmony proposal) accepted as \"proposal\" status for\n   *     EcmaScript-Harmony.\n   * </ul>\n   *\n   * <p>With the above encoding, there are some sensible whitelists we\n   * cannot express, such as marking a property both with \"*\" and a JSON\n   * record. This is an expedient decision based only on not having\n   * encountered such a need. Should we need this extra expressiveness,\n   * we'll need to refactor to enable a different encoding.\n   *\n   * <p>We factor out {@code true} into the variable {@code t} just to\n   * get a bit better compression from simple minifiers.\n   */\n\n  const t = true;\n  const j = true; // included in the Jessie runtime\n\n  let TypedArrayWhitelist; // defined and used below\n\n  var whitelist = {\n    // The accessible intrinsics which are not reachable by own\n    // property name traversal are listed here so that they are\n    // processed by the whitelist, although this also makes them\n    // accessible by this path.  See\n    // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-well-known-intrinsic-objects\n    // Of these, ThrowTypeError is the only one from ES5. All the\n    // rest were introduced in ES6.\n    anonIntrinsics: {\n      ThrowTypeError: {},\n      IteratorPrototype: {\n        // 25.1\n        // Technically, for SES-on-ES5, we should not need to\n        // whitelist 'next'. However, browsers are accidentally\n        // relying on it\n        // https://bugs.chromium.org/p/v8/issues/detail?id=4769#\n        // https://bugs.webkit.org/show_bug.cgi?id=154475\n        // and we will be whitelisting it as we transition to ES6\n        // anyway, so we unconditionally whitelist it now.\n        next: '*',\n        constructor: false,\n      },\n      ArrayIteratorPrototype: {},\n      StringIteratorPrototype: {},\n      MapIteratorPrototype: {},\n      SetIteratorPrototype: {},\n      // AsyncIteratorPrototype does not inherit from IteratorPrototype\n      AsyncIteratorPrototype: {},\n\n      // The %GeneratorFunction% intrinsic is the constructor of\n      // generator functions, so %GeneratorFunction%.prototype is\n      // the %Generator% intrinsic, which all generator functions\n      // inherit from. A generator function is effectively the\n      // constructor of its generator instances, so, for each\n      // generator function (e.g., \"g1\" on the diagram at\n      // http://people.mozilla.org/~jorendorff/figure-2.png )\n      // its .prototype is a prototype that its instances inherit\n      // from. Paralleling this structure, %Generator%.prototype,\n      // i.e., %GeneratorFunction%.prototype.prototype, is the\n      // object that all these generator function prototypes inherit\n      // from. The .next, .return and .throw that generator\n      // instances respond to are actually the builtin methods they\n      // inherit from this object.\n      GeneratorFunction: {\n        // 25.2\n        length: '*', // Not sure why this is needed\n        prototype: {\n          // 25.4\n          prototype: {\n            next: '*',\n            return: '*',\n            throw: '*',\n            constructor: '*', // Not sure why this is needed\n          },\n        },\n      },\n      AsyncGeneratorFunction: {\n        // 25.3\n        length: '*',\n        prototype: {\n          // 25.5\n          prototype: {\n            next: '*',\n            return: '*',\n            throw: '*',\n            constructor: '*', // Not sure why this is needed\n          },\n        },\n      },\n      AsyncFunction: {\n        // 25.7\n        length: '*',\n        prototype: '*',\n      },\n\n      TypedArray: (TypedArrayWhitelist = {\n        // 22.2\n        length: '*', // does not inherit from Function.prototype on Chrome\n        name: '*', // ditto\n        from: t,\n        of: t,\n        BYTES_PER_ELEMENT: '*',\n        prototype: {\n          buffer: 'maybeAccessor',\n          byteLength: 'maybeAccessor',\n          byteOffset: 'maybeAccessor',\n          copyWithin: '*',\n          entries: '*',\n          every: '*',\n          fill: '*',\n          filter: '*',\n          find: '*',\n          findIndex: '*',\n          forEach: '*',\n          includes: '*',\n          indexOf: '*',\n          join: '*',\n          keys: '*',\n          lastIndexOf: '*',\n          length: 'maybeAccessor',\n          map: '*',\n          reduce: '*',\n          reduceRight: '*',\n          reverse: '*',\n          set: '*',\n          slice: '*',\n          some: '*',\n          sort: '*',\n          subarray: '*',\n          values: '*',\n          BYTES_PER_ELEMENT: '*',\n        },\n      }),\n    },\n\n    namedIntrinsics: {\n      // In order according to\n      // http://www.ecma-international.org/ecma-262/ with chapter\n      // numbers where applicable\n\n      // 18 The Global Object\n\n      // 18.1\n      Infinity: j,\n      NaN: j,\n      undefined: j,\n\n      // 18.2\n      eval: j, // realms-shim depends on having indirect eval in the globals\n      isFinite: t,\n      isNaN: t,\n      parseFloat: t,\n      parseInt: t,\n      decodeURI: t,\n      decodeURIComponent: t,\n      encodeURI: t,\n      encodeURIComponent: t,\n\n      // 19 Fundamental Objects\n\n      Object: {\n        // 19.1\n        assign: t, // ES-Harmony\n        create: t,\n        defineProperties: t, // ES-Harmony\n        defineProperty: t,\n        entries: t, // ES-Harmony\n        freeze: j,\n        getOwnPropertyDescriptor: t,\n        getOwnPropertyDescriptors: t, // proposed ES-Harmony\n        getOwnPropertyNames: t,\n        getOwnPropertySymbols: t, // ES-Harmony\n        getPrototypeOf: t,\n        is: j, // ES-Harmony\n        isExtensible: t,\n        isFrozen: t,\n        isSealed: t,\n        keys: t,\n        preventExtensions: j,\n        seal: j,\n        setPrototypeOf: t, // ES-Harmony\n        values: t, // ES-Harmony\n\n        prototype: {\n          // B.2.2\n          // We need to prefix __proto__ with ESCAPE so that it doesn't\n          // just change the prototype of this object.\n          ESCAPE__proto__: 'maybeAccessor',\n          __defineGetter__: t,\n          __defineSetter__: t,\n          __lookupGetter__: t,\n          __lookupSetter__: t,\n\n          constructor: '*',\n          hasOwnProperty: t,\n          isPrototypeOf: t,\n          propertyIsEnumerable: t,\n          toLocaleString: '*',\n          toString: '*',\n          valueOf: '*',\n\n          // Generally allowed\n          [Symbol.iterator]: '*',\n          [Symbol.toPrimitive]: '*',\n          [Symbol.toStringTag]: '*',\n          [Symbol.unscopables]: '*',\n        },\n      },\n\n      Function: {\n        // 19.2\n        length: t,\n        prototype: {\n          apply: t,\n          bind: t,\n          call: t,\n          [Symbol.hasInstance]: '*',\n\n          // 19.2.4 instances\n          length: '*',\n          name: '*', // ES-Harmony\n          prototype: '*',\n          arity: '*', // non-std, deprecated in favor of length\n\n          // Generally allowed\n          [Symbol.species]: 'maybeAccessor', // ES-Harmony?\n        },\n      },\n\n      Boolean: {\n        // 19.3\n        prototype: t,\n      },\n\n      Symbol: {\n        // 19.4               all ES-Harmony\n        asyncIterator: t, // proposed? ES-Harmony\n        for: t,\n        hasInstance: t,\n        isConcatSpreadable: t,\n        iterator: t,\n        keyFor: t,\n        match: t,\n        matchAll: t,\n        replace: t,\n        search: t,\n        species: t,\n        split: t,\n        toPrimitive: t,\n        toStringTag: t,\n        unscopables: t,\n        prototype: t,\n      },\n\n      Error: {\n        // 19.5\n        prototype: {\n          name: '*',\n          message: '*',\n        },\n      },\n      // In ES6 the *Error \"subclasses\" of Error inherit from Error,\n      // since constructor inheritance generally mirrors prototype\n      // inheritance. As explained at\n      // https://code.google.com/p/google-caja/issues/detail?id=1963 ,\n      // debug.js hides away the Error constructor itself, and so needs\n      // to rewire these \"subclass\" constructors. Until we have a more\n      // general mechanism, please maintain this list of whitelisted\n      // subclasses in sync with the list in debug.js of subclasses to\n      // be rewired.\n      EvalError: {\n        prototype: t,\n      },\n      RangeError: {\n        prototype: t,\n      },\n      ReferenceError: {\n        prototype: t,\n      },\n      SyntaxError: {\n        prototype: t,\n      },\n      TypeError: {\n        prototype: t,\n      },\n      URIError: {\n        prototype: t,\n      },\n\n      // 20 Numbers and Dates\n\n      Number: {\n        // 20.1\n        EPSILON: t, // ES-Harmony\n        isFinite: j, // ES-Harmony\n        isInteger: t, // ES-Harmony\n        isNaN: j, // ES-Harmony\n        isSafeInteger: j, // ES-Harmony\n        MAX_SAFE_INTEGER: j, // ES-Harmony\n        MAX_VALUE: t,\n        MIN_SAFE_INTEGER: j, // ES-Harmony\n        MIN_VALUE: t,\n        NaN: t,\n        NEGATIVE_INFINITY: t,\n        parseFloat: t, // ES-Harmony\n        parseInt: t, // ES-Harmony\n        POSITIVE_INFINITY: t,\n        prototype: {\n          toExponential: t,\n          toFixed: t,\n          toPrecision: t,\n        },\n      },\n\n      Math: {\n        // 20.2\n        E: j,\n        LN10: j,\n        LN2: j,\n        LOG10E: t,\n        LOG2E: t,\n        PI: j,\n        SQRT1_2: t,\n        SQRT2: t,\n\n        abs: j,\n        acos: t,\n        acosh: t, // ES-Harmony\n        asin: t,\n        asinh: t, // ES-Harmony\n        atan: t,\n        atanh: t, // ES-Harmony\n        atan2: t,\n        cbrt: t, // ES-Harmony\n        ceil: j,\n        clz32: t, // ES-Harmony\n        cos: t,\n        cosh: t, // ES-Harmony\n        exp: t,\n        expm1: t, // ES-Harmony\n        floor: j,\n        fround: t, // ES-Harmony\n        hypot: t, // ES-Harmony\n        imul: t, // ES-Harmony\n        log: j,\n        log1p: t, // ES-Harmony\n        log10: j, // ES-Harmony\n        log2: j, // ES-Harmony\n        max: j,\n        min: j,\n        pow: j,\n        random: t, // questionable\n        round: j,\n        sign: t, // ES-Harmony\n        sin: t,\n        sinh: t, // ES-Harmony\n        sqrt: j,\n        tan: t,\n        tanh: t, // ES-Harmony\n        trunc: j, // ES-Harmony\n      },\n\n      // no-arg Date constructor is questionable\n      Date: {\n        // 20.3\n        now: t, // questionable\n        parse: t,\n        UTC: t,\n        prototype: {\n          // Note: coordinate this list with maintanence of repairES5.js\n          getDate: t,\n          getDay: t,\n          getFullYear: t,\n          getHours: t,\n          getMilliseconds: t,\n          getMinutes: t,\n          getMonth: t,\n          getSeconds: t,\n          getTime: t,\n          getTimezoneOffset: t,\n          getUTCDate: t,\n          getUTCDay: t,\n          getUTCFullYear: t,\n          getUTCHours: t,\n          getUTCMilliseconds: t,\n          getUTCMinutes: t,\n          getUTCMonth: t,\n          getUTCSeconds: t,\n          setDate: t,\n          setFullYear: t,\n          setHours: t,\n          setMilliseconds: t,\n          setMinutes: t,\n          setMonth: t,\n          setSeconds: t,\n          setTime: t,\n          setUTCDate: t,\n          setUTCFullYear: t,\n          setUTCHours: t,\n          setUTCMilliseconds: t,\n          setUTCMinutes: t,\n          setUTCMonth: t,\n          setUTCSeconds: t,\n          toDateString: t,\n          toISOString: t,\n          toJSON: t,\n          toLocaleDateString: t,\n          toLocaleString: t,\n          toLocaleTimeString: t,\n          toTimeString: t,\n          toUTCString: t,\n\n          // B.2.4\n          getYear: t,\n          setYear: t,\n          toGMTString: t,\n        },\n      },\n\n      // 21 Text Processing\n\n      String: {\n        // 21.2\n        fromCharCode: j,\n        fromCodePoint: t, // ES-Harmony\n        raw: j, // ES-Harmony\n        prototype: {\n          charAt: t,\n          charCodeAt: t,\n          codePointAt: t, // ES-Harmony\n          concat: t,\n          endsWith: j, // ES-Harmony\n          includes: t, // ES-Harmony\n          indexOf: j,\n          lastIndexOf: j,\n          localeCompare: t,\n          match: t,\n          normalize: t, // ES-Harmony\n          padEnd: t, // ES-Harmony\n          padStart: t, // ES-Harmony\n          repeat: t, // ES-Harmony\n          replace: t,\n          search: t,\n          slice: j,\n          split: t,\n          startsWith: j, // ES-Harmony\n          substring: t,\n          toLocaleLowerCase: t,\n          toLocaleUpperCase: t,\n          toLowerCase: t,\n          toUpperCase: t,\n          trim: t,\n\n          // B.2.3\n          substr: t,\n          anchor: t,\n          big: t,\n          blink: t,\n          bold: t,\n          fixed: t,\n          fontcolor: t,\n          fontsize: t,\n          italics: t,\n          link: t,\n          small: t,\n          strike: t,\n          sub: t,\n          sup: t,\n\n          trimLeft: t, // non-standard\n          trimRight: t, // non-standard\n\n          // 21.1.4 instances\n          length: '*',\n        },\n      },\n\n      RegExp: {\n        // 21.2\n        prototype: {\n          exec: t,\n          flags: 'maybeAccessor',\n          global: 'maybeAccessor',\n          ignoreCase: 'maybeAccessor',\n          [Symbol.match]: '*', // ES-Harmony\n          multiline: 'maybeAccessor',\n          [Symbol.replace]: '*', // ES-Harmony\n          [Symbol.search]: '*', // ES-Harmony\n          source: 'maybeAccessor',\n          [Symbol.split]: '*', // ES-Harmony\n          sticky: 'maybeAccessor',\n          test: t,\n          unicode: 'maybeAccessor', // ES-Harmony\n          dotAll: 'maybeAccessor', // proposed ES-Harmony\n\n          // B.2.5\n          compile: false, // UNSAFE. Purposely suppressed\n\n          // 21.2.6 instances\n          lastIndex: '*',\n          options: '*', // non-std\n        },\n      },\n\n      // 22 Indexed Collections\n\n      Array: {\n        // 22.1\n        from: j,\n        isArray: t,\n        of: j, // ES-Harmony?\n        prototype: {\n          concat: t,\n          copyWithin: t, // ES-Harmony\n          entries: t, // ES-Harmony\n          every: t,\n          fill: t, // ES-Harmony\n          filter: j,\n          find: t, // ES-Harmony\n          findIndex: t, // ES-Harmony\n          forEach: j,\n          includes: t, // ES-Harmony\n          indexOf: j,\n          join: t,\n          keys: t, // ES-Harmony\n          lastIndexOf: j,\n          map: j,\n          pop: j,\n          push: j,\n          reduce: j,\n          reduceRight: j,\n          reverse: t,\n          shift: j,\n          slice: j,\n          some: t,\n          sort: t,\n          splice: t,\n          unshift: j,\n          values: t, // ES-Harmony\n\n          // 22.1.4 instances\n          length: '*',\n        },\n      },\n\n      // 22.2 Typed Array stuff\n      // TODO: Not yet organized according to spec order\n\n      Int8Array: TypedArrayWhitelist,\n      Uint8Array: TypedArrayWhitelist,\n      Uint8ClampedArray: TypedArrayWhitelist,\n      Int16Array: TypedArrayWhitelist,\n      Uint16Array: TypedArrayWhitelist,\n      Int32Array: TypedArrayWhitelist,\n      Uint32Array: TypedArrayWhitelist,\n      Float32Array: TypedArrayWhitelist,\n      Float64Array: TypedArrayWhitelist,\n\n      // 23 Keyed Collections          all ES-Harmony\n\n      Map: {\n        // 23.1\n        prototype: {\n          clear: j,\n          delete: j,\n          entries: j,\n          forEach: j,\n          get: j,\n          has: j,\n          keys: j,\n          set: j,\n          size: 'maybeAccessor',\n          values: j,\n        },\n      },\n\n      Set: {\n        // 23.2\n        prototype: {\n          add: j,\n          clear: j,\n          delete: j,\n          entries: j,\n          forEach: j,\n          has: j,\n          keys: j,\n          size: 'maybeAccessor',\n          values: j,\n        },\n      },\n\n      WeakMap: {\n        // 23.3\n        prototype: {\n          // Note: coordinate this list with maintenance of repairES5.js\n          delete: j,\n          get: j,\n          has: j,\n          set: j,\n        },\n      },\n\n      WeakSet: {\n        // 23.4\n        prototype: {\n          add: j,\n          delete: j,\n          has: j,\n        },\n      },\n\n      // 24 Structured Data\n\n      ArrayBuffer: {\n        // 24.1            all ES-Harmony\n        isView: t,\n        length: t, // does not inherit from Function.prototype on Chrome\n        name: t, // ditto\n        prototype: {\n          byteLength: 'maybeAccessor',\n          slice: t,\n        },\n      },\n\n      // 24.2 TODO: Omitting SharedArrayBuffer for now\n\n      DataView: {\n        // 24.3               all ES-Harmony\n        length: t, // does not inherit from Function.prototype on Chrome\n        name: t, // ditto\n        BYTES_PER_ELEMENT: '*', // non-standard. really?\n        prototype: {\n          buffer: 'maybeAccessor',\n          byteOffset: 'maybeAccessor',\n          byteLength: 'maybeAccessor',\n          getFloat32: t,\n          getFloat64: t,\n          getInt8: t,\n          getInt16: t,\n          getInt32: t,\n          getUint8: t,\n          getUint16: t,\n          getUint32: t,\n          setFloat32: t,\n          setFloat64: t,\n          setInt8: t,\n          setInt16: t,\n          setInt32: t,\n          setUint8: t,\n          setUint16: t,\n          setUint32: t,\n        },\n      },\n\n      // 24.4 TODO: Omitting Atomics for now\n\n      JSON: {\n        // 24.5\n        parse: j,\n        stringify: j,\n      },\n\n      // 25 Control Abstraction Objects\n\n      Promise: {\n        // 25.4\n        all: j,\n        race: j,\n        reject: j,\n        resolve: j,\n        makeHandled: t, // eventual-send\n        prototype: {\n          catch: t,\n          then: j,\n          finally: t, // proposed ES-Harmony\n\n          // eventual-send\n          delete: t,\n          get: t,\n          put: t,\n          post: t,\n          invoke: t,\n          fapply: t,\n          fcall: t,\n\n          // nanoq.js\n          del: t,\n\n          // Temporary compat with the old makeQ.js\n          send: t,\n          end: t,\n        },\n      },\n\n      // nanoq.js\n      Q: {\n        all: t,\n        race: t,\n        reject: t,\n        resolve: t,\n\n        join: t,\n        isPassByCopy: t,\n        passByCopy: t,\n        makeRemote: t,\n        makeFar: t,\n\n        // Temporary compat with the old makeQ.js\n        shorten: t,\n        isPromise: t,\n        async: t,\n        rejected: t,\n        promise: t,\n        delay: t,\n        memoize: t,\n        defer: t,\n      },\n\n      // 26 Reflection\n\n      Reflect: {\n        // 26.1\n        apply: t,\n        construct: t,\n        defineProperty: t,\n        deleteProperty: t,\n        get: t,\n        getOwnPropertyDescriptor: t,\n        getPrototypeOf: t,\n        has: t,\n        isExtensible: t,\n        ownKeys: t,\n        preventExtensions: t,\n        set: t,\n        setPrototypeOf: t,\n      },\n\n      Proxy: {\n        // 26.2\n        revocable: t,\n      },\n\n      // Appendix B\n\n      // B.2.1\n      escape: t,\n      unescape: t,\n\n      // B.2.5 (RegExp.prototype.compile) is marked 'false' up in 21.2\n\n      // Other\n\n      StringMap: {\n        // A specialized approximation of ES-Harmony's Map.\n        prototype: {}, // Technically, the methods should be on the prototype,\n        // but doing so while preserving encapsulation will be\n        // needlessly expensive for current usage.\n      },\n\n      Realm: {\n        makeRootRealm: t,\n        makeCompartment: t,\n        prototype: {\n          global: 'maybeAccessor',\n          evaluate: t,\n        },\n      },\n\n      SES: {\n        confine: t,\n        confineExpr: t,\n        harden: t,\n      },\n\n      Nat: j,\n      def: j,\n    },\n  };\n\n  function makeConsole(parentConsole) {\n    /* 'parentConsole' is the parent Realm's original 'console' object. We must\n       wrap it, exposing a 'console' with a 'console.log' (and perhaps others)\n       to the local realm, without allowing access to the original 'console',\n       its return values, or its exception objects, any of which could be used\n       to break confinement via the unsafe Function constructor. */\n\n    // callAndWrapError is copied from proposal-realms/shim/src/realmFacade.js\n    // Like Realm.apply except that it catches anything thrown and rethrows it\n    // as an Error from this realm\n\n    const errorConstructors = new Map([\n      ['EvalError', EvalError],\n      ['RangeError', RangeError],\n      ['ReferenceError', ReferenceError],\n      ['SyntaxError', SyntaxError],\n      ['TypeError', TypeError],\n      ['URIError', URIError],\n    ]);\n\n    function callAndWrapError(target, ...args) {\n      try {\n        return target(...args);\n      } catch (err) {\n        if (Object(err) !== err) {\n          // err is a primitive value, which is safe to rethrow\n          throw err;\n        }\n        let eName;\n        let eMessage;\n        let eStack;\n        try {\n          // The child environment might seek to use 'err' to reach the\n          // parent's intrinsics and corrupt them. `${err.name}` will cause\n          // string coercion of 'err.name'. If err.name is an object (probably\n          // a String of the parent Realm), the coercion uses\n          // err.name.toString(), which is under the control of the parent. If\n          // err.name were a primitive (e.g. a number), it would use\n          // Number.toString(err.name), using the child's version of Number\n          // (which the child could modify to capture its argument for later\n          // use), however primitives don't have properties like .prototype so\n          // they aren't useful for an attack.\n          eName = `${err.name}`;\n          eMessage = `${err.message}`;\n          eStack = `${err.stack || eMessage}`;\n          // eName/eMessage/eStack are now child-realm primitive strings, and\n          // safe to expose\n        } catch (ignored) {\n          // if err.name.toString() throws, keep the (parent realm) Error away\n          // from the child\n          throw new Error('unknown error');\n        }\n        const ErrorConstructor = errorConstructors.get(eName) || Error;\n        try {\n          throw new ErrorConstructor(eMessage);\n        } catch (err2) {\n          err2.stack = eStack; // replace with the captured inner stack\n          throw err2;\n        }\n      }\n    }\n\n    const newConsole = {};\n    const passThrough = [\n      'log',\n      'info',\n      'warn',\n      'error',\n      'group',\n      'groupEnd',\n      'trace',\n      'time',\n      'timeLog',\n      'timeEnd',\n    ];\n    // TODO: those are the properties that MDN documents. Node.js has a bunch\n    // of additional ones that I didn't include, which might be appropriate.\n\n    passThrough.forEach(name => {\n      // TODO: do we reveal the presence/absence of these properties to the\n      // child realm, thus exposing nondeterminism (and a hint of what platform\n      // you might be on) when it is constructed with {consoleMode: allow} ? Or\n      // should we expose the same set all the time, but silently ignore calls\n      // to the missing ones, to hide that variation? We might even consider\n      // adding console.* to the child realm all the time, even without\n      // consoleMode:allow, but ignore the calls unless the mode is enabled.\n      if (name in parentConsole) {\n        const orig = parentConsole[name];\n        // TODO: in a stack trace, this appears as\n        // \"Object.newConsole.(anonymous function) [as trace]\"\n        // can we make that \"newConsole.trace\" ?\n        newConsole[name] = function newerConsole(...args) {\n          callAndWrapError(orig, ...args);\n        };\n      }\n    });\n\n    return newConsole;\n  }\n\n  function makeMakeRequire(r, harden) {\n    function makeRequire(config) {\n      const cache = new Map();\n\n      function build(what) {\n        // This approach denies callers the ability to use inheritance to\n        // manage their config objects, but a simple \"if (what in config)\"\n        // predicate would also be truthy for e.g. \"toString\" and other\n        // properties of Object.prototype, and require('toString') should be\n        // legal if and only if the config object included an own-property\n        // named 'toString'. Incidentally, this could have been\n        // \"config.hasOwnProperty(what)\" but eslint complained.\n        if (!Object.prototype.hasOwnProperty.call(config, what)) {\n          throw new Error(`Cannot find module '${what}'`);\n        }\n        const c = config[what];\n\n        // some modules are hard-coded ways to access functionality that SES\n        // provides directly\n        if (what === '@agoric/harden') {\n          return harden;\n        }\n\n        // If the config points at a simple function, it must be a pure\n        // function with no dependencies (i.e. no 'require' or 'import', no\n        // calls to other functions defined in the same file but outside the\n        // function body). We stringify it and evaluate it inside this realm.\n        if (typeof c === 'function') {\n          return r.evaluate(`(${c})`);\n        }\n\n        // else we treat it as an object with an 'attenuatorSource' property\n        // that defines an attenuator function, which we evaluate. We then\n        // invoke it with the config object, which can contain authorities that\n        // it can wrap. The return value from this invocation is the module\n        // object that gets returned from require(). The attenuator function\n        // and the module it returns are in-realm, the authorities it wraps\n        // will be out-of-realm.\n        const src = `(${c.attenuatorSource})`;\n        const attenuator = r.evaluate(src);\n        return attenuator(c);\n      }\n\n      function newRequire(whatArg) {\n        const what = `${whatArg}`;\n        if (!cache.has(what)) {\n          cache.set(what, harden(build(what)));\n        }\n        return cache.get(what);\n      }\n\n      return newRequire;\n    }\n\n    return makeRequire;\n  }\n\n  /**\n   * @fileoverview Exports {@code ses.dataPropertiesToRepair}, a recursively\n   * defined JSON record enumerating the optimal set of prototype properties\n   * on primordials that need to be repaired before hardening.\n   *\n   * //provides ses.dataPropertiesToRepair\n   * @author JF Paradis\n   */\n\n  /**\n   * <p>The optimal set of prototype properties that need to be repaired\n   * before hardening is applied on enviromments subject to the override\n   * mistake.\n   *\n   * <p>Because \"repairing\" replaces data properties with accessors, every\n   * time a repaired property is accessed, the associated getter is invoked,\n   * which degrades the runtime performance of all code executing in the\n   * repaired enviromment, compared to the non-repaired case. In order\n   * to maintain performance, we only repair the properties of objects\n   * for which hardening causes a breakage of their intended usage. There\n   * are three cases:\n   * <ul>Overriding properties on objects typically used as maps,\n   *     namely {@code \"Object\"} and {@code \"Array\"}. In the case of arrays,\n   *     a given program might not be aware that non-numerical properties are\n   *     stored on the undelying object instance, not on the array. When an\n   *     object is typically used as a map, we repair all of its prototype\n   *     properties.\n   * <ul>Overriding properties on objects that provide defaults on their\n   *     prototype that programs typically override by assignment, such as\n   *     {@code \"Error.prototype.message\"} and {@code \"Function.prototype.name\"}\n   *     (both default to \"\").\n   * <ul>Setting a prototype chain. The constructor is typically set by\n   *     assignment, for example {@code \"Child.prototype.constructor = Child\"}.\n   *\n   * <p>Each JSON record enumerates the disposition of the properties on\n   * some corresponding primordial object, with the root record containing:\n   * <ul>\n   * <li>The record for the global object.\n   * <li>The record for the anonymous intrinsics.\n   * </ul>\n   *\n   * <p>For each such record, the values associated with its property\n   * names can be:\n   * <ul>\n   * <li>Another record, in which case this property is simply left\n   *     unrepaired and that next record represents the disposition of\n   *     the object which is its value. For example, {@code \"Object\"}\n   *     leads to another record explaining what properties {@code\n   *     \"Object\"} may have and how each such property, if present,\n   *     and its value should be repaired.\n   * <li>true, in which case this property is simply repaired. The\n   *     value associated with that property is not traversed. For\n   * \t   example, {@code \"Function.prototype.name\"} leads to true,\n   *     meaning that the {@code \"name\"} property of {@code\n   *     \"Function.prototype\"} should be repaired (which is needed\n   *     when inheriting from @code{Function} and setting the subclass's\n   *     {@code \"prototype.name\"} property). If the property is\n   *     already an accessor property, it is not repaired (because\n   *     accessors are not subject to the override mistake).\n   * <li>\"*\", all properties on this object are repaired.\n   * <li>falsey, in which case this property is skipped.\n   * </ul>\n   *\n   * <p>We factor out {@code true} into the variable {@code t} just to\n   * get a bit better compression from simple minifiers.\n   */\n\n  const t$1 = true;\n\n  var dataPropertiesToRepair = {\n    namedIntrinsics: {\n      Object: {\n        prototype: '*',\n      },\n\n      Array: {\n        prototype: '*',\n      },\n\n      Function: {\n        prototype: {\n          constructor: t$1, // set by \"regenerator-runtime\"\n          bind: t$1, // set by \"underscore\"\n          name: t$1,\n          toString: t$1,\n        },\n      },\n\n      Error: {\n        prototype: {\n          constructor: t$1, // set by \"fast-json-patch\"\n          message: t$1,\n          name: t$1, // set by \"precond\"\n          toString: t$1, // set by \"bluebird\"\n        },\n      },\n\n      TypeError: {\n        prototype: {\n          constructor: t$1, // set by \"readable-stream\"\n          name: t$1, // set by \"readable-stream\"\n        },\n      },\n\n      Promise: {\n        prototype: {\n          constructor: t$1, // set by \"core-js\"\n        },\n      },\n    },\n\n    anonIntrinsics: {\n      TypedArray: {\n        prototype: '*',\n      },\n\n      GeneratorFunction: {\n        prototype: {\n          constructor: t$1,\n          name: t$1,\n          toString: t$1,\n        },\n      },\n\n      AsyncFunction: {\n        prototype: {\n          constructor: t$1,\n          name: t$1,\n          toString: t$1,\n        },\n      },\n\n      AsyncGeneratorFunction: {\n        prototype: {\n          constructor: t$1,\n          name: t$1,\n          toString: t$1,\n        },\n      },\n\n      IteratorPrototype: '*',\n    },\n  };\n\n  // Adapted from SES/Caja\n  // Copyright (C) 2011 Google Inc.\n  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/startSES.js\n  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/repairES5.js\n\n  function repairDataProperties(intrinsics, repairPlan) {\n    // Object.defineProperty is allowed to fail silently,\n    // use Object.defineProperties instead.\n\n    const {\n      defineProperties,\n      getOwnPropertyDescriptor,\n      getOwnPropertyDescriptors,\n      prototype: { hasOwnProperty },\n    } = Object;\n\n    const { ownKeys } = Reflect;\n\n    /**\n     * For a special set of properties (defined in the repairPlan), it ensures\n     * that the effect of freezing does not suppress the ability to override\n     * these properties on derived objects by simple assignment.\n     *\n     * Because of lack of sufficient foresight at the time, ES5 unfortunately\n     * specified that a simple assignment to a non-existent property must fail if\n     * it would override a non-writable data property of the same name. (In\n     * retrospect, this was a mistake, but it is now too late and we must live\n     * with the consequences.) As a result, simply freezing an object to make it\n     * tamper proof has the unfortunate side effect of breaking previously correct\n     * code that is considered to have followed JS best practices, if this\n     * previous code used assignment to override.\n     */\n    function enableDerivedOverride(obj, prop, desc) {\n      if ('value' in desc && desc.configurable) {\n        const { value } = desc;\n\n        // eslint-disable-next-line no-inner-declarations\n        function getter() {\n          return value;\n        }\n\n        // Re-attach the data property on the object so\n        // it can be found by the deep-freeze traversal process.\n        getter.value = value;\n\n        // eslint-disable-next-line no-inner-declarations\n        function setter(newValue) {\n          if (obj === this) {\n            throw new TypeError(\n              `Cannot assign to read only property '${prop}' of object '${obj}'`,\n            );\n          }\n          if (hasOwnProperty.call(this, prop)) {\n            this[prop] = newValue;\n          } else {\n            defineProperties(this, {\n              [prop]: {\n                value: newValue,\n                writable: true,\n                enumerable: desc.enumerable,\n                configurable: desc.configurable,\n              },\n            });\n          }\n        }\n\n        defineProperties(obj, {\n          [prop]: {\n            get: getter,\n            set: setter,\n            enumerable: desc.enumerable,\n            configurable: desc.configurable,\n          },\n        });\n      }\n    }\n\n    function repairOneProperty(obj, prop) {\n      if (!obj) {\n        return;\n      }\n      const desc = getOwnPropertyDescriptor(obj, prop);\n      if (!desc) {\n        return;\n      }\n      enableDerivedOverride(obj, prop, desc);\n    }\n\n    function repairAllProperties(obj) {\n      if (!obj) {\n        return;\n      }\n      const descs = getOwnPropertyDescriptors(obj);\n      if (!descs) {\n        return;\n      }\n      ownKeys(descs).forEach(prop =>\n        enableDerivedOverride(obj, prop, descs[prop]),\n      );\n    }\n\n    function walkRepairPlan(obj, plan) {\n      if (!obj) {\n        return;\n      }\n      if (!plan) {\n        return;\n      }\n      ownKeys(plan).forEach(prop => {\n        const subPlan = plan[prop];\n        const subObj = obj[prop];\n        switch (subPlan) {\n          case true:\n            repairOneProperty(obj, prop);\n            break;\n\n          case '*':\n            repairAllProperties(subObj);\n            break;\n\n          default:\n            if (Object(subPlan) !== subPlan) {\n              throw TypeError(`Repair plan subPlan ${subPlan} is invalid`);\n            }\n            walkRepairPlan(subObj, subPlan);\n        }\n      });\n    }\n\n    // Do the repair.\n    walkRepairPlan(intrinsics, repairPlan);\n  }\n\n  // Copyright (C) 2018 Agoric\n\n  const FORWARDED_REALMS_OPTIONS = ['transforms', 'configurableGlobals'];\n\n  function createSESWithRealmConstructor(creatorStrings, Realm) {\n    function makeSESRootRealm(options) {\n      // eslint-disable-next-line no-param-reassign\n      options = Object(options); // Todo: sanitize\n      const shims = [];\n\n      const {\n        dataPropertiesToRepair: optDataPropertiesToRepair,\n        shims: optionalShims,\n        sloppyGlobals,\n        whitelist: optWhitelist,\n        ...optionsRest\n      } = options;\n\n      const wl = JSON.parse(JSON.stringify(optWhitelist || whitelist));\n      const repairPlan =\n        optDataPropertiesToRepair !== undefined\n          ? JSON.parse(JSON.stringify(optDataPropertiesToRepair))\n          : dataPropertiesToRepair;\n\n      // Forward the designated Realms options.\n      const realmsOptions = {};\n      FORWARDED_REALMS_OPTIONS.forEach(key => {\n        if (key in optionsRest) {\n          realmsOptions[key] = optionsRest[key];\n        }\n      });\n\n      if (sloppyGlobals) {\n        throw TypeError(`\\\nsloppyGlobals cannot be specified for makeSESRootRealm!\nYou probably want a Compartment instead, like:\n  const c = s.global.Realm.makeCompartment({ sloppyGlobals: true })`);\n      }\n\n      // \"allow\" enables real Date.now(), anything else gets NaN\n      // (it'd be nice to allow a fixed numeric value, but too hard to\n      // implement right now)\n      if (options.dateNowMode !== 'allow') {\n        shims.push(`(${tameDate})();`);\n      }\n\n      if (options.mathRandomMode !== 'allow') {\n        shims.push(`(${tameMath})();`);\n      }\n\n      // Intl is disabled entirely for now, deleted by removeProperties. If we\n      // want to bring it back (under the control of this option), we'll need\n      // to add it to the whitelist too, as well as taming it properly.\n      if (options.intlMode !== 'allow') {\n        // this shim also disables Object.prototype.toLocaleString\n        shims.push(`(${tameIntl})();`);\n      }\n\n      if (options.errorStackMode !== 'allow') {\n        shims.push(`(${tameError})();`);\n      } else {\n        // if removeProperties cleans these things from Error, v8 won't provide\n        // stack traces or even toString on exceptions, and then Node.js prints\n        // uncaught exceptions as \"undefined\" instead of a type/message/stack.\n        // So if we're allowing stack traces, make sure the whitelist is\n        // augmented to include them.\n        wl.namedIntrinsics.Error.captureStackTrace = true;\n        wl.namedIntrinsics.Error.stackTraceLimit = true;\n        wl.namedIntrinsics.Error.prepareStackTrace = true;\n      }\n\n      if (options.regexpMode !== 'allow') {\n        shims.push(`(${tameRegExp})();`);\n      }\n\n      // The getAnonIntrinsics function might be renamed by e.g. rollup. The\n      // removeProperties() function references it by name, so we need to force\n      // it to have a specific name.\n      const removeProp = `const getAnonIntrinsics = (${getAnonIntrinsics$1});\n               (${removeProperties})(this, ${JSON.stringify(wl)})`;\n      shims.push(removeProp);\n\n      // Add options.shims.\n      if (optionalShims) {\n        shims.push(...optionalShims);\n      }\n\n      const r = Realm.makeRootRealm({ ...realmsOptions, shims });\n\n      // Build a harden() with an empty fringe. It will be populated later when\n      // we call harden(allIntrinsics).\n      const makeHardenerSrc = `(${makeHardener})`;\n      const harden = r.evaluate(makeHardenerSrc)();\n\n      const b = r.evaluate(creatorStrings);\n      b.createSESInThisRealm(r.global, creatorStrings, r);\n\n      // Allow harden to be accessible via the SES global.\n      r.global.SES.harden = harden;\n\n      if (options.consoleMode === 'allow') {\n        const s = `(${makeConsole})`;\n        r.global.console = r.evaluate(s)(console);\n      }\n\n      // Extract the intrinsics from the global.\n      const anonIntrinsics = r.evaluate(`(${getAnonIntrinsics$1})`)(r.global);\n      const namedIntrinsics = r.evaluate(`(${getNamedIntrinsics})`)(\n        r.global,\n        whitelist,\n      );\n\n      // Gather the intrinsics only.\n      const allIntrinsics = r.evaluate(`(${getAllPrimordials$1})`)(\n        namedIntrinsics,\n        anonIntrinsics,\n      );\n\n      // Gather the primordials and the globals.\n      const allPrimordials = r.evaluate(`(${getAllPrimordials})`)(\n        r.global,\n        anonIntrinsics,\n      );\n\n      // Repair the override mistake on the intrinsics only.\n      r.evaluate(`(${repairDataProperties})`)(allIntrinsics, repairPlan);\n\n      // Finally freeze all the primordials, and the global object. This must\n      // be the last thing we do that modifies the Realm's globals.\n      harden(allPrimordials);\n\n      // build the makeRequire helper, glue it to the new Realm\n      r.makeRequire = harden(r.evaluate(`(${makeMakeRequire})`)(r, harden));\n      return r;\n    }\n    const SES = {\n      makeSESRootRealm,\n    };\n\n    return SES;\n  }\n\n  function createSESInThisRealm(global, creatorStrings, parentRealm) {\n    // eslint-disable-next-line no-param-reassign,no-undef\n    global.SES = createSESWithRealmConstructor(creatorStrings, Realm);\n    // todo: wrap exceptions, effectively undoing the wrapping that\n    // Realm.evaluate does\n\n    const errorConstructors = new Map([\n      ['EvalError', EvalError],\n      ['RangeError', RangeError],\n      ['ReferenceError', ReferenceError],\n      ['SyntaxError', SyntaxError],\n      ['TypeError', TypeError],\n      ['URIError', URIError],\n    ]);\n\n    // callAndWrapError is copied from the Realm shim. Our SES.confine (from\n    // inside the realm) delegates to Realm.evaluate (from outside the realm),\n    // but we need the exceptions to come from our own realm, so we use this to\n    // reverse the shim's own callAndWrapError. TODO: look for a reasonable way\n    // to avoid the double-wrapping, maybe by changing the shim/Realms-spec to\n    // provide the safeEvaluator as a Realm.evaluate method (inside a realm).\n    // That would make this trivial: global.SES = Realm.evaluate (modulo\n    // potential 'this' issues)\n\n    // the comments here were written from the POV of a parent defending itself\n    // against a malicious child realm. In this case, we are the child.\n\n    function callAndWrapError(target, ...args) {\n      try {\n        return target(...args);\n      } catch (err) {\n        if (Object(err) !== err) {\n          // err is a primitive value, which is safe to rethrow\n          throw err;\n        }\n        let eName;\n        let eMessage;\n        let eStack;\n        try {\n          // The child environment might seek to use 'err' to reach the\n          // parent's intrinsics and corrupt them. `${err.name}` will cause\n          // string coercion of 'err.name'. If err.name is an object (probably\n          // a String of the parent Realm), the coercion uses\n          // err.name.toString(), which is under the control of the parent. If\n          // err.name were a primitive (e.g. a number), it would use\n          // Number.toString(err.name), using the child's version of Number\n          // (which the child could modify to capture its argument for later\n          // use), however primitives don't have properties like .prototype so\n          // they aren't useful for an attack.\n          eName = `${err.name}`;\n          eMessage = `${err.message}`;\n          eStack = `${err.stack || eMessage}`;\n          // eName/eMessage/eStack are now child-realm primitive strings, and\n          // safe to expose\n        } catch (ignored) {\n          // if err.name.toString() throws, keep the (parent realm) Error away\n          // from the child\n          throw new Error('unknown error');\n        }\n        const ErrorConstructor = errorConstructors.get(eName) || Error;\n        try {\n          throw new ErrorConstructor(eMessage);\n        } catch (err2) {\n          err2.stack = eStack; // replace with the captured inner stack\n          throw err2;\n        }\n      }\n    }\n\n    // We must not allow other child code to access that object. SES.confine\n    // closes over the parent's Realm object so it shouldn't be accessible from\n    // the outside.\n\n    // eslint-disable-next-line no-param-reassign\n    global.SES.confine = (code, endowments) =>\n      callAndWrapError(() => parentRealm.evaluate(code, endowments));\n    // eslint-disable-next-line no-param-reassign\n    global.SES.confineExpr = (code, endowments) =>\n      callAndWrapError(() => parentRealm.evaluate(`(${code})`, endowments));\n  }\n\n  exports.createSESInThisRealm = createSESInThisRealm;\n  exports.createSESWithRealmConstructor = createSESWithRealmConstructor;\n\n  return exports;\n\n}({}))";

  // Copyright (C) 2018 Agoric

  const SES = createSESWithRealmConstructor(creatorStrings, Realm);

  return SES;

}));

// END of injected code from ses
  })()
  return module.exports
})()
  const sesOptions = {
    // this is introduces non-determinism, but is otherwise safe
    mathRandomMode: 'allow',
  }

  // only reveal error stacks in debug mode
  if (debugMode === true) {
    sesOptions.errorStackMode = 'allow'
  }
  const realm = SES.makeSESRootRealm(sesOptions)

  // config and bundle module store
  const lavamoatConfig = { resources: {} }
  const modules = {}

  // initialize the kernel
  const createKernel = (function(){

  return createKernel

  function createKernel ({ realm, globalRef, debugMode, unsafeEvalWithEndowments, lavamoatConfig, loadModuleData, getRelativeModuleId }) {
    // create SES-wrapped LavaMoat kernel
    const makeKernel = realm.evaluate(`(${unsafeCreateKernel})`, { console })
    const lavamoatKernel = makeKernel({
      realm,
      unsafeEvalWithEndowments,
      globalRef,
      debugMode,
      lavamoatConfig,
      loadModuleData,
      getRelativeModuleId,
    })

    return lavamoatKernel
  }

  // this is serialized and run in SES
  // mostly just exists to expose variables to internalRequire and loadBundle
  function unsafeCreateKernel ({
    realm,
    unsafeEvalWithEndowments,
    globalRef,
    debugMode,
    lavamoatConfig,
    loadModuleData,
    getRelativeModuleId,
  }) {
    // "templateRequire" calls are inlined in "generatePrelude"
    const { getEndowmentsForConfig } = // define makeGetEndowmentsForConfig
(function(){
  const global = globalRef
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
    deepDefine
  }

  function getEndowmentsForConfig (globalRef, config) {
    if (!config.globals) return {}
    const endowments = {}
    Object.entries(config.globals).forEach(([globalPath, configValue]) => {
      const pathParts = globalPath.split('.')
      // disallow dunder proto in path
      const pathContainsDunderProto = pathParts.some(pathPart => pathPart === '__proto__')
      if (pathContainsDunderProto) {
        throw new Error(`Lavamoat - "__proto__" disallowed in globals config paths. saw "${globalPath}"`)
      }
      // write access handled elsewhere
      if (configValue === 'write') return
      if (configValue !== true) {
        throw new Error('LavaMoat - unknown value for config globals')
      }
      const value = deepGetAndBind(globalRef, globalPath)
      // TODO: actually match prop descriptor
      const propDesc = {
        value,
        configurable: true,
        writable: true,
        enumerable: true
      }
      deepDefine(endowments, globalPath, propDesc)
    })
    return endowments
  }

  function deepGetAndBind (globalRef, pathName) {
    const pathParts = pathName.split('.')
    const parentPath = pathParts.slice(0, -1).join('.')
    const childKey = pathParts[pathParts.length - 1]
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
    const lastPathPart = pathParts[pathParts.length - 1]
    const allButLastPart = pathParts.slice(0, -1)
    allButLastPart.forEach(pathPart => {
      const prevParent = parent
      parent = parent[pathPart]
      if (parent === null) {
        throw new Error('DeepSet - unable to set "' + pathName + '" on null')
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
  const global = globalRef
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
    getTopLevelWriteAccessFromPackageConfig
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
        configurable: true
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
  const global = globalRef
  const exports = {}
  const module = { exports }
  ;(function(){
// START of injected code from cytoplasm
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Membrane = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.assert = assert;

function assert(condition, errorMessage) {
  if (!condition) {
    throw new TypeError(errorMessage);
  }
}
},{}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkAnonIntrinsics = checkAnonIntrinsics;

var _assert = require("./assert.js");

const {
  getPrototypeOf: _getPrototypeOf
} = Object;

function getPrototypeOf (obj) {
  return obj && _getPrototypeOf(obj)
}
/**
 * checkAnonIntrinsics()
 * Ensure that the rootAnonIntrinsics are consistent with specs. These
 * tests are necesary to ensure that sampling was correctly done.
 */

function checkAnonIntrinsics(intrinsics) {
  const {
    FunctionPrototypeConstructor,
    ArrayIteratorPrototype,
    AsyncFunction,
    AsyncGenerator,
    AsyncGeneratorFunction,
    AsyncGeneratorPrototype,
    AsyncIteratorPrototype,
    Generator,
    GeneratorFunction,
    IteratorPrototype,
    MapIteratorPrototype,
    RegExpStringIteratorPrototype,
    SetIteratorPrototype,
    StringIteratorPrototype,
    ThrowTypeError,
    TypedArray
  } = intrinsics; // 9.2.4.1 %ThrowTypeError%

  (0, _assert.assert)(getPrototypeOf(ThrowTypeError) === Function.prototype, 'ThrowTypeError.__proto__ should be Function.prototype'); // 21.1.5.2 The %StringIteratorPrototype% Object

  (0, _assert.assert)(getPrototypeOf(StringIteratorPrototype) === IteratorPrototype, 'StringIteratorPrototype.__proto__ should be IteratorPrototype'); // 21.2.7.1 The %RegExpStringIteratorPrototype% Object

  // (0, _assert.assert)(getPrototypeOf(RegExpStringIteratorPrototype) === IteratorPrototype, 'RegExpStringIteratorPrototype.__proto__ should be IteratorPrototype'); // 22.2.1 The %TypedArray% Intrinsic Object
  // http://bespin.cz/~ondras/html/classv8_1_1ArrayBufferView.html
  // has me worried that someone might make such an intermediate
  // object visible.

  (0, _assert.assert)(getPrototypeOf(TypedArray) === Function.prototype, 'TypedArray.__proto__ should be Function.prototype'); // 23.1.5.2 The %MapIteratorPrototype% Object

  (0, _assert.assert)(getPrototypeOf(MapIteratorPrototype) === IteratorPrototype, 'MapIteratorPrototype.__proto__ should be IteratorPrototype'); // 23.2.5.2 The %SetIteratorPrototype% Object

  (0, _assert.assert)(getPrototypeOf(SetIteratorPrototype) === IteratorPrototype, 'SetIteratorPrototype.__proto__ should be IteratorPrototype'); // 25.1.2 The %IteratorPrototype% Object

  (0, _assert.assert)(getPrototypeOf(IteratorPrototype) === Object.prototype, 'IteratorPrototype.__proto__ should be Object.prototype'); // 25.1.3 The %AsyncIteratorPrototype% Object

  (0, _assert.assert)(getPrototypeOf(AsyncIteratorPrototype) === Object.prototype, 'AsyncIteratorPrototype.__proto__ should be Object.prototype'); // 22.1.5.2 The %ArrayIteratorPrototype% Object

  (0, _assert.assert)(getPrototypeOf(ArrayIteratorPrototype) === IteratorPrototype, 'AsyncIteratorPrototype.__proto__ should be IteratorPrototype'); // 25.2.2 Properties of the GeneratorFunction Constructor
  // Use Function.prototype.constructor in case Function has been tamed

  (0, _assert.assert)(getPrototypeOf(GeneratorFunction) === FunctionPrototypeConstructor, 'GeneratorFunction.__proto__ should be Function');
  (0, _assert.assert)(GeneratorFunction.name === 'GeneratorFunction', 'GeneratorFunction.name should be "GeneratorFunction"'); // 25.2.3 Properties of the GeneratorFunction Prototype Object

  (0, _assert.assert)(getPrototypeOf(Generator) === Function.prototype, 'Generator.__proto__ should be Function.prototype'); // 25.3.1 The AsyncGeneratorFunction Constructor
  // Use Function.prototype.constructor in case Function has been tamed

  (0, _assert.assert)(getPrototypeOf(AsyncGeneratorFunction) === FunctionPrototypeConstructor, 'AsyncGeneratorFunction.__proto__ should be Function');
  (0, _assert.assert)(AsyncGeneratorFunction.name === 'AsyncGeneratorFunction', 'AsyncGeneratorFunction.name should be "AsyncGeneratorFunction"'); // 25.3.3 Properties of the AsyncGeneratorFunction Prototype Object

  (0, _assert.assert)(getPrototypeOf(AsyncGenerator) === Function.prototype, 'AsyncGenerator.__proto__ should be Function.prototype'); // 25.5.1 Properties of the AsyncGenerator Prototype Object

  (0, _assert.assert)(getPrototypeOf(AsyncGeneratorPrototype) === AsyncIteratorPrototype, 'AsyncGeneratorPrototype.__proto__ should be AsyncIteratorPrototype'); // 25.7.1 The AsyncFunction Constructor
  // Use Function.prototype.constructor in case Function has been tamed

  (0, _assert.assert)(getPrototypeOf(AsyncFunction) === FunctionPrototypeConstructor, 'AsyncFunction.__proto__ should be Function');
  (0, _assert.assert)(AsyncFunction.name === 'AsyncFunction', 'AsyncFunction.name should be "AsyncFunction"');
}
},{"./assert.js":1}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkIntrinsics = checkIntrinsics;

/**
 * checkIntrinsics()
 * Ensure that the intrinsics are consistent with defined.
 */
function checkIntrinsics(intrinsics) {
  Object.keys(intrinsics).forEach(name => {
    if (intrinsics[name] === undefined) {
      throw new TypeError(`Malformed intrinsic: ${name}`);
    }
  });
}
},{}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getAnonymousIntrinsics = getAnonymousIntrinsics;
const {
  getOwnPropertyDescriptor,
  getPrototypeOf
} = Object;
/**
 * Object.getConstructorOf()
 * Helper function to improve readability, similar to Object.getPrototypeOf().
 */

function getConstructorOf(obj) {
  return getPrototypeOf(obj).constructor;
}
/**
 * getAnonymousIntrinsics()
 * Get the intrinsics not otherwise reachable by named own property
 * traversal from the global object.
 */


function getAnonymousIntrinsics() {
  const FunctionPrototypeConstructor = Function.prototype.constructor;
  const SymbolIterator = typeof Symbol && Symbol.iterator || '@@iterator';
  const SymbolMatchAll = typeof Symbol && Symbol.matchAll || '@@matchAll'; // 9.2.4.1 %ThrowTypeError%
  // eslint-disable-next-line prefer-rest-params

  const ThrowTypeError = getOwnPropertyDescriptor(arguments, 'callee').get; // 21.1.5.2 The %StringIteratorPrototype% Object
  // eslint-disable-next-line no-new-wrappers

  const StringIteratorObject = new String()[SymbolIterator]();
  const StringIteratorPrototype = getPrototypeOf(StringIteratorObject); // 21.2.7.1 The %RegExpStringIteratorPrototype% Object

  let RegExpStringIterator, RegExpStringIteratorPrototype
  try {
    RegExpStringIterator = new RegExp()[SymbolMatchAll]();
    RegExpStringIteratorPrototype = getPrototypeOf(RegExpStringIterator); // 22.1.5.2 The %ArrayIteratorPrototype% Object
  } catch (_) {}
  // eslint-disable-next-line no-array-constructor

  const ArrayIteratorObject = new Array()[SymbolIterator]();
  const ArrayIteratorPrototype = getPrototypeOf(ArrayIteratorObject); // 22.2.1 The %TypedArray% Intrinsic Object

  const TypedArray = getPrototypeOf(Float32Array); // 23.1.5.2 The %MapIteratorPrototype% Object

  const MapIteratorObject = new Map()[SymbolIterator]();
  const MapIteratorPrototype = getPrototypeOf(MapIteratorObject); // 23.2.5.2 The %SetIteratorPrototype% Object

  const SetIteratorObject = new Set()[SymbolIterator]();
  const SetIteratorPrototype = getPrototypeOf(SetIteratorObject); // 25.1.2 The %IteratorPrototype% Object

  const IteratorPrototype = getPrototypeOf(ArrayIteratorPrototype); // 25.2.1 The GeneratorFunction Constructor

  function* GeneratorFunctionInstance() {} // eslint-disable-line no-empty-function


  const GeneratorFunction = getConstructorOf(GeneratorFunctionInstance); // 25.2.3 Properties of the GeneratorFunction Prototype Object

  const Generator = GeneratorFunction.prototype; // 25.3.1 The AsyncGeneratorFunction Constructor

  async function* AsyncGeneratorFunctionInstance() {} // eslint-disable-line no-empty-function


  const AsyncGeneratorFunction = getConstructorOf(AsyncGeneratorFunctionInstance); // 25.3.2.2 AsyncGeneratorFunction.prototype

  const AsyncGenerator = AsyncGeneratorFunction.prototype; // 25.5.1 Properties of the AsyncGenerator Prototype Object

  const AsyncGeneratorPrototype = AsyncGenerator.prototype;
  const AsyncIteratorPrototype = getPrototypeOf(AsyncGeneratorPrototype); // 25.7.1 The AsyncFunction Constructor

  async function AsyncFunctionInstance() {} // eslint-disable-line no-empty-function


  const AsyncFunction = getConstructorOf(AsyncFunctionInstance); // VALIDATION

  const intrinsics = {
    FunctionPrototypeConstructor,
    ArrayIteratorPrototype,
    AsyncFunction,
    AsyncGenerator,
    AsyncGeneratorFunction,
    AsyncGeneratorPrototype,
    AsyncIteratorPrototype,
    Generator,
    GeneratorFunction,
    IteratorPrototype,
    MapIteratorPrototype,
    RegExpStringIteratorPrototype,
    SetIteratorPrototype,
    StringIteratorPrototype,
    ThrowTypeError,
    TypedArray
  };
  return intrinsics;
}
},{}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getNamedIntrinsic = getNamedIntrinsic;

var _assert = require("./assert.js");

const {
  getOwnPropertyDescriptor
} = Object;
/**
 * getNamedIntrinsic()
 * Get the intrinsic from the global object.
 */

function getNamedIntrinsic(root, name) {
  // Assumption: the intrinsic name matches a global object with the same name.
  const desc = getOwnPropertyDescriptor(root, name); // Abort if an accessor is found on the object instead of a data property.
  // We should never get into this non standard situation.

  (0, _assert.assert)(!('get' in desc || 'set' in desc), `unexpected accessor on global property: ${name}`);
  return desc.value;
}
},{"./assert.js":1}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.intrinsicNames = void 0;

/**
 * intrinsicNames
 * The following list contains all intrisics names as defined in the specs, except
 * that the leading an trailing '%' characters have been removed. We want to design
 * from the specs so we can better track changes to the specs.
 */
const intrinsicNames = [// 6.1.7.4 Well-Known Intrinsic Objects
// Table 8: Well-Known Intrinsic Objects
'Array', 'ArrayBuffer', 'ArrayBufferPrototype', 'ArrayIteratorPrototype', 'ArrayPrototype', // TODO ArrayProto_*
// 'ArrayProto_entries',
// 'ArrayProto_forEach',
// 'ArrayProto_keys',
// 'ArrayProto_values',
// 25.1.4.2 The %AsyncFromSyncIteratorPrototype% Object
// TODO Beleived to not be directly accessible to ECMAScript code.
// 'AsyncFromSyncIteratorPrototype',
'AsyncFunction', 'AsyncFunctionPrototype', 'AsyncGenerator', 'AsyncGeneratorFunction', 'AsyncGeneratorPrototype', 'AsyncIteratorPrototype', 'Atomics', 'BigInt', // TOTO: Missing in the specs.
'BigIntPrototype', 'BigInt64Array', // TOTO: Missing in the specs.
'BigInt64ArrayPrototype', 'BigUint64Array', // TOTO: Missing in the specs.
'BigUint64ArrayPrototype', 'Boolean', 'BooleanPrototype', 'DataView', 'DataViewPrototype', 'Date', 'DatePrototype', 'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'Error', 'ErrorPrototype', 'eval', 'EvalError', 'EvalErrorPrototype', 'Float32Array', 'Float32ArrayPrototype', 'Float64Array', 'Float64ArrayPrototype', // 13.7.5.16.2 The %ForInIteratorPrototype% Object
// Documneted as "never directly accessible to ECMAScript code."
// 'ForInIteratorPrototype',
'Function', 'FunctionPrototype', 'Generator', 'GeneratorFunction', 'GeneratorPrototype', 'Int8Array', 'Int8ArrayPrototype', 'Int16Array', 'Int16ArrayPrototype', 'Int32Array', 'Int32ArrayPrototype', 'isFinite', 'isNaN', 'IteratorPrototype', 'JSON', // TODO
// 'JSONParse',
// 'JSONStringify',
'Map', 'MapIteratorPrototype', 'MapPrototype', 'Math', 'Number', 'NumberPrototype', 'Object', 'ObjectPrototype', // TODO
// 'ObjProto_toString',
// 'ObjProto_valueOf',
'parseFloat', 'parseInt', 'Promise', 'PromisePrototype', // TODO
// 'PromiseProto_then',
// 'Promise_all',
// 'Promise_reject',
// 'Promise_resolve',
'Proxy', 'RangeError', 'RangeErrorPrototype', 'ReferenceError', 'ReferenceErrorPrototype', 'Reflect', 'RegExp', 'RegExpPrototype', 'RegExpStringIteratorPrototype', 'Set', 'SetIteratorPrototype', 'SetPrototype', 'SharedArrayBuffer', 'SharedArrayBufferPrototype', 'String', 'StringIteratorPrototype', 'StringPrototype', 'Symbol', 'SymbolPrototype', 'SyntaxError', 'SyntaxErrorPrototype', 'ThrowTypeError', 'TypedArray', 'TypedArrayPrototype', 'TypeError', 'TypeErrorPrototype', 'Uint8Array', 'Uint8ArrayPrototype', 'Uint8ClampedArray', 'Uint8ClampedArrayPrototype', 'Uint16Array', 'Uint16ArrayPrototype', 'Uint32Array', 'Uint32ArrayPrototype', 'URIError', 'URIErrorPrototype', 'WeakMap', 'WeakMapPrototype', 'WeakSet', 'WeakSetPrototype', // B.2.1 Additional Properties of the Global Object
// Table 87: Additional Well-known Intrinsic Objects
'escape', 'unescape', // ESNext
'FunctionPrototypeConstructor', 'Compartment', 'CompartmentPrototype', 'harden'];
exports.intrinsicNames = intrinsicNames;
},{}],7:[function(require,module,exports){
"use strict";

const globalThis = typeof global !== undefined ? global : self

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getIntrinsics = getIntrinsics;

var _checkAnonIntrinsics = require("./check-anon-intrinsics.js");

var _getAnonymousIntrinsics = require("./get-anonymous-intrinsics.js");

var _intrinsicNames = require("./intrinsic-names.js");

var _getNamedIntrinsic = require("./get-named-intrinsic.js");

var _checkIntrinsics = require("./check-intrinsics.js");

// The intrinsics are the defiend in the global specifications.
//
// API
//
//   getIntrinsics(): Object
//
// Operation similar to abstract operation `CreateInrinsics` in section 8.2.2
// of the ES specifications.
//
// Return a record-like object similar to the [[intrinsics]] slot of the
// realmRec excepts for the following simpifications:
//
//  - we omit the intrinsics not reachable by JavaScript code.
//
//  - we omit intrinsics that are direct properties of the global object
//    (except for the "prototype" property), and properties that are direct
//    properties of the prototypes (except for "constructor").
//
//  - we use the name of the associated global object property instead of the
//    intrinsic name (usually, `<intrinsic name> === '%' + <global property
//    name>+ '%'`).
//
// Assumptions
//
// The intrinsic names correspond to the object names with "%" added as prefix and suffix, i.e. the intrinsic "%Object%" is equal to the global object property "Object".
const {
  apply
} = Reflect;

const uncurryThis = fn => (thisArg, ...args) => apply(fn, thisArg, args);

const hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);
const suffix = 'Prototype';
/**
 * getIntrinsics()
 * Return a record-like object similar to the [[intrinsics]] slot of the realmRec
 * excepts for the following simpifications:
 * - we omit the intrinsics not reachable by JavaScript code.
 * - we omit intrinsics that are direct properties of the global object (except for the
 *   "prototype" property), and properties that are direct properties of the prototypes
 *   (except for "constructor").
 * - we use the name of the associated global object property instead of the intrinsic
 *   name (usually, <intrinsic name> === '%' + <global property name>+ '%').
 */

function getIntrinsics() {
  const intrinsics = {
    __proto__: null
  };
  const anonIntrinsics = (0, _getAnonymousIntrinsics.getAnonymousIntrinsics)();
  (0, _checkAnonIntrinsics.checkAnonIntrinsics)(anonIntrinsics);

  for (const name of _intrinsicNames.intrinsicNames) {
    if (hasOwnProperty(anonIntrinsics, name)) {
      intrinsics[name] = anonIntrinsics[name]; // eslint-disable-next-line no-continue

      continue;
    }

    if (hasOwnProperty(globalThis, name)) {
      intrinsics[name] = (0, _getNamedIntrinsic.getNamedIntrinsic)(globalThis, name); // eslint-disable-next-line no-continue

      continue;
    }

    const hasSuffix = name.endsWith(suffix);

    if (hasSuffix) {
      const prefix = name.slice(0, -suffix.length);

      if (hasOwnProperty(anonIntrinsics, prefix)) {
        const intrinsic = anonIntrinsics[prefix];
        intrinsics[name] = intrinsic.prototype; // eslint-disable-next-line no-continue

        continue;
      }

      if (hasOwnProperty(globalThis, prefix)) {
        const intrinsic = (0, _getNamedIntrinsic.getNamedIntrinsic)(globalThis, prefix);
        intrinsics[name] = intrinsic.prototype; // eslint-disable-next-line no-continue

        continue;
      }
    }
  }

  // (0, _checkIntrinsics.checkIntrinsics)(intrinsics);
  return intrinsics;
}
},{"./check-anon-intrinsics.js":2,"./check-intrinsics.js":3,"./get-anonymous-intrinsics.js":4,"./get-named-intrinsic.js":5,"./intrinsic-names.js":6}],8:[function(require,module,exports){
const { getIntrinsics } = require('../lib/intrinsics.js')
module.exports = {
  getIntrinsics: () => {
    try {
      return getIntrinsics()
    } catch (err) {
      const subErrMsg = err.stack || err.message || err
      throw new Error(`Cytoplasm failed to gather intrinsics. Please specify a "primordials" option to the Membrane constructor, apply core-js polyfills, or use node v12 or higher.\n${subErrMsg}`)
    }
  }
}
},{"../lib/intrinsics.js":7}],9:[function(require,module,exports){
// theres some things we may need to enforce differently when in and out of strict mode
// e.g. fn.arguments
'use strict'

const { getIntrinsics } = require('./getIntrinsics')

const { isArray } = Array

class MembraneSpace {
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
  constructor ({ debugMode, primordials } = {}) {
    this.debugMode = debugMode
    this.primordials = primordials || Object.values(getIntrinsics())
    this.bridgedToRaw = new WeakMap()
    this.rawToOrigin = new WeakMap()
  }

  makeMembraneSpace ({ label, createHandler }) {
    return new MembraneSpace({ label, createHandler })
  }

  // if rawObj is not part of inGraph, should we explode?
  bridge (inRef, inGraph, outGraph) {

    //
    // skip if should be passed directly (danger)
    //

    if (this.shouldSkipBridge(inRef)) {
      // console.log(`membrane.bridge should skip in:${inGraph.label} -> out:${outGraph.label}`)
      return inRef
    }

    //
    // unwrap ref and detect "origin" graph
    //

    let rawRef
    let originGraph

    if (this.bridgedToRaw.has(inRef)) {
      // we know this ref
      rawRef = this.bridgedToRaw.get(inRef)
      originGraph = this.rawToOrigin.get(rawRef)
    } else {
      // we've never seen this ref before - must be raw and from inGraph
      rawRef = inRef
      originGraph = inGraph
      // record origin
      this.rawToOrigin.set(inRef, inGraph)
    }

    //
    // wrap for ref for "out" graph
    //

    // if this ref originates in the "out" graph, deliver unwrapped
    if (originGraph === outGraph) {
      return rawRef
    }

    // if outGraph already has bridged wrapping for rawRef, use it
    if (outGraph.rawToBridged.has(rawRef)) {
      return outGraph.rawToBridged.get(rawRef)
    }

    // create new wrapping for rawRef
    const distortionHandler = originGraph.getHandlerForRef(rawRef)
    const membraneProxyHandler = createMembraneProxyHandler(
      this.debugMode,
      distortionHandler,
      rawRef,
      originGraph,
      outGraph,
      this.bridge.bind(this),
    )
    const outRef = createFlexibleProxy(rawRef, membraneProxyHandler)
    // cache both ways
    outGraph.rawToBridged.set(rawRef, outRef)
    this.bridgedToRaw.set(outRef, rawRef)

    // all done
    return outRef
  }

  shouldSkipBridge (value) {
    // Check for null and undefined
    if (value === null) {
      return true
    }
    if (value === undefined) {
      return true
    }

    // Check for non-objects
    const valueType = typeof value
    if (valueType !== 'object' && valueType !== 'function') {
      return true
    }

    // primordials should not be wrapped
    if (this.primordials.includes(value)) {
      return true
    }

    // Early exit if the objectis an Array.
    if (isArray(value) === true) {
      return false
    }

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
function createMembraneProxyHandler (debugMode, prevProxyHandler, rawRef, inGraph, outGraph, bridge) {
  const proxyHandler = {
    getPrototypeOf: createHandlerFn(debugMode, prevProxyHandler.getPrototypeOf, rawRef, inGraph, outGraph, bridge),
    setPrototypeOf: createHandlerFn(debugMode, prevProxyHandler.setPrototypeOf, rawRef, inGraph, outGraph, bridge),
    isExtensible: createHandlerFn(debugMode, prevProxyHandler.isExtensible, rawRef, inGraph, outGraph, bridge),
    preventExtensions: createHandlerFn(debugMode, prevProxyHandler.preventExtensions, rawRef, inGraph, outGraph, bridge),
    getOwnPropertyDescriptor: createHandlerFn(debugMode, prevProxyHandler.getOwnPropertyDescriptor, rawRef, inGraph, outGraph, bridge),
    defineProperty: createHandlerFn(debugMode, prevProxyHandler.defineProperty, rawRef, inGraph, outGraph, bridge),
    has: createHandlerFn(debugMode, prevProxyHandler.has, rawRef, inGraph, outGraph, bridge),
    get: createHandlerFn(debugMode, prevProxyHandler.get, rawRef, inGraph, outGraph, bridge),
    set: createHandlerFn(debugMode, prevProxyHandler.set, rawRef, inGraph, outGraph, bridge),
    deleteProperty: createHandlerFn(debugMode, prevProxyHandler.deleteProperty, rawRef, inGraph, outGraph, bridge),
    ownKeys: createHandlerFn(debugMode, prevProxyHandler.ownKeys, rawRef, inGraph, outGraph, bridge),
    apply: createHandlerFn(debugMode, prevProxyHandler.apply, rawRef, inGraph, outGraph, bridge),
    construct: createHandlerFn(debugMode, prevProxyHandler.construct, rawRef, inGraph, outGraph, bridge)
  }
  return proxyHandler
}

function createHandlerFn (debugMode, reflectFn, rawRef, inGraph, outGraph, bridge) {
  if (debugMode) {
    // in debugMode, we dont safely catch and wrap errors
    // while this is insecure, it makes debugging much easier
    return function (_, ...outArgs) {
      const inArgs = outArgs.map(arg => bridge(arg, outGraph, inGraph))
      let value = reflectFn(rawRef, ...inArgs)
      return bridge(value, inGraph, outGraph)
    }
  }
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

module.exports = { Membrane, MembraneSpace }

//
// FlexibleProxy
//

function createFlexibleProxy (realTarget, realHandler) {
  const flexibleTarget = getProxyTargetForValue(realTarget)
  const flexibleHandler = respectProxyInvariants(realHandler)
  return new Proxy(flexibleTarget, flexibleHandler)
}

// use replacement proxyTarget for flexible distortions less restrained by "Proxy invariant"
// e.g. hide otherwise non-configurable properties
function getProxyTargetForValue (value) {
  if (typeof value === 'function') {
    if (value.prototype) {
      return function () {}
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

// TODO ensure we're enforcing all proxy invariants
function respectProxyInvariants (rawProxyHandler) {
  // the defaults arent needed for the membraneProxyHandler,
  // but might be for an imcomplete proxy handler
  const handlerWithDefaults = Object.assign({}, Reflect, rawProxyHandler)
  const respectfulProxyHandler = Object.assign({}, handlerWithDefaults)
  // enforce configurable false props
  respectfulProxyHandler.getOwnPropertyDescriptor = (fakeTarget, key) => {
    // ensure propDesc matches proxy target's non-configurable property
    const propDesc = handlerWithDefaults.getOwnPropertyDescriptor(fakeTarget, key)
    if (propDesc && !propDesc.configurable) {
      const proxyTargetPropDesc = Reflect.getOwnPropertyDescriptor(fakeTarget, key)
      const proxyTargetPropIsConfigurable = (!proxyTargetPropDesc || proxyTargetPropDesc.configurable)
      // console.warn('@@ getOwnPropertyDescriptor - non configurable', String(key), !!proxyTargetPropIsConfigurable)
      // if proxy target is configurable (and real target is not) update the proxy target to ensure the invariant holds
      if (proxyTargetPropIsConfigurable) {
        Reflect.defineProperty(fakeTarget, key, propDesc)
      }
    }
    return propDesc
  }
  // enforce preventing extensions
  respectfulProxyHandler.preventExtensions = (fakeTarget) => {
    // check if provided handler allowed the preventExtensions call
    const didAllow = handlerWithDefaults.preventExtensions(fakeTarget)
    // if it did allow, we need to enforce this on the fakeTarget
    if (didAllow === true) {
      // transfer all keys onto fakeTarget
      const propDescs = handlerWithDefaults.ownKeys(fakeTarget).map(prop => {
        const propDesc = handlerWithDefaults.getOwnPropertyDescriptor(fakeTarget, prop)
        Reflect.defineProperty(fakeTarget, prop, propDesc)
      })
      // transfer prototype
      Reflect.setPrototypeOf(fakeTarget, handlerWithDefaults.getPrototypeOf(fakeTarget))
      // prevent extensions on fakeTarget
      Reflect.preventExtensions(fakeTarget)
    }
    // return the result
    return didAllow
  }
  // enforce defineProperty configurable: false
  respectfulProxyHandler.defineProperty = (fakeTarget, prop, propDesc) => {
    const didAllow = handlerWithDefaults.defineProperty(fakeTarget, prop, propDesc)
    // need to also define on the fakeTarget
    if (didAllow && !propDesc.configurable) {
      Reflect.defineProperty(fakeTarget, prop, propDesc)
    }
    return didAllow
  }
  // return modified handler
  return respectfulProxyHandler
}
},{"./getIntrinsics":8}]},{},[9])(9)
});

// END of injected code from cytoplasm
  })()
  return module.exports
})()
    const createReadOnlyDistortion = // define cytoplasm/distortions/readOnly
(function(){
  const global = globalRef
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
      // Override mistake workaround
      if (target === receiver) {
        return false
      }

      // Indirect set, redirect to a defineProperty
      return Reflect.defineProperty(receiver, key, { value, enumerable: true, writable: true, configurable: true })
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
    ownKeys: Reflect.ownKeys
  }
}

// END of injected code from cytoplasm/distortions/readOnly
  })()
  return module.exports
})()

    const moduleCache = new Map()
    const globalStore = new Map()
    const membraneSpaceForPackage = new Map()
    const membrane = new Membrane({ debugMode })

    return {
      internalRequire,
    }

    // this function instantiaties a module from a moduleId.
    // 1. loads the config for the module
    // 2. instantiates in the config specified environment
    // 3. calls config specified strategy for "protectExportsInstantiationTime"
    function internalRequire (moduleId) {
      if (moduleCache.has(moduleId)) {
        const moduleExports = moduleCache.get(moduleId).exports
        return moduleExports
      }
      const moduleData = loadModuleData(moduleId)

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
      const packageMembraneSpace = getMembraneSpaceForPackage(packageName)
      const isEntryModule = moduleData.package === '<root>'

      // create the initial moduleObj
      const moduleObj = { exports: {} }
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

      // allow moduleInitializer to be set by loadModuleData
      let moduleInitializer = moduleData.moduleInitializer
      // otherwise setup initializer from moduleSource
      if (!moduleInitializer) {
        // determine if its a SES-wrapped or naked module initialization
        if (runInSes) {
          // set the module initializer as the SES-wrapped version
          const moduleRealm = realm.global.Realm.makeCompartment()
          const globalsConfig = configForModule.globals
          const endowmentsMembraneSpace = getMembraneSpaceForPackage('<endowments>')
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
      }
      if (typeof moduleInitializer !== 'function') {
        throw new Error(`LavaMoat - moduleInitializer is not defined correctly. got "${typeof moduleInitializer}" ses:${runInSes}\n${moduleSource}`)
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
      moduleInitializer.call(moduleObj.exports, requireRelativeWithContext, moduleObj, moduleObj.exports, null, directModuleInstantiationInterface)

      // configure membrane defense
      // defense is configured here but applied elsewhere
      // set moduleExports graph to read-only
      const moduleExports = moduleObj.exports
      deepWalk(moduleExports, (value) => {
        // skip plain values
        if (membrane.shouldSkipBridge(value)) return
        // set this ref to read-only
        packageMembraneSpace.handlerForRef.set(value, createReadOnlyDistortion({
          setHandlerForRef: (ref, newHandler) => packageMembraneSpace.handlerForRef.set(ref, newHandler)
        }))
      })

      return moduleExports

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
      const parentPackagesWhitelist = parentPackageConfig.packages

      // resolve the moduleId from the requestedName
      const moduleId = getRelativeModuleId(parentModuleId, requestedName)

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
      const moduleData = loadModuleData(moduleId)
      const packageName = moduleData.package

      // disallow requiring packages that are not in the parent's whitelist
      const isSamePackage = packageName === parentModulePackageName
      const isInParentWhitelist = packageName in parentPackagesWhitelist
      const parentIsEntryModule = parentModulePackageName === '<root>'

      if (!parentIsEntryModule && !isSamePackage && !isInParentWhitelist) {
        throw new Error(`LavaMoat - required package not in whitelist: package "${parentModulePackageName}" requested "${packageName}" as "${requestedName}"`)
      }

      // moduleExports require-time protection
      if (parentModulePackageName && isSamePackage) {
        // return raw if same package
        return moduleExports
      } else {
        // apply membrane protections
        const inGraph = getMembraneSpaceForPackage(packageName)
        let outGraph
        // set <root>'s membrane space to <endowments> so it receives unwrapped refs
        if (parentModulePackageName === '<root>') {
          outGraph = getMembraneSpaceForPackage('<endowments>')
        } else {
          outGraph = getMembraneSpaceForPackage(parentModulePackageName)
        }
        const protectedExports = membrane.bridge(moduleExports, inGraph, outGraph)
        return protectedExports
      }
    }

    function getMembraneSpaceForPackage (packageName) {
      if (membraneSpaceForPackage.has(packageName)) {
        return membraneSpaceForPackage.get(packageName)
      }

      const membraneSpace = membrane.makeMembraneSpace({
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
      // lookup children
      let proto, props = []
      try {
        proto = Object.getPrototypeOf(value)
        props = Object.values(Object.getOwnPropertyDescriptors(value))
      } catch (_) {
        // ignore error if we can't get proto/props (value is undefined, null, etc)
      }
      // the own properties
      props.map(entry => {
        if ('value' in entry) visitor(entry.value)
      })
      // the prototype
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

    //# sourceURL=Lavamoat/core/kernel
  }

})()
  const { internalRequire } = createKernel({
    realm,
    unsafeEvalWithEndowments,
    globalRef,
    debugMode,
    lavamoatConfig,
    loadModuleData,
    getRelativeModuleId,
  })

  // create a lavamoat pulic API for loading modules over multiple files
  const lavamoatPublicApi = Object.freeze({
    loadBundle: Object.freeze(loadBundle),
  })
  globalRef.LavaMoat = lavamoatPublicApi

  return loadBundle


  // this performs an unsafeEval in the context of the provided endowments
  function unsafeEvalWithEndowments(code, endowments) {
    with (endowments) {
      return eval(code)
    }
  }


  // it is called by the modules collection that will be appended to this file
  function loadBundle (newModules, entryPoints, newConfig) {
    // verify + load config
    Object.entries(newConfig.resources || {}).forEach(([packageName, packageConfig]) => {
      if (packageName in lavamoatConfig) {
        throw new Error(`LavaMoat - loadBundle encountered redundant config definition for package "${packageName}"`)
      }
      lavamoatConfig.resources[packageName] = packageConfig
    })
    // verify + load in each module
    for (const [moduleId, moduleData] of Object.entries(newModules)) {
      // verify that module is new
      if (moduleId in modules) {
        throw new Error(`LavaMoat - loadBundle encountered redundant module definition for id "${moduleId}"`)
      }
      // convert all module source to string
      // this could happen at build time,
      // but shipping it as code makes it easier to debug, maybe
      for (let moduleData of Object.values(newModules)) {
        let moduleSource = `(${moduleData.source})`
        if (moduleData.file) {
          const moduleSourceLabel = `// moduleSource: ${moduleData.file}`
          moduleSource += `\n\n${moduleSourceLabel}`
        }
        moduleData.sourceString = moduleSource
      }
      // add the module
      modules[moduleId] = moduleData
    }
    // run each of entryPoints
    const entryExports = Array.prototype.map.call(entryPoints, (entryId) => {
      return internalRequire(entryId)
    })
    // webpack compat: return the first module's exports
    return entryExports[0]
  }

  function loadModuleData (moduleId) {
    return modules[moduleId]
  }

  function getRelativeModuleId (parentModuleId, requestedName) {
    const parentModuleData = modules[parentModuleId]
    if (!(requestedName in parentModuleData.deps)) {
      console.warn(`missing dep: ${parentModuleData.packageName} requested ${requestedName}`)
    }
    return parentModuleData.deps[requestedName] || requestedName
  }

})()
;
LavaMoat.loadBundle({1:{ package: "<root>", packageVersion: undefined, file: "/home/xyz/Development/lavamoat/packages/browserify/examples/00-simple-cli/index.js", deps: {"metamask-logo":10}, source: (function () {
  // source: ${filename}
  return function (require, module, exports) {
const ModelViewer = require('metamask-logo')

// To render with fixed dimensions:
const viewer = ModelViewer({

  // Dictates whether width & height are px or multiplied
  pxNotRatio: true,
  width: 500,
  height: 400,
  // pxNotRatio: false,
  // width: 0.9,
  // height: 0.9,

  // To make the face follow the mouse.
  followMouse: false,

  // head should slowly drift (overrides lookAt)
  slowDrift: false,

})

// add viewer to DOM
const container = document.body
container.appendChild(viewer.container)

// look at something on the page
viewer.lookAt({
  x: 100,
  y: 100,
})

// enable mouse follow
viewer.setFollowMouse(true)

// add metamask text
const textElement = document.createElement('div')
textElement.innerText = 'LavaMoat made with love by MetaMask'
container.appendChild(textElement)
  }
}).call(this)
},2:{ package: "gl-mat4", packageVersion: "1.1.4", file: "/home/xyz/Development/lavamoat/packages/browserify/examples/00-simple-cli/node_modules/gl-mat4/identity.js", deps: {}, source: (function () {
  // source: ${filename}
  return function (require, module, exports) {
module.exports = identity;

/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */
function identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
  }
}).call(this)
},3:{ package: "gl-mat4", packageVersion: "1.1.4", file: "/home/xyz/Development/lavamoat/packages/browserify/examples/00-simple-cli/node_modules/gl-mat4/invert.js", deps: {}, source: (function () {
  // source: ${filename}
  return function (require, module, exports) {
module.exports = invert;

/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
function invert(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
};
  }
}).call(this)
},4:{ package: "gl-mat4", packageVersion: "1.1.4", file: "/home/xyz/Development/lavamoat/packages/browserify/examples/00-simple-cli/node_modules/gl-mat4/lookAt.js", deps: {"./identity":2}, source: (function () {
  // source: ${filename}
  return function (require, module, exports) {
var identity = require('./identity');

module.exports = lookAt;

/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {vec3} eye Position of the viewer
 * @param {vec3} center Point the viewer is looking at
 * @param {vec3} up vec3 pointing up
 * @returns {mat4} out
 */
function lookAt(out, eye, center, up) {
    var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
        eyex = eye[0],
        eyey = eye[1],
        eyez = eye[2],
        upx = up[0],
        upy = up[1],
        upz = up[2],
        centerx = center[0],
        centery = center[1],
        centerz = center[2];

    if (Math.abs(eyex - centerx) < 0.000001 &&
        Math.abs(eyey - centery) < 0.000001 &&
        Math.abs(eyez - centerz) < 0.000001) {
        return identity(out);
    }

    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;

    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
        x0 = 0;
        x1 = 0;
        x2 = 0;
    } else {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }

    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;

    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
        y0 = 0;
        y1 = 0;
        y2 = 0;
    } else {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
    }

    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;

    return out;
};
  }
}).call(this)
},5:{ package: "gl-mat4", packageVersion: "1.1.4", file: "/home/xyz/Development/lavamoat/packages/browserify/examples/00-simple-cli/node_modules/gl-mat4/multiply.js", deps: {}, source: (function () {
  // source: ${filename}
  return function (require, module, exports) {
module.exports = multiply;

/**
 * Multiplies two mat4's
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @returns {mat4} out
 */
function multiply(out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    // Cache only the current line of the second matrix
    var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];  
    out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    return out;
};
  }
}).call(this)
},6:{ package: "gl-mat4", packageVersion: "1.1.4", file: "/home/xyz/Development/lavamoat/packages/browserify/examples/00-simple-cli/node_modules/gl-mat4/perspective.js", deps: {}, source: (function () {
  // source: ${filename}
  return function (require, module, exports) {
module.exports = perspective;

/**
 * Generates a perspective projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
function perspective(out, fovy, aspect, near, far) {
    var f = 1.0 / Math.tan(fovy / 2),
        nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) * nf;
    out[15] = 0;
    return out;
};
  }
}).call(this)
},7:{ package: "gl-mat4", packageVersion: "1.1.4", file: "/home/xyz/Development/lavamoat/packages/browserify/examples/00-simple-cli/node_modules/gl-mat4/rotate.js", deps: {}, source: (function () {
  // source: ${filename}
  return function (require, module, exports) {
module.exports = rotate;

/**
 * Rotates a mat4 by the given angle
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {vec3} axis the axis to rotate around
 * @returns {mat4} out
 */
function rotate(out, a, rad, axis) {
    var x = axis[0], y = axis[1], z = axis[2],
        len = Math.sqrt(x * x + y * y + z * z),
        s, c, t,
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23,
        b00, b01, b02,
        b10, b11, b12,
        b20, b21, b22;

    if (Math.abs(len) < 0.000001) { return null; }
    
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;

    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;

    a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
    a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
    a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

    // Construct the elements of the rotation matrix
    b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
    b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
    b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

    // Perform rotation-specific matrix multiplication
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }
    return out;
};
  }
}).call(this)
},8:{ package: "gl-vec3", packageVersion: "1.0.3", file: "/home/xyz/Development/lavamoat/packages/browserify/examples/00-simple-cli/node_modules/gl-vec3/transformMat4.js", deps: {}, source: (function () {
  // source: ${filename}
  return function (require, module, exports) {
module.exports = transformMat4;

/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec3} out
 */
function transformMat4(out, a, m) {
    var x = a[0], y = a[1], z = a[2],
        w = m[3] * x + m[7] * y + m[11] * z + m[15]
    w = w || 1.0
    out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w
    out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w
    out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w
    return out
}
  }
}).call(this)
},9:{ package: "metamask-logo", packageVersion: "2.2.1", file: "/home/xyz/Development/lavamoat/packages/browserify/examples/00-simple-cli/node_modules/metamask-logo/fox.json", deps: {}, source: (function () {
  // source: ${filename}
  return function (require, module, exports) {
module.exports={
  "positions": [
    [
      111.0246,
      52.6046,
      46.2259
    ],
    [
      114.025,
      87.6733,
      58.9818
    ],
    [
      66.192,
      80.898,
      55.3943
    ],
    [
      72.1133,
      35.4918,
      30.8714
    ],
    [
      97.8045,
      116.561,
      73.9788
    ],
    [
      16.7623,
      58.0109,
      58.0782
    ],
    [
      52.6089,
      30.3641,
      42.5561
    ],
    [
      106.8814,
      31.9455,
      46.9133
    ],
    [
      113.4846,
      38.6049,
      49.1215
    ],
    [
      108.6633,
      43.2332,
      46.3154
    ],
    [
      101.2166,
      15.9822,
      46.3082
    ],
    [
      16.6605,
      -16.2883,
      93.6187
    ],
    [
      40.775,
      -10.2288,
      85.2764
    ],
    [
      23.9269,
      -2.5103,
      86.7365
    ],
    [
      11.1691,
      -7.0037,
      99.3776
    ],
    [
      9.5692,
      -34.3939,
      141.672
    ],
    [
      12.596,
      7.1655,
      88.741
    ],
    [
      61.1809,
      8.8142,
      76.9968
    ],
    [
      39.7195,
      -28.9271,
      88.9638
    ],
    [
      13.7962,
      -68.5757,
      132.057
    ],
    [
      15.2674,
      -62.32,
      129.688
    ],
    [
      14.8446,
      -52.6096,
      140.113
    ],
    [
      12.8917,
      -49.7716,
      144.741
    ],
    [
      35.6042,
      -71.758,
      81.0639
    ],
    [
      47.4625,
      -68.6061,
      63.3697
    ],
    [
      38.2486,
      -64.7302,
      38.9099
    ],
    [
      -12.8917,
      -49.7716,
      144.741
    ],
    [
      -13.7962,
      -68.5757,
      132.057
    ],
    [
      17.8021,
      -71.758,
      81.0639
    ],
    [
      19.1243,
      -69.0168,
      49.4201
    ],
    [
      38.2486,
      -66.2756,
      17.7762
    ],
    [
      12.8928,
      -36.7035,
      141.672
    ],
    [
      109.284,
      -93.5899,
      27.8243
    ],
    [
      122.118,
      -36.8894,
      35.025
    ],
    [
      67.7668,
      -30.197,
      78.4178
    ],
    [
      33.1807,
      101.852,
      25.3186
    ],
    [
      9.4063,
      -35.5898,
      150.722
    ],
    [
      -9.5692,
      -34.3939,
      141.672
    ],
    [
      -9.4063,
      -35.5898,
      150.722
    ],
    [
      11.4565,
      -37.8994,
      150.722
    ],
    [
      -12.596,
      7.1655,
      88.741
    ],
    [
      -11.1691,
      -7.0037,
      99.3776
    ],
    [
      70.2365,
      62.8362,
      -3.9475
    ],
    [
      47.2634,
      54.294,
      -27.4148
    ],
    [
      28.7302,
      91.7311,
      -24.9726
    ],
    [
      69.1676,
      6.5862,
      -12.7757
    ],
    [
      28.7302,
      49.1003,
      -48.3596
    ],
    [
      31.903,
      5.692,
      -47.822
    ],
    [
      35.0758,
      -34.4329,
      -16.2809
    ],
    [
      115.2841,
      48.6815,
      48.6841
    ],
    [
      110.8428,
      28.4821,
      49.1762
    ],
    [
      -19.1243,
      -69.0168,
      49.4201
    ],
    [
      -38.2486,
      -66.2756,
      17.7762
    ],
    [
      -111.0246,
      52.6046,
      46.2259
    ],
    [
      -72.1133,
      35.4918,
      30.8714
    ],
    [
      -66.192,
      80.898,
      55.3943
    ],
    [
      -114.025,
      87.6733,
      58.9818
    ],
    [
      -97.8045,
      116.561,
      73.9788
    ],
    [
      -52.6089,
      30.3641,
      42.5561
    ],
    [
      -16.7623,
      58.0109,
      58.0782
    ],
    [
      -106.8814,
      31.9455,
      46.9133
    ],
    [
      -108.6633,
      43.2332,
      46.3154
    ],
    [
      -113.4846,
      38.6049,
      49.1215
    ],
    [
      -101.2166,
      15.9822,
      46.3082
    ],
    [
      -16.6605,
      -16.2883,
      93.6187
    ],
    [
      -23.9269,
      -2.5103,
      86.7365
    ],
    [
      -40.775,
      -10.2288,
      85.2764
    ],
    [
      -61.1809,
      8.8142,
      76.9968
    ],
    [
      -39.7195,
      -28.9271,
      88.9638
    ],
    [
      -14.8446,
      -52.6096,
      140.113
    ],
    [
      -15.2674,
      -62.32,
      129.688
    ],
    [
      -47.4625,
      -68.6061,
      63.3697
    ],
    [
      -35.6042,
      -71.758,
      81.0639
    ],
    [
      -38.2486,
      -64.7302,
      38.9099
    ],
    [
      -17.8021,
      -71.758,
      81.0639
    ],
    [
      -12.8928,
      -36.7035,
      141.672
    ],
    [
      -67.7668,
      -30.197,
      78.4178
    ],
    [
      -122.118,
      -36.8894,
      35.025
    ],
    [
      -109.284,
      -93.5899,
      27.8243
    ],
    [
      -33.1807,
      101.852,
      25.3186
    ],
    [
      -11.4565,
      -37.8994,
      150.722
    ],
    [
      -70.2365,
      62.8362,
      -3.9475
    ],
    [
      -28.7302,
      91.7311,
      -24.9726
    ],
    [
      -47.2634,
      54.294,
      -27.4148
    ],
    [
      -69.1676,
      6.5862,
      -12.7757
    ],
    [
      -28.7302,
      49.1003,
      -48.3596
    ],
    [
      -31.903,
      5.692,
      -47.822
    ],
    [
      -35.0758,
      -34.4329,
      -16.2809
    ],
    [
      -115.2841,
      48.6815,
      48.6841
    ],
    [
      -110.8428,
      28.4821,
      49.1762
    ]
  ],
  "chunks": [
    {
      "color": [
        246,
        133,
        27
      ],
      "faces": [
        [
          17,
          33,
          10
        ],
        [
          17,
          18,
          34
        ],
        [
          34,
          33,
          17
        ],
        [
          10,
          6,
          17
        ],
        [
          11,
          15,
          31
        ],
        [
          31,
          18,
          11
        ],
        [
          18,
          12,
          11
        ],
        [
          14,
          16,
          40
        ],
        [
          40,
          41,
          14
        ],
        [
          59,
          5,
          35
        ],
        [
          35,
          79,
          59
        ],
        [
          67,
          63,
          77
        ],
        [
          67,
          77,
          76
        ],
        [
          76,
          68,
          67
        ],
        [
          63,
          67,
          58
        ],
        [
          64,
          68,
          75
        ],
        [
          75,
          37,
          64
        ],
        [
          68,
          64,
          66
        ],
        [
          14,
          41,
          37
        ],
        [
          37,
          15,
          14
        ],
        [
          5,
          59,
          40
        ],
        [
          40,
          16,
          5
        ]
      ]
    },
    {
      "color": [
        228,
        118,
        27
      ],
      "faces": [
        [
          31,
          24,
          18
        ],
        [
          6,
          5,
          16
        ],
        [
          16,
          17,
          6
        ],
        [
          24,
          32,
          33
        ],
        [
          33,
          34,
          24
        ],
        [
          5,
          4,
          35
        ],
        [
          75,
          68,
          71
        ],
        [
          58,
          67,
          40
        ],
        [
          40,
          59,
          58
        ],
        [
          71,
          76,
          77
        ],
        [
          77,
          78,
          71
        ]
      ]
    },
    {
      "color": [
        118,
        61,
        22
      ],
      "faces": [
        [
          0,
          1,
          2
        ],
        [
          2,
          3,
          0
        ],
        [
          4,
          5,
          2
        ],
        [
          6,
          3,
          2
        ],
        [
          2,
          5,
          6
        ],
        [
          7,
          8,
          9
        ],
        [
          10,
          3,
          6
        ],
        [
          10,
          50,
          7
        ],
        [
          7,
          3,
          10
        ],
        [
          7,
          9,
          3
        ],
        [
          49,
          0,
          9
        ],
        [
          3,
          9,
          0
        ],
        [
          53,
          54,
          55
        ],
        [
          55,
          56,
          53
        ],
        [
          57,
          56,
          55
        ],
        [
          58,
          59,
          55
        ],
        [
          55,
          54,
          58
        ],
        [
          60,
          61,
          62
        ],
        [
          63,
          58,
          54
        ],
        [
          63,
          60,
          89
        ],
        [
          60,
          63,
          54
        ],
        [
          60,
          54,
          61
        ],
        [
          88,
          61,
          53
        ],
        [
          54,
          53,
          61
        ],
        [
          2,
          1,
          4
        ],
        [
          55,
          59,
          57
        ]
      ]
    },
    {
      "color": [
        22,
        22,
        22
      ],
      "faces": [
        [
          36,
          15,
          37
        ],
        [
          37,
          38,
          36
        ],
        [
          31,
          39,
          22
        ],
        [
          22,
          21,
          31
        ],
        [
          31,
          15,
          36
        ],
        [
          36,
          39,
          31
        ],
        [
          75,
          69,
          26
        ],
        [
          26,
          80,
          75
        ],
        [
          75,
          80,
          38
        ],
        [
          38,
          37,
          75
        ],
        [
          38,
          80,
          39
        ],
        [
          39,
          36,
          38
        ],
        [
          39,
          80,
          26
        ],
        [
          26,
          22,
          39
        ]
      ]
    },
    {
      "color": [
        215,
        193,
        179
      ],
      "faces": [
        [
          21,
          20,
          24
        ],
        [
          24,
          31,
          21
        ],
        [
          69,
          71,
          70
        ],
        [
          71,
          69,
          75
        ]
      ]
    },
    {
      "color": [
        192,
        173,
        158
      ],
      "faces": [
        [
          19,
          20,
          21
        ],
        [
          21,
          22,
          19
        ],
        [
          20,
          19,
          23
        ],
        [
          23,
          24,
          20
        ],
        [
          23,
          25,
          24
        ],
        [
          19,
          22,
          26
        ],
        [
          26,
          27,
          19
        ],
        [
          23,
          28,
          29
        ],
        [
          23,
          29,
          30
        ],
        [
          25,
          23,
          30
        ],
        [
          29,
          51,
          52
        ],
        [
          52,
          30,
          29
        ],
        [
          27,
          26,
          69
        ],
        [
          69,
          70,
          27
        ],
        [
          70,
          71,
          72
        ],
        [
          72,
          27,
          70
        ],
        [
          72,
          71,
          73
        ],
        [
          51,
          74,
          72
        ],
        [
          52,
          51,
          72
        ],
        [
          73,
          52,
          72
        ],
        [
          19,
          27,
          74
        ],
        [
          74,
          28,
          19
        ],
        [
          51,
          29,
          28
        ],
        [
          28,
          74,
          51
        ],
        [
          74,
          27,
          72
        ],
        [
          28,
          23,
          19
        ]
      ]
    },
    {
      "color": [
        205,
        97,
        22
      ],
      "faces": [
        [
          24,
          34,
          18
        ],
        [
          16,
          13,
          12
        ],
        [
          12,
          17,
          16
        ],
        [
          13,
          16,
          11
        ],
        [
          71,
          68,
          76
        ],
        [
          40,
          67,
          66
        ],
        [
          66,
          65,
          40
        ],
        [
          65,
          64,
          40
        ]
      ]
    },
    {
      "color": [
        35,
        52,
        71
      ],
      "faces": [
        [
          11,
          12,
          13
        ],
        [
          64,
          65,
          66
        ]
      ]
    },
    {
      "color": [
        228,
        117,
        31
      ],
      "faces": [
        [
          14,
          15,
          11
        ],
        [
          11,
          16,
          14
        ],
        [
          17,
          12,
          18
        ],
        [
          41,
          64,
          37
        ],
        [
          67,
          68,
          66
        ]
      ]
    },
    {
      "color": [
        226,
        118,
        27
      ],
      "faces": [
        [
          35,
          4,
          42
        ],
        [
          4,
          1,
          42
        ],
        [
          42,
          43,
          44
        ],
        [
          44,
          35,
          42
        ],
        [
          45,
          43,
          42
        ],
        [
          42,
          10,
          45
        ],
        [
          30,
          32,
          24
        ],
        [
          24,
          25,
          30
        ],
        [
          30,
          33,
          32
        ],
        [
          33,
          30,
          10
        ],
        [
          44,
          43,
          46
        ],
        [
          43,
          45,
          47
        ],
        [
          47,
          46,
          43
        ],
        [
          48,
          47,
          45
        ],
        [
          45,
          30,
          48
        ],
        [
          30,
          45,
          10
        ],
        [
          49,
          42,
          0
        ],
        [
          8,
          7,
          42
        ],
        [
          50,
          42,
          7
        ],
        [
          50,
          10,
          42
        ],
        [
          1,
          0,
          42
        ],
        [
          42,
          9,
          8
        ],
        [
          42,
          49,
          9
        ],
        [
          64,
          41,
          40
        ],
        [
          57,
          59,
          79
        ],
        [
          79,
          81,
          57
        ],
        [
          57,
          81,
          56
        ],
        [
          82,
          79,
          35
        ],
        [
          35,
          44,
          82
        ],
        [
          81,
          79,
          82
        ],
        [
          82,
          83,
          81
        ],
        [
          84,
          63,
          81
        ],
        [
          81,
          83,
          84
        ],
        [
          44,
          46,
          85
        ],
        [
          85,
          82,
          44
        ],
        [
          52,
          73,
          71
        ],
        [
          71,
          78,
          52
        ],
        [
          52,
          78,
          77
        ],
        [
          77,
          63,
          52
        ],
        [
          82,
          85,
          83
        ],
        [
          83,
          85,
          86
        ],
        [
          86,
          84,
          83
        ],
        [
          87,
          52,
          84
        ],
        [
          84,
          86,
          87
        ],
        [
          52,
          63,
          84
        ],
        [
          88,
          53,
          81
        ],
        [
          62,
          81,
          60
        ],
        [
          89,
          60,
          81
        ],
        [
          89,
          81,
          63
        ],
        [
          56,
          81,
          53
        ],
        [
          81,
          62,
          61
        ],
        [
          81,
          61,
          88
        ],
        [
          48,
          87,
          86
        ],
        [
          86,
          47,
          48
        ],
        [
          47,
          86,
          85
        ],
        [
          85,
          46,
          47
        ],
        [
          48,
          30,
          52
        ],
        [
          52,
          87,
          48
        ]
      ]
    }
  ]
}

  }
}).call(this)
},10:{ package: "metamask-logo", packageVersion: "2.2.1", file: "/home/xyz/Development/lavamoat/packages/browserify/examples/00-simple-cli/node_modules/metamask-logo/index.js", deps: {"./fox.json":9,"gl-mat4/invert":3,"gl-mat4/lookAt":4,"gl-mat4/multiply":5,"gl-mat4/perspective":6,"gl-mat4/rotate":7,"gl-vec3/transformMat4":8}, source: (function () {
  // source: ${filename}
  return function (require, module, exports) {
var perspective = require('gl-mat4/perspective')
var multiply = require('gl-mat4/multiply')
var lookAt = require('gl-mat4/lookAt')
var invert = require('gl-mat4/invert')
var rotate = require('gl-mat4/rotate')
var transform = require('gl-vec3/transformMat4')
var foxJSON = require('./fox.json')

var SVG_NS = 'http://www.w3.org/2000/svg'

function createNode (type) {
  return document.createElementNS(SVG_NS, type)
}

function setAttribute (node, attribute, value) {
  node.setAttributeNS(null, attribute, value)
}

module.exports = function createLogo (options_) {
  var options = options_ || {}

  var followCursor = !!options.followMouse
  var followMotion = !!options.followMotion
  var slowDrift = !!options.slowDrift
  var shouldRender = true

  var DISTANCE = 400
  var lookCurrent = [0, 0]
  var lookRate = 0.3

  var width = options.width || 400
  var height = options.height || 400
  var container = createNode('svg')
  var mouse = {
    x: 0,
    y: 0
  }

  var NUM_VERTS = foxJSON.positions.length

  var positions = new Float32Array(3 * NUM_VERTS)
  var transformed = new Float32Array(3 * NUM_VERTS)

  var toDraw = []

  if (!options.pxNotRatio) {
    width = (window.innerWidth * (options.width || 0.25)) | 0
    height = ((window.innerHeight * options.height) || width) | 0

    if ('minWidth' in options && width < options.minWidth) {
      width = options.minWidth
      height = (options.minWidth * options.height / options.width) | 0
    }
  }

  setAttribute(container, 'width', width + 'px')
  setAttribute(container, 'height', height + 'px')

  function setLookAt (target) {
    var bounds = container.getBoundingClientRect()
    mouse.x = 1.0 - 2.0 * (target.x - bounds.left) / bounds.width
    mouse.y = 1.0 - 2.0 * (target.y - bounds.top) / bounds.height
  }

  document.body.appendChild(container)

  ;(function () {
    var pp = foxJSON.positions
    var ptr = 0
    for (var i = 0; i < pp.length; ++i) {
      var p = pp[i]
      for (var j = 0; j < 3; ++j) {
        positions[ptr++] = p[j]
      }
    }
  })()

  function Polygon (svg, indices) {
    this.svg = svg
    this.indices = indices
    this.zIndex = 0
  }

  var polygons = (function () {
    var polygons = []
    for (var i = 0; i < foxJSON.chunks.length; ++i) {
      var chunk = foxJSON.chunks[i]
      var color = 'rgb(' + chunk.color + ')'
      var faces = chunk.faces
      for (var j = 0; j < faces.length; ++j) {
        var f = faces[j]
        var polygon = createNode('polygon')
        setAttribute(
          polygon,
          'fill',
          color)
        setAttribute(
          polygon,
          'stroke',
          color)
        setAttribute(
          polygon,
          'points',
          '0,0, 10,0, 0,10')
        container.appendChild(polygon)
        polygons.push(new Polygon(polygon, f))
      }
    }
    return polygons
  })()

  var computeMatrix = (function () {
    var objectCenter = new Float32Array(3)
    var up = new Float32Array([0, 1, 0])
    var projection = new Float32Array(16)
    var model = new Float32Array(16)
    var view = lookAt(
      new Float32Array(16),
      new Float32Array([0, 0, DISTANCE]),
      objectCenter,
      up)
    var invView = invert(new Float32Array(16), view)
    var invProjection = new Float32Array(16)
    var target = new Float32Array(3)
    var transformed = new Float32Array(16)

    var X = new Float32Array([1, 0, 0])
    var Y = new Float32Array([0, 1, 0])
    var Z = new Float32Array([0, 0, 1])

    return function () {
      var rect = container.getBoundingClientRect()
      var viewportWidth = rect.width
      var viewportHeight = rect.height
      perspective(
        projection,
        Math.PI / 4.0,
        viewportWidth / viewportHeight,
        100.0,
        1000.0)
      invert(invProjection, projection)
      target[0] = lookCurrent[0]
      target[1] = lookCurrent[1]
      target[2] = 1.2
      transform(target, target, invProjection)
      transform(target, target, invView)
      lookAt(
        model,
        objectCenter,
        target,
        up)
      if (slowDrift) {
        var time = (Date.now() / 1000.0)
        rotate(model, model, 0.1 + (Math.sin(time / 3) * 0.2), X)
        rotate(model, model, -0.1 + (Math.sin(time / 2) * 0.03), Z)
        rotate(model, model, 0.5 + (Math.sin(time / 3) * 0.2), Y)
      }

      multiply(transformed, projection, view)
      multiply(transformed, transformed, model)

      return transformed
    }
  })()

  function updatePositions (M) {
    var m00 = M[0]
    var m01 = M[1]
    var m02 = M[2]
    var m03 = M[3]
    var m10 = M[4]
    var m11 = M[5]
    var m12 = M[6]
    var m13 = M[7]
    var m20 = M[8]
    var m21 = M[9]
    var m22 = M[10]
    var m23 = M[11]
    var m30 = M[12]
    var m31 = M[13]
    var m32 = M[14]
    var m33 = M[15]

    for (var i = 0; i < NUM_VERTS; ++i) {
      var x = positions[3 * i]
      var y = positions[3 * i + 1]
      var z = positions[3 * i + 2]

      var tw = x * m03 + y * m13 + z * m23 + m33
      transformed[3 * i] =
        (x * m00 + y * m10 + z * m20 + m30) / tw
      transformed[3 * i + 1] =
        (x * m01 + y * m11 + z * m21 + m31) / tw
      transformed[3 * i + 2] =
        (x * m02 + y * m12 + z * m22 + m32) / tw
    }
  }

  function compareZ (a, b) {
    return b.zIndex - a.zIndex
  }

  function updateFaces () {
    var i
    var rect = container.getBoundingClientRect()
    var w = rect.width
    var h = rect.height
    toDraw.length = 0
    for (i = 0; i < polygons.length; ++i) {
      var poly = polygons[i]
      var indices = poly.indices

      var i0 = indices[0]
      var i1 = indices[1]
      var i2 = indices[2]
      var ax = transformed[3 * i0]
      var ay = transformed[3 * i0 + 1]
      var bx = transformed[3 * i1]
      var by = transformed[3 * i1 + 1]
      var cx = transformed[3 * i2]
      var cy = transformed[3 * i2 + 1]
      var det = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
      if (det < 0) {
        continue
      }

      var points = []
      var zmax = -Infinity
      var zmin = Infinity
      var element = poly.svg
      for (var j = 0; j < 3; ++j) {
        var idx = indices[j]
        points.push(
          0.5 * w * (1.0 - transformed[3 * idx]) + ',' +
          0.5 * h * (1.0 - transformed[3 * idx + 1]))
        var z = transformed[3 * idx + 2]
        zmax = Math.max(zmax, z)
        zmin = Math.min(zmin, z)
      }
      poly.zIndex = zmax + 0.25 * zmin
      var joinedPoints = points.join(' ')

      if (joinedPoints.indexOf('NaN') === -1) {
        setAttribute(element, 'points', joinedPoints)
      }

      toDraw.push(poly)
    }
    toDraw.sort(compareZ)
    container.innerHTML = ''
    for (i = 0; i < toDraw.length; ++i) {
      container.appendChild(toDraw[i].svg)
    }
  }

  function stopAnimation () { shouldRender = false }
  function startAnimation () { shouldRender = true }
  function setFollowMouse (state) { followCursor = state }
  function setFollowMotion (state) { followMotion = state }

  window.addEventListener('mousemove', function (ev) {
    if (!shouldRender) { startAnimation() }
    if (followCursor) {
      setLookAt({
        x: ev.clientX,
        y: ev.clientY
      })
      renderScene()
    }
  })

  window.addEventListener('deviceorientation', function (event) {
    if (!shouldRender) { startAnimation() }
    if (followMotion) {
      // gamma: left to right
      const leftToRight = event.gamma
      // beta: front back motion
      const frontToBack = event.beta
      // x offset: needed to correct the intial position
      const xOffset = 200
      // y offset: needed to correct the intial position
      const yOffset = -300
      // acceleration
      const acceleration = 10

      setLookAt({
        x: xOffset + leftToRight * acceleration,
        y: yOffset + frontToBack * acceleration
      })
      renderScene()
    }
  })

  function renderScene () {
    if (!shouldRender) return
    window.requestAnimationFrame(renderScene)

    var li = (1.0 - lookRate)
    var bounds = container.getBoundingClientRect()

    lookCurrent[0] = li * lookCurrent[0] + lookRate * mouse.x
    lookCurrent[1] = li * lookCurrent[1] + lookRate * mouse.y + 0.085

    var matrix = computeMatrix()
    updatePositions(matrix)
    updateFaces()
    stopAnimation()
  }

  renderScene()

  return {
    container: container,
    lookAt: setLookAt,
    setFollowMouse: setFollowMouse,
    setFollowMotion: setFollowMotion,
    stopAnimation: stopAnimation,
    startAnimation: startAnimation
  }
}

  }
}).call(this)
}},[1],{"resources":{"<root>":{"packages":{"metamask-logo":true}},"metamask-logo":{"globals":{"addEventListener":true,"document.body.appendChild":true,"document.createElementNS":true,"innerHeight":true,"innerWidth":true,"requestAnimationFrame":true},"packages":{"gl-mat4":true,"gl-vec3":true}}}})
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9sYXZhbW9hdC1icm93c2VyaWZ5L3NyYy9fcHJlbHVkZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMYXZhTW9hdCBQcmVsdWRlXG4oZnVuY3Rpb24oKSB7XG5cbiAgY29uc3QgZGVidWdNb2RlID0gZmFsc2VcblxuICAvLyBpZGVudGlmeSB0aGUgZ2xvYmFsUmVmXG4gIGNvbnN0IGdsb2JhbFJlZiA9ICh0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcpID8gc2VsZiA6IGdsb2JhbFxuXG4gIC8vIGNyZWF0ZSB0aGUgU0VTIHJvb3RSZWFsbVxuICAvLyBcInRlbXBsYXRlUmVxdWlyZVwiIGNhbGxzIGFyZSBpbmxpbmVkIGluIFwiZ2VuZXJhdGVQcmVsdWRlXCJcbiAgY29uc3QgU0VTID0gLy8gZGVmaW5lIHNlc1xuKGZ1bmN0aW9uKCl7XG4gIGNvbnN0IGdsb2JhbCA9IGdsb2JhbFJlZlxuICBjb25zdCBleHBvcnRzID0ge31cbiAgY29uc3QgbW9kdWxlID0geyBleHBvcnRzIH1cbiAgOyhmdW5jdGlvbigpe1xuLy8gU1RBUlQgb2YgaW5qZWN0ZWQgY29kZSBmcm9tIHNlc1xuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcbiAgdHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCkgOlxuICB0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoZmFjdG9yeSkgOlxuICAoZ2xvYmFsID0gZ2xvYmFsIHx8IHNlbGYsIGdsb2JhbC5TRVMgPSBmYWN0b3J5KCkpO1xufSh0aGlzLCBmdW5jdGlvbiAoKSB7ICd1c2Ugc3RyaWN0JztcblxuICAvLyB3ZSdkIGxpa2UgdG8gYWJhbmRvbiwgYnV0IHdlIGNhbid0LCBzbyBqdXN0IHNjcmVhbSBhbmQgYnJlYWsgYSBsb3Qgb2ZcbiAgLy8gc3R1ZmYuIEhvd2V2ZXIsIHNpbmNlIHdlIGFyZW4ndCByZWFsbHkgYWJvcnRpbmcgdGhlIHByb2Nlc3MsIGJlIGNhcmVmdWwgdG9cbiAgLy8gbm90IHRocm93IGFuIEVycm9yIG9iamVjdCB3aGljaCBjb3VsZCBiZSBjYXB0dXJlZCBieSBjaGlsZC1SZWFsbSBjb2RlIGFuZFxuICAvLyB1c2VkIHRvIGFjY2VzcyB0aGUgKHRvby1wb3dlcmZ1bCkgcHJpbWFsLXJlYWxtIEVycm9yIG9iamVjdC5cblxuICBmdW5jdGlvbiB0aHJvd1RhbnRydW0ocywgZXJyID0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgbXNnID0gYHBsZWFzZSByZXBvcnQgaW50ZXJuYWwgc2hpbSBlcnJvcjogJHtzfWA7XG5cbiAgICAvLyB3ZSB3YW50IHRvIGxvZyB0aGVzZSAnc2hvdWxkIG5ldmVyIGhhcHBlbicgdGhpbmdzLlxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgIGlmIChlcnIpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmVycm9yKGAke2Vycn1gKTtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmVycm9yKGAke2Vyci5zdGFja31gKTtcbiAgICB9XG5cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tZGVidWdnZXJcbiAgICBkZWJ1Z2dlcjtcbiAgICB0aHJvdyBtc2c7XG4gIH1cblxuICBmdW5jdGlvbiBhc3NlcnQoY29uZGl0aW9uLCBtZXNzYWdlKSB7XG4gICAgaWYgKCFjb25kaXRpb24pIHtcbiAgICAgIHRocm93VGFudHJ1bShtZXNzYWdlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogc2FmZVN0cmluZ2lmeUZ1bmN0aW9uKClcbiAgICogUmVtb3ZlIGNvZGUgbW9kaWZpY2F0aW9ucyBpbnRyb2R1Y2VkIGJ5IGVtcyBhbmQgbnl4IGluXG4gICAqIHRlc3QgbW9kZSB3aGljaCBpbnRlZmVyZSB3aXRoIEZ1bmN0aW9uLnRvU3RyaW5nKCkuXG4gICAqL1xuICBmdW5jdGlvbiBzYWZlU3RyaW5naWZ5RnVuY3Rpb24oZm4pIHtcbiAgICBsZXQgc3JjID0gYCd1c2Ugc3RyaWN0JzsgKCR7Zm59KWA7XG5cbiAgICAvLyBlc20gbW9kdWxlIGNyZWF0ZXMgXCJydW50aW1lXCIgYXMgXCJfXCIgKyBoZXgoMykgKyBcIlxcdTIwMERcIlxuXG4gICAgLy8gUmVzdG9yZSBldmFsIHdoaWNoIGlzIG1vZGlmaWVkIGJ5IGVzbSBtb2R1bGUuXG4gICAgLy8gKDAsIGV2YWwpID0+ICgwLCA8cnVudGltZT4uZSlcbiAgICBzcmMgPSBzcmMucmVwbGFjZSgvXFwoMCxcXHMqX1swLTlhLWZBLUZdezN9XFx1MjAwRFxcLmVcXCkvZywgJygwLCBldmFsKScpO1xuXG4gICAgLy8gUmVzdG9yZSBnbG9iYWxzIHN1Y2ggYXMgUmVmbGVjdCB3aGljaCBhcmUgbW9kaWZpZWQgYnkgZXNtIG1vZHVsZS5cbiAgICAvLyBSZWZsZWN0ID0+IDxydW50aW1lPi5lLlJlZmxlY3RcbiAgICBzcmMgPSBzcmMucmVwbGFjZSgvX1swLTlhLWZBLUZdezN9XFx1MjAwRFxcLmdcXC4vZywgJycpO1xuXG4gICAgLy8gUmVtb3ZlIGNvZGUgY292ZXJhZ2Ugd2hpY2ggaXMgaW5qZWN0ZWQgYnkgbnljIG1vZHVsZS5cbiAgICBzcmMgPSBzcmMucmVwbGFjZSgvY292X1teK10rXFwrXFwrWzssXS9nLCAnJyk7XG5cbiAgICByZXR1cm4gc3JjO1xuICB9XG5cbiAgLy8gYnVpbGRDaGlsZFJlYWxtIGlzIGltbWVkaWF0ZWx5IHR1cm5lZCBpbnRvIGEgc3RyaW5nLCBhbmQgdGhpcyBmdW5jdGlvbiBpc1xuICAvLyBuZXZlciByZWZlcmVuY2VkIGFnYWluLCBiZWNhdXNlIGl0IGNsb3NlcyBvdmVyIHRoZSB3cm9uZyBpbnRyaW5zaWNzXG5cbiAgZnVuY3Rpb24gYnVpbGRDaGlsZFJlYWxtKHVuc2FmZVJlYywgQmFzZVJlYWxtKSB7XG4gICAgY29uc3QgeyBjYWxsQW5kV3JhcEVycm9yIH0gPSB1bnNhZmVSZWM7XG4gICAgY29uc3Qge1xuICAgICAgaW5pdFJvb3RSZWFsbSxcbiAgICAgIGluaXRDb21wYXJ0bWVudCxcbiAgICAgIGdldFJlYWxtR2xvYmFsLFxuICAgICAgcmVhbG1FdmFsdWF0ZVxuICAgIH0gPSBCYXNlUmVhbG07XG5cbiAgICBjb25zdCB7IGNyZWF0ZSwgZGVmaW5lUHJvcGVydGllcyB9ID0gT2JqZWN0O1xuXG4gICAgY2xhc3MgUmVhbG0ge1xuICAgICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIC8vIFRoZSBSZWFsbSBjb25zdHJ1Y3RvciBpcyBub3QgaW50ZW5kZWQgdG8gYmUgdXNlZCB3aXRoIHRoZSBuZXcgb3BlcmF0b3JcbiAgICAgICAgLy8gb3IgdG8gYmUgc3ViY2xhc3NlZC4gSXQgbWF5IGJlIHVzZWQgYXMgdGhlIHZhbHVlIG9mIGFuIGV4dGVuZHMgY2xhdXNlXG4gICAgICAgIC8vIG9mIGEgY2xhc3MgZGVmaW5pdGlvbiBidXQgYSBzdXBlciBjYWxsIHRvIHRoZSBSZWFsbSBjb25zdHJ1Y3RvciB3aWxsXG4gICAgICAgIC8vIGNhdXNlIGFuIGV4Y2VwdGlvbi5cblxuICAgICAgICAvLyBXaGVuIFJlYWxtIGlzIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLCBhbiBleGNlcHRpb24gaXMgYWxzbyByYWlzZWQgYmVjYXVzZVxuICAgICAgICAvLyBhIGNsYXNzIGNvbnN0cnVjdG9yIGNhbm5vdCBiZSBpbnZva2VkIHdpdGhvdXQgJ25ldycuXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1JlYWxtIGlzIG5vdCBhIGNvbnN0cnVjdG9yJyk7XG4gICAgICB9XG5cbiAgICAgIHN0YXRpYyBtYWtlUm9vdFJlYWxtKG9wdGlvbnMgPSB7fSkge1xuICAgICAgICAvLyBUaGlzIGlzIHRoZSBleHBvc2VkIGludGVyZmFjZS5cblxuICAgICAgICAvLyBCeXBhc3MgdGhlIGNvbnN0cnVjdG9yLlxuICAgICAgICBjb25zdCByID0gY3JlYXRlKFJlYWxtLnByb3RvdHlwZSk7XG4gICAgICAgIGNhbGxBbmRXcmFwRXJyb3IoaW5pdFJvb3RSZWFsbSwgW3Vuc2FmZVJlYywgciwgb3B0aW9uc10pO1xuICAgICAgICByZXR1cm4gcjtcbiAgICAgIH1cblxuICAgICAgc3RhdGljIG1ha2VDb21wYXJ0bWVudChvcHRpb25zID0ge30pIHtcbiAgICAgICAgLy8gQnlwYXNzIHRoZSBjb25zdHJ1Y3Rvci5cbiAgICAgICAgY29uc3QgciA9IGNyZWF0ZShSZWFsbS5wcm90b3R5cGUpO1xuICAgICAgICBjYWxsQW5kV3JhcEVycm9yKGluaXRDb21wYXJ0bWVudCwgW3Vuc2FmZVJlYywgciwgb3B0aW9uc10pO1xuICAgICAgICByZXR1cm4gcjtcbiAgICAgIH1cblxuICAgICAgLy8gd2Ugb21pdCB0aGUgY29uc3RydWN0b3IgYmVjYXVzZSBpdCBpcyBlbXB0eS4gQWxsIHRoZSBwZXJzb25hbGl6YXRpb25cbiAgICAgIC8vIHRha2VzIHBsYWNlIGluIG9uZSBvZiB0aGUgdHdvIHN0YXRpYyBtZXRob2RzLFxuICAgICAgLy8gbWFrZVJvb3RSZWFsbS9tYWtlQ29tcGFydG1lbnRcblxuICAgICAgZ2V0IGdsb2JhbCgpIHtcbiAgICAgICAgLy8gdGhpcyBpcyBzYWZlIGFnYWluc3QgYmVpbmcgY2FsbGVkIHdpdGggc3RyYW5nZSAndGhpcycgYmVjYXVzZVxuICAgICAgICAvLyBiYXNlR2V0R2xvYmFsIGltbWVkaWF0ZWx5IGRvZXMgYSB0cmFkZW1hcmsgY2hlY2sgKGl0IGZhaWxzIHVubGVzc1xuICAgICAgICAvLyB0aGlzICd0aGlzJyBpcyBwcmVzZW50IGluIGEgd2Vha21hcCB0aGF0IGlzIG9ubHkgcG9wdWxhdGVkIHdpdGhcbiAgICAgICAgLy8gbGVnaXRpbWF0ZSBSZWFsbSBpbnN0YW5jZXMpXG4gICAgICAgIHJldHVybiBjYWxsQW5kV3JhcEVycm9yKGdldFJlYWxtR2xvYmFsLCBbdGhpc10pO1xuICAgICAgfVxuXG4gICAgICBldmFsdWF0ZSh4LCBlbmRvd21lbnRzLCBvcHRpb25zID0ge30pIHtcbiAgICAgICAgLy8gc2FmZSBhZ2FpbnN0IHN0cmFuZ2UgJ3RoaXMnLCBhcyBhYm92ZVxuICAgICAgICByZXR1cm4gY2FsbEFuZFdyYXBFcnJvcihyZWFsbUV2YWx1YXRlLCBbdGhpcywgeCwgZW5kb3dtZW50cywgb3B0aW9uc10pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGRlZmluZVByb3BlcnRpZXMoUmVhbG0sIHtcbiAgICAgIHRvU3RyaW5nOiB7XG4gICAgICAgIHZhbHVlOiAoKSA9PiAnZnVuY3Rpb24gUmVhbG0oKSB7IFtzaGltIGNvZGVdIH0nLFxuICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGRlZmluZVByb3BlcnRpZXMoUmVhbG0ucHJvdG90eXBlLCB7XG4gICAgICB0b1N0cmluZzoge1xuICAgICAgICB2YWx1ZTogKCkgPT4gJ1tvYmplY3QgUmVhbG1dJyxcbiAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gUmVhbG07XG4gIH1cblxuICAvLyBUaGUgcGFyZW50aGVzZXMgbWVhbnMgd2UgZG9uJ3QgYmluZCB0aGUgJ2J1aWxkQ2hpbGRSZWFsbScgbmFtZSBpbnNpZGUgdGhlXG4gIC8vIGNoaWxkJ3MgbmFtZXNwYWNlLiB0aGlzIHdvdWxkIGFjY2VwdCBhbiBhbm9ueW1vdXMgZnVuY3Rpb24gZGVjbGFyYXRpb24uXG4gIC8vIGZ1bmN0aW9uIGV4cHJlc3Npb24gKG5vdCBhIGRlY2xhcmF0aW9uKSBzbyBpdCBoYXMgYSBjb21wbGV0aW9uIHZhbHVlLlxuICBjb25zdCBidWlsZENoaWxkUmVhbG1TdHJpbmcgPSBzYWZlU3RyaW5naWZ5RnVuY3Rpb24oYnVpbGRDaGlsZFJlYWxtKTtcblxuICBmdW5jdGlvbiBidWlsZENhbGxBbmRXcmFwRXJyb3IoKSB7XG4gICAgLy8gVGhpcyBPYmplY3QgYW5kIFJlZmxlY3QgYXJlIGJyYW5kIG5ldywgZnJvbSBhIG5ldyB1bnNhZmVSZWMsIHNvIG5vIHVzZXJcbiAgICAvLyBjb2RlIGhhcyBiZWVuIHJ1biBvciBoYWQgYSBjaGFuY2UgdG8gbWFuaXB1bGF0ZSB0aGVtLiBEb24ndCBldmVyIHJ1biB0aGlzXG4gICAgLy8gZnVuY3Rpb24gKmFmdGVyKiB1c2VyIGNvZGUgaGFzIGhhZCBhIGNoYW5jZSB0byBwb2xsdXRlIGl0cyBlbnZpcm9ubWVudCxcbiAgICAvLyBvciBpdCBjb3VsZCBiZSB1c2VkIHRvIGdhaW4gYWNjZXNzIHRvIEJhc2VSZWFsbSBhbmQgcHJpbWFsLXJlYWxtIEVycm9yXG4gICAgLy8gb2JqZWN0cy5cbiAgICBjb25zdCB7IGdldFByb3RvdHlwZU9mIH0gPSBPYmplY3Q7XG4gICAgY29uc3QgeyBhcHBseSB9ID0gUmVmbGVjdDtcbiAgICBjb25zdCB1bmN1cnJ5VGhpcyA9IGZuID0+ICh0aGlzQXJnLCAuLi5hcmdzKSA9PiBhcHBseShmbiwgdGhpc0FyZywgYXJncyk7XG4gICAgY29uc3QgbWFwR2V0ID0gdW5jdXJyeVRoaXMoTWFwLnByb3RvdHlwZS5nZXQpO1xuICAgIGNvbnN0IHNldEhhcyA9IHVuY3VycnlUaGlzKFNldC5wcm90b3R5cGUuaGFzKTtcblxuICAgIGNvbnN0IGVycm9yTmFtZVRvRXJyb3JDb25zdHJ1Y3RvciA9IG5ldyBNYXAoW1xuICAgICAgWydFdmFsRXJyb3InLCBFdmFsRXJyb3JdLFxuICAgICAgWydSYW5nZUVycm9yJywgUmFuZ2VFcnJvcl0sXG4gICAgICBbJ1JlZmVyZW5jZUVycm9yJywgUmVmZXJlbmNlRXJyb3JdLFxuICAgICAgWydTeW50YXhFcnJvcicsIFN5bnRheEVycm9yXSxcbiAgICAgIFsnVHlwZUVycm9yJywgVHlwZUVycm9yXSxcbiAgICAgIFsnVVJJRXJyb3InLCBVUklFcnJvcl1cbiAgICBdKTtcbiAgICBjb25zdCBlcnJvckNvbnN0cnVjdG9ycyA9IG5ldyBTZXQoW1xuICAgICAgRXZhbEVycm9yLnByb3RvdHlwZSxcbiAgICAgIFJhbmdlRXJyb3IucHJvdG90eXBlLFxuICAgICAgUmVmZXJlbmNlRXJyb3IucHJvdG90eXBlLFxuICAgICAgU3ludGF4RXJyb3IucHJvdG90eXBlLFxuICAgICAgVHlwZUVycm9yLnByb3RvdHlwZSxcbiAgICAgIFVSSUVycm9yLnByb3RvdHlwZSxcbiAgICAgIEVycm9yLnByb3RvdHlwZVxuICAgIF0pO1xuXG4gICAgZnVuY3Rpb24gY2FsbEFuZFdyYXBFcnJvcih0YXJnZXQsIGFyZ3MpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBhcHBseSh0YXJnZXQsIHVuZGVmaW5lZCwgYXJncyk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgLy8gMS4gVGhyb3duIHByaW1pdGl2ZXNcbiAgICAgICAgaWYgKE9iamVjdChlcnIpICE9PSBlcnIpIHtcbiAgICAgICAgICAvLyBlcnIgaXMgYSBwcmltaXRpdmUgdmFsdWUsIHdoaWNoIGlzIHNhZmUgdG8gcmV0aHJvd1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIDIuIEN1cnJlbnQgcmVhbG0gZXJyb3JzXG4gICAgICAgIGlmIChzZXRIYXMoZXJyb3JDb25zdHJ1Y3RvcnMsIGdldFByb3RvdHlwZU9mKGVycikpKSB7XG4gICAgICAgICAgLy8gZXJyIGlzIGEgZnJvbSB0aGUgY3VycmVudCByZWFsbSwgd2hpY2ggaXMgc2FmZSB0byByZXRocm93LlxuICAgICAgICAgIC8vIE9iamVjdCBpbnN0YW5jZXMgKG5vcm1hbGx5KSBvbmx5IGNvbnRhaW4gaW50cmluc2ljcyBmcm9tIHRoZVxuICAgICAgICAgIC8vIHNhbWUgcmVhbG0uIEFuIGVycm9yIGNvbnRhaW5pbmcgaW50cmluc2ljcyBmcm9tIGRpZmZlcmVudFxuICAgICAgICAgIC8vIHJlYWxtcyB3b3VsZCBoYXZlIHRvIGJlIG1hbnVhbGx5IGNvbnN0dWN0ZWQsIHdoaWNoIGltcGx5IHRoYXRcbiAgICAgICAgICAvLyBzdWNoIGludHJpbnNpY3Mgd2VyZSBhdmFpbGFibGUsIGFuZCBjb25maW5lbWVudCB3YXMgYWxyZWFkeSBsb3N0LlxuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIDMuIE90aGVyIHJlYWxtIGVycm9yc1xuICAgICAgICBsZXQgZU5hbWUsIGVNZXNzYWdlLCBlU3RhY2s7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gVGhlIG90aGVyIGVudmlyb25tZW50IG1pZ2h0IHNlZWsgdG8gdXNlICdlcnInIHRvIHJlYWNoIHRoZVxuICAgICAgICAgIC8vIHBhcmVudCdzIGludHJpbnNpY3MgYW5kIGNvcnJ1cHQgdGhlbS4gSW4gYWRkaXRpb24sIGV4Y2VwdGlvbnNcbiAgICAgICAgICAvLyByYWlzZWQgaW4gdGhlIHByaW1hbCByZWFsbSBuZWVkIHRvIGJlIGNvbnZlcnRlZCB0byB0aGUgY3VycmVudFxuICAgICAgICAgIC8vIHJlYWxtLlxuXG4gICAgICAgICAgLy8gYCR7ZXJyLm5hbWV9YCB3aWxsIGNhdXNlIHN0cmluZyBjb2VyY2lvbiBvZiAnZXJyLm5hbWUnLlxuICAgICAgICAgIC8vIElmIGVyci5uYW1lIGlzIGFuIG9iamVjdCAocHJvYmFibHkgYSBTdHJpbmcgb2YgYW5vdGhlciBSZWFsbSksXG4gICAgICAgICAgLy8gdGhlIGNvZXJjaW9uIHVzZXMgZXJyLm5hbWUudG9TdHJpbmcoKSwgd2hpY2ggaXMgdW5kZXIgdGhlIGNvbnRyb2xcbiAgICAgICAgICAvLyBvZiB0aGUgb3RoZXIgcmVhbG0uIElmIGVyci5uYW1lIHdlcmUgYSBwcmltaXRpdmUgKGUuZy4gYSBudW1iZXIpLFxuICAgICAgICAgIC8vIGl0IHdvdWxkIHVzZSBOdW1iZXIudG9TdHJpbmcoZXJyLm5hbWUpLCB1c2luZyB0aGUgY2hpbGQncyB2ZXJzaW9uXG4gICAgICAgICAgLy8gb2YgTnVtYmVyICh3aGljaCB0aGUgY2hpbGQgY291bGQgbW9kaWZ5IHRvIGNhcHR1cmUgaXRzIGFyZ3VtZW50IGZvclxuICAgICAgICAgIC8vIGxhdGVyIHVzZSksIGhvd2V2ZXIgcHJpbWl0aXZlcyBkb24ndCBoYXZlIHByb3BlcnRpZXMgbGlrZSAucHJvdG90eXBlXG4gICAgICAgICAgLy8gc28gdGhleSBhcmVuJ3QgdXNlZnVsIGZvciBhbiBhdHRhY2suXG4gICAgICAgICAgZU5hbWUgPSBgJHtlcnIubmFtZX1gO1xuICAgICAgICAgIGVNZXNzYWdlID0gYCR7ZXJyLm1lc3NhZ2V9YDtcbiAgICAgICAgICBlU3RhY2sgPSBgJHtlcnIuc3RhY2sgfHwgZU1lc3NhZ2V9YDtcbiAgICAgICAgICAvLyBlTmFtZS9lTWVzc2FnZS9lU3RhY2sgYXJlIG5vdyByZWFsbS1pbmRlcGVuZGVudCBwcmltaXRpdmUgc3RyaW5ncywgYW5kXG4gICAgICAgICAgLy8gc2FmZSB0byBleHBvc2UuXG4gICAgICAgIH0gY2F0Y2ggKGlnbm9yZWQpIHtcbiAgICAgICAgICAvLyBpZiBlcnIubmFtZS50b1N0cmluZygpIHRocm93cywga2VlcCB0aGUgKHBhcmVudCByZWFsbSkgRXJyb3IgYXdheS5cbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vua25vd24gZXJyb3InKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBFcnJvckNvbnN0cnVjdG9yID1cbiAgICAgICAgICBtYXBHZXQoZXJyb3JOYW1lVG9FcnJvckNvbnN0cnVjdG9yLCBlTmFtZSkgfHwgRXJyb3I7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yQ29uc3RydWN0b3IoZU1lc3NhZ2UpO1xuICAgICAgICB9IGNhdGNoIChlcnIyKSB7XG4gICAgICAgICAgZXJyMi5zdGFjayA9IGVTdGFjazsgLy8gcmVwbGFjZSB3aXRoIHRoZSBjYXB0dXJlZCBpbm5lciBzdGFja1xuICAgICAgICAgIHRocm93IGVycjI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY2FsbEFuZFdyYXBFcnJvcjtcbiAgfVxuXG4gIGNvbnN0IGJ1aWxkQ2FsbEFuZFdyYXBFcnJvclN0cmluZyA9IHNhZmVTdHJpbmdpZnlGdW5jdGlvbihcbiAgICBidWlsZENhbGxBbmRXcmFwRXJyb3JcbiAgKTtcblxuICAvLyBEZWNsYXJlIHNob3J0aGFuZCBmdW5jdGlvbnMuIFNoYXJpbmcgdGhlc2UgZGVjbGFyYXRpb25zIGFjcm9zcyBtb2R1bGVzXG4gIC8vIGltcHJvdmVzIGJvdGggY29uc2lzdGVuY3kgYW5kIG1pbmlmaWNhdGlvbi4gVW51c2VkIGRlY2xhcmF0aW9ucyBhcmVcbiAgLy8gZHJvcHBlZCBieSB0aGUgdHJlZSBzaGFraW5nIHByb2Nlc3MuXG5cbiAgLy8gd2UgY2FwdHVyZSB0aGVzZSwgbm90IGp1c3QgZm9yIGJyZXZpdHksIGJ1dCBmb3Igc2VjdXJpdHkuIElmIGFueSBjb2RlXG4gIC8vIG1vZGlmaWVzIE9iamVjdCB0byBjaGFuZ2Ugd2hhdCAnYXNzaWduJyBwb2ludHMgdG8sIHRoZSBSZWFsbSBzaGltIHdvdWxkIGJlXG4gIC8vIGNvcnJ1cHRlZC5cblxuICBjb25zdCB7XG4gICAgYXNzaWduLFxuICAgIGNyZWF0ZSxcbiAgICBmcmVlemUsXG4gICAgZGVmaW5lUHJvcGVydGllcywgLy8gT2JqZWN0LmRlZmluZVByb3BlcnR5IGlzIGFsbG93ZWQgdG8gZmFpbFxuICAgIC8vIHNpbGVudGx0eSwgdXNlIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzIGluc3RlYWQuXG4gICAgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yLFxuICAgIGdldE93blByb3BlcnR5RGVzY3JpcHRvcnMsXG4gICAgZ2V0T3duUHJvcGVydHlOYW1lcyxcbiAgICBnZXRQcm90b3R5cGVPZixcbiAgICBzZXRQcm90b3R5cGVPZlxuICB9ID0gT2JqZWN0O1xuXG4gIGNvbnN0IHtcbiAgICBhcHBseSxcbiAgICBvd25LZXlzIC8vIFJlZmxlY3Qub3duS2V5cyBpbmNsdWRlcyBTeW1ib2xzIGFuZCB1bmVudW1lcmFibGVzLFxuICAgIC8vIHVubGlrZSBPYmplY3Qua2V5cygpXG4gIH0gPSBSZWZsZWN0O1xuXG4gIC8qKlxuICAgKiB1bmN1cnJ5VGhpcygpIFNlZVxuICAgKiBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1jb252ZW50aW9uczpzYWZlX21ldGFfcHJvZ3JhbW1pbmdcbiAgICogd2hpY2ggb25seSBsaXZlcyBhdFxuICAgKiBodHRwOi8vd2ViLmFyY2hpdmUub3JnL3dlYi8yMDE2MDgwNTIyNTcxMC9odHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1jb252ZW50aW9uczpzYWZlX21ldGFfcHJvZ3JhbW1pbmdcbiAgICpcbiAgICogUGVyZm9ybWFuY2U6XG4gICAqIDEuIFRoZSBuYXRpdmUgY2FsbCBpcyBhYm91dCAxMHggZmFzdGVyIG9uIEZGIHRoYW4gY2hyb21lXG4gICAqIDIuIFRoZSB2ZXJzaW9uIHVzaW5nIEZ1bmN0aW9uLmJpbmQoKSBpcyBhYm91dCAxMDB4IHNsb3dlciBvbiBGRixcbiAgICogICAgZXF1YWwgb24gY2hyb21lLCAyeCBzbG93ZXIgb24gU2FmYXJpXG4gICAqIDMuIFRoZSB2ZXJzaW9uIHVzaW5nIGEgc3ByZWFkIGFuZCBSZWZsZWN0LmFwcGx5KCkgaXMgYWJvdXQgMTB4XG4gICAqICAgIHNsb3dlciBvbiBGRiwgZXF1YWwgb24gY2hyb21lLCAyeCBzbG93ZXIgb24gU2FmYXJpXG4gICAqXG4gICAqIGNvbnN0IGJpbmQgPSBGdW5jdGlvbi5wcm90b3R5cGUuYmluZDtcbiAgICogY29uc3QgdW5jdXJyeVRoaXMgPSBiaW5kLmJpbmQoYmluZC5jYWxsKTtcbiAgICovXG4gIGNvbnN0IHVuY3VycnlUaGlzID0gZm4gPT4gKHRoaXNBcmcsIC4uLmFyZ3MpID0+IGFwcGx5KGZuLCB0aGlzQXJnLCBhcmdzKTtcblxuICAvLyBXZSBhbHNvIGNhcHR1cmUgdGhlc2UgZm9yIHNlY3VyaXR5OiBjaGFuZ2VzIHRvIEFycmF5LnByb3RvdHlwZSBhZnRlciB0aGVcbiAgLy8gUmVhbG0gc2hpbSBydW5zIHNob3VsZG4ndCBhZmZlY3Qgc3Vic2VxdWVudCBSZWFsbSBvcGVyYXRpb25zLlxuICBjb25zdCBvYmplY3RIYXNPd25Qcm9wZXJ0eSA9IHVuY3VycnlUaGlzKFxuICAgICAgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eVxuICAgICksXG4gICAgYXJyYXlGaWx0ZXIgPSB1bmN1cnJ5VGhpcyhBcnJheS5wcm90b3R5cGUuZmlsdGVyKSxcbiAgICBhcnJheVBvcCA9IHVuY3VycnlUaGlzKEFycmF5LnByb3RvdHlwZS5wb3ApLFxuICAgIGFycmF5Sm9pbiA9IHVuY3VycnlUaGlzKEFycmF5LnByb3RvdHlwZS5qb2luKSxcbiAgICBhcnJheUNvbmNhdCA9IHVuY3VycnlUaGlzKEFycmF5LnByb3RvdHlwZS5jb25jYXQpLFxuICAgIHJlZ2V4cFRlc3QgPSB1bmN1cnJ5VGhpcyhSZWdFeHAucHJvdG90eXBlLnRlc3QpLFxuICAgIHN0cmluZ0luY2x1ZGVzID0gdW5jdXJyeVRoaXMoU3RyaW5nLnByb3RvdHlwZS5pbmNsdWRlcyk7XG5cbiAgLy8gVGhlc2UgdmFsdWUgcHJvcGVydGllcyBvZiB0aGUgZ2xvYmFsIG9iamVjdCBhcmUgbm9uLXdyaXRhYmxlLFxuICAvLyBub24tY29uZmlndXJhYmxlIGRhdGEgcHJvcGVydGllcy5cbiAgY29uc3QgZnJvemVuR2xvYmFsUHJvcGVydHlOYW1lcyA9IFtcbiAgICAvLyAqKiogMTguMSBWYWx1ZSBQcm9wZXJ0aWVzIG9mIHRoZSBHbG9iYWwgT2JqZWN0XG5cbiAgICAnSW5maW5pdHknLFxuICAgICdOYU4nLFxuICAgICd1bmRlZmluZWQnXG4gIF07XG5cbiAgLy8gQWxsIHRoZSBmb2xsb3dpbmcgc3RkbGliIGl0ZW1zIGhhdmUgdGhlIHNhbWUgbmFtZSBvbiBib3RoIG91ciBpbnRyaW5zaWNzXG4gIC8vIG9iamVjdCBhbmQgb24gdGhlIGdsb2JhbCBvYmplY3QuIFVubGlrZSBJbmZpbml0eS9OYU4vdW5kZWZpbmVkLCB0aGVzZVxuICAvLyBzaG91bGQgYWxsIGJlIHdyaXRhYmxlIGFuZCBjb25maWd1cmFibGUuIFRoaXMgaXMgZGl2aWRlZCBpbnRvIHR3b1xuICAvLyBzZXRzLiBUaGUgc3RhYmxlIG9uZXMgYXJlIHRob3NlIHRoZSBzaGltIGNhbiBmcmVlemUgZWFybHkgYmVjYXVzZVxuICAvLyB3ZSBkb24ndCBleHBlY3QgYW55b25lIHdpbGwgd2FudCB0byBtdXRhdGUgdGhlbS4gVGhlIHVuc3RhYmxlIG9uZXNcbiAgLy8gYXJlIHRoZSBvbmVzIHRoYXQgd2UgY29ycmVjdGx5IGluaXRpYWxpemUgdG8gd3JpdGFibGUgYW5kXG4gIC8vIGNvbmZpZ3VyYWJsZSBzbyB0aGF0IHRoZXkgY2FuIHN0aWxsIGJlIHJlcGxhY2VkIG9yIHJlbW92ZWQuXG4gIGNvbnN0IHN0YWJsZUdsb2JhbFByb3BlcnR5TmFtZXMgPSBbXG4gICAgLy8gKioqIDE4LjIgRnVuY3Rpb24gUHJvcGVydGllcyBvZiB0aGUgR2xvYmFsIE9iamVjdFxuXG4gICAgLy8gJ2V2YWwnLCAvLyBjb21lcyBmcm9tIHNhZmVFdmFsIGluc3RlYWRcbiAgICAnaXNGaW5pdGUnLFxuICAgICdpc05hTicsXG4gICAgJ3BhcnNlRmxvYXQnLFxuICAgICdwYXJzZUludCcsXG5cbiAgICAnZGVjb2RlVVJJJyxcbiAgICAnZGVjb2RlVVJJQ29tcG9uZW50JyxcbiAgICAnZW5jb2RlVVJJJyxcbiAgICAnZW5jb2RlVVJJQ29tcG9uZW50JyxcblxuICAgIC8vICoqKiAxOC4zIENvbnN0cnVjdG9yIFByb3BlcnRpZXMgb2YgdGhlIEdsb2JhbCBPYmplY3RcblxuICAgICdBcnJheScsXG4gICAgJ0FycmF5QnVmZmVyJyxcbiAgICAnQm9vbGVhbicsXG4gICAgJ0RhdGFWaWV3JyxcbiAgICAvLyAnRGF0ZScsICAvLyBVbnN0YWJsZVxuICAgIC8vICdFcnJvcicsICAvLyBVbnN0YWJsZVxuICAgICdFdmFsRXJyb3InLFxuICAgICdGbG9hdDMyQXJyYXknLFxuICAgICdGbG9hdDY0QXJyYXknLFxuICAgIC8vICdGdW5jdGlvbicsICAvLyBjb21lcyBmcm9tIHNhZmVGdW5jdGlvbiBpbnN0ZWFkXG4gICAgJ0ludDhBcnJheScsXG4gICAgJ0ludDE2QXJyYXknLFxuICAgICdJbnQzMkFycmF5JyxcbiAgICAnTWFwJyxcbiAgICAnTnVtYmVyJyxcbiAgICAnT2JqZWN0JyxcbiAgICAvLyAnUHJvbWlzZScsICAvLyBVbnN0YWJsZVxuICAgIC8vICdQcm94eScsICAvLyBVbnN0YWJsZVxuICAgICdSYW5nZUVycm9yJyxcbiAgICAnUmVmZXJlbmNlRXJyb3InLFxuICAgIC8vICdSZWdFeHAnLCAgLy8gVW5zdGFibGVcbiAgICAnU2V0JyxcbiAgICAvLyAnU2hhcmVkQXJyYXlCdWZmZXInICAvLyByZW1vdmVkIG9uIEphbiA1LCAyMDE4XG4gICAgJ1N0cmluZycsXG4gICAgJ1N5bWJvbCcsXG4gICAgJ1N5bnRheEVycm9yJyxcbiAgICAnVHlwZUVycm9yJyxcbiAgICAnVWludDhBcnJheScsXG4gICAgJ1VpbnQ4Q2xhbXBlZEFycmF5JyxcbiAgICAnVWludDE2QXJyYXknLFxuICAgICdVaW50MzJBcnJheScsXG4gICAgJ1VSSUVycm9yJyxcbiAgICAnV2Vha01hcCcsXG4gICAgJ1dlYWtTZXQnLFxuXG4gICAgLy8gKioqIDE4LjQgT3RoZXIgUHJvcGVydGllcyBvZiB0aGUgR2xvYmFsIE9iamVjdFxuXG4gICAgLy8gJ0F0b21pY3MnLCAvLyByZW1vdmVkIG9uIEphbiA1LCAyMDE4XG4gICAgJ0pTT04nLFxuICAgICdNYXRoJyxcbiAgICAnUmVmbGVjdCcsXG5cbiAgICAvLyAqKiogQW5uZXggQlxuXG4gICAgJ2VzY2FwZScsXG4gICAgJ3VuZXNjYXBlJ1xuXG4gICAgLy8gKioqIEVDTUEtNDAyXG5cbiAgICAvLyAnSW50bCcgIC8vIFVuc3RhYmxlXG5cbiAgICAvLyAqKiogRVNOZXh0XG5cbiAgICAvLyAnUmVhbG0nIC8vIENvbWVzIGZyb20gY3JlYXRlUmVhbG1HbG9iYWxPYmplY3QoKVxuICBdO1xuXG4gIGNvbnN0IHVuc3RhYmxlR2xvYmFsUHJvcGVydHlOYW1lcyA9IFtcbiAgICAnRGF0ZScsXG4gICAgJ0Vycm9yJyxcbiAgICAnUHJvbWlzZScsXG4gICAgJ1Byb3h5JyxcbiAgICAnUmVnRXhwJyxcbiAgICAnSW50bCdcbiAgXTtcblxuICBmdW5jdGlvbiBnZXRTaGFyZWRHbG9iYWxEZXNjcyhcbiAgICB1bnNhZmVHbG9iYWwsXG4gICAgY29uZmlndXJhYmxlR2xvYmFscyA9IGZhbHNlXG4gICkge1xuICAgIGNvbnN0IGRlc2NyaXB0b3JzID0ge307XG5cbiAgICBmdW5jdGlvbiBkZXNjcmliZShuYW1lcywgd3JpdGFibGUsIGVudW1lcmFibGUsIGNvbmZpZ3VyYWJsZSkge1xuICAgICAgZm9yIChjb25zdCBuYW1lIG9mIG5hbWVzKSB7XG4gICAgICAgIGNvbnN0IGRlc2MgPSBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodW5zYWZlR2xvYmFsLCBuYW1lKTtcbiAgICAgICAgaWYgKGRlc2MpIHtcbiAgICAgICAgICAvLyBBYm9ydCBpZiBhbiBhY2Nlc3NvciBpcyBmb3VuZCBvbiB0aGUgdW5zYWZlIGdsb2JhbCBvYmplY3RcbiAgICAgICAgICAvLyBpbnN0ZWFkIG9mIGEgZGF0YSBwcm9wZXJ0eS4gV2Ugc2hvdWxkIG5ldmVyIGdldCBpbnRvIHRoaXNcbiAgICAgICAgICAvLyBub24gc3RhbmRhcmQgc2l0dWF0aW9uLlxuICAgICAgICAgIGFzc2VydChcbiAgICAgICAgICAgICd2YWx1ZScgaW4gZGVzYyxcbiAgICAgICAgICAgIGB1bmV4cGVjdGVkIGFjY2Vzc29yIG9uIGdsb2JhbCBwcm9wZXJ0eTogJHtuYW1lfWBcbiAgICAgICAgICApO1xuXG4gICAgICAgICAgZGVzY3JpcHRvcnNbbmFtZV0gPSB7XG4gICAgICAgICAgICB2YWx1ZTogZGVzYy52YWx1ZSxcbiAgICAgICAgICAgIHdyaXRhYmxlLFxuICAgICAgICAgICAgZW51bWVyYWJsZSxcbiAgICAgICAgICAgIGNvbmZpZ3VyYWJsZVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY29uZmlndXJhYmxlR2xvYmFscykge1xuICAgICAgZGVzY3JpYmUoZnJvemVuR2xvYmFsUHJvcGVydHlOYW1lcywgdHJ1ZSwgZmFsc2UsIHRydWUpO1xuICAgICAgLy8gVGhlIGZvbGxvd2luZyBpcyBjb3JyZWN0IGJ1dCBleHBlbnNpdmUuXG4gICAgICBkZXNjcmliZShzdGFibGVHbG9iYWxQcm9wZXJ0eU5hbWVzLCB0cnVlLCBmYWxzZSwgdHJ1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEluc3RlYWQsIGZvciBub3csIHdlIGxldCB0aGVzZSBnZXQgb3B0aW1pemVkLlxuICAgICAgZGVzY3JpYmUoZnJvemVuR2xvYmFsUHJvcGVydHlOYW1lcywgZmFsc2UsIGZhbHNlLCBmYWxzZSk7XG4gICAgICBkZXNjcmliZShzdGFibGVHbG9iYWxQcm9wZXJ0eU5hbWVzLCBmYWxzZSwgZmFsc2UsIGZhbHNlKTtcbiAgICB9XG4gICAgLy8gVGhlc2Ugd2Uga2VlcCByZXBsYWNlYWJsZSBhbmQgcmVtb3ZhYmxlLCBiZWNhdXNlIHdlIGV4cGVjdFxuICAgIC8vIG90aGVycywgZS5nLiwgU0VTLCBtYXkgd2FudCB0byBkbyBzby5cbiAgICBkZXNjcmliZSh1bnN0YWJsZUdsb2JhbFByb3BlcnR5TmFtZXMsIHRydWUsIGZhbHNlLCB0cnVlKTtcblxuICAgIHJldHVybiBkZXNjcmlwdG9ycztcbiAgfVxuXG4gIC8vIEFkYXB0ZWQgZnJvbSBTRVMvQ2FqYSAtIENvcHlyaWdodCAoQykgMjAxMSBHb29nbGUgSW5jLlxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vZ29vZ2xlL2NhamEvYmxvYi9tYXN0ZXIvc3JjL2NvbS9nb29nbGUvY2FqYS9zZXMvc3RhcnRTRVMuanNcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2dvb2dsZS9jYWphL2Jsb2IvbWFzdGVyL3NyYy9jb20vZ29vZ2xlL2NhamEvc2VzL3JlcGFpckVTNS5qc1xuXG4gIC8qKlxuICAgKiBSZXBsYWNlIHRoZSBsZWdhY3kgYWNjZXNzb3JzIG9mIE9iamVjdCB0byBjb21wbHkgd2l0aCBzdHJpY3QgbW9kZVxuICAgKiBhbmQgRVMyMDE2IHNlbWFudGljcywgd2UgZG8gdGhpcyBieSByZWRlZmluaW5nIHRoZW0gd2hpbGUgaW4gJ3VzZSBzdHJpY3QnLlxuICAgKlxuICAgKiB0b2RvOiBsaXN0IHRoZSBpc3N1ZXMgcmVzb2x2ZWRcbiAgICpcbiAgICogVGhpcyBmdW5jdGlvbiBjYW4gYmUgdXNlZCBpbiB0d28gd2F5czogKDEpIGludm9rZWQgZGlyZWN0bHkgdG8gZml4IHRoZSBwcmltYWxcbiAgICogcmVhbG0ncyBPYmplY3QucHJvdG90eXBlLCBhbmQgKDIpIGNvbnZlcnRlZCB0byBhIHN0cmluZyB0byBiZSBleGVjdXRlZFxuICAgKiBpbnNpZGUgZWFjaCBuZXcgUm9vdFJlYWxtIHRvIGZpeCB0aGVpciBPYmplY3QucHJvdG90eXBlcy4gRXZhbHVhdGlvbiByZXF1aXJlc1xuICAgKiB0aGUgZnVuY3Rpb24gdG8gaGF2ZSBubyBkZXBlbmRlbmNpZXMsIHNvIGRvbid0IGltcG9ydCBhbnl0aGluZyBmcm9tXG4gICAqIHRoZSBvdXRzaWRlLlxuICAgKi9cblxuICAvLyB0b2RvOiB0aGlzIGZpbGUgc2hvdWxkIGJlIG1vdmVkIG91dCB0byBhIHNlcGFyYXRlIHJlcG8gYW5kIG5wbSBtb2R1bGUuXG4gIGZ1bmN0aW9uIHJlcGFpckFjY2Vzc29ycygpIHtcbiAgICBjb25zdCB7XG4gICAgICBkZWZpbmVQcm9wZXJ0eSxcbiAgICAgIGRlZmluZVByb3BlcnRpZXMsXG4gICAgICBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IsXG4gICAgICBnZXRQcm90b3R5cGVPZixcbiAgICAgIHByb3RvdHlwZTogb2JqZWN0UHJvdG90eXBlXG4gICAgfSA9IE9iamVjdDtcblxuICAgIC8vIE9uIHNvbWUgcGxhdGZvcm1zLCB0aGUgaW1wbGVtZW50YXRpb24gb2YgdGhlc2UgZnVuY3Rpb25zIGFjdCBhc1xuICAgIC8vIGlmIHRoZXkgYXJlIGluIHNsb3BweSBtb2RlOiBpZiB0aGV5J3JlIGludm9rZWQgYmFkbHksIHRoZXkgd2lsbFxuICAgIC8vIGV4cG9zZSB0aGUgZ2xvYmFsIG9iamVjdCwgc28gd2UgbmVlZCB0byByZXBhaXIgdGhlc2UgZm9yXG4gICAgLy8gc2VjdXJpdHkuIFRodXMgaXQgaXMgb3VyIHJlc3BvbnNpYmlsaXR5IHRvIGZpeCB0aGlzLCBhbmQgd2UgbmVlZFxuICAgIC8vIHRvIGluY2x1ZGUgcmVwYWlyQWNjZXNzb3JzLiBFLmcuIENocm9tZSBpbiAyMDE2LlxuXG4gICAgdHJ5IHtcbiAgICAgIC8vIFZlcmlmeSB0aGF0IHRoZSBtZXRob2QgaXMgbm90IGNhbGxhYmxlLlxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXJlc3RyaWN0ZWQtcHJvcGVydGllcywgbm8tdW5kZXJzY29yZS1kYW5nbGVcbiAgICAgICgwLCBvYmplY3RQcm90b3R5cGUuX19sb29rdXBHZXR0ZXJfXykoJ3gnKTtcbiAgICB9IGNhdGNoIChpZ25vcmUpIHtcbiAgICAgIC8vIFRocm93cywgbm8gbmVlZCB0byBwYXRjaC5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0b09iamVjdChvYmopIHtcbiAgICAgIGlmIChvYmogPT09IHVuZGVmaW5lZCB8fCBvYmogPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgY2FuJ3QgY29udmVydCB1bmRlZmluZWQgb3IgbnVsbCB0byBvYmplY3RgKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBPYmplY3Qob2JqKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhc1Byb3BlcnR5TmFtZShvYmopIHtcbiAgICAgIGlmICh0eXBlb2Ygb2JqID09PSAnc3ltYm9sJykge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGAke29ian1gO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFGdW5jdGlvbihvYmosIGFjY2Vzc29yKSB7XG4gICAgICBpZiAodHlwZW9mIG9iaiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoYGludmFsaWQgJHthY2Nlc3Nvcn0gdXNhZ2VgKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgZGVmaW5lUHJvcGVydGllcyhvYmplY3RQcm90b3R5cGUsIHtcbiAgICAgIF9fZGVmaW5lR2V0dGVyX186IHtcbiAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIF9fZGVmaW5lR2V0dGVyX18ocHJvcCwgZnVuYykge1xuICAgICAgICAgIGNvbnN0IE8gPSB0b09iamVjdCh0aGlzKTtcbiAgICAgICAgICBkZWZpbmVQcm9wZXJ0eShPLCBwcm9wLCB7XG4gICAgICAgICAgICBnZXQ6IGFGdW5jdGlvbihmdW5jLCAnZ2V0dGVyJyksXG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBfX2RlZmluZVNldHRlcl9fOiB7XG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbiBfX2RlZmluZVNldHRlcl9fKHByb3AsIGZ1bmMpIHtcbiAgICAgICAgICBjb25zdCBPID0gdG9PYmplY3QodGhpcyk7XG4gICAgICAgICAgZGVmaW5lUHJvcGVydHkoTywgcHJvcCwge1xuICAgICAgICAgICAgc2V0OiBhRnVuY3Rpb24oZnVuYywgJ3NldHRlcicpLFxuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgX19sb29rdXBHZXR0ZXJfXzoge1xuICAgICAgICB2YWx1ZTogZnVuY3Rpb24gX19sb29rdXBHZXR0ZXJfXyhwcm9wKSB7XG4gICAgICAgICAgbGV0IE8gPSB0b09iamVjdCh0aGlzKTtcbiAgICAgICAgICBwcm9wID0gYXNQcm9wZXJ0eU5hbWUocHJvcCk7XG4gICAgICAgICAgbGV0IGRlc2M7XG4gICAgICAgICAgd2hpbGUgKE8gJiYgIShkZXNjID0gZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKE8sIHByb3ApKSkge1xuICAgICAgICAgICAgTyA9IGdldFByb3RvdHlwZU9mKE8pO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZGVzYyAmJiBkZXNjLmdldDtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIF9fbG9va3VwU2V0dGVyX186IHtcbiAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIF9fbG9va3VwU2V0dGVyX18ocHJvcCkge1xuICAgICAgICAgIGxldCBPID0gdG9PYmplY3QodGhpcyk7XG4gICAgICAgICAgcHJvcCA9IGFzUHJvcGVydHlOYW1lKHByb3ApO1xuICAgICAgICAgIGxldCBkZXNjO1xuICAgICAgICAgIHdoaWxlIChPICYmICEoZGVzYyA9IGdldE93blByb3BlcnR5RGVzY3JpcHRvcihPLCBwcm9wKSkpIHtcbiAgICAgICAgICAgIE8gPSBnZXRQcm90b3R5cGVPZihPKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGRlc2MgJiYgZGVzYy5zZXQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8vIEFkYXB0ZWQgZnJvbSBTRVMvQ2FqYVxuICAvLyBDb3B5cmlnaHQgKEMpIDIwMTEgR29vZ2xlIEluYy5cbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2dvb2dsZS9jYWphL2Jsb2IvbWFzdGVyL3NyYy9jb20vZ29vZ2xlL2NhamEvc2VzL3N0YXJ0U0VTLmpzXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9nb29nbGUvY2FqYS9ibG9iL21hc3Rlci9zcmMvY29tL2dvb2dsZS9jYWphL3Nlcy9yZXBhaXJFUzUuanNcblxuICAvKipcbiAgICogVGhpcyBibG9jayByZXBsYWNlcyB0aGUgb3JpZ2luYWwgRnVuY3Rpb24gY29uc3RydWN0b3IsIGFuZCB0aGUgb3JpZ2luYWxcbiAgICogJUdlbmVyYXRvckZ1bmN0aW9uJSAlQXN5bmNGdW5jdGlvbiUgYW5kICVBc3luY0dlbmVyYXRvckZ1bmN0aW9uJSwgd2l0aFxuICAgKiBzYWZlIHJlcGxhY2VtZW50cyB0aGF0IHRocm93IGlmIGludm9rZWQuXG4gICAqXG4gICAqIFRoZXNlIGFyZSBhbGwgcmVhY2hhYmxlIHZpYSBzeW50YXgsIHNvIGl0IGlzbid0IHN1ZmZpY2llbnQgdG8ganVzdFxuICAgKiByZXBsYWNlIGdsb2JhbCBwcm9wZXJ0aWVzIHdpdGggc2FmZSB2ZXJzaW9ucy4gT3VyIG1haW4gZ29hbCBpcyB0byBwcmV2ZW50XG4gICAqIGFjY2VzcyB0byB0aGUgRnVuY3Rpb24gY29uc3RydWN0b3IgdGhyb3VnaCB0aGVzZSBzdGFydGluZyBwb2ludHMuXG5cbiAgICogQWZ0ZXIgdGhpcyBibG9jayBpcyBkb25lLCB0aGUgb3JpZ2luYWxzIG11c3Qgbm8gbG9uZ2VyIGJlIHJlYWNoYWJsZSwgdW5sZXNzXG4gICAqIGEgY29weSBoYXMgYmVlbiBtYWRlLCBhbmQgZnVudGlvbnMgY2FuIG9ubHkgYmUgY3JlYXRlZCBieSBzeW50YXggKHVzaW5nIGV2YWwpXG4gICAqIG9yIGJ5IGludm9raW5nIGEgcHJldmlvdXNseSBzYXZlZCByZWZlcmVuY2UgdG8gdGhlIG9yaWdpbmFscy5cbiAgICovXG5cbiAgLy8gdG9kbzogdGhpcyBmaWxlIHNob3VsZCBiZSBtb3ZlZCBvdXQgdG8gYSBzZXBhcmF0ZSByZXBvIGFuZCBucG0gbW9kdWxlLlxuICBmdW5jdGlvbiByZXBhaXJGdW5jdGlvbnMoKSB7XG4gICAgY29uc3QgeyBkZWZpbmVQcm9wZXJ0aWVzLCBnZXRQcm90b3R5cGVPZiwgc2V0UHJvdG90eXBlT2YgfSA9IE9iamVjdDtcblxuICAgIC8qKlxuICAgICAqIFRoZSBwcm9jZXNzIHRvIHJlcGFpciBjb25zdHJ1Y3RvcnM6XG4gICAgICogMS4gQ3JlYXRlIGFuIGluc3RhbmNlIG9mIHRoZSBmdW5jdGlvbiBieSBldmFsdWF0aW5nIHN5bnRheFxuICAgICAqIDIuIE9idGFpbiB0aGUgcHJvdG90eXBlIGZyb20gdGhlIGluc3RhbmNlXG4gICAgICogMy4gQ3JlYXRlIGEgc3Vic3RpdHV0ZSB0YW1lZCBjb25zdHJ1Y3RvclxuICAgICAqIDQuIFJlcGxhY2UgdGhlIG9yaWdpbmFsIGNvbnN0cnVjdG9yIHdpdGggdGhlIHRhbWVkIGNvbnN0cnVjdG9yXG4gICAgICogNS4gUmVwbGFjZSB0YW1lZCBjb25zdHJ1Y3RvciBwcm90b3R5cGUgcHJvcGVydHkgd2l0aCB0aGUgb3JpZ2luYWwgb25lXG4gICAgICogNi4gUmVwbGFjZSBpdHMgW1tQcm90b3R5cGVdXSBzbG90IHdpdGggdGhlIHRhbWVkIGNvbnN0cnVjdG9yIG9mIEZ1bmN0aW9uXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVwYWlyRnVuY3Rpb24obmFtZSwgZGVjbGFyYXRpb24pIHtcbiAgICAgIGxldCBGdW5jdGlvbkluc3RhbmNlO1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLW5ldy1mdW5jXG4gICAgICAgIEZ1bmN0aW9uSW5zdGFuY2UgPSAoMCwgZXZhbCkoZGVjbGFyYXRpb24pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBpZiAoZSBpbnN0YW5jZW9mIFN5bnRheEVycm9yKSB7XG4gICAgICAgICAgLy8gUHJldmVudCBmYWlsdXJlIG9uIHBsYXRmb3JtcyB3aGVyZSBhc3luYyBhbmQvb3IgZ2VuZXJhdG9yc1xuICAgICAgICAgIC8vIGFyZSBub3Qgc3VwcG9ydGVkLlxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBSZS10aHJvd1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgICAgY29uc3QgRnVuY3Rpb25Qcm90b3R5cGUgPSBnZXRQcm90b3R5cGVPZihGdW5jdGlvbkluc3RhbmNlKTtcblxuICAgICAgLy8gUHJldmVudHMgdGhlIGV2YWx1YXRpb24gb2Ygc291cmNlIHdoZW4gY2FsbGluZyBjb25zdHJ1Y3RvciBvbiB0aGVcbiAgICAgIC8vIHByb3RvdHlwZSBvZiBmdW5jdGlvbnMuXG4gICAgICBjb25zdCBUYW1lZEZ1bmN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ05vdCBhdmFpbGFibGUnKTtcbiAgICAgIH07XG4gICAgICBkZWZpbmVQcm9wZXJ0aWVzKFRhbWVkRnVuY3Rpb24sIHsgbmFtZTogeyB2YWx1ZTogbmFtZSB9IH0pO1xuXG4gICAgICAvLyAobmV3IEVycm9yKCkpLmNvbnN0cnVjdG9ycyBkb2VzIG5vdCBpbmhlcml0IGZyb20gRnVuY3Rpb24sIGJlY2F1c2UgRXJyb3JcbiAgICAgIC8vIHdhcyBkZWZpbmVkIGJlZm9yZSBFUzYgY2xhc3Nlcy4gU28gd2UgZG9uJ3QgbmVlZCB0byByZXBhaXIgaXQgdG9vLlxuXG4gICAgICAvLyAoRXJyb3IoKSkuY29uc3RydWN0b3IgaW5oZXJpdCBmcm9tIEZ1bmN0aW9uLCB3aGljaCBnZXRzIGEgdGFtZWRcbiAgICAgIC8vIGNvbnN0cnVjdG9yIGhlcmUuXG5cbiAgICAgIC8vIHRvZG86IGluIGFuIEVTNiBjbGFzcyB0aGF0IGRvZXMgbm90IGluaGVyaXQgZnJvbSBhbnl0aGluZywgd2hhdCBkb2VzIGl0c1xuICAgICAgLy8gY29uc3RydWN0b3IgaW5oZXJpdCBmcm9tPyBXZSB3b3JyeSB0aGF0IGl0IGluaGVyaXRzIGZyb20gRnVuY3Rpb24sIGluXG4gICAgICAvLyB3aGljaCBjYXNlIGluc3RhbmNlcyBjb3VsZCBnaXZlIGFjY2VzcyB0byB1bnNhZmVGdW5jdGlvbi4gbWFya20gc2F5c1xuICAgICAgLy8gd2UncmUgZmluZTogdGhlIGNvbnN0cnVjdG9yIGluaGVyaXRzIGZyb20gT2JqZWN0LnByb3RvdHlwZVxuXG4gICAgICAvLyBUaGlzIGxpbmUgcmVwbGFjZXMgdGhlIG9yaWdpbmFsIGNvbnN0cnVjdG9yIGluIHRoZSBwcm90b3R5cGUgY2hhaW5cbiAgICAgIC8vIHdpdGggdGhlIHRhbWVkIG9uZS4gTm8gY29weSBvZiB0aGUgb3JpZ2luYWwgaXMgcGVzZXJ2ZWQuXG4gICAgICBkZWZpbmVQcm9wZXJ0aWVzKEZ1bmN0aW9uUHJvdG90eXBlLCB7XG4gICAgICAgIGNvbnN0cnVjdG9yOiB7IHZhbHVlOiBUYW1lZEZ1bmN0aW9uIH1cbiAgICAgIH0pO1xuXG4gICAgICAvLyBUaGlzIGxpbmUgc2V0cyB0aGUgdGFtZWQgY29uc3RydWN0b3IncyBwcm90b3R5cGUgZGF0YSBwcm9wZXJ0eSB0b1xuICAgICAgLy8gdGhlIG9yaWdpbmFsIG9uZS5cbiAgICAgIGRlZmluZVByb3BlcnRpZXMoVGFtZWRGdW5jdGlvbiwge1xuICAgICAgICBwcm90b3R5cGU6IHsgdmFsdWU6IEZ1bmN0aW9uUHJvdG90eXBlIH1cbiAgICAgIH0pO1xuXG4gICAgICBpZiAoVGFtZWRGdW5jdGlvbiAhPT0gRnVuY3Rpb24ucHJvdG90eXBlLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgIC8vIEVuc3VyZXMgdGhhdCBhbGwgZnVuY3Rpb25zIG1lZXQgXCJpbnN0YW5jZW9mIEZ1bmN0aW9uXCIgaW4gYSByZWFsbS5cbiAgICAgICAgc2V0UHJvdG90eXBlT2YoVGFtZWRGdW5jdGlvbiwgRnVuY3Rpb24ucHJvdG90eXBlLmNvbnN0cnVjdG9yKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBIZXJlLCB0aGUgb3JkZXIgb2Ygb3BlcmF0aW9uIGlzIGltcG9ydGFudDogRnVuY3Rpb24gbmVlZHMgdG8gYmUgcmVwYWlyZWRcbiAgICAvLyBmaXJzdCBzaW5jZSB0aGUgb3RoZXIgcmVwYWlyZWQgY29uc3RydWN0b3JzIG5lZWQgdG8gaW5oZXJpdCBmcm9tIHRoZSB0YW1lZFxuICAgIC8vIEZ1bmN0aW9uIGZ1bmN0aW9uIGNvbnN0cnVjdG9yLlxuXG4gICAgLy8gbm90ZTogdGhpcyByZWFsbHkgd2FudHMgdG8gYmUgcGFydCBvZiB0aGUgc3RhbmRhcmQsIGJlY2F1c2UgbmV3XG4gICAgLy8gY29uc3RydWN0b3JzIG1heSBiZSBhZGRlZCBpbiB0aGUgZnV0dXJlLCByZWFjaGFibGUgZnJvbSBzeW50YXgsIGFuZCB0aGlzXG4gICAgLy8gbGlzdCBtdXN0IGJlIHVwZGF0ZWQgdG8gbWF0Y2guXG5cbiAgICAvLyBcInBsYWluIGFycm93IGZ1bmN0aW9uc1wiIGluaGVyaXQgZnJvbSBGdW5jdGlvbi5wcm90b3R5cGVcblxuICAgIHJlcGFpckZ1bmN0aW9uKCdGdW5jdGlvbicsICcoZnVuY3Rpb24oKXt9KScpO1xuICAgIHJlcGFpckZ1bmN0aW9uKCdHZW5lcmF0b3JGdW5jdGlvbicsICcoZnVuY3Rpb24qKCl7fSknKTtcbiAgICByZXBhaXJGdW5jdGlvbignQXN5bmNGdW5jdGlvbicsICcoYXN5bmMgZnVuY3Rpb24oKXt9KScpO1xuICAgIHJlcGFpckZ1bmN0aW9uKCdBc3luY0dlbmVyYXRvckZ1bmN0aW9uJywgJyhhc3luYyBmdW5jdGlvbiooKXt9KScpO1xuICB9XG5cbiAgLy8gdGhpcyBtb2R1bGUgbXVzdCBuZXZlciBiZSBpbXBvcnRhYmxlIG91dHNpZGUgdGhlIFJlYWxtIHNoaW0gaXRzZWxmXG5cbiAgLy8gQSBcImNvbnRleHRcIiBpcyBhIGZyZXNoIHVuc2FmZSBSZWFsbSBhcyBnaXZlbiB0byB1cyBieSBleGlzdGluZyBwbGF0Zm9ybXMuXG4gIC8vIFdlIG5lZWQgdGhpcyB0byBpbXBsZW1lbnQgdGhlIHNoaW0uIEhvd2V2ZXIsIHdoZW4gUmVhbG1zIGxhbmQgZm9yIHJlYWwsXG4gIC8vIHRoaXMgZmVhdHVyZSB3aWxsIGJlIHByb3ZpZGVkIGJ5IHRoZSB1bmRlcmx5aW5nIGVuZ2luZSBpbnN0ZWFkLlxuXG4gIC8vIG5vdGU6IGluIGEgbm9kZSBtb2R1bGUsIHRoZSB0b3AtbGV2ZWwgJ3RoaXMnIGlzIG5vdCB0aGUgZ2xvYmFsIG9iamVjdFxuICAvLyAoaXQncyAqc29tZXRoaW5nKiBidXQgd2UgYXJlbid0IHN1cmUgd2hhdCksIGhvd2V2ZXIgYW4gaW5kaXJlY3QgZXZhbCBvZlxuICAvLyAndGhpcycgd2lsbCBiZSB0aGUgY29ycmVjdCBnbG9iYWwgb2JqZWN0LlxuXG4gIGNvbnN0IHVuc2FmZUdsb2JhbFNyYyA9IFwiJ3VzZSBzdHJpY3QnOyB0aGlzXCI7XG4gIGNvbnN0IHVuc2FmZUdsb2JhbEV2YWxTcmMgPSBgKDAsIGV2YWwpKFwiJ3VzZSBzdHJpY3QnOyB0aGlzXCIpYDtcblxuICAvLyBUaGlzIG1ldGhvZCBpcyBvbmx5IGV4cG9ydGVkIGZvciB0ZXN0aW5nIHB1cnBvc2VzLlxuICBmdW5jdGlvbiBjcmVhdGVOZXdVbnNhZmVHbG9iYWxGb3JOb2RlKCkge1xuICAgIC8vIE5vdGUgdGhhdCB3ZWJwYWNrIGFuZCBvdGhlcnMgd2lsbCBzaGltICd2bScgaW5jbHVkaW5nIHRoZSBtZXRob2RcbiAgICAvLyAncnVuSW5OZXdDb250ZXh0Jywgc28gdGhlIHByZXNlbmNlIG9mIHZtIGlzIG5vdCBhIHVzZWZ1bCBjaGVja1xuXG4gICAgLy8gVE9ETzogRmluZCBhIGJldHRlciB0ZXN0IHRoYXQgd29ya3Mgd2l0aCBidW5kbGVyc1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1uZXctZnVuY1xuICAgIGNvbnN0IGlzTm9kZSA9IG5ldyBGdW5jdGlvbihcbiAgICAgICd0cnkge3JldHVybiB0aGlzPT09Z2xvYmFsfWNhdGNoKGUpe3JldHVybiBmYWxzZX0nXG4gICAgKSgpO1xuXG4gICAgaWYgKCFpc05vZGUpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGdsb2JhbC1yZXF1aXJlXG4gICAgY29uc3Qgdm0gPSByZXF1aXJlKCd2bScpO1xuXG4gICAgLy8gVXNlIHVuc2FmZUdsb2JhbEV2YWxTcmMgdG8gZW5zdXJlIHdlIGdldCB0aGUgcmlnaHQgJ3RoaXMnLlxuICAgIGNvbnN0IHVuc2FmZUdsb2JhbCA9IHZtLnJ1bkluTmV3Q29udGV4dCh1bnNhZmVHbG9iYWxFdmFsU3JjKTtcblxuICAgIHJldHVybiB1bnNhZmVHbG9iYWw7XG4gIH1cblxuICAvLyBUaGlzIG1ldGhvZCBpcyBvbmx5IGV4cG9ydGVkIGZvciB0ZXN0aW5nIHB1cnBvc2VzLlxuICBmdW5jdGlvbiBjcmVhdGVOZXdVbnNhZmVHbG9iYWxGb3JCcm93c2VyKCkge1xuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBpZnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcbiAgICBpZnJhbWUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcblxuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoaWZyYW1lKTtcbiAgICBjb25zdCB1bnNhZmVHbG9iYWwgPSBpZnJhbWUuY29udGVudFdpbmRvdy5ldmFsKHVuc2FmZUdsb2JhbFNyYyk7XG5cbiAgICAvLyBXZSBrZWVwIHRoZSBpZnJhbWUgYXR0YWNoZWQgdG8gdGhlIERPTSBiZWNhdXNlIHJlbW92aW5nIGl0XG4gICAgLy8gY2F1c2VzIGl0cyBnbG9iYWwgb2JqZWN0IHRvIGxvc2UgaW50cmluc2ljcywgaXRzIGV2YWwoKVxuICAgIC8vIGZ1bmN0aW9uIHRvIGV2YWx1YXRlIGNvZGUsIGV0Yy5cblxuICAgIC8vIFRPRE86IGNhbiB3ZSByZW1vdmUgYW5kIGdhcmJhZ2UtY29sbGVjdCB0aGUgaWZyYW1lcz9cblxuICAgIHJldHVybiB1bnNhZmVHbG9iYWw7XG4gIH1cblxuICBjb25zdCBnZXROZXdVbnNhZmVHbG9iYWwgPSAoKSA9PiB7XG4gICAgY29uc3QgbmV3VW5zYWZlR2xvYmFsRm9yQnJvd3NlciA9IGNyZWF0ZU5ld1Vuc2FmZUdsb2JhbEZvckJyb3dzZXIoKTtcbiAgICBjb25zdCBuZXdVbnNhZmVHbG9iYWxGb3JOb2RlID0gY3JlYXRlTmV3VW5zYWZlR2xvYmFsRm9yTm9kZSgpO1xuICAgIGlmIChcbiAgICAgICghbmV3VW5zYWZlR2xvYmFsRm9yQnJvd3NlciAmJiAhbmV3VW5zYWZlR2xvYmFsRm9yTm9kZSkgfHxcbiAgICAgIChuZXdVbnNhZmVHbG9iYWxGb3JCcm93c2VyICYmIG5ld1Vuc2FmZUdsb2JhbEZvck5vZGUpXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3VuZXhwZWN0ZWQgcGxhdGZvcm0sIHVuYWJsZSB0byBjcmVhdGUgUmVhbG0nKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ld1Vuc2FmZUdsb2JhbEZvckJyb3dzZXIgfHwgbmV3VW5zYWZlR2xvYmFsRm9yTm9kZTtcbiAgfTtcblxuICAvLyBUaGUgdW5zYWZlUmVjIGlzIHNoaW0tc3BlY2lmaWMuIEl0IGFjdHMgYXMgdGhlIG1lY2hhbmlzbSB0byBvYnRhaW4gYSBmcmVzaFxuICAvLyBzZXQgb2YgaW50cmluc2ljcyB0b2dldGhlciB3aXRoIHRoZWlyIGFzc29jaWF0ZWQgZXZhbCBhbmQgRnVuY3Rpb25cbiAgLy8gZXZhbHVhdG9ycy4gVGhlc2UgbXVzdCBiZSB1c2VkIGFzIGEgbWF0Y2hlZCBzZXQsIHNpbmNlIHRoZSBldmFsdWF0b3JzIGFyZVxuICAvLyB0aWVkIHRvIGEgc2V0IG9mIGludHJpbnNpY3MsIGFrYSB0aGUgXCJ1bmRlbmlhYmxlc1wiLiBJZiBpdCB3ZXJlIHBvc3NpYmxlIHRvXG4gIC8vIG1peC1hbmQtbWF0Y2ggdGhlbSBmcm9tIGRpZmZlcmVudCBjb250ZXh0cywgdGhhdCB3b3VsZCBlbmFibGUgc29tZVxuICAvLyBhdHRhY2tzLlxuICBmdW5jdGlvbiBjcmVhdGVVbnNhZmVSZWMoXG4gICAgdW5zYWZlR2xvYmFsLFxuICAgIGFsbFNoaW1zID0gW10sXG4gICAgY29uZmlndXJhYmxlR2xvYmFscyA9IGZhbHNlXG4gICkge1xuICAgIGNvbnN0IHNoYXJlZEdsb2JhbERlc2NzID0gZ2V0U2hhcmVkR2xvYmFsRGVzY3MoXG4gICAgICB1bnNhZmVHbG9iYWwsXG4gICAgICBjb25maWd1cmFibGVHbG9iYWxzXG4gICAgKTtcblxuICAgIGNvbnN0IHVuc2FmZUV2YWwgPSB1bnNhZmVHbG9iYWwuZXZhbDtcbiAgICBjb25zdCB1bnNhZmVGdW5jdGlvbiA9IHVuc2FmZUdsb2JhbC5GdW5jdGlvbjtcbiAgICBjb25zdCBjYWxsQW5kV3JhcEVycm9yID0gdW5zYWZlRXZhbChidWlsZENhbGxBbmRXcmFwRXJyb3JTdHJpbmcpKCk7XG5cbiAgICByZXR1cm4gZnJlZXplKHtcbiAgICAgIHVuc2FmZUdsb2JhbCxcbiAgICAgIHNoYXJlZEdsb2JhbERlc2NzLFxuICAgICAgdW5zYWZlRXZhbCxcbiAgICAgIHVuc2FmZUZ1bmN0aW9uLFxuICAgICAgY2FsbEFuZFdyYXBFcnJvcixcbiAgICAgIGFsbFNoaW1zXG4gICAgfSk7XG4gIH1cblxuICBjb25zdCByZXBhaXJBY2Nlc3NvcnNTdHJpbmcgPSBzYWZlU3RyaW5naWZ5RnVuY3Rpb24ocmVwYWlyQWNjZXNzb3JzKTtcbiAgY29uc3QgcmVwYWlyRnVuY3Rpb25zU3RyaW5nID0gc2FmZVN0cmluZ2lmeUZ1bmN0aW9uKHJlcGFpckZ1bmN0aW9ucyk7XG5cbiAgLy8gQ3JlYXRlIGEgbmV3IHVuc2FmZVJlYyBmcm9tIGEgYnJhbmQgbmV3IGNvbnRleHQsIHdpdGggbmV3IGludHJpbnNpY3MgYW5kIGFcbiAgLy8gbmV3IGdsb2JhbCBvYmplY3RcbiAgZnVuY3Rpb24gY3JlYXRlTmV3VW5zYWZlUmVjKGFsbFNoaW1zLCBjb25maWd1cmFibGVHbG9iYWxzID0gZmFsc2UpIHtcbiAgICBjb25zdCB1bnNhZmVHbG9iYWwgPSBnZXROZXdVbnNhZmVHbG9iYWwoKTtcbiAgICBjb25zdCB1bnNhZmVSZWMgPSBjcmVhdGVVbnNhZmVSZWMoXG4gICAgICB1bnNhZmVHbG9iYWwsXG4gICAgICBhbGxTaGltcyxcbiAgICAgIGNvbmZpZ3VyYWJsZUdsb2JhbHNcbiAgICApO1xuICAgIGNvbnN0IHsgdW5zYWZlRXZhbCB9ID0gdW5zYWZlUmVjO1xuICAgIHVuc2FmZUV2YWwocmVwYWlyQWNjZXNzb3JzU3RyaW5nKSgpO1xuICAgIHVuc2FmZUV2YWwocmVwYWlyRnVuY3Rpb25zU3RyaW5nKSgpO1xuICAgIHJldHVybiB1bnNhZmVSZWM7XG4gIH1cblxuICAvLyBDcmVhdGUgYSBuZXcgdW5zYWZlUmVjIGZyb20gdGhlIGN1cnJlbnQgY29udGV4dCwgd2hlcmUgdGhlIFJlYWxtIHNoaW0gaXNcbiAgLy8gYmVpbmcgcGFyc2VkIGFuZCBleGVjdXRlZCwgYWthIHRoZSBcIlByaW1hbCBSZWFsbVwiXG4gIGZ1bmN0aW9uIGNyZWF0ZUN1cnJlbnRVbnNhZmVSZWMoKSB7XG4gICAgY29uc3QgdW5zYWZlRXZhbCA9IGV2YWw7XG4gICAgY29uc3QgdW5zYWZlR2xvYmFsID0gdW5zYWZlRXZhbCh1bnNhZmVHbG9iYWxTcmMpO1xuICAgIHJlcGFpckFjY2Vzc29ycygpO1xuICAgIHJlcGFpckZ1bmN0aW9ucygpO1xuICAgIHJldHVybiBjcmVhdGVVbnNhZmVSZWModW5zYWZlR2xvYmFsKTtcbiAgfVxuXG4gIC8vIHRvZG86IHRoaW5rIGFib3V0IGhvdyB0aGlzIGludGVyYWN0cyB3aXRoIGVuZG93bWVudHMsIGNoZWNrIGZvciBjb25mbGljdHNcbiAgLy8gYmV0d2VlbiB0aGUgbmFtZXMgYmVpbmcgb3B0aW1pemVkIGFuZCB0aGUgb25lcyBhZGRlZCBieSBlbmRvd21lbnRzXG5cbiAgLyoqXG4gICAqIFNpbXBsaWZpZWQgdmFsaWRhdGlvbiBvZiBpbmRlbnRpZmllciBuYW1lczogbWF5IG9ubHkgY29udGFpbiBhbHBoYW51bWVyaWNcbiAgICogY2hhcmFjdGVycyAob3IgXCIkXCIgb3IgXCJfXCIpLCBhbmQgbWF5IG5vdCBzdGFydCB3aXRoIGEgZGlnaXQuIFRoaXMgaXMgc2FmZVxuICAgKiBhbmQgZG9lcyBub3QgcmVkdWNlcyB0aGUgY29tcGF0aWJpbGl0eSBvZiB0aGUgc2hpbS4gVGhlIG1vdGl2YXRpb24gZm9yXG4gICAqIHRoaXMgbGltaXRhdGlvbiB3YXMgdG8gZGVjcmVhc2UgdGhlIGNvbXBsZXhpdHkgb2YgdGhlIGltcGxlbWVudGF0aW9uLFxuICAgKiBhbmQgdG8gbWFpbnRhaW4gYSByZXNvbmFibGUgbGV2ZWwgb2YgcGVyZm9ybWFuY2UuXG4gICAqIE5vdGU6IFxcdyBpcyBlcXVpdmFsZW50IFthLXpBLVpfMC05XVxuICAgKiBTZWUgMTEuNi4xIElkZW50aWZpZXIgTmFtZXNcbiAgICovXG4gIGNvbnN0IGlkZW50aWZpZXJQYXR0ZXJuID0gL15bYS16QS1aXyRdW1xcdyRdKiQvO1xuXG4gIC8qKlxuICAgKiBJbiBKYXZhU2NyaXB0IHlvdSBjYW5ub3QgdXNlIHRoZXNlIHJlc2VydmVkIHdvcmRzIGFzIHZhcmlhYmxlcy5cbiAgICogU2VlIDExLjYuMSBJZGVudGlmaWVyIE5hbWVzXG4gICAqL1xuICBjb25zdCBrZXl3b3JkcyA9IG5ldyBTZXQoW1xuICAgIC8vIDExLjYuMi4xIEtleXdvcmRzXG4gICAgJ2F3YWl0JyxcbiAgICAnYnJlYWsnLFxuICAgICdjYXNlJyxcbiAgICAnY2F0Y2gnLFxuICAgICdjbGFzcycsXG4gICAgJ2NvbnN0JyxcbiAgICAnY29udGludWUnLFxuICAgICdkZWJ1Z2dlcicsXG4gICAgJ2RlZmF1bHQnLFxuICAgICdkZWxldGUnLFxuICAgICdkbycsXG4gICAgJ2Vsc2UnLFxuICAgICdleHBvcnQnLFxuICAgICdleHRlbmRzJyxcbiAgICAnZmluYWxseScsXG4gICAgJ2ZvcicsXG4gICAgJ2Z1bmN0aW9uJyxcbiAgICAnaWYnLFxuICAgICdpbXBvcnQnLFxuICAgICdpbicsXG4gICAgJ2luc3RhbmNlb2YnLFxuICAgICduZXcnLFxuICAgICdyZXR1cm4nLFxuICAgICdzdXBlcicsXG4gICAgJ3N3aXRjaCcsXG4gICAgJ3RoaXMnLFxuICAgICd0aHJvdycsXG4gICAgJ3RyeScsXG4gICAgJ3R5cGVvZicsXG4gICAgJ3ZhcicsXG4gICAgJ3ZvaWQnLFxuICAgICd3aGlsZScsXG4gICAgJ3dpdGgnLFxuICAgICd5aWVsZCcsXG5cbiAgICAvLyBBbHNvIHJlc2VydmVkIHdoZW4gcGFyc2luZyBzdHJpY3QgbW9kZSBjb2RlXG4gICAgJ2xldCcsXG4gICAgJ3N0YXRpYycsXG5cbiAgICAvLyAxMS42LjIuMiBGdXR1cmUgUmVzZXJ2ZWQgV29yZHNcbiAgICAnZW51bScsXG5cbiAgICAvLyBBbHNvIHJlc2VydmVkIHdoZW4gcGFyc2luZyBzdHJpY3QgbW9kZSBjb2RlXG4gICAgJ2ltcGxlbWVudHMnLFxuICAgICdwYWNrYWdlJyxcbiAgICAncHJvdGVjdGVkJyxcbiAgICAnaW50ZXJmYWNlJyxcbiAgICAncHJpdmF0ZScsXG4gICAgJ3B1YmxpYycsXG5cbiAgICAvLyBSZXNlcnZlZCBidXQgbm90IG1lbnRpb25lZCBpbiBzcGVjc1xuICAgICdhd2FpdCcsXG5cbiAgICAnbnVsbCcsXG4gICAgJ3RydWUnLFxuICAgICdmYWxzZScsXG5cbiAgICAndGhpcycsXG4gICAgJ2FyZ3VtZW50cydcbiAgXSk7XG5cbiAgLyoqXG4gICAqIGdldE9wdGltaXphYmxlR2xvYmFscygpXG4gICAqIFdoYXQgdmFyaWFibGUgbmFtZXMgbWlnaHQgaXQgYnJpbmcgaW50byBzY29wZT8gVGhlc2UgaW5jbHVkZSBhbGxcbiAgICogcHJvcGVydHkgbmFtZXMgd2hpY2ggY2FuIGJlIHZhcmlhYmxlIG5hbWVzLCBpbmNsdWRpbmcgdGhlIG5hbWVzXG4gICAqIG9mIGluaGVyaXRlZCBwcm9wZXJ0aWVzLiBJdCBleGNsdWRlcyBzeW1ib2xzIGFuZCBuYW1lcyB3aGljaCBhcmVcbiAgICoga2V5d29yZHMuIFdlIGRyb3Agc3ltYm9scyBzYWZlbHkuIEN1cnJlbnRseSwgdGhpcyBzaGltIHJlZnVzZXNcbiAgICogc2VydmljZSBpZiBhbnkgb2YgdGhlIG5hbWVzIGFyZSBrZXl3b3JkcyBvciBrZXl3b3JkLWxpa2UuIFRoaXMgaXNcbiAgICogc2FmZSBhbmQgb25seSBwcmV2ZW50IHBlcmZvcm1hbmNlIG9wdGltaXphdGlvbi5cbiAgICovXG4gIGZ1bmN0aW9uIGdldE9wdGltaXphYmxlR2xvYmFscyhnbG9iYWxPYmplY3QsIGxvY2FsT2JqZWN0ID0ge30pIHtcbiAgICBjb25zdCBnbG9iYWxOYW1lcyA9IGdldE93blByb3BlcnR5TmFtZXMoZ2xvYmFsT2JqZWN0KTtcbiAgICAvLyBnZXRPd25Qcm9wZXJ0eU5hbWVzIGRvZXMgaWdub3JlIFN5bWJvbHMgc28gd2UgZG9uJ3QgbmVlZCB0aGlzIGV4dHJhIGNoZWNrOlxuICAgIC8vIHR5cGVvZiBuYW1lID09PSAnc3RyaW5nJyAmJlxuICAgIGNvbnN0IGNvbnN0YW50cyA9IGFycmF5RmlsdGVyKGdsb2JhbE5hbWVzLCBuYW1lID0+IHtcbiAgICAgIC8vIEV4Y2x1ZGUgZ2xvYmFscyB0aGF0IHdpbGwgYmUgaGlkZGVuIGJlaGluZCBhbiBvYmplY3QgcG9zaXRpb25lZFxuICAgICAgLy8gY2xvc2VyIGluIHRoZSByZXNvbHV0aW9uIHNjb3BlIGNoYWluLCB0eXBpY2FsbHkgdGhlIGVuZG93bWVudHMuXG4gICAgICBpZiAobmFtZSBpbiBsb2NhbE9iamVjdCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIC8vIEVuc3VyZSB3ZSBoYXZlIGEgdmFsaWQgaWRlbnRpZmllci4gV2UgdXNlIHJlZ2V4cFRlc3QgcmF0aGVyIHRoYW5cbiAgICAgIC8vIC8uLi8udGVzdCgpIHRvIGd1YXJkIGFnYWluc3QgdGhlIGNhc2Ugd2hlcmUgUmVnRXhwIGhhcyBiZWVuIHBvaXNvbmVkLlxuICAgICAgaWYgKFxuICAgICAgICBuYW1lID09PSAnZXZhbCcgfHxcbiAgICAgICAga2V5d29yZHMuaGFzKG5hbWUpIHx8XG4gICAgICAgICFyZWdleHBUZXN0KGlkZW50aWZpZXJQYXR0ZXJuLCBuYW1lKVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGVzYyA9IGdldE93blByb3BlcnR5RGVzY3JpcHRvcihnbG9iYWxPYmplY3QsIG5hbWUpO1xuICAgICAgcmV0dXJuIChcbiAgICAgICAgLy9cbiAgICAgICAgLy8gVGhlIGdldHRlcnMgd2lsbCBub3QgaGF2ZSAud3JpdGFibGUsIGRvbid0IGxldCB0aGUgZmFsc3luZXNzIG9mXG4gICAgICAgIC8vICd1bmRlZmluZWQnIHRyaWNrIHVzOiB0ZXN0IHdpdGggPT09IGZhbHNlLCBub3QgISAuIEhvd2V2ZXIgZGVzY3JpcHRvcnNcbiAgICAgICAgLy8gaW5oZXJpdCBmcm9tIHRoZSAocG90ZW50aWFsbHkgcG9pc29uZWQpIGdsb2JhbCBvYmplY3QsIHNvIHdlIG1pZ2h0IHNlZVxuICAgICAgICAvLyBleHRyYSBwcm9wZXJ0aWVzIHdoaWNoIHdlcmVuJ3QgcmVhbGx5IHRoZXJlLiBBY2Nlc3NvciBwcm9wZXJ0aWVzIGhhdmVcbiAgICAgICAgLy8gJ2dldC9zZXQvZW51bWVyYWJsZS9jb25maWd1cmFibGUnLCB3aGlsZSBkYXRhIHByb3BlcnRpZXMgaGF2ZVxuICAgICAgICAvLyAndmFsdWUvd3JpdGFibGUvZW51bWVyYWJsZS9jb25maWd1cmFibGUnLlxuICAgICAgICBkZXNjLmNvbmZpZ3VyYWJsZSA9PT0gZmFsc2UgJiZcbiAgICAgICAgZGVzYy53cml0YWJsZSA9PT0gZmFsc2UgJiZcbiAgICAgICAgLy9cbiAgICAgICAgLy8gQ2hlY2tzIGZvciBkYXRhIHByb3BlcnRpZXMgYmVjYXVzZSB0aGV5J3JlIHRoZSBvbmx5IG9uZXMgd2UgY2FuXG4gICAgICAgIC8vIG9wdGltaXplIChhY2Nlc3NvcnMgYXJlIG1vc3QgbGlrZWx5IG5vbi1jb25zdGFudCkuIERlc2NyaXB0b3JzIGNhbid0XG4gICAgICAgIC8vIGNhbid0IGhhdmUgYWNjZXNzb3JzIGFuZCB2YWx1ZSBwcm9wZXJ0aWVzIGF0IHRoZSBzYW1lIHRpbWUsIHRoZXJlZm9yZVxuICAgICAgICAvLyB0aGlzIGNoZWNrIGlzIHN1ZmZpY2llbnQuIFVzaW5nIGV4cGxpY2l0IG93biBwcm9wZXJ0eSBkZWFsIHdpdGggdGhlXG4gICAgICAgIC8vIGNhc2Ugd2hlcmUgT2JqZWN0LnByb3RvdHlwZSBoYXMgYmVlbiBwb2lzb25lZC5cbiAgICAgICAgb2JqZWN0SGFzT3duUHJvcGVydHkoZGVzYywgJ3ZhbHVlJylcbiAgICAgICk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gY29uc3RhbnRzO1xuICB9XG5cbiAgLyoqXG4gICAqIFNjb3BlSGFuZGxlciBtYW5hZ2VzIGEgUHJveHkgd2hpY2ggc2VydmVzIGFzIHRoZSBnbG9iYWwgc2NvcGUgZm9yIHRoZVxuICAgKiBzYWZlRXZhbHVhdG9yIG9wZXJhdGlvbiAodGhlIFByb3h5IGlzIHRoZSBhcmd1bWVudCBvZiBhICd3aXRoJyBiaW5kaW5nKS5cbiAgICogQXMgZGVzY3JpYmVkIGluIGNyZWF0ZVNhZmVFdmFsdWF0b3IoKSwgaXQgaGFzIHNldmVyYWwgZnVuY3Rpb25zOlxuICAgKiAtIGFsbG93IHRoZSB2ZXJ5IGZpcnN0IChhbmQgb25seSB0aGUgdmVyeSBmaXJzdCkgdXNlIG9mICdldmFsJyB0byBtYXAgdG9cbiAgICogICB0aGUgcmVhbCAodW5zYWZlKSBldmFsIGZ1bmN0aW9uLCBzbyBpdCBhY3RzIGFzIGEgJ2RpcmVjdCBldmFsJyBhbmQgY2FuXG4gICAqICAgIGFjY2VzcyBpdHMgbGV4aWNhbCBzY29wZSAod2hpY2ggbWFwcyB0byB0aGUgJ3dpdGgnIGJpbmRpbmcsIHdoaWNoIHRoZVxuICAgKiAgIFNjb3BlSGFuZGxlciBhbHNvIGNvbnRyb2xzKS5cbiAgICogLSBlbnN1cmUgdGhhdCBhbGwgc3Vic2VxdWVudCB1c2VzIG9mICdldmFsJyBtYXAgdG8gdGhlIHNhZmVFdmFsdWF0b3IsXG4gICAqICAgd2hpY2ggbGl2ZXMgYXMgdGhlICdldmFsJyBwcm9wZXJ0eSBvZiB0aGUgc2FmZUdsb2JhbC5cbiAgICogLSByb3V0ZSBhbGwgb3RoZXIgcHJvcGVydHkgbG9va3VwcyBhdCB0aGUgc2FmZUdsb2JhbC5cbiAgICogLSBoaWRlIHRoZSB1bnNhZmVHbG9iYWwgd2hpY2ggbGl2ZXMgb24gdGhlIHNjb3BlIGNoYWluIGFib3ZlIHRoZSAnd2l0aCcuXG4gICAqIC0gZW5zdXJlIHRoZSBQcm94eSBpbnZhcmlhbnRzIGRlc3BpdGUgc29tZSBnbG9iYWwgcHJvcGVydGllcyBiZWluZyBmcm96ZW4uXG4gICAqXG4gICAqIEByZXR1cm5zIHtQcm94eUhhbmRsZXI8YW55PiAmIFJlY29yZDxzdHJpbmcsIGFueT59XG4gICAqL1xuICBmdW5jdGlvbiBidWlsZFNjb3BlSGFuZGxlcihcbiAgICB1bnNhZmVSZWMsXG4gICAgc2FmZUdsb2JhbCxcbiAgICBlbmRvd21lbnRzID0ge30sXG4gICAgc2xvcHB5R2xvYmFscyA9IGZhbHNlXG4gICkge1xuICAgIGNvbnN0IHsgdW5zYWZlR2xvYmFsLCB1bnNhZmVFdmFsIH0gPSB1bnNhZmVSZWM7XG5cbiAgICBjb25zdCB7IGZyZWV6ZSwgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIH0gPSBPYmplY3Q7XG4gICAgY29uc3QgeyBnZXQ6IHJlZmxlY3RHZXQsIHNldDogcmVmbGVjdFNldCB9ID0gUmVmbGVjdDtcblxuICAgIC8qKlxuICAgICAqIGFsd2F5c1Rocm93SGFuZGxlciBpcyBhIHByb3h5IGhhbmRsZXIgd2hpY2ggdGhyb3dzIG9uIGFueSB0cmFwIGNhbGxlZC5cbiAgICAgKiBJdCdzIG1hZGUgZnJvbSBhIHByb3h5IHdpdGggYSBnZXQgdHJhcCB0aGF0IHRocm93cy4gSXRzIHRhcmdldCBpc1xuICAgICAqIGFuIGltbXV0YWJsZSAoZnJvemVuKSBvYmplY3QgYW5kIGlzIHNhZmUgdG8gc2hhcmUsIGV4Y2VwdCBhY2Nyb3NzIHJlYWxtc1xuICAgICAqL1xuICAgIGNvbnN0IGFsd2F5c1Rocm93SGFuZGxlciA9IG5ldyBQcm94eShmcmVlemUoe30pLCB7XG4gICAgICBnZXQodGFyZ2V0LCBwcm9wKSB7XG4gICAgICAgIC8vIHRvZG86IHJlcGxhY2Ugd2l0aCB0aHJvd1RhbnRydW1cbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICBgdW5leHBlY3RlZCBzY29wZSBoYW5kbGVyIHRyYXAgY2FsbGVkOiAke1N0cmluZyhwcm9wKX1gXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgLy8gVGhlIHNjb3BlIGhhbmRsZXIgdGhyb3dzIGlmIGFueSB0cmFwIG90aGVyIHRoYW4gZ2V0L3NldC9oYXMgYXJlIHJ1blxuICAgICAgLy8gKGUuZy4gZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycywgYXBwbHksIGdldFByb3RvdHlwZU9mKS5cbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1wcm90b1xuICAgICAgX19wcm90b19fOiBhbHdheXNUaHJvd0hhbmRsZXIsXG5cbiAgICAgIC8vIFRoaXMgZmxhZyBhbGxvdyB1cyB0byBkZXRlcm1pbmUgaWYgdGhlIGV2YWwoKSBjYWxsIGlzIGFuIGRvbmUgYnkgdGhlXG4gICAgICAvLyByZWFsbSdzIGNvZGUgb3IgaWYgaXQgaXMgdXNlci1sYW5kIGludm9jYXRpb24sIHNvIHdlIGNhbiByZWFjdCBkaWZmZXJlbnRseS5cbiAgICAgIC8vIFdlIHVzZSBhIHByb3BlcnR5IGFuZCBub3QgYW4gYWNjZXNzb3IgdG8gYXZvaWQgaW5jcmVhc2luZyB0aGUgc3RhY2sgdHJhY2VcbiAgICAgIC8vIGFuZCByZWR1Y2UgdGhlIHBvc3NpYmlsaXR5IG9mIE9PTS5cbiAgICAgIHVzZVVuc2FmZUV2YWx1YXRvcjogZmFsc2UsXG5cbiAgICAgIGdldChzaGFkb3csIHByb3ApIHtcbiAgICAgICAgaWYgKHR5cGVvZiBwcm9wID09PSAnc3ltYm9sJykge1xuICAgICAgICAgIC8vIFNhZmUgdG8gcmV0dXJuIGEgcHJpbWFsIHJlYWxtIE9iamVjdCBoZXJlIGJlY2F1c2UgdGhlIG9ubHkgY29kZSB0aGF0XG4gICAgICAgICAgLy8gY2FuIGRvIGEgZ2V0KCkgb24gYSBub24tc3RyaW5nIGlzIHRoZSBpbnRlcm5hbHMgb2Ygd2l0aCgpIGl0c2VsZixcbiAgICAgICAgICAvLyBhbmQgdGhlIG9ubHkgdGhpbmcgaXQgZG9lcyBpcyB0byBsb29rIGZvciBwcm9wZXJ0aWVzIG9uIGl0LiBVc2VyXG4gICAgICAgICAgLy8gY29kZSBjYW5ub3QgZG8gYSBsb29rdXAgb24gbm9uLXN0cmluZ3MuXG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNwZWNpYWwgdHJlYXRtZW50IGZvciBldmFsLiBUaGUgdmVyeSBmaXJzdCBsb29rdXAgb2YgJ2V2YWwnIGdldHMgdGhlXG4gICAgICAgIC8vIHVuc2FmZSAocmVhbCBkaXJlY3QpIGV2YWwsIHNvIGl0IHdpbGwgZ2V0IHRoZSBsZXhpY2FsIHNjb3BlIHRoYXQgdXNlc1xuICAgICAgICAvLyB0aGUgJ3dpdGgnIGNvbnRleHQuXG4gICAgICAgIGlmIChwcm9wID09PSAnZXZhbCcpIHtcbiAgICAgICAgICAvLyB0ZXN0IHRoYXQgaXQgaXMgdHJ1ZSByYXRoZXIgdGhhbiBtZXJlbHkgdHJ1dGh5XG4gICAgICAgICAgaWYgKHRoaXMudXNlVW5zYWZlRXZhbHVhdG9yID09PSB0cnVlKSB7XG4gICAgICAgICAgICAvLyByZXZva2UgYmVmb3JlIHVzZVxuICAgICAgICAgICAgdGhpcy51c2VVbnNhZmVFdmFsdWF0b3IgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybiB1bnNhZmVFdmFsO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBmYWxsIHRocm91Z2hcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByb3BlcnRpZXMgb2YgdGhlIGVuZG93bWVudHMuXG4gICAgICAgIGlmIChwcm9wIGluIGVuZG93bWVudHMpIHtcbiAgICAgICAgICAvLyBFbnN1cmUgdGhhdCB0aGUgJ3RoaXMnIHZhbHVlIG9uIGdldHRlcnMgcmVzb2x2ZXNcbiAgICAgICAgICAvLyB0byB0aGUgc2FmZUdsb2JhbCwgbm90IHRvIHRoZSBlbmRvd21lbnRzIG9iamVjdC5cbiAgICAgICAgICByZXR1cm4gcmVmbGVjdEdldChlbmRvd21lbnRzLCBwcm9wLCBzYWZlR2xvYmFsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByb3BlcnRpZXMgb2YgdGhlIGdsb2JhbC5cbiAgICAgICAgcmV0dXJuIHJlZmxlY3RHZXQoc2FmZUdsb2JhbCwgcHJvcCk7XG4gICAgICB9LFxuXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY2xhc3MtbWV0aG9kcy11c2UtdGhpc1xuICAgICAgc2V0KHNoYWRvdywgcHJvcCwgdmFsdWUpIHtcbiAgICAgICAgLy8gUHJvcGVydGllcyBvZiB0aGUgZW5kb3dtZW50cy5cbiAgICAgICAgaWYgKHByb3AgaW4gZW5kb3dtZW50cykge1xuICAgICAgICAgIGNvbnN0IGRlc2MgPSBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoZW5kb3dtZW50cywgcHJvcCk7XG4gICAgICAgICAgaWYgKCd2YWx1ZScgaW4gZGVzYykge1xuICAgICAgICAgICAgLy8gV29yayBhcm91bmQgYSBwZWN1bGlhciBiZWhhdmlvciBpbiB0aGUgc3BlY3MsIHdoZXJlXG4gICAgICAgICAgICAvLyB2YWx1ZSBwcm9wZXJ0aWVzIGFyZSBkZWZpbmVkIG9uIHRoZSByZWNlaXZlci5cbiAgICAgICAgICAgIHJldHVybiByZWZsZWN0U2V0KGVuZG93bWVudHMsIHByb3AsIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gRW5zdXJlIHRoYXQgdGhlICd0aGlzJyB2YWx1ZSBvbiBzZXR0ZXJzIHJlc29sdmVzXG4gICAgICAgICAgLy8gdG8gdGhlIHNhZmVHbG9iYWwsIG5vdCB0byB0aGUgZW5kb3dtZW50cyBvYmplY3QuXG4gICAgICAgICAgcmV0dXJuIHJlZmxlY3RTZXQoZW5kb3dtZW50cywgcHJvcCwgdmFsdWUsIHNhZmVHbG9iYWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUHJvcGVydGllcyBvZiB0aGUgZ2xvYmFsLlxuICAgICAgICByZXR1cm4gcmVmbGVjdFNldChzYWZlR2xvYmFsLCBwcm9wLCB2YWx1ZSk7XG4gICAgICB9LFxuXG4gICAgICAvLyB3ZSBuZWVkIGhhcygpIHRvIHJldHVybiBmYWxzZSBmb3Igc29tZSBuYW1lcyB0byBwcmV2ZW50IHRoZSBsb29rdXAgIGZyb21cbiAgICAgIC8vIGNsaW1iaW5nIHRoZSBzY29wZSBjaGFpbiBhbmQgZXZlbnR1YWxseSByZWFjaGluZyB0aGUgdW5zYWZlR2xvYmFsXG4gICAgICAvLyBvYmplY3QsIHdoaWNoIGlzIGJhZC5cblxuICAgICAgLy8gbm90ZTogdW5zY29wYWJsZXMhIGV2ZXJ5IHN0cmluZyBpbiBPYmplY3RbU3ltYm9sLnVuc2NvcGFibGVzXVxuXG4gICAgICAvLyB0b2RvOiB3ZSdkIGxpa2UgdG8ganVzdCBoYXZlIGhhcygpIHJldHVybiB0cnVlIGZvciBldmVyeXRoaW5nLCBhbmQgdGhlblxuICAgICAgLy8gdXNlIGdldCgpIHRvIHJhaXNlIGEgUmVmZXJlbmNlRXJyb3IgZm9yIGFueXRoaW5nIG5vdCBvbiB0aGUgc2FmZSBnbG9iYWwuXG4gICAgICAvLyBCdXQgd2Ugd2FudCB0byBiZSBjb21wYXRpYmxlIHdpdGggUmVmZXJlbmNlRXJyb3IgaW4gdGhlIG5vcm1hbCBjYXNlIGFuZFxuICAgICAgLy8gdGhlIGxhY2sgb2YgUmVmZXJlbmNlRXJyb3IgaW4gdGhlICd0eXBlb2YnIGNhc2UuIE11c3QgZWl0aGVyIHJlbGlhYmx5XG4gICAgICAvLyBkaXN0aW5ndWlzaCB0aGVzZSB0d28gY2FzZXMgKHRoZSB0cmFwIGJlaGF2aW9yIG1pZ2h0IGJlIGRpZmZlcmVudCksIG9yXG4gICAgICAvLyB3ZSByZWx5IG9uIGEgbWFuZGF0b3J5IHNvdXJjZS10by1zb3VyY2UgdHJhbnNmb3JtIHRvIGNoYW5nZSAndHlwZW9mIGFiYydcbiAgICAgIC8vIHRvIFhYWC4gV2UgYWxyZWFkeSBuZWVkIGEgbWFuZGF0b3J5IHBhcnNlIHRvIHByZXZlbnQgdGhlICdpbXBvcnQnLFxuICAgICAgLy8gc2luY2UgaXQncyBhIHNwZWNpYWwgZm9ybSBpbnN0ZWFkIG9mIG1lcmVseSBiZWluZyBhIGdsb2JhbCB2YXJpYWJsZS9cblxuICAgICAgLy8gbm90ZTogaWYgd2UgbWFrZSBoYXMoKSByZXR1cm4gdHJ1ZSBhbHdheXMsIHRoZW4gd2UgbXVzdCBpbXBsZW1lbnQgYVxuICAgICAgLy8gc2V0KCkgdHJhcCB0byBhdm9pZCBzdWJ2ZXJ0aW5nIHRoZSBwcm90ZWN0aW9uIG9mIHN0cmljdCBtb2RlIChpdCB3b3VsZFxuICAgICAgLy8gYWNjZXB0IGFzc2lnbm1lbnRzIHRvIHVuZGVmaW5lZCBnbG9iYWxzLCB3aGVuIGl0IG91Z2h0IHRvIHRocm93XG4gICAgICAvLyBSZWZlcmVuY2VFcnJvciBmb3Igc3VjaCBhc3NpZ25tZW50cylcblxuICAgICAgaGFzKHNoYWRvdywgcHJvcCkge1xuICAgICAgICAvLyBwcm94aWVzIHN0cmluZ2lmeSAncHJvcCcsIHNvIG5vIFRPQ1RUT1UgZGFuZ2VyIGhlcmVcblxuICAgICAgICBpZiAoc2xvcHB5R2xvYmFscykge1xuICAgICAgICAgIC8vIEV2ZXJ5dGhpbmcgaXMgcG90ZW50aWFsbHkgYXZhaWxhYmxlLlxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gdW5zYWZlR2xvYmFsOiBoaWRlIGFsbCBwcm9wZXJ0aWVzIG9mIHVuc2FmZUdsb2JhbCBhdCB0aGVcbiAgICAgICAgLy8gZXhwZW5zZSBvZiAndHlwZW9mJyBiZWluZyB3cm9uZyBmb3IgdGhvc2UgcHJvcGVydGllcy4gRm9yXG4gICAgICAgIC8vIGV4YW1wbGUsIGluIHRoZSBicm93c2VyLCBldmFsdWF0aW5nICdkb2N1bWVudCA9IDMnLCB3aWxsIGFkZFxuICAgICAgICAvLyBhIHByb3BlcnR5IHRvIHNhZmVHbG9iYWwgaW5zdGVhZCBvZiB0aHJvd2luZyBhXG4gICAgICAgIC8vIFJlZmVyZW5jZUVycm9yLlxuICAgICAgICBpZiAoXG4gICAgICAgICAgcHJvcCA9PT0gJ2V2YWwnIHx8XG4gICAgICAgICAgcHJvcCBpbiBlbmRvd21lbnRzIHx8XG4gICAgICAgICAgcHJvcCBpbiBzYWZlR2xvYmFsIHx8XG4gICAgICAgICAgcHJvcCBpbiB1bnNhZmVHbG9iYWxcbiAgICAgICAgKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9LFxuXG4gICAgICAvLyBub3RlOiB0aGlzIGlzIGxpa2VseSBhIGJ1ZyBvZiBzYWZhcmlcbiAgICAgIC8vIGh0dHBzOi8vYnVncy53ZWJraXQub3JnL3Nob3dfYnVnLmNnaT9pZD0xOTU1MzRcblxuICAgICAgZ2V0UHJvdG90eXBlT2YoKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBjb25zdCBidWlsZFNjb3BlSGFuZGxlclN0cmluZyA9IHNhZmVTdHJpbmdpZnlGdW5jdGlvbihidWlsZFNjb3BlSGFuZGxlcik7XG5cbiAgZnVuY3Rpb24gYnVpbGRTYWZlRXZhbCh1bnNhZmVSZWMsIHNhZmVFdmFsT3BlcmF0aW9uKSB7XG4gICAgY29uc3QgeyBjYWxsQW5kV3JhcEVycm9yIH0gPSB1bnNhZmVSZWM7XG5cbiAgICBjb25zdCB7IGRlZmluZVByb3BlcnRpZXMgfSA9IE9iamVjdDtcblxuICAgIC8vIFdlIHVzZSB0aGUgdGhlIGNvbmNpc2UgbWV0aG9kIHN5bnRheCB0byBjcmVhdGUgYW4gZXZhbCB3aXRob3V0IGFcbiAgICAvLyBbW0NvbnN0cnVjdF1dIGJlaGF2aW9yIChzdWNoIHRoYXQgdGhlIGludm9jYXRpb24gXCJuZXcgZXZhbCgpXCIgdGhyb3dzXG4gICAgLy8gVHlwZUVycm9yOiBldmFsIGlzIG5vdCBhIGNvbnN0cnVjdG9yXCIpLCBidXQgd2hpY2ggc3RpbGwgYWNjZXB0cyBhXG4gICAgLy8gJ3RoaXMnIGJpbmRpbmcuXG4gICAgY29uc3Qgc2FmZUV2YWwgPSB7XG4gICAgICBldmFsKCkge1xuICAgICAgICByZXR1cm4gY2FsbEFuZFdyYXBFcnJvcihzYWZlRXZhbE9wZXJhdGlvbiwgYXJndW1lbnRzKTtcbiAgICAgIH1cbiAgICB9LmV2YWw7XG5cbiAgICAvLyBzYWZlRXZhbCdzIHByb3RvdHlwZSBSb290UmVhbG0ncyB2YWx1ZSBhbmQgaW5zdGFuY2VvZiBGdW5jdGlvblxuICAgIC8vIGlzIHRydWUgaW5zaWRlIHRoZSByZWFsbS4gSXQgZG9lc24ndCBwb2ludCBhdCB0aGUgcHJpbWFsIHJlYWxtXG4gICAgLy8gdmFsdWUsIGFuZCB0aGVyZSBpcyBubyBkZWZlbnNlIGFnYWluc3QgbGVha2luZyBwcmltYWwgcmVhbG1cbiAgICAvLyBpbnRyaW5zaWNzLlxuXG4gICAgZGVmaW5lUHJvcGVydGllcyhzYWZlRXZhbCwge1xuICAgICAgdG9TdHJpbmc6IHtcbiAgICAgICAgLy8gV2UgYnJlYWsgdXAgdGhlIGZvbGxvd2luZyBsaXRlcmFsIHN0cmluZyBzbyB0aGF0IGFuXG4gICAgICAgIC8vIGFwcGFyZW50IGRpcmVjdCBldmFsIHN5bnRheCBkb2VzIG5vdCBhcHBlYXIgaW4gdGhpc1xuICAgICAgICAvLyBmaWxlLiBUaHVzLCB3ZSBhdm9pZCByZWplY3Rpb24gYnkgdGhlIG92ZXJseSBlYWdlclxuICAgICAgICAvLyByZWplY3REYW5nZXJvdXNTb3VyY2VzLlxuICAgICAgICB2YWx1ZTogKCkgPT4gYGZ1bmN0aW9uICR7J2V2YWwnfSgpIHsgW3NoaW0gY29kZV0gfWAsXG4gICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHNhZmVFdmFsO1xuICB9XG4gIGNvbnN0IGJ1aWxkU2FmZUV2YWxTdHJpbmcgPSBzYWZlU3RyaW5naWZ5RnVuY3Rpb24oYnVpbGRTYWZlRXZhbCk7XG5cbiAgZnVuY3Rpb24gYnVpbGRTYWZlRnVuY3Rpb24odW5zYWZlUmVjLCBzYWZlRnVuY3Rpb25PcGVyYXRpb24pIHtcbiAgICBjb25zdCB7IGNhbGxBbmRXcmFwRXJyb3IsIHVuc2FmZUZ1bmN0aW9uIH0gPSB1bnNhZmVSZWM7XG5cbiAgICBjb25zdCB7IGRlZmluZVByb3BlcnRpZXMgfSA9IE9iamVjdDtcblxuICAgIGNvbnN0IHNhZmVGdW5jdGlvbiA9IGZ1bmN0aW9uIEZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGNhbGxBbmRXcmFwRXJyb3Ioc2FmZUZ1bmN0aW9uT3BlcmF0aW9uLCBhcmd1bWVudHMpO1xuICAgIH07XG5cbiAgICAvLyBFbnN1cmUgdGhhdCBGdW5jdGlvbiBmcm9tIGFueSBjb21wYXJ0bWVudCBpbiBhIHJvb3QgcmVhbG0gY2FuIGJlIHVzZWRcbiAgICAvLyB3aXRoIGluc3RhbmNlIGNoZWNrcyBpbiBhbnkgY29tcGFydG1lbnQgb2YgdGhlIHNhbWUgcm9vdCByZWFsbS5cblxuICAgIGRlZmluZVByb3BlcnRpZXMoc2FmZUZ1bmN0aW9uLCB7XG4gICAgICAvLyBFbnN1cmUgdGhhdCBhbnkgZnVuY3Rpb24gY3JlYXRlZCBpbiBhbnkgY29tcGFydG1lbnQgaW4gYSByb290IHJlYWxtIGlzIGFuXG4gICAgICAvLyBpbnN0YW5jZSBvZiBGdW5jdGlvbiBpbiBhbnkgY29tcGFydG1lbnQgb2YgdGhlIHNhbWUgcm9vdCByYWxtLlxuICAgICAgcHJvdG90eXBlOiB7IHZhbHVlOiB1bnNhZmVGdW5jdGlvbi5wcm90b3R5cGUgfSxcblxuICAgICAgLy8gUHJvdmlkZSBhIGN1c3RvbSBvdXRwdXQgd2l0aG91dCBvdmVyd3JpdGluZyB0aGVcbiAgICAgIC8vIEZ1bmN0aW9uLnByb3RvdHlwZS50b1N0cmluZyB3aGljaCBpcyBjYWxsZWQgYnkgc29tZSB0aGlyZC1wYXJ0eVxuICAgICAgLy8gbGlicmFyaWVzLlxuICAgICAgdG9TdHJpbmc6IHtcbiAgICAgICAgdmFsdWU6ICgpID0+ICdmdW5jdGlvbiBGdW5jdGlvbigpIHsgW3NoaW0gY29kZV0gfScsXG4gICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHNhZmVGdW5jdGlvbjtcbiAgfVxuICBjb25zdCBidWlsZFNhZmVGdW5jdGlvblN0cmluZyA9IHNhZmVTdHJpbmdpZnlGdW5jdGlvbihidWlsZFNhZmVGdW5jdGlvbik7XG5cbiAgZnVuY3Rpb24gYXBwbHlUcmFuc2Zvcm1zKHJld3JpdGVyU3RhdGUsIHRyYW5zZm9ybXMpIHtcbiAgICBjb25zdCB7IGNyZWF0ZSwgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyB9ID0gT2JqZWN0O1xuICAgIGNvbnN0IHsgYXBwbHkgfSA9IFJlZmxlY3Q7XG4gICAgY29uc3QgdW5jdXJyeVRoaXMgPSBmbiA9PiAodGhpc0FyZywgLi4uYXJncykgPT4gYXBwbHkoZm4sIHRoaXNBcmcsIGFyZ3MpO1xuICAgIGNvbnN0IGFycmF5UmVkdWNlID0gdW5jdXJyeVRoaXMoQXJyYXkucHJvdG90eXBlLnJlZHVjZSk7XG5cbiAgICAvLyBDbG9uZSBiZWZvcmUgY2FsbGluZyB0cmFuc2Zvcm1zLlxuICAgIHJld3JpdGVyU3RhdGUgPSB7XG4gICAgICBzcmM6IGAke3Jld3JpdGVyU3RhdGUuc3JjfWAsXG4gICAgICBlbmRvd21lbnRzOiBjcmVhdGUoXG4gICAgICAgIG51bGwsXG4gICAgICAgIGdldE93blByb3BlcnR5RGVzY3JpcHRvcnMocmV3cml0ZXJTdGF0ZS5lbmRvd21lbnRzKVxuICAgICAgKVxuICAgIH07XG5cbiAgICAvLyBSZXdyaXRlIHRoZSBzb3VyY2UsIHRocmVhZGluZyB0aHJvdWdoIHJld3JpdGVyIHN0YXRlIGFzIG5lY2Vzc2FyeS5cbiAgICByZXdyaXRlclN0YXRlID0gYXJyYXlSZWR1Y2UoXG4gICAgICB0cmFuc2Zvcm1zLFxuICAgICAgKHJzLCB0cmFuc2Zvcm0pID0+ICh0cmFuc2Zvcm0ucmV3cml0ZSA/IHRyYW5zZm9ybS5yZXdyaXRlKHJzKSA6IHJzKSxcbiAgICAgIHJld3JpdGVyU3RhdGVcbiAgICApO1xuXG4gICAgLy8gQ2xvbmUgYWZ0ZXIgdHJhbnNmb3Jtc1xuICAgIHJld3JpdGVyU3RhdGUgPSB7XG4gICAgICBzcmM6IGAke3Jld3JpdGVyU3RhdGUuc3JjfWAsXG4gICAgICBlbmRvd21lbnRzOiBjcmVhdGUoXG4gICAgICAgIG51bGwsXG4gICAgICAgIGdldE93blByb3BlcnR5RGVzY3JpcHRvcnMocmV3cml0ZXJTdGF0ZS5lbmRvd21lbnRzKVxuICAgICAgKVxuICAgIH07XG5cbiAgICByZXR1cm4gcmV3cml0ZXJTdGF0ZTtcbiAgfVxuXG4gIGNvbnN0IGFwcGx5VHJhbnNmb3Jtc1N0cmluZyA9IHNhZmVTdHJpbmdpZnlGdW5jdGlvbihhcHBseVRyYW5zZm9ybXMpO1xuXG4gIC8vIGh0dHBzOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOS4wL2luZGV4Lmh0bWwjc2VjLWh0bWwtbGlrZS1jb21tZW50c1xuICAvLyBleHBsYWlucyB0aGF0IEphdmFTY3JpcHQgcGFyc2VycyBtYXkgb3IgbWF5IG5vdCByZWNvZ25pemUgaHRtbFxuICAvLyBjb21tZW50IHRva2VucyBcIjxcIiBpbW1lZGlhdGVseSBmb2xsb3dlZCBieSBcIiEtLVwiIGFuZCBcIi0tXCJcbiAgLy8gaW1tZWRpYXRlbHkgZm9sbG93ZWQgYnkgXCI+XCIgaW4gbm9uLW1vZHVsZSBzb3VyY2UgdGV4dCwgYW5kIHRyZWF0XG4gIC8vIHRoZW0gYXMgYSBraW5kIG9mIGxpbmUgY29tbWVudC4gU2luY2Ugb3RoZXJ3aXNlIGJvdGggb2YgdGhlc2UgY2FuXG4gIC8vIGFwcGVhciBpbiBub3JtYWwgSmF2YVNjcmlwdCBzb3VyY2UgY29kZSBhcyBhIHNlcXVlbmNlIG9mIG9wZXJhdG9ycyxcbiAgLy8gd2UgaGF2ZSB0aGUgdGVycmlmeWluZyBwb3NzaWJpbGl0eSBvZiB0aGUgc2FtZSBzb3VyY2UgY29kZSBwYXJzaW5nXG4gIC8vIG9uZSB3YXkgb24gb25lIGNvcnJlY3QgSmF2YVNjcmlwdCBpbXBsZW1lbnRhdGlvbiwgYW5kIGFub3RoZXIgd2F5XG4gIC8vIG9uIGFub3RoZXIuXG4gIC8vXG4gIC8vIFRoaXMgc2hpbSB0YWtlcyB0aGUgY29uc2VydmF0aXZlIHN0cmF0ZWd5IG9mIGp1c3QgcmVqZWN0aW5nIHNvdXJjZVxuICAvLyB0ZXh0IHRoYXQgY29udGFpbnMgdGhlc2Ugc3RyaW5ncyBhbnl3aGVyZS4gTm90ZSB0aGF0IHRoaXMgdmVyeVxuICAvLyBzb3VyY2UgZmlsZSBpcyB3cml0dGVuIHN0cmFuZ2VseSB0byBhdm9pZCBtZW50aW9uaW5nIHRoZXNlXG4gIC8vIGNoYXJhY3RlciBzdHJpbmdzIGV4cGxpY2l0bHkuXG5cbiAgLy8gV2UgZG8gbm90IHdyaXRlIHRoZSByZWdleHAgaW4gYSBzdHJhaWdodGZvcndhcmQgd2F5LCBzbyB0aGF0IGFuXG4gIC8vIGFwcGFyZW5udCBodG1sIGNvbW1lbnQgZG9lcyBub3QgYXBwZWFyIGluIHRoaXMgZmlsZS4gVGh1cywgd2UgYXZvaWRcbiAgLy8gcmVqZWN0aW9uIGJ5IHRoZSBvdmVybHkgZWFnZXIgcmVqZWN0RGFuZ2Vyb3VzU291cmNlcy5cbiAgY29uc3QgaHRtbENvbW1lbnRQYXR0ZXJuID0gbmV3IFJlZ0V4cChgKD86JHsnPCd9IS0tfC0tJHsnPid9KWApO1xuXG4gIGZ1bmN0aW9uIHJlamVjdEh0bWxDb21tZW50cyhzKSB7XG4gICAgY29uc3QgaW5kZXggPSBzLnNlYXJjaChodG1sQ29tbWVudFBhdHRlcm4pO1xuICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgIGNvbnN0IGxpbmVudW0gPSBzLnNsaWNlKDAsIGluZGV4KS5zcGxpdCgnXFxuJykubGVuZ3RoOyAvLyBtb3JlIG9yIGxlc3NcbiAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgICAgYHBvc3NpYmxlIGh0bWwgY29tbWVudCBzeW50YXggcmVqZWN0ZWQgYXJvdW5kIGxpbmUgJHtsaW5lbnVtfWBcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgLy8gVGhlIHByb3Bvc2VkIGR5bmFtaWMgaW1wb3J0IGV4cHJlc3Npb24gaXMgdGhlIG9ubHkgc3ludGF4IGN1cnJlbnRseVxuICAvLyBwcm9wb3NlZCwgdGhhdCBjYW4gYXBwZWFyIGluIG5vbi1tb2R1bGUgSmF2YVNjcmlwdCBjb2RlLCB0aGF0XG4gIC8vIGVuYWJsZXMgZGlyZWN0IGFjY2VzcyB0byB0aGUgb3V0c2lkZSB3b3JsZCB0aGF0IGNhbm5vdCBiZVxuICAvLyBzdXJwcmVzc2VkIG9yIGludGVyY2VwdGVkIHdpdGhvdXQgcGFyc2luZyBhbmQgcmV3cml0aW5nLiBJbnN0ZWFkLFxuICAvLyB0aGlzIHNoaW0gY29uc2VydmF0aXZlbHkgcmVqZWN0cyBhbnkgc291cmNlIHRleHQgdGhhdCBzZWVtcyB0b1xuICAvLyBjb250YWluIHN1Y2ggYW4gZXhwcmVzc2lvbi4gVG8gZG8gdGhpcyBzYWZlbHkgd2l0aG91dCBwYXJzaW5nLCB3ZVxuICAvLyBtdXN0IGFsc28gcmVqZWN0IHNvbWUgdmFsaWQgcHJvZ3JhbXMsIGkuZS4sIHRob3NlIGNvbnRhaW5pbmdcbiAgLy8gYXBwYXJlbnQgaW1wb3J0IGV4cHJlc3Npb25zIGluIGxpdGVyYWwgc3RyaW5ncyBvciBjb21tZW50cy5cblxuICAvLyBUaGUgY3VycmVudCBjb25zZXJ2YXRpdmUgcnVsZSBsb29rcyBmb3IgdGhlIGlkZW50aWZpZXIgXCJpbXBvcnRcIlxuICAvLyBmb2xsb3dlZCBieSBlaXRoZXIgYW4gb3BlbiBwYXJlbiBvciBzb21ldGhpbmcgdGhhdCBsb29rcyBsaWtlIHRoZVxuICAvLyBiZWdpbm5pbmcgb2YgYSBjb21tZW50LiBXZSBhc3N1bWUgdGhhdCB3ZSBkbyBub3QgbmVlZCB0byB3b3JyeVxuICAvLyBhYm91dCBodG1sIGNvbW1lbnQgc3ludGF4IGJlY2F1c2UgdGhhdCB3YXMgYWxyZWFkeSByZWplY3RlZCBieVxuICAvLyByZWplY3RIdG1sQ29tbWVudHMuXG5cbiAgLy8gdGhpcyBcXHMgKm11c3QqIG1hdGNoIGFsbCBraW5kcyBvZiBzeW50YXgtZGVmaW5lZCB3aGl0ZXNwYWNlLiBJZiBlLmcuXG4gIC8vIFUrMjAyOCAoTElORSBTRVBBUkFUT1IpIG9yIFUrMjAyOSAoUEFSQUdSQVBIIFNFUEFSQVRPUikgaXMgdHJlYXRlZCBhc1xuICAvLyB3aGl0ZXNwYWNlIGJ5IHRoZSBwYXJzZXIsIGJ1dCBub3QgbWF0Y2hlZCBieSAvXFxzLywgdGhlbiB0aGlzIHdvdWxkIGFkbWl0XG4gIC8vIGFuIGF0dGFjayBsaWtlOiBpbXBvcnRcXHUyMDI4KCdwb3dlci5qcycpIC4gV2UncmUgdHJ5aW5nIHRvIGRpc3Rpbmd1aXNoXG4gIC8vIHNvbWV0aGluZyBsaWtlIHRoYXQgZnJvbSBzb21ldGhpbmcgbGlrZSBpbXBvcnRub3RyZWFsbHkoJ3Bvd2VyLmpzJykgd2hpY2hcbiAgLy8gaXMgcGVyZmVjdGx5IHNhZmUuXG5cbiAgY29uc3QgaW1wb3J0UGF0dGVybiA9IC9cXGJpbXBvcnRcXHMqKD86XFwofFxcL1svKl0pLztcblxuICBmdW5jdGlvbiByZWplY3RJbXBvcnRFeHByZXNzaW9ucyhzKSB7XG4gICAgY29uc3QgaW5kZXggPSBzLnNlYXJjaChpbXBvcnRQYXR0ZXJuKTtcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICBjb25zdCBsaW5lbnVtID0gcy5zbGljZSgwLCBpbmRleCkuc3BsaXQoJ1xcbicpLmxlbmd0aDsgLy8gbW9yZSBvciBsZXNzXG4gICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICAgIGBwb3NzaWJsZSBpbXBvcnQgZXhwcmVzc2lvbiByZWplY3RlZCBhcm91bmQgbGluZSAke2xpbmVudW19YFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICAvLyBUaGUgc2hpbSBjYW5ub3QgY29ycmVjdGx5IGVtdWxhdGUgYSBkaXJlY3QgZXZhbCBhcyBleHBsYWluZWQgYXRcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL0Fnb3JpYy9yZWFsbXMtc2hpbS9pc3N1ZXMvMTJcbiAgLy8gV2l0aG91dCByZWplY3RpbmcgYXBwYXJlbnQgZGlyZWN0IGV2YWwgc3ludGF4LCB3ZSB3b3VsZFxuICAvLyBhY2NpZGVudGFsbHkgZXZhbHVhdGUgdGhlc2Ugd2l0aCBhbiBlbXVsYXRpb24gb2YgaW5kaXJlY3QgZXZhbC4gVHBcbiAgLy8gcHJldmVudCBmdXR1cmUgY29tcGF0aWJpbGl0eSBwcm9ibGVtcywgaW4gc2hpZnRpbmcgZnJvbSB1c2Ugb2YgdGhlXG4gIC8vIHNoaW0gdG8gZ2VudWluZSBwbGF0Zm9ybSBzdXBwb3J0IGZvciB0aGUgcHJvcG9zYWwsIHdlIHNob3VsZFxuICAvLyBpbnN0ZWFkIHN0YXRpY2FsbHkgcmVqZWN0IGNvZGUgdGhhdCBzZWVtcyB0byBjb250YWluIGEgZGlyZWN0IGV2YWxcbiAgLy8gZXhwcmVzc2lvbi5cbiAgLy9cbiAgLy8gQXMgd2l0aCB0aGUgZHluYW1pYyBpbXBvcnQgZXhwcmVzc2lvbiwgdG8gYXZvaWQgYSBmdWxsIHBhcnNlLCB3ZSBkb1xuICAvLyB0aGlzIGFwcHJveGltYXRlbHkgd2l0aCBhIHJlZ2V4cCwgdGhhdCB3aWxsIGFsc28gcmVqZWN0IHN0cmluZ3NcbiAgLy8gdGhhdCBhcHBlYXIgc2FmZWx5IGluIGNvbW1lbnRzIG9yIHN0cmluZ3MuIFVubGlrZSBkeW5hbWljIGltcG9ydCxcbiAgLy8gaWYgd2UgbWlzcyBzb21lLCB0aGlzIG9ubHkgY3JlYXRlcyBmdXR1cmUgY29tcGF0IHByb2JsZW1zLCBub3RcbiAgLy8gc2VjdXJpdHkgcHJvYmxlbXMuIFRodXMsIHdlIGFyZSBvbmx5IHRyeWluZyB0byBjYXRjaCBpbm5vY2VudFxuICAvLyBvY2N1cnJlbmNlcywgbm90IG1hbGljaW91cyBvbmUuIEluIHBhcnRpY3VsYXIsIGAoZXZhbCkoLi4uKWAgaXNcbiAgLy8gZGlyZWN0IGV2YWwgc3ludGF4IHRoYXQgd291bGQgbm90IGJlIGNhdWdodCBieSB0aGUgZm9sbG93aW5nIHJlZ2V4cC5cblxuICBjb25zdCBzb21lRGlyZWN0RXZhbFBhdHRlcm4gPSAvXFxiZXZhbFxccyooPzpcXCh8XFwvWy8qXSkvO1xuXG4gIGZ1bmN0aW9uIHJlamVjdFNvbWVEaXJlY3RFdmFsRXhwcmVzc2lvbnMocykge1xuICAgIGNvbnN0IGluZGV4ID0gcy5zZWFyY2goc29tZURpcmVjdEV2YWxQYXR0ZXJuKTtcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICBjb25zdCBsaW5lbnVtID0gcy5zbGljZSgwLCBpbmRleCkuc3BsaXQoJ1xcbicpLmxlbmd0aDsgLy8gbW9yZSBvciBsZXNzXG4gICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICAgIGBwb3NzaWJsZSBkaXJlY3QgZXZhbCBleHByZXNzaW9uIHJlamVjdGVkIGFyb3VuZCBsaW5lICR7bGluZW51bX1gXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlamVjdERhbmdlcm91c1NvdXJjZXMocykge1xuICAgIHJlamVjdEh0bWxDb21tZW50cyhzKTtcbiAgICByZWplY3RJbXBvcnRFeHByZXNzaW9ucyhzKTtcbiAgICByZWplY3RTb21lRGlyZWN0RXZhbEV4cHJlc3Npb25zKHMpO1xuICB9XG5cbiAgLy8gRXhwb3J0IGEgcmV3cml0ZXIgdHJhbnNmb3JtLlxuICBjb25zdCByZWplY3REYW5nZXJvdXNTb3VyY2VzVHJhbnNmb3JtID0ge1xuICAgIHJld3JpdGUocnMpIHtcbiAgICAgIHJlamVjdERhbmdlcm91c1NvdXJjZXMocnMuc3JjKTtcbiAgICAgIHJldHVybiBycztcbiAgICB9XG4gIH07XG5cbiAgLy8gUG9ydGlvbnMgYWRhcHRlZCBmcm9tIFY4IC0gQ29weXJpZ2h0IDIwMTYgdGhlIFY4IHByb2plY3QgYXV0aG9ycy5cblxuICBmdW5jdGlvbiBidWlsZE9wdGltaXplcihjb25zdGFudHMpIHtcbiAgICAvLyBObyBuZWVkIHRvIGJ1aWxkIGFuIG9wcmltaXplciB3aGVuIHRoZXJlIGFyZSBubyBjb25zdGFudHMuXG4gICAgaWYgKGNvbnN0YW50cy5sZW5ndGggPT09IDApIHJldHVybiAnJztcbiAgICAvLyBVc2UgJ3RoaXMnIHRvIGF2b2lkIGdvaW5nIHRocm91Z2ggdGhlIHNjb3BlIHByb3h5LCB3aGljaCBpcyB1bmVjZXNzYXJ5XG4gICAgLy8gc2luY2UgdGhlIG9wdGltaXplciBvbmx5IG5lZWRzIHJlZmVyZW5jZXMgdG8gdGhlIHNhZmUgZ2xvYmFsLlxuICAgIHJldHVybiBgY29uc3QgeyR7YXJyYXlKb2luKGNvbnN0YW50cywgJywnKX19ID0gdGhpcztgO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlU2NvcGVkRXZhbHVhdG9yRmFjdG9yeSh1bnNhZmVSZWMsIGNvbnN0YW50cykge1xuICAgIGNvbnN0IHsgdW5zYWZlRnVuY3Rpb24gfSA9IHVuc2FmZVJlYztcblxuICAgIGNvbnN0IG9wdGltaXplciA9IGJ1aWxkT3B0aW1pemVyKGNvbnN0YW50cyk7XG5cbiAgICAvLyBDcmVhdGUgYSBmdW5jdGlvbiBpbiBzbG9wcHkgbW9kZSwgc28gdGhhdCB3ZSBjYW4gdXNlICd3aXRoJy4gSXQgcmV0dXJuc1xuICAgIC8vIGEgZnVuY3Rpb24gaW4gc3RyaWN0IG1vZGUgdGhhdCBldmFsdWF0ZXMgdGhlIHByb3ZpZGVkIGNvZGUgdXNpbmcgZGlyZWN0XG4gICAgLy8gZXZhbCwgYW5kIHRodXMgaW4gc3RyaWN0IG1vZGUgaW4gdGhlIHNhbWUgc2NvcGUuIFdlIG11c3QgYmUgdmVyeSBjYXJlZnVsXG4gICAgLy8gdG8gbm90IGNyZWF0ZSBuZXcgbmFtZXMgaW4gdGhpcyBzY29wZVxuXG4gICAgLy8gMTogd2UgdXNlICd3aXRoJyAoYXJvdW5kIGEgUHJveHkpIHRvIGNhdGNoIGFsbCBmcmVlIHZhcmlhYmxlIG5hbWVzLiBUaGVcbiAgICAvLyBmaXJzdCAnYXJndW1lbnRzWzBdJyBob2xkcyB0aGUgUHJveHkgd2hpY2ggc2FmZWx5IHdyYXBzIHRoZSBzYWZlR2xvYmFsXG4gICAgLy8gMjogJ29wdGltaXplcicgY2F0Y2hlcyBjb21tb24gdmFyaWFibGUgbmFtZXMgZm9yIHNwZWVkXG4gICAgLy8gMzogVGhlIGlubmVyIHN0cmljdCBmdW5jdGlvbiBpcyBlZmZlY3RpdmVseSBwYXNzZWQgdHdvIHBhcmFtZXRlcnM6XG4gICAgLy8gICAgYSkgaXRzIGFyZ3VtZW50c1swXSBpcyB0aGUgc291cmNlIHRvIGJlIGRpcmVjdGx5IGV2YWx1YXRlZC5cbiAgICAvLyAgICBiKSBpdHMgJ3RoaXMnIGlzIHRoZSB0aGlzIGJpbmRpbmcgc2VlbiBieSB0aGUgY29kZSBiZWluZ1xuICAgIC8vICAgICAgIGRpcmVjdGx5IGV2YWx1YXRlZC5cblxuICAgIC8vIGV2ZXJ5dGhpbmcgaW4gdGhlICdvcHRpbWl6ZXInIHN0cmluZyBpcyBsb29rZWQgdXAgaW4gdGhlIHByb3h5XG4gICAgLy8gKGluY2x1ZGluZyBhbiAnYXJndW1lbnRzWzBdJywgd2hpY2ggcG9pbnRzIGF0IHRoZSBQcm94eSkuICdmdW5jdGlvbicgaXNcbiAgICAvLyBhIGtleXdvcmQsIG5vdCBhIHZhcmlhYmxlLCBzbyBpdCBpcyBub3QgbG9va2VkIHVwLiB0aGVuICdldmFsJyBpcyBsb29rZWRcbiAgICAvLyB1cCBpbiB0aGUgcHJveHksIHRoYXQncyB0aGUgZmlyc3QgdGltZSBpdCBpcyBsb29rZWQgdXAgYWZ0ZXJcbiAgICAvLyB1c2VVbnNhZmVFdmFsdWF0b3IgaXMgdHVybmVkIG9uLCBzbyB0aGUgcHJveHkgcmV0dXJucyB0aGUgcmVhbCB0aGVcbiAgICAvLyB1bnNhZmVFdmFsLCB3aGljaCBzYXRpc2ZpZXMgdGhlIElzRGlyZWN0RXZhbFRyYXAgcHJlZGljYXRlLCBzbyBpdCB1c2VzXG4gICAgLy8gdGhlIGRpcmVjdCBldmFsIGFuZCBnZXRzIHRoZSBsZXhpY2FsIHNjb3BlLiBUaGUgc2Vjb25kICdhcmd1bWVudHNbMF0nIGlzXG4gICAgLy8gbG9va2VkIHVwIGluIHRoZSBjb250ZXh0IG9mIHRoZSBpbm5lciBmdW5jdGlvbi4gVGhlICpjb250ZW50cyogb2ZcbiAgICAvLyBhcmd1bWVudHNbMF0sIGJlY2F1c2Ugd2UncmUgdXNpbmcgZGlyZWN0IGV2YWwsIGFyZSBsb29rZWQgdXAgaW4gdGhlXG4gICAgLy8gUHJveHksIGJ5IHdoaWNoIHBvaW50IHRoZSB1c2VVbnNhZmVFdmFsdWF0b3Igc3dpdGNoIGhhcyBiZWVuIGZsaXBwZWRcbiAgICAvLyBiYWNrIHRvICdmYWxzZScsIHNvIGFueSBpbnN0YW5jZXMgb2YgJ2V2YWwnIGluIHRoYXQgc3RyaW5nIHdpbGwgZ2V0IHRoZVxuICAgIC8vIHNhZmUgZXZhbHVhdG9yLlxuXG4gICAgcmV0dXJuIHVuc2FmZUZ1bmN0aW9uKGBcbiAgICB3aXRoIChhcmd1bWVudHNbMF0pIHtcbiAgICAgICR7b3B0aW1pemVyfVxuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAndXNlIHN0cmljdCc7XG4gICAgICAgIHJldHVybiBldmFsKGFyZ3VtZW50c1swXSk7XG4gICAgICB9O1xuICAgIH1cbiAgYCk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVTYWZlRXZhbHVhdG9yRmFjdG9yeShcbiAgICB1bnNhZmVSZWMsXG4gICAgc2FmZUdsb2JhbCxcbiAgICB0cmFuc2Zvcm1zLFxuICAgIHNsb3BweUdsb2JhbHNcbiAgKSB7XG4gICAgY29uc3QgeyB1bnNhZmVFdmFsIH0gPSB1bnNhZmVSZWM7XG4gICAgY29uc3QgYXBwbHlUcmFuc2Zvcm1zID0gdW5zYWZlRXZhbChhcHBseVRyYW5zZm9ybXNTdHJpbmcpO1xuXG4gICAgZnVuY3Rpb24gZmFjdG9yeShlbmRvd21lbnRzID0ge30sIG9wdGlvbnMgPSB7fSkge1xuICAgICAgLy8gdG9kbyBjbG9uZSBhbGwgYXJndW1lbnRzIHBhc3NlZCB0byByZXR1cm5lZCBmdW5jdGlvblxuICAgICAgY29uc3QgbG9jYWxUcmFuc2Zvcm1zID0gb3B0aW9ucy50cmFuc2Zvcm1zIHx8IFtdO1xuICAgICAgY29uc3QgcmVhbG1UcmFuc2Zvcm1zID0gdHJhbnNmb3JtcyB8fCBbXTtcblxuICAgICAgY29uc3QgbWFuZGF0b3J5VHJhbnNmb3JtcyA9IFtyZWplY3REYW5nZXJvdXNTb3VyY2VzVHJhbnNmb3JtXTtcbiAgICAgIGNvbnN0IGFsbFRyYW5zZm9ybXMgPSBhcnJheUNvbmNhdChcbiAgICAgICAgbG9jYWxUcmFuc2Zvcm1zLFxuICAgICAgICByZWFsbVRyYW5zZm9ybXMsXG4gICAgICAgIG1hbmRhdG9yeVRyYW5zZm9ybXNcbiAgICAgICk7XG5cbiAgICAgIGZ1bmN0aW9uIHNhZmVFdmFsT3BlcmF0aW9uKHNyYykge1xuICAgICAgICBsZXQgcmV3cml0ZXJTdGF0ZSA9IHsgc3JjLCBlbmRvd21lbnRzIH07XG4gICAgICAgIHJld3JpdGVyU3RhdGUgPSBhcHBseVRyYW5zZm9ybXMocmV3cml0ZXJTdGF0ZSwgYWxsVHJhbnNmb3Jtcyk7XG5cbiAgICAgICAgLy8gQ29tYmluZSBhbGwgb3B0aW1pemFibGUgZ2xvYmFscy5cbiAgICAgICAgY29uc3QgZ2xvYmFsQ29uc3RhbnRzID0gZ2V0T3B0aW1pemFibGVHbG9iYWxzKFxuICAgICAgICAgIHNhZmVHbG9iYWwsXG4gICAgICAgICAgcmV3cml0ZXJTdGF0ZS5lbmRvd21lbnRzXG4gICAgICAgICk7XG4gICAgICAgIGNvbnN0IGxvY2FsQ29uc3RhbnRzID0gZ2V0T3B0aW1pemFibGVHbG9iYWxzKHJld3JpdGVyU3RhdGUuZW5kb3dtZW50cyk7XG4gICAgICAgIGNvbnN0IGNvbnN0YW50cyA9IGFycmF5Q29uY2F0KGdsb2JhbENvbnN0YW50cywgbG9jYWxDb25zdGFudHMpO1xuXG4gICAgICAgIGNvbnN0IHNjb3BlZEV2YWx1YXRvckZhY3RvcnkgPSBjcmVhdGVTY29wZWRFdmFsdWF0b3JGYWN0b3J5KFxuICAgICAgICAgIHVuc2FmZVJlYyxcbiAgICAgICAgICBjb25zdGFudHNcbiAgICAgICAgKTtcblxuICAgICAgICBjb25zdCBzY29wZUhhbmRsZXIgPSB1bnNhZmVFdmFsKGJ1aWxkU2NvcGVIYW5kbGVyU3RyaW5nKShcbiAgICAgICAgICB1bnNhZmVSZWMsXG4gICAgICAgICAgc2FmZUdsb2JhbCxcbiAgICAgICAgICByZXdyaXRlclN0YXRlLmVuZG93bWVudHMsXG4gICAgICAgICAgc2xvcHB5R2xvYmFsc1xuICAgICAgICApO1xuICAgICAgICBjb25zdCBzY29wZVByb3h5UmV2b2NhYmxlID0gUHJveHkucmV2b2NhYmxlKHt9LCBzY29wZUhhbmRsZXIpO1xuICAgICAgICBjb25zdCBzY29wZVByb3h5ID0gc2NvcGVQcm94eVJldm9jYWJsZS5wcm94eTtcbiAgICAgICAgY29uc3Qgc2NvcGVkRXZhbHVhdG9yID0gYXBwbHkoc2NvcGVkRXZhbHVhdG9yRmFjdG9yeSwgc2FmZUdsb2JhbCwgW1xuICAgICAgICAgIHNjb3BlUHJveHlcbiAgICAgICAgXSk7XG5cbiAgICAgICAgc2NvcGVIYW5kbGVyLnVzZVVuc2FmZUV2YWx1YXRvciA9IHRydWU7XG4gICAgICAgIGxldCBlcnI7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gRW5zdXJlIHRoYXQgXCJ0aGlzXCIgcmVzb2x2ZXMgdG8gdGhlIHNhZmUgZ2xvYmFsLlxuICAgICAgICAgIHJldHVybiBhcHBseShzY29wZWRFdmFsdWF0b3IsIHNhZmVHbG9iYWwsIFtyZXdyaXRlclN0YXRlLnNyY10pO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgLy8gc3Rhc2ggdGhlIGNoaWxkLWNvZGUgZXJyb3IgaW4gaG9wZXMgb2YgZGVidWdnaW5nIHRoZSBpbnRlcm5hbCBmYWlsdXJlXG4gICAgICAgICAgZXJyID0gZTtcbiAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgIGlmIChzY29wZUhhbmRsZXIudXNlVW5zYWZlRXZhbHVhdG9yKSB7XG4gICAgICAgICAgICAvLyB0aGUgcHJveHkgc3dpdGNoZXMgdGhpcyBvZmYgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhzXG4gICAgICAgICAgICAvLyBmaXJzdCBhY2Nlc3MsIGJ1dCBpZiB0aGF0J3Mgbm90IHRoZSBjYXNlIHdlIHByZXZlbnRcbiAgICAgICAgICAgIC8vIGZ1cnRoZXIgdmFyaWFibGUgcmVzb2x1dGlvbiBvbiB0aGUgc2NvcGUgYW5kIGFib3J0LlxuICAgICAgICAgICAgc2NvcGVQcm94eVJldm9jYWJsZS5yZXZva2UoKTtcbiAgICAgICAgICAgIHRocm93VGFudHJ1bSgnaGFuZGxlciBkaWQgbm90IHJldm9rZSB1c2VVbnNhZmVFdmFsdWF0b3InLCBlcnIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gc2FmZUV2YWxPcGVyYXRpb247XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhY3Rvcnk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVTYWZlRXZhbHVhdG9yKHVuc2FmZVJlYywgc2FmZUV2YWxPcGVyYXRpb24pIHtcbiAgICBjb25zdCB7IHVuc2FmZUV2YWwsIHVuc2FmZUZ1bmN0aW9uIH0gPSB1bnNhZmVSZWM7XG5cbiAgICBjb25zdCBzYWZlRXZhbCA9IHVuc2FmZUV2YWwoYnVpbGRTYWZlRXZhbFN0cmluZykoXG4gICAgICB1bnNhZmVSZWMsXG4gICAgICBzYWZlRXZhbE9wZXJhdGlvblxuICAgICk7XG5cbiAgICBhc3NlcnQoZ2V0UHJvdG90eXBlT2Yoc2FmZUV2YWwpLmNvbnN0cnVjdG9yICE9PSBGdW5jdGlvbiwgJ2hpZGUgRnVuY3Rpb24nKTtcbiAgICBhc3NlcnQoXG4gICAgICBnZXRQcm90b3R5cGVPZihzYWZlRXZhbCkuY29uc3RydWN0b3IgIT09IHVuc2FmZUZ1bmN0aW9uLFxuICAgICAgJ2hpZGUgdW5zYWZlRnVuY3Rpb24nXG4gICAgKTtcblxuICAgIHJldHVybiBzYWZlRXZhbDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVNhZmVFdmFsdWF0b3JXaGljaFRha2VzRW5kb3dtZW50cyhzYWZlRXZhbHVhdG9yRmFjdG9yeSkge1xuICAgIHJldHVybiAoeCwgZW5kb3dtZW50cywgb3B0aW9ucyA9IHt9KSA9PlxuICAgICAgc2FmZUV2YWx1YXRvckZhY3RvcnkoZW5kb3dtZW50cywgb3B0aW9ucykoeCk7XG4gIH1cblxuICAvKipcbiAgICogQSBzYWZlIHZlcnNpb24gb2YgdGhlIG5hdGl2ZSBGdW5jdGlvbiB3aGljaCByZWxpZXMgb25cbiAgICogdGhlIHNhZmV0eSBvZiBldmFsRXZhbHVhdG9yIGZvciBjb25maW5lbWVudC5cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZUZ1bmN0aW9uRXZhbHVhdG9yKHVuc2FmZVJlYywgc2FmZUV2YWxPcGVyYXRpb24pIHtcbiAgICBjb25zdCB7IHVuc2FmZUdsb2JhbCwgdW5zYWZlRXZhbCwgdW5zYWZlRnVuY3Rpb24gfSA9IHVuc2FmZVJlYztcblxuICAgIGZ1bmN0aW9uIHNhZmVGdW5jdGlvbk9wZXJhdGlvbiguLi5wYXJhbXMpIHtcbiAgICAgIGNvbnN0IGZ1bmN0aW9uQm9keSA9IGAke2FycmF5UG9wKHBhcmFtcykgfHwgJyd9YDtcbiAgICAgIGxldCBmdW5jdGlvblBhcmFtcyA9IGAke2FycmF5Sm9pbihwYXJhbXMsICcsJyl9YDtcbiAgICAgIGlmICghcmVnZXhwVGVzdCgvXltcXHdcXHMsXSokLywgZnVuY3Rpb25QYXJhbXMpKSB7XG4gICAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgICAgICAnc2hpbSBsaW1pdGF0aW9uOiBGdW5jdGlvbiBhcmcgbXVzdCBiZSBzaW1wbGUgQVNDSUkgaWRlbnRpZmllcnMsIHBvc3NpYmx5IHNlcGFyYXRlZCBieSBjb21tYXM6IG5vIGRlZmF1bHQgdmFsdWVzLCBwYXR0ZXJuIG1hdGNoZXMsIG9yIG5vbi1BU0NJSSBwYXJhbWV0ZXIgbmFtZXMnXG4gICAgICAgICk7XG4gICAgICAgIC8vIHRoaXMgcHJvdGVjdHMgYWdhaW5zdCBNYXR0IEF1c3RpbidzIGNsZXZlciBhdHRhY2s6XG4gICAgICAgIC8vIEZ1bmN0aW9uKFwiYXJnPWBcIiwgXCIvKmJvZHlgKXt9KTsoe3g6IHRoaXMvKiovXCIpXG4gICAgICAgIC8vIHdoaWNoIHdvdWxkIHR1cm4gaW50b1xuICAgICAgICAvLyAgICAgKGZ1bmN0aW9uKGFyZz1gXG4gICAgICAgIC8vICAgICAvKmBgKi8pe1xuICAgICAgICAvLyAgICAgIC8qYm9keWApe30pOyh7eDogdGhpcy8qKi9cbiAgICAgICAgLy8gICAgIH0pXG4gICAgICAgIC8vIHdoaWNoIHBhcnNlcyBhcyBhIGRlZmF1bHQgYXJndW1lbnQgb2YgYFxcbi8qYGAqLyl7XFxuLypib2R5YCAsIHdoaWNoXG4gICAgICAgIC8vIGlzIGEgcGFpciBvZiB0ZW1wbGF0ZSBsaXRlcmFscyBiYWNrLXRvLWJhY2sgKHNvIHRoZSBmaXJzdCBvbmVcbiAgICAgICAgLy8gbm9taW5hbGx5IGV2YWx1YXRlcyB0byB0aGUgcGFyc2VyIHRvIHVzZSBvbiB0aGUgc2Vjb25kIG9uZSksIHdoaWNoXG4gICAgICAgIC8vIGNhbid0IGFjdHVhbGx5IGV4ZWN1dGUgKGJlY2F1c2UgdGhlIGZpcnN0IGxpdGVyYWwgZXZhbHMgdG8gYSBzdHJpbmcsXG4gICAgICAgIC8vIHdoaWNoIGNhbid0IGJlIGEgcGFyc2VyIGZ1bmN0aW9uKSwgYnV0IHRoYXQgZG9lc24ndCBtYXR0ZXIgYmVjYXVzZVxuICAgICAgICAvLyB0aGUgZnVuY3Rpb24gaXMgYnlwYXNzZWQgZW50aXJlbHkuIFdoZW4gdGhhdCBnZXRzIGV2YWx1YXRlZCwgaXRcbiAgICAgICAgLy8gZGVmaW5lcyAoYnV0IGRvZXMgbm90IGludm9rZSkgYSBmdW5jdGlvbiwgdGhlbiBldmFsdWF0ZXMgYSBzaW1wbGVcbiAgICAgICAgLy8ge3g6IHRoaXN9IGV4cHJlc3Npb24sIGdpdmluZyBhY2Nlc3MgdG8gdGhlIHNhZmUgZ2xvYmFsLlxuICAgICAgfVxuXG4gICAgICAvLyBJcyB0aGlzIGEgcmVhbCBmdW5jdGlvbkJvZHksIG9yIGlzIHNvbWVvbmUgYXR0ZW1wdGluZyBhbiBpbmplY3Rpb25cbiAgICAgIC8vIGF0dGFjaz8gVGhpcyB3aWxsIHRocm93IGEgU3ludGF4RXJyb3IgaWYgdGhlIHN0cmluZyBpcyBub3QgYWN0dWFsbHkgYVxuICAgICAgLy8gZnVuY3Rpb24gYm9keS4gV2UgY29lcmNlIHRoZSBib2R5IGludG8gYSByZWFsIHN0cmluZyBhYm92ZSB0byBwcmV2ZW50XG4gICAgICAvLyBzb21lb25lIGZyb20gcGFzc2luZyBhbiBvYmplY3Qgd2l0aCBhIHRvU3RyaW5nKCkgdGhhdCByZXR1cm5zIGEgc2FmZVxuICAgICAgLy8gc3RyaW5nIHRoZSBmaXJzdCB0aW1lLCBidXQgYW4gZXZpbCBzdHJpbmcgdGhlIHNlY29uZCB0aW1lLlxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLW5ldywgbmV3LWNhcFxuICAgICAgbmV3IHVuc2FmZUZ1bmN0aW9uKGZ1bmN0aW9uQm9keSk7XG5cbiAgICAgIGlmIChzdHJpbmdJbmNsdWRlcyhmdW5jdGlvblBhcmFtcywgJyknKSkge1xuICAgICAgICAvLyBJZiB0aGUgZm9ybWFsIHBhcmFtZXRlcnMgc3RyaW5nIGluY2x1ZGUgKSAtIGFuIGlsbGVnYWxcbiAgICAgICAgLy8gY2hhcmFjdGVyIC0gaXQgbWF5IG1ha2UgdGhlIGNvbWJpbmVkIGZ1bmN0aW9uIGV4cHJlc3Npb25cbiAgICAgICAgLy8gY29tcGlsZS4gV2UgYXZvaWQgdGhpcyBwcm9ibGVtIGJ5IGNoZWNraW5nIGZvciB0aGlzIGVhcmx5IG9uLlxuXG4gICAgICAgIC8vIG5vdGU6IHY4IHRocm93cyBqdXN0IGxpa2UgdGhpcyBkb2VzLCBidXQgY2hyb21lIGFjY2VwdHNcbiAgICAgICAgLy8gZS5nLiAnYSA9IG5ldyBEYXRlKCknXG4gICAgICAgIHRocm93IG5ldyB1bnNhZmVHbG9iYWwuU3ludGF4RXJyb3IoXG4gICAgICAgICAgJ3NoaW0gbGltaXRhdGlvbjogRnVuY3Rpb24gYXJnIHN0cmluZyBjb250YWlucyBwYXJlbnRoZXNpcydcbiAgICAgICAgKTtcbiAgICAgICAgLy8gdG9kbzogc2hpbSBpbnRlZ3JpdHkgdGhyZWF0IGlmIHRoZXkgY2hhbmdlIFN5bnRheEVycm9yXG4gICAgICB9XG5cbiAgICAgIC8vIHRvZG86IGNoZWNrIHRvIG1ha2Ugc3VyZSB0aGlzIC5sZW5ndGggaXMgc2FmZS4gbWFya20gc2F5cyBzYWZlLlxuICAgICAgaWYgKGZ1bmN0aW9uUGFyYW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgLy8gSWYgdGhlIGZvcm1hbCBwYXJhbWV0ZXJzIGluY2x1ZGUgYW4gdW5iYWxhbmNlZCBibG9jayBjb21tZW50LCB0aGVcbiAgICAgICAgLy8gZnVuY3Rpb24gbXVzdCBiZSByZWplY3RlZC4gU2luY2UgSmF2YVNjcmlwdCBkb2VzIG5vdCBhbGxvdyBuZXN0ZWRcbiAgICAgICAgLy8gY29tbWVudHMgd2UgY2FuIGluY2x1ZGUgYSB0cmFpbGluZyBibG9jayBjb21tZW50IHRvIGNhdGNoIHRoaXMuXG4gICAgICAgIGZ1bmN0aW9uUGFyYW1zICs9ICdcXG4vKmBgKi8nO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzcmMgPSBgKGZ1bmN0aW9uKCR7ZnVuY3Rpb25QYXJhbXN9KXtcXG4ke2Z1bmN0aW9uQm9keX1cXG59KWA7XG5cbiAgICAgIHJldHVybiBzYWZlRXZhbE9wZXJhdGlvbihzcmMpO1xuICAgIH1cblxuICAgIGNvbnN0IHNhZmVGdW5jdGlvbiA9IHVuc2FmZUV2YWwoYnVpbGRTYWZlRnVuY3Rpb25TdHJpbmcpKFxuICAgICAgdW5zYWZlUmVjLFxuICAgICAgc2FmZUZ1bmN0aW9uT3BlcmF0aW9uXG4gICAgKTtcblxuICAgIGFzc2VydChcbiAgICAgIGdldFByb3RvdHlwZU9mKHNhZmVGdW5jdGlvbikuY29uc3RydWN0b3IgIT09IEZ1bmN0aW9uLFxuICAgICAgJ2hpZGUgRnVuY3Rpb24nXG4gICAgKTtcbiAgICBhc3NlcnQoXG4gICAgICBnZXRQcm90b3R5cGVPZihzYWZlRnVuY3Rpb24pLmNvbnN0cnVjdG9yICE9PSB1bnNhZmVGdW5jdGlvbixcbiAgICAgICdoaWRlIHVuc2FmZUZ1bmN0aW9uJ1xuICAgICk7XG5cbiAgICByZXR1cm4gc2FmZUZ1bmN0aW9uO1xuICB9XG5cbiAgLy8gTWltaWMgcHJpdmF0ZSBtZW1iZXJzIG9uIHRoZSByZWFsbSBpbnN0YW5jZXMuXG4gIC8vIFdlIGRlZmluZSBpdCBpbiB0aGUgc2FtZSBtb2R1bGUgYW5kIGRvIG5vdCBleHBvcnQgaXQuXG4gIGNvbnN0IFJlYWxtUmVjRm9yUmVhbG1JbnN0YW5jZSA9IG5ldyBXZWFrTWFwKCk7XG5cbiAgZnVuY3Rpb24gZ2V0UmVhbG1SZWNGb3JSZWFsbUluc3RhbmNlKHJlYWxtKSB7XG4gICAgLy8gRGV0ZWN0IG5vbi1vYmplY3RzLlxuICAgIGFzc2VydChPYmplY3QocmVhbG0pID09PSByZWFsbSwgJ2JhZCBvYmplY3QsIG5vdCBhIFJlYWxtIGluc3RhbmNlJyk7XG4gICAgLy8gUmVhbG0gaW5zdGFuY2UgaGFzIG5vIHJlYWxtUmVjLiBTaG91bGQgbm90IHByb2NlZWQuXG4gICAgYXNzZXJ0KFJlYWxtUmVjRm9yUmVhbG1JbnN0YW5jZS5oYXMocmVhbG0pLCAnUmVhbG0gaW5zdGFuY2UgaGFzIG5vIHJlY29yZCcpO1xuXG4gICAgcmV0dXJuIFJlYWxtUmVjRm9yUmVhbG1JbnN0YW5jZS5nZXQocmVhbG0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVnaXN0ZXJSZWFsbVJlY0ZvclJlYWxtSW5zdGFuY2UocmVhbG0sIHJlYWxtUmVjKSB7XG4gICAgLy8gRGV0ZWN0IG5vbi1vYmplY3RzLlxuICAgIGFzc2VydChPYmplY3QocmVhbG0pID09PSByZWFsbSwgJ2JhZCBvYmplY3QsIG5vdCBhIFJlYWxtIGluc3RhbmNlJyk7XG4gICAgLy8gQXR0ZW1wdCB0byBjaGFuZ2UgYW4gZXhpc3RpbmcgcmVhbG1SZWMgb24gYSByZWFsbSBpbnN0YW5jZS4gU2hvdWxkIG5vdCBwcm9jZWVkLlxuICAgIGFzc2VydChcbiAgICAgICFSZWFsbVJlY0ZvclJlYWxtSW5zdGFuY2UuaGFzKHJlYWxtKSxcbiAgICAgICdSZWFsbSBpbnN0YW5jZSBhbHJlYWR5IGhhcyBhIHJlY29yZCdcbiAgICApO1xuXG4gICAgUmVhbG1SZWNGb3JSZWFsbUluc3RhbmNlLnNldChyZWFsbSwgcmVhbG1SZWMpO1xuICB9XG5cbiAgLy8gSW5pdGlhbGl6ZSB0aGUgZ2xvYmFsIHZhcmlhYmxlcyBmb3IgdGhlIG5ldyBSZWFsbS5cbiAgZnVuY3Rpb24gc2V0RGVmYXVsdEJpbmRpbmdzKHNhZmVHbG9iYWwsIHNhZmVFdmFsLCBzYWZlRnVuY3Rpb24pIHtcbiAgICBkZWZpbmVQcm9wZXJ0aWVzKHNhZmVHbG9iYWwsIHtcbiAgICAgIGV2YWw6IHtcbiAgICAgICAgdmFsdWU6IHNhZmVFdmFsLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9LFxuICAgICAgRnVuY3Rpb246IHtcbiAgICAgICAgdmFsdWU6IHNhZmVGdW5jdGlvbixcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlUmVhbG1SZWModW5zYWZlUmVjLCB0cmFuc2Zvcm1zLCBzbG9wcHlHbG9iYWxzKSB7XG4gICAgY29uc3QgeyBzaGFyZWRHbG9iYWxEZXNjcywgdW5zYWZlR2xvYmFsIH0gPSB1bnNhZmVSZWM7XG5cbiAgICBjb25zdCBzYWZlR2xvYmFsID0gY3JlYXRlKHVuc2FmZUdsb2JhbC5PYmplY3QucHJvdG90eXBlLCBzaGFyZWRHbG9iYWxEZXNjcyk7XG5cbiAgICBjb25zdCBzYWZlRXZhbHVhdG9yRmFjdG9yeSA9IGNyZWF0ZVNhZmVFdmFsdWF0b3JGYWN0b3J5KFxuICAgICAgdW5zYWZlUmVjLFxuICAgICAgc2FmZUdsb2JhbCxcbiAgICAgIHRyYW5zZm9ybXMsXG4gICAgICBzbG9wcHlHbG9iYWxzXG4gICAgKTtcbiAgICBjb25zdCBzYWZlRXZhbE9wZXJhdGlvbiA9IHNhZmVFdmFsdWF0b3JGYWN0b3J5KCk7XG4gICAgY29uc3Qgc2FmZUV2YWwgPSBjcmVhdGVTYWZlRXZhbHVhdG9yKHVuc2FmZVJlYywgc2FmZUV2YWxPcGVyYXRpb24pO1xuICAgIGNvbnN0IHNhZmVGdW5jdGlvbiA9IGNyZWF0ZUZ1bmN0aW9uRXZhbHVhdG9yKHVuc2FmZVJlYywgc2FmZUV2YWxPcGVyYXRpb24pO1xuICAgIGNvbnN0IHNhZmVFdmFsV2hpY2hUYWtlc0VuZG93bWVudHMgPSBjcmVhdGVTYWZlRXZhbHVhdG9yV2hpY2hUYWtlc0VuZG93bWVudHMoXG4gICAgICBzYWZlRXZhbHVhdG9yRmFjdG9yeVxuICAgICk7XG5cbiAgICBzZXREZWZhdWx0QmluZGluZ3Moc2FmZUdsb2JhbCwgc2FmZUV2YWwsIHNhZmVGdW5jdGlvbik7XG5cbiAgICBjb25zdCByZWFsbVJlYyA9IGZyZWV6ZSh7XG4gICAgICBzYWZlR2xvYmFsLFxuICAgICAgc2FmZUV2YWwsXG4gICAgICBzYWZlRXZhbFdoaWNoVGFrZXNFbmRvd21lbnRzLFxuICAgICAgc2FmZUZ1bmN0aW9uXG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVhbG1SZWM7XG4gIH1cblxuICAvKipcbiAgICogQSByb290IHJlYWxtIHVzZXMgYSBmcmVzaCBzZXQgb2YgbmV3IGludHJpbmljcy4gSGVyZSB3ZSBmaXJzdCBjcmVhdGVcbiAgICogYSBuZXcgdW5zYWZlIHJlY29yZCwgd2hpY2ggaW5oZXJpdHMgdGhlIHNoaW1zLiBUaGVuIHdlIHByb2NlZWQgd2l0aFxuICAgKiB0aGUgY3JlYXRpb24gb2YgdGhlIHJlYWxtIHJlY29yZCwgYW5kIHdlIGFwcGx5IHRoZSBzaGltcy5cbiAgICovXG4gIGZ1bmN0aW9uIGluaXRSb290UmVhbG0ocGFyZW50VW5zYWZlUmVjLCBzZWxmLCBvcHRpb25zKSB7XG4gICAgLy8gbm90ZTogJ3NlbGYnIGlzIHRoZSBpbnN0YW5jZSBvZiB0aGUgUmVhbG0uXG5cbiAgICAvLyB0b2RvOiBpbnZlc3RpZ2F0ZSBhdHRhY2tzIHZpYSBBcnJheS5zcGVjaWVzXG4gICAgLy8gdG9kbzogdGhpcyBhY2NlcHRzIG5ld1NoaW1zPSdzdHJpbmcnLCBidXQgaXQgc2hvdWxkIHJlamVjdCB0aGF0XG4gICAgY29uc3Qge1xuICAgICAgc2hpbXM6IG5ld1NoaW1zLFxuICAgICAgdHJhbnNmb3JtcyxcbiAgICAgIHNsb3BweUdsb2JhbHMsXG4gICAgICBjb25maWd1cmFibGVHbG9iYWxzXG4gICAgfSA9IG9wdGlvbnM7XG4gICAgY29uc3QgYWxsU2hpbXMgPSBhcnJheUNvbmNhdChwYXJlbnRVbnNhZmVSZWMuYWxsU2hpbXMsIG5ld1NoaW1zKTtcblxuICAgIC8vIFRoZSB1bnNhZmUgcmVjb3JkIGlzIGNyZWF0ZWQgYWxyZWFkeSByZXBhaXJlZC5cbiAgICBjb25zdCB1bnNhZmVSZWMgPSBjcmVhdGVOZXdVbnNhZmVSZWMoYWxsU2hpbXMsIGNvbmZpZ3VyYWJsZUdsb2JhbHMpO1xuICAgIGNvbnN0IHsgdW5zYWZlRXZhbCB9ID0gdW5zYWZlUmVjO1xuXG4gICAgY29uc3QgUmVhbG0gPSB1bnNhZmVFdmFsKGJ1aWxkQ2hpbGRSZWFsbVN0cmluZykoXG4gICAgICB1bnNhZmVSZWMsXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdXNlLWJlZm9yZS1kZWZpbmVcbiAgICAgIEJhc2VSZWFsbVxuICAgICk7XG5cbiAgICAvLyBBZGQgYSBSZWFsbSBkZXNjcmlwdG9yIHRvIHNoYXJlZEdsb2JhbERlc2NzLCBzbyBpdCBjYW4gYmUgZGVmaW5lZCBvbnRvIHRoZVxuICAgIC8vIHNhZmVHbG9iYWwgbGlrZSB0aGUgcmVzdCBvZiB0aGUgZ2xvYmFscy5cbiAgICB1bnNhZmVSZWMuc2hhcmVkR2xvYmFsRGVzY3MuUmVhbG0gPSB7XG4gICAgICB2YWx1ZTogUmVhbG0sXG4gICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH07XG5cbiAgICAvLyBDcmVhdGluZyB0aGUgcmVhbG1SZWMgcHJvdmlkZXMgdGhlIGdsb2JhbCBvYmplY3QsIGV2YWwoKSBhbmQgRnVuY3Rpb24oKVxuICAgIC8vIHRvIHRoZSByZWFsbS5cbiAgICBjb25zdCByZWFsbVJlYyA9IGNyZWF0ZVJlYWxtUmVjKHVuc2FmZVJlYywgdHJhbnNmb3Jtcywgc2xvcHB5R2xvYmFscyk7XG5cbiAgICAvLyBBcHBseSBhbGwgc2hpbXMgaW4gdGhlIG5ldyBSb290UmVhbG0uIFdlIGRvbid0IGRvIHRoaXMgZm9yIGNvbXBhcnRtZW50cy5cbiAgICBjb25zdCB7IHNhZmVFdmFsV2hpY2hUYWtlc0VuZG93bWVudHMgfSA9IHJlYWxtUmVjO1xuICAgIGZvciAoY29uc3Qgc2hpbSBvZiBhbGxTaGltcykge1xuICAgICAgc2FmZUV2YWxXaGljaFRha2VzRW5kb3dtZW50cyhzaGltKTtcbiAgICB9XG5cbiAgICAvLyBUaGUgcmVhbG1SZWMgYWN0cyBhcyBhIHByaXZhdGUgZmllbGQgb24gdGhlIHJlYWxtIGluc3RhbmNlLlxuICAgIHJlZ2lzdGVyUmVhbG1SZWNGb3JSZWFsbUluc3RhbmNlKHNlbGYsIHJlYWxtUmVjKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBIGNvbXBhcnRtZW50IHNoYXJlcyB0aGUgaW50cmluc2ljcyBvZiBpdHMgcm9vdCByZWFsbS4gSGVyZSwgb25seSBhXG4gICAqIHJlYWxtUmVjIGlzIG5lY2Vzc2FyeSB0byBob2xkIHRoZSBnbG9iYWwgb2JqZWN0LCBldmFsKCkgYW5kIEZ1bmN0aW9uKCkuXG4gICAqL1xuICBmdW5jdGlvbiBpbml0Q29tcGFydG1lbnQodW5zYWZlUmVjLCBzZWxmLCBvcHRpb25zID0ge30pIHtcbiAgICAvLyBub3RlOiAnc2VsZicgaXMgdGhlIGluc3RhbmNlIG9mIHRoZSBSZWFsbS5cblxuICAgIGNvbnN0IHsgdHJhbnNmb3Jtcywgc2xvcHB5R2xvYmFscyB9ID0gb3B0aW9ucztcbiAgICBjb25zdCByZWFsbVJlYyA9IGNyZWF0ZVJlYWxtUmVjKHVuc2FmZVJlYywgdHJhbnNmb3Jtcywgc2xvcHB5R2xvYmFscyk7XG5cbiAgICAvLyBUaGUgcmVhbG1SZWMgYWN0cyBhcyBhIHByaXZhdGUgZmllbGQgb24gdGhlIHJlYWxtIGluc3RhbmNlLlxuICAgIHJlZ2lzdGVyUmVhbG1SZWNGb3JSZWFsbUluc3RhbmNlKHNlbGYsIHJlYWxtUmVjKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFJlYWxtR2xvYmFsKHNlbGYpIHtcbiAgICBjb25zdCB7IHNhZmVHbG9iYWwgfSA9IGdldFJlYWxtUmVjRm9yUmVhbG1JbnN0YW5jZShzZWxmKTtcbiAgICByZXR1cm4gc2FmZUdsb2JhbDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWxtRXZhbHVhdGUoc2VsZiwgeCwgZW5kb3dtZW50cyA9IHt9LCBvcHRpb25zID0ge30pIHtcbiAgICAvLyB0b2RvOiBkb24ndCBwYXNzIGluIHByaW1hbC1yZWFsbSBvYmplY3RzIGxpa2Uge30sIGZvciBzYWZldHkuIE9UT0ggaXRzXG4gICAgLy8gcHJvcGVydGllcyBhcmUgY29waWVkIG9udG8gdGhlIG5ldyBnbG9iYWwgJ3RhcmdldCcuXG4gICAgLy8gdG9kbzogZmlndXJlIG91dCBhIHdheSB0byBtZW1icmFuZSBhd2F5IHRoZSBjb250ZW50cyB0byBzYWZldHkuXG4gICAgY29uc3QgeyBzYWZlRXZhbFdoaWNoVGFrZXNFbmRvd21lbnRzIH0gPSBnZXRSZWFsbVJlY0ZvclJlYWxtSW5zdGFuY2Uoc2VsZik7XG4gICAgcmV0dXJuIHNhZmVFdmFsV2hpY2hUYWtlc0VuZG93bWVudHMoeCwgZW5kb3dtZW50cywgb3B0aW9ucyk7XG4gIH1cblxuICBjb25zdCBCYXNlUmVhbG0gPSB7XG4gICAgaW5pdFJvb3RSZWFsbSxcbiAgICBpbml0Q29tcGFydG1lbnQsXG4gICAgZ2V0UmVhbG1HbG9iYWwsXG4gICAgcmVhbG1FdmFsdWF0ZVxuICB9O1xuXG4gIC8vIENyZWF0ZSB0aGUgY3VycmVudCB1bnNhZmVSZWMgZnJvbSB0aGUgY3VycmVudCBcInByaW1hbFwiIGVudmlyb25tZW50ICh0aGUgcmVhbG1cbiAgLy8gd2hlcmUgdGhlIFJlYWxtIHNoaW0gaXMgbG9hZGVkIGFuZCBleGVjdXRlZCkuXG4gIGNvbnN0IGN1cnJlbnRVbnNhZmVSZWMgPSBjcmVhdGVDdXJyZW50VW5zYWZlUmVjKCk7XG5cbiAgLyoqXG4gICAqIFRoZSBcInByaW1hbFwiIHJlYWxtIGNsYXNzIGlzIGRlZmluZWQgaW4gdGhlIGN1cnJlbnQgXCJwcmltYWxcIiBlbnZpcm9ubWVudCxcbiAgICogYW5kIGlzIHBhcnQgb2YgdGhlIHNoaW0uIFRoZXJlIGlzIG5vIG5lZWQgdG8gZmFjYWRlIHRoaXMgY2xhc3MgdmlhIGV2YWx1YXRpb25cbiAgICogYmVjYXVzZSBib3RoIHNoYXJlIHRoZSBzYW1lIGludHJpbnNpY3MuXG4gICAqL1xuICBjb25zdCBSZWFsbSA9IGJ1aWxkQ2hpbGRSZWFsbShjdXJyZW50VW5zYWZlUmVjLCBCYXNlUmVhbG0pO1xuXG4gIC8vIEFkYXB0ZWQgZnJvbSBTRVMvQ2FqYSAtIENvcHlyaWdodCAoQykgMjAxMSBHb29nbGUgSW5jLlxuICAvLyBDb3B5cmlnaHQgKEMpIDIwMTggQWdvcmljXG5cbiAgLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAgLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICAvLyBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAgLy9cbiAgLy8gaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gIC8vXG4gIC8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAgLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICAvLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAgLy8gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICAvLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblxuICAvLyBiYXNlZCB1cG9uOlxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vZ29vZ2xlL2NhamEvYmxvYi9tYXN0ZXIvc3JjL2NvbS9nb29nbGUvY2FqYS9zZXMvc3RhcnRTRVMuanNcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2dvb2dsZS9jYWphL2Jsb2IvbWFzdGVyL3NyYy9jb20vZ29vZ2xlL2NhamEvc2VzL3JlcGFpckVTNS5qc1xuICAvLyB0aGVuIGNvcGllZCBmcm9tIHByb3Bvc2FsLWZyb3plbi1yZWFsbXMgZGVlcC1mcmVlemUuanNcbiAgLy8gdGhlbiBjb3BpZWQgZnJvbSBTRVMvc3JjL2J1bmRsZS9kZWVwRnJlZXplLmpzXG5cbiAgLyoqXG4gICAqIEB0eXBlZGVmIEhhcmRlbmVyT3B0aW9uc1xuICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgKiBAcHJvcGVydHkge1dlYWtTZXQ9fSBmcmluZ2VTZXQgV2Vha1NldCB0byB1c2UgZm9yIHRoZSBmcmluZ2VTZXRcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbj19IG5haXZlUHJlcGFyZU9iamVjdCBDYWxsIHdpdGggb2JqZWN0IGJlZm9yZSBoYXJkZW5pbmdcbiAgICovXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIGBoYXJkZW5gIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0ge0l0ZXJhYmxlfSBpbml0aWFsRnJpbmdlIE9iamVjdHMgY29uc2lkZXJlZCBhbHJlYWR5IGhhcmRlbmVkXG4gICAqIEBwYXJhbSB7SGFyZGVuZXJPcHRpb25zPX0gb3B0aW9ucyBPcHRpb25zIGZvciBjcmVhdGlvblxuICAgKi9cbiAgZnVuY3Rpb24gbWFrZUhhcmRlbmVyKGluaXRpYWxGcmluZ2UsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHsgZnJlZXplLCBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzLCBnZXRQcm90b3R5cGVPZiB9ID0gT2JqZWN0O1xuICAgIGNvbnN0IHsgb3duS2V5cyB9ID0gUmVmbGVjdDtcblxuICAgIC8vIE9iamVjdHMgdGhhdCB3ZSB3b24ndCBmcmVlemUsIGVpdGhlciBiZWNhdXNlIHdlJ3ZlIGZyb3plbiB0aGVtIGFscmVhZHksXG4gICAgLy8gb3IgdGhleSB3ZXJlIG9uZSBvZiB0aGUgaW5pdGlhbCByb290cyAodGVybWluYWxzKS4gVGhlc2Ugb2JqZWN0cyBmb3JtXG4gICAgLy8gdGhlIFwiZnJpbmdlXCIgb2YgdGhlIGhhcmRlbmVkIG9iamVjdCBncmFwaC5cbiAgICBsZXQgeyBmcmluZ2VTZXQgfSA9IG9wdGlvbnM7XG4gICAgaWYgKGZyaW5nZVNldCkge1xuICAgICAgaWYgKFxuICAgICAgICB0eXBlb2YgZnJpbmdlU2V0LmFkZCAhPT0gJ2Z1bmN0aW9uJyB8fFxuICAgICAgICB0eXBlb2YgZnJpbmdlU2V0LmhhcyAhPT0gJ2Z1bmN0aW9uJ1xuICAgICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgYG9wdGlvbnMuZnJpbmdlU2V0IG11c3QgaGF2ZSBhZGQoKSBhbmQgaGFzKCkgbWV0aG9kc2AsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIC8vIFBvcHVsYXRlIHRoZSBzdXBwbGllZCBmcmluZ2VTZXQgd2l0aCBvdXIgaW5pdGlhbEZyaW5nZS5cbiAgICAgIGlmIChpbml0aWFsRnJpbmdlKSB7XG4gICAgICAgIGZvciAoY29uc3QgZnJpbmdlIG9mIGluaXRpYWxGcmluZ2UpIHtcbiAgICAgICAgICBmcmluZ2VTZXQuYWRkKGZyaW5nZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVXNlIGEgbmV3IGVtcHR5IGZyaW5nZS5cbiAgICAgIGZyaW5nZVNldCA9IG5ldyBXZWFrU2V0KGluaXRpYWxGcmluZ2UpO1xuICAgIH1cblxuICAgIGNvbnN0IG5haXZlUHJlcGFyZU9iamVjdCA9IG9wdGlvbnMgJiYgb3B0aW9ucy5uYWl2ZVByZXBhcmVPYmplY3Q7XG5cbiAgICBmdW5jdGlvbiBoYXJkZW4ocm9vdCkge1xuICAgICAgY29uc3QgdG9GcmVlemUgPSBuZXcgU2V0KCk7XG4gICAgICBjb25zdCBwcm90b3R5cGVzID0gbmV3IE1hcCgpO1xuICAgICAgY29uc3QgcGF0aHMgPSBuZXcgV2Vha01hcCgpO1xuXG4gICAgICAvLyBJZiB2YWwgaXMgc29tZXRoaW5nIHdlIHNob3VsZCBiZSBmcmVlemluZyBidXQgYXJlbid0IHlldCxcbiAgICAgIC8vIGFkZCBpdCB0byB0b0ZyZWV6ZS5cbiAgICAgIGZ1bmN0aW9uIGVucXVldWUodmFsLCBwYXRoKSB7XG4gICAgICAgIGlmIChPYmplY3QodmFsKSAhPT0gdmFsKSB7XG4gICAgICAgICAgLy8gaWdub3JlIHByaW1pdGl2ZXNcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdHlwZSA9IHR5cGVvZiB2YWw7XG4gICAgICAgIGlmICh0eXBlICE9PSAnb2JqZWN0JyAmJiB0eXBlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgLy8gZnV0dXJlIHByb29mOiBicmVhayB1bnRpbCBzb21lb25lIGZpZ3VyZXMgb3V0IHdoYXQgaXQgc2hvdWxkIGRvXG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVW5leHBlY3RlZCB0eXBlb2Y6ICR7dHlwZX1gKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZnJpbmdlU2V0Lmhhcyh2YWwpIHx8IHRvRnJlZXplLmhhcyh2YWwpKSB7XG4gICAgICAgICAgLy8gSWdub3JlIGlmIHRoaXMgaXMgYW4gZXhpdCwgb3Igd2UndmUgYWxyZWFkeSB2aXNpdGVkIGl0XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGBhZGRpbmcgJHt2YWx9IHRvIHRvRnJlZXplYCwgdmFsKTtcbiAgICAgICAgdG9GcmVlemUuYWRkKHZhbCk7XG4gICAgICAgIHBhdGhzLnNldCh2YWwsIHBhdGgpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBmcmVlemVBbmRUcmF2ZXJzZShvYmopIHtcbiAgICAgICAgLy8gQXBwbHkgdGhlIG5haXZlIHByZXBhcmVyIGlmIHRoZXkgc3BlY2lmaWVkIG9uZS5cbiAgICAgICAgaWYgKG5haXZlUHJlcGFyZU9iamVjdCkge1xuICAgICAgICAgIG5haXZlUHJlcGFyZU9iamVjdChvYmopO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTm93IGZyZWV6ZSB0aGUgb2JqZWN0IHRvIGVuc3VyZSByZWFjdGl2ZVxuICAgICAgICAvLyBvYmplY3RzIHN1Y2ggYXMgcHJveGllcyB3b24ndCBhZGQgcHJvcGVydGllc1xuICAgICAgICAvLyBkdXJpbmcgdHJhdmVyc2FsLCBiZWZvcmUgdGhleSBnZXQgZnJvemVuLlxuXG4gICAgICAgIC8vIE9iamVjdCBhcmUgdmVyaWZpZWQgYmVmb3JlIGJlaW5nIGVucXVldWVkLFxuICAgICAgICAvLyB0aGVyZWZvcmUgdGhpcyBpcyBhIHZhbGlkIGNhbmRpZGF0ZS5cbiAgICAgICAgLy8gVGhyb3dzIGlmIHRoaXMgZmFpbHMgKHN0cmljdCBtb2RlKS5cbiAgICAgICAgZnJlZXplKG9iaik7XG5cbiAgICAgICAgLy8gd2UgcmVseSB1cG9uIGNlcnRhaW4gY29tbWl0bWVudHMgb2YgT2JqZWN0LmZyZWV6ZSBhbmQgcHJveGllcyBoZXJlXG5cbiAgICAgICAgLy8gZ2V0IHN0YWJsZS9pbW11dGFibGUgb3V0Ym91bmQgbGlua3MgYmVmb3JlIGEgUHJveHkgaGFzIGEgY2hhbmNlIHRvIGRvXG4gICAgICAgIC8vIHNvbWV0aGluZyBzbmVha3kuXG4gICAgICAgIGNvbnN0IHByb3RvID0gZ2V0UHJvdG90eXBlT2Yob2JqKTtcbiAgICAgICAgY29uc3QgZGVzY3MgPSBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKG9iaik7XG4gICAgICAgIGNvbnN0IHBhdGggPSBwYXRocy5nZXQob2JqKSB8fCAndW5rbm93bic7XG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coYGFkZGluZyAke3Byb3RvfSB0byBwcm90b3R5cGVzIHVuZGVyICR7cGF0aH1gKTtcbiAgICAgICAgaWYgKHByb3RvICE9PSBudWxsICYmICFwcm90b3R5cGVzLmhhcyhwcm90bykpIHtcbiAgICAgICAgICBwcm90b3R5cGVzLnNldChwcm90bywgcGF0aCk7XG4gICAgICAgICAgcGF0aHMuc2V0KHByb3RvLCBgJHtwYXRofS5fX3Byb3RvX19gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG93bktleXMoZGVzY3MpLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICAgICAgY29uc3QgcGF0aG5hbWUgPSBgJHtwYXRofS4ke1N0cmluZyhuYW1lKX1gO1xuICAgICAgICAgIC8vIHRvZG8gdW5jdXJyaWVkIGZvcm1cbiAgICAgICAgICAvLyB0b2RvOiBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzIGlzIGd1YXJhbnRlZWQgdG8gcmV0dXJuIHdlbGwtZm9ybWVkXG4gICAgICAgICAgLy8gZGVzY3JpcHRvcnMsIGJ1dCB0aGV5IHN0aWxsIGluaGVyaXQgZnJvbSBPYmplY3QucHJvdG90eXBlLiBJZlxuICAgICAgICAgIC8vIHNvbWVvbmUgaGFzIHBvaXNvbmVkIE9iamVjdC5wcm90b3R5cGUgdG8gYWRkICd2YWx1ZScgb3IgJ2dldCdcbiAgICAgICAgICAvLyBwcm9wZXJ0aWVzLCB0aGVuIGEgc2ltcGxlICdpZiAoXCJ2YWx1ZVwiIGluIGRlc2MpJyBvciAnZGVzYy52YWx1ZSdcbiAgICAgICAgICAvLyB0ZXN0IGNvdWxkIGJlIGNvbmZ1c2VkLiBXZSB1c2UgaGFzT3duUHJvcGVydHkgdG8gYmUgc3VyZSBhYm91dFxuICAgICAgICAgIC8vIHdoZXRoZXIgJ3ZhbHVlJyBpcyBwcmVzZW50IG9yIG5vdCwgd2hpY2ggdGVsbHMgdXMgZm9yIHN1cmUgdGhhdCB0aGlzXG4gICAgICAgICAgLy8gaXMgYSBkYXRhIHByb3BlcnR5LlxuICAgICAgICAgIGNvbnN0IGRlc2MgPSBkZXNjc1tuYW1lXTtcbiAgICAgICAgICBpZiAoJ3ZhbHVlJyBpbiBkZXNjKSB7XG4gICAgICAgICAgICAvLyB0b2RvIHVuY3VycmllZCBmb3JtXG4gICAgICAgICAgICBlbnF1ZXVlKGRlc2MudmFsdWUsIGAke3BhdGhuYW1lfWApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbnF1ZXVlKGRlc2MuZ2V0LCBgJHtwYXRobmFtZX0oZ2V0KWApO1xuICAgICAgICAgICAgZW5xdWV1ZShkZXNjLnNldCwgYCR7cGF0aG5hbWV9KHNldClgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBkZXF1ZXVlKCkge1xuICAgICAgICAvLyBOZXcgdmFsdWVzIGFkZGVkIGJlZm9yZSBmb3JFYWNoKCkgaGFzIGZpbmlzaGVkIHdpbGwgYmUgdmlzaXRlZC5cbiAgICAgICAgdG9GcmVlemUuZm9yRWFjaChmcmVlemVBbmRUcmF2ZXJzZSk7IC8vIHRvZG8gY3VycmllZCBmb3JFYWNoXG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNoZWNrUHJvdG90eXBlcygpIHtcbiAgICAgICAgcHJvdG90eXBlcy5mb3JFYWNoKChwYXRoLCBwKSA9PiB7XG4gICAgICAgICAgaWYgKCEodG9GcmVlemUuaGFzKHApIHx8IGZyaW5nZVNldC5oYXMocCkpKSB7XG4gICAgICAgICAgICAvLyBhbGwgcmVhY2hhYmxlIHByb3BlcnRpZXMgaGF2ZSBhbHJlYWR5IGJlZW4gZnJvemVuIGJ5IHRoaXMgcG9pbnRcbiAgICAgICAgICAgIGxldCBtc2c7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBtc2cgPSBgcHJvdG90eXBlICR7cH0gb2YgJHtwYXRofSBpcyBub3QgYWxyZWFkeSBpbiB0aGUgZnJpbmdlU2V0YDtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgLy8gYCR7KGFzeW5jIF89Pl8pLl9fcHJvdG9fX31gIGZhaWxzIGluIG1vc3QgZW5naW5lc1xuICAgICAgICAgICAgICBtc2cgPVxuICAgICAgICAgICAgICAgICdhIHByb3RvdHlwZSBvZiBzb21ldGhpbmcgaXMgbm90IGFscmVhZHkgaW4gdGhlIGZyaW5nZXNldCAoYW5kIC50b1N0cmluZyBmYWlsZWQpJztcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtc2cpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0aGUgcHJvdG90eXBlOicsIHApO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvZiBzb21ldGhpbmc6JywgcGF0aCk7XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKF9lKSB7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2cgbWlnaHQgYmUgbWlzc2luZyBpbiByZXN0cmljdGl2ZSBTRVMgcmVhbG1zXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobXNnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBjb21taXQoKSB7XG4gICAgICAgIC8vIHRvZG8gY3VycmllZCBmb3JFYWNoXG4gICAgICAgIC8vIHdlIGNhcHR1cmUgdGhlIHJlYWwgV2Vha1NldC5wcm90b3R5cGUuYWRkIGFib3ZlLCBpbiBjYXNlIHNvbWVvbmVcbiAgICAgICAgLy8gY2hhbmdlcyBpdC4gVGhlIHR3by1hcmd1bWVudCBmb3JtIG9mIGZvckVhY2ggcGFzc2VzIHRoZSBzZWNvbmRcbiAgICAgICAgLy8gYXJndW1lbnQgYXMgdGhlICd0aGlzJyBiaW5kaW5nLCBzbyB3ZSBhZGQgdG8gdGhlIGNvcnJlY3Qgc2V0LlxuICAgICAgICB0b0ZyZWV6ZS5mb3JFYWNoKGZyaW5nZVNldC5hZGQsIGZyaW5nZVNldCk7XG4gICAgICB9XG5cbiAgICAgIGVucXVldWUocm9vdCk7XG4gICAgICBkZXF1ZXVlKCk7XG4gICAgICAvLyBjb25zb2xlLmxvZyhcImZyaW5nZVNldFwiLCBmcmluZ2VTZXQpO1xuICAgICAgLy8gY29uc29sZS5sb2coXCJwcm90b3R5cGUgc2V0OlwiLCBwcm90b3R5cGVzKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKFwidG9GcmVlemUgc2V0OlwiLCB0b0ZyZWV6ZSk7XG4gICAgICBjaGVja1Byb3RvdHlwZXMoKTtcbiAgICAgIGNvbW1pdCgpO1xuXG4gICAgICByZXR1cm4gcm9vdDtcbiAgICB9XG5cbiAgICByZXR1cm4gaGFyZGVuO1xuICB9XG5cbiAgZnVuY3Rpb24gdGFtZURhdGUoKSB7XG4gICAgY29uc3QgdW5zYWZlRGF0ZSA9IERhdGU7XG4gICAgLy8gRGF0ZShhbnl0aGluZykgZ2l2ZXMgYSBzdHJpbmcgd2l0aCB0aGUgY3VycmVudCB0aW1lXG4gICAgLy8gbmV3IERhdGUoeCkgY29lcmNlcyB4IGludG8gYSBudW1iZXIgYW5kIHRoZW4gcmV0dXJucyBhIERhdGVcbiAgICAvLyBuZXcgRGF0ZSgpIHJldHVybnMgdGhlIGN1cnJlbnQgdGltZSwgYXMgYSBEYXRlIG9iamVjdFxuICAgIC8vIG5ldyBEYXRlKHVuZGVmaW5lZCkgcmV0dXJucyBhIERhdGUgb2JqZWN0IHdoaWNoIHN0cmluZ2lmaWVzIHRvICdJbnZhbGlkIERhdGUnXG5cbiAgICBjb25zdCBuZXdEYXRlQ29uc3RydWN0b3IgPSBmdW5jdGlvbiBEYXRlKC4uLmFyZ3MpIHtcbiAgICAgIGlmIChuZXcudGFyZ2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gd2Ugd2VyZSBub3QgY2FsbGVkIGFzIGEgY29uc3RydWN0b3JcbiAgICAgICAgLy8gdGhpcyB3b3VsZCBub3JtYWxseSByZXR1cm4gYSBzdHJpbmcgd2l0aCB0aGUgY3VycmVudCB0aW1lXG4gICAgICAgIHJldHVybiAnSW52YWxpZCBEYXRlJztcbiAgICAgIH1cbiAgICAgIC8vIGNvbnN0cnVjdG9yIGJlaGF2aW9yOiBpZiB3ZSBnZXQgYXJndW1lbnRzLCB3ZSBjYW4gc2FmZWx5IHBhc3MgdGhlbSB0aHJvdWdoXG4gICAgICBpZiAoYXJncy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiBSZWZsZWN0LmNvbnN0cnVjdCh1bnNhZmVEYXRlLCBhcmdzLCBuZXcudGFyZ2V0KTtcbiAgICAgICAgLy8gdG9kbzogdGVzdCB0aGF0IG91ciBjb25zdHJ1Y3RvciBjYW4gc3RpbGwgYmUgc3ViY2xhc3NlZFxuICAgICAgfVxuICAgICAgLy8gbm8gYXJndW1lbnRzOiByZXR1cm4gYSBEYXRlIG9iamVjdCwgYnV0IGludmFsaWRcbiAgICAgIHJldHVybiBSZWZsZWN0LmNvbnN0cnVjdCh1bnNhZmVEYXRlLCBbTmFOXSwgbmV3LnRhcmdldCk7XG4gICAgfTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFxuICAgICAgbmV3RGF0ZUNvbnN0cnVjdG9yLFxuICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnModW5zYWZlRGF0ZSksXG4gICAgKTtcbiAgICAvLyB0aGF0IHdpbGwgY29weSB0aGUgLnByb3RvdHlwZSB0b28sIHNvIHRoaXMgbmV4dCBsaW5lIGlzIHVubmVjZXNzYXJ5XG4gICAgLy8gbmV3RGF0ZUNvbnN0cnVjdG9yLnByb3RvdHlwZSA9IHVuc2FmZURhdGUucHJvdG90eXBlO1xuICAgIHVuc2FmZURhdGUucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gbmV3RGF0ZUNvbnN0cnVjdG9yO1xuICAgIC8vIGRpc2FibGUgRGF0ZS5ub3dcbiAgICBuZXdEYXRlQ29uc3RydWN0b3Iubm93ID0gKCkgPT4gTmFOO1xuXG4gICAgRGF0ZSA9IG5ld0RhdGVDb25zdHJ1Y3RvcjsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1nbG9iYWwtYXNzaWduXG4gIH1cblxuICBmdW5jdGlvbiB0YW1lTWF0aCgpIHtcbiAgICAvLyBNYXRoLnJhbmRvbSA9ICgpID0+IDQ7IC8vIGh0dHBzOi8vd3d3LnhrY2QuY29tLzIyMVxuICAgIE1hdGgucmFuZG9tID0gKCkgPT4ge1xuICAgICAgdGhyb3cgRXJyb3IoJ2Rpc2FibGVkJyk7XG4gICAgfTtcbiAgfVxuXG4gIC8qIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1yZWRlY2xhcmUgKi9cbiAgLyogZ2xvYmFsIEludGwgKi9cblxuICBmdW5jdGlvbiB0YW1lSW50bCgpIHtcbiAgICAvLyB0b2RvOiBzb21laG93IGZpeCB0aGVzZS4gVGhlc2UgYWxtb3N0IGNlcnRhaW5seSBkb24ndCBlbmFibGUgdGhlIHJlYWRpbmdcbiAgICAvLyBvZiBzaWRlLWNoYW5uZWxzLCBidXQgd2Ugd2FudCB0aGluZ3MgdG8gYmUgZGV0ZXJtaW5pc3RpYyBhY3Jvc3NcbiAgICAvLyBydW50aW1lcy4gQmVzdCBiZXQgaXMgdG8ganVzdCBkaXNhbGxvdyBjYWxsaW5nIHRoZXNlIGZ1bmN0aW9ucyB3aXRob3V0XG4gICAgLy8gYW4gZXhwbGljaXQgbG9jYWxlIG5hbWUuXG5cbiAgICAvLyB0aGUgd2hpdGVsaXN0IG1heSBoYXZlIGRlbGV0ZWQgSW50bCBlbnRpcmVseSwgc28gdG9sZXJhdGUgdGhhdFxuICAgIGlmICh0eXBlb2YgSW50bCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIEludGwuRGF0ZVRpbWVGb3JtYXQgPSAoKSA9PiB7XG4gICAgICAgIHRocm93IEVycm9yKCdkaXNhYmxlZCcpO1xuICAgICAgfTtcbiAgICAgIEludGwuTnVtYmVyRm9ybWF0ID0gKCkgPT4ge1xuICAgICAgICB0aHJvdyBFcnJvcignZGlzYWJsZWQnKTtcbiAgICAgIH07XG4gICAgICBJbnRsLmdldENhbm9uaWNhbExvY2FsZXMgPSAoKSA9PiB7XG4gICAgICAgIHRocm93IEVycm9yKCdkaXNhYmxlZCcpO1xuICAgICAgfTtcbiAgICB9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWV4dGVuZC1uYXRpdmVcbiAgICBPYmplY3QucHJvdG90eXBlLnRvTG9jYWxlU3RyaW5nID0gKCkgPT4ge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCd0b0xvY2FsZVN0cmluZyBzdXBwcmVzc2VkJyk7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRhbWVFcnJvcigpIHtcbiAgICBpZiAoIU9iamVjdC5pc0V4dGVuc2libGUoRXJyb3IpKSB7XG4gICAgICB0aHJvdyBFcnJvcignaHVoIEVycm9yIGlzIG5vdCBleHRlbnNpYmxlJyk7XG4gICAgfVxuICAgIC8qIHRoaXMgd29ya2VkIGJhY2sgd2hlbiB3ZSB3ZXJlIHJ1bm5pbmcgaXQgb24gYSBnbG9iYWwsIGJ1dCBzdG9wcGVkXG4gICAgd29ya2luZyB3aGVuIHdlIHR1cm5lZCBpdCBpbnRvIGEgc2hpbSAqL1xuICAgIC8qXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEVycm9yLnByb3RvdHlwZSwgXCJzdGFja1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7IGdldCgpIHsgcmV0dXJuICdzdGFjayBzdXBwcmVzc2VkJzsgfSB9KTtcbiAgICAqL1xuICAgIGRlbGV0ZSBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZTtcbiAgICBpZiAoJ2NhcHR1cmVTdGFja1RyYWNlJyBpbiBFcnJvcikge1xuICAgICAgdGhyb3cgRXJyb3IoJ2hleSB3ZSBjb3VsZCBub3QgcmVtb3ZlIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlJyk7XG4gICAgfVxuXG4gICAgLy8gd2UgbWlnaHQgZG8gdGhpcyBpbiB0aGUgZnV0dXJlXG4gICAgLypcbiAgICBjb25zdCB1bnNhZmVFcnJvciA9IEVycm9yO1xuICAgIGNvbnN0IG5ld0Vycm9yQ29uc3RydWN0b3IgPSBmdW5jdGlvbiBFcnJvciguLi5hcmdzKSB7XG4gICAgICByZXR1cm4gUmVmbGVjdC5jb25zdHJ1Y3QodW5zYWZlRXJyb3IsIGFyZ3MsIG5ldy50YXJnZXQpO1xuICAgIH07XG5cbiAgICBuZXdFcnJvckNvbnN0cnVjdG9yLnByb3RvdHlwZSA9IHVuc2FmZUVycm9yLnByb3RvdHlwZTtcbiAgICBuZXdFcnJvckNvbnN0cnVjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3QgPSBuZXdFcnJvckNvbnN0cnVjdG9yO1xuXG4gICAgRXJyb3IgPSBuZXdFcnJvckNvbnN0cnVjdG9yO1xuXG4gICAgRXZhbEVycm9yLl9fcHJvdG9fXyA9IG5ld0Vycm9yQ29uc3RydWN0b3I7XG4gICAgUmFuZ2VFcnJvci5fX3Byb3RvX18gPSBuZXdFcnJvckNvbnN0cnVjdG9yO1xuICAgIFJlZmVyZW5jZUVycm9yLl9fcHJvdG9fXyA9IG5ld0Vycm9yQ29uc3RydWN0b3I7XG4gICAgU3ludGF4RXJyb3IuX19wcm90b19fID0gbmV3RXJyb3JDb25zdHJ1Y3RvcjtcbiAgICBUeXBlRXJyb3IuX19wcm90b19fID0gbmV3RXJyb3JDb25zdHJ1Y3RvcjtcbiAgICBVUklFcnJvci5fX3Byb3RvX18gPSBuZXdFcnJvckNvbnN0cnVjdG9yO1xuICAgICovXG4gIH1cblxuICBmdW5jdGlvbiB0YW1lUmVnRXhwKCkge1xuICAgIGRlbGV0ZSBSZWdFeHAucHJvdG90eXBlLmNvbXBpbGU7XG4gICAgaWYgKCdjb21waWxlJyBpbiBSZWdFeHAucHJvdG90eXBlKSB7XG4gICAgICB0aHJvdyBFcnJvcignaGV5IHdlIGNvdWxkIG5vdCByZW1vdmUgUmVnRXhwLnByb3RvdHlwZS5jb21waWxlJyk7XG4gICAgfVxuXG4gICAgLy8gV2Ugd2FudCB0byBkZWxldGUgUmVnRXhwLiQxLCBhcyB3ZWxsIGFzIGFueSBvdGhlciBzdXJwcmlzaW5nIHByb3BlcnRpZXMuXG4gICAgLy8gT24gc29tZSBlbmdpbmVzIHdlIGNhbid0IGp1c3QgZG8gJ2RlbGV0ZSBSZWdFeHAuJDEnLlxuICAgIGNvbnN0IHVuc2FmZVJlZ0V4cCA9IFJlZ0V4cDtcblxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1nbG9iYWwtYXNzaWduXG4gICAgUmVnRXhwID0gZnVuY3Rpb24gUmVnRXhwKC4uLmFyZ3MpIHtcbiAgICAgIHJldHVybiBSZWZsZWN0LmNvbnN0cnVjdCh1bnNhZmVSZWdFeHAsIGFyZ3MsIG5ldy50YXJnZXQpO1xuICAgIH07XG4gICAgUmVnRXhwLnByb3RvdHlwZSA9IHVuc2FmZVJlZ0V4cC5wcm90b3R5cGU7XG4gICAgdW5zYWZlUmVnRXhwLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFJlZ0V4cDtcblxuICAgIGlmICgnJDEnIGluIFJlZ0V4cCkge1xuICAgICAgdGhyb3cgRXJyb3IoJ2hleSB3ZSBjb3VsZCBub3QgcmVtb3ZlIFJlZ0V4cC4kMScpO1xuICAgIH1cbiAgfVxuXG4gIC8qIGdsb2JhbCBnZXRBbm9uSW50cmluc2ljcyAqL1xuXG4gIC8vIENvcHlyaWdodCAoQykgMjAxMSBHb29nbGUgSW5jLlxuICAvLyBDb3B5cmlnaHQgKEMpIDIwMTggQWdvcmljXG4gIC8vXG4gIC8vIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gIC8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAgLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gIC8vXG4gIC8vIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICAvL1xuICAvLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gIC8vIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAgLy8gV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gIC8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAgLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG5cbiAgLyogVGhpcyBpcyBldmFsdWF0ZWQgaW4gYW4gZW52aXJvbm1lbnQgaW4gd2hpY2ggZ2V0QW5vbkludHJpbnNpY3MoKSBpc1xuICAgICBhbHJlYWR5IGRlZmluZWQgKGJ5IHByZXBlbmRpbmcgdGhlIGRlZmluaXRpb24gb2YgZ2V0QW5vbkludHJpbnNpY3MgdG8gdGhlXG4gICAgIHN0cmluZ2lmaWVkIHJlbW92ZVByb3BlcnRpZXMoKSksIGhlbmNlIHdlIGRvbid0IHVzZSB0aGUgZm9sbG93aW5nXG4gICAgIGltcG9ydCAqL1xuICAvLyBpbXBvcnQgeyBnZXRBbm9uSW50cmluc2ljcyB9IGZyb20gJy4vYW5vbkludHJpbnNpY3MuanMnO1xuXG4gIGZ1bmN0aW9uIHJlbW92ZVByb3BlcnRpZXMoZ2xvYmFsLCB3aGl0ZWxpc3QpIHtcbiAgICAvLyB3YWxrIGdsb2JhbCBvYmplY3QsIHRlc3QgYWdhaW5zdCB3aGl0ZWxpc3QsIGRlbGV0ZVxuXG4gICAgY29uc3QgdW5jdXJyeVRoaXMgPSBmbiA9PiAodGhpc0FyZywgLi4uYXJncykgPT5cbiAgICAgIFJlZmxlY3QuYXBwbHkoZm4sIHRoaXNBcmcsIGFyZ3MpO1xuICAgIGNvbnN0IHtcbiAgICAgIGdldE93blByb3BlcnR5RGVzY3JpcHRvcjogZ29wZCxcbiAgICAgIGdldE93blByb3BlcnR5TmFtZXM6IGdvcG4sXG4gICAgICBrZXlzLFxuICAgIH0gPSBPYmplY3Q7XG4gICAgY29uc3QgY2xlYW5pbmcgPSBuZXcgV2Vha01hcCgpO1xuICAgIGNvbnN0IGdldFByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mO1xuICAgIGNvbnN0IGhvcCA9IHVuY3VycnlUaGlzKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkpO1xuXG4gICAgY29uc3Qgd2hpdGVUYWJsZSA9IG5ldyBXZWFrTWFwKCk7XG5cbiAgICBmdW5jdGlvbiBhZGRUb1doaXRlVGFibGUocm9vdFZhbHVlLCByb290UGVybWl0KSB7XG4gICAgICAvKipcbiAgICAgICAqIFRoZSB3aGl0ZVRhYmxlIHNob3VsZCBtYXAgZnJvbSBlYWNoIHBhdGgtYWNjZXNzaWJsZSBwcmltb3JkaWFsXG4gICAgICAgKiBvYmplY3QgdG8gdGhlIHBlcm1pdCBvYmplY3QgdGhhdCBkZXNjcmliZXMgaG93IGl0IHNob3VsZCBiZVxuICAgICAgICogY2xlYW5lZC5cbiAgICAgICAqXG4gICAgICAgKiBXZSBpbml0aWFsaXplIHRoZSB3aGl0ZVRhYmxlIG9ubHkgc28gdGhhdCB7QGNvZGUgZ2V0UGVybWl0fSBjYW5cbiAgICAgICAqIHByb2Nlc3MgXCIqXCIgaW5oZXJpdGFuY2UgdXNpbmcgdGhlIHdoaXRlbGlzdCwgYnkgd2Fsa2luZyBhY3R1YWxcbiAgICAgICAqIGluaGVyaXRhbmNlIGNoYWlucy5cbiAgICAgICAqL1xuICAgICAgY29uc3Qgd2hpdGVsaXN0U3ltYm9scyA9IFt0cnVlLCBmYWxzZSwgJyonLCAnbWF5YmVBY2Nlc3NvciddO1xuICAgICAgZnVuY3Rpb24gcmVnaXN0ZXIodmFsdWUsIHBlcm1pdCkge1xuICAgICAgICBpZiAodmFsdWUgIT09IE9iamVjdCh2YWx1ZSkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBwZXJtaXQgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgaWYgKHdoaXRlbGlzdFN5bWJvbHMuaW5kZXhPZihwZXJtaXQpIDwgMCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICBgc3ludGF4IGVycm9yIGluIHdoaXRlbGlzdDsgdW5leHBlY3RlZCB2YWx1ZTogJHtwZXJtaXR9YCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAod2hpdGVUYWJsZS5oYXModmFsdWUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdwcmltb3JkaWFsIHJlYWNoYWJsZSB0aHJvdWdoIG11bHRpcGxlIHBhdGhzJyk7XG4gICAgICAgIH1cbiAgICAgICAgd2hpdGVUYWJsZS5zZXQodmFsdWUsIHBlcm1pdCk7XG4gICAgICAgIGtleXMocGVybWl0KS5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgICAgIC8vIFVzZSBnb3BkIHRvIGF2b2lkIGludm9raW5nIGFuIGFjY2Vzc29yIHByb3BlcnR5LlxuICAgICAgICAgIC8vIEFjY2Vzc29yIHByb3BlcnRpZXMgZm9yIHdoaWNoIHBlcm1pdCAhPT0gJ21heWJlQWNjZXNzb3InXG4gICAgICAgICAgLy8gYXJlIGNhdWdodCBsYXRlciBieSBjbGVhbigpLlxuICAgICAgICAgIGNvbnN0IGRlc2MgPSBnb3BkKHZhbHVlLCBuYW1lKTtcbiAgICAgICAgICBpZiAoZGVzYykge1xuICAgICAgICAgICAgcmVnaXN0ZXIoZGVzYy52YWx1ZSwgcGVybWl0W25hbWVdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmVnaXN0ZXIocm9vdFZhbHVlLCByb290UGVybWl0KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTaG91bGQgdGhlIHByb3BlcnR5IG5hbWVkIHtAY29kZSBuYW1lfSBiZSB3aGl0ZWxpc3RlZCBvbiB0aGVcbiAgICAgKiB7QGNvZGUgYmFzZX0gb2JqZWN0LCBhbmQgaWYgc28sIHdpdGggd2hhdCBQZXJtaXQ/XG4gICAgICpcbiAgICAgKiA8cD5JZiBpdCBzaG91bGQgYmUgcGVybWl0dGVkLCByZXR1cm4gdGhlIFBlcm1pdCAod2hlcmUgUGVybWl0ID1cbiAgICAgKiB0cnVlIHwgXCJtYXliZUFjY2Vzc29yXCIgfCBcIipcIiB8IFJlY29yZChQZXJtaXQpKSwgYWxsIG9mIHdoaWNoIGFyZVxuICAgICAqIHRydXRoeS4gSWYgaXQgc2hvdWxkIG5vdCBiZSBwZXJtaXR0ZWQsIHJldHVybiBmYWxzZS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRQZXJtaXQoYmFzZSwgbmFtZSkge1xuICAgICAgbGV0IHBlcm1pdCA9IHdoaXRlVGFibGUuZ2V0KGJhc2UpO1xuICAgICAgaWYgKHBlcm1pdCkge1xuICAgICAgICBpZiAoaG9wKHBlcm1pdCwgbmFtZSkpIHtcbiAgICAgICAgICByZXR1cm4gcGVybWl0W25hbWVdO1xuICAgICAgICB9XG4gICAgICAgIC8vIEFsbG93IGVzY2FwaW5nIG9mIG1hZ2ljYWwgbmFtZXMgbGlrZSAnX19wcm90b19fJy5cbiAgICAgICAgaWYgKGhvcChwZXJtaXQsIGBFU0NBUEUke25hbWV9YCkpIHtcbiAgICAgICAgICByZXR1cm4gcGVybWl0W2BFU0NBUEUke25hbWV9YF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zdGFudC1jb25kaXRpb25cbiAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIGJhc2UgPSBnZXRQcm90byhiYXNlKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1wYXJhbS1yZWFzc2lnblxuICAgICAgICBpZiAoYmFzZSA9PT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwZXJtaXQgPSB3aGl0ZVRhYmxlLmdldChiYXNlKTtcbiAgICAgICAgaWYgKHBlcm1pdCAmJiBob3AocGVybWl0LCBuYW1lKSkge1xuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHBlcm1pdFtuYW1lXTtcbiAgICAgICAgICBpZiAocmVzdWx0ID09PSAnKicpIHtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYWxsIG5vbi13aGl0ZWxpc3RlZCBwcm9wZXJ0aWVzIGZvdW5kIGJ5IHJlY3Vyc2l2ZWx5IGFuZFxuICAgICAqIHJlZmxlY3RpdmVseSB3YWxraW5nIG93biBwcm9wZXJ0eSBjaGFpbnMuXG4gICAgICpcbiAgICAgKiA8cD5Jbmhlcml0ZWQgcHJvcGVydGllcyBhcmUgbm90IGNoZWNrZWQsIGJlY2F1c2Ugd2UgcmVxdWlyZSB0aGF0XG4gICAgICogaW5oZXJpdGVkLWZyb20gb2JqZWN0cyBhcmUgb3RoZXJ3aXNlIHJlYWNoYWJsZSBieSB0aGlzIHRyYXZlcnNhbC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjbGVhbih2YWx1ZSwgcHJlZml4LCBudW0pIHtcbiAgICAgIGlmICh2YWx1ZSAhPT0gT2JqZWN0KHZhbHVlKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoY2xlYW5pbmcuZ2V0KHZhbHVlKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHByb3RvID0gZ2V0UHJvdG8odmFsdWUpO1xuICAgICAgaWYgKHByb3RvICE9PSBudWxsICYmICF3aGl0ZVRhYmxlLmhhcyhwcm90bykpIHtcbiAgICAgICAgLy8gcmVwb3J0SXRlbVByb2JsZW0ocm9vdFJlcG9ydHMsIHNlcy5zZXZlcml0aWVzLk5PVF9JU09MQVRFRCxcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgICAndW5leHBlY3RlZCBpbnRyaW5zaWMnLCBwcmVmaXggKyAnLl9fcHJvdG9fXycpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHVuZXhwZWN0ZWQgaW50cmluc2ljICR7cHJlZml4fS5fX3Byb3RvX19gKTtcbiAgICAgIH1cblxuICAgICAgY2xlYW5pbmcuc2V0KHZhbHVlLCB0cnVlKTtcbiAgICAgIGdvcG4odmFsdWUpLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICAgIGNvbnN0IHBhdGggPSBwcmVmaXggKyAocHJlZml4ID8gJy4nIDogJycpICsgbmFtZTtcbiAgICAgICAgY29uc3QgcCA9IGdldFBlcm1pdCh2YWx1ZSwgbmFtZSk7XG4gICAgICAgIGlmIChwKSB7XG4gICAgICAgICAgY29uc3QgZGVzYyA9IGdvcGQodmFsdWUsIG5hbWUpO1xuICAgICAgICAgIGlmIChob3AoZGVzYywgJ3ZhbHVlJykpIHtcbiAgICAgICAgICAgIC8vIElzIGEgZGF0YSBwcm9wZXJ0eVxuICAgICAgICAgICAgY29uc3Qgc3ViVmFsdWUgPSBkZXNjLnZhbHVlO1xuICAgICAgICAgICAgY2xlYW4oc3ViVmFsdWUsIHBhdGgpO1xuICAgICAgICAgIH0gZWxzZSBpZiAocCAhPT0gJ21heWJlQWNjZXNzb3InKSB7XG4gICAgICAgICAgICAvLyBXZSBhcmUgbm90IHNheWluZyB0aGF0IGl0IGlzIHNhZmUgZm9yIHRoZSBwcm9wIHRvIGJlXG4gICAgICAgICAgICAvLyB1bmV4cGVjdGVkbHkgYW4gYWNjZXNzb3I7IHJhdGhlciwgaXQgd2lsbCBiZSBkZWxldGVkXG4gICAgICAgICAgICAvLyBhbmQgdGh1cyBtYWRlIHNhZmUuXG4gICAgICAgICAgICAvLyByZXBvcnRQcm9wZXJ0eShzZXMuc2V2ZXJpdGllcy5TQUZFX1NQRUNfVklPTEFUSU9OLFxuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAnTm90IGEgZGF0YSBwcm9wZXJ0eScsIHBhdGgpO1xuICAgICAgICAgICAgZGVsZXRlIHZhbHVlW25hbWVdOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXBhcmFtLXJlYXNzaWduXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNsZWFuKGRlc2MuZ2V0LCBgJHtwYXRofTxnZXR0ZXI+YCk7XG4gICAgICAgICAgICBjbGVhbihkZXNjLnNldCwgYCR7cGF0aH08c2V0dGVyPmApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgdmFsdWVbbmFtZV07IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tcGFyYW0tcmVhc3NpZ25cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgYWRkVG9XaGl0ZVRhYmxlKGdsb2JhbCwgd2hpdGVsaXN0Lm5hbWVkSW50cmluc2ljcyk7XG4gICAgY29uc3QgaW50ciA9IGdldEFub25JbnRyaW5zaWNzKGdsb2JhbCk7XG4gICAgYWRkVG9XaGl0ZVRhYmxlKGludHIsIHdoaXRlbGlzdC5hbm9uSW50cmluc2ljcyk7XG4gICAgY2xlYW4oZ2xvYmFsLCAnJyk7XG4gIH1cblxuICAvLyBDb3B5cmlnaHQgKEMpIDIwMTEgR29vZ2xlIEluYy5cbiAgLy8gQ29weXJpZ2h0IChDKSAyMDE4IEFnb3JpY1xuICAvL1xuICAvLyBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICAvLyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gIC8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICAvL1xuICAvLyBodHRwczovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gIC8vXG4gIC8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAgLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICAvLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAgLy8gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICAvLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblxuICAvLyBUT0RPKGVyaWdodHMpOiBXZSBzaG91bGQgdGVzdCBmb3JcbiAgLy8gV2Ugbm93IGhhdmUgYSByZWFzb24gdG8gb21pdCBQcm94eSBmcm9tIHRoZSB3aGl0ZWxpc3QuXG4gIC8vIFRoZSBtYWtlQnJhbmRUZXN0ZXIgaW4gcmVwYWlyRVM1IHVzZXMgQWxsZW4ncyB0cmljayBhdFxuICAvLyBodHRwczovL2VzZGlzY3Vzcy5vcmcvdG9waWMvdG9zdHJpbmd0YWctc3Bvb2ZpbmctZm9yLW51bGwtYW5kLXVuZGVmaW5lZCNjb250ZW50LTU5XG4gIC8vICwgYnV0IHRlc3RpbmcgcmV2ZWFscyB0aGF0LCBvbiBGRiAzNS4wLjEsIGEgcHJveHkgb24gYW4gZXhvdGljXG4gIC8vIG9iamVjdCBYIHdpbGwgcGFzcyB0aGlzIGJyYW5kIHRlc3Qgd2hlbiBYIHdpbGwuIFRoaXMgaXMgZml4ZWQgYXMgb2ZcbiAgLy8gRkYgTmlnaHRseSAzOC4wYTEuXG5cbiAgLyoqXG4gICAqIDxwPlF1YWxpZnlpbmcgcGxhdGZvcm1zIGdlbmVyYWxseSBpbmNsdWRlIGFsbCBKYXZhU2NyaXB0IHBsYXRmb3Jtc1xuICAgKiBzaG93biBvbiA8YSBocmVmPVwiaHR0cDovL2thbmdheC5naXRodWIuY29tL2VzNS1jb21wYXQtdGFibGUvXCJcbiAgICogPkVDTUFTY3JpcHQgNSBjb21wYXRpYmlsaXR5IHRhYmxlPC9hPiB0aGF0IGltcGxlbWVudCB7QGNvZGVcbiAgICogT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXN9LiBBdCB0aGUgdGltZSBvZiB0aGlzIHdyaXRpbmcsXG4gICAqIHF1YWxpZnlpbmcgYnJvd3NlcnMgYWxyZWFkeSBpbmNsdWRlIHRoZSBsYXRlc3QgcmVsZWFzZWQgdmVyc2lvbnMgb2ZcbiAgICogSW50ZXJuZXQgRXhwbG9yZXIgKDkpLCBGaXJlZm94ICg0KSwgQ2hyb21lICgxMSksIGFuZCBTYWZhcmlcbiAgICogKDUuMC41KSwgdGhlaXIgY29ycmVzcG9uZGluZyBzdGFuZGFsb25lIChlLmcuLCBzZXJ2ZXItc2lkZSkgSmF2YVNjcmlwdFxuICAgKiBlbmdpbmVzLCBSaGlubyAxLjczLCBhbmQgQkVTRU4uXG4gICAqXG4gICAqIDxwPk9uIHN1Y2ggbm90LXF1aXRlLUVTNSBwbGF0Zm9ybXMsIHNvbWUgZWxlbWVudHMgb2YgdGhlc2VcbiAgICogZW11bGF0aW9ucyBtYXkgbG9zZSBTRVMgc2FmZXR5LCBhcyBlbnVtZXJhdGVkIGluIHRoZSBjb21tZW50IG9uXG4gICAqIGVhY2ggcHJvYmxlbSByZWNvcmQgaW4gdGhlIHtAY29kZSBiYXNlUHJvYmxlbXN9IGFuZCB7QGNvZGVcbiAgICogc3VwcG9ydGVkUHJvYmxlbXN9IGFycmF5IGJlbG93LiBUaGUgcGxhdGZvcm0gbXVzdCBhdCBsZWFzdCBwcm92aWRlXG4gICAqIHtAY29kZSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lc30sIGJlY2F1c2UgaXQgY2Fubm90IHJlYXNvbmFibHkgYmVcbiAgICogZW11bGF0ZWQuXG4gICAqXG4gICAqIDxwPlRoaXMgZmlsZSBpcyB1c2VmdWwgYnkgaXRzZWxmLCBhcyBpdCBoYXMgbm8gZGVwZW5kZW5jaWVzIG9uIHRoZVxuICAgKiByZXN0IG9mIFNFUy4gSXQgY3JlYXRlcyBubyBuZXcgZ2xvYmFsIGJpbmRpbmdzLCBidXQgbWVyZWx5IHJlcGFpcnNcbiAgICogc3RhbmRhcmQgZ2xvYmFscyBvciBzdGFuZGFyZCBlbGVtZW50cyByZWFjaGFibGUgZnJvbSBzdGFuZGFyZFxuICAgKiBnbG9iYWxzLiBJZiB0aGUgZnV0dXJlLXN0YW5kYXJkIHtAY29kZSBXZWFrTWFwfSBnbG9iYWwgaXMgcHJlc2VudCxcbiAgICogYXMgaXQgaXMgY3VycmVudGx5IG9uIEZGNy4wYTEsIHRoZW4gaXQgd2lsbCByZXBhaXIgaXQgaW4gcGxhY2UuIFRoZVxuICAgKiBvbmUgbm9uLXN0YW5kYXJkIGVsZW1lbnQgdGhhdCB0aGlzIGZpbGUgdXNlcyBpcyB7QGNvZGUgY29uc29sZX0gaWZcbiAgICogcHJlc2VudCwgaW4gb3JkZXIgdG8gcmVwb3J0IHRoZSByZXBhaXJzIGl0IGZvdW5kIG5lY2Vzc2FyeSwgaW5cbiAgICogd2hpY2ggY2FzZSB3ZSB1c2UgaXRzIHtAY29kZSBsb2csIGluZm8sIHdhcm59LCBhbmQge0Bjb2RlIGVycm9yfVxuICAgKiBtZXRob2RzLiBJZiB7QGNvZGUgY29uc29sZS5sb2d9IGlzIGFic2VudCwgdGhlbiB0aGlzIGZpbGUgcGVyZm9ybXNcbiAgICogaXRzIHJlcGFpcnMgc2lsZW50bHkuXG4gICAqXG4gICAqIDxwPkdlbmVyYWxseSwgdGhpcyBmaWxlIHNob3VsZCBiZSBydW4gYXMgdGhlIGZpcnN0IHNjcmlwdCBpbiBhXG4gICAqIEphdmFTY3JpcHQgY29udGV4dCAoaS5lLiBhIGJyb3dzZXIgZnJhbWUpLCBhcyBpdCByZWxpZXMgb24gb3RoZXJcbiAgICogcHJpbW9yZGlhbCBvYmplY3RzIGFuZCBtZXRob2RzIG5vdCB5ZXQgYmVpbmcgcGVydHVyYmVkLlxuICAgKlxuICAgKiA8cD5UT0RPKGVyaWdodHMpOiBUaGlzIGZpbGUgdHJpZXMgdG8gcHJvdGVjdCBpdHNlbGYgZnJvbSBzb21lXG4gICAqIHBvc3QtaW5pdGlhbGl6YXRpb24gcGVydHVyYmF0aW9uIGJ5IHN0YXNoaW5nIHNvbWUgb2YgdGhlXG4gICAqIHByaW1vcmRpYWxzIGl0IG5lZWRzIGZvciBsYXRlciB1c2UsIGJ1dCB0aGlzIGF0dGVtcHQgaXMgY3VycmVudGx5XG4gICAqIGluY29tcGxldGUuIFdlIG5lZWQgdG8gcmV2aXNpdCB0aGlzIHdoZW4gd2Ugc3VwcG9ydCBDb25maW5lZC1FUzUsXG4gICAqIGFzIGEgdmFyaWFudCBvZiBTRVMgaW4gd2hpY2ggdGhlIHByaW1vcmRpYWxzIGFyZSBub3QgZnJvemVuLiBTZWVcbiAgICogcHJldmlvdXMgZmFpbGVkIGF0dGVtcHQgYXQgPGFcbiAgICogaHJlZj1cImh0dHBzOi8vY29kZXJldmlldy5hcHBzcG90LmNvbS81Mjc4MDQ2L1wiID5TcGVlZHMgdXBcbiAgICogV2Vha01hcC4gUHJlcGFyaW5nIHRvIHN1cHBvcnQgdW5mcm96ZW4gcHJpbW9yZGlhbHMuPC9hPi4gRnJvbVxuICAgKiBhbmFseXNpcyBvZiB0aGlzIGZhaWxlZCBhdHRlbXB0LCBpdCBzZWVtcyB0aGF0IHRoZSBvbmx5IHByYWN0aWNhbFxuICAgKiB3YXkgdG8gc3VwcG9ydCBDRVMgaXMgYnkgdXNlIG9mIHR3byBmcmFtZXMsIHdoZXJlIG1vc3Qgb2YgaW5pdFNFU1xuICAgKiBydW5zIGluIGEgU0VTIGZyYW1lLCBhbmQgc28gY2FuIGF2b2lkIHdvcnJ5aW5nIGFib3V0IG1vc3Qgb2YgdGhlc2VcbiAgICogcGVydHVyYmF0aW9ucy5cbiAgICovXG4gIGZ1bmN0aW9uIGdldEFub25JbnRyaW5zaWNzJDEoZ2xvYmFsKSB7XG5cbiAgICBjb25zdCBnb3BkID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcjtcbiAgICBjb25zdCBnZXRQcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZjtcblxuICAgIC8vIC8vLy8vLy8vLy8vLy8vIFVuZGVuaWFibGVzIGFuZCBJbnRyaW5zaWNzIC8vLy8vLy8vLy8vLy8vXG5cbiAgICAvKipcbiAgICAgKiBUaGUgdW5kZW5pYWJsZXMgYXJlIHRoZSBwcmltb3JkaWFsIG9iamVjdHMgd2hpY2ggYXJlIGFtYmllbnRseVxuICAgICAqIHJlYWNoYWJsZSB2aWEgY29tcG9zaXRpb25zIG9mIHN0cmljdCBzeW50YXgsIHByaW1pdGl2ZSB3cmFwcGluZ1xuICAgICAqIChuZXcgT2JqZWN0KHgpKSwgYW5kIHByb3RvdHlwZSBuYXZpZ2F0aW9uICh0aGUgZXF1aXZhbGVudCBvZlxuICAgICAqIE9iamVjdC5nZXRQcm90b3R5cGVPZih4KSBvciB4Ll9fcHJvdG9fXykuIEFsdGhvdWdoIHdlIGNvdWxkIGluXG4gICAgICogdGhlb3J5IG1vbmtleSBwYXRjaCBwcmltaXRpdmUgd3JhcHBpbmcgb3IgcHJvdG90eXBlIG5hdmlnYXRpb24sXG4gICAgICogd2Ugd29uJ3QuIEhlbmNlLCB3aXRob3V0IHBhcnNpbmcsIHRoZSBmb2xsb3dpbmcgYXJlIHVuZGVuaWFibGUgbm9cbiAgICAgKiBtYXR0ZXIgd2hhdCA8aT5vdGhlcjwvaT4gbW9ua2V5IHBhdGNoaW5nIHdlIGRvIHRvIHRoZSBwcmltb3JkaWFsXG4gICAgICogZW52aXJvbm1lbnQuXG4gICAgICovXG5cbiAgICAvLyBUaGUgZmlyc3QgZWxlbWVudCBvZiBlYWNoIHVuZGVuaWFibGVUdXBsZSBpcyBhIHN0cmluZyB1c2VkIHRvXG4gICAgLy8gbmFtZSB0aGUgdW5kZW5pYWJsZSBvYmplY3QgZm9yIHJlcG9ydGluZyBwdXJwb3Nlcy4gSXQgaGFzIG5vXG4gICAgLy8gb3RoZXIgcHJvZ3JhbW1hdGljIHVzZS5cbiAgICAvL1xuICAgIC8vIFRoZSBzZWNvbmQgZWxlbWVudCBvZiBlYWNoIHVuZGVuaWFibGVUdXBsZSBzaG91bGQgYmUgdGhlXG4gICAgLy8gdW5kZW5pYWJsZSBpdHNlbGYuXG4gICAgLy9cbiAgICAvLyBUaGUgb3B0aW9uYWwgdGhpcmQgZWxlbWVudCBvZiB0aGUgdW5kZW5pYWJsZVR1cGxlLCBpZiBwcmVzZW50LFxuICAgIC8vIHNob3VsZCBiZSBhbiBleGFtcGxlIG9mIHN5bnRheCwgcmF0aGVyIHRoYW4gdXNlIG9mIGEgbW9ua2V5XG4gICAgLy8gcGF0Y2hhYmxlIEFQSSwgZXZhbHVhdGluZyB0byBhIHZhbHVlIGZyb20gd2hpY2ggdGhlIHVuZGVuaWFibGVcbiAgICAvLyBvYmplY3QgaW4gdGhlIHNlY29uZCBlbGVtZW50IGNhbiBiZSByZWFjaGVkIGJ5IG9ubHkgdGhlXG4gICAgLy8gZm9sbG93aW5nIHN0ZXBzOlxuICAgIC8vIElmIHRoZSB2YWx1ZSBpcyBwcmltaXR2ZSwgY29udmVydCB0byBhbiBPYmplY3Qgd3JhcHBlci5cbiAgICAvLyBJcyB0aGUgcmVzdWx0aW5nIG9iamVjdCBlaXRoZXIgdGhlIHVuZGVuaWFibGUgb2JqZWN0LCBvciBkb2VzXG4gICAgLy8gaXQgaW5oZXJpdCBkaXJlY3RseSBmcm9tIHRoZSB1bmRlbmlhYmxlIG9iamVjdD9cblxuICAgIGZ1bmN0aW9uKiBhU3RyaWN0R2VuZXJhdG9yKCkge30gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1lbXB0eS1mdW5jdGlvblxuICAgIGNvbnN0IEdlbmVyYXRvciA9IGdldFByb3RvKGFTdHJpY3RHZW5lcmF0b3IpO1xuICAgIGFzeW5jIGZ1bmN0aW9uKiBhU3RyaWN0QXN5bmNHZW5lcmF0b3IoKSB7fSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWVtcHR5LWZ1bmN0aW9uXG4gICAgY29uc3QgQXN5bmNHZW5lcmF0b3IgPSBnZXRQcm90byhhU3RyaWN0QXN5bmNHZW5lcmF0b3IpO1xuICAgIGFzeW5jIGZ1bmN0aW9uIGFTdHJpY3RBc3luY0Z1bmN0aW9uKCkge30gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1lbXB0eS1mdW5jdGlvblxuICAgIGNvbnN0IEFzeW5jRnVuY3Rpb25Qcm90b3R5cGUgPSBnZXRQcm90byhhU3RyaWN0QXN5bmNGdW5jdGlvbik7XG5cbiAgICAvLyBUT0RPOiB0aGlzIGlzIGRlYWQgY29kZSwgYnV0IGNvdWxkIGJlIHVzZWZ1bDogbWFrZSB0aGlzIHRoZVxuICAgIC8vICd1bmRlbmlhYmxlcycgb2JqZWN0IGF2YWlsYWJsZSB2aWEgc29tZSBBUEkuXG5cbiAgICBjb25zdCB1bmRlbmlhYmxlVHVwbGVzID0gW1xuICAgICAgWydPYmplY3QucHJvdG90eXBlJywgT2JqZWN0LnByb3RvdHlwZSwge31dLFxuICAgICAgWydGdW5jdGlvbi5wcm90b3R5cGUnLCBGdW5jdGlvbi5wcm90b3R5cGUsIGZ1bmN0aW9uIGZvbygpIHt9XSxcbiAgICAgIFsnQXJyYXkucHJvdG90eXBlJywgQXJyYXkucHJvdG90eXBlLCBbXV0sXG4gICAgICBbJ1JlZ0V4cC5wcm90b3R5cGUnLCBSZWdFeHAucHJvdG90eXBlLCAveC9dLFxuICAgICAgWydCb29sZWFuLnByb3RvdHlwZScsIEJvb2xlYW4ucHJvdG90eXBlLCB0cnVlXSxcbiAgICAgIFsnTnVtYmVyLnByb3RvdHlwZScsIE51bWJlci5wcm90b3R5cGUsIDFdLFxuICAgICAgWydTdHJpbmcucHJvdG90eXBlJywgU3RyaW5nLnByb3RvdHlwZSwgJ3gnXSxcbiAgICAgIFsnJUdlbmVyYXRvciUnLCBHZW5lcmF0b3IsIGFTdHJpY3RHZW5lcmF0b3JdLFxuICAgICAgWyclQXN5bmNHZW5lcmF0b3IlJywgQXN5bmNHZW5lcmF0b3IsIGFTdHJpY3RBc3luY0dlbmVyYXRvcl0sXG4gICAgICBbJyVBc3luY0Z1bmN0aW9uJScsIEFzeW5jRnVuY3Rpb25Qcm90b3R5cGUsIGFTdHJpY3RBc3luY0Z1bmN0aW9uXSxcbiAgICBdO1xuXG4gICAgdW5kZW5pYWJsZVR1cGxlcy5mb3JFYWNoKHR1cGxlID0+IHtcbiAgICAgIGNvbnN0IG5hbWUgPSB0dXBsZVswXTtcbiAgICAgIGNvbnN0IHVuZGVuaWFibGUgPSB0dXBsZVsxXTtcbiAgICAgIGxldCBzdGFydCA9IHR1cGxlWzJdO1xuICAgICAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgc3RhcnQgPSBPYmplY3Qoc3RhcnQpO1xuICAgICAgaWYgKHVuZGVuaWFibGUgPT09IHN0YXJ0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh1bmRlbmlhYmxlID09PSBnZXRQcm90byhzdGFydCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIHVuZGVuaWFibGU6ICR7dW5kZW5pYWJsZX1gKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIHJlZ2lzdGVySXRlcmF0b3JQcm90b3MocmVnaXN0ZXJ5LCBiYXNlLCBuYW1lKSB7XG4gICAgICBjb25zdCBpdGVyYXRvclN5bSA9XG4gICAgICAgIChnbG9iYWwuU3ltYm9sICYmIGdsb2JhbC5TeW1ib2wuaXRlcmF0b3IpIHx8ICdAQGl0ZXJhdG9yJzsgLy8gdXNlZCBpbnN0ZWFkIG9mIGEgc3ltYm9sIG9uIEZGMzVcblxuICAgICAgaWYgKGJhc2VbaXRlcmF0b3JTeW1dKSB7XG4gICAgICAgIGNvbnN0IGFuSXRlciA9IGJhc2VbaXRlcmF0b3JTeW1dKCk7XG4gICAgICAgIGNvbnN0IGFuSXRlcmF0b3JQcm90b3R5cGUgPSBnZXRQcm90byhhbkl0ZXIpO1xuICAgICAgICByZWdpc3RlcnlbbmFtZV0gPSBhbkl0ZXJhdG9yUHJvdG90eXBlOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXBhcmFtLXJlYXNzaWduXG4gICAgICAgIGNvbnN0IGFuSXRlclByb3RvQmFzZSA9IGdldFByb3RvKGFuSXRlcmF0b3JQcm90b3R5cGUpO1xuICAgICAgICBpZiAoYW5JdGVyUHJvdG9CYXNlICE9PSBPYmplY3QucHJvdG90eXBlKSB7XG4gICAgICAgICAgaWYgKCFyZWdpc3RlcnkuSXRlcmF0b3JQcm90b3R5cGUpIHtcbiAgICAgICAgICAgIGlmIChnZXRQcm90byhhbkl0ZXJQcm90b0Jhc2UpICE9PSBPYmplY3QucHJvdG90eXBlKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICAnJUl0ZXJhdG9yUHJvdG90eXBlJS5fX3Byb3RvX18gd2FzIG5vdCBPYmplY3QucHJvdG90eXBlJyxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlZ2lzdGVyeS5JdGVyYXRvclByb3RvdHlwZSA9IGFuSXRlclByb3RvQmFzZTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1wYXJhbS1yZWFzc2lnblxuICAgICAgICAgIH0gZWxzZSBpZiAocmVnaXN0ZXJ5Lkl0ZXJhdG9yUHJvdG90eXBlICE9PSBhbkl0ZXJQcm90b0Jhc2UpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgdW5leHBlY3RlZCAlJHtuYW1lfSUuX19wcm90b19fYCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBpbnRyaW5zaWNzIG5vdCBvdGhlcndpc2UgcmVhY2hhYmxlIGJ5IG5hbWVkIG93biBwcm9wZXJ0eVxuICAgICAqIHRyYXZlcnNhbC4gU2VlXG4gICAgICogaHR0cHM6Ly9wZW9wbGUubW96aWxsYS5vcmcvfmpvcmVuZG9yZmYvZXM2LWRyYWZ0Lmh0bWwjc2VjLXdlbGwta25vd24taW50cmluc2ljLW9iamVjdHNcbiAgICAgKiBhbmQgdGhlIGluc3RyaW5zaWNzIHNlY3Rpb24gb2Ygd2hpdGVsaXN0LmpzXG4gICAgICpcbiAgICAgKiA8cD5Vbmxpa2UgZ2V0VW5kZW5pYWJsZXMoKSwgdGhlIHJlc3VsdCBvZiBzYW1wbGVBbm9uSW50cmluc2ljcygpXG4gICAgICogZG9lcyBkZXBlbmQgb24gdGhlIGN1cnJlbnQgc3RhdGUgb2YgdGhlIHByaW1vcmRpYWxzLCBzbyB3ZSBtdXN0XG4gICAgICogcnVuIHRoaXMgYWdhaW4gYWZ0ZXIgYWxsIG90aGVyIHJlbGV2YW50IG1vbmtleSBwYXRjaGluZyBpcyBkb25lLFxuICAgICAqIGluIG9yZGVyIHRvIHByb3Blcmx5IGluaXRpYWxpemUgY2FqYVZNLmludHJpbnNpY3NcbiAgICAgKi9cblxuICAgIC8vIFRPRE86IHdlIGNhbiBwcm9iYWJseSB1bndyYXAgdGhpcyBpbnRvIHRoZSBvdXRlciBmdW5jdGlvbiwgYW5kIHN0b3BcbiAgICAvLyB1c2luZyBhIHNlcGFyYXRlbHkgbmFtZWQgJ3NhbXBsZUFub25JbnRyaW5zaWNzJ1xuICAgIGZ1bmN0aW9uIHNhbXBsZUFub25JbnRyaW5zaWNzKCkge1xuICAgICAgY29uc3QgcmVzdWx0ID0ge307XG5cbiAgICAgIC8vIElmIHRoZXJlIGFyZSBzdGlsbCBvdGhlciBUaHJvd1R5cGVFcnJvciBvYmplY3RzIGxlZnQgYWZ0ZXJcbiAgICAgIC8vIG5vRnVuY1BvaXNvbi1pbmcsIHRoaXMgc2hvdWxkIGJlIGNhdWdodCBieVxuICAgICAgLy8gdGVzdF9USFJPV1RZUEVFUlJPUl9OT1RfVU5JUVVFIGJlbG93LCBzbyB3ZSBhc3N1bWUgaGVyZSB0aGF0XG4gICAgICAvLyB0aGlzIGlzIHRoZSBvbmx5IHN1cnZpdmluZyBUaHJvd1R5cGVFcnJvciBpbnRyaW5zaWMuXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcHJlZmVyLXJlc3QtcGFyYW1zXG4gICAgICByZXN1bHQuVGhyb3dUeXBlRXJyb3IgPSBnb3BkKGFyZ3VtZW50cywgJ2NhbGxlZScpLmdldDtcblxuICAgICAgLy8gR2V0IHRoZSBFUzYgJUFycmF5SXRlcmF0b3JQcm90b3R5cGUlLFxuICAgICAgLy8gJVN0cmluZ0l0ZXJhdG9yUHJvdG90eXBlJSwgJU1hcEl0ZXJhdG9yUHJvdG90eXBlJSxcbiAgICAgIC8vICVTZXRJdGVyYXRvclByb3RvdHlwZSUgYW5kICVJdGVyYXRvclByb3RvdHlwZSUgaW50cmluc2ljcywgaWZcbiAgICAgIC8vIHByZXNlbnQuXG4gICAgICByZWdpc3Rlckl0ZXJhdG9yUHJvdG9zKHJlc3VsdCwgW10sICdBcnJheUl0ZXJhdG9yUHJvdG90eXBlJyk7XG4gICAgICByZWdpc3Rlckl0ZXJhdG9yUHJvdG9zKHJlc3VsdCwgJycsICdTdHJpbmdJdGVyYXRvclByb3RvdHlwZScpO1xuICAgICAgaWYgKHR5cGVvZiBNYXAgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmVnaXN0ZXJJdGVyYXRvclByb3RvcyhyZXN1bHQsIG5ldyBNYXAoKSwgJ01hcEl0ZXJhdG9yUHJvdG90eXBlJyk7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIFNldCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZWdpc3Rlckl0ZXJhdG9yUHJvdG9zKHJlc3VsdCwgbmV3IFNldCgpLCAnU2V0SXRlcmF0b3JQcm90b3R5cGUnKTtcbiAgICAgIH1cblxuICAgICAgLy8gR2V0IHRoZSBFUzYgJUdlbmVyYXRvckZ1bmN0aW9uJSBpbnRyaW5zaWMsIGlmIHByZXNlbnQuXG4gICAgICBpZiAoZ2V0UHJvdG8oR2VuZXJhdG9yKSAhPT0gRnVuY3Rpb24ucHJvdG90eXBlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignR2VuZXJhdG9yLl9fcHJvdG9fXyB3YXMgbm90IEZ1bmN0aW9uLnByb3RvdHlwZScpO1xuICAgICAgfVxuICAgICAgY29uc3QgR2VuZXJhdG9yRnVuY3Rpb24gPSBHZW5lcmF0b3IuY29uc3RydWN0b3I7XG4gICAgICBpZiAoZ2V0UHJvdG8oR2VuZXJhdG9yRnVuY3Rpb24pICE9PSBGdW5jdGlvbi5wcm90b3R5cGUuY29uc3RydWN0b3IpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdHZW5lcmF0b3JGdW5jdGlvbi5fX3Byb3RvX18gd2FzIG5vdCBGdW5jdGlvbi5wcm90b3R5cGUuY29uc3RydWN0b3InLFxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgcmVzdWx0LkdlbmVyYXRvckZ1bmN0aW9uID0gR2VuZXJhdG9yRnVuY3Rpb247XG4gICAgICBjb25zdCBnZW5Qcm90b0Jhc2UgPSBnZXRQcm90byhHZW5lcmF0b3IucHJvdG90eXBlKTtcbiAgICAgIGlmIChnZW5Qcm90b0Jhc2UgIT09IHJlc3VsdC5JdGVyYXRvclByb3RvdHlwZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQgR2VuZXJhdG9yLnByb3RvdHlwZS5fX3Byb3RvX18nKTtcbiAgICAgIH1cblxuICAgICAgLy8gR2V0IHRoZSBFUzYgJUFzeW5jR2VuZXJhdG9yRnVuY3Rpb24lIGludHJpbnNpYywgaWYgcHJlc2VudC5cbiAgICAgIGlmIChnZXRQcm90byhBc3luY0dlbmVyYXRvcikgIT09IEZ1bmN0aW9uLnByb3RvdHlwZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FzeW5jR2VuZXJhdG9yLl9fcHJvdG9fXyB3YXMgbm90IEZ1bmN0aW9uLnByb3RvdHlwZScpO1xuICAgICAgfVxuICAgICAgY29uc3QgQXN5bmNHZW5lcmF0b3JGdW5jdGlvbiA9IEFzeW5jR2VuZXJhdG9yLmNvbnN0cnVjdG9yO1xuICAgICAgaWYgKGdldFByb3RvKEFzeW5jR2VuZXJhdG9yRnVuY3Rpb24pICE9PSBGdW5jdGlvbi5wcm90b3R5cGUuY29uc3RydWN0b3IpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdBc3luY0dlbmVyYXRvckZ1bmN0aW9uLl9fcHJvdG9fXyB3YXMgbm90IEZ1bmN0aW9uLnByb3RvdHlwZS5jb25zdHJ1Y3RvcicsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICByZXN1bHQuQXN5bmNHZW5lcmF0b3JGdW5jdGlvbiA9IEFzeW5jR2VuZXJhdG9yRnVuY3Rpb247XG4gICAgICBjb25zdCBBc3luY0dlbmVyYXRvclByb3RvdHlwZSA9IEFzeW5jR2VuZXJhdG9yLnByb3RvdHlwZTtcbiAgICAgIHJlc3VsdC5Bc3luY0l0ZXJhdG9yUHJvdG90eXBlID0gZ2V0UHJvdG8oQXN5bmNHZW5lcmF0b3JQcm90b3R5cGUpO1xuICAgICAgLy8gaXQgYXBwZWFycyB0aGF0IHRoZSBvbmx5IHdheSB0byBnZXQgYW4gQXN5bmNJdGVyYXRvclByb3RvdHlwZSBpc1xuICAgICAgLy8gdGhyb3VnaCB0aGlzIGdldFByb3RvKCkgcHJvY2Vzcywgc28gdGhlcmUncyBub3RoaW5nIHRvIGNoZWNrIGl0XG4gICAgICAvLyBhZ2FpbnN0XG4gICAgICBpZiAoZ2V0UHJvdG8ocmVzdWx0LkFzeW5jSXRlcmF0b3JQcm90b3R5cGUpICE9PSBPYmplY3QucHJvdG90eXBlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnQXN5bmNJdGVyYXRvclByb3RvdHlwZS5fX3Byb3RvX18gd2FzIG5vdCBPYmplY3QucHJvdG90eXBlJyxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgLy8gR2V0IHRoZSBFUzYgJUFzeW5jRnVuY3Rpb24lIGludHJpbnNpYywgaWYgcHJlc2VudC5cbiAgICAgIGlmIChnZXRQcm90byhBc3luY0Z1bmN0aW9uUHJvdG90eXBlKSAhPT0gRnVuY3Rpb24ucHJvdG90eXBlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnQXN5bmNGdW5jdGlvblByb3RvdHlwZS5fX3Byb3RvX18gd2FzIG5vdCBGdW5jdGlvbi5wcm90b3R5cGUnLFxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgY29uc3QgQXN5bmNGdW5jdGlvbiA9IEFzeW5jRnVuY3Rpb25Qcm90b3R5cGUuY29uc3RydWN0b3I7XG4gICAgICBpZiAoZ2V0UHJvdG8oQXN5bmNGdW5jdGlvbikgIT09IEZ1bmN0aW9uLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ0FzeW5jRnVuY3Rpb24uX19wcm90b19fIHdhcyBub3QgRnVuY3Rpb24ucHJvdG90eXBlLmNvbnN0cnVjdG9yJyxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdC5Bc3luY0Z1bmN0aW9uID0gQXN5bmNGdW5jdGlvbjtcblxuICAgICAgLy8gR2V0IHRoZSBFUzYgJVR5cGVkQXJyYXklIGludHJpbnNpYywgaWYgcHJlc2VudC5cbiAgICAgIChmdW5jdGlvbiBnZXRUeXBlZEFycmF5KCkge1xuICAgICAgICBpZiAoIWdsb2JhbC5GbG9hdDMyQXJyYXkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgVHlwZWRBcnJheSA9IGdldFByb3RvKGdsb2JhbC5GbG9hdDMyQXJyYXkpO1xuICAgICAgICBpZiAoVHlwZWRBcnJheSA9PT0gRnVuY3Rpb24ucHJvdG90eXBlKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChnZXRQcm90byhUeXBlZEFycmF5KSAhPT0gRnVuY3Rpb24ucHJvdG90eXBlKSB7XG4gICAgICAgICAgLy8gaHR0cDovL2Jlc3Bpbi5jei9+b25kcmFzL2h0bWwvY2xhc3N2OF8xXzFBcnJheUJ1ZmZlclZpZXcuaHRtbFxuICAgICAgICAgIC8vIGhhcyBtZSB3b3JyaWVkIHRoYXQgc29tZW9uZSBtaWdodCBtYWtlIHN1Y2ggYW4gaW50ZXJtZWRpYXRlXG4gICAgICAgICAgLy8gb2JqZWN0IHZpc2libGUuXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUeXBlZEFycmF5Ll9fcHJvdG9fXyB3YXMgbm90IEZ1bmN0aW9uLnByb3RvdHlwZScpO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdC5UeXBlZEFycmF5ID0gVHlwZWRBcnJheTtcbiAgICAgIH0pKCk7XG5cbiAgICAgIE9iamVjdC5rZXlzKHJlc3VsdCkuZm9yRWFjaChuYW1lID0+IHtcbiAgICAgICAgaWYgKHJlc3VsdFtuYW1lXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNYWxmb3JtZWQgaW50cmluc2ljOiAke25hbWV9YCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIHJldHVybiBzYW1wbGVBbm9uSW50cmluc2ljcygpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0TmFtZWRJbnRyaW5zaWNzKHVuc2FmZUdsb2JhbCwgd2hpdGVsaXN0KSB7XG4gICAgY29uc3QgeyBkZWZpbmVQcm9wZXJ0eSwgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yLCBvd25LZXlzIH0gPSBSZWZsZWN0O1xuXG4gICAgY29uc3QgbmFtZWRJbnRyaW5zaWNzID0ge307XG5cbiAgICBjb25zdCBwcm9wZXJ0eU5hbWVzID0gb3duS2V5cyh3aGl0ZWxpc3QubmFtZWRJbnRyaW5zaWNzKTtcblxuICAgIGZvciAoY29uc3QgbmFtZSBvZiBwcm9wZXJ0eU5hbWVzKSB7XG4gICAgICBjb25zdCBkZXNjID0gZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHVuc2FmZUdsb2JhbCwgbmFtZSk7XG4gICAgICBpZiAoZGVzYykge1xuICAgICAgICAvLyBBYm9ydCBpZiBhbiBhY2Nlc3NvciBpcyBmb3VuZCBvbiB0aGUgdW5zYWZlIGdsb2JhbCBvYmplY3RcbiAgICAgICAgLy8gaW5zdGVhZCBvZiBhIGRhdGEgcHJvcGVydHkuIFdlIHNob3VsZCBuZXZlciBnZXQgaW50byB0aGlzXG4gICAgICAgIC8vIG5vbiBzdGFuZGFyZCBzaXR1YXRpb24uXG4gICAgICAgIGlmICgnZ2V0JyBpbiBkZXNjIHx8ICdzZXQnIGluIGRlc2MpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGB1bmV4cGVjdGVkIGFjY2Vzc29yIG9uIGdsb2JhbCBwcm9wZXJ0eTogJHtuYW1lfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgZGVmaW5lUHJvcGVydHkobmFtZWRJbnRyaW5zaWNzLCBuYW1lLCBkZXNjKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmFtZWRJbnRyaW5zaWNzO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0QWxsUHJpbW9yZGlhbHMoZ2xvYmFsLCBhbm9uSW50cmluc2ljcykge1xuXG4gICAgY29uc3Qgcm9vdCA9IHtcbiAgICAgIGdsb2JhbCwgLy8gZ2xvYmFsIHBsdXMgYWxsIHRoZSBuYW1lZEludHJpbnNpY3NcbiAgICAgIGFub25JbnRyaW5zaWNzLFxuICAgIH07XG4gICAgLy8gdG9kbzogcmUtZXhhbWluZSBleGFjdGx5IHdoaWNoIFwiZ2xvYmFsXCIgd2UncmUgZnJlZXppbmdcblxuICAgIHJldHVybiByb290O1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0QWxsUHJpbW9yZGlhbHMkMShuYW1lZEludHJpbnNpY3MsIGFub25JbnRyaW5zaWNzKSB7XG5cbiAgICBjb25zdCByb290ID0ge1xuICAgICAgbmFtZWRJbnRyaW5zaWNzLFxuICAgICAgYW5vbkludHJpbnNpY3MsXG4gICAgfTtcblxuICAgIHJldHVybiByb290O1xuICB9XG5cbiAgLy8gQ29weXJpZ2h0IChDKSAyMDExIEdvb2dsZSBJbmMuXG4gIC8vIENvcHlyaWdodCAoQykgMjAxOCBBZ29yaWNcbiAgLy9cbiAgLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAgLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICAvLyBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAgLy9cbiAgLy8gaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gIC8vXG4gIC8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAgLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICAvLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAgLy8gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICAvLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblxuICAvKipcbiAgICogQGZpbGVvdmVydmlldyBFeHBvcnRzIHtAY29kZSBzZXMud2hpdGVsaXN0fSwgYSByZWN1cnNpdmVseSBkZWZpbmVkXG4gICAqIEpTT04gcmVjb3JkIGVudW1lcmF0aW5nIGFsbCB0aGUgbmFtaW5nIHBhdGhzIGluIHRoZSBFUzUuMSBzcGVjLFxuICAgKiB0aG9zZSBkZS1mYWN0byBleHRlbnNpb25zIHRoYXQgd2UganVkZ2UgdG8gYmUgc2FmZSwgYW5kIFNFUyBhbmRcbiAgICogRHIuIFNFUyBleHRlbnNpb25zIHByb3ZpZGVkIGJ5IHRoZSBTRVMgcnVudGltZS5cbiAgICpcbiAgICogPHA+QXNzdW1lcyBvbmx5IEVTMy4gQ29tcGF0aWJsZSB3aXRoIEVTNSwgRVM1LXN0cmljdCwgb3JcbiAgICogYW50aWNpcGF0ZWQgRVM2LlxuICAgKlxuICAgKiAvL3Byb3ZpZGVzIHNlcy53aGl0ZWxpc3RcbiAgICogQGF1dGhvciBNYXJrIFMuIE1pbGxlcixcbiAgICogQG92ZXJyaWRlcyBzZXMsIHdoaXRlbGlzdE1vZHVsZVxuICAgKi9cblxuICAvKipcbiAgICogPHA+RWFjaCBKU09OIHJlY29yZCBlbnVtZXJhdGVzIHRoZSBkaXNwb3NpdGlvbiBvZiB0aGUgcHJvcGVydGllcyBvblxuICAgKiBzb21lIGNvcnJlc3BvbmRpbmcgcHJpbW9yZGlhbCBvYmplY3QsIHdpdGggdGhlIHJvb3QgcmVjb3JkXG4gICAqIHJlcHJlc2VudGluZyB0aGUgZ2xvYmFsIG9iamVjdC4gRm9yIGVhY2ggc3VjaCByZWNvcmQsIHRoZSB2YWx1ZXNcbiAgICogYXNzb2NpYXRlZCB3aXRoIGl0cyBwcm9wZXJ0eSBuYW1lcyBjYW4gYmVcbiAgICogPHVsPlxuICAgKiA8bGk+QW5vdGhlciByZWNvcmQsIGluIHdoaWNoIGNhc2UgdGhpcyBwcm9wZXJ0eSBpcyBzaW1wbHlcbiAgICogICAgIHdoaXRlbGlzdGVkIGFuZCB0aGF0IG5leHQgcmVjb3JkIHJlcHJlc2VudHMgdGhlIGRpc3Bvc2l0aW9uIG9mXG4gICAqICAgICB0aGUgb2JqZWN0IHdoaWNoIGlzIGl0cyB2YWx1ZS4gRm9yIGV4YW1wbGUsIHtAY29kZSBcIk9iamVjdFwifVxuICAgKiAgICAgbGVhZHMgdG8gYW5vdGhlciByZWNvcmQgZXhwbGFpbmluZyB3aGF0IHByb3BlcnRpZXMge0Bjb2RlXG4gICAqICAgICBcIk9iamVjdFwifSBtYXkgaGF2ZSBhbmQgaG93IGVhY2ggc3VjaCBwcm9wZXJ0eSwgaWYgcHJlc2VudCxcbiAgICogICAgIGFuZCBpdHMgdmFsdWUgc2hvdWxkIGJlIHRhbWVkLlxuICAgKiA8bGk+dHJ1ZSwgaW4gd2hpY2ggY2FzZSB0aGlzIHByb3BlcnR5IGlzIHNpbXBseSB3aGl0ZWxpc3RlZC4gVGhlXG4gICAqICAgICB2YWx1ZSBhc3NvY2lhdGVkIHdpdGggdGhhdCBwcm9wZXJ0eSBpcyBzdGlsbCB0cmF2ZXJzZWQgYW5kXG4gICAqICAgICB0YW1lZCwgYnV0IG9ubHkgYWNjb3JkaW5nIHRvIHRoZSB0YW1pbmcgb2YgdGhlIG9iamVjdHMgdGhhdFxuICAgKiAgICAgb2JqZWN0IGluaGVyaXRzIGZyb20uIEZvciBleGFtcGxlLCB7QGNvZGUgXCJPYmplY3QuZnJlZXplXCJ9IGxlYWRzXG4gICAqICAgICB0byB0cnVlLCBtZWFuaW5nIHRoYXQgdGhlIHtAY29kZSBcImZyZWV6ZVwifSBwcm9wZXJ0eSBvZiB7QGNvZGVcbiAgICogICAgIE9iamVjdH0gc2hvdWxkIGJlIHdoaXRlbGlzdGVkIGFuZCB0aGUgdmFsdWUgb2YgdGhlIHByb3BlcnR5IChhXG4gICAqICAgICBmdW5jdGlvbikgc2hvdWxkIGJlIGZ1cnRoZXIgdGFtZWQgb25seSBhY2NvcmRpbmcgdG8gdGhlXG4gICAqICAgICBtYXJraW5ncyBvZiB0aGUgb3RoZXIgb2JqZWN0cyBpdCBpbmhlcml0cyBmcm9tLCBsaWtlIHtAY29kZVxuICAgKiAgICAgXCJGdW5jdGlvbi5wcm90b3R5cGVcIn0gYW5kIHtAY29kZSBcIk9iamVjdC5wcm90b3R5cGVcIikuXG4gICAqICAgICBJZiB0aGUgcHJvcGVydHkgaXMgYW4gYWNjZXNzb3IgcHJvcGVydHksIGl0IGlzIG5vdFxuICAgKiAgICAgd2hpdGVsaXN0ZWQgKGFzIGludm9raW5nIGFuIGFjY2Vzc29yIG1pZ2h0IG5vdCBiZSBtZWFuaW5nZnVsLFxuICAgKiAgICAgeWV0IHRoZSBhY2Nlc3NvciBtaWdodCByZXR1cm4gYSB2YWx1ZSBuZWVkaW5nIHRhbWluZykuXG4gICAqIDxsaT5cIm1heWJlQWNjZXNzb3JcIiwgaW4gd2hpY2ggY2FzZSB0aGlzIGFjY2Vzc29yIHByb3BlcnR5IGlzIHNpbXBseVxuICAgKiAgICAgd2hpdGVsaXN0ZWQgYW5kIGl0cyBnZXR0ZXIgYW5kL29yIHNldHRlciBhcmUgdGFtZWQgYWNjb3JkaW5nIHRvXG4gICAqICAgICBpbmhlcml0YW5jZS4gSWYgdGhlIHByb3BlcnR5IGlzIG5vdCBhbiBhY2Nlc3NvciBwcm9wZXJ0eSwgaXRzXG4gICAqICAgICB2YWx1ZSBpcyB0YW1lZCBhY2NvcmRpbmcgdG8gaW5oZXJpdGFuY2UuXG4gICAqIDxsaT5cIipcIiwgaW4gd2hpY2ggY2FzZSB0aGlzIHByb3BlcnR5IG9uIHRoaXMgb2JqZWN0IGlzIHdoaXRlbGlzdGVkLFxuICAgKiAgICAgYXMgaXMgdGhpcyBwcm9wZXJ0eSBhcyBpbmhlcml0ZWQgYnkgYWxsIG9iamVjdHMgdGhhdCBpbmhlcml0XG4gICAqICAgICBmcm9tIHRoaXMgb2JqZWN0LiBUaGUgdmFsdWVzIGFzc29jaWF0ZWQgd2l0aCBhbGwgc3VjaCBwcm9wZXJ0aWVzXG4gICAqICAgICBhcmUgc3RpbGwgdHJhdmVyc2VkIGFuZCB0YW1lZCwgYnV0IG9ubHkgYWNjb3JkaW5nIHRvIHRoZSB0YW1pbmdcbiAgICogICAgIG9mIHRoZSBvYmplY3RzIHRoYXQgb2JqZWN0IGluaGVyaXRzIGZyb20uIEZvciBleGFtcGxlLCB7QGNvZGVcbiAgICogICAgIFwiT2JqZWN0LnByb3RvdHlwZS5jb25zdHJ1Y3RvclwifSBsZWFkcyB0byBcIipcIiwgbWVhbmluZyB0aGF0IHdlXG4gICAqICAgICB3aGl0ZWxpc3QgdGhlIHtAY29kZSBcImNvbnN0cnVjdG9yXCJ9IHByb3BlcnR5IG9uIHtAY29kZVxuICAgKiAgICAgT2JqZWN0LnByb3RvdHlwZX0gYW5kIG9uIGV2ZXJ5IG9iamVjdCB0aGF0IGluaGVyaXRzIGZyb20ge0Bjb2RlXG4gICAqICAgICBPYmplY3QucHJvdG90eXBlfSB0aGF0IGRvZXMgbm90IGhhdmUgYSBjb25mbGljdGluZyBtYXJrLiBFYWNoXG4gICAqICAgICBvZiB0aGVzZSBpcyB0YW1lZCBhcyBpZiB3aXRoIHRydWUsIHNvIHRoYXQgdGhlIHZhbHVlIG9mIHRoZVxuICAgKiAgICAgcHJvcGVydHkgaXMgZnVydGhlciB0YW1lZCBhY2NvcmRpbmcgdG8gd2hhdCBvdGhlciBvYmplY3RzIGl0XG4gICAqICAgICBpbmhlcml0cyBmcm9tLlxuICAgKiA8bGk+ZmFsc2UsIHdoaWNoIHN1cHByZXNzZXMgcGVybWlzc2lvbiBpbmhlcml0ZWQgdmlhIFwiKlwiLlxuICAgKiA8L3VsPlxuICAgKlxuICAgKiA8cD5UT0RPOiBXZSB3YW50IHRvIGRvIGZvciBjb25zdHJ1Y3Rvcjogc29tZXRoaW5nIHdlYWtlciB0aGFuICcqJyxcbiAgICogYnV0IHJhdGhlciBtb3JlIGxpa2Ugd2hhdCB3ZSBkbyBmb3IgW1tQcm90b3R5cGVdXSBsaW5rcywgd2hpY2ggaXNcbiAgICogdGhhdCBpdCBpcyB3aGl0ZWxpc3RlZCBvbmx5IGlmIGl0IHBvaW50cyBhdCBhbiBvYmplY3Qgd2hpY2ggaXNcbiAgICogb3RoZXJ3aXNlIHJlYWNoYWJsZSBieSBhIHdoaXRlbGlzdGVkIHBhdGguXG4gICAqXG4gICAqIDxwPlRoZSBtZW1iZXJzIG9mIHRoZSB3aGl0ZWxpc3QgYXJlIGVpdGhlclxuICAgKiA8dWw+XG4gICAqIDxsaT4odW5jb21tZW50ZWQpIGRlZmluZWQgYnkgdGhlIEVTNS4xIG5vcm1hdGl2ZSBzdGFuZGFyZCB0ZXh0LFxuICAgKiA8bGk+KHF1ZXN0aW9uYWJsZSkgcHJvdmlkZXMgYSBzb3VyY2Ugb2Ygbm9uLWRldGVybWluaXNtLCBpblxuICAgKiAgICAgdmlvbGF0aW9uIG9mIHB1cmUgb2JqZWN0LWNhcGFiaWxpdHkgcnVsZXMsIGJ1dCBhbGxvd2VkIGFueXdheVxuICAgKiAgICAgc2luY2Ugd2UndmUgZ2l2ZW4gdXAgb24gcmVzdHJpY3RpbmcgSmF2YVNjcmlwdCB0byBhXG4gICAqICAgICBkZXRlcm1pbmlzdGljIHN1YnNldC5cbiAgICogPGxpPihFUzUgQXBwZW5kaXggQikgY29tbW9uIGVsZW1lbnRzIG9mIGRlIGZhY3RvIEphdmFTY3JpcHRcbiAgICogICAgIGRlc2NyaWJlZCBieSB0aGUgbm9uLW5vcm1hdGl2ZSBBcHBlbmRpeCBCLlxuICAgKiA8bGk+KEhhcm1sZXNzIHdoYXR3ZykgZXh0ZW5zaW9ucyBkb2N1bWVudGVkIGF0XG4gICAqICAgICA8YSBocmVmPVwiaHR0cDovL3dpa2kud2hhdHdnLm9yZy93aWtpL1dlYl9FQ01BU2NyaXB0XCJcbiAgICogICAgID5odHRwOi8vd2lraS53aGF0d2cub3JnL3dpa2kvV2ViX0VDTUFTY3JpcHQ8L2E+IHRoYXQgc2VlbSB0byBiZVxuICAgKiAgICAgaGFybWxlc3MuIE5vdGUgdGhhdCB0aGUgUmVnRXhwIGNvbnN0cnVjdG9yIGV4dGVuc2lvbnMgb24gdGhhdFxuICAgKiAgICAgcGFnZSBhcmUgPGI+bm90IGhhcm1sZXNzPC9iPiBhbmQgc28gbXVzdCBub3QgYmUgd2hpdGVsaXN0ZWQuXG4gICAqIDxsaT4oRVMtSGFybW9ueSBwcm9wb3NhbCkgYWNjZXB0ZWQgYXMgXCJwcm9wb3NhbFwiIHN0YXR1cyBmb3JcbiAgICogICAgIEVjbWFTY3JpcHQtSGFybW9ueS5cbiAgICogPC91bD5cbiAgICpcbiAgICogPHA+V2l0aCB0aGUgYWJvdmUgZW5jb2RpbmcsIHRoZXJlIGFyZSBzb21lIHNlbnNpYmxlIHdoaXRlbGlzdHMgd2VcbiAgICogY2Fubm90IGV4cHJlc3MsIHN1Y2ggYXMgbWFya2luZyBhIHByb3BlcnR5IGJvdGggd2l0aCBcIipcIiBhbmQgYSBKU09OXG4gICAqIHJlY29yZC4gVGhpcyBpcyBhbiBleHBlZGllbnQgZGVjaXNpb24gYmFzZWQgb25seSBvbiBub3QgaGF2aW5nXG4gICAqIGVuY291bnRlcmVkIHN1Y2ggYSBuZWVkLiBTaG91bGQgd2UgbmVlZCB0aGlzIGV4dHJhIGV4cHJlc3NpdmVuZXNzLFxuICAgKiB3ZSdsbCBuZWVkIHRvIHJlZmFjdG9yIHRvIGVuYWJsZSBhIGRpZmZlcmVudCBlbmNvZGluZy5cbiAgICpcbiAgICogPHA+V2UgZmFjdG9yIG91dCB7QGNvZGUgdHJ1ZX0gaW50byB0aGUgdmFyaWFibGUge0Bjb2RlIHR9IGp1c3QgdG9cbiAgICogZ2V0IGEgYml0IGJldHRlciBjb21wcmVzc2lvbiBmcm9tIHNpbXBsZSBtaW5pZmllcnMuXG4gICAqL1xuXG4gIGNvbnN0IHQgPSB0cnVlO1xuICBjb25zdCBqID0gdHJ1ZTsgLy8gaW5jbHVkZWQgaW4gdGhlIEplc3NpZSBydW50aW1lXG5cbiAgbGV0IFR5cGVkQXJyYXlXaGl0ZWxpc3Q7IC8vIGRlZmluZWQgYW5kIHVzZWQgYmVsb3dcblxuICB2YXIgd2hpdGVsaXN0ID0ge1xuICAgIC8vIFRoZSBhY2Nlc3NpYmxlIGludHJpbnNpY3Mgd2hpY2ggYXJlIG5vdCByZWFjaGFibGUgYnkgb3duXG4gICAgLy8gcHJvcGVydHkgbmFtZSB0cmF2ZXJzYWwgYXJlIGxpc3RlZCBoZXJlIHNvIHRoYXQgdGhleSBhcmVcbiAgICAvLyBwcm9jZXNzZWQgYnkgdGhlIHdoaXRlbGlzdCwgYWx0aG91Z2ggdGhpcyBhbHNvIG1ha2VzIHRoZW1cbiAgICAvLyBhY2Nlc3NpYmxlIGJ5IHRoaXMgcGF0aC4gIFNlZVxuICAgIC8vIGh0dHBzOi8vcGVvcGxlLm1vemlsbGEub3JnL35qb3JlbmRvcmZmL2VzNi1kcmFmdC5odG1sI3NlYy13ZWxsLWtub3duLWludHJpbnNpYy1vYmplY3RzXG4gICAgLy8gT2YgdGhlc2UsIFRocm93VHlwZUVycm9yIGlzIHRoZSBvbmx5IG9uZSBmcm9tIEVTNS4gQWxsIHRoZVxuICAgIC8vIHJlc3Qgd2VyZSBpbnRyb2R1Y2VkIGluIEVTNi5cbiAgICBhbm9uSW50cmluc2ljczoge1xuICAgICAgVGhyb3dUeXBlRXJyb3I6IHt9LFxuICAgICAgSXRlcmF0b3JQcm90b3R5cGU6IHtcbiAgICAgICAgLy8gMjUuMVxuICAgICAgICAvLyBUZWNobmljYWxseSwgZm9yIFNFUy1vbi1FUzUsIHdlIHNob3VsZCBub3QgbmVlZCB0b1xuICAgICAgICAvLyB3aGl0ZWxpc3QgJ25leHQnLiBIb3dldmVyLCBicm93c2VycyBhcmUgYWNjaWRlbnRhbGx5XG4gICAgICAgIC8vIHJlbHlpbmcgb24gaXRcbiAgICAgICAgLy8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9NDc2OSNcbiAgICAgICAgLy8gaHR0cHM6Ly9idWdzLndlYmtpdC5vcmcvc2hvd19idWcuY2dpP2lkPTE1NDQ3NVxuICAgICAgICAvLyBhbmQgd2Ugd2lsbCBiZSB3aGl0ZWxpc3RpbmcgaXQgYXMgd2UgdHJhbnNpdGlvbiB0byBFUzZcbiAgICAgICAgLy8gYW55d2F5LCBzbyB3ZSB1bmNvbmRpdGlvbmFsbHkgd2hpdGVsaXN0IGl0IG5vdy5cbiAgICAgICAgbmV4dDogJyonLFxuICAgICAgICBjb25zdHJ1Y3RvcjogZmFsc2UsXG4gICAgICB9LFxuICAgICAgQXJyYXlJdGVyYXRvclByb3RvdHlwZToge30sXG4gICAgICBTdHJpbmdJdGVyYXRvclByb3RvdHlwZToge30sXG4gICAgICBNYXBJdGVyYXRvclByb3RvdHlwZToge30sXG4gICAgICBTZXRJdGVyYXRvclByb3RvdHlwZToge30sXG4gICAgICAvLyBBc3luY0l0ZXJhdG9yUHJvdG90eXBlIGRvZXMgbm90IGluaGVyaXQgZnJvbSBJdGVyYXRvclByb3RvdHlwZVxuICAgICAgQXN5bmNJdGVyYXRvclByb3RvdHlwZToge30sXG5cbiAgICAgIC8vIFRoZSAlR2VuZXJhdG9yRnVuY3Rpb24lIGludHJpbnNpYyBpcyB0aGUgY29uc3RydWN0b3Igb2ZcbiAgICAgIC8vIGdlbmVyYXRvciBmdW5jdGlvbnMsIHNvICVHZW5lcmF0b3JGdW5jdGlvbiUucHJvdG90eXBlIGlzXG4gICAgICAvLyB0aGUgJUdlbmVyYXRvciUgaW50cmluc2ljLCB3aGljaCBhbGwgZ2VuZXJhdG9yIGZ1bmN0aW9uc1xuICAgICAgLy8gaW5oZXJpdCBmcm9tLiBBIGdlbmVyYXRvciBmdW5jdGlvbiBpcyBlZmZlY3RpdmVseSB0aGVcbiAgICAgIC8vIGNvbnN0cnVjdG9yIG9mIGl0cyBnZW5lcmF0b3IgaW5zdGFuY2VzLCBzbywgZm9yIGVhY2hcbiAgICAgIC8vIGdlbmVyYXRvciBmdW5jdGlvbiAoZS5nLiwgXCJnMVwiIG9uIHRoZSBkaWFncmFtIGF0XG4gICAgICAvLyBodHRwOi8vcGVvcGxlLm1vemlsbGEub3JnL35qb3JlbmRvcmZmL2ZpZ3VyZS0yLnBuZyApXG4gICAgICAvLyBpdHMgLnByb3RvdHlwZSBpcyBhIHByb3RvdHlwZSB0aGF0IGl0cyBpbnN0YW5jZXMgaW5oZXJpdFxuICAgICAgLy8gZnJvbS4gUGFyYWxsZWxpbmcgdGhpcyBzdHJ1Y3R1cmUsICVHZW5lcmF0b3IlLnByb3RvdHlwZSxcbiAgICAgIC8vIGkuZS4sICVHZW5lcmF0b3JGdW5jdGlvbiUucHJvdG90eXBlLnByb3RvdHlwZSwgaXMgdGhlXG4gICAgICAvLyBvYmplY3QgdGhhdCBhbGwgdGhlc2UgZ2VuZXJhdG9yIGZ1bmN0aW9uIHByb3RvdHlwZXMgaW5oZXJpdFxuICAgICAgLy8gZnJvbS4gVGhlIC5uZXh0LCAucmV0dXJuIGFuZCAudGhyb3cgdGhhdCBnZW5lcmF0b3JcbiAgICAgIC8vIGluc3RhbmNlcyByZXNwb25kIHRvIGFyZSBhY3R1YWxseSB0aGUgYnVpbHRpbiBtZXRob2RzIHRoZXlcbiAgICAgIC8vIGluaGVyaXQgZnJvbSB0aGlzIG9iamVjdC5cbiAgICAgIEdlbmVyYXRvckZ1bmN0aW9uOiB7XG4gICAgICAgIC8vIDI1LjJcbiAgICAgICAgbGVuZ3RoOiAnKicsIC8vIE5vdCBzdXJlIHdoeSB0aGlzIGlzIG5lZWRlZFxuICAgICAgICBwcm90b3R5cGU6IHtcbiAgICAgICAgICAvLyAyNS40XG4gICAgICAgICAgcHJvdG90eXBlOiB7XG4gICAgICAgICAgICBuZXh0OiAnKicsXG4gICAgICAgICAgICByZXR1cm46ICcqJyxcbiAgICAgICAgICAgIHRocm93OiAnKicsXG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogJyonLCAvLyBOb3Qgc3VyZSB3aHkgdGhpcyBpcyBuZWVkZWRcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIEFzeW5jR2VuZXJhdG9yRnVuY3Rpb246IHtcbiAgICAgICAgLy8gMjUuM1xuICAgICAgICBsZW5ndGg6ICcqJyxcbiAgICAgICAgcHJvdG90eXBlOiB7XG4gICAgICAgICAgLy8gMjUuNVxuICAgICAgICAgIHByb3RvdHlwZToge1xuICAgICAgICAgICAgbmV4dDogJyonLFxuICAgICAgICAgICAgcmV0dXJuOiAnKicsXG4gICAgICAgICAgICB0aHJvdzogJyonLFxuICAgICAgICAgICAgY29uc3RydWN0b3I6ICcqJywgLy8gTm90IHN1cmUgd2h5IHRoaXMgaXMgbmVlZGVkXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBBc3luY0Z1bmN0aW9uOiB7XG4gICAgICAgIC8vIDI1LjdcbiAgICAgICAgbGVuZ3RoOiAnKicsXG4gICAgICAgIHByb3RvdHlwZTogJyonLFxuICAgICAgfSxcblxuICAgICAgVHlwZWRBcnJheTogKFR5cGVkQXJyYXlXaGl0ZWxpc3QgPSB7XG4gICAgICAgIC8vIDIyLjJcbiAgICAgICAgbGVuZ3RoOiAnKicsIC8vIGRvZXMgbm90IGluaGVyaXQgZnJvbSBGdW5jdGlvbi5wcm90b3R5cGUgb24gQ2hyb21lXG4gICAgICAgIG5hbWU6ICcqJywgLy8gZGl0dG9cbiAgICAgICAgZnJvbTogdCxcbiAgICAgICAgb2Y6IHQsXG4gICAgICAgIEJZVEVTX1BFUl9FTEVNRU5UOiAnKicsXG4gICAgICAgIHByb3RvdHlwZToge1xuICAgICAgICAgIGJ1ZmZlcjogJ21heWJlQWNjZXNzb3InLFxuICAgICAgICAgIGJ5dGVMZW5ndGg6ICdtYXliZUFjY2Vzc29yJyxcbiAgICAgICAgICBieXRlT2Zmc2V0OiAnbWF5YmVBY2Nlc3NvcicsXG4gICAgICAgICAgY29weVdpdGhpbjogJyonLFxuICAgICAgICAgIGVudHJpZXM6ICcqJyxcbiAgICAgICAgICBldmVyeTogJyonLFxuICAgICAgICAgIGZpbGw6ICcqJyxcbiAgICAgICAgICBmaWx0ZXI6ICcqJyxcbiAgICAgICAgICBmaW5kOiAnKicsXG4gICAgICAgICAgZmluZEluZGV4OiAnKicsXG4gICAgICAgICAgZm9yRWFjaDogJyonLFxuICAgICAgICAgIGluY2x1ZGVzOiAnKicsXG4gICAgICAgICAgaW5kZXhPZjogJyonLFxuICAgICAgICAgIGpvaW46ICcqJyxcbiAgICAgICAgICBrZXlzOiAnKicsXG4gICAgICAgICAgbGFzdEluZGV4T2Y6ICcqJyxcbiAgICAgICAgICBsZW5ndGg6ICdtYXliZUFjY2Vzc29yJyxcbiAgICAgICAgICBtYXA6ICcqJyxcbiAgICAgICAgICByZWR1Y2U6ICcqJyxcbiAgICAgICAgICByZWR1Y2VSaWdodDogJyonLFxuICAgICAgICAgIHJldmVyc2U6ICcqJyxcbiAgICAgICAgICBzZXQ6ICcqJyxcbiAgICAgICAgICBzbGljZTogJyonLFxuICAgICAgICAgIHNvbWU6ICcqJyxcbiAgICAgICAgICBzb3J0OiAnKicsXG4gICAgICAgICAgc3ViYXJyYXk6ICcqJyxcbiAgICAgICAgICB2YWx1ZXM6ICcqJyxcbiAgICAgICAgICBCWVRFU19QRVJfRUxFTUVOVDogJyonLFxuICAgICAgICB9LFxuICAgICAgfSksXG4gICAgfSxcblxuICAgIG5hbWVkSW50cmluc2ljczoge1xuICAgICAgLy8gSW4gb3JkZXIgYWNjb3JkaW5nIHRvXG4gICAgICAvLyBodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvIHdpdGggY2hhcHRlclxuICAgICAgLy8gbnVtYmVycyB3aGVyZSBhcHBsaWNhYmxlXG5cbiAgICAgIC8vIDE4IFRoZSBHbG9iYWwgT2JqZWN0XG5cbiAgICAgIC8vIDE4LjFcbiAgICAgIEluZmluaXR5OiBqLFxuICAgICAgTmFOOiBqLFxuICAgICAgdW5kZWZpbmVkOiBqLFxuXG4gICAgICAvLyAxOC4yXG4gICAgICBldmFsOiBqLCAvLyByZWFsbXMtc2hpbSBkZXBlbmRzIG9uIGhhdmluZyBpbmRpcmVjdCBldmFsIGluIHRoZSBnbG9iYWxzXG4gICAgICBpc0Zpbml0ZTogdCxcbiAgICAgIGlzTmFOOiB0LFxuICAgICAgcGFyc2VGbG9hdDogdCxcbiAgICAgIHBhcnNlSW50OiB0LFxuICAgICAgZGVjb2RlVVJJOiB0LFxuICAgICAgZGVjb2RlVVJJQ29tcG9uZW50OiB0LFxuICAgICAgZW5jb2RlVVJJOiB0LFxuICAgICAgZW5jb2RlVVJJQ29tcG9uZW50OiB0LFxuXG4gICAgICAvLyAxOSBGdW5kYW1lbnRhbCBPYmplY3RzXG5cbiAgICAgIE9iamVjdDoge1xuICAgICAgICAvLyAxOS4xXG4gICAgICAgIGFzc2lnbjogdCwgLy8gRVMtSGFybW9ueVxuICAgICAgICBjcmVhdGU6IHQsXG4gICAgICAgIGRlZmluZVByb3BlcnRpZXM6IHQsIC8vIEVTLUhhcm1vbnlcbiAgICAgICAgZGVmaW5lUHJvcGVydHk6IHQsXG4gICAgICAgIGVudHJpZXM6IHQsIC8vIEVTLUhhcm1vbnlcbiAgICAgICAgZnJlZXplOiBqLFxuICAgICAgICBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I6IHQsXG4gICAgICAgIGdldE93blByb3BlcnR5RGVzY3JpcHRvcnM6IHQsIC8vIHByb3Bvc2VkIEVTLUhhcm1vbnlcbiAgICAgICAgZ2V0T3duUHJvcGVydHlOYW1lczogdCxcbiAgICAgICAgZ2V0T3duUHJvcGVydHlTeW1ib2xzOiB0LCAvLyBFUy1IYXJtb255XG4gICAgICAgIGdldFByb3RvdHlwZU9mOiB0LFxuICAgICAgICBpczogaiwgLy8gRVMtSGFybW9ueVxuICAgICAgICBpc0V4dGVuc2libGU6IHQsXG4gICAgICAgIGlzRnJvemVuOiB0LFxuICAgICAgICBpc1NlYWxlZDogdCxcbiAgICAgICAga2V5czogdCxcbiAgICAgICAgcHJldmVudEV4dGVuc2lvbnM6IGosXG4gICAgICAgIHNlYWw6IGosXG4gICAgICAgIHNldFByb3RvdHlwZU9mOiB0LCAvLyBFUy1IYXJtb255XG4gICAgICAgIHZhbHVlczogdCwgLy8gRVMtSGFybW9ueVxuXG4gICAgICAgIHByb3RvdHlwZToge1xuICAgICAgICAgIC8vIEIuMi4yXG4gICAgICAgICAgLy8gV2UgbmVlZCB0byBwcmVmaXggX19wcm90b19fIHdpdGggRVNDQVBFIHNvIHRoYXQgaXQgZG9lc24ndFxuICAgICAgICAgIC8vIGp1c3QgY2hhbmdlIHRoZSBwcm90b3R5cGUgb2YgdGhpcyBvYmplY3QuXG4gICAgICAgICAgRVNDQVBFX19wcm90b19fOiAnbWF5YmVBY2Nlc3NvcicsXG4gICAgICAgICAgX19kZWZpbmVHZXR0ZXJfXzogdCxcbiAgICAgICAgICBfX2RlZmluZVNldHRlcl9fOiB0LFxuICAgICAgICAgIF9fbG9va3VwR2V0dGVyX186IHQsXG4gICAgICAgICAgX19sb29rdXBTZXR0ZXJfXzogdCxcblxuICAgICAgICAgIGNvbnN0cnVjdG9yOiAnKicsXG4gICAgICAgICAgaGFzT3duUHJvcGVydHk6IHQsXG4gICAgICAgICAgaXNQcm90b3R5cGVPZjogdCxcbiAgICAgICAgICBwcm9wZXJ0eUlzRW51bWVyYWJsZTogdCxcbiAgICAgICAgICB0b0xvY2FsZVN0cmluZzogJyonLFxuICAgICAgICAgIHRvU3RyaW5nOiAnKicsXG4gICAgICAgICAgdmFsdWVPZjogJyonLFxuXG4gICAgICAgICAgLy8gR2VuZXJhbGx5IGFsbG93ZWRcbiAgICAgICAgICBbU3ltYm9sLml0ZXJhdG9yXTogJyonLFxuICAgICAgICAgIFtTeW1ib2wudG9QcmltaXRpdmVdOiAnKicsXG4gICAgICAgICAgW1N5bWJvbC50b1N0cmluZ1RhZ106ICcqJyxcbiAgICAgICAgICBbU3ltYm9sLnVuc2NvcGFibGVzXTogJyonLFxuICAgICAgICB9LFxuICAgICAgfSxcblxuICAgICAgRnVuY3Rpb246IHtcbiAgICAgICAgLy8gMTkuMlxuICAgICAgICBsZW5ndGg6IHQsXG4gICAgICAgIHByb3RvdHlwZToge1xuICAgICAgICAgIGFwcGx5OiB0LFxuICAgICAgICAgIGJpbmQ6IHQsXG4gICAgICAgICAgY2FsbDogdCxcbiAgICAgICAgICBbU3ltYm9sLmhhc0luc3RhbmNlXTogJyonLFxuXG4gICAgICAgICAgLy8gMTkuMi40IGluc3RhbmNlc1xuICAgICAgICAgIGxlbmd0aDogJyonLFxuICAgICAgICAgIG5hbWU6ICcqJywgLy8gRVMtSGFybW9ueVxuICAgICAgICAgIHByb3RvdHlwZTogJyonLFxuICAgICAgICAgIGFyaXR5OiAnKicsIC8vIG5vbi1zdGQsIGRlcHJlY2F0ZWQgaW4gZmF2b3Igb2YgbGVuZ3RoXG5cbiAgICAgICAgICAvLyBHZW5lcmFsbHkgYWxsb3dlZFxuICAgICAgICAgIFtTeW1ib2wuc3BlY2llc106ICdtYXliZUFjY2Vzc29yJywgLy8gRVMtSGFybW9ueT9cbiAgICAgICAgfSxcbiAgICAgIH0sXG5cbiAgICAgIEJvb2xlYW46IHtcbiAgICAgICAgLy8gMTkuM1xuICAgICAgICBwcm90b3R5cGU6IHQsXG4gICAgICB9LFxuXG4gICAgICBTeW1ib2w6IHtcbiAgICAgICAgLy8gMTkuNCAgICAgICAgICAgICAgIGFsbCBFUy1IYXJtb255XG4gICAgICAgIGFzeW5jSXRlcmF0b3I6IHQsIC8vIHByb3Bvc2VkPyBFUy1IYXJtb255XG4gICAgICAgIGZvcjogdCxcbiAgICAgICAgaGFzSW5zdGFuY2U6IHQsXG4gICAgICAgIGlzQ29uY2F0U3ByZWFkYWJsZTogdCxcbiAgICAgICAgaXRlcmF0b3I6IHQsXG4gICAgICAgIGtleUZvcjogdCxcbiAgICAgICAgbWF0Y2g6IHQsXG4gICAgICAgIG1hdGNoQWxsOiB0LFxuICAgICAgICByZXBsYWNlOiB0LFxuICAgICAgICBzZWFyY2g6IHQsXG4gICAgICAgIHNwZWNpZXM6IHQsXG4gICAgICAgIHNwbGl0OiB0LFxuICAgICAgICB0b1ByaW1pdGl2ZTogdCxcbiAgICAgICAgdG9TdHJpbmdUYWc6IHQsXG4gICAgICAgIHVuc2NvcGFibGVzOiB0LFxuICAgICAgICBwcm90b3R5cGU6IHQsXG4gICAgICB9LFxuXG4gICAgICBFcnJvcjoge1xuICAgICAgICAvLyAxOS41XG4gICAgICAgIHByb3RvdHlwZToge1xuICAgICAgICAgIG5hbWU6ICcqJyxcbiAgICAgICAgICBtZXNzYWdlOiAnKicsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgLy8gSW4gRVM2IHRoZSAqRXJyb3IgXCJzdWJjbGFzc2VzXCIgb2YgRXJyb3IgaW5oZXJpdCBmcm9tIEVycm9yLFxuICAgICAgLy8gc2luY2UgY29uc3RydWN0b3IgaW5oZXJpdGFuY2UgZ2VuZXJhbGx5IG1pcnJvcnMgcHJvdG90eXBlXG4gICAgICAvLyBpbmhlcml0YW5jZS4gQXMgZXhwbGFpbmVkIGF0XG4gICAgICAvLyBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL2dvb2dsZS1jYWphL2lzc3Vlcy9kZXRhaWw/aWQ9MTk2MyAsXG4gICAgICAvLyBkZWJ1Zy5qcyBoaWRlcyBhd2F5IHRoZSBFcnJvciBjb25zdHJ1Y3RvciBpdHNlbGYsIGFuZCBzbyBuZWVkc1xuICAgICAgLy8gdG8gcmV3aXJlIHRoZXNlIFwic3ViY2xhc3NcIiBjb25zdHJ1Y3RvcnMuIFVudGlsIHdlIGhhdmUgYSBtb3JlXG4gICAgICAvLyBnZW5lcmFsIG1lY2hhbmlzbSwgcGxlYXNlIG1haW50YWluIHRoaXMgbGlzdCBvZiB3aGl0ZWxpc3RlZFxuICAgICAgLy8gc3ViY2xhc3NlcyBpbiBzeW5jIHdpdGggdGhlIGxpc3QgaW4gZGVidWcuanMgb2Ygc3ViY2xhc3NlcyB0b1xuICAgICAgLy8gYmUgcmV3aXJlZC5cbiAgICAgIEV2YWxFcnJvcjoge1xuICAgICAgICBwcm90b3R5cGU6IHQsXG4gICAgICB9LFxuICAgICAgUmFuZ2VFcnJvcjoge1xuICAgICAgICBwcm90b3R5cGU6IHQsXG4gICAgICB9LFxuICAgICAgUmVmZXJlbmNlRXJyb3I6IHtcbiAgICAgICAgcHJvdG90eXBlOiB0LFxuICAgICAgfSxcbiAgICAgIFN5bnRheEVycm9yOiB7XG4gICAgICAgIHByb3RvdHlwZTogdCxcbiAgICAgIH0sXG4gICAgICBUeXBlRXJyb3I6IHtcbiAgICAgICAgcHJvdG90eXBlOiB0LFxuICAgICAgfSxcbiAgICAgIFVSSUVycm9yOiB7XG4gICAgICAgIHByb3RvdHlwZTogdCxcbiAgICAgIH0sXG5cbiAgICAgIC8vIDIwIE51bWJlcnMgYW5kIERhdGVzXG5cbiAgICAgIE51bWJlcjoge1xuICAgICAgICAvLyAyMC4xXG4gICAgICAgIEVQU0lMT046IHQsIC8vIEVTLUhhcm1vbnlcbiAgICAgICAgaXNGaW5pdGU6IGosIC8vIEVTLUhhcm1vbnlcbiAgICAgICAgaXNJbnRlZ2VyOiB0LCAvLyBFUy1IYXJtb255XG4gICAgICAgIGlzTmFOOiBqLCAvLyBFUy1IYXJtb255XG4gICAgICAgIGlzU2FmZUludGVnZXI6IGosIC8vIEVTLUhhcm1vbnlcbiAgICAgICAgTUFYX1NBRkVfSU5URUdFUjogaiwgLy8gRVMtSGFybW9ueVxuICAgICAgICBNQVhfVkFMVUU6IHQsXG4gICAgICAgIE1JTl9TQUZFX0lOVEVHRVI6IGosIC8vIEVTLUhhcm1vbnlcbiAgICAgICAgTUlOX1ZBTFVFOiB0LFxuICAgICAgICBOYU46IHQsXG4gICAgICAgIE5FR0FUSVZFX0lORklOSVRZOiB0LFxuICAgICAgICBwYXJzZUZsb2F0OiB0LCAvLyBFUy1IYXJtb255XG4gICAgICAgIHBhcnNlSW50OiB0LCAvLyBFUy1IYXJtb255XG4gICAgICAgIFBPU0lUSVZFX0lORklOSVRZOiB0LFxuICAgICAgICBwcm90b3R5cGU6IHtcbiAgICAgICAgICB0b0V4cG9uZW50aWFsOiB0LFxuICAgICAgICAgIHRvRml4ZWQ6IHQsXG4gICAgICAgICAgdG9QcmVjaXNpb246IHQsXG4gICAgICAgIH0sXG4gICAgICB9LFxuXG4gICAgICBNYXRoOiB7XG4gICAgICAgIC8vIDIwLjJcbiAgICAgICAgRTogaixcbiAgICAgICAgTE4xMDogaixcbiAgICAgICAgTE4yOiBqLFxuICAgICAgICBMT0cxMEU6IHQsXG4gICAgICAgIExPRzJFOiB0LFxuICAgICAgICBQSTogaixcbiAgICAgICAgU1FSVDFfMjogdCxcbiAgICAgICAgU1FSVDI6IHQsXG5cbiAgICAgICAgYWJzOiBqLFxuICAgICAgICBhY29zOiB0LFxuICAgICAgICBhY29zaDogdCwgLy8gRVMtSGFybW9ueVxuICAgICAgICBhc2luOiB0LFxuICAgICAgICBhc2luaDogdCwgLy8gRVMtSGFybW9ueVxuICAgICAgICBhdGFuOiB0LFxuICAgICAgICBhdGFuaDogdCwgLy8gRVMtSGFybW9ueVxuICAgICAgICBhdGFuMjogdCxcbiAgICAgICAgY2JydDogdCwgLy8gRVMtSGFybW9ueVxuICAgICAgICBjZWlsOiBqLFxuICAgICAgICBjbHozMjogdCwgLy8gRVMtSGFybW9ueVxuICAgICAgICBjb3M6IHQsXG4gICAgICAgIGNvc2g6IHQsIC8vIEVTLUhhcm1vbnlcbiAgICAgICAgZXhwOiB0LFxuICAgICAgICBleHBtMTogdCwgLy8gRVMtSGFybW9ueVxuICAgICAgICBmbG9vcjogaixcbiAgICAgICAgZnJvdW5kOiB0LCAvLyBFUy1IYXJtb255XG4gICAgICAgIGh5cG90OiB0LCAvLyBFUy1IYXJtb255XG4gICAgICAgIGltdWw6IHQsIC8vIEVTLUhhcm1vbnlcbiAgICAgICAgbG9nOiBqLFxuICAgICAgICBsb2cxcDogdCwgLy8gRVMtSGFybW9ueVxuICAgICAgICBsb2cxMDogaiwgLy8gRVMtSGFybW9ueVxuICAgICAgICBsb2cyOiBqLCAvLyBFUy1IYXJtb255XG4gICAgICAgIG1heDogaixcbiAgICAgICAgbWluOiBqLFxuICAgICAgICBwb3c6IGosXG4gICAgICAgIHJhbmRvbTogdCwgLy8gcXVlc3Rpb25hYmxlXG4gICAgICAgIHJvdW5kOiBqLFxuICAgICAgICBzaWduOiB0LCAvLyBFUy1IYXJtb255XG4gICAgICAgIHNpbjogdCxcbiAgICAgICAgc2luaDogdCwgLy8gRVMtSGFybW9ueVxuICAgICAgICBzcXJ0OiBqLFxuICAgICAgICB0YW46IHQsXG4gICAgICAgIHRhbmg6IHQsIC8vIEVTLUhhcm1vbnlcbiAgICAgICAgdHJ1bmM6IGosIC8vIEVTLUhhcm1vbnlcbiAgICAgIH0sXG5cbiAgICAgIC8vIG5vLWFyZyBEYXRlIGNvbnN0cnVjdG9yIGlzIHF1ZXN0aW9uYWJsZVxuICAgICAgRGF0ZToge1xuICAgICAgICAvLyAyMC4zXG4gICAgICAgIG5vdzogdCwgLy8gcXVlc3Rpb25hYmxlXG4gICAgICAgIHBhcnNlOiB0LFxuICAgICAgICBVVEM6IHQsXG4gICAgICAgIHByb3RvdHlwZToge1xuICAgICAgICAgIC8vIE5vdGU6IGNvb3JkaW5hdGUgdGhpcyBsaXN0IHdpdGggbWFpbnRhbmVuY2Ugb2YgcmVwYWlyRVM1LmpzXG4gICAgICAgICAgZ2V0RGF0ZTogdCxcbiAgICAgICAgICBnZXREYXk6IHQsXG4gICAgICAgICAgZ2V0RnVsbFllYXI6IHQsXG4gICAgICAgICAgZ2V0SG91cnM6IHQsXG4gICAgICAgICAgZ2V0TWlsbGlzZWNvbmRzOiB0LFxuICAgICAgICAgIGdldE1pbnV0ZXM6IHQsXG4gICAgICAgICAgZ2V0TW9udGg6IHQsXG4gICAgICAgICAgZ2V0U2Vjb25kczogdCxcbiAgICAgICAgICBnZXRUaW1lOiB0LFxuICAgICAgICAgIGdldFRpbWV6b25lT2Zmc2V0OiB0LFxuICAgICAgICAgIGdldFVUQ0RhdGU6IHQsXG4gICAgICAgICAgZ2V0VVRDRGF5OiB0LFxuICAgICAgICAgIGdldFVUQ0Z1bGxZZWFyOiB0LFxuICAgICAgICAgIGdldFVUQ0hvdXJzOiB0LFxuICAgICAgICAgIGdldFVUQ01pbGxpc2Vjb25kczogdCxcbiAgICAgICAgICBnZXRVVENNaW51dGVzOiB0LFxuICAgICAgICAgIGdldFVUQ01vbnRoOiB0LFxuICAgICAgICAgIGdldFVUQ1NlY29uZHM6IHQsXG4gICAgICAgICAgc2V0RGF0ZTogdCxcbiAgICAgICAgICBzZXRGdWxsWWVhcjogdCxcbiAgICAgICAgICBzZXRIb3VyczogdCxcbiAgICAgICAgICBzZXRNaWxsaXNlY29uZHM6IHQsXG4gICAgICAgICAgc2V0TWludXRlczogdCxcbiAgICAgICAgICBzZXRNb250aDogdCxcbiAgICAgICAgICBzZXRTZWNvbmRzOiB0LFxuICAgICAgICAgIHNldFRpbWU6IHQsXG4gICAgICAgICAgc2V0VVRDRGF0ZTogdCxcbiAgICAgICAgICBzZXRVVENGdWxsWWVhcjogdCxcbiAgICAgICAgICBzZXRVVENIb3VyczogdCxcbiAgICAgICAgICBzZXRVVENNaWxsaXNlY29uZHM6IHQsXG4gICAgICAgICAgc2V0VVRDTWludXRlczogdCxcbiAgICAgICAgICBzZXRVVENNb250aDogdCxcbiAgICAgICAgICBzZXRVVENTZWNvbmRzOiB0LFxuICAgICAgICAgIHRvRGF0ZVN0cmluZzogdCxcbiAgICAgICAgICB0b0lTT1N0cmluZzogdCxcbiAgICAgICAgICB0b0pTT046IHQsXG4gICAgICAgICAgdG9Mb2NhbGVEYXRlU3RyaW5nOiB0LFxuICAgICAgICAgIHRvTG9jYWxlU3RyaW5nOiB0LFxuICAgICAgICAgIHRvTG9jYWxlVGltZVN0cmluZzogdCxcbiAgICAgICAgICB0b1RpbWVTdHJpbmc6IHQsXG4gICAgICAgICAgdG9VVENTdHJpbmc6IHQsXG5cbiAgICAgICAgICAvLyBCLjIuNFxuICAgICAgICAgIGdldFllYXI6IHQsXG4gICAgICAgICAgc2V0WWVhcjogdCxcbiAgICAgICAgICB0b0dNVFN0cmluZzogdCxcbiAgICAgICAgfSxcbiAgICAgIH0sXG5cbiAgICAgIC8vIDIxIFRleHQgUHJvY2Vzc2luZ1xuXG4gICAgICBTdHJpbmc6IHtcbiAgICAgICAgLy8gMjEuMlxuICAgICAgICBmcm9tQ2hhckNvZGU6IGosXG4gICAgICAgIGZyb21Db2RlUG9pbnQ6IHQsIC8vIEVTLUhhcm1vbnlcbiAgICAgICAgcmF3OiBqLCAvLyBFUy1IYXJtb255XG4gICAgICAgIHByb3RvdHlwZToge1xuICAgICAgICAgIGNoYXJBdDogdCxcbiAgICAgICAgICBjaGFyQ29kZUF0OiB0LFxuICAgICAgICAgIGNvZGVQb2ludEF0OiB0LCAvLyBFUy1IYXJtb255XG4gICAgICAgICAgY29uY2F0OiB0LFxuICAgICAgICAgIGVuZHNXaXRoOiBqLCAvLyBFUy1IYXJtb255XG4gICAgICAgICAgaW5jbHVkZXM6IHQsIC8vIEVTLUhhcm1vbnlcbiAgICAgICAgICBpbmRleE9mOiBqLFxuICAgICAgICAgIGxhc3RJbmRleE9mOiBqLFxuICAgICAgICAgIGxvY2FsZUNvbXBhcmU6IHQsXG4gICAgICAgICAgbWF0Y2g6IHQsXG4gICAgICAgICAgbm9ybWFsaXplOiB0LCAvLyBFUy1IYXJtb255XG4gICAgICAgICAgcGFkRW5kOiB0LCAvLyBFUy1IYXJtb255XG4gICAgICAgICAgcGFkU3RhcnQ6IHQsIC8vIEVTLUhhcm1vbnlcbiAgICAgICAgICByZXBlYXQ6IHQsIC8vIEVTLUhhcm1vbnlcbiAgICAgICAgICByZXBsYWNlOiB0LFxuICAgICAgICAgIHNlYXJjaDogdCxcbiAgICAgICAgICBzbGljZTogaixcbiAgICAgICAgICBzcGxpdDogdCxcbiAgICAgICAgICBzdGFydHNXaXRoOiBqLCAvLyBFUy1IYXJtb255XG4gICAgICAgICAgc3Vic3RyaW5nOiB0LFxuICAgICAgICAgIHRvTG9jYWxlTG93ZXJDYXNlOiB0LFxuICAgICAgICAgIHRvTG9jYWxlVXBwZXJDYXNlOiB0LFxuICAgICAgICAgIHRvTG93ZXJDYXNlOiB0LFxuICAgICAgICAgIHRvVXBwZXJDYXNlOiB0LFxuICAgICAgICAgIHRyaW06IHQsXG5cbiAgICAgICAgICAvLyBCLjIuM1xuICAgICAgICAgIHN1YnN0cjogdCxcbiAgICAgICAgICBhbmNob3I6IHQsXG4gICAgICAgICAgYmlnOiB0LFxuICAgICAgICAgIGJsaW5rOiB0LFxuICAgICAgICAgIGJvbGQ6IHQsXG4gICAgICAgICAgZml4ZWQ6IHQsXG4gICAgICAgICAgZm9udGNvbG9yOiB0LFxuICAgICAgICAgIGZvbnRzaXplOiB0LFxuICAgICAgICAgIGl0YWxpY3M6IHQsXG4gICAgICAgICAgbGluazogdCxcbiAgICAgICAgICBzbWFsbDogdCxcbiAgICAgICAgICBzdHJpa2U6IHQsXG4gICAgICAgICAgc3ViOiB0LFxuICAgICAgICAgIHN1cDogdCxcblxuICAgICAgICAgIHRyaW1MZWZ0OiB0LCAvLyBub24tc3RhbmRhcmRcbiAgICAgICAgICB0cmltUmlnaHQ6IHQsIC8vIG5vbi1zdGFuZGFyZFxuXG4gICAgICAgICAgLy8gMjEuMS40IGluc3RhbmNlc1xuICAgICAgICAgIGxlbmd0aDogJyonLFxuICAgICAgICB9LFxuICAgICAgfSxcblxuICAgICAgUmVnRXhwOiB7XG4gICAgICAgIC8vIDIxLjJcbiAgICAgICAgcHJvdG90eXBlOiB7XG4gICAgICAgICAgZXhlYzogdCxcbiAgICAgICAgICBmbGFnczogJ21heWJlQWNjZXNzb3InLFxuICAgICAgICAgIGdsb2JhbDogJ21heWJlQWNjZXNzb3InLFxuICAgICAgICAgIGlnbm9yZUNhc2U6ICdtYXliZUFjY2Vzc29yJyxcbiAgICAgICAgICBbU3ltYm9sLm1hdGNoXTogJyonLCAvLyBFUy1IYXJtb255XG4gICAgICAgICAgbXVsdGlsaW5lOiAnbWF5YmVBY2Nlc3NvcicsXG4gICAgICAgICAgW1N5bWJvbC5yZXBsYWNlXTogJyonLCAvLyBFUy1IYXJtb255XG4gICAgICAgICAgW1N5bWJvbC5zZWFyY2hdOiAnKicsIC8vIEVTLUhhcm1vbnlcbiAgICAgICAgICBzb3VyY2U6ICdtYXliZUFjY2Vzc29yJyxcbiAgICAgICAgICBbU3ltYm9sLnNwbGl0XTogJyonLCAvLyBFUy1IYXJtb255XG4gICAgICAgICAgc3RpY2t5OiAnbWF5YmVBY2Nlc3NvcicsXG4gICAgICAgICAgdGVzdDogdCxcbiAgICAgICAgICB1bmljb2RlOiAnbWF5YmVBY2Nlc3NvcicsIC8vIEVTLUhhcm1vbnlcbiAgICAgICAgICBkb3RBbGw6ICdtYXliZUFjY2Vzc29yJywgLy8gcHJvcG9zZWQgRVMtSGFybW9ueVxuXG4gICAgICAgICAgLy8gQi4yLjVcbiAgICAgICAgICBjb21waWxlOiBmYWxzZSwgLy8gVU5TQUZFLiBQdXJwb3NlbHkgc3VwcHJlc3NlZFxuXG4gICAgICAgICAgLy8gMjEuMi42IGluc3RhbmNlc1xuICAgICAgICAgIGxhc3RJbmRleDogJyonLFxuICAgICAgICAgIG9wdGlvbnM6ICcqJywgLy8gbm9uLXN0ZFxuICAgICAgICB9LFxuICAgICAgfSxcblxuICAgICAgLy8gMjIgSW5kZXhlZCBDb2xsZWN0aW9uc1xuXG4gICAgICBBcnJheToge1xuICAgICAgICAvLyAyMi4xXG4gICAgICAgIGZyb206IGosXG4gICAgICAgIGlzQXJyYXk6IHQsXG4gICAgICAgIG9mOiBqLCAvLyBFUy1IYXJtb255P1xuICAgICAgICBwcm90b3R5cGU6IHtcbiAgICAgICAgICBjb25jYXQ6IHQsXG4gICAgICAgICAgY29weVdpdGhpbjogdCwgLy8gRVMtSGFybW9ueVxuICAgICAgICAgIGVudHJpZXM6IHQsIC8vIEVTLUhhcm1vbnlcbiAgICAgICAgICBldmVyeTogdCxcbiAgICAgICAgICBmaWxsOiB0LCAvLyBFUy1IYXJtb255XG4gICAgICAgICAgZmlsdGVyOiBqLFxuICAgICAgICAgIGZpbmQ6IHQsIC8vIEVTLUhhcm1vbnlcbiAgICAgICAgICBmaW5kSW5kZXg6IHQsIC8vIEVTLUhhcm1vbnlcbiAgICAgICAgICBmb3JFYWNoOiBqLFxuICAgICAgICAgIGluY2x1ZGVzOiB0LCAvLyBFUy1IYXJtb255XG4gICAgICAgICAgaW5kZXhPZjogaixcbiAgICAgICAgICBqb2luOiB0LFxuICAgICAgICAgIGtleXM6IHQsIC8vIEVTLUhhcm1vbnlcbiAgICAgICAgICBsYXN0SW5kZXhPZjogaixcbiAgICAgICAgICBtYXA6IGosXG4gICAgICAgICAgcG9wOiBqLFxuICAgICAgICAgIHB1c2g6IGosXG4gICAgICAgICAgcmVkdWNlOiBqLFxuICAgICAgICAgIHJlZHVjZVJpZ2h0OiBqLFxuICAgICAgICAgIHJldmVyc2U6IHQsXG4gICAgICAgICAgc2hpZnQ6IGosXG4gICAgICAgICAgc2xpY2U6IGosXG4gICAgICAgICAgc29tZTogdCxcbiAgICAgICAgICBzb3J0OiB0LFxuICAgICAgICAgIHNwbGljZTogdCxcbiAgICAgICAgICB1bnNoaWZ0OiBqLFxuICAgICAgICAgIHZhbHVlczogdCwgLy8gRVMtSGFybW9ueVxuXG4gICAgICAgICAgLy8gMjIuMS40IGluc3RhbmNlc1xuICAgICAgICAgIGxlbmd0aDogJyonLFxuICAgICAgICB9LFxuICAgICAgfSxcblxuICAgICAgLy8gMjIuMiBUeXBlZCBBcnJheSBzdHVmZlxuICAgICAgLy8gVE9ETzogTm90IHlldCBvcmdhbml6ZWQgYWNjb3JkaW5nIHRvIHNwZWMgb3JkZXJcblxuICAgICAgSW50OEFycmF5OiBUeXBlZEFycmF5V2hpdGVsaXN0LFxuICAgICAgVWludDhBcnJheTogVHlwZWRBcnJheVdoaXRlbGlzdCxcbiAgICAgIFVpbnQ4Q2xhbXBlZEFycmF5OiBUeXBlZEFycmF5V2hpdGVsaXN0LFxuICAgICAgSW50MTZBcnJheTogVHlwZWRBcnJheVdoaXRlbGlzdCxcbiAgICAgIFVpbnQxNkFycmF5OiBUeXBlZEFycmF5V2hpdGVsaXN0LFxuICAgICAgSW50MzJBcnJheTogVHlwZWRBcnJheVdoaXRlbGlzdCxcbiAgICAgIFVpbnQzMkFycmF5OiBUeXBlZEFycmF5V2hpdGVsaXN0LFxuICAgICAgRmxvYXQzMkFycmF5OiBUeXBlZEFycmF5V2hpdGVsaXN0LFxuICAgICAgRmxvYXQ2NEFycmF5OiBUeXBlZEFycmF5V2hpdGVsaXN0LFxuXG4gICAgICAvLyAyMyBLZXllZCBDb2xsZWN0aW9ucyAgICAgICAgICBhbGwgRVMtSGFybW9ueVxuXG4gICAgICBNYXA6IHtcbiAgICAgICAgLy8gMjMuMVxuICAgICAgICBwcm90b3R5cGU6IHtcbiAgICAgICAgICBjbGVhcjogaixcbiAgICAgICAgICBkZWxldGU6IGosXG4gICAgICAgICAgZW50cmllczogaixcbiAgICAgICAgICBmb3JFYWNoOiBqLFxuICAgICAgICAgIGdldDogaixcbiAgICAgICAgICBoYXM6IGosXG4gICAgICAgICAga2V5czogaixcbiAgICAgICAgICBzZXQ6IGosXG4gICAgICAgICAgc2l6ZTogJ21heWJlQWNjZXNzb3InLFxuICAgICAgICAgIHZhbHVlczogaixcbiAgICAgICAgfSxcbiAgICAgIH0sXG5cbiAgICAgIFNldDoge1xuICAgICAgICAvLyAyMy4yXG4gICAgICAgIHByb3RvdHlwZToge1xuICAgICAgICAgIGFkZDogaixcbiAgICAgICAgICBjbGVhcjogaixcbiAgICAgICAgICBkZWxldGU6IGosXG4gICAgICAgICAgZW50cmllczogaixcbiAgICAgICAgICBmb3JFYWNoOiBqLFxuICAgICAgICAgIGhhczogaixcbiAgICAgICAgICBrZXlzOiBqLFxuICAgICAgICAgIHNpemU6ICdtYXliZUFjY2Vzc29yJyxcbiAgICAgICAgICB2YWx1ZXM6IGosXG4gICAgICAgIH0sXG4gICAgICB9LFxuXG4gICAgICBXZWFrTWFwOiB7XG4gICAgICAgIC8vIDIzLjNcbiAgICAgICAgcHJvdG90eXBlOiB7XG4gICAgICAgICAgLy8gTm90ZTogY29vcmRpbmF0ZSB0aGlzIGxpc3Qgd2l0aCBtYWludGVuYW5jZSBvZiByZXBhaXJFUzUuanNcbiAgICAgICAgICBkZWxldGU6IGosXG4gICAgICAgICAgZ2V0OiBqLFxuICAgICAgICAgIGhhczogaixcbiAgICAgICAgICBzZXQ6IGosXG4gICAgICAgIH0sXG4gICAgICB9LFxuXG4gICAgICBXZWFrU2V0OiB7XG4gICAgICAgIC8vIDIzLjRcbiAgICAgICAgcHJvdG90eXBlOiB7XG4gICAgICAgICAgYWRkOiBqLFxuICAgICAgICAgIGRlbGV0ZTogaixcbiAgICAgICAgICBoYXM6IGosXG4gICAgICAgIH0sXG4gICAgICB9LFxuXG4gICAgICAvLyAyNCBTdHJ1Y3R1cmVkIERhdGFcblxuICAgICAgQXJyYXlCdWZmZXI6IHtcbiAgICAgICAgLy8gMjQuMSAgICAgICAgICAgIGFsbCBFUy1IYXJtb255XG4gICAgICAgIGlzVmlldzogdCxcbiAgICAgICAgbGVuZ3RoOiB0LCAvLyBkb2VzIG5vdCBpbmhlcml0IGZyb20gRnVuY3Rpb24ucHJvdG90eXBlIG9uIENocm9tZVxuICAgICAgICBuYW1lOiB0LCAvLyBkaXR0b1xuICAgICAgICBwcm90b3R5cGU6IHtcbiAgICAgICAgICBieXRlTGVuZ3RoOiAnbWF5YmVBY2Nlc3NvcicsXG4gICAgICAgICAgc2xpY2U6IHQsXG4gICAgICAgIH0sXG4gICAgICB9LFxuXG4gICAgICAvLyAyNC4yIFRPRE86IE9taXR0aW5nIFNoYXJlZEFycmF5QnVmZmVyIGZvciBub3dcblxuICAgICAgRGF0YVZpZXc6IHtcbiAgICAgICAgLy8gMjQuMyAgICAgICAgICAgICAgIGFsbCBFUy1IYXJtb255XG4gICAgICAgIGxlbmd0aDogdCwgLy8gZG9lcyBub3QgaW5oZXJpdCBmcm9tIEZ1bmN0aW9uLnByb3RvdHlwZSBvbiBDaHJvbWVcbiAgICAgICAgbmFtZTogdCwgLy8gZGl0dG9cbiAgICAgICAgQllURVNfUEVSX0VMRU1FTlQ6ICcqJywgLy8gbm9uLXN0YW5kYXJkLiByZWFsbHk/XG4gICAgICAgIHByb3RvdHlwZToge1xuICAgICAgICAgIGJ1ZmZlcjogJ21heWJlQWNjZXNzb3InLFxuICAgICAgICAgIGJ5dGVPZmZzZXQ6ICdtYXliZUFjY2Vzc29yJyxcbiAgICAgICAgICBieXRlTGVuZ3RoOiAnbWF5YmVBY2Nlc3NvcicsXG4gICAgICAgICAgZ2V0RmxvYXQzMjogdCxcbiAgICAgICAgICBnZXRGbG9hdDY0OiB0LFxuICAgICAgICAgIGdldEludDg6IHQsXG4gICAgICAgICAgZ2V0SW50MTY6IHQsXG4gICAgICAgICAgZ2V0SW50MzI6IHQsXG4gICAgICAgICAgZ2V0VWludDg6IHQsXG4gICAgICAgICAgZ2V0VWludDE2OiB0LFxuICAgICAgICAgIGdldFVpbnQzMjogdCxcbiAgICAgICAgICBzZXRGbG9hdDMyOiB0LFxuICAgICAgICAgIHNldEZsb2F0NjQ6IHQsXG4gICAgICAgICAgc2V0SW50ODogdCxcbiAgICAgICAgICBzZXRJbnQxNjogdCxcbiAgICAgICAgICBzZXRJbnQzMjogdCxcbiAgICAgICAgICBzZXRVaW50ODogdCxcbiAgICAgICAgICBzZXRVaW50MTY6IHQsXG4gICAgICAgICAgc2V0VWludDMyOiB0LFxuICAgICAgICB9LFxuICAgICAgfSxcblxuICAgICAgLy8gMjQuNCBUT0RPOiBPbWl0dGluZyBBdG9taWNzIGZvciBub3dcblxuICAgICAgSlNPTjoge1xuICAgICAgICAvLyAyNC41XG4gICAgICAgIHBhcnNlOiBqLFxuICAgICAgICBzdHJpbmdpZnk6IGosXG4gICAgICB9LFxuXG4gICAgICAvLyAyNSBDb250cm9sIEFic3RyYWN0aW9uIE9iamVjdHNcblxuICAgICAgUHJvbWlzZToge1xuICAgICAgICAvLyAyNS40XG4gICAgICAgIGFsbDogaixcbiAgICAgICAgcmFjZTogaixcbiAgICAgICAgcmVqZWN0OiBqLFxuICAgICAgICByZXNvbHZlOiBqLFxuICAgICAgICBtYWtlSGFuZGxlZDogdCwgLy8gZXZlbnR1YWwtc2VuZFxuICAgICAgICBwcm90b3R5cGU6IHtcbiAgICAgICAgICBjYXRjaDogdCxcbiAgICAgICAgICB0aGVuOiBqLFxuICAgICAgICAgIGZpbmFsbHk6IHQsIC8vIHByb3Bvc2VkIEVTLUhhcm1vbnlcblxuICAgICAgICAgIC8vIGV2ZW50dWFsLXNlbmRcbiAgICAgICAgICBkZWxldGU6IHQsXG4gICAgICAgICAgZ2V0OiB0LFxuICAgICAgICAgIHB1dDogdCxcbiAgICAgICAgICBwb3N0OiB0LFxuICAgICAgICAgIGludm9rZTogdCxcbiAgICAgICAgICBmYXBwbHk6IHQsXG4gICAgICAgICAgZmNhbGw6IHQsXG5cbiAgICAgICAgICAvLyBuYW5vcS5qc1xuICAgICAgICAgIGRlbDogdCxcblxuICAgICAgICAgIC8vIFRlbXBvcmFyeSBjb21wYXQgd2l0aCB0aGUgb2xkIG1ha2VRLmpzXG4gICAgICAgICAgc2VuZDogdCxcbiAgICAgICAgICBlbmQ6IHQsXG4gICAgICAgIH0sXG4gICAgICB9LFxuXG4gICAgICAvLyBuYW5vcS5qc1xuICAgICAgUToge1xuICAgICAgICBhbGw6IHQsXG4gICAgICAgIHJhY2U6IHQsXG4gICAgICAgIHJlamVjdDogdCxcbiAgICAgICAgcmVzb2x2ZTogdCxcblxuICAgICAgICBqb2luOiB0LFxuICAgICAgICBpc1Bhc3NCeUNvcHk6IHQsXG4gICAgICAgIHBhc3NCeUNvcHk6IHQsXG4gICAgICAgIG1ha2VSZW1vdGU6IHQsXG4gICAgICAgIG1ha2VGYXI6IHQsXG5cbiAgICAgICAgLy8gVGVtcG9yYXJ5IGNvbXBhdCB3aXRoIHRoZSBvbGQgbWFrZVEuanNcbiAgICAgICAgc2hvcnRlbjogdCxcbiAgICAgICAgaXNQcm9taXNlOiB0LFxuICAgICAgICBhc3luYzogdCxcbiAgICAgICAgcmVqZWN0ZWQ6IHQsXG4gICAgICAgIHByb21pc2U6IHQsXG4gICAgICAgIGRlbGF5OiB0LFxuICAgICAgICBtZW1vaXplOiB0LFxuICAgICAgICBkZWZlcjogdCxcbiAgICAgIH0sXG5cbiAgICAgIC8vIDI2IFJlZmxlY3Rpb25cblxuICAgICAgUmVmbGVjdDoge1xuICAgICAgICAvLyAyNi4xXG4gICAgICAgIGFwcGx5OiB0LFxuICAgICAgICBjb25zdHJ1Y3Q6IHQsXG4gICAgICAgIGRlZmluZVByb3BlcnR5OiB0LFxuICAgICAgICBkZWxldGVQcm9wZXJ0eTogdCxcbiAgICAgICAgZ2V0OiB0LFxuICAgICAgICBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I6IHQsXG4gICAgICAgIGdldFByb3RvdHlwZU9mOiB0LFxuICAgICAgICBoYXM6IHQsXG4gICAgICAgIGlzRXh0ZW5zaWJsZTogdCxcbiAgICAgICAgb3duS2V5czogdCxcbiAgICAgICAgcHJldmVudEV4dGVuc2lvbnM6IHQsXG4gICAgICAgIHNldDogdCxcbiAgICAgICAgc2V0UHJvdG90eXBlT2Y6IHQsXG4gICAgICB9LFxuXG4gICAgICBQcm94eToge1xuICAgICAgICAvLyAyNi4yXG4gICAgICAgIHJldm9jYWJsZTogdCxcbiAgICAgIH0sXG5cbiAgICAgIC8vIEFwcGVuZGl4IEJcblxuICAgICAgLy8gQi4yLjFcbiAgICAgIGVzY2FwZTogdCxcbiAgICAgIHVuZXNjYXBlOiB0LFxuXG4gICAgICAvLyBCLjIuNSAoUmVnRXhwLnByb3RvdHlwZS5jb21waWxlKSBpcyBtYXJrZWQgJ2ZhbHNlJyB1cCBpbiAyMS4yXG5cbiAgICAgIC8vIE90aGVyXG5cbiAgICAgIFN0cmluZ01hcDoge1xuICAgICAgICAvLyBBIHNwZWNpYWxpemVkIGFwcHJveGltYXRpb24gb2YgRVMtSGFybW9ueSdzIE1hcC5cbiAgICAgICAgcHJvdG90eXBlOiB7fSwgLy8gVGVjaG5pY2FsbHksIHRoZSBtZXRob2RzIHNob3VsZCBiZSBvbiB0aGUgcHJvdG90eXBlLFxuICAgICAgICAvLyBidXQgZG9pbmcgc28gd2hpbGUgcHJlc2VydmluZyBlbmNhcHN1bGF0aW9uIHdpbGwgYmVcbiAgICAgICAgLy8gbmVlZGxlc3NseSBleHBlbnNpdmUgZm9yIGN1cnJlbnQgdXNhZ2UuXG4gICAgICB9LFxuXG4gICAgICBSZWFsbToge1xuICAgICAgICBtYWtlUm9vdFJlYWxtOiB0LFxuICAgICAgICBtYWtlQ29tcGFydG1lbnQ6IHQsXG4gICAgICAgIHByb3RvdHlwZToge1xuICAgICAgICAgIGdsb2JhbDogJ21heWJlQWNjZXNzb3InLFxuICAgICAgICAgIGV2YWx1YXRlOiB0LFxuICAgICAgICB9LFxuICAgICAgfSxcblxuICAgICAgU0VTOiB7XG4gICAgICAgIGNvbmZpbmU6IHQsXG4gICAgICAgIGNvbmZpbmVFeHByOiB0LFxuICAgICAgICBoYXJkZW46IHQsXG4gICAgICB9LFxuXG4gICAgICBOYXQ6IGosXG4gICAgICBkZWY6IGosXG4gICAgfSxcbiAgfTtcblxuICBmdW5jdGlvbiBtYWtlQ29uc29sZShwYXJlbnRDb25zb2xlKSB7XG4gICAgLyogJ3BhcmVudENvbnNvbGUnIGlzIHRoZSBwYXJlbnQgUmVhbG0ncyBvcmlnaW5hbCAnY29uc29sZScgb2JqZWN0LiBXZSBtdXN0XG4gICAgICAgd3JhcCBpdCwgZXhwb3NpbmcgYSAnY29uc29sZScgd2l0aCBhICdjb25zb2xlLmxvZycgKGFuZCBwZXJoYXBzIG90aGVycylcbiAgICAgICB0byB0aGUgbG9jYWwgcmVhbG0sIHdpdGhvdXQgYWxsb3dpbmcgYWNjZXNzIHRvIHRoZSBvcmlnaW5hbCAnY29uc29sZScsXG4gICAgICAgaXRzIHJldHVybiB2YWx1ZXMsIG9yIGl0cyBleGNlcHRpb24gb2JqZWN0cywgYW55IG9mIHdoaWNoIGNvdWxkIGJlIHVzZWRcbiAgICAgICB0byBicmVhayBjb25maW5lbWVudCB2aWEgdGhlIHVuc2FmZSBGdW5jdGlvbiBjb25zdHJ1Y3Rvci4gKi9cblxuICAgIC8vIGNhbGxBbmRXcmFwRXJyb3IgaXMgY29waWVkIGZyb20gcHJvcG9zYWwtcmVhbG1zL3NoaW0vc3JjL3JlYWxtRmFjYWRlLmpzXG4gICAgLy8gTGlrZSBSZWFsbS5hcHBseSBleGNlcHQgdGhhdCBpdCBjYXRjaGVzIGFueXRoaW5nIHRocm93biBhbmQgcmV0aHJvd3MgaXRcbiAgICAvLyBhcyBhbiBFcnJvciBmcm9tIHRoaXMgcmVhbG1cblxuICAgIGNvbnN0IGVycm9yQ29uc3RydWN0b3JzID0gbmV3IE1hcChbXG4gICAgICBbJ0V2YWxFcnJvcicsIEV2YWxFcnJvcl0sXG4gICAgICBbJ1JhbmdlRXJyb3InLCBSYW5nZUVycm9yXSxcbiAgICAgIFsnUmVmZXJlbmNlRXJyb3InLCBSZWZlcmVuY2VFcnJvcl0sXG4gICAgICBbJ1N5bnRheEVycm9yJywgU3ludGF4RXJyb3JdLFxuICAgICAgWydUeXBlRXJyb3InLCBUeXBlRXJyb3JdLFxuICAgICAgWydVUklFcnJvcicsIFVSSUVycm9yXSxcbiAgICBdKTtcblxuICAgIGZ1bmN0aW9uIGNhbGxBbmRXcmFwRXJyb3IodGFyZ2V0LCAuLi5hcmdzKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gdGFyZ2V0KC4uLmFyZ3MpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGlmIChPYmplY3QoZXJyKSAhPT0gZXJyKSB7XG4gICAgICAgICAgLy8gZXJyIGlzIGEgcHJpbWl0aXZlIHZhbHVlLCB3aGljaCBpcyBzYWZlIHRvIHJldGhyb3dcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGVOYW1lO1xuICAgICAgICBsZXQgZU1lc3NhZ2U7XG4gICAgICAgIGxldCBlU3RhY2s7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gVGhlIGNoaWxkIGVudmlyb25tZW50IG1pZ2h0IHNlZWsgdG8gdXNlICdlcnInIHRvIHJlYWNoIHRoZVxuICAgICAgICAgIC8vIHBhcmVudCdzIGludHJpbnNpY3MgYW5kIGNvcnJ1cHQgdGhlbS4gYCR7ZXJyLm5hbWV9YCB3aWxsIGNhdXNlXG4gICAgICAgICAgLy8gc3RyaW5nIGNvZXJjaW9uIG9mICdlcnIubmFtZScuIElmIGVyci5uYW1lIGlzIGFuIG9iamVjdCAocHJvYmFibHlcbiAgICAgICAgICAvLyBhIFN0cmluZyBvZiB0aGUgcGFyZW50IFJlYWxtKSwgdGhlIGNvZXJjaW9uIHVzZXNcbiAgICAgICAgICAvLyBlcnIubmFtZS50b1N0cmluZygpLCB3aGljaCBpcyB1bmRlciB0aGUgY29udHJvbCBvZiB0aGUgcGFyZW50LiBJZlxuICAgICAgICAgIC8vIGVyci5uYW1lIHdlcmUgYSBwcmltaXRpdmUgKGUuZy4gYSBudW1iZXIpLCBpdCB3b3VsZCB1c2VcbiAgICAgICAgICAvLyBOdW1iZXIudG9TdHJpbmcoZXJyLm5hbWUpLCB1c2luZyB0aGUgY2hpbGQncyB2ZXJzaW9uIG9mIE51bWJlclxuICAgICAgICAgIC8vICh3aGljaCB0aGUgY2hpbGQgY291bGQgbW9kaWZ5IHRvIGNhcHR1cmUgaXRzIGFyZ3VtZW50IGZvciBsYXRlclxuICAgICAgICAgIC8vIHVzZSksIGhvd2V2ZXIgcHJpbWl0aXZlcyBkb24ndCBoYXZlIHByb3BlcnRpZXMgbGlrZSAucHJvdG90eXBlIHNvXG4gICAgICAgICAgLy8gdGhleSBhcmVuJ3QgdXNlZnVsIGZvciBhbiBhdHRhY2suXG4gICAgICAgICAgZU5hbWUgPSBgJHtlcnIubmFtZX1gO1xuICAgICAgICAgIGVNZXNzYWdlID0gYCR7ZXJyLm1lc3NhZ2V9YDtcbiAgICAgICAgICBlU3RhY2sgPSBgJHtlcnIuc3RhY2sgfHwgZU1lc3NhZ2V9YDtcbiAgICAgICAgICAvLyBlTmFtZS9lTWVzc2FnZS9lU3RhY2sgYXJlIG5vdyBjaGlsZC1yZWFsbSBwcmltaXRpdmUgc3RyaW5ncywgYW5kXG4gICAgICAgICAgLy8gc2FmZSB0byBleHBvc2VcbiAgICAgICAgfSBjYXRjaCAoaWdub3JlZCkge1xuICAgICAgICAgIC8vIGlmIGVyci5uYW1lLnRvU3RyaW5nKCkgdGhyb3dzLCBrZWVwIHRoZSAocGFyZW50IHJlYWxtKSBFcnJvciBhd2F5XG4gICAgICAgICAgLy8gZnJvbSB0aGUgY2hpbGRcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vua25vd24gZXJyb3InKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBFcnJvckNvbnN0cnVjdG9yID0gZXJyb3JDb25zdHJ1Y3RvcnMuZ2V0KGVOYW1lKSB8fCBFcnJvcjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3JDb25zdHJ1Y3RvcihlTWVzc2FnZSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycjIpIHtcbiAgICAgICAgICBlcnIyLnN0YWNrID0gZVN0YWNrOyAvLyByZXBsYWNlIHdpdGggdGhlIGNhcHR1cmVkIGlubmVyIHN0YWNrXG4gICAgICAgICAgdGhyb3cgZXJyMjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IG5ld0NvbnNvbGUgPSB7fTtcbiAgICBjb25zdCBwYXNzVGhyb3VnaCA9IFtcbiAgICAgICdsb2cnLFxuICAgICAgJ2luZm8nLFxuICAgICAgJ3dhcm4nLFxuICAgICAgJ2Vycm9yJyxcbiAgICAgICdncm91cCcsXG4gICAgICAnZ3JvdXBFbmQnLFxuICAgICAgJ3RyYWNlJyxcbiAgICAgICd0aW1lJyxcbiAgICAgICd0aW1lTG9nJyxcbiAgICAgICd0aW1lRW5kJyxcbiAgICBdO1xuICAgIC8vIFRPRE86IHRob3NlIGFyZSB0aGUgcHJvcGVydGllcyB0aGF0IE1ETiBkb2N1bWVudHMuIE5vZGUuanMgaGFzIGEgYnVuY2hcbiAgICAvLyBvZiBhZGRpdGlvbmFsIG9uZXMgdGhhdCBJIGRpZG4ndCBpbmNsdWRlLCB3aGljaCBtaWdodCBiZSBhcHByb3ByaWF0ZS5cblxuICAgIHBhc3NUaHJvdWdoLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICAvLyBUT0RPOiBkbyB3ZSByZXZlYWwgdGhlIHByZXNlbmNlL2Fic2VuY2Ugb2YgdGhlc2UgcHJvcGVydGllcyB0byB0aGVcbiAgICAgIC8vIGNoaWxkIHJlYWxtLCB0aHVzIGV4cG9zaW5nIG5vbmRldGVybWluaXNtIChhbmQgYSBoaW50IG9mIHdoYXQgcGxhdGZvcm1cbiAgICAgIC8vIHlvdSBtaWdodCBiZSBvbikgd2hlbiBpdCBpcyBjb25zdHJ1Y3RlZCB3aXRoIHtjb25zb2xlTW9kZTogYWxsb3d9ID8gT3JcbiAgICAgIC8vIHNob3VsZCB3ZSBleHBvc2UgdGhlIHNhbWUgc2V0IGFsbCB0aGUgdGltZSwgYnV0IHNpbGVudGx5IGlnbm9yZSBjYWxsc1xuICAgICAgLy8gdG8gdGhlIG1pc3Npbmcgb25lcywgdG8gaGlkZSB0aGF0IHZhcmlhdGlvbj8gV2UgbWlnaHQgZXZlbiBjb25zaWRlclxuICAgICAgLy8gYWRkaW5nIGNvbnNvbGUuKiB0byB0aGUgY2hpbGQgcmVhbG0gYWxsIHRoZSB0aW1lLCBldmVuIHdpdGhvdXRcbiAgICAgIC8vIGNvbnNvbGVNb2RlOmFsbG93LCBidXQgaWdub3JlIHRoZSBjYWxscyB1bmxlc3MgdGhlIG1vZGUgaXMgZW5hYmxlZC5cbiAgICAgIGlmIChuYW1lIGluIHBhcmVudENvbnNvbGUpIHtcbiAgICAgICAgY29uc3Qgb3JpZyA9IHBhcmVudENvbnNvbGVbbmFtZV07XG4gICAgICAgIC8vIFRPRE86IGluIGEgc3RhY2sgdHJhY2UsIHRoaXMgYXBwZWFycyBhc1xuICAgICAgICAvLyBcIk9iamVjdC5uZXdDb25zb2xlLihhbm9ueW1vdXMgZnVuY3Rpb24pIFthcyB0cmFjZV1cIlxuICAgICAgICAvLyBjYW4gd2UgbWFrZSB0aGF0IFwibmV3Q29uc29sZS50cmFjZVwiID9cbiAgICAgICAgbmV3Q29uc29sZVtuYW1lXSA9IGZ1bmN0aW9uIG5ld2VyQ29uc29sZSguLi5hcmdzKSB7XG4gICAgICAgICAgY2FsbEFuZFdyYXBFcnJvcihvcmlnLCAuLi5hcmdzKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBuZXdDb25zb2xlO1xuICB9XG5cbiAgZnVuY3Rpb24gbWFrZU1ha2VSZXF1aXJlKHIsIGhhcmRlbikge1xuICAgIGZ1bmN0aW9uIG1ha2VSZXF1aXJlKGNvbmZpZykge1xuICAgICAgY29uc3QgY2FjaGUgPSBuZXcgTWFwKCk7XG5cbiAgICAgIGZ1bmN0aW9uIGJ1aWxkKHdoYXQpIHtcbiAgICAgICAgLy8gVGhpcyBhcHByb2FjaCBkZW5pZXMgY2FsbGVycyB0aGUgYWJpbGl0eSB0byB1c2UgaW5oZXJpdGFuY2UgdG9cbiAgICAgICAgLy8gbWFuYWdlIHRoZWlyIGNvbmZpZyBvYmplY3RzLCBidXQgYSBzaW1wbGUgXCJpZiAod2hhdCBpbiBjb25maWcpXCJcbiAgICAgICAgLy8gcHJlZGljYXRlIHdvdWxkIGFsc28gYmUgdHJ1dGh5IGZvciBlLmcuIFwidG9TdHJpbmdcIiBhbmQgb3RoZXJcbiAgICAgICAgLy8gcHJvcGVydGllcyBvZiBPYmplY3QucHJvdG90eXBlLCBhbmQgcmVxdWlyZSgndG9TdHJpbmcnKSBzaG91bGQgYmVcbiAgICAgICAgLy8gbGVnYWwgaWYgYW5kIG9ubHkgaWYgdGhlIGNvbmZpZyBvYmplY3QgaW5jbHVkZWQgYW4gb3duLXByb3BlcnR5XG4gICAgICAgIC8vIG5hbWVkICd0b1N0cmluZycuIEluY2lkZW50YWxseSwgdGhpcyBjb3VsZCBoYXZlIGJlZW5cbiAgICAgICAgLy8gXCJjb25maWcuaGFzT3duUHJvcGVydHkod2hhdClcIiBidXQgZXNsaW50IGNvbXBsYWluZWQuXG4gICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNvbmZpZywgd2hhdCkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBmaW5kIG1vZHVsZSAnJHt3aGF0fSdgKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjID0gY29uZmlnW3doYXRdO1xuXG4gICAgICAgIC8vIHNvbWUgbW9kdWxlcyBhcmUgaGFyZC1jb2RlZCB3YXlzIHRvIGFjY2VzcyBmdW5jdGlvbmFsaXR5IHRoYXQgU0VTXG4gICAgICAgIC8vIHByb3ZpZGVzIGRpcmVjdGx5XG4gICAgICAgIGlmICh3aGF0ID09PSAnQGFnb3JpYy9oYXJkZW4nKSB7XG4gICAgICAgICAgcmV0dXJuIGhhcmRlbjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHRoZSBjb25maWcgcG9pbnRzIGF0IGEgc2ltcGxlIGZ1bmN0aW9uLCBpdCBtdXN0IGJlIGEgcHVyZVxuICAgICAgICAvLyBmdW5jdGlvbiB3aXRoIG5vIGRlcGVuZGVuY2llcyAoaS5lLiBubyAncmVxdWlyZScgb3IgJ2ltcG9ydCcsIG5vXG4gICAgICAgIC8vIGNhbGxzIHRvIG90aGVyIGZ1bmN0aW9ucyBkZWZpbmVkIGluIHRoZSBzYW1lIGZpbGUgYnV0IG91dHNpZGUgdGhlXG4gICAgICAgIC8vIGZ1bmN0aW9uIGJvZHkpLiBXZSBzdHJpbmdpZnkgaXQgYW5kIGV2YWx1YXRlIGl0IGluc2lkZSB0aGlzIHJlYWxtLlxuICAgICAgICBpZiAodHlwZW9mIGMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICByZXR1cm4gci5ldmFsdWF0ZShgKCR7Y30pYCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBlbHNlIHdlIHRyZWF0IGl0IGFzIGFuIG9iamVjdCB3aXRoIGFuICdhdHRlbnVhdG9yU291cmNlJyBwcm9wZXJ0eVxuICAgICAgICAvLyB0aGF0IGRlZmluZXMgYW4gYXR0ZW51YXRvciBmdW5jdGlvbiwgd2hpY2ggd2UgZXZhbHVhdGUuIFdlIHRoZW5cbiAgICAgICAgLy8gaW52b2tlIGl0IHdpdGggdGhlIGNvbmZpZyBvYmplY3QsIHdoaWNoIGNhbiBjb250YWluIGF1dGhvcml0aWVzIHRoYXRcbiAgICAgICAgLy8gaXQgY2FuIHdyYXAuIFRoZSByZXR1cm4gdmFsdWUgZnJvbSB0aGlzIGludm9jYXRpb24gaXMgdGhlIG1vZHVsZVxuICAgICAgICAvLyBvYmplY3QgdGhhdCBnZXRzIHJldHVybmVkIGZyb20gcmVxdWlyZSgpLiBUaGUgYXR0ZW51YXRvciBmdW5jdGlvblxuICAgICAgICAvLyBhbmQgdGhlIG1vZHVsZSBpdCByZXR1cm5zIGFyZSBpbi1yZWFsbSwgdGhlIGF1dGhvcml0aWVzIGl0IHdyYXBzXG4gICAgICAgIC8vIHdpbGwgYmUgb3V0LW9mLXJlYWxtLlxuICAgICAgICBjb25zdCBzcmMgPSBgKCR7Yy5hdHRlbnVhdG9yU291cmNlfSlgO1xuICAgICAgICBjb25zdCBhdHRlbnVhdG9yID0gci5ldmFsdWF0ZShzcmMpO1xuICAgICAgICByZXR1cm4gYXR0ZW51YXRvcihjKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gbmV3UmVxdWlyZSh3aGF0QXJnKSB7XG4gICAgICAgIGNvbnN0IHdoYXQgPSBgJHt3aGF0QXJnfWA7XG4gICAgICAgIGlmICghY2FjaGUuaGFzKHdoYXQpKSB7XG4gICAgICAgICAgY2FjaGUuc2V0KHdoYXQsIGhhcmRlbihidWlsZCh3aGF0KSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjYWNoZS5nZXQod2hhdCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXdSZXF1aXJlO1xuICAgIH1cblxuICAgIHJldHVybiBtYWtlUmVxdWlyZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAZmlsZW92ZXJ2aWV3IEV4cG9ydHMge0Bjb2RlIHNlcy5kYXRhUHJvcGVydGllc1RvUmVwYWlyfSwgYSByZWN1cnNpdmVseVxuICAgKiBkZWZpbmVkIEpTT04gcmVjb3JkIGVudW1lcmF0aW5nIHRoZSBvcHRpbWFsIHNldCBvZiBwcm90b3R5cGUgcHJvcGVydGllc1xuICAgKiBvbiBwcmltb3JkaWFscyB0aGF0IG5lZWQgdG8gYmUgcmVwYWlyZWQgYmVmb3JlIGhhcmRlbmluZy5cbiAgICpcbiAgICogLy9wcm92aWRlcyBzZXMuZGF0YVByb3BlcnRpZXNUb1JlcGFpclxuICAgKiBAYXV0aG9yIEpGIFBhcmFkaXNcbiAgICovXG5cbiAgLyoqXG4gICAqIDxwPlRoZSBvcHRpbWFsIHNldCBvZiBwcm90b3R5cGUgcHJvcGVydGllcyB0aGF0IG5lZWQgdG8gYmUgcmVwYWlyZWRcbiAgICogYmVmb3JlIGhhcmRlbmluZyBpcyBhcHBsaWVkIG9uIGVudmlyb21tZW50cyBzdWJqZWN0IHRvIHRoZSBvdmVycmlkZVxuICAgKiBtaXN0YWtlLlxuICAgKlxuICAgKiA8cD5CZWNhdXNlIFwicmVwYWlyaW5nXCIgcmVwbGFjZXMgZGF0YSBwcm9wZXJ0aWVzIHdpdGggYWNjZXNzb3JzLCBldmVyeVxuICAgKiB0aW1lIGEgcmVwYWlyZWQgcHJvcGVydHkgaXMgYWNjZXNzZWQsIHRoZSBhc3NvY2lhdGVkIGdldHRlciBpcyBpbnZva2VkLFxuICAgKiB3aGljaCBkZWdyYWRlcyB0aGUgcnVudGltZSBwZXJmb3JtYW5jZSBvZiBhbGwgY29kZSBleGVjdXRpbmcgaW4gdGhlXG4gICAqIHJlcGFpcmVkIGVudmlyb21tZW50LCBjb21wYXJlZCB0byB0aGUgbm9uLXJlcGFpcmVkIGNhc2UuIEluIG9yZGVyXG4gICAqIHRvIG1haW50YWluIHBlcmZvcm1hbmNlLCB3ZSBvbmx5IHJlcGFpciB0aGUgcHJvcGVydGllcyBvZiBvYmplY3RzXG4gICAqIGZvciB3aGljaCBoYXJkZW5pbmcgY2F1c2VzIGEgYnJlYWthZ2Ugb2YgdGhlaXIgaW50ZW5kZWQgdXNhZ2UuIFRoZXJlXG4gICAqIGFyZSB0aHJlZSBjYXNlczpcbiAgICogPHVsPk92ZXJyaWRpbmcgcHJvcGVydGllcyBvbiBvYmplY3RzIHR5cGljYWxseSB1c2VkIGFzIG1hcHMsXG4gICAqICAgICBuYW1lbHkge0Bjb2RlIFwiT2JqZWN0XCJ9IGFuZCB7QGNvZGUgXCJBcnJheVwifS4gSW4gdGhlIGNhc2Ugb2YgYXJyYXlzLFxuICAgKiAgICAgYSBnaXZlbiBwcm9ncmFtIG1pZ2h0IG5vdCBiZSBhd2FyZSB0aGF0IG5vbi1udW1lcmljYWwgcHJvcGVydGllcyBhcmVcbiAgICogICAgIHN0b3JlZCBvbiB0aGUgdW5kZWx5aW5nIG9iamVjdCBpbnN0YW5jZSwgbm90IG9uIHRoZSBhcnJheS4gV2hlbiBhblxuICAgKiAgICAgb2JqZWN0IGlzIHR5cGljYWxseSB1c2VkIGFzIGEgbWFwLCB3ZSByZXBhaXIgYWxsIG9mIGl0cyBwcm90b3R5cGVcbiAgICogICAgIHByb3BlcnRpZXMuXG4gICAqIDx1bD5PdmVycmlkaW5nIHByb3BlcnRpZXMgb24gb2JqZWN0cyB0aGF0IHByb3ZpZGUgZGVmYXVsdHMgb24gdGhlaXJcbiAgICogICAgIHByb3RvdHlwZSB0aGF0IHByb2dyYW1zIHR5cGljYWxseSBvdmVycmlkZSBieSBhc3NpZ25tZW50LCBzdWNoIGFzXG4gICAqICAgICB7QGNvZGUgXCJFcnJvci5wcm90b3R5cGUubWVzc2FnZVwifSBhbmQge0Bjb2RlIFwiRnVuY3Rpb24ucHJvdG90eXBlLm5hbWVcIn1cbiAgICogICAgIChib3RoIGRlZmF1bHQgdG8gXCJcIikuXG4gICAqIDx1bD5TZXR0aW5nIGEgcHJvdG90eXBlIGNoYWluLiBUaGUgY29uc3RydWN0b3IgaXMgdHlwaWNhbGx5IHNldCBieVxuICAgKiAgICAgYXNzaWdubWVudCwgZm9yIGV4YW1wbGUge0Bjb2RlIFwiQ2hpbGQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ2hpbGRcIn0uXG4gICAqXG4gICAqIDxwPkVhY2ggSlNPTiByZWNvcmQgZW51bWVyYXRlcyB0aGUgZGlzcG9zaXRpb24gb2YgdGhlIHByb3BlcnRpZXMgb25cbiAgICogc29tZSBjb3JyZXNwb25kaW5nIHByaW1vcmRpYWwgb2JqZWN0LCB3aXRoIHRoZSByb290IHJlY29yZCBjb250YWluaW5nOlxuICAgKiA8dWw+XG4gICAqIDxsaT5UaGUgcmVjb3JkIGZvciB0aGUgZ2xvYmFsIG9iamVjdC5cbiAgICogPGxpPlRoZSByZWNvcmQgZm9yIHRoZSBhbm9ueW1vdXMgaW50cmluc2ljcy5cbiAgICogPC91bD5cbiAgICpcbiAgICogPHA+Rm9yIGVhY2ggc3VjaCByZWNvcmQsIHRoZSB2YWx1ZXMgYXNzb2NpYXRlZCB3aXRoIGl0cyBwcm9wZXJ0eVxuICAgKiBuYW1lcyBjYW4gYmU6XG4gICAqIDx1bD5cbiAgICogPGxpPkFub3RoZXIgcmVjb3JkLCBpbiB3aGljaCBjYXNlIHRoaXMgcHJvcGVydHkgaXMgc2ltcGx5IGxlZnRcbiAgICogICAgIHVucmVwYWlyZWQgYW5kIHRoYXQgbmV4dCByZWNvcmQgcmVwcmVzZW50cyB0aGUgZGlzcG9zaXRpb24gb2ZcbiAgICogICAgIHRoZSBvYmplY3Qgd2hpY2ggaXMgaXRzIHZhbHVlLiBGb3IgZXhhbXBsZSwge0Bjb2RlIFwiT2JqZWN0XCJ9XG4gICAqICAgICBsZWFkcyB0byBhbm90aGVyIHJlY29yZCBleHBsYWluaW5nIHdoYXQgcHJvcGVydGllcyB7QGNvZGVcbiAgICogICAgIFwiT2JqZWN0XCJ9IG1heSBoYXZlIGFuZCBob3cgZWFjaCBzdWNoIHByb3BlcnR5LCBpZiBwcmVzZW50LFxuICAgKiAgICAgYW5kIGl0cyB2YWx1ZSBzaG91bGQgYmUgcmVwYWlyZWQuXG4gICAqIDxsaT50cnVlLCBpbiB3aGljaCBjYXNlIHRoaXMgcHJvcGVydHkgaXMgc2ltcGx5IHJlcGFpcmVkLiBUaGVcbiAgICogICAgIHZhbHVlIGFzc29jaWF0ZWQgd2l0aCB0aGF0IHByb3BlcnR5IGlzIG5vdCB0cmF2ZXJzZWQuIEZvclxuICAgKiBcdCAgIGV4YW1wbGUsIHtAY29kZSBcIkZ1bmN0aW9uLnByb3RvdHlwZS5uYW1lXCJ9IGxlYWRzIHRvIHRydWUsXG4gICAqICAgICBtZWFuaW5nIHRoYXQgdGhlIHtAY29kZSBcIm5hbWVcIn0gcHJvcGVydHkgb2Yge0Bjb2RlXG4gICAqICAgICBcIkZ1bmN0aW9uLnByb3RvdHlwZVwifSBzaG91bGQgYmUgcmVwYWlyZWQgKHdoaWNoIGlzIG5lZWRlZFxuICAgKiAgICAgd2hlbiBpbmhlcml0aW5nIGZyb20gQGNvZGV7RnVuY3Rpb259IGFuZCBzZXR0aW5nIHRoZSBzdWJjbGFzcydzXG4gICAqICAgICB7QGNvZGUgXCJwcm90b3R5cGUubmFtZVwifSBwcm9wZXJ0eSkuIElmIHRoZSBwcm9wZXJ0eSBpc1xuICAgKiAgICAgYWxyZWFkeSBhbiBhY2Nlc3NvciBwcm9wZXJ0eSwgaXQgaXMgbm90IHJlcGFpcmVkIChiZWNhdXNlXG4gICAqICAgICBhY2Nlc3NvcnMgYXJlIG5vdCBzdWJqZWN0IHRvIHRoZSBvdmVycmlkZSBtaXN0YWtlKS5cbiAgICogPGxpPlwiKlwiLCBhbGwgcHJvcGVydGllcyBvbiB0aGlzIG9iamVjdCBhcmUgcmVwYWlyZWQuXG4gICAqIDxsaT5mYWxzZXksIGluIHdoaWNoIGNhc2UgdGhpcyBwcm9wZXJ0eSBpcyBza2lwcGVkLlxuICAgKiA8L3VsPlxuICAgKlxuICAgKiA8cD5XZSBmYWN0b3Igb3V0IHtAY29kZSB0cnVlfSBpbnRvIHRoZSB2YXJpYWJsZSB7QGNvZGUgdH0ganVzdCB0b1xuICAgKiBnZXQgYSBiaXQgYmV0dGVyIGNvbXByZXNzaW9uIGZyb20gc2ltcGxlIG1pbmlmaWVycy5cbiAgICovXG5cbiAgY29uc3QgdCQxID0gdHJ1ZTtcblxuICB2YXIgZGF0YVByb3BlcnRpZXNUb1JlcGFpciA9IHtcbiAgICBuYW1lZEludHJpbnNpY3M6IHtcbiAgICAgIE9iamVjdDoge1xuICAgICAgICBwcm90b3R5cGU6ICcqJyxcbiAgICAgIH0sXG5cbiAgICAgIEFycmF5OiB7XG4gICAgICAgIHByb3RvdHlwZTogJyonLFxuICAgICAgfSxcblxuICAgICAgRnVuY3Rpb246IHtcbiAgICAgICAgcHJvdG90eXBlOiB7XG4gICAgICAgICAgY29uc3RydWN0b3I6IHQkMSwgLy8gc2V0IGJ5IFwicmVnZW5lcmF0b3ItcnVudGltZVwiXG4gICAgICAgICAgYmluZDogdCQxLCAvLyBzZXQgYnkgXCJ1bmRlcnNjb3JlXCJcbiAgICAgICAgICBuYW1lOiB0JDEsXG4gICAgICAgICAgdG9TdHJpbmc6IHQkMSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG5cbiAgICAgIEVycm9yOiB7XG4gICAgICAgIHByb3RvdHlwZToge1xuICAgICAgICAgIGNvbnN0cnVjdG9yOiB0JDEsIC8vIHNldCBieSBcImZhc3QtanNvbi1wYXRjaFwiXG4gICAgICAgICAgbWVzc2FnZTogdCQxLFxuICAgICAgICAgIG5hbWU6IHQkMSwgLy8gc2V0IGJ5IFwicHJlY29uZFwiXG4gICAgICAgICAgdG9TdHJpbmc6IHQkMSwgLy8gc2V0IGJ5IFwiYmx1ZWJpcmRcIlxuICAgICAgICB9LFxuICAgICAgfSxcblxuICAgICAgVHlwZUVycm9yOiB7XG4gICAgICAgIHByb3RvdHlwZToge1xuICAgICAgICAgIGNvbnN0cnVjdG9yOiB0JDEsIC8vIHNldCBieSBcInJlYWRhYmxlLXN0cmVhbVwiXG4gICAgICAgICAgbmFtZTogdCQxLCAvLyBzZXQgYnkgXCJyZWFkYWJsZS1zdHJlYW1cIlxuICAgICAgICB9LFxuICAgICAgfSxcblxuICAgICAgUHJvbWlzZToge1xuICAgICAgICBwcm90b3R5cGU6IHtcbiAgICAgICAgICBjb25zdHJ1Y3RvcjogdCQxLCAvLyBzZXQgYnkgXCJjb3JlLWpzXCJcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcblxuICAgIGFub25JbnRyaW5zaWNzOiB7XG4gICAgICBUeXBlZEFycmF5OiB7XG4gICAgICAgIHByb3RvdHlwZTogJyonLFxuICAgICAgfSxcblxuICAgICAgR2VuZXJhdG9yRnVuY3Rpb246IHtcbiAgICAgICAgcHJvdG90eXBlOiB7XG4gICAgICAgICAgY29uc3RydWN0b3I6IHQkMSxcbiAgICAgICAgICBuYW1lOiB0JDEsXG4gICAgICAgICAgdG9TdHJpbmc6IHQkMSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG5cbiAgICAgIEFzeW5jRnVuY3Rpb246IHtcbiAgICAgICAgcHJvdG90eXBlOiB7XG4gICAgICAgICAgY29uc3RydWN0b3I6IHQkMSxcbiAgICAgICAgICBuYW1lOiB0JDEsXG4gICAgICAgICAgdG9TdHJpbmc6IHQkMSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG5cbiAgICAgIEFzeW5jR2VuZXJhdG9yRnVuY3Rpb246IHtcbiAgICAgICAgcHJvdG90eXBlOiB7XG4gICAgICAgICAgY29uc3RydWN0b3I6IHQkMSxcbiAgICAgICAgICBuYW1lOiB0JDEsXG4gICAgICAgICAgdG9TdHJpbmc6IHQkMSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG5cbiAgICAgIEl0ZXJhdG9yUHJvdG90eXBlOiAnKicsXG4gICAgfSxcbiAgfTtcblxuICAvLyBBZGFwdGVkIGZyb20gU0VTL0NhamFcbiAgLy8gQ29weXJpZ2h0IChDKSAyMDExIEdvb2dsZSBJbmMuXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9nb29nbGUvY2FqYS9ibG9iL21hc3Rlci9zcmMvY29tL2dvb2dsZS9jYWphL3Nlcy9zdGFydFNFUy5qc1xuICAvLyBodHRwczovL2dpdGh1Yi5jb20vZ29vZ2xlL2NhamEvYmxvYi9tYXN0ZXIvc3JjL2NvbS9nb29nbGUvY2FqYS9zZXMvcmVwYWlyRVM1LmpzXG5cbiAgZnVuY3Rpb24gcmVwYWlyRGF0YVByb3BlcnRpZXMoaW50cmluc2ljcywgcmVwYWlyUGxhbikge1xuICAgIC8vIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSBpcyBhbGxvd2VkIHRvIGZhaWwgc2lsZW50bHksXG4gICAgLy8gdXNlIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzIGluc3RlYWQuXG5cbiAgICBjb25zdCB7XG4gICAgICBkZWZpbmVQcm9wZXJ0aWVzLFxuICAgICAgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yLFxuICAgICAgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyxcbiAgICAgIHByb3RvdHlwZTogeyBoYXNPd25Qcm9wZXJ0eSB9LFxuICAgIH0gPSBPYmplY3Q7XG5cbiAgICBjb25zdCB7IG93bktleXMgfSA9IFJlZmxlY3Q7XG5cbiAgICAvKipcbiAgICAgKiBGb3IgYSBzcGVjaWFsIHNldCBvZiBwcm9wZXJ0aWVzIChkZWZpbmVkIGluIHRoZSByZXBhaXJQbGFuKSwgaXQgZW5zdXJlc1xuICAgICAqIHRoYXQgdGhlIGVmZmVjdCBvZiBmcmVlemluZyBkb2VzIG5vdCBzdXBwcmVzcyB0aGUgYWJpbGl0eSB0byBvdmVycmlkZVxuICAgICAqIHRoZXNlIHByb3BlcnRpZXMgb24gZGVyaXZlZCBvYmplY3RzIGJ5IHNpbXBsZSBhc3NpZ25tZW50LlxuICAgICAqXG4gICAgICogQmVjYXVzZSBvZiBsYWNrIG9mIHN1ZmZpY2llbnQgZm9yZXNpZ2h0IGF0IHRoZSB0aW1lLCBFUzUgdW5mb3J0dW5hdGVseVxuICAgICAqIHNwZWNpZmllZCB0aGF0IGEgc2ltcGxlIGFzc2lnbm1lbnQgdG8gYSBub24tZXhpc3RlbnQgcHJvcGVydHkgbXVzdCBmYWlsIGlmXG4gICAgICogaXQgd291bGQgb3ZlcnJpZGUgYSBub24td3JpdGFibGUgZGF0YSBwcm9wZXJ0eSBvZiB0aGUgc2FtZSBuYW1lLiAoSW5cbiAgICAgKiByZXRyb3NwZWN0LCB0aGlzIHdhcyBhIG1pc3Rha2UsIGJ1dCBpdCBpcyBub3cgdG9vIGxhdGUgYW5kIHdlIG11c3QgbGl2ZVxuICAgICAqIHdpdGggdGhlIGNvbnNlcXVlbmNlcy4pIEFzIGEgcmVzdWx0LCBzaW1wbHkgZnJlZXppbmcgYW4gb2JqZWN0IHRvIG1ha2UgaXRcbiAgICAgKiB0YW1wZXIgcHJvb2YgaGFzIHRoZSB1bmZvcnR1bmF0ZSBzaWRlIGVmZmVjdCBvZiBicmVha2luZyBwcmV2aW91c2x5IGNvcnJlY3RcbiAgICAgKiBjb2RlIHRoYXQgaXMgY29uc2lkZXJlZCB0byBoYXZlIGZvbGxvd2VkIEpTIGJlc3QgcHJhY3RpY2VzLCBpZiB0aGlzXG4gICAgICogcHJldmlvdXMgY29kZSB1c2VkIGFzc2lnbm1lbnQgdG8gb3ZlcnJpZGUuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZW5hYmxlRGVyaXZlZE92ZXJyaWRlKG9iaiwgcHJvcCwgZGVzYykge1xuICAgICAgaWYgKCd2YWx1ZScgaW4gZGVzYyAmJiBkZXNjLmNvbmZpZ3VyYWJsZSkge1xuICAgICAgICBjb25zdCB7IHZhbHVlIH0gPSBkZXNjO1xuXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1pbm5lci1kZWNsYXJhdGlvbnNcbiAgICAgICAgZnVuY3Rpb24gZ2V0dGVyKCkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlLWF0dGFjaCB0aGUgZGF0YSBwcm9wZXJ0eSBvbiB0aGUgb2JqZWN0IHNvXG4gICAgICAgIC8vIGl0IGNhbiBiZSBmb3VuZCBieSB0aGUgZGVlcC1mcmVlemUgdHJhdmVyc2FsIHByb2Nlc3MuXG4gICAgICAgIGdldHRlci52YWx1ZSA9IHZhbHVlO1xuXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1pbm5lci1kZWNsYXJhdGlvbnNcbiAgICAgICAgZnVuY3Rpb24gc2V0dGVyKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgaWYgKG9iaiA9PT0gdGhpcykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAgICAgYENhbm5vdCBhc3NpZ24gdG8gcmVhZCBvbmx5IHByb3BlcnR5ICcke3Byb3B9JyBvZiBvYmplY3QgJyR7b2JqfSdgLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGhhc093blByb3BlcnR5LmNhbGwodGhpcywgcHJvcCkpIHtcbiAgICAgICAgICAgIHRoaXNbcHJvcF0gPSBuZXdWYWx1ZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG4gICAgICAgICAgICAgIFtwcm9wXToge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBuZXdWYWx1ZSxcbiAgICAgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBkZXNjLmVudW1lcmFibGUsXG4gICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiBkZXNjLmNvbmZpZ3VyYWJsZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGRlZmluZVByb3BlcnRpZXMob2JqLCB7XG4gICAgICAgICAgW3Byb3BdOiB7XG4gICAgICAgICAgICBnZXQ6IGdldHRlcixcbiAgICAgICAgICAgIHNldDogc2V0dGVyLFxuICAgICAgICAgICAgZW51bWVyYWJsZTogZGVzYy5lbnVtZXJhYmxlLFxuICAgICAgICAgICAgY29uZmlndXJhYmxlOiBkZXNjLmNvbmZpZ3VyYWJsZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXBhaXJPbmVQcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICAgIGlmICghb2JqKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRlc2MgPSBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqLCBwcm9wKTtcbiAgICAgIGlmICghZGVzYykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBlbmFibGVEZXJpdmVkT3ZlcnJpZGUob2JqLCBwcm9wLCBkZXNjKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXBhaXJBbGxQcm9wZXJ0aWVzKG9iaikge1xuICAgICAgaWYgKCFvYmopIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgZGVzY3MgPSBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKG9iaik7XG4gICAgICBpZiAoIWRlc2NzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIG93bktleXMoZGVzY3MpLmZvckVhY2gocHJvcCA9PlxuICAgICAgICBlbmFibGVEZXJpdmVkT3ZlcnJpZGUob2JqLCBwcm9wLCBkZXNjc1twcm9wXSksXG4gICAgICApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHdhbGtSZXBhaXJQbGFuKG9iaiwgcGxhbikge1xuICAgICAgaWYgKCFvYmopIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCFwbGFuKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIG93bktleXMocGxhbikuZm9yRWFjaChwcm9wID0+IHtcbiAgICAgICAgY29uc3Qgc3ViUGxhbiA9IHBsYW5bcHJvcF07XG4gICAgICAgIGNvbnN0IHN1Yk9iaiA9IG9ialtwcm9wXTtcbiAgICAgICAgc3dpdGNoIChzdWJQbGFuKSB7XG4gICAgICAgICAgY2FzZSB0cnVlOlxuICAgICAgICAgICAgcmVwYWlyT25lUHJvcGVydHkob2JqLCBwcm9wKTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgY2FzZSAnKic6XG4gICAgICAgICAgICByZXBhaXJBbGxQcm9wZXJ0aWVzKHN1Yk9iaik7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBpZiAoT2JqZWN0KHN1YlBsYW4pICE9PSBzdWJQbGFuKSB7XG4gICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihgUmVwYWlyIHBsYW4gc3ViUGxhbiAke3N1YlBsYW59IGlzIGludmFsaWRgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdhbGtSZXBhaXJQbGFuKHN1Yk9iaiwgc3ViUGxhbik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIERvIHRoZSByZXBhaXIuXG4gICAgd2Fsa1JlcGFpclBsYW4oaW50cmluc2ljcywgcmVwYWlyUGxhbik7XG4gIH1cblxuICAvLyBDb3B5cmlnaHQgKEMpIDIwMTggQWdvcmljXG5cbiAgY29uc3QgRk9SV0FSREVEX1JFQUxNU19PUFRJT05TID0gWyd0cmFuc2Zvcm1zJywgJ2NvbmZpZ3VyYWJsZUdsb2JhbHMnXTtcblxuICBmdW5jdGlvbiBjcmVhdGVTRVNXaXRoUmVhbG1Db25zdHJ1Y3RvcihjcmVhdG9yU3RyaW5ncywgUmVhbG0pIHtcbiAgICBmdW5jdGlvbiBtYWtlU0VTUm9vdFJlYWxtKG9wdGlvbnMpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1wYXJhbS1yZWFzc2lnblxuICAgICAgb3B0aW9ucyA9IE9iamVjdChvcHRpb25zKTsgLy8gVG9kbzogc2FuaXRpemVcbiAgICAgIGNvbnN0IHNoaW1zID0gW107XG5cbiAgICAgIGNvbnN0IHtcbiAgICAgICAgZGF0YVByb3BlcnRpZXNUb1JlcGFpcjogb3B0RGF0YVByb3BlcnRpZXNUb1JlcGFpcixcbiAgICAgICAgc2hpbXM6IG9wdGlvbmFsU2hpbXMsXG4gICAgICAgIHNsb3BweUdsb2JhbHMsXG4gICAgICAgIHdoaXRlbGlzdDogb3B0V2hpdGVsaXN0LFxuICAgICAgICAuLi5vcHRpb25zUmVzdFxuICAgICAgfSA9IG9wdGlvbnM7XG5cbiAgICAgIGNvbnN0IHdsID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShvcHRXaGl0ZWxpc3QgfHwgd2hpdGVsaXN0KSk7XG4gICAgICBjb25zdCByZXBhaXJQbGFuID1cbiAgICAgICAgb3B0RGF0YVByb3BlcnRpZXNUb1JlcGFpciAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG9wdERhdGFQcm9wZXJ0aWVzVG9SZXBhaXIpKVxuICAgICAgICAgIDogZGF0YVByb3BlcnRpZXNUb1JlcGFpcjtcblxuICAgICAgLy8gRm9yd2FyZCB0aGUgZGVzaWduYXRlZCBSZWFsbXMgb3B0aW9ucy5cbiAgICAgIGNvbnN0IHJlYWxtc09wdGlvbnMgPSB7fTtcbiAgICAgIEZPUldBUkRFRF9SRUFMTVNfT1BUSU9OUy5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgIGlmIChrZXkgaW4gb3B0aW9uc1Jlc3QpIHtcbiAgICAgICAgICByZWFsbXNPcHRpb25zW2tleV0gPSBvcHRpb25zUmVzdFtrZXldO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgaWYgKHNsb3BweUdsb2JhbHMpIHtcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKGBcXFxuc2xvcHB5R2xvYmFscyBjYW5ub3QgYmUgc3BlY2lmaWVkIGZvciBtYWtlU0VTUm9vdFJlYWxtIVxuWW91IHByb2JhYmx5IHdhbnQgYSBDb21wYXJ0bWVudCBpbnN0ZWFkLCBsaWtlOlxuICBjb25zdCBjID0gcy5nbG9iYWwuUmVhbG0ubWFrZUNvbXBhcnRtZW50KHsgc2xvcHB5R2xvYmFsczogdHJ1ZSB9KWApO1xuICAgICAgfVxuXG4gICAgICAvLyBcImFsbG93XCIgZW5hYmxlcyByZWFsIERhdGUubm93KCksIGFueXRoaW5nIGVsc2UgZ2V0cyBOYU5cbiAgICAgIC8vIChpdCdkIGJlIG5pY2UgdG8gYWxsb3cgYSBmaXhlZCBudW1lcmljIHZhbHVlLCBidXQgdG9vIGhhcmQgdG9cbiAgICAgIC8vIGltcGxlbWVudCByaWdodCBub3cpXG4gICAgICBpZiAob3B0aW9ucy5kYXRlTm93TW9kZSAhPT0gJ2FsbG93Jykge1xuICAgICAgICBzaGltcy5wdXNoKGAoJHt0YW1lRGF0ZX0pKCk7YCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChvcHRpb25zLm1hdGhSYW5kb21Nb2RlICE9PSAnYWxsb3cnKSB7XG4gICAgICAgIHNoaW1zLnB1c2goYCgke3RhbWVNYXRofSkoKTtgKTtcbiAgICAgIH1cblxuICAgICAgLy8gSW50bCBpcyBkaXNhYmxlZCBlbnRpcmVseSBmb3Igbm93LCBkZWxldGVkIGJ5IHJlbW92ZVByb3BlcnRpZXMuIElmIHdlXG4gICAgICAvLyB3YW50IHRvIGJyaW5nIGl0IGJhY2sgKHVuZGVyIHRoZSBjb250cm9sIG9mIHRoaXMgb3B0aW9uKSwgd2UnbGwgbmVlZFxuICAgICAgLy8gdG8gYWRkIGl0IHRvIHRoZSB3aGl0ZWxpc3QgdG9vLCBhcyB3ZWxsIGFzIHRhbWluZyBpdCBwcm9wZXJseS5cbiAgICAgIGlmIChvcHRpb25zLmludGxNb2RlICE9PSAnYWxsb3cnKSB7XG4gICAgICAgIC8vIHRoaXMgc2hpbSBhbHNvIGRpc2FibGVzIE9iamVjdC5wcm90b3R5cGUudG9Mb2NhbGVTdHJpbmdcbiAgICAgICAgc2hpbXMucHVzaChgKCR7dGFtZUludGx9KSgpO2ApO1xuICAgICAgfVxuXG4gICAgICBpZiAob3B0aW9ucy5lcnJvclN0YWNrTW9kZSAhPT0gJ2FsbG93Jykge1xuICAgICAgICBzaGltcy5wdXNoKGAoJHt0YW1lRXJyb3J9KSgpO2ApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gaWYgcmVtb3ZlUHJvcGVydGllcyBjbGVhbnMgdGhlc2UgdGhpbmdzIGZyb20gRXJyb3IsIHY4IHdvbid0IHByb3ZpZGVcbiAgICAgICAgLy8gc3RhY2sgdHJhY2VzIG9yIGV2ZW4gdG9TdHJpbmcgb24gZXhjZXB0aW9ucywgYW5kIHRoZW4gTm9kZS5qcyBwcmludHNcbiAgICAgICAgLy8gdW5jYXVnaHQgZXhjZXB0aW9ucyBhcyBcInVuZGVmaW5lZFwiIGluc3RlYWQgb2YgYSB0eXBlL21lc3NhZ2Uvc3RhY2suXG4gICAgICAgIC8vIFNvIGlmIHdlJ3JlIGFsbG93aW5nIHN0YWNrIHRyYWNlcywgbWFrZSBzdXJlIHRoZSB3aGl0ZWxpc3QgaXNcbiAgICAgICAgLy8gYXVnbWVudGVkIHRvIGluY2x1ZGUgdGhlbS5cbiAgICAgICAgd2wubmFtZWRJbnRyaW5zaWNzLkVycm9yLmNhcHR1cmVTdGFja1RyYWNlID0gdHJ1ZTtcbiAgICAgICAgd2wubmFtZWRJbnRyaW5zaWNzLkVycm9yLnN0YWNrVHJhY2VMaW1pdCA9IHRydWU7XG4gICAgICAgIHdsLm5hbWVkSW50cmluc2ljcy5FcnJvci5wcmVwYXJlU3RhY2tUcmFjZSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChvcHRpb25zLnJlZ2V4cE1vZGUgIT09ICdhbGxvdycpIHtcbiAgICAgICAgc2hpbXMucHVzaChgKCR7dGFtZVJlZ0V4cH0pKCk7YCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFRoZSBnZXRBbm9uSW50cmluc2ljcyBmdW5jdGlvbiBtaWdodCBiZSByZW5hbWVkIGJ5IGUuZy4gcm9sbHVwLiBUaGVcbiAgICAgIC8vIHJlbW92ZVByb3BlcnRpZXMoKSBmdW5jdGlvbiByZWZlcmVuY2VzIGl0IGJ5IG5hbWUsIHNvIHdlIG5lZWQgdG8gZm9yY2VcbiAgICAgIC8vIGl0IHRvIGhhdmUgYSBzcGVjaWZpYyBuYW1lLlxuICAgICAgY29uc3QgcmVtb3ZlUHJvcCA9IGBjb25zdCBnZXRBbm9uSW50cmluc2ljcyA9ICgke2dldEFub25JbnRyaW5zaWNzJDF9KTtcbiAgICAgICAgICAgICAgICgke3JlbW92ZVByb3BlcnRpZXN9KSh0aGlzLCAke0pTT04uc3RyaW5naWZ5KHdsKX0pYDtcbiAgICAgIHNoaW1zLnB1c2gocmVtb3ZlUHJvcCk7XG5cbiAgICAgIC8vIEFkZCBvcHRpb25zLnNoaW1zLlxuICAgICAgaWYgKG9wdGlvbmFsU2hpbXMpIHtcbiAgICAgICAgc2hpbXMucHVzaCguLi5vcHRpb25hbFNoaW1zKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgciA9IFJlYWxtLm1ha2VSb290UmVhbG0oeyAuLi5yZWFsbXNPcHRpb25zLCBzaGltcyB9KTtcblxuICAgICAgLy8gQnVpbGQgYSBoYXJkZW4oKSB3aXRoIGFuIGVtcHR5IGZyaW5nZS4gSXQgd2lsbCBiZSBwb3B1bGF0ZWQgbGF0ZXIgd2hlblxuICAgICAgLy8gd2UgY2FsbCBoYXJkZW4oYWxsSW50cmluc2ljcykuXG4gICAgICBjb25zdCBtYWtlSGFyZGVuZXJTcmMgPSBgKCR7bWFrZUhhcmRlbmVyfSlgO1xuICAgICAgY29uc3QgaGFyZGVuID0gci5ldmFsdWF0ZShtYWtlSGFyZGVuZXJTcmMpKCk7XG5cbiAgICAgIGNvbnN0IGIgPSByLmV2YWx1YXRlKGNyZWF0b3JTdHJpbmdzKTtcbiAgICAgIGIuY3JlYXRlU0VTSW5UaGlzUmVhbG0oci5nbG9iYWwsIGNyZWF0b3JTdHJpbmdzLCByKTtcblxuICAgICAgLy8gQWxsb3cgaGFyZGVuIHRvIGJlIGFjY2Vzc2libGUgdmlhIHRoZSBTRVMgZ2xvYmFsLlxuICAgICAgci5nbG9iYWwuU0VTLmhhcmRlbiA9IGhhcmRlbjtcblxuICAgICAgaWYgKG9wdGlvbnMuY29uc29sZU1vZGUgPT09ICdhbGxvdycpIHtcbiAgICAgICAgY29uc3QgcyA9IGAoJHttYWtlQ29uc29sZX0pYDtcbiAgICAgICAgci5nbG9iYWwuY29uc29sZSA9IHIuZXZhbHVhdGUocykoY29uc29sZSk7XG4gICAgICB9XG5cbiAgICAgIC8vIEV4dHJhY3QgdGhlIGludHJpbnNpY3MgZnJvbSB0aGUgZ2xvYmFsLlxuICAgICAgY29uc3QgYW5vbkludHJpbnNpY3MgPSByLmV2YWx1YXRlKGAoJHtnZXRBbm9uSW50cmluc2ljcyQxfSlgKShyLmdsb2JhbCk7XG4gICAgICBjb25zdCBuYW1lZEludHJpbnNpY3MgPSByLmV2YWx1YXRlKGAoJHtnZXROYW1lZEludHJpbnNpY3N9KWApKFxuICAgICAgICByLmdsb2JhbCxcbiAgICAgICAgd2hpdGVsaXN0LFxuICAgICAgKTtcblxuICAgICAgLy8gR2F0aGVyIHRoZSBpbnRyaW5zaWNzIG9ubHkuXG4gICAgICBjb25zdCBhbGxJbnRyaW5zaWNzID0gci5ldmFsdWF0ZShgKCR7Z2V0QWxsUHJpbW9yZGlhbHMkMX0pYCkoXG4gICAgICAgIG5hbWVkSW50cmluc2ljcyxcbiAgICAgICAgYW5vbkludHJpbnNpY3MsXG4gICAgICApO1xuXG4gICAgICAvLyBHYXRoZXIgdGhlIHByaW1vcmRpYWxzIGFuZCB0aGUgZ2xvYmFscy5cbiAgICAgIGNvbnN0IGFsbFByaW1vcmRpYWxzID0gci5ldmFsdWF0ZShgKCR7Z2V0QWxsUHJpbW9yZGlhbHN9KWApKFxuICAgICAgICByLmdsb2JhbCxcbiAgICAgICAgYW5vbkludHJpbnNpY3MsXG4gICAgICApO1xuXG4gICAgICAvLyBSZXBhaXIgdGhlIG92ZXJyaWRlIG1pc3Rha2Ugb24gdGhlIGludHJpbnNpY3Mgb25seS5cbiAgICAgIHIuZXZhbHVhdGUoYCgke3JlcGFpckRhdGFQcm9wZXJ0aWVzfSlgKShhbGxJbnRyaW5zaWNzLCByZXBhaXJQbGFuKTtcblxuICAgICAgLy8gRmluYWxseSBmcmVlemUgYWxsIHRoZSBwcmltb3JkaWFscywgYW5kIHRoZSBnbG9iYWwgb2JqZWN0LiBUaGlzIG11c3RcbiAgICAgIC8vIGJlIHRoZSBsYXN0IHRoaW5nIHdlIGRvIHRoYXQgbW9kaWZpZXMgdGhlIFJlYWxtJ3MgZ2xvYmFscy5cbiAgICAgIGhhcmRlbihhbGxQcmltb3JkaWFscyk7XG5cbiAgICAgIC8vIGJ1aWxkIHRoZSBtYWtlUmVxdWlyZSBoZWxwZXIsIGdsdWUgaXQgdG8gdGhlIG5ldyBSZWFsbVxuICAgICAgci5tYWtlUmVxdWlyZSA9IGhhcmRlbihyLmV2YWx1YXRlKGAoJHttYWtlTWFrZVJlcXVpcmV9KWApKHIsIGhhcmRlbikpO1xuICAgICAgcmV0dXJuIHI7XG4gICAgfVxuICAgIGNvbnN0IFNFUyA9IHtcbiAgICAgIG1ha2VTRVNSb290UmVhbG0sXG4gICAgfTtcblxuICAgIHJldHVybiBTRVM7XG4gIH1cblxuICBjb25zdCBjcmVhdG9yU3RyaW5ncyA9IFwiKGZ1bmN0aW9uIChleHBvcnRzKSB7XFxuICAndXNlIHN0cmljdCc7XFxuXFxuICAvLyBBZGFwdGVkIGZyb20gU0VTL0NhamEgLSBDb3B5cmlnaHQgKEMpIDIwMTEgR29vZ2xlIEluYy5cXG4gIC8vIENvcHlyaWdodCAoQykgMjAxOCBBZ29yaWNcXG5cXG4gIC8vIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcXFwiTGljZW5zZVxcXCIpO1xcbiAgLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxcbiAgLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XFxuICAvL1xcbiAgLy8gaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXFxuICAvL1xcbiAgLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxcbiAgLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXFxcIkFTIElTXFxcIiBCQVNJUyxcXG4gIC8vIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxcbiAgLy8gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxcbiAgLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXFxuXFxuICAvLyBiYXNlZCB1cG9uOlxcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2dvb2dsZS9jYWphL2Jsb2IvbWFzdGVyL3NyYy9jb20vZ29vZ2xlL2NhamEvc2VzL3N0YXJ0U0VTLmpzXFxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vZ29vZ2xlL2NhamEvYmxvYi9tYXN0ZXIvc3JjL2NvbS9nb29nbGUvY2FqYS9zZXMvcmVwYWlyRVM1LmpzXFxuICAvLyB0aGVuIGNvcGllZCBmcm9tIHByb3Bvc2FsLWZyb3plbi1yZWFsbXMgZGVlcC1mcmVlemUuanNcXG4gIC8vIHRoZW4gY29waWVkIGZyb20gU0VTL3NyYy9idW5kbGUvZGVlcEZyZWV6ZS5qc1xcblxcbiAgLyoqXFxuICAgKiBAdHlwZWRlZiBIYXJkZW5lck9wdGlvbnNcXG4gICAqIEB0eXBlIHtvYmplY3R9XFxuICAgKiBAcHJvcGVydHkge1dlYWtTZXQ9fSBmcmluZ2VTZXQgV2Vha1NldCB0byB1c2UgZm9yIHRoZSBmcmluZ2VTZXRcXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb249fSBuYWl2ZVByZXBhcmVPYmplY3QgQ2FsbCB3aXRoIG9iamVjdCBiZWZvcmUgaGFyZGVuaW5nXFxuICAgKi9cXG5cXG4gIC8qKlxcbiAgICogQ3JlYXRlIGEgYGhhcmRlbmAgZnVuY3Rpb24uXFxuICAgKlxcbiAgICogQHBhcmFtIHtJdGVyYWJsZX0gaW5pdGlhbEZyaW5nZSBPYmplY3RzIGNvbnNpZGVyZWQgYWxyZWFkeSBoYXJkZW5lZFxcbiAgICogQHBhcmFtIHtIYXJkZW5lck9wdGlvbnM9fSBvcHRpb25zIE9wdGlvbnMgZm9yIGNyZWF0aW9uXFxuICAgKi9cXG4gIGZ1bmN0aW9uIG1ha2VIYXJkZW5lcihpbml0aWFsRnJpbmdlLCBvcHRpb25zID0ge30pIHtcXG4gICAgY29uc3QgeyBmcmVlemUsIGdldE93blByb3BlcnR5RGVzY3JpcHRvcnMsIGdldFByb3RvdHlwZU9mIH0gPSBPYmplY3Q7XFxuICAgIGNvbnN0IHsgb3duS2V5cyB9ID0gUmVmbGVjdDtcXG5cXG4gICAgLy8gT2JqZWN0cyB0aGF0IHdlIHdvbid0IGZyZWV6ZSwgZWl0aGVyIGJlY2F1c2Ugd2UndmUgZnJvemVuIHRoZW0gYWxyZWFkeSxcXG4gICAgLy8gb3IgdGhleSB3ZXJlIG9uZSBvZiB0aGUgaW5pdGlhbCByb290cyAodGVybWluYWxzKS4gVGhlc2Ugb2JqZWN0cyBmb3JtXFxuICAgIC8vIHRoZSBcXFwiZnJpbmdlXFxcIiBvZiB0aGUgaGFyZGVuZWQgb2JqZWN0IGdyYXBoLlxcbiAgICBsZXQgeyBmcmluZ2VTZXQgfSA9IG9wdGlvbnM7XFxuICAgIGlmIChmcmluZ2VTZXQpIHtcXG4gICAgICBpZiAoXFxuICAgICAgICB0eXBlb2YgZnJpbmdlU2V0LmFkZCAhPT0gJ2Z1bmN0aW9uJyB8fFxcbiAgICAgICAgdHlwZW9mIGZyaW5nZVNldC5oYXMgIT09ICdmdW5jdGlvbidcXG4gICAgICApIHtcXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXFxuICAgICAgICAgIGBvcHRpb25zLmZyaW5nZVNldCBtdXN0IGhhdmUgYWRkKCkgYW5kIGhhcygpIG1ldGhvZHNgLFxcbiAgICAgICAgKTtcXG4gICAgICB9XFxuXFxuICAgICAgLy8gUG9wdWxhdGUgdGhlIHN1cHBsaWVkIGZyaW5nZVNldCB3aXRoIG91ciBpbml0aWFsRnJpbmdlLlxcbiAgICAgIGlmIChpbml0aWFsRnJpbmdlKSB7XFxuICAgICAgICBmb3IgKGNvbnN0IGZyaW5nZSBvZiBpbml0aWFsRnJpbmdlKSB7XFxuICAgICAgICAgIGZyaW5nZVNldC5hZGQoZnJpbmdlKTtcXG4gICAgICAgIH1cXG4gICAgICB9XFxuICAgIH0gZWxzZSB7XFxuICAgICAgLy8gVXNlIGEgbmV3IGVtcHR5IGZyaW5nZS5cXG4gICAgICBmcmluZ2VTZXQgPSBuZXcgV2Vha1NldChpbml0aWFsRnJpbmdlKTtcXG4gICAgfVxcblxcbiAgICBjb25zdCBuYWl2ZVByZXBhcmVPYmplY3QgPSBvcHRpb25zICYmIG9wdGlvbnMubmFpdmVQcmVwYXJlT2JqZWN0O1xcblxcbiAgICBmdW5jdGlvbiBoYXJkZW4ocm9vdCkge1xcbiAgICAgIGNvbnN0IHRvRnJlZXplID0gbmV3IFNldCgpO1xcbiAgICAgIGNvbnN0IHByb3RvdHlwZXMgPSBuZXcgTWFwKCk7XFxuICAgICAgY29uc3QgcGF0aHMgPSBuZXcgV2Vha01hcCgpO1xcblxcbiAgICAgIC8vIElmIHZhbCBpcyBzb21ldGhpbmcgd2Ugc2hvdWxkIGJlIGZyZWV6aW5nIGJ1dCBhcmVuJ3QgeWV0LFxcbiAgICAgIC8vIGFkZCBpdCB0byB0b0ZyZWV6ZS5cXG4gICAgICBmdW5jdGlvbiBlbnF1ZXVlKHZhbCwgcGF0aCkge1xcbiAgICAgICAgaWYgKE9iamVjdCh2YWwpICE9PSB2YWwpIHtcXG4gICAgICAgICAgLy8gaWdub3JlIHByaW1pdGl2ZXNcXG4gICAgICAgICAgcmV0dXJuO1xcbiAgICAgICAgfVxcbiAgICAgICAgY29uc3QgdHlwZSA9IHR5cGVvZiB2YWw7XFxuICAgICAgICBpZiAodHlwZSAhPT0gJ29iamVjdCcgJiYgdHlwZSAhPT0gJ2Z1bmN0aW9uJykge1xcbiAgICAgICAgICAvLyBmdXR1cmUgcHJvb2Y6IGJyZWFrIHVudGlsIHNvbWVvbmUgZmlndXJlcyBvdXQgd2hhdCBpdCBzaG91bGQgZG9cXG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVW5leHBlY3RlZCB0eXBlb2Y6ICR7dHlwZX1gKTtcXG4gICAgICAgIH1cXG4gICAgICAgIGlmIChmcmluZ2VTZXQuaGFzKHZhbCkgfHwgdG9GcmVlemUuaGFzKHZhbCkpIHtcXG4gICAgICAgICAgLy8gSWdub3JlIGlmIHRoaXMgaXMgYW4gZXhpdCwgb3Igd2UndmUgYWxyZWFkeSB2aXNpdGVkIGl0XFxuICAgICAgICAgIHJldHVybjtcXG4gICAgICAgIH1cXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGBhZGRpbmcgJHt2YWx9IHRvIHRvRnJlZXplYCwgdmFsKTtcXG4gICAgICAgIHRvRnJlZXplLmFkZCh2YWwpO1xcbiAgICAgICAgcGF0aHMuc2V0KHZhbCwgcGF0aCk7XFxuICAgICAgfVxcblxcbiAgICAgIGZ1bmN0aW9uIGZyZWV6ZUFuZFRyYXZlcnNlKG9iaikge1xcbiAgICAgICAgLy8gQXBwbHkgdGhlIG5haXZlIHByZXBhcmVyIGlmIHRoZXkgc3BlY2lmaWVkIG9uZS5cXG4gICAgICAgIGlmIChuYWl2ZVByZXBhcmVPYmplY3QpIHtcXG4gICAgICAgICAgbmFpdmVQcmVwYXJlT2JqZWN0KG9iaik7XFxuICAgICAgICB9XFxuXFxuICAgICAgICAvLyBOb3cgZnJlZXplIHRoZSBvYmplY3QgdG8gZW5zdXJlIHJlYWN0aXZlXFxuICAgICAgICAvLyBvYmplY3RzIHN1Y2ggYXMgcHJveGllcyB3b24ndCBhZGQgcHJvcGVydGllc1xcbiAgICAgICAgLy8gZHVyaW5nIHRyYXZlcnNhbCwgYmVmb3JlIHRoZXkgZ2V0IGZyb3plbi5cXG5cXG4gICAgICAgIC8vIE9iamVjdCBhcmUgdmVyaWZpZWQgYmVmb3JlIGJlaW5nIGVucXVldWVkLFxcbiAgICAgICAgLy8gdGhlcmVmb3JlIHRoaXMgaXMgYSB2YWxpZCBjYW5kaWRhdGUuXFxuICAgICAgICAvLyBUaHJvd3MgaWYgdGhpcyBmYWlscyAoc3RyaWN0IG1vZGUpLlxcbiAgICAgICAgZnJlZXplKG9iaik7XFxuXFxuICAgICAgICAvLyB3ZSByZWx5IHVwb24gY2VydGFpbiBjb21taXRtZW50cyBvZiBPYmplY3QuZnJlZXplIGFuZCBwcm94aWVzIGhlcmVcXG5cXG4gICAgICAgIC8vIGdldCBzdGFibGUvaW1tdXRhYmxlIG91dGJvdW5kIGxpbmtzIGJlZm9yZSBhIFByb3h5IGhhcyBhIGNoYW5jZSB0byBkb1xcbiAgICAgICAgLy8gc29tZXRoaW5nIHNuZWFreS5cXG4gICAgICAgIGNvbnN0IHByb3RvID0gZ2V0UHJvdG90eXBlT2Yob2JqKTtcXG4gICAgICAgIGNvbnN0IGRlc2NzID0gZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhvYmopO1xcbiAgICAgICAgY29uc3QgcGF0aCA9IHBhdGhzLmdldChvYmopIHx8ICd1bmtub3duJztcXG5cXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGBhZGRpbmcgJHtwcm90b30gdG8gcHJvdG90eXBlcyB1bmRlciAke3BhdGh9YCk7XFxuICAgICAgICBpZiAocHJvdG8gIT09IG51bGwgJiYgIXByb3RvdHlwZXMuaGFzKHByb3RvKSkge1xcbiAgICAgICAgICBwcm90b3R5cGVzLnNldChwcm90bywgcGF0aCk7XFxuICAgICAgICAgIHBhdGhzLnNldChwcm90bywgYCR7cGF0aH0uX19wcm90b19fYCk7XFxuICAgICAgICB9XFxuXFxuICAgICAgICBvd25LZXlzKGRlc2NzKS5mb3JFYWNoKG5hbWUgPT4ge1xcbiAgICAgICAgICBjb25zdCBwYXRobmFtZSA9IGAke3BhdGh9LiR7U3RyaW5nKG5hbWUpfWA7XFxuICAgICAgICAgIC8vIHRvZG8gdW5jdXJyaWVkIGZvcm1cXG4gICAgICAgICAgLy8gdG9kbzogZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyBpcyBndWFyYW50ZWVkIHRvIHJldHVybiB3ZWxsLWZvcm1lZFxcbiAgICAgICAgICAvLyBkZXNjcmlwdG9ycywgYnV0IHRoZXkgc3RpbGwgaW5oZXJpdCBmcm9tIE9iamVjdC5wcm90b3R5cGUuIElmXFxuICAgICAgICAgIC8vIHNvbWVvbmUgaGFzIHBvaXNvbmVkIE9iamVjdC5wcm90b3R5cGUgdG8gYWRkICd2YWx1ZScgb3IgJ2dldCdcXG4gICAgICAgICAgLy8gcHJvcGVydGllcywgdGhlbiBhIHNpbXBsZSAnaWYgKFxcXCJ2YWx1ZVxcXCIgaW4gZGVzYyknIG9yICdkZXNjLnZhbHVlJ1xcbiAgICAgICAgICAvLyB0ZXN0IGNvdWxkIGJlIGNvbmZ1c2VkLiBXZSB1c2UgaGFzT3duUHJvcGVydHkgdG8gYmUgc3VyZSBhYm91dFxcbiAgICAgICAgICAvLyB3aGV0aGVyICd2YWx1ZScgaXMgcHJlc2VudCBvciBub3QsIHdoaWNoIHRlbGxzIHVzIGZvciBzdXJlIHRoYXQgdGhpc1xcbiAgICAgICAgICAvLyBpcyBhIGRhdGEgcHJvcGVydHkuXFxuICAgICAgICAgIGNvbnN0IGRlc2MgPSBkZXNjc1tuYW1lXTtcXG4gICAgICAgICAgaWYgKCd2YWx1ZScgaW4gZGVzYykge1xcbiAgICAgICAgICAgIC8vIHRvZG8gdW5jdXJyaWVkIGZvcm1cXG4gICAgICAgICAgICBlbnF1ZXVlKGRlc2MudmFsdWUsIGAke3BhdGhuYW1lfWApO1xcbiAgICAgICAgICB9IGVsc2Uge1xcbiAgICAgICAgICAgIGVucXVldWUoZGVzYy5nZXQsIGAke3BhdGhuYW1lfShnZXQpYCk7XFxuICAgICAgICAgICAgZW5xdWV1ZShkZXNjLnNldCwgYCR7cGF0aG5hbWV9KHNldClgKTtcXG4gICAgICAgICAgfVxcbiAgICAgICAgfSk7XFxuICAgICAgfVxcblxcbiAgICAgIGZ1bmN0aW9uIGRlcXVldWUoKSB7XFxuICAgICAgICAvLyBOZXcgdmFsdWVzIGFkZGVkIGJlZm9yZSBmb3JFYWNoKCkgaGFzIGZpbmlzaGVkIHdpbGwgYmUgdmlzaXRlZC5cXG4gICAgICAgIHRvRnJlZXplLmZvckVhY2goZnJlZXplQW5kVHJhdmVyc2UpOyAvLyB0b2RvIGN1cnJpZWQgZm9yRWFjaFxcbiAgICAgIH1cXG5cXG4gICAgICBmdW5jdGlvbiBjaGVja1Byb3RvdHlwZXMoKSB7XFxuICAgICAgICBwcm90b3R5cGVzLmZvckVhY2goKHBhdGgsIHApID0+IHtcXG4gICAgICAgICAgaWYgKCEodG9GcmVlemUuaGFzKHApIHx8IGZyaW5nZVNldC5oYXMocCkpKSB7XFxuICAgICAgICAgICAgLy8gYWxsIHJlYWNoYWJsZSBwcm9wZXJ0aWVzIGhhdmUgYWxyZWFkeSBiZWVuIGZyb3plbiBieSB0aGlzIHBvaW50XFxuICAgICAgICAgICAgbGV0IG1zZztcXG4gICAgICAgICAgICB0cnkge1xcbiAgICAgICAgICAgICAgbXNnID0gYHByb3RvdHlwZSAke3B9IG9mICR7cGF0aH0gaXMgbm90IGFscmVhZHkgaW4gdGhlIGZyaW5nZVNldGA7XFxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xcbiAgICAgICAgICAgICAgLy8gYCR7KGFzeW5jIF89Pl8pLl9fcHJvdG9fX31gIGZhaWxzIGluIG1vc3QgZW5naW5lc1xcbiAgICAgICAgICAgICAgbXNnID1cXG4gICAgICAgICAgICAgICAgJ2EgcHJvdG90eXBlIG9mIHNvbWV0aGluZyBpcyBub3QgYWxyZWFkeSBpbiB0aGUgZnJpbmdlc2V0IChhbmQgLnRvU3RyaW5nIGZhaWxlZCknO1xcbiAgICAgICAgICAgICAgdHJ5IHtcXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobXNnKTtcXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3RoZSBwcm90b3R5cGU6JywgcCk7XFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvZiBzb21ldGhpbmc6JywgcGF0aCk7XFxuICAgICAgICAgICAgICB9IGNhdGNoIChfZSkge1xcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyBtaWdodCBiZSBtaXNzaW5nIGluIHJlc3RyaWN0aXZlIFNFUyByZWFsbXNcXG4gICAgICAgICAgICAgIH1cXG4gICAgICAgICAgICB9XFxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtc2cpO1xcbiAgICAgICAgICB9XFxuICAgICAgICB9KTtcXG4gICAgICB9XFxuXFxuICAgICAgZnVuY3Rpb24gY29tbWl0KCkge1xcbiAgICAgICAgLy8gdG9kbyBjdXJyaWVkIGZvckVhY2hcXG4gICAgICAgIC8vIHdlIGNhcHR1cmUgdGhlIHJlYWwgV2Vha1NldC5wcm90b3R5cGUuYWRkIGFib3ZlLCBpbiBjYXNlIHNvbWVvbmVcXG4gICAgICAgIC8vIGNoYW5nZXMgaXQuIFRoZSB0d28tYXJndW1lbnQgZm9ybSBvZiBmb3JFYWNoIHBhc3NlcyB0aGUgc2Vjb25kXFxuICAgICAgICAvLyBhcmd1bWVudCBhcyB0aGUgJ3RoaXMnIGJpbmRpbmcsIHNvIHdlIGFkZCB0byB0aGUgY29ycmVjdCBzZXQuXFxuICAgICAgICB0b0ZyZWV6ZS5mb3JFYWNoKGZyaW5nZVNldC5hZGQsIGZyaW5nZVNldCk7XFxuICAgICAgfVxcblxcbiAgICAgIGVucXVldWUocm9vdCk7XFxuICAgICAgZGVxdWV1ZSgpO1xcbiAgICAgIC8vIGNvbnNvbGUubG9nKFxcXCJmcmluZ2VTZXRcXFwiLCBmcmluZ2VTZXQpO1xcbiAgICAgIC8vIGNvbnNvbGUubG9nKFxcXCJwcm90b3R5cGUgc2V0OlxcXCIsIHByb3RvdHlwZXMpO1xcbiAgICAgIC8vIGNvbnNvbGUubG9nKFxcXCJ0b0ZyZWV6ZSBzZXQ6XFxcIiwgdG9GcmVlemUpO1xcbiAgICAgIGNoZWNrUHJvdG90eXBlcygpO1xcbiAgICAgIGNvbW1pdCgpO1xcblxcbiAgICAgIHJldHVybiByb290O1xcbiAgICB9XFxuXFxuICAgIHJldHVybiBoYXJkZW47XFxuICB9XFxuXFxuICBmdW5jdGlvbiB0YW1lRGF0ZSgpIHtcXG4gICAgY29uc3QgdW5zYWZlRGF0ZSA9IERhdGU7XFxuICAgIC8vIERhdGUoYW55dGhpbmcpIGdpdmVzIGEgc3RyaW5nIHdpdGggdGhlIGN1cnJlbnQgdGltZVxcbiAgICAvLyBuZXcgRGF0ZSh4KSBjb2VyY2VzIHggaW50byBhIG51bWJlciBhbmQgdGhlbiByZXR1cm5zIGEgRGF0ZVxcbiAgICAvLyBuZXcgRGF0ZSgpIHJldHVybnMgdGhlIGN1cnJlbnQgdGltZSwgYXMgYSBEYXRlIG9iamVjdFxcbiAgICAvLyBuZXcgRGF0ZSh1bmRlZmluZWQpIHJldHVybnMgYSBEYXRlIG9iamVjdCB3aGljaCBzdHJpbmdpZmllcyB0byAnSW52YWxpZCBEYXRlJ1xcblxcbiAgICBjb25zdCBuZXdEYXRlQ29uc3RydWN0b3IgPSBmdW5jdGlvbiBEYXRlKC4uLmFyZ3MpIHtcXG4gICAgICBpZiAobmV3LnRhcmdldCA9PT0gdW5kZWZpbmVkKSB7XFxuICAgICAgICAvLyB3ZSB3ZXJlIG5vdCBjYWxsZWQgYXMgYSBjb25zdHJ1Y3RvclxcbiAgICAgICAgLy8gdGhpcyB3b3VsZCBub3JtYWxseSByZXR1cm4gYSBzdHJpbmcgd2l0aCB0aGUgY3VycmVudCB0aW1lXFxuICAgICAgICByZXR1cm4gJ0ludmFsaWQgRGF0ZSc7XFxuICAgICAgfVxcbiAgICAgIC8vIGNvbnN0cnVjdG9yIGJlaGF2aW9yOiBpZiB3ZSBnZXQgYXJndW1lbnRzLCB3ZSBjYW4gc2FmZWx5IHBhc3MgdGhlbSB0aHJvdWdoXFxuICAgICAgaWYgKGFyZ3MubGVuZ3RoID4gMCkge1xcbiAgICAgICAgcmV0dXJuIFJlZmxlY3QuY29uc3RydWN0KHVuc2FmZURhdGUsIGFyZ3MsIG5ldy50YXJnZXQpO1xcbiAgICAgICAgLy8gdG9kbzogdGVzdCB0aGF0IG91ciBjb25zdHJ1Y3RvciBjYW4gc3RpbGwgYmUgc3ViY2xhc3NlZFxcbiAgICAgIH1cXG4gICAgICAvLyBubyBhcmd1bWVudHM6IHJldHVybiBhIERhdGUgb2JqZWN0LCBidXQgaW52YWxpZFxcbiAgICAgIHJldHVybiBSZWZsZWN0LmNvbnN0cnVjdCh1bnNhZmVEYXRlLCBbTmFOXSwgbmV3LnRhcmdldCk7XFxuICAgIH07XFxuXFxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFxcbiAgICAgIG5ld0RhdGVDb25zdHJ1Y3RvcixcXG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyh1bnNhZmVEYXRlKSxcXG4gICAgKTtcXG4gICAgLy8gdGhhdCB3aWxsIGNvcHkgdGhlIC5wcm90b3R5cGUgdG9vLCBzbyB0aGlzIG5leHQgbGluZSBpcyB1bm5lY2Vzc2FyeVxcbiAgICAvLyBuZXdEYXRlQ29uc3RydWN0b3IucHJvdG90eXBlID0gdW5zYWZlRGF0ZS5wcm90b3R5cGU7XFxuICAgIHVuc2FmZURhdGUucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gbmV3RGF0ZUNvbnN0cnVjdG9yO1xcbiAgICAvLyBkaXNhYmxlIERhdGUubm93XFxuICAgIG5ld0RhdGVDb25zdHJ1Y3Rvci5ub3cgPSAoKSA9PiBOYU47XFxuXFxuICAgIERhdGUgPSBuZXdEYXRlQ29uc3RydWN0b3I7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZ2xvYmFsLWFzc2lnblxcbiAgfVxcblxcbiAgZnVuY3Rpb24gdGFtZU1hdGgoKSB7XFxuICAgIC8vIE1hdGgucmFuZG9tID0gKCkgPT4gNDsgLy8gaHR0cHM6Ly93d3cueGtjZC5jb20vMjIxXFxuICAgIE1hdGgucmFuZG9tID0gKCkgPT4ge1xcbiAgICAgIHRocm93IEVycm9yKCdkaXNhYmxlZCcpO1xcbiAgICB9O1xcbiAgfVxcblxcbiAgLyogZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXJlZGVjbGFyZSAqL1xcbiAgLyogZ2xvYmFsIEludGwgKi9cXG5cXG4gIGZ1bmN0aW9uIHRhbWVJbnRsKCkge1xcbiAgICAvLyB0b2RvOiBzb21laG93IGZpeCB0aGVzZS4gVGhlc2UgYWxtb3N0IGNlcnRhaW5seSBkb24ndCBlbmFibGUgdGhlIHJlYWRpbmdcXG4gICAgLy8gb2Ygc2lkZS1jaGFubmVscywgYnV0IHdlIHdhbnQgdGhpbmdzIHRvIGJlIGRldGVybWluaXN0aWMgYWNyb3NzXFxuICAgIC8vIHJ1bnRpbWVzLiBCZXN0IGJldCBpcyB0byBqdXN0IGRpc2FsbG93IGNhbGxpbmcgdGhlc2UgZnVuY3Rpb25zIHdpdGhvdXRcXG4gICAgLy8gYW4gZXhwbGljaXQgbG9jYWxlIG5hbWUuXFxuXFxuICAgIC8vIHRoZSB3aGl0ZWxpc3QgbWF5IGhhdmUgZGVsZXRlZCBJbnRsIGVudGlyZWx5LCBzbyB0b2xlcmF0ZSB0aGF0XFxuICAgIGlmICh0eXBlb2YgSW50bCAhPT0gJ3VuZGVmaW5lZCcpIHtcXG4gICAgICBJbnRsLkRhdGVUaW1lRm9ybWF0ID0gKCkgPT4ge1xcbiAgICAgICAgdGhyb3cgRXJyb3IoJ2Rpc2FibGVkJyk7XFxuICAgICAgfTtcXG4gICAgICBJbnRsLk51bWJlckZvcm1hdCA9ICgpID0+IHtcXG4gICAgICAgIHRocm93IEVycm9yKCdkaXNhYmxlZCcpO1xcbiAgICAgIH07XFxuICAgICAgSW50bC5nZXRDYW5vbmljYWxMb2NhbGVzID0gKCkgPT4ge1xcbiAgICAgICAgdGhyb3cgRXJyb3IoJ2Rpc2FibGVkJyk7XFxuICAgICAgfTtcXG4gICAgfVxcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tZXh0ZW5kLW5hdGl2ZVxcbiAgICBPYmplY3QucHJvdG90eXBlLnRvTG9jYWxlU3RyaW5nID0gKCkgPT4ge1xcbiAgICAgIHRocm93IG5ldyBFcnJvcigndG9Mb2NhbGVTdHJpbmcgc3VwcHJlc3NlZCcpO1xcbiAgICB9O1xcbiAgfVxcblxcbiAgZnVuY3Rpb24gdGFtZUVycm9yKCkge1xcbiAgICBpZiAoIU9iamVjdC5pc0V4dGVuc2libGUoRXJyb3IpKSB7XFxuICAgICAgdGhyb3cgRXJyb3IoJ2h1aCBFcnJvciBpcyBub3QgZXh0ZW5zaWJsZScpO1xcbiAgICB9XFxuICAgIC8qIHRoaXMgd29ya2VkIGJhY2sgd2hlbiB3ZSB3ZXJlIHJ1bm5pbmcgaXQgb24gYSBnbG9iYWwsIGJ1dCBzdG9wcGVkXFxuICAgIHdvcmtpbmcgd2hlbiB3ZSB0dXJuZWQgaXQgaW50byBhIHNoaW0gKi9cXG4gICAgLypcXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEVycm9yLnByb3RvdHlwZSwgXFxcInN0YWNrXFxcIixcXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHsgZ2V0KCkgeyByZXR1cm4gJ3N0YWNrIHN1cHByZXNzZWQnOyB9IH0pO1xcbiAgICAqL1xcbiAgICBkZWxldGUgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2U7XFxuICAgIGlmICgnY2FwdHVyZVN0YWNrVHJhY2UnIGluIEVycm9yKSB7XFxuICAgICAgdGhyb3cgRXJyb3IoJ2hleSB3ZSBjb3VsZCBub3QgcmVtb3ZlIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlJyk7XFxuICAgIH1cXG5cXG4gICAgLy8gd2UgbWlnaHQgZG8gdGhpcyBpbiB0aGUgZnV0dXJlXFxuICAgIC8qXFxuICAgIGNvbnN0IHVuc2FmZUVycm9yID0gRXJyb3I7XFxuICAgIGNvbnN0IG5ld0Vycm9yQ29uc3RydWN0b3IgPSBmdW5jdGlvbiBFcnJvciguLi5hcmdzKSB7XFxuICAgICAgcmV0dXJuIFJlZmxlY3QuY29uc3RydWN0KHVuc2FmZUVycm9yLCBhcmdzLCBuZXcudGFyZ2V0KTtcXG4gICAgfTtcXG5cXG4gICAgbmV3RXJyb3JDb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSB1bnNhZmVFcnJvci5wcm90b3R5cGU7XFxuICAgIG5ld0Vycm9yQ29uc3RydWN0b3IucHJvdG90eXBlLmNvbnN0cnVjdCA9IG5ld0Vycm9yQ29uc3RydWN0b3I7XFxuXFxuICAgIEVycm9yID0gbmV3RXJyb3JDb25zdHJ1Y3RvcjtcXG5cXG4gICAgRXZhbEVycm9yLl9fcHJvdG9fXyA9IG5ld0Vycm9yQ29uc3RydWN0b3I7XFxuICAgIFJhbmdlRXJyb3IuX19wcm90b19fID0gbmV3RXJyb3JDb25zdHJ1Y3RvcjtcXG4gICAgUmVmZXJlbmNlRXJyb3IuX19wcm90b19fID0gbmV3RXJyb3JDb25zdHJ1Y3RvcjtcXG4gICAgU3ludGF4RXJyb3IuX19wcm90b19fID0gbmV3RXJyb3JDb25zdHJ1Y3RvcjtcXG4gICAgVHlwZUVycm9yLl9fcHJvdG9fXyA9IG5ld0Vycm9yQ29uc3RydWN0b3I7XFxuICAgIFVSSUVycm9yLl9fcHJvdG9fXyA9IG5ld0Vycm9yQ29uc3RydWN0b3I7XFxuICAgICovXFxuICB9XFxuXFxuICBmdW5jdGlvbiB0YW1lUmVnRXhwKCkge1xcbiAgICBkZWxldGUgUmVnRXhwLnByb3RvdHlwZS5jb21waWxlO1xcbiAgICBpZiAoJ2NvbXBpbGUnIGluIFJlZ0V4cC5wcm90b3R5cGUpIHtcXG4gICAgICB0aHJvdyBFcnJvcignaGV5IHdlIGNvdWxkIG5vdCByZW1vdmUgUmVnRXhwLnByb3RvdHlwZS5jb21waWxlJyk7XFxuICAgIH1cXG5cXG4gICAgLy8gV2Ugd2FudCB0byBkZWxldGUgUmVnRXhwLiQxLCBhcyB3ZWxsIGFzIGFueSBvdGhlciBzdXJwcmlzaW5nIHByb3BlcnRpZXMuXFxuICAgIC8vIE9uIHNvbWUgZW5naW5lcyB3ZSBjYW4ndCBqdXN0IGRvICdkZWxldGUgUmVnRXhwLiQxJy5cXG4gICAgY29uc3QgdW5zYWZlUmVnRXhwID0gUmVnRXhwO1xcblxcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tZ2xvYmFsLWFzc2lnblxcbiAgICBSZWdFeHAgPSBmdW5jdGlvbiBSZWdFeHAoLi4uYXJncykge1xcbiAgICAgIHJldHVybiBSZWZsZWN0LmNvbnN0cnVjdCh1bnNhZmVSZWdFeHAsIGFyZ3MsIG5ldy50YXJnZXQpO1xcbiAgICB9O1xcbiAgICBSZWdFeHAucHJvdG90eXBlID0gdW5zYWZlUmVnRXhwLnByb3RvdHlwZTtcXG4gICAgdW5zYWZlUmVnRXhwLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFJlZ0V4cDtcXG5cXG4gICAgaWYgKCckMScgaW4gUmVnRXhwKSB7XFxuICAgICAgdGhyb3cgRXJyb3IoJ2hleSB3ZSBjb3VsZCBub3QgcmVtb3ZlIFJlZ0V4cC4kMScpO1xcbiAgICB9XFxuICB9XFxuXFxuICAvKiBnbG9iYWwgZ2V0QW5vbkludHJpbnNpY3MgKi9cXG5cXG4gIC8vIENvcHlyaWdodCAoQykgMjAxMSBHb29nbGUgSW5jLlxcbiAgLy8gQ29weXJpZ2h0IChDKSAyMDE4IEFnb3JpY1xcbiAgLy9cXG4gIC8vIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcXFwiTGljZW5zZVxcXCIpO1xcbiAgLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxcbiAgLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XFxuICAvL1xcbiAgLy8gaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXFxuICAvL1xcbiAgLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxcbiAgLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXFxcIkFTIElTXFxcIiBCQVNJUyxcXG4gIC8vIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxcbiAgLy8gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxcbiAgLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXFxuXFxuICAvKiBUaGlzIGlzIGV2YWx1YXRlZCBpbiBhbiBlbnZpcm9ubWVudCBpbiB3aGljaCBnZXRBbm9uSW50cmluc2ljcygpIGlzXFxuICAgICBhbHJlYWR5IGRlZmluZWQgKGJ5IHByZXBlbmRpbmcgdGhlIGRlZmluaXRpb24gb2YgZ2V0QW5vbkludHJpbnNpY3MgdG8gdGhlXFxuICAgICBzdHJpbmdpZmllZCByZW1vdmVQcm9wZXJ0aWVzKCkpLCBoZW5jZSB3ZSBkb24ndCB1c2UgdGhlIGZvbGxvd2luZ1xcbiAgICAgaW1wb3J0ICovXFxuICAvLyBpbXBvcnQgeyBnZXRBbm9uSW50cmluc2ljcyB9IGZyb20gJy4vYW5vbkludHJpbnNpY3MuanMnO1xcblxcbiAgZnVuY3Rpb24gcmVtb3ZlUHJvcGVydGllcyhnbG9iYWwsIHdoaXRlbGlzdCkge1xcbiAgICAvLyB3YWxrIGdsb2JhbCBvYmplY3QsIHRlc3QgYWdhaW5zdCB3aGl0ZWxpc3QsIGRlbGV0ZVxcblxcbiAgICBjb25zdCB1bmN1cnJ5VGhpcyA9IGZuID0+ICh0aGlzQXJnLCAuLi5hcmdzKSA9PlxcbiAgICAgIFJlZmxlY3QuYXBwbHkoZm4sIHRoaXNBcmcsIGFyZ3MpO1xcbiAgICBjb25zdCB7XFxuICAgICAgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yOiBnb3BkLFxcbiAgICAgIGdldE93blByb3BlcnR5TmFtZXM6IGdvcG4sXFxuICAgICAga2V5cyxcXG4gICAgfSA9IE9iamVjdDtcXG4gICAgY29uc3QgY2xlYW5pbmcgPSBuZXcgV2Vha01hcCgpO1xcbiAgICBjb25zdCBnZXRQcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZjtcXG4gICAgY29uc3QgaG9wID0gdW5jdXJyeVRoaXMoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSk7XFxuXFxuICAgIGNvbnN0IHdoaXRlVGFibGUgPSBuZXcgV2Vha01hcCgpO1xcblxcbiAgICBmdW5jdGlvbiBhZGRUb1doaXRlVGFibGUocm9vdFZhbHVlLCByb290UGVybWl0KSB7XFxuICAgICAgLyoqXFxuICAgICAgICogVGhlIHdoaXRlVGFibGUgc2hvdWxkIG1hcCBmcm9tIGVhY2ggcGF0aC1hY2Nlc3NpYmxlIHByaW1vcmRpYWxcXG4gICAgICAgKiBvYmplY3QgdG8gdGhlIHBlcm1pdCBvYmplY3QgdGhhdCBkZXNjcmliZXMgaG93IGl0IHNob3VsZCBiZVxcbiAgICAgICAqIGNsZWFuZWQuXFxuICAgICAgICpcXG4gICAgICAgKiBXZSBpbml0aWFsaXplIHRoZSB3aGl0ZVRhYmxlIG9ubHkgc28gdGhhdCB7QGNvZGUgZ2V0UGVybWl0fSBjYW5cXG4gICAgICAgKiBwcm9jZXNzIFxcXCIqXFxcIiBpbmhlcml0YW5jZSB1c2luZyB0aGUgd2hpdGVsaXN0LCBieSB3YWxraW5nIGFjdHVhbFxcbiAgICAgICAqIGluaGVyaXRhbmNlIGNoYWlucy5cXG4gICAgICAgKi9cXG4gICAgICBjb25zdCB3aGl0ZWxpc3RTeW1ib2xzID0gW3RydWUsIGZhbHNlLCAnKicsICdtYXliZUFjY2Vzc29yJ107XFxuICAgICAgZnVuY3Rpb24gcmVnaXN0ZXIodmFsdWUsIHBlcm1pdCkge1xcbiAgICAgICAgaWYgKHZhbHVlICE9PSBPYmplY3QodmFsdWUpKSB7XFxuICAgICAgICAgIHJldHVybjtcXG4gICAgICAgIH1cXG4gICAgICAgIGlmICh0eXBlb2YgcGVybWl0ICE9PSAnb2JqZWN0Jykge1xcbiAgICAgICAgICBpZiAod2hpdGVsaXN0U3ltYm9scy5pbmRleE9mKHBlcm1pdCkgPCAwKSB7XFxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxcbiAgICAgICAgICAgICAgYHN5bnRheCBlcnJvciBpbiB3aGl0ZWxpc3Q7IHVuZXhwZWN0ZWQgdmFsdWU6ICR7cGVybWl0fWAsXFxuICAgICAgICAgICAgKTtcXG4gICAgICAgICAgfVxcbiAgICAgICAgICByZXR1cm47XFxuICAgICAgICB9XFxuICAgICAgICBpZiAod2hpdGVUYWJsZS5oYXModmFsdWUpKSB7XFxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncHJpbW9yZGlhbCByZWFjaGFibGUgdGhyb3VnaCBtdWx0aXBsZSBwYXRocycpO1xcbiAgICAgICAgfVxcbiAgICAgICAgd2hpdGVUYWJsZS5zZXQodmFsdWUsIHBlcm1pdCk7XFxuICAgICAgICBrZXlzKHBlcm1pdCkuZm9yRWFjaChuYW1lID0+IHtcXG4gICAgICAgICAgLy8gVXNlIGdvcGQgdG8gYXZvaWQgaW52b2tpbmcgYW4gYWNjZXNzb3IgcHJvcGVydHkuXFxuICAgICAgICAgIC8vIEFjY2Vzc29yIHByb3BlcnRpZXMgZm9yIHdoaWNoIHBlcm1pdCAhPT0gJ21heWJlQWNjZXNzb3InXFxuICAgICAgICAgIC8vIGFyZSBjYXVnaHQgbGF0ZXIgYnkgY2xlYW4oKS5cXG4gICAgICAgICAgY29uc3QgZGVzYyA9IGdvcGQodmFsdWUsIG5hbWUpO1xcbiAgICAgICAgICBpZiAoZGVzYykge1xcbiAgICAgICAgICAgIHJlZ2lzdGVyKGRlc2MudmFsdWUsIHBlcm1pdFtuYW1lXSk7XFxuICAgICAgICAgIH1cXG4gICAgICAgIH0pO1xcbiAgICAgIH1cXG4gICAgICByZWdpc3Rlcihyb290VmFsdWUsIHJvb3RQZXJtaXQpO1xcbiAgICB9XFxuXFxuICAgIC8qKlxcbiAgICAgKiBTaG91bGQgdGhlIHByb3BlcnR5IG5hbWVkIHtAY29kZSBuYW1lfSBiZSB3aGl0ZWxpc3RlZCBvbiB0aGVcXG4gICAgICoge0Bjb2RlIGJhc2V9IG9iamVjdCwgYW5kIGlmIHNvLCB3aXRoIHdoYXQgUGVybWl0P1xcbiAgICAgKlxcbiAgICAgKiA8cD5JZiBpdCBzaG91bGQgYmUgcGVybWl0dGVkLCByZXR1cm4gdGhlIFBlcm1pdCAod2hlcmUgUGVybWl0ID1cXG4gICAgICogdHJ1ZSB8IFxcXCJtYXliZUFjY2Vzc29yXFxcIiB8IFxcXCIqXFxcIiB8IFJlY29yZChQZXJtaXQpKSwgYWxsIG9mIHdoaWNoIGFyZVxcbiAgICAgKiB0cnV0aHkuIElmIGl0IHNob3VsZCBub3QgYmUgcGVybWl0dGVkLCByZXR1cm4gZmFsc2UuXFxuICAgICAqL1xcbiAgICBmdW5jdGlvbiBnZXRQZXJtaXQoYmFzZSwgbmFtZSkge1xcbiAgICAgIGxldCBwZXJtaXQgPSB3aGl0ZVRhYmxlLmdldChiYXNlKTtcXG4gICAgICBpZiAocGVybWl0KSB7XFxuICAgICAgICBpZiAoaG9wKHBlcm1pdCwgbmFtZSkpIHtcXG4gICAgICAgICAgcmV0dXJuIHBlcm1pdFtuYW1lXTtcXG4gICAgICAgIH1cXG4gICAgICAgIC8vIEFsbG93IGVzY2FwaW5nIG9mIG1hZ2ljYWwgbmFtZXMgbGlrZSAnX19wcm90b19fJy5cXG4gICAgICAgIGlmIChob3AocGVybWl0LCBgRVNDQVBFJHtuYW1lfWApKSB7XFxuICAgICAgICAgIHJldHVybiBwZXJtaXRbYEVTQ0FQRSR7bmFtZX1gXTtcXG4gICAgICAgIH1cXG4gICAgICB9XFxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnN0YW50LWNvbmRpdGlvblxcbiAgICAgIHdoaWxlICh0cnVlKSB7XFxuICAgICAgICBiYXNlID0gZ2V0UHJvdG8oYmFzZSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tcGFyYW0tcmVhc3NpZ25cXG4gICAgICAgIGlmIChiYXNlID09PSBudWxsKSB7XFxuICAgICAgICAgIHJldHVybiBmYWxzZTtcXG4gICAgICAgIH1cXG4gICAgICAgIHBlcm1pdCA9IHdoaXRlVGFibGUuZ2V0KGJhc2UpO1xcbiAgICAgICAgaWYgKHBlcm1pdCAmJiBob3AocGVybWl0LCBuYW1lKSkge1xcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSBwZXJtaXRbbmFtZV07XFxuICAgICAgICAgIGlmIChyZXN1bHQgPT09ICcqJykge1xcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XFxuICAgICAgICAgIH1cXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xcbiAgICAgICAgfVxcbiAgICAgIH1cXG4gICAgfVxcblxcbiAgICAvKipcXG4gICAgICogUmVtb3ZlcyBhbGwgbm9uLXdoaXRlbGlzdGVkIHByb3BlcnRpZXMgZm91bmQgYnkgcmVjdXJzaXZlbHkgYW5kXFxuICAgICAqIHJlZmxlY3RpdmVseSB3YWxraW5nIG93biBwcm9wZXJ0eSBjaGFpbnMuXFxuICAgICAqXFxuICAgICAqIDxwPkluaGVyaXRlZCBwcm9wZXJ0aWVzIGFyZSBub3QgY2hlY2tlZCwgYmVjYXVzZSB3ZSByZXF1aXJlIHRoYXRcXG4gICAgICogaW5oZXJpdGVkLWZyb20gb2JqZWN0cyBhcmUgb3RoZXJ3aXNlIHJlYWNoYWJsZSBieSB0aGlzIHRyYXZlcnNhbC5cXG4gICAgICovXFxuICAgIGZ1bmN0aW9uIGNsZWFuKHZhbHVlLCBwcmVmaXgsIG51bSkge1xcbiAgICAgIGlmICh2YWx1ZSAhPT0gT2JqZWN0KHZhbHVlKSkge1xcbiAgICAgICAgcmV0dXJuO1xcbiAgICAgIH1cXG4gICAgICBpZiAoY2xlYW5pbmcuZ2V0KHZhbHVlKSkge1xcbiAgICAgICAgcmV0dXJuO1xcbiAgICAgIH1cXG5cXG4gICAgICBjb25zdCBwcm90byA9IGdldFByb3RvKHZhbHVlKTtcXG4gICAgICBpZiAocHJvdG8gIT09IG51bGwgJiYgIXdoaXRlVGFibGUuaGFzKHByb3RvKSkge1xcbiAgICAgICAgLy8gcmVwb3J0SXRlbVByb2JsZW0ocm9vdFJlcG9ydHMsIHNlcy5zZXZlcml0aWVzLk5PVF9JU09MQVRFRCxcXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgJ3VuZXhwZWN0ZWQgaW50cmluc2ljJywgcHJlZml4ICsgJy5fX3Byb3RvX18nKTtcXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgdW5leHBlY3RlZCBpbnRyaW5zaWMgJHtwcmVmaXh9Ll9fcHJvdG9fX2ApO1xcbiAgICAgIH1cXG5cXG4gICAgICBjbGVhbmluZy5zZXQodmFsdWUsIHRydWUpO1xcbiAgICAgIGdvcG4odmFsdWUpLmZvckVhY2gobmFtZSA9PiB7XFxuICAgICAgICBjb25zdCBwYXRoID0gcHJlZml4ICsgKHByZWZpeCA/ICcuJyA6ICcnKSArIG5hbWU7XFxuICAgICAgICBjb25zdCBwID0gZ2V0UGVybWl0KHZhbHVlLCBuYW1lKTtcXG4gICAgICAgIGlmIChwKSB7XFxuICAgICAgICAgIGNvbnN0IGRlc2MgPSBnb3BkKHZhbHVlLCBuYW1lKTtcXG4gICAgICAgICAgaWYgKGhvcChkZXNjLCAndmFsdWUnKSkge1xcbiAgICAgICAgICAgIC8vIElzIGEgZGF0YSBwcm9wZXJ0eVxcbiAgICAgICAgICAgIGNvbnN0IHN1YlZhbHVlID0gZGVzYy52YWx1ZTtcXG4gICAgICAgICAgICBjbGVhbihzdWJWYWx1ZSwgcGF0aCk7XFxuICAgICAgICAgIH0gZWxzZSBpZiAocCAhPT0gJ21heWJlQWNjZXNzb3InKSB7XFxuICAgICAgICAgICAgLy8gV2UgYXJlIG5vdCBzYXlpbmcgdGhhdCBpdCBpcyBzYWZlIGZvciB0aGUgcHJvcCB0byBiZVxcbiAgICAgICAgICAgIC8vIHVuZXhwZWN0ZWRseSBhbiBhY2Nlc3NvcjsgcmF0aGVyLCBpdCB3aWxsIGJlIGRlbGV0ZWRcXG4gICAgICAgICAgICAvLyBhbmQgdGh1cyBtYWRlIHNhZmUuXFxuICAgICAgICAgICAgLy8gcmVwb3J0UHJvcGVydHkoc2VzLnNldmVyaXRpZXMuU0FGRV9TUEVDX1ZJT0xBVElPTixcXG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICdOb3QgYSBkYXRhIHByb3BlcnR5JywgcGF0aCk7XFxuICAgICAgICAgICAgZGVsZXRlIHZhbHVlW25hbWVdOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXBhcmFtLXJlYXNzaWduXFxuICAgICAgICAgIH0gZWxzZSB7XFxuICAgICAgICAgICAgY2xlYW4oZGVzYy5nZXQsIGAke3BhdGh9PGdldHRlcj5gKTtcXG4gICAgICAgICAgICBjbGVhbihkZXNjLnNldCwgYCR7cGF0aH08c2V0dGVyPmApO1xcbiAgICAgICAgICB9XFxuICAgICAgICB9IGVsc2Uge1xcbiAgICAgICAgICBkZWxldGUgdmFsdWVbbmFtZV07IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tcGFyYW0tcmVhc3NpZ25cXG4gICAgICAgIH1cXG4gICAgICB9KTtcXG4gICAgfVxcblxcbiAgICBhZGRUb1doaXRlVGFibGUoZ2xvYmFsLCB3aGl0ZWxpc3QubmFtZWRJbnRyaW5zaWNzKTtcXG4gICAgY29uc3QgaW50ciA9IGdldEFub25JbnRyaW5zaWNzKGdsb2JhbCk7XFxuICAgIGFkZFRvV2hpdGVUYWJsZShpbnRyLCB3aGl0ZWxpc3QuYW5vbkludHJpbnNpY3MpO1xcbiAgICBjbGVhbihnbG9iYWwsICcnKTtcXG4gIH1cXG5cXG4gIC8vIENvcHlyaWdodCAoQykgMjAxMSBHb29nbGUgSW5jLlxcbiAgLy8gQ29weXJpZ2h0IChDKSAyMDE4IEFnb3JpY1xcbiAgLy9cXG4gIC8vIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcXFwiTGljZW5zZVxcXCIpO1xcbiAgLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxcbiAgLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XFxuICAvL1xcbiAgLy8gaHR0cHM6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxcbiAgLy9cXG4gIC8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcXG4gIC8vIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFxcXCJBUyBJU1xcXCIgQkFTSVMsXFxuICAvLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cXG4gIC8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcXG4gIC8vIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxcblxcbiAgLy8gVE9ETyhlcmlnaHRzKTogV2Ugc2hvdWxkIHRlc3QgZm9yXFxuICAvLyBXZSBub3cgaGF2ZSBhIHJlYXNvbiB0byBvbWl0IFByb3h5IGZyb20gdGhlIHdoaXRlbGlzdC5cXG4gIC8vIFRoZSBtYWtlQnJhbmRUZXN0ZXIgaW4gcmVwYWlyRVM1IHVzZXMgQWxsZW4ncyB0cmljayBhdFxcbiAgLy8gaHR0cHM6Ly9lc2Rpc2N1c3Mub3JnL3RvcGljL3Rvc3RyaW5ndGFnLXNwb29maW5nLWZvci1udWxsLWFuZC11bmRlZmluZWQjY29udGVudC01OVxcbiAgLy8gLCBidXQgdGVzdGluZyByZXZlYWxzIHRoYXQsIG9uIEZGIDM1LjAuMSwgYSBwcm94eSBvbiBhbiBleG90aWNcXG4gIC8vIG9iamVjdCBYIHdpbGwgcGFzcyB0aGlzIGJyYW5kIHRlc3Qgd2hlbiBYIHdpbGwuIFRoaXMgaXMgZml4ZWQgYXMgb2ZcXG4gIC8vIEZGIE5pZ2h0bHkgMzguMGExLlxcblxcbiAgLyoqXFxuICAgKiA8cD5RdWFsaWZ5aW5nIHBsYXRmb3JtcyBnZW5lcmFsbHkgaW5jbHVkZSBhbGwgSmF2YVNjcmlwdCBwbGF0Zm9ybXNcXG4gICAqIHNob3duIG9uIDxhIGhyZWY9XFxcImh0dHA6Ly9rYW5nYXguZ2l0aHViLmNvbS9lczUtY29tcGF0LXRhYmxlL1xcXCJcXG4gICAqID5FQ01BU2NyaXB0IDUgY29tcGF0aWJpbGl0eSB0YWJsZTwvYT4gdGhhdCBpbXBsZW1lbnQge0Bjb2RlXFxuICAgKiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lc30uIEF0IHRoZSB0aW1lIG9mIHRoaXMgd3JpdGluZyxcXG4gICAqIHF1YWxpZnlpbmcgYnJvd3NlcnMgYWxyZWFkeSBpbmNsdWRlIHRoZSBsYXRlc3QgcmVsZWFzZWQgdmVyc2lvbnMgb2ZcXG4gICAqIEludGVybmV0IEV4cGxvcmVyICg5KSwgRmlyZWZveCAoNCksIENocm9tZSAoMTEpLCBhbmQgU2FmYXJpXFxuICAgKiAoNS4wLjUpLCB0aGVpciBjb3JyZXNwb25kaW5nIHN0YW5kYWxvbmUgKGUuZy4sIHNlcnZlci1zaWRlKSBKYXZhU2NyaXB0XFxuICAgKiBlbmdpbmVzLCBSaGlubyAxLjczLCBhbmQgQkVTRU4uXFxuICAgKlxcbiAgICogPHA+T24gc3VjaCBub3QtcXVpdGUtRVM1IHBsYXRmb3Jtcywgc29tZSBlbGVtZW50cyBvZiB0aGVzZVxcbiAgICogZW11bGF0aW9ucyBtYXkgbG9zZSBTRVMgc2FmZXR5LCBhcyBlbnVtZXJhdGVkIGluIHRoZSBjb21tZW50IG9uXFxuICAgKiBlYWNoIHByb2JsZW0gcmVjb3JkIGluIHRoZSB7QGNvZGUgYmFzZVByb2JsZW1zfSBhbmQge0Bjb2RlXFxuICAgKiBzdXBwb3J0ZWRQcm9ibGVtc30gYXJyYXkgYmVsb3cuIFRoZSBwbGF0Zm9ybSBtdXN0IGF0IGxlYXN0IHByb3ZpZGVcXG4gICAqIHtAY29kZSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lc30sIGJlY2F1c2UgaXQgY2Fubm90IHJlYXNvbmFibHkgYmVcXG4gICAqIGVtdWxhdGVkLlxcbiAgICpcXG4gICAqIDxwPlRoaXMgZmlsZSBpcyB1c2VmdWwgYnkgaXRzZWxmLCBhcyBpdCBoYXMgbm8gZGVwZW5kZW5jaWVzIG9uIHRoZVxcbiAgICogcmVzdCBvZiBTRVMuIEl0IGNyZWF0ZXMgbm8gbmV3IGdsb2JhbCBiaW5kaW5ncywgYnV0IG1lcmVseSByZXBhaXJzXFxuICAgKiBzdGFuZGFyZCBnbG9iYWxzIG9yIHN0YW5kYXJkIGVsZW1lbnRzIHJlYWNoYWJsZSBmcm9tIHN0YW5kYXJkXFxuICAgKiBnbG9iYWxzLiBJZiB0aGUgZnV0dXJlLXN0YW5kYXJkIHtAY29kZSBXZWFrTWFwfSBnbG9iYWwgaXMgcHJlc2VudCxcXG4gICAqIGFzIGl0IGlzIGN1cnJlbnRseSBvbiBGRjcuMGExLCB0aGVuIGl0IHdpbGwgcmVwYWlyIGl0IGluIHBsYWNlLiBUaGVcXG4gICAqIG9uZSBub24tc3RhbmRhcmQgZWxlbWVudCB0aGF0IHRoaXMgZmlsZSB1c2VzIGlzIHtAY29kZSBjb25zb2xlfSBpZlxcbiAgICogcHJlc2VudCwgaW4gb3JkZXIgdG8gcmVwb3J0IHRoZSByZXBhaXJzIGl0IGZvdW5kIG5lY2Vzc2FyeSwgaW5cXG4gICAqIHdoaWNoIGNhc2Ugd2UgdXNlIGl0cyB7QGNvZGUgbG9nLCBpbmZvLCB3YXJufSwgYW5kIHtAY29kZSBlcnJvcn1cXG4gICAqIG1ldGhvZHMuIElmIHtAY29kZSBjb25zb2xlLmxvZ30gaXMgYWJzZW50LCB0aGVuIHRoaXMgZmlsZSBwZXJmb3Jtc1xcbiAgICogaXRzIHJlcGFpcnMgc2lsZW50bHkuXFxuICAgKlxcbiAgICogPHA+R2VuZXJhbGx5LCB0aGlzIGZpbGUgc2hvdWxkIGJlIHJ1biBhcyB0aGUgZmlyc3Qgc2NyaXB0IGluIGFcXG4gICAqIEphdmFTY3JpcHQgY29udGV4dCAoaS5lLiBhIGJyb3dzZXIgZnJhbWUpLCBhcyBpdCByZWxpZXMgb24gb3RoZXJcXG4gICAqIHByaW1vcmRpYWwgb2JqZWN0cyBhbmQgbWV0aG9kcyBub3QgeWV0IGJlaW5nIHBlcnR1cmJlZC5cXG4gICAqXFxuICAgKiA8cD5UT0RPKGVyaWdodHMpOiBUaGlzIGZpbGUgdHJpZXMgdG8gcHJvdGVjdCBpdHNlbGYgZnJvbSBzb21lXFxuICAgKiBwb3N0LWluaXRpYWxpemF0aW9uIHBlcnR1cmJhdGlvbiBieSBzdGFzaGluZyBzb21lIG9mIHRoZVxcbiAgICogcHJpbW9yZGlhbHMgaXQgbmVlZHMgZm9yIGxhdGVyIHVzZSwgYnV0IHRoaXMgYXR0ZW1wdCBpcyBjdXJyZW50bHlcXG4gICAqIGluY29tcGxldGUuIFdlIG5lZWQgdG8gcmV2aXNpdCB0aGlzIHdoZW4gd2Ugc3VwcG9ydCBDb25maW5lZC1FUzUsXFxuICAgKiBhcyBhIHZhcmlhbnQgb2YgU0VTIGluIHdoaWNoIHRoZSBwcmltb3JkaWFscyBhcmUgbm90IGZyb3plbi4gU2VlXFxuICAgKiBwcmV2aW91cyBmYWlsZWQgYXR0ZW1wdCBhdCA8YVxcbiAgICogaHJlZj1cXFwiaHR0cHM6Ly9jb2RlcmV2aWV3LmFwcHNwb3QuY29tLzUyNzgwNDYvXFxcIiA+U3BlZWRzIHVwXFxuICAgKiBXZWFrTWFwLiBQcmVwYXJpbmcgdG8gc3VwcG9ydCB1bmZyb3plbiBwcmltb3JkaWFscy48L2E+LiBGcm9tXFxuICAgKiBhbmFseXNpcyBvZiB0aGlzIGZhaWxlZCBhdHRlbXB0LCBpdCBzZWVtcyB0aGF0IHRoZSBvbmx5IHByYWN0aWNhbFxcbiAgICogd2F5IHRvIHN1cHBvcnQgQ0VTIGlzIGJ5IHVzZSBvZiB0d28gZnJhbWVzLCB3aGVyZSBtb3N0IG9mIGluaXRTRVNcXG4gICAqIHJ1bnMgaW4gYSBTRVMgZnJhbWUsIGFuZCBzbyBjYW4gYXZvaWQgd29ycnlpbmcgYWJvdXQgbW9zdCBvZiB0aGVzZVxcbiAgICogcGVydHVyYmF0aW9ucy5cXG4gICAqL1xcbiAgZnVuY3Rpb24gZ2V0QW5vbkludHJpbnNpY3MkMShnbG9iYWwpIHtcXG5cXG4gICAgY29uc3QgZ29wZCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I7XFxuICAgIGNvbnN0IGdldFByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mO1xcblxcbiAgICAvLyAvLy8vLy8vLy8vLy8vLyBVbmRlbmlhYmxlcyBhbmQgSW50cmluc2ljcyAvLy8vLy8vLy8vLy8vL1xcblxcbiAgICAvKipcXG4gICAgICogVGhlIHVuZGVuaWFibGVzIGFyZSB0aGUgcHJpbW9yZGlhbCBvYmplY3RzIHdoaWNoIGFyZSBhbWJpZW50bHlcXG4gICAgICogcmVhY2hhYmxlIHZpYSBjb21wb3NpdGlvbnMgb2Ygc3RyaWN0IHN5bnRheCwgcHJpbWl0aXZlIHdyYXBwaW5nXFxuICAgICAqIChuZXcgT2JqZWN0KHgpKSwgYW5kIHByb3RvdHlwZSBuYXZpZ2F0aW9uICh0aGUgZXF1aXZhbGVudCBvZlxcbiAgICAgKiBPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkgb3IgeC5fX3Byb3RvX18pLiBBbHRob3VnaCB3ZSBjb3VsZCBpblxcbiAgICAgKiB0aGVvcnkgbW9ua2V5IHBhdGNoIHByaW1pdGl2ZSB3cmFwcGluZyBvciBwcm90b3R5cGUgbmF2aWdhdGlvbixcXG4gICAgICogd2Ugd29uJ3QuIEhlbmNlLCB3aXRob3V0IHBhcnNpbmcsIHRoZSBmb2xsb3dpbmcgYXJlIHVuZGVuaWFibGUgbm9cXG4gICAgICogbWF0dGVyIHdoYXQgPGk+b3RoZXI8L2k+IG1vbmtleSBwYXRjaGluZyB3ZSBkbyB0byB0aGUgcHJpbW9yZGlhbFxcbiAgICAgKiBlbnZpcm9ubWVudC5cXG4gICAgICovXFxuXFxuICAgIC8vIFRoZSBmaXJzdCBlbGVtZW50IG9mIGVhY2ggdW5kZW5pYWJsZVR1cGxlIGlzIGEgc3RyaW5nIHVzZWQgdG9cXG4gICAgLy8gbmFtZSB0aGUgdW5kZW5pYWJsZSBvYmplY3QgZm9yIHJlcG9ydGluZyBwdXJwb3Nlcy4gSXQgaGFzIG5vXFxuICAgIC8vIG90aGVyIHByb2dyYW1tYXRpYyB1c2UuXFxuICAgIC8vXFxuICAgIC8vIFRoZSBzZWNvbmQgZWxlbWVudCBvZiBlYWNoIHVuZGVuaWFibGVUdXBsZSBzaG91bGQgYmUgdGhlXFxuICAgIC8vIHVuZGVuaWFibGUgaXRzZWxmLlxcbiAgICAvL1xcbiAgICAvLyBUaGUgb3B0aW9uYWwgdGhpcmQgZWxlbWVudCBvZiB0aGUgdW5kZW5pYWJsZVR1cGxlLCBpZiBwcmVzZW50LFxcbiAgICAvLyBzaG91bGQgYmUgYW4gZXhhbXBsZSBvZiBzeW50YXgsIHJhdGhlciB0aGFuIHVzZSBvZiBhIG1vbmtleVxcbiAgICAvLyBwYXRjaGFibGUgQVBJLCBldmFsdWF0aW5nIHRvIGEgdmFsdWUgZnJvbSB3aGljaCB0aGUgdW5kZW5pYWJsZVxcbiAgICAvLyBvYmplY3QgaW4gdGhlIHNlY29uZCBlbGVtZW50IGNhbiBiZSByZWFjaGVkIGJ5IG9ubHkgdGhlXFxuICAgIC8vIGZvbGxvd2luZyBzdGVwczpcXG4gICAgLy8gSWYgdGhlIHZhbHVlIGlzIHByaW1pdHZlLCBjb252ZXJ0IHRvIGFuIE9iamVjdCB3cmFwcGVyLlxcbiAgICAvLyBJcyB0aGUgcmVzdWx0aW5nIG9iamVjdCBlaXRoZXIgdGhlIHVuZGVuaWFibGUgb2JqZWN0LCBvciBkb2VzXFxuICAgIC8vIGl0IGluaGVyaXQgZGlyZWN0bHkgZnJvbSB0aGUgdW5kZW5pYWJsZSBvYmplY3Q/XFxuXFxuICAgIGZ1bmN0aW9uKiBhU3RyaWN0R2VuZXJhdG9yKCkge30gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1lbXB0eS1mdW5jdGlvblxcbiAgICBjb25zdCBHZW5lcmF0b3IgPSBnZXRQcm90byhhU3RyaWN0R2VuZXJhdG9yKTtcXG4gICAgYXN5bmMgZnVuY3Rpb24qIGFTdHJpY3RBc3luY0dlbmVyYXRvcigpIHt9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZW1wdHktZnVuY3Rpb25cXG4gICAgY29uc3QgQXN5bmNHZW5lcmF0b3IgPSBnZXRQcm90byhhU3RyaWN0QXN5bmNHZW5lcmF0b3IpO1xcbiAgICBhc3luYyBmdW5jdGlvbiBhU3RyaWN0QXN5bmNGdW5jdGlvbigpIHt9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZW1wdHktZnVuY3Rpb25cXG4gICAgY29uc3QgQXN5bmNGdW5jdGlvblByb3RvdHlwZSA9IGdldFByb3RvKGFTdHJpY3RBc3luY0Z1bmN0aW9uKTtcXG5cXG4gICAgLy8gVE9ETzogdGhpcyBpcyBkZWFkIGNvZGUsIGJ1dCBjb3VsZCBiZSB1c2VmdWw6IG1ha2UgdGhpcyB0aGVcXG4gICAgLy8gJ3VuZGVuaWFibGVzJyBvYmplY3QgYXZhaWxhYmxlIHZpYSBzb21lIEFQSS5cXG5cXG4gICAgY29uc3QgdW5kZW5pYWJsZVR1cGxlcyA9IFtcXG4gICAgICBbJ09iamVjdC5wcm90b3R5cGUnLCBPYmplY3QucHJvdG90eXBlLCB7fV0sXFxuICAgICAgWydGdW5jdGlvbi5wcm90b3R5cGUnLCBGdW5jdGlvbi5wcm90b3R5cGUsIGZ1bmN0aW9uIGZvbygpIHt9XSxcXG4gICAgICBbJ0FycmF5LnByb3RvdHlwZScsIEFycmF5LnByb3RvdHlwZSwgW11dLFxcbiAgICAgIFsnUmVnRXhwLnByb3RvdHlwZScsIFJlZ0V4cC5wcm90b3R5cGUsIC94L10sXFxuICAgICAgWydCb29sZWFuLnByb3RvdHlwZScsIEJvb2xlYW4ucHJvdG90eXBlLCB0cnVlXSxcXG4gICAgICBbJ051bWJlci5wcm90b3R5cGUnLCBOdW1iZXIucHJvdG90eXBlLCAxXSxcXG4gICAgICBbJ1N0cmluZy5wcm90b3R5cGUnLCBTdHJpbmcucHJvdG90eXBlLCAneCddLFxcbiAgICAgIFsnJUdlbmVyYXRvciUnLCBHZW5lcmF0b3IsIGFTdHJpY3RHZW5lcmF0b3JdLFxcbiAgICAgIFsnJUFzeW5jR2VuZXJhdG9yJScsIEFzeW5jR2VuZXJhdG9yLCBhU3RyaWN0QXN5bmNHZW5lcmF0b3JdLFxcbiAgICAgIFsnJUFzeW5jRnVuY3Rpb24lJywgQXN5bmNGdW5jdGlvblByb3RvdHlwZSwgYVN0cmljdEFzeW5jRnVuY3Rpb25dLFxcbiAgICBdO1xcblxcbiAgICB1bmRlbmlhYmxlVHVwbGVzLmZvckVhY2godHVwbGUgPT4ge1xcbiAgICAgIGNvbnN0IG5hbWUgPSB0dXBsZVswXTtcXG4gICAgICBjb25zdCB1bmRlbmlhYmxlID0gdHVwbGVbMV07XFxuICAgICAgbGV0IHN0YXJ0ID0gdHVwbGVbMl07XFxuICAgICAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQpIHtcXG4gICAgICAgIHJldHVybjtcXG4gICAgICB9XFxuICAgICAgc3RhcnQgPSBPYmplY3Qoc3RhcnQpO1xcbiAgICAgIGlmICh1bmRlbmlhYmxlID09PSBzdGFydCkge1xcbiAgICAgICAgcmV0dXJuO1xcbiAgICAgIH1cXG4gICAgICBpZiAodW5kZW5pYWJsZSA9PT0gZ2V0UHJvdG8oc3RhcnQpKSB7XFxuICAgICAgICByZXR1cm47XFxuICAgICAgfVxcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCB1bmRlbmlhYmxlOiAke3VuZGVuaWFibGV9YCk7XFxuICAgIH0pO1xcblxcbiAgICBmdW5jdGlvbiByZWdpc3Rlckl0ZXJhdG9yUHJvdG9zKHJlZ2lzdGVyeSwgYmFzZSwgbmFtZSkge1xcbiAgICAgIGNvbnN0IGl0ZXJhdG9yU3ltID1cXG4gICAgICAgIChnbG9iYWwuU3ltYm9sICYmIGdsb2JhbC5TeW1ib2wuaXRlcmF0b3IpIHx8ICdAQGl0ZXJhdG9yJzsgLy8gdXNlZCBpbnN0ZWFkIG9mIGEgc3ltYm9sIG9uIEZGMzVcXG5cXG4gICAgICBpZiAoYmFzZVtpdGVyYXRvclN5bV0pIHtcXG4gICAgICAgIGNvbnN0IGFuSXRlciA9IGJhc2VbaXRlcmF0b3JTeW1dKCk7XFxuICAgICAgICBjb25zdCBhbkl0ZXJhdG9yUHJvdG90eXBlID0gZ2V0UHJvdG8oYW5JdGVyKTtcXG4gICAgICAgIHJlZ2lzdGVyeVtuYW1lXSA9IGFuSXRlcmF0b3JQcm90b3R5cGU7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tcGFyYW0tcmVhc3NpZ25cXG4gICAgICAgIGNvbnN0IGFuSXRlclByb3RvQmFzZSA9IGdldFByb3RvKGFuSXRlcmF0b3JQcm90b3R5cGUpO1xcbiAgICAgICAgaWYgKGFuSXRlclByb3RvQmFzZSAhPT0gT2JqZWN0LnByb3RvdHlwZSkge1xcbiAgICAgICAgICBpZiAoIXJlZ2lzdGVyeS5JdGVyYXRvclByb3RvdHlwZSkge1xcbiAgICAgICAgICAgIGlmIChnZXRQcm90byhhbkl0ZXJQcm90b0Jhc2UpICE9PSBPYmplY3QucHJvdG90eXBlKSB7XFxuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXFxuICAgICAgICAgICAgICAgICclSXRlcmF0b3JQcm90b3R5cGUlLl9fcHJvdG9fXyB3YXMgbm90IE9iamVjdC5wcm90b3R5cGUnLFxcbiAgICAgICAgICAgICAgKTtcXG4gICAgICAgICAgICB9XFxuICAgICAgICAgICAgcmVnaXN0ZXJ5Lkl0ZXJhdG9yUHJvdG90eXBlID0gYW5JdGVyUHJvdG9CYXNlOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXBhcmFtLXJlYXNzaWduXFxuICAgICAgICAgIH0gZWxzZSBpZiAocmVnaXN0ZXJ5Lkl0ZXJhdG9yUHJvdG90eXBlICE9PSBhbkl0ZXJQcm90b0Jhc2UpIHtcXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHVuZXhwZWN0ZWQgJSR7bmFtZX0lLl9fcHJvdG9fX2ApO1xcbiAgICAgICAgICB9XFxuICAgICAgICB9XFxuICAgICAgfVxcbiAgICB9XFxuXFxuICAgIC8qKlxcbiAgICAgKiBHZXQgdGhlIGludHJpbnNpY3Mgbm90IG90aGVyd2lzZSByZWFjaGFibGUgYnkgbmFtZWQgb3duIHByb3BlcnR5XFxuICAgICAqIHRyYXZlcnNhbC4gU2VlXFxuICAgICAqIGh0dHBzOi8vcGVvcGxlLm1vemlsbGEub3JnL35qb3JlbmRvcmZmL2VzNi1kcmFmdC5odG1sI3NlYy13ZWxsLWtub3duLWludHJpbnNpYy1vYmplY3RzXFxuICAgICAqIGFuZCB0aGUgaW5zdHJpbnNpY3Mgc2VjdGlvbiBvZiB3aGl0ZWxpc3QuanNcXG4gICAgICpcXG4gICAgICogPHA+VW5saWtlIGdldFVuZGVuaWFibGVzKCksIHRoZSByZXN1bHQgb2Ygc2FtcGxlQW5vbkludHJpbnNpY3MoKVxcbiAgICAgKiBkb2VzIGRlcGVuZCBvbiB0aGUgY3VycmVudCBzdGF0ZSBvZiB0aGUgcHJpbW9yZGlhbHMsIHNvIHdlIG11c3RcXG4gICAgICogcnVuIHRoaXMgYWdhaW4gYWZ0ZXIgYWxsIG90aGVyIHJlbGV2YW50IG1vbmtleSBwYXRjaGluZyBpcyBkb25lLFxcbiAgICAgKiBpbiBvcmRlciB0byBwcm9wZXJseSBpbml0aWFsaXplIGNhamFWTS5pbnRyaW5zaWNzXFxuICAgICAqL1xcblxcbiAgICAvLyBUT0RPOiB3ZSBjYW4gcHJvYmFibHkgdW53cmFwIHRoaXMgaW50byB0aGUgb3V0ZXIgZnVuY3Rpb24sIGFuZCBzdG9wXFxuICAgIC8vIHVzaW5nIGEgc2VwYXJhdGVseSBuYW1lZCAnc2FtcGxlQW5vbkludHJpbnNpY3MnXFxuICAgIGZ1bmN0aW9uIHNhbXBsZUFub25JbnRyaW5zaWNzKCkge1xcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHt9O1xcblxcbiAgICAgIC8vIElmIHRoZXJlIGFyZSBzdGlsbCBvdGhlciBUaHJvd1R5cGVFcnJvciBvYmplY3RzIGxlZnQgYWZ0ZXJcXG4gICAgICAvLyBub0Z1bmNQb2lzb24taW5nLCB0aGlzIHNob3VsZCBiZSBjYXVnaHQgYnlcXG4gICAgICAvLyB0ZXN0X1RIUk9XVFlQRUVSUk9SX05PVF9VTklRVUUgYmVsb3csIHNvIHdlIGFzc3VtZSBoZXJlIHRoYXRcXG4gICAgICAvLyB0aGlzIGlzIHRoZSBvbmx5IHN1cnZpdmluZyBUaHJvd1R5cGVFcnJvciBpbnRyaW5zaWMuXFxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHByZWZlci1yZXN0LXBhcmFtc1xcbiAgICAgIHJlc3VsdC5UaHJvd1R5cGVFcnJvciA9IGdvcGQoYXJndW1lbnRzLCAnY2FsbGVlJykuZ2V0O1xcblxcbiAgICAgIC8vIEdldCB0aGUgRVM2ICVBcnJheUl0ZXJhdG9yUHJvdG90eXBlJSxcXG4gICAgICAvLyAlU3RyaW5nSXRlcmF0b3JQcm90b3R5cGUlLCAlTWFwSXRlcmF0b3JQcm90b3R5cGUlLFxcbiAgICAgIC8vICVTZXRJdGVyYXRvclByb3RvdHlwZSUgYW5kICVJdGVyYXRvclByb3RvdHlwZSUgaW50cmluc2ljcywgaWZcXG4gICAgICAvLyBwcmVzZW50LlxcbiAgICAgIHJlZ2lzdGVySXRlcmF0b3JQcm90b3MocmVzdWx0LCBbXSwgJ0FycmF5SXRlcmF0b3JQcm90b3R5cGUnKTtcXG4gICAgICByZWdpc3Rlckl0ZXJhdG9yUHJvdG9zKHJlc3VsdCwgJycsICdTdHJpbmdJdGVyYXRvclByb3RvdHlwZScpO1xcbiAgICAgIGlmICh0eXBlb2YgTWFwID09PSAnZnVuY3Rpb24nKSB7XFxuICAgICAgICByZWdpc3Rlckl0ZXJhdG9yUHJvdG9zKHJlc3VsdCwgbmV3IE1hcCgpLCAnTWFwSXRlcmF0b3JQcm90b3R5cGUnKTtcXG4gICAgICB9XFxuICAgICAgaWYgKHR5cGVvZiBTZXQgPT09ICdmdW5jdGlvbicpIHtcXG4gICAgICAgIHJlZ2lzdGVySXRlcmF0b3JQcm90b3MocmVzdWx0LCBuZXcgU2V0KCksICdTZXRJdGVyYXRvclByb3RvdHlwZScpO1xcbiAgICAgIH1cXG5cXG4gICAgICAvLyBHZXQgdGhlIEVTNiAlR2VuZXJhdG9yRnVuY3Rpb24lIGludHJpbnNpYywgaWYgcHJlc2VudC5cXG4gICAgICBpZiAoZ2V0UHJvdG8oR2VuZXJhdG9yKSAhPT0gRnVuY3Rpb24ucHJvdG90eXBlKSB7XFxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0dlbmVyYXRvci5fX3Byb3RvX18gd2FzIG5vdCBGdW5jdGlvbi5wcm90b3R5cGUnKTtcXG4gICAgICB9XFxuICAgICAgY29uc3QgR2VuZXJhdG9yRnVuY3Rpb24gPSBHZW5lcmF0b3IuY29uc3RydWN0b3I7XFxuICAgICAgaWYgKGdldFByb3RvKEdlbmVyYXRvckZ1bmN0aW9uKSAhPT0gRnVuY3Rpb24ucHJvdG90eXBlLmNvbnN0cnVjdG9yKSB7XFxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXFxuICAgICAgICAgICdHZW5lcmF0b3JGdW5jdGlvbi5fX3Byb3RvX18gd2FzIG5vdCBGdW5jdGlvbi5wcm90b3R5cGUuY29uc3RydWN0b3InLFxcbiAgICAgICAgKTtcXG4gICAgICB9XFxuICAgICAgcmVzdWx0LkdlbmVyYXRvckZ1bmN0aW9uID0gR2VuZXJhdG9yRnVuY3Rpb247XFxuICAgICAgY29uc3QgZ2VuUHJvdG9CYXNlID0gZ2V0UHJvdG8oR2VuZXJhdG9yLnByb3RvdHlwZSk7XFxuICAgICAgaWYgKGdlblByb3RvQmFzZSAhPT0gcmVzdWx0Lkl0ZXJhdG9yUHJvdG90eXBlKSB7XFxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQgR2VuZXJhdG9yLnByb3RvdHlwZS5fX3Byb3RvX18nKTtcXG4gICAgICB9XFxuXFxuICAgICAgLy8gR2V0IHRoZSBFUzYgJUFzeW5jR2VuZXJhdG9yRnVuY3Rpb24lIGludHJpbnNpYywgaWYgcHJlc2VudC5cXG4gICAgICBpZiAoZ2V0UHJvdG8oQXN5bmNHZW5lcmF0b3IpICE9PSBGdW5jdGlvbi5wcm90b3R5cGUpIHtcXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQXN5bmNHZW5lcmF0b3IuX19wcm90b19fIHdhcyBub3QgRnVuY3Rpb24ucHJvdG90eXBlJyk7XFxuICAgICAgfVxcbiAgICAgIGNvbnN0IEFzeW5jR2VuZXJhdG9yRnVuY3Rpb24gPSBBc3luY0dlbmVyYXRvci5jb25zdHJ1Y3RvcjtcXG4gICAgICBpZiAoZ2V0UHJvdG8oQXN5bmNHZW5lcmF0b3JGdW5jdGlvbikgIT09IEZ1bmN0aW9uLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcikge1xcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxcbiAgICAgICAgICAnQXN5bmNHZW5lcmF0b3JGdW5jdGlvbi5fX3Byb3RvX18gd2FzIG5vdCBGdW5jdGlvbi5wcm90b3R5cGUuY29uc3RydWN0b3InLFxcbiAgICAgICAgKTtcXG4gICAgICB9XFxuICAgICAgcmVzdWx0LkFzeW5jR2VuZXJhdG9yRnVuY3Rpb24gPSBBc3luY0dlbmVyYXRvckZ1bmN0aW9uO1xcbiAgICAgIGNvbnN0IEFzeW5jR2VuZXJhdG9yUHJvdG90eXBlID0gQXN5bmNHZW5lcmF0b3IucHJvdG90eXBlO1xcbiAgICAgIHJlc3VsdC5Bc3luY0l0ZXJhdG9yUHJvdG90eXBlID0gZ2V0UHJvdG8oQXN5bmNHZW5lcmF0b3JQcm90b3R5cGUpO1xcbiAgICAgIC8vIGl0IGFwcGVhcnMgdGhhdCB0aGUgb25seSB3YXkgdG8gZ2V0IGFuIEFzeW5jSXRlcmF0b3JQcm90b3R5cGUgaXNcXG4gICAgICAvLyB0aHJvdWdoIHRoaXMgZ2V0UHJvdG8oKSBwcm9jZXNzLCBzbyB0aGVyZSdzIG5vdGhpbmcgdG8gY2hlY2sgaXRcXG4gICAgICAvLyBhZ2FpbnN0XFxuICAgICAgaWYgKGdldFByb3RvKHJlc3VsdC5Bc3luY0l0ZXJhdG9yUHJvdG90eXBlKSAhPT0gT2JqZWN0LnByb3RvdHlwZSkge1xcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxcbiAgICAgICAgICAnQXN5bmNJdGVyYXRvclByb3RvdHlwZS5fX3Byb3RvX18gd2FzIG5vdCBPYmplY3QucHJvdG90eXBlJyxcXG4gICAgICAgICk7XFxuICAgICAgfVxcblxcbiAgICAgIC8vIEdldCB0aGUgRVM2ICVBc3luY0Z1bmN0aW9uJSBpbnRyaW5zaWMsIGlmIHByZXNlbnQuXFxuICAgICAgaWYgKGdldFByb3RvKEFzeW5jRnVuY3Rpb25Qcm90b3R5cGUpICE9PSBGdW5jdGlvbi5wcm90b3R5cGUpIHtcXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcXG4gICAgICAgICAgJ0FzeW5jRnVuY3Rpb25Qcm90b3R5cGUuX19wcm90b19fIHdhcyBub3QgRnVuY3Rpb24ucHJvdG90eXBlJyxcXG4gICAgICAgICk7XFxuICAgICAgfVxcbiAgICAgIGNvbnN0IEFzeW5jRnVuY3Rpb24gPSBBc3luY0Z1bmN0aW9uUHJvdG90eXBlLmNvbnN0cnVjdG9yO1xcbiAgICAgIGlmIChnZXRQcm90byhBc3luY0Z1bmN0aW9uKSAhPT0gRnVuY3Rpb24ucHJvdG90eXBlLmNvbnN0cnVjdG9yKSB7XFxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXFxuICAgICAgICAgICdBc3luY0Z1bmN0aW9uLl9fcHJvdG9fXyB3YXMgbm90IEZ1bmN0aW9uLnByb3RvdHlwZS5jb25zdHJ1Y3RvcicsXFxuICAgICAgICApO1xcbiAgICAgIH1cXG4gICAgICByZXN1bHQuQXN5bmNGdW5jdGlvbiA9IEFzeW5jRnVuY3Rpb247XFxuXFxuICAgICAgLy8gR2V0IHRoZSBFUzYgJVR5cGVkQXJyYXklIGludHJpbnNpYywgaWYgcHJlc2VudC5cXG4gICAgICAoZnVuY3Rpb24gZ2V0VHlwZWRBcnJheSgpIHtcXG4gICAgICAgIGlmICghZ2xvYmFsLkZsb2F0MzJBcnJheSkge1xcbiAgICAgICAgICByZXR1cm47XFxuICAgICAgICB9XFxuICAgICAgICBjb25zdCBUeXBlZEFycmF5ID0gZ2V0UHJvdG8oZ2xvYmFsLkZsb2F0MzJBcnJheSk7XFxuICAgICAgICBpZiAoVHlwZWRBcnJheSA9PT0gRnVuY3Rpb24ucHJvdG90eXBlKSB7XFxuICAgICAgICAgIHJldHVybjtcXG4gICAgICAgIH1cXG4gICAgICAgIGlmIChnZXRQcm90byhUeXBlZEFycmF5KSAhPT0gRnVuY3Rpb24ucHJvdG90eXBlKSB7XFxuICAgICAgICAgIC8vIGh0dHA6Ly9iZXNwaW4uY3ovfm9uZHJhcy9odG1sL2NsYXNzdjhfMV8xQXJyYXlCdWZmZXJWaWV3Lmh0bWxcXG4gICAgICAgICAgLy8gaGFzIG1lIHdvcnJpZWQgdGhhdCBzb21lb25lIG1pZ2h0IG1ha2Ugc3VjaCBhbiBpbnRlcm1lZGlhdGVcXG4gICAgICAgICAgLy8gb2JqZWN0IHZpc2libGUuXFxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVHlwZWRBcnJheS5fX3Byb3RvX18gd2FzIG5vdCBGdW5jdGlvbi5wcm90b3R5cGUnKTtcXG4gICAgICAgIH1cXG4gICAgICAgIHJlc3VsdC5UeXBlZEFycmF5ID0gVHlwZWRBcnJheTtcXG4gICAgICB9KSgpO1xcblxcbiAgICAgIE9iamVjdC5rZXlzKHJlc3VsdCkuZm9yRWFjaChuYW1lID0+IHtcXG4gICAgICAgIGlmIChyZXN1bHRbbmFtZV0gPT09IHVuZGVmaW5lZCkge1xcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1hbGZvcm1lZCBpbnRyaW5zaWM6ICR7bmFtZX1gKTtcXG4gICAgICAgIH1cXG4gICAgICB9KTtcXG5cXG4gICAgICByZXR1cm4gcmVzdWx0O1xcbiAgICB9XFxuXFxuICAgIHJldHVybiBzYW1wbGVBbm9uSW50cmluc2ljcygpO1xcbiAgfVxcblxcbiAgZnVuY3Rpb24gZ2V0TmFtZWRJbnRyaW5zaWNzKHVuc2FmZUdsb2JhbCwgd2hpdGVsaXN0KSB7XFxuICAgIGNvbnN0IHsgZGVmaW5lUHJvcGVydHksIGdldE93blByb3BlcnR5RGVzY3JpcHRvciwgb3duS2V5cyB9ID0gUmVmbGVjdDtcXG5cXG4gICAgY29uc3QgbmFtZWRJbnRyaW5zaWNzID0ge307XFxuXFxuICAgIGNvbnN0IHByb3BlcnR5TmFtZXMgPSBvd25LZXlzKHdoaXRlbGlzdC5uYW1lZEludHJpbnNpY3MpO1xcblxcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgcHJvcGVydHlOYW1lcykge1xcbiAgICAgIGNvbnN0IGRlc2MgPSBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodW5zYWZlR2xvYmFsLCBuYW1lKTtcXG4gICAgICBpZiAoZGVzYykge1xcbiAgICAgICAgLy8gQWJvcnQgaWYgYW4gYWNjZXNzb3IgaXMgZm91bmQgb24gdGhlIHVuc2FmZSBnbG9iYWwgb2JqZWN0XFxuICAgICAgICAvLyBpbnN0ZWFkIG9mIGEgZGF0YSBwcm9wZXJ0eS4gV2Ugc2hvdWxkIG5ldmVyIGdldCBpbnRvIHRoaXNcXG4gICAgICAgIC8vIG5vbiBzdGFuZGFyZCBzaXR1YXRpb24uXFxuICAgICAgICBpZiAoJ2dldCcgaW4gZGVzYyB8fCAnc2V0JyBpbiBkZXNjKSB7XFxuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYHVuZXhwZWN0ZWQgYWNjZXNzb3Igb24gZ2xvYmFsIHByb3BlcnR5OiAke25hbWV9YCk7XFxuICAgICAgICB9XFxuXFxuICAgICAgICBkZWZpbmVQcm9wZXJ0eShuYW1lZEludHJpbnNpY3MsIG5hbWUsIGRlc2MpO1xcbiAgICAgIH1cXG4gICAgfVxcblxcbiAgICByZXR1cm4gbmFtZWRJbnRyaW5zaWNzO1xcbiAgfVxcblxcbiAgZnVuY3Rpb24gZ2V0QWxsUHJpbW9yZGlhbHMoZ2xvYmFsLCBhbm9uSW50cmluc2ljcykge1xcblxcbiAgICBjb25zdCByb290ID0ge1xcbiAgICAgIGdsb2JhbCwgLy8gZ2xvYmFsIHBsdXMgYWxsIHRoZSBuYW1lZEludHJpbnNpY3NcXG4gICAgICBhbm9uSW50cmluc2ljcyxcXG4gICAgfTtcXG4gICAgLy8gdG9kbzogcmUtZXhhbWluZSBleGFjdGx5IHdoaWNoIFxcXCJnbG9iYWxcXFwiIHdlJ3JlIGZyZWV6aW5nXFxuXFxuICAgIHJldHVybiByb290O1xcbiAgfVxcblxcbiAgZnVuY3Rpb24gZ2V0QWxsUHJpbW9yZGlhbHMkMShuYW1lZEludHJpbnNpY3MsIGFub25JbnRyaW5zaWNzKSB7XFxuXFxuICAgIGNvbnN0IHJvb3QgPSB7XFxuICAgICAgbmFtZWRJbnRyaW5zaWNzLFxcbiAgICAgIGFub25JbnRyaW5zaWNzLFxcbiAgICB9O1xcblxcbiAgICByZXR1cm4gcm9vdDtcXG4gIH1cXG5cXG4gIC8vIENvcHlyaWdodCAoQykgMjAxMSBHb29nbGUgSW5jLlxcbiAgLy8gQ29weXJpZ2h0IChDKSAyMDE4IEFnb3JpY1xcbiAgLy9cXG4gIC8vIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcXFwiTGljZW5zZVxcXCIpO1xcbiAgLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxcbiAgLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XFxuICAvL1xcbiAgLy8gaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXFxuICAvL1xcbiAgLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxcbiAgLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXFxcIkFTIElTXFxcIiBCQVNJUyxcXG4gIC8vIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxcbiAgLy8gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxcbiAgLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXFxuXFxuICAvKipcXG4gICAqIEBmaWxlb3ZlcnZpZXcgRXhwb3J0cyB7QGNvZGUgc2VzLndoaXRlbGlzdH0sIGEgcmVjdXJzaXZlbHkgZGVmaW5lZFxcbiAgICogSlNPTiByZWNvcmQgZW51bWVyYXRpbmcgYWxsIHRoZSBuYW1pbmcgcGF0aHMgaW4gdGhlIEVTNS4xIHNwZWMsXFxuICAgKiB0aG9zZSBkZS1mYWN0byBleHRlbnNpb25zIHRoYXQgd2UganVkZ2UgdG8gYmUgc2FmZSwgYW5kIFNFUyBhbmRcXG4gICAqIERyLiBTRVMgZXh0ZW5zaW9ucyBwcm92aWRlZCBieSB0aGUgU0VTIHJ1bnRpbWUuXFxuICAgKlxcbiAgICogPHA+QXNzdW1lcyBvbmx5IEVTMy4gQ29tcGF0aWJsZSB3aXRoIEVTNSwgRVM1LXN0cmljdCwgb3JcXG4gICAqIGFudGljaXBhdGVkIEVTNi5cXG4gICAqXFxuICAgKiAvL3Byb3ZpZGVzIHNlcy53aGl0ZWxpc3RcXG4gICAqIEBhdXRob3IgTWFyayBTLiBNaWxsZXIsXFxuICAgKiBAb3ZlcnJpZGVzIHNlcywgd2hpdGVsaXN0TW9kdWxlXFxuICAgKi9cXG5cXG4gIC8qKlxcbiAgICogPHA+RWFjaCBKU09OIHJlY29yZCBlbnVtZXJhdGVzIHRoZSBkaXNwb3NpdGlvbiBvZiB0aGUgcHJvcGVydGllcyBvblxcbiAgICogc29tZSBjb3JyZXNwb25kaW5nIHByaW1vcmRpYWwgb2JqZWN0LCB3aXRoIHRoZSByb290IHJlY29yZFxcbiAgICogcmVwcmVzZW50aW5nIHRoZSBnbG9iYWwgb2JqZWN0LiBGb3IgZWFjaCBzdWNoIHJlY29yZCwgdGhlIHZhbHVlc1xcbiAgICogYXNzb2NpYXRlZCB3aXRoIGl0cyBwcm9wZXJ0eSBuYW1lcyBjYW4gYmVcXG4gICAqIDx1bD5cXG4gICAqIDxsaT5Bbm90aGVyIHJlY29yZCwgaW4gd2hpY2ggY2FzZSB0aGlzIHByb3BlcnR5IGlzIHNpbXBseVxcbiAgICogICAgIHdoaXRlbGlzdGVkIGFuZCB0aGF0IG5leHQgcmVjb3JkIHJlcHJlc2VudHMgdGhlIGRpc3Bvc2l0aW9uIG9mXFxuICAgKiAgICAgdGhlIG9iamVjdCB3aGljaCBpcyBpdHMgdmFsdWUuIEZvciBleGFtcGxlLCB7QGNvZGUgXFxcIk9iamVjdFxcXCJ9XFxuICAgKiAgICAgbGVhZHMgdG8gYW5vdGhlciByZWNvcmQgZXhwbGFpbmluZyB3aGF0IHByb3BlcnRpZXMge0Bjb2RlXFxuICAgKiAgICAgXFxcIk9iamVjdFxcXCJ9IG1heSBoYXZlIGFuZCBob3cgZWFjaCBzdWNoIHByb3BlcnR5LCBpZiBwcmVzZW50LFxcbiAgICogICAgIGFuZCBpdHMgdmFsdWUgc2hvdWxkIGJlIHRhbWVkLlxcbiAgICogPGxpPnRydWUsIGluIHdoaWNoIGNhc2UgdGhpcyBwcm9wZXJ0eSBpcyBzaW1wbHkgd2hpdGVsaXN0ZWQuIFRoZVxcbiAgICogICAgIHZhbHVlIGFzc29jaWF0ZWQgd2l0aCB0aGF0IHByb3BlcnR5IGlzIHN0aWxsIHRyYXZlcnNlZCBhbmRcXG4gICAqICAgICB0YW1lZCwgYnV0IG9ubHkgYWNjb3JkaW5nIHRvIHRoZSB0YW1pbmcgb2YgdGhlIG9iamVjdHMgdGhhdFxcbiAgICogICAgIG9iamVjdCBpbmhlcml0cyBmcm9tLiBGb3IgZXhhbXBsZSwge0Bjb2RlIFxcXCJPYmplY3QuZnJlZXplXFxcIn0gbGVhZHNcXG4gICAqICAgICB0byB0cnVlLCBtZWFuaW5nIHRoYXQgdGhlIHtAY29kZSBcXFwiZnJlZXplXFxcIn0gcHJvcGVydHkgb2Yge0Bjb2RlXFxuICAgKiAgICAgT2JqZWN0fSBzaG91bGQgYmUgd2hpdGVsaXN0ZWQgYW5kIHRoZSB2YWx1ZSBvZiB0aGUgcHJvcGVydHkgKGFcXG4gICAqICAgICBmdW5jdGlvbikgc2hvdWxkIGJlIGZ1cnRoZXIgdGFtZWQgb25seSBhY2NvcmRpbmcgdG8gdGhlXFxuICAgKiAgICAgbWFya2luZ3Mgb2YgdGhlIG90aGVyIG9iamVjdHMgaXQgaW5oZXJpdHMgZnJvbSwgbGlrZSB7QGNvZGVcXG4gICAqICAgICBcXFwiRnVuY3Rpb24ucHJvdG90eXBlXFxcIn0gYW5kIHtAY29kZSBcXFwiT2JqZWN0LnByb3RvdHlwZVxcXCIpLlxcbiAgICogICAgIElmIHRoZSBwcm9wZXJ0eSBpcyBhbiBhY2Nlc3NvciBwcm9wZXJ0eSwgaXQgaXMgbm90XFxuICAgKiAgICAgd2hpdGVsaXN0ZWQgKGFzIGludm9raW5nIGFuIGFjY2Vzc29yIG1pZ2h0IG5vdCBiZSBtZWFuaW5nZnVsLFxcbiAgICogICAgIHlldCB0aGUgYWNjZXNzb3IgbWlnaHQgcmV0dXJuIGEgdmFsdWUgbmVlZGluZyB0YW1pbmcpLlxcbiAgICogPGxpPlxcXCJtYXliZUFjY2Vzc29yXFxcIiwgaW4gd2hpY2ggY2FzZSB0aGlzIGFjY2Vzc29yIHByb3BlcnR5IGlzIHNpbXBseVxcbiAgICogICAgIHdoaXRlbGlzdGVkIGFuZCBpdHMgZ2V0dGVyIGFuZC9vciBzZXR0ZXIgYXJlIHRhbWVkIGFjY29yZGluZyB0b1xcbiAgICogICAgIGluaGVyaXRhbmNlLiBJZiB0aGUgcHJvcGVydHkgaXMgbm90IGFuIGFjY2Vzc29yIHByb3BlcnR5LCBpdHNcXG4gICAqICAgICB2YWx1ZSBpcyB0YW1lZCBhY2NvcmRpbmcgdG8gaW5oZXJpdGFuY2UuXFxuICAgKiA8bGk+XFxcIipcXFwiLCBpbiB3aGljaCBjYXNlIHRoaXMgcHJvcGVydHkgb24gdGhpcyBvYmplY3QgaXMgd2hpdGVsaXN0ZWQsXFxuICAgKiAgICAgYXMgaXMgdGhpcyBwcm9wZXJ0eSBhcyBpbmhlcml0ZWQgYnkgYWxsIG9iamVjdHMgdGhhdCBpbmhlcml0XFxuICAgKiAgICAgZnJvbSB0aGlzIG9iamVjdC4gVGhlIHZhbHVlcyBhc3NvY2lhdGVkIHdpdGggYWxsIHN1Y2ggcHJvcGVydGllc1xcbiAgICogICAgIGFyZSBzdGlsbCB0cmF2ZXJzZWQgYW5kIHRhbWVkLCBidXQgb25seSBhY2NvcmRpbmcgdG8gdGhlIHRhbWluZ1xcbiAgICogICAgIG9mIHRoZSBvYmplY3RzIHRoYXQgb2JqZWN0IGluaGVyaXRzIGZyb20uIEZvciBleGFtcGxlLCB7QGNvZGVcXG4gICAqICAgICBcXFwiT2JqZWN0LnByb3RvdHlwZS5jb25zdHJ1Y3RvclxcXCJ9IGxlYWRzIHRvIFxcXCIqXFxcIiwgbWVhbmluZyB0aGF0IHdlXFxuICAgKiAgICAgd2hpdGVsaXN0IHRoZSB7QGNvZGUgXFxcImNvbnN0cnVjdG9yXFxcIn0gcHJvcGVydHkgb24ge0Bjb2RlXFxuICAgKiAgICAgT2JqZWN0LnByb3RvdHlwZX0gYW5kIG9uIGV2ZXJ5IG9iamVjdCB0aGF0IGluaGVyaXRzIGZyb20ge0Bjb2RlXFxuICAgKiAgICAgT2JqZWN0LnByb3RvdHlwZX0gdGhhdCBkb2VzIG5vdCBoYXZlIGEgY29uZmxpY3RpbmcgbWFyay4gRWFjaFxcbiAgICogICAgIG9mIHRoZXNlIGlzIHRhbWVkIGFzIGlmIHdpdGggdHJ1ZSwgc28gdGhhdCB0aGUgdmFsdWUgb2YgdGhlXFxuICAgKiAgICAgcHJvcGVydHkgaXMgZnVydGhlciB0YW1lZCBhY2NvcmRpbmcgdG8gd2hhdCBvdGhlciBvYmplY3RzIGl0XFxuICAgKiAgICAgaW5oZXJpdHMgZnJvbS5cXG4gICAqIDxsaT5mYWxzZSwgd2hpY2ggc3VwcHJlc3NlcyBwZXJtaXNzaW9uIGluaGVyaXRlZCB2aWEgXFxcIipcXFwiLlxcbiAgICogPC91bD5cXG4gICAqXFxuICAgKiA8cD5UT0RPOiBXZSB3YW50IHRvIGRvIGZvciBjb25zdHJ1Y3Rvcjogc29tZXRoaW5nIHdlYWtlciB0aGFuICcqJyxcXG4gICAqIGJ1dCByYXRoZXIgbW9yZSBsaWtlIHdoYXQgd2UgZG8gZm9yIFtbUHJvdG90eXBlXV0gbGlua3MsIHdoaWNoIGlzXFxuICAgKiB0aGF0IGl0IGlzIHdoaXRlbGlzdGVkIG9ubHkgaWYgaXQgcG9pbnRzIGF0IGFuIG9iamVjdCB3aGljaCBpc1xcbiAgICogb3RoZXJ3aXNlIHJlYWNoYWJsZSBieSBhIHdoaXRlbGlzdGVkIHBhdGguXFxuICAgKlxcbiAgICogPHA+VGhlIG1lbWJlcnMgb2YgdGhlIHdoaXRlbGlzdCBhcmUgZWl0aGVyXFxuICAgKiA8dWw+XFxuICAgKiA8bGk+KHVuY29tbWVudGVkKSBkZWZpbmVkIGJ5IHRoZSBFUzUuMSBub3JtYXRpdmUgc3RhbmRhcmQgdGV4dCxcXG4gICAqIDxsaT4ocXVlc3Rpb25hYmxlKSBwcm92aWRlcyBhIHNvdXJjZSBvZiBub24tZGV0ZXJtaW5pc20sIGluXFxuICAgKiAgICAgdmlvbGF0aW9uIG9mIHB1cmUgb2JqZWN0LWNhcGFiaWxpdHkgcnVsZXMsIGJ1dCBhbGxvd2VkIGFueXdheVxcbiAgICogICAgIHNpbmNlIHdlJ3ZlIGdpdmVuIHVwIG9uIHJlc3RyaWN0aW5nIEphdmFTY3JpcHQgdG8gYVxcbiAgICogICAgIGRldGVybWluaXN0aWMgc3Vic2V0LlxcbiAgICogPGxpPihFUzUgQXBwZW5kaXggQikgY29tbW9uIGVsZW1lbnRzIG9mIGRlIGZhY3RvIEphdmFTY3JpcHRcXG4gICAqICAgICBkZXNjcmliZWQgYnkgdGhlIG5vbi1ub3JtYXRpdmUgQXBwZW5kaXggQi5cXG4gICAqIDxsaT4oSGFybWxlc3Mgd2hhdHdnKSBleHRlbnNpb25zIGRvY3VtZW50ZWQgYXRcXG4gICAqICAgICA8YSBocmVmPVxcXCJodHRwOi8vd2lraS53aGF0d2cub3JnL3dpa2kvV2ViX0VDTUFTY3JpcHRcXFwiXFxuICAgKiAgICAgPmh0dHA6Ly93aWtpLndoYXR3Zy5vcmcvd2lraS9XZWJfRUNNQVNjcmlwdDwvYT4gdGhhdCBzZWVtIHRvIGJlXFxuICAgKiAgICAgaGFybWxlc3MuIE5vdGUgdGhhdCB0aGUgUmVnRXhwIGNvbnN0cnVjdG9yIGV4dGVuc2lvbnMgb24gdGhhdFxcbiAgICogICAgIHBhZ2UgYXJlIDxiPm5vdCBoYXJtbGVzczwvYj4gYW5kIHNvIG11c3Qgbm90IGJlIHdoaXRlbGlzdGVkLlxcbiAgICogPGxpPihFUy1IYXJtb255IHByb3Bvc2FsKSBhY2NlcHRlZCBhcyBcXFwicHJvcG9zYWxcXFwiIHN0YXR1cyBmb3JcXG4gICAqICAgICBFY21hU2NyaXB0LUhhcm1vbnkuXFxuICAgKiA8L3VsPlxcbiAgICpcXG4gICAqIDxwPldpdGggdGhlIGFib3ZlIGVuY29kaW5nLCB0aGVyZSBhcmUgc29tZSBzZW5zaWJsZSB3aGl0ZWxpc3RzIHdlXFxuICAgKiBjYW5ub3QgZXhwcmVzcywgc3VjaCBhcyBtYXJraW5nIGEgcHJvcGVydHkgYm90aCB3aXRoIFxcXCIqXFxcIiBhbmQgYSBKU09OXFxuICAgKiByZWNvcmQuIFRoaXMgaXMgYW4gZXhwZWRpZW50IGRlY2lzaW9uIGJhc2VkIG9ubHkgb24gbm90IGhhdmluZ1xcbiAgICogZW5jb3VudGVyZWQgc3VjaCBhIG5lZWQuIFNob3VsZCB3ZSBuZWVkIHRoaXMgZXh0cmEgZXhwcmVzc2l2ZW5lc3MsXFxuICAgKiB3ZSdsbCBuZWVkIHRvIHJlZmFjdG9yIHRvIGVuYWJsZSBhIGRpZmZlcmVudCBlbmNvZGluZy5cXG4gICAqXFxuICAgKiA8cD5XZSBmYWN0b3Igb3V0IHtAY29kZSB0cnVlfSBpbnRvIHRoZSB2YXJpYWJsZSB7QGNvZGUgdH0ganVzdCB0b1xcbiAgICogZ2V0IGEgYml0IGJldHRlciBjb21wcmVzc2lvbiBmcm9tIHNpbXBsZSBtaW5pZmllcnMuXFxuICAgKi9cXG5cXG4gIGNvbnN0IHQgPSB0cnVlO1xcbiAgY29uc3QgaiA9IHRydWU7IC8vIGluY2x1ZGVkIGluIHRoZSBKZXNzaWUgcnVudGltZVxcblxcbiAgbGV0IFR5cGVkQXJyYXlXaGl0ZWxpc3Q7IC8vIGRlZmluZWQgYW5kIHVzZWQgYmVsb3dcXG5cXG4gIHZhciB3aGl0ZWxpc3QgPSB7XFxuICAgIC8vIFRoZSBhY2Nlc3NpYmxlIGludHJpbnNpY3Mgd2hpY2ggYXJlIG5vdCByZWFjaGFibGUgYnkgb3duXFxuICAgIC8vIHByb3BlcnR5IG5hbWUgdHJhdmVyc2FsIGFyZSBsaXN0ZWQgaGVyZSBzbyB0aGF0IHRoZXkgYXJlXFxuICAgIC8vIHByb2Nlc3NlZCBieSB0aGUgd2hpdGVsaXN0LCBhbHRob3VnaCB0aGlzIGFsc28gbWFrZXMgdGhlbVxcbiAgICAvLyBhY2Nlc3NpYmxlIGJ5IHRoaXMgcGF0aC4gIFNlZVxcbiAgICAvLyBodHRwczovL3Blb3BsZS5tb3ppbGxhLm9yZy9+am9yZW5kb3JmZi9lczYtZHJhZnQuaHRtbCNzZWMtd2VsbC1rbm93bi1pbnRyaW5zaWMtb2JqZWN0c1xcbiAgICAvLyBPZiB0aGVzZSwgVGhyb3dUeXBlRXJyb3IgaXMgdGhlIG9ubHkgb25lIGZyb20gRVM1LiBBbGwgdGhlXFxuICAgIC8vIHJlc3Qgd2VyZSBpbnRyb2R1Y2VkIGluIEVTNi5cXG4gICAgYW5vbkludHJpbnNpY3M6IHtcXG4gICAgICBUaHJvd1R5cGVFcnJvcjoge30sXFxuICAgICAgSXRlcmF0b3JQcm90b3R5cGU6IHtcXG4gICAgICAgIC8vIDI1LjFcXG4gICAgICAgIC8vIFRlY2huaWNhbGx5LCBmb3IgU0VTLW9uLUVTNSwgd2Ugc2hvdWxkIG5vdCBuZWVkIHRvXFxuICAgICAgICAvLyB3aGl0ZWxpc3QgJ25leHQnLiBIb3dldmVyLCBicm93c2VycyBhcmUgYWNjaWRlbnRhbGx5XFxuICAgICAgICAvLyByZWx5aW5nIG9uIGl0XFxuICAgICAgICAvLyBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvdjgvaXNzdWVzL2RldGFpbD9pZD00NzY5I1xcbiAgICAgICAgLy8gaHR0cHM6Ly9idWdzLndlYmtpdC5vcmcvc2hvd19idWcuY2dpP2lkPTE1NDQ3NVxcbiAgICAgICAgLy8gYW5kIHdlIHdpbGwgYmUgd2hpdGVsaXN0aW5nIGl0IGFzIHdlIHRyYW5zaXRpb24gdG8gRVM2XFxuICAgICAgICAvLyBhbnl3YXksIHNvIHdlIHVuY29uZGl0aW9uYWxseSB3aGl0ZWxpc3QgaXQgbm93LlxcbiAgICAgICAgbmV4dDogJyonLFxcbiAgICAgICAgY29uc3RydWN0b3I6IGZhbHNlLFxcbiAgICAgIH0sXFxuICAgICAgQXJyYXlJdGVyYXRvclByb3RvdHlwZToge30sXFxuICAgICAgU3RyaW5nSXRlcmF0b3JQcm90b3R5cGU6IHt9LFxcbiAgICAgIE1hcEl0ZXJhdG9yUHJvdG90eXBlOiB7fSxcXG4gICAgICBTZXRJdGVyYXRvclByb3RvdHlwZToge30sXFxuICAgICAgLy8gQXN5bmNJdGVyYXRvclByb3RvdHlwZSBkb2VzIG5vdCBpbmhlcml0IGZyb20gSXRlcmF0b3JQcm90b3R5cGVcXG4gICAgICBBc3luY0l0ZXJhdG9yUHJvdG90eXBlOiB7fSxcXG5cXG4gICAgICAvLyBUaGUgJUdlbmVyYXRvckZ1bmN0aW9uJSBpbnRyaW5zaWMgaXMgdGhlIGNvbnN0cnVjdG9yIG9mXFxuICAgICAgLy8gZ2VuZXJhdG9yIGZ1bmN0aW9ucywgc28gJUdlbmVyYXRvckZ1bmN0aW9uJS5wcm90b3R5cGUgaXNcXG4gICAgICAvLyB0aGUgJUdlbmVyYXRvciUgaW50cmluc2ljLCB3aGljaCBhbGwgZ2VuZXJhdG9yIGZ1bmN0aW9uc1xcbiAgICAgIC8vIGluaGVyaXQgZnJvbS4gQSBnZW5lcmF0b3IgZnVuY3Rpb24gaXMgZWZmZWN0aXZlbHkgdGhlXFxuICAgICAgLy8gY29uc3RydWN0b3Igb2YgaXRzIGdlbmVyYXRvciBpbnN0YW5jZXMsIHNvLCBmb3IgZWFjaFxcbiAgICAgIC8vIGdlbmVyYXRvciBmdW5jdGlvbiAoZS5nLiwgXFxcImcxXFxcIiBvbiB0aGUgZGlhZ3JhbSBhdFxcbiAgICAgIC8vIGh0dHA6Ly9wZW9wbGUubW96aWxsYS5vcmcvfmpvcmVuZG9yZmYvZmlndXJlLTIucG5nIClcXG4gICAgICAvLyBpdHMgLnByb3RvdHlwZSBpcyBhIHByb3RvdHlwZSB0aGF0IGl0cyBpbnN0YW5jZXMgaW5oZXJpdFxcbiAgICAgIC8vIGZyb20uIFBhcmFsbGVsaW5nIHRoaXMgc3RydWN0dXJlLCAlR2VuZXJhdG9yJS5wcm90b3R5cGUsXFxuICAgICAgLy8gaS5lLiwgJUdlbmVyYXRvckZ1bmN0aW9uJS5wcm90b3R5cGUucHJvdG90eXBlLCBpcyB0aGVcXG4gICAgICAvLyBvYmplY3QgdGhhdCBhbGwgdGhlc2UgZ2VuZXJhdG9yIGZ1bmN0aW9uIHByb3RvdHlwZXMgaW5oZXJpdFxcbiAgICAgIC8vIGZyb20uIFRoZSAubmV4dCwgLnJldHVybiBhbmQgLnRocm93IHRoYXQgZ2VuZXJhdG9yXFxuICAgICAgLy8gaW5zdGFuY2VzIHJlc3BvbmQgdG8gYXJlIGFjdHVhbGx5IHRoZSBidWlsdGluIG1ldGhvZHMgdGhleVxcbiAgICAgIC8vIGluaGVyaXQgZnJvbSB0aGlzIG9iamVjdC5cXG4gICAgICBHZW5lcmF0b3JGdW5jdGlvbjoge1xcbiAgICAgICAgLy8gMjUuMlxcbiAgICAgICAgbGVuZ3RoOiAnKicsIC8vIE5vdCBzdXJlIHdoeSB0aGlzIGlzIG5lZWRlZFxcbiAgICAgICAgcHJvdG90eXBlOiB7XFxuICAgICAgICAgIC8vIDI1LjRcXG4gICAgICAgICAgcHJvdG90eXBlOiB7XFxuICAgICAgICAgICAgbmV4dDogJyonLFxcbiAgICAgICAgICAgIHJldHVybjogJyonLFxcbiAgICAgICAgICAgIHRocm93OiAnKicsXFxuICAgICAgICAgICAgY29uc3RydWN0b3I6ICcqJywgLy8gTm90IHN1cmUgd2h5IHRoaXMgaXMgbmVlZGVkXFxuICAgICAgICAgIH0sXFxuICAgICAgICB9LFxcbiAgICAgIH0sXFxuICAgICAgQXN5bmNHZW5lcmF0b3JGdW5jdGlvbjoge1xcbiAgICAgICAgLy8gMjUuM1xcbiAgICAgICAgbGVuZ3RoOiAnKicsXFxuICAgICAgICBwcm90b3R5cGU6IHtcXG4gICAgICAgICAgLy8gMjUuNVxcbiAgICAgICAgICBwcm90b3R5cGU6IHtcXG4gICAgICAgICAgICBuZXh0OiAnKicsXFxuICAgICAgICAgICAgcmV0dXJuOiAnKicsXFxuICAgICAgICAgICAgdGhyb3c6ICcqJyxcXG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogJyonLCAvLyBOb3Qgc3VyZSB3aHkgdGhpcyBpcyBuZWVkZWRcXG4gICAgICAgICAgfSxcXG4gICAgICAgIH0sXFxuICAgICAgfSxcXG4gICAgICBBc3luY0Z1bmN0aW9uOiB7XFxuICAgICAgICAvLyAyNS43XFxuICAgICAgICBsZW5ndGg6ICcqJyxcXG4gICAgICAgIHByb3RvdHlwZTogJyonLFxcbiAgICAgIH0sXFxuXFxuICAgICAgVHlwZWRBcnJheTogKFR5cGVkQXJyYXlXaGl0ZWxpc3QgPSB7XFxuICAgICAgICAvLyAyMi4yXFxuICAgICAgICBsZW5ndGg6ICcqJywgLy8gZG9lcyBub3QgaW5oZXJpdCBmcm9tIEZ1bmN0aW9uLnByb3RvdHlwZSBvbiBDaHJvbWVcXG4gICAgICAgIG5hbWU6ICcqJywgLy8gZGl0dG9cXG4gICAgICAgIGZyb206IHQsXFxuICAgICAgICBvZjogdCxcXG4gICAgICAgIEJZVEVTX1BFUl9FTEVNRU5UOiAnKicsXFxuICAgICAgICBwcm90b3R5cGU6IHtcXG4gICAgICAgICAgYnVmZmVyOiAnbWF5YmVBY2Nlc3NvcicsXFxuICAgICAgICAgIGJ5dGVMZW5ndGg6ICdtYXliZUFjY2Vzc29yJyxcXG4gICAgICAgICAgYnl0ZU9mZnNldDogJ21heWJlQWNjZXNzb3InLFxcbiAgICAgICAgICBjb3B5V2l0aGluOiAnKicsXFxuICAgICAgICAgIGVudHJpZXM6ICcqJyxcXG4gICAgICAgICAgZXZlcnk6ICcqJyxcXG4gICAgICAgICAgZmlsbDogJyonLFxcbiAgICAgICAgICBmaWx0ZXI6ICcqJyxcXG4gICAgICAgICAgZmluZDogJyonLFxcbiAgICAgICAgICBmaW5kSW5kZXg6ICcqJyxcXG4gICAgICAgICAgZm9yRWFjaDogJyonLFxcbiAgICAgICAgICBpbmNsdWRlczogJyonLFxcbiAgICAgICAgICBpbmRleE9mOiAnKicsXFxuICAgICAgICAgIGpvaW46ICcqJyxcXG4gICAgICAgICAga2V5czogJyonLFxcbiAgICAgICAgICBsYXN0SW5kZXhPZjogJyonLFxcbiAgICAgICAgICBsZW5ndGg6ICdtYXliZUFjY2Vzc29yJyxcXG4gICAgICAgICAgbWFwOiAnKicsXFxuICAgICAgICAgIHJlZHVjZTogJyonLFxcbiAgICAgICAgICByZWR1Y2VSaWdodDogJyonLFxcbiAgICAgICAgICByZXZlcnNlOiAnKicsXFxuICAgICAgICAgIHNldDogJyonLFxcbiAgICAgICAgICBzbGljZTogJyonLFxcbiAgICAgICAgICBzb21lOiAnKicsXFxuICAgICAgICAgIHNvcnQ6ICcqJyxcXG4gICAgICAgICAgc3ViYXJyYXk6ICcqJyxcXG4gICAgICAgICAgdmFsdWVzOiAnKicsXFxuICAgICAgICAgIEJZVEVTX1BFUl9FTEVNRU5UOiAnKicsXFxuICAgICAgICB9LFxcbiAgICAgIH0pLFxcbiAgICB9LFxcblxcbiAgICBuYW1lZEludHJpbnNpY3M6IHtcXG4gICAgICAvLyBJbiBvcmRlciBhY2NvcmRpbmcgdG9cXG4gICAgICAvLyBodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvIHdpdGggY2hhcHRlclxcbiAgICAgIC8vIG51bWJlcnMgd2hlcmUgYXBwbGljYWJsZVxcblxcbiAgICAgIC8vIDE4IFRoZSBHbG9iYWwgT2JqZWN0XFxuXFxuICAgICAgLy8gMTguMVxcbiAgICAgIEluZmluaXR5OiBqLFxcbiAgICAgIE5hTjogaixcXG4gICAgICB1bmRlZmluZWQ6IGosXFxuXFxuICAgICAgLy8gMTguMlxcbiAgICAgIGV2YWw6IGosIC8vIHJlYWxtcy1zaGltIGRlcGVuZHMgb24gaGF2aW5nIGluZGlyZWN0IGV2YWwgaW4gdGhlIGdsb2JhbHNcXG4gICAgICBpc0Zpbml0ZTogdCxcXG4gICAgICBpc05hTjogdCxcXG4gICAgICBwYXJzZUZsb2F0OiB0LFxcbiAgICAgIHBhcnNlSW50OiB0LFxcbiAgICAgIGRlY29kZVVSSTogdCxcXG4gICAgICBkZWNvZGVVUklDb21wb25lbnQ6IHQsXFxuICAgICAgZW5jb2RlVVJJOiB0LFxcbiAgICAgIGVuY29kZVVSSUNvbXBvbmVudDogdCxcXG5cXG4gICAgICAvLyAxOSBGdW5kYW1lbnRhbCBPYmplY3RzXFxuXFxuICAgICAgT2JqZWN0OiB7XFxuICAgICAgICAvLyAxOS4xXFxuICAgICAgICBhc3NpZ246IHQsIC8vIEVTLUhhcm1vbnlcXG4gICAgICAgIGNyZWF0ZTogdCxcXG4gICAgICAgIGRlZmluZVByb3BlcnRpZXM6IHQsIC8vIEVTLUhhcm1vbnlcXG4gICAgICAgIGRlZmluZVByb3BlcnR5OiB0LFxcbiAgICAgICAgZW50cmllczogdCwgLy8gRVMtSGFybW9ueVxcbiAgICAgICAgZnJlZXplOiBqLFxcbiAgICAgICAgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yOiB0LFxcbiAgICAgICAgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yczogdCwgLy8gcHJvcG9zZWQgRVMtSGFybW9ueVxcbiAgICAgICAgZ2V0T3duUHJvcGVydHlOYW1lczogdCxcXG4gICAgICAgIGdldE93blByb3BlcnR5U3ltYm9sczogdCwgLy8gRVMtSGFybW9ueVxcbiAgICAgICAgZ2V0UHJvdG90eXBlT2Y6IHQsXFxuICAgICAgICBpczogaiwgLy8gRVMtSGFybW9ueVxcbiAgICAgICAgaXNFeHRlbnNpYmxlOiB0LFxcbiAgICAgICAgaXNGcm96ZW46IHQsXFxuICAgICAgICBpc1NlYWxlZDogdCxcXG4gICAgICAgIGtleXM6IHQsXFxuICAgICAgICBwcmV2ZW50RXh0ZW5zaW9uczogaixcXG4gICAgICAgIHNlYWw6IGosXFxuICAgICAgICBzZXRQcm90b3R5cGVPZjogdCwgLy8gRVMtSGFybW9ueVxcbiAgICAgICAgdmFsdWVzOiB0LCAvLyBFUy1IYXJtb255XFxuXFxuICAgICAgICBwcm90b3R5cGU6IHtcXG4gICAgICAgICAgLy8gQi4yLjJcXG4gICAgICAgICAgLy8gV2UgbmVlZCB0byBwcmVmaXggX19wcm90b19fIHdpdGggRVNDQVBFIHNvIHRoYXQgaXQgZG9lc24ndFxcbiAgICAgICAgICAvLyBqdXN0IGNoYW5nZSB0aGUgcHJvdG90eXBlIG9mIHRoaXMgb2JqZWN0LlxcbiAgICAgICAgICBFU0NBUEVfX3Byb3RvX186ICdtYXliZUFjY2Vzc29yJyxcXG4gICAgICAgICAgX19kZWZpbmVHZXR0ZXJfXzogdCxcXG4gICAgICAgICAgX19kZWZpbmVTZXR0ZXJfXzogdCxcXG4gICAgICAgICAgX19sb29rdXBHZXR0ZXJfXzogdCxcXG4gICAgICAgICAgX19sb29rdXBTZXR0ZXJfXzogdCxcXG5cXG4gICAgICAgICAgY29uc3RydWN0b3I6ICcqJyxcXG4gICAgICAgICAgaGFzT3duUHJvcGVydHk6IHQsXFxuICAgICAgICAgIGlzUHJvdG90eXBlT2Y6IHQsXFxuICAgICAgICAgIHByb3BlcnR5SXNFbnVtZXJhYmxlOiB0LFxcbiAgICAgICAgICB0b0xvY2FsZVN0cmluZzogJyonLFxcbiAgICAgICAgICB0b1N0cmluZzogJyonLFxcbiAgICAgICAgICB2YWx1ZU9mOiAnKicsXFxuXFxuICAgICAgICAgIC8vIEdlbmVyYWxseSBhbGxvd2VkXFxuICAgICAgICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAnKicsXFxuICAgICAgICAgIFtTeW1ib2wudG9QcmltaXRpdmVdOiAnKicsXFxuICAgICAgICAgIFtTeW1ib2wudG9TdHJpbmdUYWddOiAnKicsXFxuICAgICAgICAgIFtTeW1ib2wudW5zY29wYWJsZXNdOiAnKicsXFxuICAgICAgICB9LFxcbiAgICAgIH0sXFxuXFxuICAgICAgRnVuY3Rpb246IHtcXG4gICAgICAgIC8vIDE5LjJcXG4gICAgICAgIGxlbmd0aDogdCxcXG4gICAgICAgIHByb3RvdHlwZToge1xcbiAgICAgICAgICBhcHBseTogdCxcXG4gICAgICAgICAgYmluZDogdCxcXG4gICAgICAgICAgY2FsbDogdCxcXG4gICAgICAgICAgW1N5bWJvbC5oYXNJbnN0YW5jZV06ICcqJyxcXG5cXG4gICAgICAgICAgLy8gMTkuMi40IGluc3RhbmNlc1xcbiAgICAgICAgICBsZW5ndGg6ICcqJyxcXG4gICAgICAgICAgbmFtZTogJyonLCAvLyBFUy1IYXJtb255XFxuICAgICAgICAgIHByb3RvdHlwZTogJyonLFxcbiAgICAgICAgICBhcml0eTogJyonLCAvLyBub24tc3RkLCBkZXByZWNhdGVkIGluIGZhdm9yIG9mIGxlbmd0aFxcblxcbiAgICAgICAgICAvLyBHZW5lcmFsbHkgYWxsb3dlZFxcbiAgICAgICAgICBbU3ltYm9sLnNwZWNpZXNdOiAnbWF5YmVBY2Nlc3NvcicsIC8vIEVTLUhhcm1vbnk/XFxuICAgICAgICB9LFxcbiAgICAgIH0sXFxuXFxuICAgICAgQm9vbGVhbjoge1xcbiAgICAgICAgLy8gMTkuM1xcbiAgICAgICAgcHJvdG90eXBlOiB0LFxcbiAgICAgIH0sXFxuXFxuICAgICAgU3ltYm9sOiB7XFxuICAgICAgICAvLyAxOS40ICAgICAgICAgICAgICAgYWxsIEVTLUhhcm1vbnlcXG4gICAgICAgIGFzeW5jSXRlcmF0b3I6IHQsIC8vIHByb3Bvc2VkPyBFUy1IYXJtb255XFxuICAgICAgICBmb3I6IHQsXFxuICAgICAgICBoYXNJbnN0YW5jZTogdCxcXG4gICAgICAgIGlzQ29uY2F0U3ByZWFkYWJsZTogdCxcXG4gICAgICAgIGl0ZXJhdG9yOiB0LFxcbiAgICAgICAga2V5Rm9yOiB0LFxcbiAgICAgICAgbWF0Y2g6IHQsXFxuICAgICAgICBtYXRjaEFsbDogdCxcXG4gICAgICAgIHJlcGxhY2U6IHQsXFxuICAgICAgICBzZWFyY2g6IHQsXFxuICAgICAgICBzcGVjaWVzOiB0LFxcbiAgICAgICAgc3BsaXQ6IHQsXFxuICAgICAgICB0b1ByaW1pdGl2ZTogdCxcXG4gICAgICAgIHRvU3RyaW5nVGFnOiB0LFxcbiAgICAgICAgdW5zY29wYWJsZXM6IHQsXFxuICAgICAgICBwcm90b3R5cGU6IHQsXFxuICAgICAgfSxcXG5cXG4gICAgICBFcnJvcjoge1xcbiAgICAgICAgLy8gMTkuNVxcbiAgICAgICAgcHJvdG90eXBlOiB7XFxuICAgICAgICAgIG5hbWU6ICcqJyxcXG4gICAgICAgICAgbWVzc2FnZTogJyonLFxcbiAgICAgICAgfSxcXG4gICAgICB9LFxcbiAgICAgIC8vIEluIEVTNiB0aGUgKkVycm9yIFxcXCJzdWJjbGFzc2VzXFxcIiBvZiBFcnJvciBpbmhlcml0IGZyb20gRXJyb3IsXFxuICAgICAgLy8gc2luY2UgY29uc3RydWN0b3IgaW5oZXJpdGFuY2UgZ2VuZXJhbGx5IG1pcnJvcnMgcHJvdG90eXBlXFxuICAgICAgLy8gaW5oZXJpdGFuY2UuIEFzIGV4cGxhaW5lZCBhdFxcbiAgICAgIC8vIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvZ29vZ2xlLWNhamEvaXNzdWVzL2RldGFpbD9pZD0xOTYzICxcXG4gICAgICAvLyBkZWJ1Zy5qcyBoaWRlcyBhd2F5IHRoZSBFcnJvciBjb25zdHJ1Y3RvciBpdHNlbGYsIGFuZCBzbyBuZWVkc1xcbiAgICAgIC8vIHRvIHJld2lyZSB0aGVzZSBcXFwic3ViY2xhc3NcXFwiIGNvbnN0cnVjdG9ycy4gVW50aWwgd2UgaGF2ZSBhIG1vcmVcXG4gICAgICAvLyBnZW5lcmFsIG1lY2hhbmlzbSwgcGxlYXNlIG1haW50YWluIHRoaXMgbGlzdCBvZiB3aGl0ZWxpc3RlZFxcbiAgICAgIC8vIHN1YmNsYXNzZXMgaW4gc3luYyB3aXRoIHRoZSBsaXN0IGluIGRlYnVnLmpzIG9mIHN1YmNsYXNzZXMgdG9cXG4gICAgICAvLyBiZSByZXdpcmVkLlxcbiAgICAgIEV2YWxFcnJvcjoge1xcbiAgICAgICAgcHJvdG90eXBlOiB0LFxcbiAgICAgIH0sXFxuICAgICAgUmFuZ2VFcnJvcjoge1xcbiAgICAgICAgcHJvdG90eXBlOiB0LFxcbiAgICAgIH0sXFxuICAgICAgUmVmZXJlbmNlRXJyb3I6IHtcXG4gICAgICAgIHByb3RvdHlwZTogdCxcXG4gICAgICB9LFxcbiAgICAgIFN5bnRheEVycm9yOiB7XFxuICAgICAgICBwcm90b3R5cGU6IHQsXFxuICAgICAgfSxcXG4gICAgICBUeXBlRXJyb3I6IHtcXG4gICAgICAgIHByb3RvdHlwZTogdCxcXG4gICAgICB9LFxcbiAgICAgIFVSSUVycm9yOiB7XFxuICAgICAgICBwcm90b3R5cGU6IHQsXFxuICAgICAgfSxcXG5cXG4gICAgICAvLyAyMCBOdW1iZXJzIGFuZCBEYXRlc1xcblxcbiAgICAgIE51bWJlcjoge1xcbiAgICAgICAgLy8gMjAuMVxcbiAgICAgICAgRVBTSUxPTjogdCwgLy8gRVMtSGFybW9ueVxcbiAgICAgICAgaXNGaW5pdGU6IGosIC8vIEVTLUhhcm1vbnlcXG4gICAgICAgIGlzSW50ZWdlcjogdCwgLy8gRVMtSGFybW9ueVxcbiAgICAgICAgaXNOYU46IGosIC8vIEVTLUhhcm1vbnlcXG4gICAgICAgIGlzU2FmZUludGVnZXI6IGosIC8vIEVTLUhhcm1vbnlcXG4gICAgICAgIE1BWF9TQUZFX0lOVEVHRVI6IGosIC8vIEVTLUhhcm1vbnlcXG4gICAgICAgIE1BWF9WQUxVRTogdCxcXG4gICAgICAgIE1JTl9TQUZFX0lOVEVHRVI6IGosIC8vIEVTLUhhcm1vbnlcXG4gICAgICAgIE1JTl9WQUxVRTogdCxcXG4gICAgICAgIE5hTjogdCxcXG4gICAgICAgIE5FR0FUSVZFX0lORklOSVRZOiB0LFxcbiAgICAgICAgcGFyc2VGbG9hdDogdCwgLy8gRVMtSGFybW9ueVxcbiAgICAgICAgcGFyc2VJbnQ6IHQsIC8vIEVTLUhhcm1vbnlcXG4gICAgICAgIFBPU0lUSVZFX0lORklOSVRZOiB0LFxcbiAgICAgICAgcHJvdG90eXBlOiB7XFxuICAgICAgICAgIHRvRXhwb25lbnRpYWw6IHQsXFxuICAgICAgICAgIHRvRml4ZWQ6IHQsXFxuICAgICAgICAgIHRvUHJlY2lzaW9uOiB0LFxcbiAgICAgICAgfSxcXG4gICAgICB9LFxcblxcbiAgICAgIE1hdGg6IHtcXG4gICAgICAgIC8vIDIwLjJcXG4gICAgICAgIEU6IGosXFxuICAgICAgICBMTjEwOiBqLFxcbiAgICAgICAgTE4yOiBqLFxcbiAgICAgICAgTE9HMTBFOiB0LFxcbiAgICAgICAgTE9HMkU6IHQsXFxuICAgICAgICBQSTogaixcXG4gICAgICAgIFNRUlQxXzI6IHQsXFxuICAgICAgICBTUVJUMjogdCxcXG5cXG4gICAgICAgIGFiczogaixcXG4gICAgICAgIGFjb3M6IHQsXFxuICAgICAgICBhY29zaDogdCwgLy8gRVMtSGFybW9ueVxcbiAgICAgICAgYXNpbjogdCxcXG4gICAgICAgIGFzaW5oOiB0LCAvLyBFUy1IYXJtb255XFxuICAgICAgICBhdGFuOiB0LFxcbiAgICAgICAgYXRhbmg6IHQsIC8vIEVTLUhhcm1vbnlcXG4gICAgICAgIGF0YW4yOiB0LFxcbiAgICAgICAgY2JydDogdCwgLy8gRVMtSGFybW9ueVxcbiAgICAgICAgY2VpbDogaixcXG4gICAgICAgIGNsejMyOiB0LCAvLyBFUy1IYXJtb255XFxuICAgICAgICBjb3M6IHQsXFxuICAgICAgICBjb3NoOiB0LCAvLyBFUy1IYXJtb255XFxuICAgICAgICBleHA6IHQsXFxuICAgICAgICBleHBtMTogdCwgLy8gRVMtSGFybW9ueVxcbiAgICAgICAgZmxvb3I6IGosXFxuICAgICAgICBmcm91bmQ6IHQsIC8vIEVTLUhhcm1vbnlcXG4gICAgICAgIGh5cG90OiB0LCAvLyBFUy1IYXJtb255XFxuICAgICAgICBpbXVsOiB0LCAvLyBFUy1IYXJtb255XFxuICAgICAgICBsb2c6IGosXFxuICAgICAgICBsb2cxcDogdCwgLy8gRVMtSGFybW9ueVxcbiAgICAgICAgbG9nMTA6IGosIC8vIEVTLUhhcm1vbnlcXG4gICAgICAgIGxvZzI6IGosIC8vIEVTLUhhcm1vbnlcXG4gICAgICAgIG1heDogaixcXG4gICAgICAgIG1pbjogaixcXG4gICAgICAgIHBvdzogaixcXG4gICAgICAgIHJhbmRvbTogdCwgLy8gcXVlc3Rpb25hYmxlXFxuICAgICAgICByb3VuZDogaixcXG4gICAgICAgIHNpZ246IHQsIC8vIEVTLUhhcm1vbnlcXG4gICAgICAgIHNpbjogdCxcXG4gICAgICAgIHNpbmg6IHQsIC8vIEVTLUhhcm1vbnlcXG4gICAgICAgIHNxcnQ6IGosXFxuICAgICAgICB0YW46IHQsXFxuICAgICAgICB0YW5oOiB0LCAvLyBFUy1IYXJtb255XFxuICAgICAgICB0cnVuYzogaiwgLy8gRVMtSGFybW9ueVxcbiAgICAgIH0sXFxuXFxuICAgICAgLy8gbm8tYXJnIERhdGUgY29uc3RydWN0b3IgaXMgcXVlc3Rpb25hYmxlXFxuICAgICAgRGF0ZToge1xcbiAgICAgICAgLy8gMjAuM1xcbiAgICAgICAgbm93OiB0LCAvLyBxdWVzdGlvbmFibGVcXG4gICAgICAgIHBhcnNlOiB0LFxcbiAgICAgICAgVVRDOiB0LFxcbiAgICAgICAgcHJvdG90eXBlOiB7XFxuICAgICAgICAgIC8vIE5vdGU6IGNvb3JkaW5hdGUgdGhpcyBsaXN0IHdpdGggbWFpbnRhbmVuY2Ugb2YgcmVwYWlyRVM1LmpzXFxuICAgICAgICAgIGdldERhdGU6IHQsXFxuICAgICAgICAgIGdldERheTogdCxcXG4gICAgICAgICAgZ2V0RnVsbFllYXI6IHQsXFxuICAgICAgICAgIGdldEhvdXJzOiB0LFxcbiAgICAgICAgICBnZXRNaWxsaXNlY29uZHM6IHQsXFxuICAgICAgICAgIGdldE1pbnV0ZXM6IHQsXFxuICAgICAgICAgIGdldE1vbnRoOiB0LFxcbiAgICAgICAgICBnZXRTZWNvbmRzOiB0LFxcbiAgICAgICAgICBnZXRUaW1lOiB0LFxcbiAgICAgICAgICBnZXRUaW1lem9uZU9mZnNldDogdCxcXG4gICAgICAgICAgZ2V0VVRDRGF0ZTogdCxcXG4gICAgICAgICAgZ2V0VVRDRGF5OiB0LFxcbiAgICAgICAgICBnZXRVVENGdWxsWWVhcjogdCxcXG4gICAgICAgICAgZ2V0VVRDSG91cnM6IHQsXFxuICAgICAgICAgIGdldFVUQ01pbGxpc2Vjb25kczogdCxcXG4gICAgICAgICAgZ2V0VVRDTWludXRlczogdCxcXG4gICAgICAgICAgZ2V0VVRDTW9udGg6IHQsXFxuICAgICAgICAgIGdldFVUQ1NlY29uZHM6IHQsXFxuICAgICAgICAgIHNldERhdGU6IHQsXFxuICAgICAgICAgIHNldEZ1bGxZZWFyOiB0LFxcbiAgICAgICAgICBzZXRIb3VyczogdCxcXG4gICAgICAgICAgc2V0TWlsbGlzZWNvbmRzOiB0LFxcbiAgICAgICAgICBzZXRNaW51dGVzOiB0LFxcbiAgICAgICAgICBzZXRNb250aDogdCxcXG4gICAgICAgICAgc2V0U2Vjb25kczogdCxcXG4gICAgICAgICAgc2V0VGltZTogdCxcXG4gICAgICAgICAgc2V0VVRDRGF0ZTogdCxcXG4gICAgICAgICAgc2V0VVRDRnVsbFllYXI6IHQsXFxuICAgICAgICAgIHNldFVUQ0hvdXJzOiB0LFxcbiAgICAgICAgICBzZXRVVENNaWxsaXNlY29uZHM6IHQsXFxuICAgICAgICAgIHNldFVUQ01pbnV0ZXM6IHQsXFxuICAgICAgICAgIHNldFVUQ01vbnRoOiB0LFxcbiAgICAgICAgICBzZXRVVENTZWNvbmRzOiB0LFxcbiAgICAgICAgICB0b0RhdGVTdHJpbmc6IHQsXFxuICAgICAgICAgIHRvSVNPU3RyaW5nOiB0LFxcbiAgICAgICAgICB0b0pTT046IHQsXFxuICAgICAgICAgIHRvTG9jYWxlRGF0ZVN0cmluZzogdCxcXG4gICAgICAgICAgdG9Mb2NhbGVTdHJpbmc6IHQsXFxuICAgICAgICAgIHRvTG9jYWxlVGltZVN0cmluZzogdCxcXG4gICAgICAgICAgdG9UaW1lU3RyaW5nOiB0LFxcbiAgICAgICAgICB0b1VUQ1N0cmluZzogdCxcXG5cXG4gICAgICAgICAgLy8gQi4yLjRcXG4gICAgICAgICAgZ2V0WWVhcjogdCxcXG4gICAgICAgICAgc2V0WWVhcjogdCxcXG4gICAgICAgICAgdG9HTVRTdHJpbmc6IHQsXFxuICAgICAgICB9LFxcbiAgICAgIH0sXFxuXFxuICAgICAgLy8gMjEgVGV4dCBQcm9jZXNzaW5nXFxuXFxuICAgICAgU3RyaW5nOiB7XFxuICAgICAgICAvLyAyMS4yXFxuICAgICAgICBmcm9tQ2hhckNvZGU6IGosXFxuICAgICAgICBmcm9tQ29kZVBvaW50OiB0LCAvLyBFUy1IYXJtb255XFxuICAgICAgICByYXc6IGosIC8vIEVTLUhhcm1vbnlcXG4gICAgICAgIHByb3RvdHlwZToge1xcbiAgICAgICAgICBjaGFyQXQ6IHQsXFxuICAgICAgICAgIGNoYXJDb2RlQXQ6IHQsXFxuICAgICAgICAgIGNvZGVQb2ludEF0OiB0LCAvLyBFUy1IYXJtb255XFxuICAgICAgICAgIGNvbmNhdDogdCxcXG4gICAgICAgICAgZW5kc1dpdGg6IGosIC8vIEVTLUhhcm1vbnlcXG4gICAgICAgICAgaW5jbHVkZXM6IHQsIC8vIEVTLUhhcm1vbnlcXG4gICAgICAgICAgaW5kZXhPZjogaixcXG4gICAgICAgICAgbGFzdEluZGV4T2Y6IGosXFxuICAgICAgICAgIGxvY2FsZUNvbXBhcmU6IHQsXFxuICAgICAgICAgIG1hdGNoOiB0LFxcbiAgICAgICAgICBub3JtYWxpemU6IHQsIC8vIEVTLUhhcm1vbnlcXG4gICAgICAgICAgcGFkRW5kOiB0LCAvLyBFUy1IYXJtb255XFxuICAgICAgICAgIHBhZFN0YXJ0OiB0LCAvLyBFUy1IYXJtb255XFxuICAgICAgICAgIHJlcGVhdDogdCwgLy8gRVMtSGFybW9ueVxcbiAgICAgICAgICByZXBsYWNlOiB0LFxcbiAgICAgICAgICBzZWFyY2g6IHQsXFxuICAgICAgICAgIHNsaWNlOiBqLFxcbiAgICAgICAgICBzcGxpdDogdCxcXG4gICAgICAgICAgc3RhcnRzV2l0aDogaiwgLy8gRVMtSGFybW9ueVxcbiAgICAgICAgICBzdWJzdHJpbmc6IHQsXFxuICAgICAgICAgIHRvTG9jYWxlTG93ZXJDYXNlOiB0LFxcbiAgICAgICAgICB0b0xvY2FsZVVwcGVyQ2FzZTogdCxcXG4gICAgICAgICAgdG9Mb3dlckNhc2U6IHQsXFxuICAgICAgICAgIHRvVXBwZXJDYXNlOiB0LFxcbiAgICAgICAgICB0cmltOiB0LFxcblxcbiAgICAgICAgICAvLyBCLjIuM1xcbiAgICAgICAgICBzdWJzdHI6IHQsXFxuICAgICAgICAgIGFuY2hvcjogdCxcXG4gICAgICAgICAgYmlnOiB0LFxcbiAgICAgICAgICBibGluazogdCxcXG4gICAgICAgICAgYm9sZDogdCxcXG4gICAgICAgICAgZml4ZWQ6IHQsXFxuICAgICAgICAgIGZvbnRjb2xvcjogdCxcXG4gICAgICAgICAgZm9udHNpemU6IHQsXFxuICAgICAgICAgIGl0YWxpY3M6IHQsXFxuICAgICAgICAgIGxpbms6IHQsXFxuICAgICAgICAgIHNtYWxsOiB0LFxcbiAgICAgICAgICBzdHJpa2U6IHQsXFxuICAgICAgICAgIHN1YjogdCxcXG4gICAgICAgICAgc3VwOiB0LFxcblxcbiAgICAgICAgICB0cmltTGVmdDogdCwgLy8gbm9uLXN0YW5kYXJkXFxuICAgICAgICAgIHRyaW1SaWdodDogdCwgLy8gbm9uLXN0YW5kYXJkXFxuXFxuICAgICAgICAgIC8vIDIxLjEuNCBpbnN0YW5jZXNcXG4gICAgICAgICAgbGVuZ3RoOiAnKicsXFxuICAgICAgICB9LFxcbiAgICAgIH0sXFxuXFxuICAgICAgUmVnRXhwOiB7XFxuICAgICAgICAvLyAyMS4yXFxuICAgICAgICBwcm90b3R5cGU6IHtcXG4gICAgICAgICAgZXhlYzogdCxcXG4gICAgICAgICAgZmxhZ3M6ICdtYXliZUFjY2Vzc29yJyxcXG4gICAgICAgICAgZ2xvYmFsOiAnbWF5YmVBY2Nlc3NvcicsXFxuICAgICAgICAgIGlnbm9yZUNhc2U6ICdtYXliZUFjY2Vzc29yJyxcXG4gICAgICAgICAgW1N5bWJvbC5tYXRjaF06ICcqJywgLy8gRVMtSGFybW9ueVxcbiAgICAgICAgICBtdWx0aWxpbmU6ICdtYXliZUFjY2Vzc29yJyxcXG4gICAgICAgICAgW1N5bWJvbC5yZXBsYWNlXTogJyonLCAvLyBFUy1IYXJtb255XFxuICAgICAgICAgIFtTeW1ib2wuc2VhcmNoXTogJyonLCAvLyBFUy1IYXJtb255XFxuICAgICAgICAgIHNvdXJjZTogJ21heWJlQWNjZXNzb3InLFxcbiAgICAgICAgICBbU3ltYm9sLnNwbGl0XTogJyonLCAvLyBFUy1IYXJtb255XFxuICAgICAgICAgIHN0aWNreTogJ21heWJlQWNjZXNzb3InLFxcbiAgICAgICAgICB0ZXN0OiB0LFxcbiAgICAgICAgICB1bmljb2RlOiAnbWF5YmVBY2Nlc3NvcicsIC8vIEVTLUhhcm1vbnlcXG4gICAgICAgICAgZG90QWxsOiAnbWF5YmVBY2Nlc3NvcicsIC8vIHByb3Bvc2VkIEVTLUhhcm1vbnlcXG5cXG4gICAgICAgICAgLy8gQi4yLjVcXG4gICAgICAgICAgY29tcGlsZTogZmFsc2UsIC8vIFVOU0FGRS4gUHVycG9zZWx5IHN1cHByZXNzZWRcXG5cXG4gICAgICAgICAgLy8gMjEuMi42IGluc3RhbmNlc1xcbiAgICAgICAgICBsYXN0SW5kZXg6ICcqJyxcXG4gICAgICAgICAgb3B0aW9uczogJyonLCAvLyBub24tc3RkXFxuICAgICAgICB9LFxcbiAgICAgIH0sXFxuXFxuICAgICAgLy8gMjIgSW5kZXhlZCBDb2xsZWN0aW9uc1xcblxcbiAgICAgIEFycmF5OiB7XFxuICAgICAgICAvLyAyMi4xXFxuICAgICAgICBmcm9tOiBqLFxcbiAgICAgICAgaXNBcnJheTogdCxcXG4gICAgICAgIG9mOiBqLCAvLyBFUy1IYXJtb255P1xcbiAgICAgICAgcHJvdG90eXBlOiB7XFxuICAgICAgICAgIGNvbmNhdDogdCxcXG4gICAgICAgICAgY29weVdpdGhpbjogdCwgLy8gRVMtSGFybW9ueVxcbiAgICAgICAgICBlbnRyaWVzOiB0LCAvLyBFUy1IYXJtb255XFxuICAgICAgICAgIGV2ZXJ5OiB0LFxcbiAgICAgICAgICBmaWxsOiB0LCAvLyBFUy1IYXJtb255XFxuICAgICAgICAgIGZpbHRlcjogaixcXG4gICAgICAgICAgZmluZDogdCwgLy8gRVMtSGFybW9ueVxcbiAgICAgICAgICBmaW5kSW5kZXg6IHQsIC8vIEVTLUhhcm1vbnlcXG4gICAgICAgICAgZm9yRWFjaDogaixcXG4gICAgICAgICAgaW5jbHVkZXM6IHQsIC8vIEVTLUhhcm1vbnlcXG4gICAgICAgICAgaW5kZXhPZjogaixcXG4gICAgICAgICAgam9pbjogdCxcXG4gICAgICAgICAga2V5czogdCwgLy8gRVMtSGFybW9ueVxcbiAgICAgICAgICBsYXN0SW5kZXhPZjogaixcXG4gICAgICAgICAgbWFwOiBqLFxcbiAgICAgICAgICBwb3A6IGosXFxuICAgICAgICAgIHB1c2g6IGosXFxuICAgICAgICAgIHJlZHVjZTogaixcXG4gICAgICAgICAgcmVkdWNlUmlnaHQ6IGosXFxuICAgICAgICAgIHJldmVyc2U6IHQsXFxuICAgICAgICAgIHNoaWZ0OiBqLFxcbiAgICAgICAgICBzbGljZTogaixcXG4gICAgICAgICAgc29tZTogdCxcXG4gICAgICAgICAgc29ydDogdCxcXG4gICAgICAgICAgc3BsaWNlOiB0LFxcbiAgICAgICAgICB1bnNoaWZ0OiBqLFxcbiAgICAgICAgICB2YWx1ZXM6IHQsIC8vIEVTLUhhcm1vbnlcXG5cXG4gICAgICAgICAgLy8gMjIuMS40IGluc3RhbmNlc1xcbiAgICAgICAgICBsZW5ndGg6ICcqJyxcXG4gICAgICAgIH0sXFxuICAgICAgfSxcXG5cXG4gICAgICAvLyAyMi4yIFR5cGVkIEFycmF5IHN0dWZmXFxuICAgICAgLy8gVE9ETzogTm90IHlldCBvcmdhbml6ZWQgYWNjb3JkaW5nIHRvIHNwZWMgb3JkZXJcXG5cXG4gICAgICBJbnQ4QXJyYXk6IFR5cGVkQXJyYXlXaGl0ZWxpc3QsXFxuICAgICAgVWludDhBcnJheTogVHlwZWRBcnJheVdoaXRlbGlzdCxcXG4gICAgICBVaW50OENsYW1wZWRBcnJheTogVHlwZWRBcnJheVdoaXRlbGlzdCxcXG4gICAgICBJbnQxNkFycmF5OiBUeXBlZEFycmF5V2hpdGVsaXN0LFxcbiAgICAgIFVpbnQxNkFycmF5OiBUeXBlZEFycmF5V2hpdGVsaXN0LFxcbiAgICAgIEludDMyQXJyYXk6IFR5cGVkQXJyYXlXaGl0ZWxpc3QsXFxuICAgICAgVWludDMyQXJyYXk6IFR5cGVkQXJyYXlXaGl0ZWxpc3QsXFxuICAgICAgRmxvYXQzMkFycmF5OiBUeXBlZEFycmF5V2hpdGVsaXN0LFxcbiAgICAgIEZsb2F0NjRBcnJheTogVHlwZWRBcnJheVdoaXRlbGlzdCxcXG5cXG4gICAgICAvLyAyMyBLZXllZCBDb2xsZWN0aW9ucyAgICAgICAgICBhbGwgRVMtSGFybW9ueVxcblxcbiAgICAgIE1hcDoge1xcbiAgICAgICAgLy8gMjMuMVxcbiAgICAgICAgcHJvdG90eXBlOiB7XFxuICAgICAgICAgIGNsZWFyOiBqLFxcbiAgICAgICAgICBkZWxldGU6IGosXFxuICAgICAgICAgIGVudHJpZXM6IGosXFxuICAgICAgICAgIGZvckVhY2g6IGosXFxuICAgICAgICAgIGdldDogaixcXG4gICAgICAgICAgaGFzOiBqLFxcbiAgICAgICAgICBrZXlzOiBqLFxcbiAgICAgICAgICBzZXQ6IGosXFxuICAgICAgICAgIHNpemU6ICdtYXliZUFjY2Vzc29yJyxcXG4gICAgICAgICAgdmFsdWVzOiBqLFxcbiAgICAgICAgfSxcXG4gICAgICB9LFxcblxcbiAgICAgIFNldDoge1xcbiAgICAgICAgLy8gMjMuMlxcbiAgICAgICAgcHJvdG90eXBlOiB7XFxuICAgICAgICAgIGFkZDogaixcXG4gICAgICAgICAgY2xlYXI6IGosXFxuICAgICAgICAgIGRlbGV0ZTogaixcXG4gICAgICAgICAgZW50cmllczogaixcXG4gICAgICAgICAgZm9yRWFjaDogaixcXG4gICAgICAgICAgaGFzOiBqLFxcbiAgICAgICAgICBrZXlzOiBqLFxcbiAgICAgICAgICBzaXplOiAnbWF5YmVBY2Nlc3NvcicsXFxuICAgICAgICAgIHZhbHVlczogaixcXG4gICAgICAgIH0sXFxuICAgICAgfSxcXG5cXG4gICAgICBXZWFrTWFwOiB7XFxuICAgICAgICAvLyAyMy4zXFxuICAgICAgICBwcm90b3R5cGU6IHtcXG4gICAgICAgICAgLy8gTm90ZTogY29vcmRpbmF0ZSB0aGlzIGxpc3Qgd2l0aCBtYWludGVuYW5jZSBvZiByZXBhaXJFUzUuanNcXG4gICAgICAgICAgZGVsZXRlOiBqLFxcbiAgICAgICAgICBnZXQ6IGosXFxuICAgICAgICAgIGhhczogaixcXG4gICAgICAgICAgc2V0OiBqLFxcbiAgICAgICAgfSxcXG4gICAgICB9LFxcblxcbiAgICAgIFdlYWtTZXQ6IHtcXG4gICAgICAgIC8vIDIzLjRcXG4gICAgICAgIHByb3RvdHlwZToge1xcbiAgICAgICAgICBhZGQ6IGosXFxuICAgICAgICAgIGRlbGV0ZTogaixcXG4gICAgICAgICAgaGFzOiBqLFxcbiAgICAgICAgfSxcXG4gICAgICB9LFxcblxcbiAgICAgIC8vIDI0IFN0cnVjdHVyZWQgRGF0YVxcblxcbiAgICAgIEFycmF5QnVmZmVyOiB7XFxuICAgICAgICAvLyAyNC4xICAgICAgICAgICAgYWxsIEVTLUhhcm1vbnlcXG4gICAgICAgIGlzVmlldzogdCxcXG4gICAgICAgIGxlbmd0aDogdCwgLy8gZG9lcyBub3QgaW5oZXJpdCBmcm9tIEZ1bmN0aW9uLnByb3RvdHlwZSBvbiBDaHJvbWVcXG4gICAgICAgIG5hbWU6IHQsIC8vIGRpdHRvXFxuICAgICAgICBwcm90b3R5cGU6IHtcXG4gICAgICAgICAgYnl0ZUxlbmd0aDogJ21heWJlQWNjZXNzb3InLFxcbiAgICAgICAgICBzbGljZTogdCxcXG4gICAgICAgIH0sXFxuICAgICAgfSxcXG5cXG4gICAgICAvLyAyNC4yIFRPRE86IE9taXR0aW5nIFNoYXJlZEFycmF5QnVmZmVyIGZvciBub3dcXG5cXG4gICAgICBEYXRhVmlldzoge1xcbiAgICAgICAgLy8gMjQuMyAgICAgICAgICAgICAgIGFsbCBFUy1IYXJtb255XFxuICAgICAgICBsZW5ndGg6IHQsIC8vIGRvZXMgbm90IGluaGVyaXQgZnJvbSBGdW5jdGlvbi5wcm90b3R5cGUgb24gQ2hyb21lXFxuICAgICAgICBuYW1lOiB0LCAvLyBkaXR0b1xcbiAgICAgICAgQllURVNfUEVSX0VMRU1FTlQ6ICcqJywgLy8gbm9uLXN0YW5kYXJkLiByZWFsbHk/XFxuICAgICAgICBwcm90b3R5cGU6IHtcXG4gICAgICAgICAgYnVmZmVyOiAnbWF5YmVBY2Nlc3NvcicsXFxuICAgICAgICAgIGJ5dGVPZmZzZXQ6ICdtYXliZUFjY2Vzc29yJyxcXG4gICAgICAgICAgYnl0ZUxlbmd0aDogJ21heWJlQWNjZXNzb3InLFxcbiAgICAgICAgICBnZXRGbG9hdDMyOiB0LFxcbiAgICAgICAgICBnZXRGbG9hdDY0OiB0LFxcbiAgICAgICAgICBnZXRJbnQ4OiB0LFxcbiAgICAgICAgICBnZXRJbnQxNjogdCxcXG4gICAgICAgICAgZ2V0SW50MzI6IHQsXFxuICAgICAgICAgIGdldFVpbnQ4OiB0LFxcbiAgICAgICAgICBnZXRVaW50MTY6IHQsXFxuICAgICAgICAgIGdldFVpbnQzMjogdCxcXG4gICAgICAgICAgc2V0RmxvYXQzMjogdCxcXG4gICAgICAgICAgc2V0RmxvYXQ2NDogdCxcXG4gICAgICAgICAgc2V0SW50ODogdCxcXG4gICAgICAgICAgc2V0SW50MTY6IHQsXFxuICAgICAgICAgIHNldEludDMyOiB0LFxcbiAgICAgICAgICBzZXRVaW50ODogdCxcXG4gICAgICAgICAgc2V0VWludDE2OiB0LFxcbiAgICAgICAgICBzZXRVaW50MzI6IHQsXFxuICAgICAgICB9LFxcbiAgICAgIH0sXFxuXFxuICAgICAgLy8gMjQuNCBUT0RPOiBPbWl0dGluZyBBdG9taWNzIGZvciBub3dcXG5cXG4gICAgICBKU09OOiB7XFxuICAgICAgICAvLyAyNC41XFxuICAgICAgICBwYXJzZTogaixcXG4gICAgICAgIHN0cmluZ2lmeTogaixcXG4gICAgICB9LFxcblxcbiAgICAgIC8vIDI1IENvbnRyb2wgQWJzdHJhY3Rpb24gT2JqZWN0c1xcblxcbiAgICAgIFByb21pc2U6IHtcXG4gICAgICAgIC8vIDI1LjRcXG4gICAgICAgIGFsbDogaixcXG4gICAgICAgIHJhY2U6IGosXFxuICAgICAgICByZWplY3Q6IGosXFxuICAgICAgICByZXNvbHZlOiBqLFxcbiAgICAgICAgbWFrZUhhbmRsZWQ6IHQsIC8vIGV2ZW50dWFsLXNlbmRcXG4gICAgICAgIHByb3RvdHlwZToge1xcbiAgICAgICAgICBjYXRjaDogdCxcXG4gICAgICAgICAgdGhlbjogaixcXG4gICAgICAgICAgZmluYWxseTogdCwgLy8gcHJvcG9zZWQgRVMtSGFybW9ueVxcblxcbiAgICAgICAgICAvLyBldmVudHVhbC1zZW5kXFxuICAgICAgICAgIGRlbGV0ZTogdCxcXG4gICAgICAgICAgZ2V0OiB0LFxcbiAgICAgICAgICBwdXQ6IHQsXFxuICAgICAgICAgIHBvc3Q6IHQsXFxuICAgICAgICAgIGludm9rZTogdCxcXG4gICAgICAgICAgZmFwcGx5OiB0LFxcbiAgICAgICAgICBmY2FsbDogdCxcXG5cXG4gICAgICAgICAgLy8gbmFub3EuanNcXG4gICAgICAgICAgZGVsOiB0LFxcblxcbiAgICAgICAgICAvLyBUZW1wb3JhcnkgY29tcGF0IHdpdGggdGhlIG9sZCBtYWtlUS5qc1xcbiAgICAgICAgICBzZW5kOiB0LFxcbiAgICAgICAgICBlbmQ6IHQsXFxuICAgICAgICB9LFxcbiAgICAgIH0sXFxuXFxuICAgICAgLy8gbmFub3EuanNcXG4gICAgICBROiB7XFxuICAgICAgICBhbGw6IHQsXFxuICAgICAgICByYWNlOiB0LFxcbiAgICAgICAgcmVqZWN0OiB0LFxcbiAgICAgICAgcmVzb2x2ZTogdCxcXG5cXG4gICAgICAgIGpvaW46IHQsXFxuICAgICAgICBpc1Bhc3NCeUNvcHk6IHQsXFxuICAgICAgICBwYXNzQnlDb3B5OiB0LFxcbiAgICAgICAgbWFrZVJlbW90ZTogdCxcXG4gICAgICAgIG1ha2VGYXI6IHQsXFxuXFxuICAgICAgICAvLyBUZW1wb3JhcnkgY29tcGF0IHdpdGggdGhlIG9sZCBtYWtlUS5qc1xcbiAgICAgICAgc2hvcnRlbjogdCxcXG4gICAgICAgIGlzUHJvbWlzZTogdCxcXG4gICAgICAgIGFzeW5jOiB0LFxcbiAgICAgICAgcmVqZWN0ZWQ6IHQsXFxuICAgICAgICBwcm9taXNlOiB0LFxcbiAgICAgICAgZGVsYXk6IHQsXFxuICAgICAgICBtZW1vaXplOiB0LFxcbiAgICAgICAgZGVmZXI6IHQsXFxuICAgICAgfSxcXG5cXG4gICAgICAvLyAyNiBSZWZsZWN0aW9uXFxuXFxuICAgICAgUmVmbGVjdDoge1xcbiAgICAgICAgLy8gMjYuMVxcbiAgICAgICAgYXBwbHk6IHQsXFxuICAgICAgICBjb25zdHJ1Y3Q6IHQsXFxuICAgICAgICBkZWZpbmVQcm9wZXJ0eTogdCxcXG4gICAgICAgIGRlbGV0ZVByb3BlcnR5OiB0LFxcbiAgICAgICAgZ2V0OiB0LFxcbiAgICAgICAgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yOiB0LFxcbiAgICAgICAgZ2V0UHJvdG90eXBlT2Y6IHQsXFxuICAgICAgICBoYXM6IHQsXFxuICAgICAgICBpc0V4dGVuc2libGU6IHQsXFxuICAgICAgICBvd25LZXlzOiB0LFxcbiAgICAgICAgcHJldmVudEV4dGVuc2lvbnM6IHQsXFxuICAgICAgICBzZXQ6IHQsXFxuICAgICAgICBzZXRQcm90b3R5cGVPZjogdCxcXG4gICAgICB9LFxcblxcbiAgICAgIFByb3h5OiB7XFxuICAgICAgICAvLyAyNi4yXFxuICAgICAgICByZXZvY2FibGU6IHQsXFxuICAgICAgfSxcXG5cXG4gICAgICAvLyBBcHBlbmRpeCBCXFxuXFxuICAgICAgLy8gQi4yLjFcXG4gICAgICBlc2NhcGU6IHQsXFxuICAgICAgdW5lc2NhcGU6IHQsXFxuXFxuICAgICAgLy8gQi4yLjUgKFJlZ0V4cC5wcm90b3R5cGUuY29tcGlsZSkgaXMgbWFya2VkICdmYWxzZScgdXAgaW4gMjEuMlxcblxcbiAgICAgIC8vIE90aGVyXFxuXFxuICAgICAgU3RyaW5nTWFwOiB7XFxuICAgICAgICAvLyBBIHNwZWNpYWxpemVkIGFwcHJveGltYXRpb24gb2YgRVMtSGFybW9ueSdzIE1hcC5cXG4gICAgICAgIHByb3RvdHlwZToge30sIC8vIFRlY2huaWNhbGx5LCB0aGUgbWV0aG9kcyBzaG91bGQgYmUgb24gdGhlIHByb3RvdHlwZSxcXG4gICAgICAgIC8vIGJ1dCBkb2luZyBzbyB3aGlsZSBwcmVzZXJ2aW5nIGVuY2Fwc3VsYXRpb24gd2lsbCBiZVxcbiAgICAgICAgLy8gbmVlZGxlc3NseSBleHBlbnNpdmUgZm9yIGN1cnJlbnQgdXNhZ2UuXFxuICAgICAgfSxcXG5cXG4gICAgICBSZWFsbToge1xcbiAgICAgICAgbWFrZVJvb3RSZWFsbTogdCxcXG4gICAgICAgIG1ha2VDb21wYXJ0bWVudDogdCxcXG4gICAgICAgIHByb3RvdHlwZToge1xcbiAgICAgICAgICBnbG9iYWw6ICdtYXliZUFjY2Vzc29yJyxcXG4gICAgICAgICAgZXZhbHVhdGU6IHQsXFxuICAgICAgICB9LFxcbiAgICAgIH0sXFxuXFxuICAgICAgU0VTOiB7XFxuICAgICAgICBjb25maW5lOiB0LFxcbiAgICAgICAgY29uZmluZUV4cHI6IHQsXFxuICAgICAgICBoYXJkZW46IHQsXFxuICAgICAgfSxcXG5cXG4gICAgICBOYXQ6IGosXFxuICAgICAgZGVmOiBqLFxcbiAgICB9LFxcbiAgfTtcXG5cXG4gIGZ1bmN0aW9uIG1ha2VDb25zb2xlKHBhcmVudENvbnNvbGUpIHtcXG4gICAgLyogJ3BhcmVudENvbnNvbGUnIGlzIHRoZSBwYXJlbnQgUmVhbG0ncyBvcmlnaW5hbCAnY29uc29sZScgb2JqZWN0LiBXZSBtdXN0XFxuICAgICAgIHdyYXAgaXQsIGV4cG9zaW5nIGEgJ2NvbnNvbGUnIHdpdGggYSAnY29uc29sZS5sb2cnIChhbmQgcGVyaGFwcyBvdGhlcnMpXFxuICAgICAgIHRvIHRoZSBsb2NhbCByZWFsbSwgd2l0aG91dCBhbGxvd2luZyBhY2Nlc3MgdG8gdGhlIG9yaWdpbmFsICdjb25zb2xlJyxcXG4gICAgICAgaXRzIHJldHVybiB2YWx1ZXMsIG9yIGl0cyBleGNlcHRpb24gb2JqZWN0cywgYW55IG9mIHdoaWNoIGNvdWxkIGJlIHVzZWRcXG4gICAgICAgdG8gYnJlYWsgY29uZmluZW1lbnQgdmlhIHRoZSB1bnNhZmUgRnVuY3Rpb24gY29uc3RydWN0b3IuICovXFxuXFxuICAgIC8vIGNhbGxBbmRXcmFwRXJyb3IgaXMgY29waWVkIGZyb20gcHJvcG9zYWwtcmVhbG1zL3NoaW0vc3JjL3JlYWxtRmFjYWRlLmpzXFxuICAgIC8vIExpa2UgUmVhbG0uYXBwbHkgZXhjZXB0IHRoYXQgaXQgY2F0Y2hlcyBhbnl0aGluZyB0aHJvd24gYW5kIHJldGhyb3dzIGl0XFxuICAgIC8vIGFzIGFuIEVycm9yIGZyb20gdGhpcyByZWFsbVxcblxcbiAgICBjb25zdCBlcnJvckNvbnN0cnVjdG9ycyA9IG5ldyBNYXAoW1xcbiAgICAgIFsnRXZhbEVycm9yJywgRXZhbEVycm9yXSxcXG4gICAgICBbJ1JhbmdlRXJyb3InLCBSYW5nZUVycm9yXSxcXG4gICAgICBbJ1JlZmVyZW5jZUVycm9yJywgUmVmZXJlbmNlRXJyb3JdLFxcbiAgICAgIFsnU3ludGF4RXJyb3InLCBTeW50YXhFcnJvcl0sXFxuICAgICAgWydUeXBlRXJyb3InLCBUeXBlRXJyb3JdLFxcbiAgICAgIFsnVVJJRXJyb3InLCBVUklFcnJvcl0sXFxuICAgIF0pO1xcblxcbiAgICBmdW5jdGlvbiBjYWxsQW5kV3JhcEVycm9yKHRhcmdldCwgLi4uYXJncykge1xcbiAgICAgIHRyeSB7XFxuICAgICAgICByZXR1cm4gdGFyZ2V0KC4uLmFyZ3MpO1xcbiAgICAgIH0gY2F0Y2ggKGVycikge1xcbiAgICAgICAgaWYgKE9iamVjdChlcnIpICE9PSBlcnIpIHtcXG4gICAgICAgICAgLy8gZXJyIGlzIGEgcHJpbWl0aXZlIHZhbHVlLCB3aGljaCBpcyBzYWZlIHRvIHJldGhyb3dcXG4gICAgICAgICAgdGhyb3cgZXJyO1xcbiAgICAgICAgfVxcbiAgICAgICAgbGV0IGVOYW1lO1xcbiAgICAgICAgbGV0IGVNZXNzYWdlO1xcbiAgICAgICAgbGV0IGVTdGFjaztcXG4gICAgICAgIHRyeSB7XFxuICAgICAgICAgIC8vIFRoZSBjaGlsZCBlbnZpcm9ubWVudCBtaWdodCBzZWVrIHRvIHVzZSAnZXJyJyB0byByZWFjaCB0aGVcXG4gICAgICAgICAgLy8gcGFyZW50J3MgaW50cmluc2ljcyBhbmQgY29ycnVwdCB0aGVtLiBgJHtlcnIubmFtZX1gIHdpbGwgY2F1c2VcXG4gICAgICAgICAgLy8gc3RyaW5nIGNvZXJjaW9uIG9mICdlcnIubmFtZScuIElmIGVyci5uYW1lIGlzIGFuIG9iamVjdCAocHJvYmFibHlcXG4gICAgICAgICAgLy8gYSBTdHJpbmcgb2YgdGhlIHBhcmVudCBSZWFsbSksIHRoZSBjb2VyY2lvbiB1c2VzXFxuICAgICAgICAgIC8vIGVyci5uYW1lLnRvU3RyaW5nKCksIHdoaWNoIGlzIHVuZGVyIHRoZSBjb250cm9sIG9mIHRoZSBwYXJlbnQuIElmXFxuICAgICAgICAgIC8vIGVyci5uYW1lIHdlcmUgYSBwcmltaXRpdmUgKGUuZy4gYSBudW1iZXIpLCBpdCB3b3VsZCB1c2VcXG4gICAgICAgICAgLy8gTnVtYmVyLnRvU3RyaW5nKGVyci5uYW1lKSwgdXNpbmcgdGhlIGNoaWxkJ3MgdmVyc2lvbiBvZiBOdW1iZXJcXG4gICAgICAgICAgLy8gKHdoaWNoIHRoZSBjaGlsZCBjb3VsZCBtb2RpZnkgdG8gY2FwdHVyZSBpdHMgYXJndW1lbnQgZm9yIGxhdGVyXFxuICAgICAgICAgIC8vIHVzZSksIGhvd2V2ZXIgcHJpbWl0aXZlcyBkb24ndCBoYXZlIHByb3BlcnRpZXMgbGlrZSAucHJvdG90eXBlIHNvXFxuICAgICAgICAgIC8vIHRoZXkgYXJlbid0IHVzZWZ1bCBmb3IgYW4gYXR0YWNrLlxcbiAgICAgICAgICBlTmFtZSA9IGAke2Vyci5uYW1lfWA7XFxuICAgICAgICAgIGVNZXNzYWdlID0gYCR7ZXJyLm1lc3NhZ2V9YDtcXG4gICAgICAgICAgZVN0YWNrID0gYCR7ZXJyLnN0YWNrIHx8IGVNZXNzYWdlfWA7XFxuICAgICAgICAgIC8vIGVOYW1lL2VNZXNzYWdlL2VTdGFjayBhcmUgbm93IGNoaWxkLXJlYWxtIHByaW1pdGl2ZSBzdHJpbmdzLCBhbmRcXG4gICAgICAgICAgLy8gc2FmZSB0byBleHBvc2VcXG4gICAgICAgIH0gY2F0Y2ggKGlnbm9yZWQpIHtcXG4gICAgICAgICAgLy8gaWYgZXJyLm5hbWUudG9TdHJpbmcoKSB0aHJvd3MsIGtlZXAgdGhlIChwYXJlbnQgcmVhbG0pIEVycm9yIGF3YXlcXG4gICAgICAgICAgLy8gZnJvbSB0aGUgY2hpbGRcXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bmtub3duIGVycm9yJyk7XFxuICAgICAgICB9XFxuICAgICAgICBjb25zdCBFcnJvckNvbnN0cnVjdG9yID0gZXJyb3JDb25zdHJ1Y3RvcnMuZ2V0KGVOYW1lKSB8fCBFcnJvcjtcXG4gICAgICAgIHRyeSB7XFxuICAgICAgICAgIHRocm93IG5ldyBFcnJvckNvbnN0cnVjdG9yKGVNZXNzYWdlKTtcXG4gICAgICAgIH0gY2F0Y2ggKGVycjIpIHtcXG4gICAgICAgICAgZXJyMi5zdGFjayA9IGVTdGFjazsgLy8gcmVwbGFjZSB3aXRoIHRoZSBjYXB0dXJlZCBpbm5lciBzdGFja1xcbiAgICAgICAgICB0aHJvdyBlcnIyO1xcbiAgICAgICAgfVxcbiAgICAgIH1cXG4gICAgfVxcblxcbiAgICBjb25zdCBuZXdDb25zb2xlID0ge307XFxuICAgIGNvbnN0IHBhc3NUaHJvdWdoID0gW1xcbiAgICAgICdsb2cnLFxcbiAgICAgICdpbmZvJyxcXG4gICAgICAnd2FybicsXFxuICAgICAgJ2Vycm9yJyxcXG4gICAgICAnZ3JvdXAnLFxcbiAgICAgICdncm91cEVuZCcsXFxuICAgICAgJ3RyYWNlJyxcXG4gICAgICAndGltZScsXFxuICAgICAgJ3RpbWVMb2cnLFxcbiAgICAgICd0aW1lRW5kJyxcXG4gICAgXTtcXG4gICAgLy8gVE9ETzogdGhvc2UgYXJlIHRoZSBwcm9wZXJ0aWVzIHRoYXQgTUROIGRvY3VtZW50cy4gTm9kZS5qcyBoYXMgYSBidW5jaFxcbiAgICAvLyBvZiBhZGRpdGlvbmFsIG9uZXMgdGhhdCBJIGRpZG4ndCBpbmNsdWRlLCB3aGljaCBtaWdodCBiZSBhcHByb3ByaWF0ZS5cXG5cXG4gICAgcGFzc1Rocm91Z2guZm9yRWFjaChuYW1lID0+IHtcXG4gICAgICAvLyBUT0RPOiBkbyB3ZSByZXZlYWwgdGhlIHByZXNlbmNlL2Fic2VuY2Ugb2YgdGhlc2UgcHJvcGVydGllcyB0byB0aGVcXG4gICAgICAvLyBjaGlsZCByZWFsbSwgdGh1cyBleHBvc2luZyBub25kZXRlcm1pbmlzbSAoYW5kIGEgaGludCBvZiB3aGF0IHBsYXRmb3JtXFxuICAgICAgLy8geW91IG1pZ2h0IGJlIG9uKSB3aGVuIGl0IGlzIGNvbnN0cnVjdGVkIHdpdGgge2NvbnNvbGVNb2RlOiBhbGxvd30gPyBPclxcbiAgICAgIC8vIHNob3VsZCB3ZSBleHBvc2UgdGhlIHNhbWUgc2V0IGFsbCB0aGUgdGltZSwgYnV0IHNpbGVudGx5IGlnbm9yZSBjYWxsc1xcbiAgICAgIC8vIHRvIHRoZSBtaXNzaW5nIG9uZXMsIHRvIGhpZGUgdGhhdCB2YXJpYXRpb24/IFdlIG1pZ2h0IGV2ZW4gY29uc2lkZXJcXG4gICAgICAvLyBhZGRpbmcgY29uc29sZS4qIHRvIHRoZSBjaGlsZCByZWFsbSBhbGwgdGhlIHRpbWUsIGV2ZW4gd2l0aG91dFxcbiAgICAgIC8vIGNvbnNvbGVNb2RlOmFsbG93LCBidXQgaWdub3JlIHRoZSBjYWxscyB1bmxlc3MgdGhlIG1vZGUgaXMgZW5hYmxlZC5cXG4gICAgICBpZiAobmFtZSBpbiBwYXJlbnRDb25zb2xlKSB7XFxuICAgICAgICBjb25zdCBvcmlnID0gcGFyZW50Q29uc29sZVtuYW1lXTtcXG4gICAgICAgIC8vIFRPRE86IGluIGEgc3RhY2sgdHJhY2UsIHRoaXMgYXBwZWFycyBhc1xcbiAgICAgICAgLy8gXFxcIk9iamVjdC5uZXdDb25zb2xlLihhbm9ueW1vdXMgZnVuY3Rpb24pIFthcyB0cmFjZV1cXFwiXFxuICAgICAgICAvLyBjYW4gd2UgbWFrZSB0aGF0IFxcXCJuZXdDb25zb2xlLnRyYWNlXFxcIiA/XFxuICAgICAgICBuZXdDb25zb2xlW25hbWVdID0gZnVuY3Rpb24gbmV3ZXJDb25zb2xlKC4uLmFyZ3MpIHtcXG4gICAgICAgICAgY2FsbEFuZFdyYXBFcnJvcihvcmlnLCAuLi5hcmdzKTtcXG4gICAgICAgIH07XFxuICAgICAgfVxcbiAgICB9KTtcXG5cXG4gICAgcmV0dXJuIG5ld0NvbnNvbGU7XFxuICB9XFxuXFxuICBmdW5jdGlvbiBtYWtlTWFrZVJlcXVpcmUociwgaGFyZGVuKSB7XFxuICAgIGZ1bmN0aW9uIG1ha2VSZXF1aXJlKGNvbmZpZykge1xcbiAgICAgIGNvbnN0IGNhY2hlID0gbmV3IE1hcCgpO1xcblxcbiAgICAgIGZ1bmN0aW9uIGJ1aWxkKHdoYXQpIHtcXG4gICAgICAgIC8vIFRoaXMgYXBwcm9hY2ggZGVuaWVzIGNhbGxlcnMgdGhlIGFiaWxpdHkgdG8gdXNlIGluaGVyaXRhbmNlIHRvXFxuICAgICAgICAvLyBtYW5hZ2UgdGhlaXIgY29uZmlnIG9iamVjdHMsIGJ1dCBhIHNpbXBsZSBcXFwiaWYgKHdoYXQgaW4gY29uZmlnKVxcXCJcXG4gICAgICAgIC8vIHByZWRpY2F0ZSB3b3VsZCBhbHNvIGJlIHRydXRoeSBmb3IgZS5nLiBcXFwidG9TdHJpbmdcXFwiIGFuZCBvdGhlclxcbiAgICAgICAgLy8gcHJvcGVydGllcyBvZiBPYmplY3QucHJvdG90eXBlLCBhbmQgcmVxdWlyZSgndG9TdHJpbmcnKSBzaG91bGQgYmVcXG4gICAgICAgIC8vIGxlZ2FsIGlmIGFuZCBvbmx5IGlmIHRoZSBjb25maWcgb2JqZWN0IGluY2x1ZGVkIGFuIG93bi1wcm9wZXJ0eVxcbiAgICAgICAgLy8gbmFtZWQgJ3RvU3RyaW5nJy4gSW5jaWRlbnRhbGx5LCB0aGlzIGNvdWxkIGhhdmUgYmVlblxcbiAgICAgICAgLy8gXFxcImNvbmZpZy5oYXNPd25Qcm9wZXJ0eSh3aGF0KVxcXCIgYnV0IGVzbGludCBjb21wbGFpbmVkLlxcbiAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY29uZmlnLCB3aGF0KSkge1xcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBmaW5kIG1vZHVsZSAnJHt3aGF0fSdgKTtcXG4gICAgICAgIH1cXG4gICAgICAgIGNvbnN0IGMgPSBjb25maWdbd2hhdF07XFxuXFxuICAgICAgICAvLyBzb21lIG1vZHVsZXMgYXJlIGhhcmQtY29kZWQgd2F5cyB0byBhY2Nlc3MgZnVuY3Rpb25hbGl0eSB0aGF0IFNFU1xcbiAgICAgICAgLy8gcHJvdmlkZXMgZGlyZWN0bHlcXG4gICAgICAgIGlmICh3aGF0ID09PSAnQGFnb3JpYy9oYXJkZW4nKSB7XFxuICAgICAgICAgIHJldHVybiBoYXJkZW47XFxuICAgICAgICB9XFxuXFxuICAgICAgICAvLyBJZiB0aGUgY29uZmlnIHBvaW50cyBhdCBhIHNpbXBsZSBmdW5jdGlvbiwgaXQgbXVzdCBiZSBhIHB1cmVcXG4gICAgICAgIC8vIGZ1bmN0aW9uIHdpdGggbm8gZGVwZW5kZW5jaWVzIChpLmUuIG5vICdyZXF1aXJlJyBvciAnaW1wb3J0Jywgbm9cXG4gICAgICAgIC8vIGNhbGxzIHRvIG90aGVyIGZ1bmN0aW9ucyBkZWZpbmVkIGluIHRoZSBzYW1lIGZpbGUgYnV0IG91dHNpZGUgdGhlXFxuICAgICAgICAvLyBmdW5jdGlvbiBib2R5KS4gV2Ugc3RyaW5naWZ5IGl0IGFuZCBldmFsdWF0ZSBpdCBpbnNpZGUgdGhpcyByZWFsbS5cXG4gICAgICAgIGlmICh0eXBlb2YgYyA9PT0gJ2Z1bmN0aW9uJykge1xcbiAgICAgICAgICByZXR1cm4gci5ldmFsdWF0ZShgKCR7Y30pYCk7XFxuICAgICAgICB9XFxuXFxuICAgICAgICAvLyBlbHNlIHdlIHRyZWF0IGl0IGFzIGFuIG9iamVjdCB3aXRoIGFuICdhdHRlbnVhdG9yU291cmNlJyBwcm9wZXJ0eVxcbiAgICAgICAgLy8gdGhhdCBkZWZpbmVzIGFuIGF0dGVudWF0b3IgZnVuY3Rpb24sIHdoaWNoIHdlIGV2YWx1YXRlLiBXZSB0aGVuXFxuICAgICAgICAvLyBpbnZva2UgaXQgd2l0aCB0aGUgY29uZmlnIG9iamVjdCwgd2hpY2ggY2FuIGNvbnRhaW4gYXV0aG9yaXRpZXMgdGhhdFxcbiAgICAgICAgLy8gaXQgY2FuIHdyYXAuIFRoZSByZXR1cm4gdmFsdWUgZnJvbSB0aGlzIGludm9jYXRpb24gaXMgdGhlIG1vZHVsZVxcbiAgICAgICAgLy8gb2JqZWN0IHRoYXQgZ2V0cyByZXR1cm5lZCBmcm9tIHJlcXVpcmUoKS4gVGhlIGF0dGVudWF0b3IgZnVuY3Rpb25cXG4gICAgICAgIC8vIGFuZCB0aGUgbW9kdWxlIGl0IHJldHVybnMgYXJlIGluLXJlYWxtLCB0aGUgYXV0aG9yaXRpZXMgaXQgd3JhcHNcXG4gICAgICAgIC8vIHdpbGwgYmUgb3V0LW9mLXJlYWxtLlxcbiAgICAgICAgY29uc3Qgc3JjID0gYCgke2MuYXR0ZW51YXRvclNvdXJjZX0pYDtcXG4gICAgICAgIGNvbnN0IGF0dGVudWF0b3IgPSByLmV2YWx1YXRlKHNyYyk7XFxuICAgICAgICByZXR1cm4gYXR0ZW51YXRvcihjKTtcXG4gICAgICB9XFxuXFxuICAgICAgZnVuY3Rpb24gbmV3UmVxdWlyZSh3aGF0QXJnKSB7XFxuICAgICAgICBjb25zdCB3aGF0ID0gYCR7d2hhdEFyZ31gO1xcbiAgICAgICAgaWYgKCFjYWNoZS5oYXMod2hhdCkpIHtcXG4gICAgICAgICAgY2FjaGUuc2V0KHdoYXQsIGhhcmRlbihidWlsZCh3aGF0KSkpO1xcbiAgICAgICAgfVxcbiAgICAgICAgcmV0dXJuIGNhY2hlLmdldCh3aGF0KTtcXG4gICAgICB9XFxuXFxuICAgICAgcmV0dXJuIG5ld1JlcXVpcmU7XFxuICAgIH1cXG5cXG4gICAgcmV0dXJuIG1ha2VSZXF1aXJlO1xcbiAgfVxcblxcbiAgLyoqXFxuICAgKiBAZmlsZW92ZXJ2aWV3IEV4cG9ydHMge0Bjb2RlIHNlcy5kYXRhUHJvcGVydGllc1RvUmVwYWlyfSwgYSByZWN1cnNpdmVseVxcbiAgICogZGVmaW5lZCBKU09OIHJlY29yZCBlbnVtZXJhdGluZyB0aGUgb3B0aW1hbCBzZXQgb2YgcHJvdG90eXBlIHByb3BlcnRpZXNcXG4gICAqIG9uIHByaW1vcmRpYWxzIHRoYXQgbmVlZCB0byBiZSByZXBhaXJlZCBiZWZvcmUgaGFyZGVuaW5nLlxcbiAgICpcXG4gICAqIC8vcHJvdmlkZXMgc2VzLmRhdGFQcm9wZXJ0aWVzVG9SZXBhaXJcXG4gICAqIEBhdXRob3IgSkYgUGFyYWRpc1xcbiAgICovXFxuXFxuICAvKipcXG4gICAqIDxwPlRoZSBvcHRpbWFsIHNldCBvZiBwcm90b3R5cGUgcHJvcGVydGllcyB0aGF0IG5lZWQgdG8gYmUgcmVwYWlyZWRcXG4gICAqIGJlZm9yZSBoYXJkZW5pbmcgaXMgYXBwbGllZCBvbiBlbnZpcm9tbWVudHMgc3ViamVjdCB0byB0aGUgb3ZlcnJpZGVcXG4gICAqIG1pc3Rha2UuXFxuICAgKlxcbiAgICogPHA+QmVjYXVzZSBcXFwicmVwYWlyaW5nXFxcIiByZXBsYWNlcyBkYXRhIHByb3BlcnRpZXMgd2l0aCBhY2Nlc3NvcnMsIGV2ZXJ5XFxuICAgKiB0aW1lIGEgcmVwYWlyZWQgcHJvcGVydHkgaXMgYWNjZXNzZWQsIHRoZSBhc3NvY2lhdGVkIGdldHRlciBpcyBpbnZva2VkLFxcbiAgICogd2hpY2ggZGVncmFkZXMgdGhlIHJ1bnRpbWUgcGVyZm9ybWFuY2Ugb2YgYWxsIGNvZGUgZXhlY3V0aW5nIGluIHRoZVxcbiAgICogcmVwYWlyZWQgZW52aXJvbW1lbnQsIGNvbXBhcmVkIHRvIHRoZSBub24tcmVwYWlyZWQgY2FzZS4gSW4gb3JkZXJcXG4gICAqIHRvIG1haW50YWluIHBlcmZvcm1hbmNlLCB3ZSBvbmx5IHJlcGFpciB0aGUgcHJvcGVydGllcyBvZiBvYmplY3RzXFxuICAgKiBmb3Igd2hpY2ggaGFyZGVuaW5nIGNhdXNlcyBhIGJyZWFrYWdlIG9mIHRoZWlyIGludGVuZGVkIHVzYWdlLiBUaGVyZVxcbiAgICogYXJlIHRocmVlIGNhc2VzOlxcbiAgICogPHVsPk92ZXJyaWRpbmcgcHJvcGVydGllcyBvbiBvYmplY3RzIHR5cGljYWxseSB1c2VkIGFzIG1hcHMsXFxuICAgKiAgICAgbmFtZWx5IHtAY29kZSBcXFwiT2JqZWN0XFxcIn0gYW5kIHtAY29kZSBcXFwiQXJyYXlcXFwifS4gSW4gdGhlIGNhc2Ugb2YgYXJyYXlzLFxcbiAgICogICAgIGEgZ2l2ZW4gcHJvZ3JhbSBtaWdodCBub3QgYmUgYXdhcmUgdGhhdCBub24tbnVtZXJpY2FsIHByb3BlcnRpZXMgYXJlXFxuICAgKiAgICAgc3RvcmVkIG9uIHRoZSB1bmRlbHlpbmcgb2JqZWN0IGluc3RhbmNlLCBub3Qgb24gdGhlIGFycmF5LiBXaGVuIGFuXFxuICAgKiAgICAgb2JqZWN0IGlzIHR5cGljYWxseSB1c2VkIGFzIGEgbWFwLCB3ZSByZXBhaXIgYWxsIG9mIGl0cyBwcm90b3R5cGVcXG4gICAqICAgICBwcm9wZXJ0aWVzLlxcbiAgICogPHVsPk92ZXJyaWRpbmcgcHJvcGVydGllcyBvbiBvYmplY3RzIHRoYXQgcHJvdmlkZSBkZWZhdWx0cyBvbiB0aGVpclxcbiAgICogICAgIHByb3RvdHlwZSB0aGF0IHByb2dyYW1zIHR5cGljYWxseSBvdmVycmlkZSBieSBhc3NpZ25tZW50LCBzdWNoIGFzXFxuICAgKiAgICAge0Bjb2RlIFxcXCJFcnJvci5wcm90b3R5cGUubWVzc2FnZVxcXCJ9IGFuZCB7QGNvZGUgXFxcIkZ1bmN0aW9uLnByb3RvdHlwZS5uYW1lXFxcIn1cXG4gICAqICAgICAoYm90aCBkZWZhdWx0IHRvIFxcXCJcXFwiKS5cXG4gICAqIDx1bD5TZXR0aW5nIGEgcHJvdG90eXBlIGNoYWluLiBUaGUgY29uc3RydWN0b3IgaXMgdHlwaWNhbGx5IHNldCBieVxcbiAgICogICAgIGFzc2lnbm1lbnQsIGZvciBleGFtcGxlIHtAY29kZSBcXFwiQ2hpbGQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ2hpbGRcXFwifS5cXG4gICAqXFxuICAgKiA8cD5FYWNoIEpTT04gcmVjb3JkIGVudW1lcmF0ZXMgdGhlIGRpc3Bvc2l0aW9uIG9mIHRoZSBwcm9wZXJ0aWVzIG9uXFxuICAgKiBzb21lIGNvcnJlc3BvbmRpbmcgcHJpbW9yZGlhbCBvYmplY3QsIHdpdGggdGhlIHJvb3QgcmVjb3JkIGNvbnRhaW5pbmc6XFxuICAgKiA8dWw+XFxuICAgKiA8bGk+VGhlIHJlY29yZCBmb3IgdGhlIGdsb2JhbCBvYmplY3QuXFxuICAgKiA8bGk+VGhlIHJlY29yZCBmb3IgdGhlIGFub255bW91cyBpbnRyaW5zaWNzLlxcbiAgICogPC91bD5cXG4gICAqXFxuICAgKiA8cD5Gb3IgZWFjaCBzdWNoIHJlY29yZCwgdGhlIHZhbHVlcyBhc3NvY2lhdGVkIHdpdGggaXRzIHByb3BlcnR5XFxuICAgKiBuYW1lcyBjYW4gYmU6XFxuICAgKiA8dWw+XFxuICAgKiA8bGk+QW5vdGhlciByZWNvcmQsIGluIHdoaWNoIGNhc2UgdGhpcyBwcm9wZXJ0eSBpcyBzaW1wbHkgbGVmdFxcbiAgICogICAgIHVucmVwYWlyZWQgYW5kIHRoYXQgbmV4dCByZWNvcmQgcmVwcmVzZW50cyB0aGUgZGlzcG9zaXRpb24gb2ZcXG4gICAqICAgICB0aGUgb2JqZWN0IHdoaWNoIGlzIGl0cyB2YWx1ZS4gRm9yIGV4YW1wbGUsIHtAY29kZSBcXFwiT2JqZWN0XFxcIn1cXG4gICAqICAgICBsZWFkcyB0byBhbm90aGVyIHJlY29yZCBleHBsYWluaW5nIHdoYXQgcHJvcGVydGllcyB7QGNvZGVcXG4gICAqICAgICBcXFwiT2JqZWN0XFxcIn0gbWF5IGhhdmUgYW5kIGhvdyBlYWNoIHN1Y2ggcHJvcGVydHksIGlmIHByZXNlbnQsXFxuICAgKiAgICAgYW5kIGl0cyB2YWx1ZSBzaG91bGQgYmUgcmVwYWlyZWQuXFxuICAgKiA8bGk+dHJ1ZSwgaW4gd2hpY2ggY2FzZSB0aGlzIHByb3BlcnR5IGlzIHNpbXBseSByZXBhaXJlZC4gVGhlXFxuICAgKiAgICAgdmFsdWUgYXNzb2NpYXRlZCB3aXRoIHRoYXQgcHJvcGVydHkgaXMgbm90IHRyYXZlcnNlZC4gRm9yXFxuICAgKiBcXHQgICBleGFtcGxlLCB7QGNvZGUgXFxcIkZ1bmN0aW9uLnByb3RvdHlwZS5uYW1lXFxcIn0gbGVhZHMgdG8gdHJ1ZSxcXG4gICAqICAgICBtZWFuaW5nIHRoYXQgdGhlIHtAY29kZSBcXFwibmFtZVxcXCJ9IHByb3BlcnR5IG9mIHtAY29kZVxcbiAgICogICAgIFxcXCJGdW5jdGlvbi5wcm90b3R5cGVcXFwifSBzaG91bGQgYmUgcmVwYWlyZWQgKHdoaWNoIGlzIG5lZWRlZFxcbiAgICogICAgIHdoZW4gaW5oZXJpdGluZyBmcm9tIEBjb2Rle0Z1bmN0aW9ufSBhbmQgc2V0dGluZyB0aGUgc3ViY2xhc3Mnc1xcbiAgICogICAgIHtAY29kZSBcXFwicHJvdG90eXBlLm5hbWVcXFwifSBwcm9wZXJ0eSkuIElmIHRoZSBwcm9wZXJ0eSBpc1xcbiAgICogICAgIGFscmVhZHkgYW4gYWNjZXNzb3IgcHJvcGVydHksIGl0IGlzIG5vdCByZXBhaXJlZCAoYmVjYXVzZVxcbiAgICogICAgIGFjY2Vzc29ycyBhcmUgbm90IHN1YmplY3QgdG8gdGhlIG92ZXJyaWRlIG1pc3Rha2UpLlxcbiAgICogPGxpPlxcXCIqXFxcIiwgYWxsIHByb3BlcnRpZXMgb24gdGhpcyBvYmplY3QgYXJlIHJlcGFpcmVkLlxcbiAgICogPGxpPmZhbHNleSwgaW4gd2hpY2ggY2FzZSB0aGlzIHByb3BlcnR5IGlzIHNraXBwZWQuXFxuICAgKiA8L3VsPlxcbiAgICpcXG4gICAqIDxwPldlIGZhY3RvciBvdXQge0Bjb2RlIHRydWV9IGludG8gdGhlIHZhcmlhYmxlIHtAY29kZSB0fSBqdXN0IHRvXFxuICAgKiBnZXQgYSBiaXQgYmV0dGVyIGNvbXByZXNzaW9uIGZyb20gc2ltcGxlIG1pbmlmaWVycy5cXG4gICAqL1xcblxcbiAgY29uc3QgdCQxID0gdHJ1ZTtcXG5cXG4gIHZhciBkYXRhUHJvcGVydGllc1RvUmVwYWlyID0ge1xcbiAgICBuYW1lZEludHJpbnNpY3M6IHtcXG4gICAgICBPYmplY3Q6IHtcXG4gICAgICAgIHByb3RvdHlwZTogJyonLFxcbiAgICAgIH0sXFxuXFxuICAgICAgQXJyYXk6IHtcXG4gICAgICAgIHByb3RvdHlwZTogJyonLFxcbiAgICAgIH0sXFxuXFxuICAgICAgRnVuY3Rpb246IHtcXG4gICAgICAgIHByb3RvdHlwZToge1xcbiAgICAgICAgICBjb25zdHJ1Y3RvcjogdCQxLCAvLyBzZXQgYnkgXFxcInJlZ2VuZXJhdG9yLXJ1bnRpbWVcXFwiXFxuICAgICAgICAgIGJpbmQ6IHQkMSwgLy8gc2V0IGJ5IFxcXCJ1bmRlcnNjb3JlXFxcIlxcbiAgICAgICAgICBuYW1lOiB0JDEsXFxuICAgICAgICAgIHRvU3RyaW5nOiB0JDEsXFxuICAgICAgICB9LFxcbiAgICAgIH0sXFxuXFxuICAgICAgRXJyb3I6IHtcXG4gICAgICAgIHByb3RvdHlwZToge1xcbiAgICAgICAgICBjb25zdHJ1Y3RvcjogdCQxLCAvLyBzZXQgYnkgXFxcImZhc3QtanNvbi1wYXRjaFxcXCJcXG4gICAgICAgICAgbWVzc2FnZTogdCQxLFxcbiAgICAgICAgICBuYW1lOiB0JDEsIC8vIHNldCBieSBcXFwicHJlY29uZFxcXCJcXG4gICAgICAgICAgdG9TdHJpbmc6IHQkMSwgLy8gc2V0IGJ5IFxcXCJibHVlYmlyZFxcXCJcXG4gICAgICAgIH0sXFxuICAgICAgfSxcXG5cXG4gICAgICBUeXBlRXJyb3I6IHtcXG4gICAgICAgIHByb3RvdHlwZToge1xcbiAgICAgICAgICBjb25zdHJ1Y3RvcjogdCQxLCAvLyBzZXQgYnkgXFxcInJlYWRhYmxlLXN0cmVhbVxcXCJcXG4gICAgICAgICAgbmFtZTogdCQxLCAvLyBzZXQgYnkgXFxcInJlYWRhYmxlLXN0cmVhbVxcXCJcXG4gICAgICAgIH0sXFxuICAgICAgfSxcXG5cXG4gICAgICBQcm9taXNlOiB7XFxuICAgICAgICBwcm90b3R5cGU6IHtcXG4gICAgICAgICAgY29uc3RydWN0b3I6IHQkMSwgLy8gc2V0IGJ5IFxcXCJjb3JlLWpzXFxcIlxcbiAgICAgICAgfSxcXG4gICAgICB9LFxcbiAgICB9LFxcblxcbiAgICBhbm9uSW50cmluc2ljczoge1xcbiAgICAgIFR5cGVkQXJyYXk6IHtcXG4gICAgICAgIHByb3RvdHlwZTogJyonLFxcbiAgICAgIH0sXFxuXFxuICAgICAgR2VuZXJhdG9yRnVuY3Rpb246IHtcXG4gICAgICAgIHByb3RvdHlwZToge1xcbiAgICAgICAgICBjb25zdHJ1Y3RvcjogdCQxLFxcbiAgICAgICAgICBuYW1lOiB0JDEsXFxuICAgICAgICAgIHRvU3RyaW5nOiB0JDEsXFxuICAgICAgICB9LFxcbiAgICAgIH0sXFxuXFxuICAgICAgQXN5bmNGdW5jdGlvbjoge1xcbiAgICAgICAgcHJvdG90eXBlOiB7XFxuICAgICAgICAgIGNvbnN0cnVjdG9yOiB0JDEsXFxuICAgICAgICAgIG5hbWU6IHQkMSxcXG4gICAgICAgICAgdG9TdHJpbmc6IHQkMSxcXG4gICAgICAgIH0sXFxuICAgICAgfSxcXG5cXG4gICAgICBBc3luY0dlbmVyYXRvckZ1bmN0aW9uOiB7XFxuICAgICAgICBwcm90b3R5cGU6IHtcXG4gICAgICAgICAgY29uc3RydWN0b3I6IHQkMSxcXG4gICAgICAgICAgbmFtZTogdCQxLFxcbiAgICAgICAgICB0b1N0cmluZzogdCQxLFxcbiAgICAgICAgfSxcXG4gICAgICB9LFxcblxcbiAgICAgIEl0ZXJhdG9yUHJvdG90eXBlOiAnKicsXFxuICAgIH0sXFxuICB9O1xcblxcbiAgLy8gQWRhcHRlZCBmcm9tIFNFUy9DYWphXFxuICAvLyBDb3B5cmlnaHQgKEMpIDIwMTEgR29vZ2xlIEluYy5cXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9nb29nbGUvY2FqYS9ibG9iL21hc3Rlci9zcmMvY29tL2dvb2dsZS9jYWphL3Nlcy9zdGFydFNFUy5qc1xcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2dvb2dsZS9jYWphL2Jsb2IvbWFzdGVyL3NyYy9jb20vZ29vZ2xlL2NhamEvc2VzL3JlcGFpckVTNS5qc1xcblxcbiAgZnVuY3Rpb24gcmVwYWlyRGF0YVByb3BlcnRpZXMoaW50cmluc2ljcywgcmVwYWlyUGxhbikge1xcbiAgICAvLyBPYmplY3QuZGVmaW5lUHJvcGVydHkgaXMgYWxsb3dlZCB0byBmYWlsIHNpbGVudGx5LFxcbiAgICAvLyB1c2UgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMgaW5zdGVhZC5cXG5cXG4gICAgY29uc3Qge1xcbiAgICAgIGRlZmluZVByb3BlcnRpZXMsXFxuICAgICAgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yLFxcbiAgICAgIGdldE93blByb3BlcnR5RGVzY3JpcHRvcnMsXFxuICAgICAgcHJvdG90eXBlOiB7IGhhc093blByb3BlcnR5IH0sXFxuICAgIH0gPSBPYmplY3Q7XFxuXFxuICAgIGNvbnN0IHsgb3duS2V5cyB9ID0gUmVmbGVjdDtcXG5cXG4gICAgLyoqXFxuICAgICAqIEZvciBhIHNwZWNpYWwgc2V0IG9mIHByb3BlcnRpZXMgKGRlZmluZWQgaW4gdGhlIHJlcGFpclBsYW4pLCBpdCBlbnN1cmVzXFxuICAgICAqIHRoYXQgdGhlIGVmZmVjdCBvZiBmcmVlemluZyBkb2VzIG5vdCBzdXBwcmVzcyB0aGUgYWJpbGl0eSB0byBvdmVycmlkZVxcbiAgICAgKiB0aGVzZSBwcm9wZXJ0aWVzIG9uIGRlcml2ZWQgb2JqZWN0cyBieSBzaW1wbGUgYXNzaWdubWVudC5cXG4gICAgICpcXG4gICAgICogQmVjYXVzZSBvZiBsYWNrIG9mIHN1ZmZpY2llbnQgZm9yZXNpZ2h0IGF0IHRoZSB0aW1lLCBFUzUgdW5mb3J0dW5hdGVseVxcbiAgICAgKiBzcGVjaWZpZWQgdGhhdCBhIHNpbXBsZSBhc3NpZ25tZW50IHRvIGEgbm9uLWV4aXN0ZW50IHByb3BlcnR5IG11c3QgZmFpbCBpZlxcbiAgICAgKiBpdCB3b3VsZCBvdmVycmlkZSBhIG5vbi13cml0YWJsZSBkYXRhIHByb3BlcnR5IG9mIHRoZSBzYW1lIG5hbWUuIChJblxcbiAgICAgKiByZXRyb3NwZWN0LCB0aGlzIHdhcyBhIG1pc3Rha2UsIGJ1dCBpdCBpcyBub3cgdG9vIGxhdGUgYW5kIHdlIG11c3QgbGl2ZVxcbiAgICAgKiB3aXRoIHRoZSBjb25zZXF1ZW5jZXMuKSBBcyBhIHJlc3VsdCwgc2ltcGx5IGZyZWV6aW5nIGFuIG9iamVjdCB0byBtYWtlIGl0XFxuICAgICAqIHRhbXBlciBwcm9vZiBoYXMgdGhlIHVuZm9ydHVuYXRlIHNpZGUgZWZmZWN0IG9mIGJyZWFraW5nIHByZXZpb3VzbHkgY29ycmVjdFxcbiAgICAgKiBjb2RlIHRoYXQgaXMgY29uc2lkZXJlZCB0byBoYXZlIGZvbGxvd2VkIEpTIGJlc3QgcHJhY3RpY2VzLCBpZiB0aGlzXFxuICAgICAqIHByZXZpb3VzIGNvZGUgdXNlZCBhc3NpZ25tZW50IHRvIG92ZXJyaWRlLlxcbiAgICAgKi9cXG4gICAgZnVuY3Rpb24gZW5hYmxlRGVyaXZlZE92ZXJyaWRlKG9iaiwgcHJvcCwgZGVzYykge1xcbiAgICAgIGlmICgndmFsdWUnIGluIGRlc2MgJiYgZGVzYy5jb25maWd1cmFibGUpIHtcXG4gICAgICAgIGNvbnN0IHsgdmFsdWUgfSA9IGRlc2M7XFxuXFxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8taW5uZXItZGVjbGFyYXRpb25zXFxuICAgICAgICBmdW5jdGlvbiBnZXR0ZXIoKSB7XFxuICAgICAgICAgIHJldHVybiB2YWx1ZTtcXG4gICAgICAgIH1cXG5cXG4gICAgICAgIC8vIFJlLWF0dGFjaCB0aGUgZGF0YSBwcm9wZXJ0eSBvbiB0aGUgb2JqZWN0IHNvXFxuICAgICAgICAvLyBpdCBjYW4gYmUgZm91bmQgYnkgdGhlIGRlZXAtZnJlZXplIHRyYXZlcnNhbCBwcm9jZXNzLlxcbiAgICAgICAgZ2V0dGVyLnZhbHVlID0gdmFsdWU7XFxuXFxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8taW5uZXItZGVjbGFyYXRpb25zXFxuICAgICAgICBmdW5jdGlvbiBzZXR0ZXIobmV3VmFsdWUpIHtcXG4gICAgICAgICAgaWYgKG9iaiA9PT0gdGhpcykge1xcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXFxuICAgICAgICAgICAgICBgQ2Fubm90IGFzc2lnbiB0byByZWFkIG9ubHkgcHJvcGVydHkgJyR7cHJvcH0nIG9mIG9iamVjdCAnJHtvYmp9J2AsXFxuICAgICAgICAgICAgKTtcXG4gICAgICAgICAgfVxcbiAgICAgICAgICBpZiAoaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLCBwcm9wKSkge1xcbiAgICAgICAgICAgIHRoaXNbcHJvcF0gPSBuZXdWYWx1ZTtcXG4gICAgICAgICAgfSBlbHNlIHtcXG4gICAgICAgICAgICBkZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcXG4gICAgICAgICAgICAgIFtwcm9wXToge1xcbiAgICAgICAgICAgICAgICB2YWx1ZTogbmV3VmFsdWUsXFxuICAgICAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBkZXNjLmVudW1lcmFibGUsXFxuICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogZGVzYy5jb25maWd1cmFibGUsXFxuICAgICAgICAgICAgICB9LFxcbiAgICAgICAgICAgIH0pO1xcbiAgICAgICAgICB9XFxuICAgICAgICB9XFxuXFxuICAgICAgICBkZWZpbmVQcm9wZXJ0aWVzKG9iaiwge1xcbiAgICAgICAgICBbcHJvcF06IHtcXG4gICAgICAgICAgICBnZXQ6IGdldHRlcixcXG4gICAgICAgICAgICBzZXQ6IHNldHRlcixcXG4gICAgICAgICAgICBlbnVtZXJhYmxlOiBkZXNjLmVudW1lcmFibGUsXFxuICAgICAgICAgICAgY29uZmlndXJhYmxlOiBkZXNjLmNvbmZpZ3VyYWJsZSxcXG4gICAgICAgICAgfSxcXG4gICAgICAgIH0pO1xcbiAgICAgIH1cXG4gICAgfVxcblxcbiAgICBmdW5jdGlvbiByZXBhaXJPbmVQcm9wZXJ0eShvYmosIHByb3ApIHtcXG4gICAgICBpZiAoIW9iaikge1xcbiAgICAgICAgcmV0dXJuO1xcbiAgICAgIH1cXG4gICAgICBjb25zdCBkZXNjID0gZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iaiwgcHJvcCk7XFxuICAgICAgaWYgKCFkZXNjKSB7XFxuICAgICAgICByZXR1cm47XFxuICAgICAgfVxcbiAgICAgIGVuYWJsZURlcml2ZWRPdmVycmlkZShvYmosIHByb3AsIGRlc2MpO1xcbiAgICB9XFxuXFxuICAgIGZ1bmN0aW9uIHJlcGFpckFsbFByb3BlcnRpZXMob2JqKSB7XFxuICAgICAgaWYgKCFvYmopIHtcXG4gICAgICAgIHJldHVybjtcXG4gICAgICB9XFxuICAgICAgY29uc3QgZGVzY3MgPSBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKG9iaik7XFxuICAgICAgaWYgKCFkZXNjcykge1xcbiAgICAgICAgcmV0dXJuO1xcbiAgICAgIH1cXG4gICAgICBvd25LZXlzKGRlc2NzKS5mb3JFYWNoKHByb3AgPT5cXG4gICAgICAgIGVuYWJsZURlcml2ZWRPdmVycmlkZShvYmosIHByb3AsIGRlc2NzW3Byb3BdKSxcXG4gICAgICApO1xcbiAgICB9XFxuXFxuICAgIGZ1bmN0aW9uIHdhbGtSZXBhaXJQbGFuKG9iaiwgcGxhbikge1xcbiAgICAgIGlmICghb2JqKSB7XFxuICAgICAgICByZXR1cm47XFxuICAgICAgfVxcbiAgICAgIGlmICghcGxhbikge1xcbiAgICAgICAgcmV0dXJuO1xcbiAgICAgIH1cXG4gICAgICBvd25LZXlzKHBsYW4pLmZvckVhY2gocHJvcCA9PiB7XFxuICAgICAgICBjb25zdCBzdWJQbGFuID0gcGxhbltwcm9wXTtcXG4gICAgICAgIGNvbnN0IHN1Yk9iaiA9IG9ialtwcm9wXTtcXG4gICAgICAgIHN3aXRjaCAoc3ViUGxhbikge1xcbiAgICAgICAgICBjYXNlIHRydWU6XFxuICAgICAgICAgICAgcmVwYWlyT25lUHJvcGVydHkob2JqLCBwcm9wKTtcXG4gICAgICAgICAgICBicmVhaztcXG5cXG4gICAgICAgICAgY2FzZSAnKic6XFxuICAgICAgICAgICAgcmVwYWlyQWxsUHJvcGVydGllcyhzdWJPYmopO1xcbiAgICAgICAgICAgIGJyZWFrO1xcblxcbiAgICAgICAgICBkZWZhdWx0OlxcbiAgICAgICAgICAgIGlmIChPYmplY3Qoc3ViUGxhbikgIT09IHN1YlBsYW4pIHtcXG4gICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihgUmVwYWlyIHBsYW4gc3ViUGxhbiAke3N1YlBsYW59IGlzIGludmFsaWRgKTtcXG4gICAgICAgICAgICB9XFxuICAgICAgICAgICAgd2Fsa1JlcGFpclBsYW4oc3ViT2JqLCBzdWJQbGFuKTtcXG4gICAgICAgIH1cXG4gICAgICB9KTtcXG4gICAgfVxcblxcbiAgICAvLyBEbyB0aGUgcmVwYWlyLlxcbiAgICB3YWxrUmVwYWlyUGxhbihpbnRyaW5zaWNzLCByZXBhaXJQbGFuKTtcXG4gIH1cXG5cXG4gIC8vIENvcHlyaWdodCAoQykgMjAxOCBBZ29yaWNcXG5cXG4gIGNvbnN0IEZPUldBUkRFRF9SRUFMTVNfT1BUSU9OUyA9IFsndHJhbnNmb3JtcycsICdjb25maWd1cmFibGVHbG9iYWxzJ107XFxuXFxuICBmdW5jdGlvbiBjcmVhdGVTRVNXaXRoUmVhbG1Db25zdHJ1Y3RvcihjcmVhdG9yU3RyaW5ncywgUmVhbG0pIHtcXG4gICAgZnVuY3Rpb24gbWFrZVNFU1Jvb3RSZWFsbShvcHRpb25zKSB7XFxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXBhcmFtLXJlYXNzaWduXFxuICAgICAgb3B0aW9ucyA9IE9iamVjdChvcHRpb25zKTsgLy8gVG9kbzogc2FuaXRpemVcXG4gICAgICBjb25zdCBzaGltcyA9IFtdO1xcblxcbiAgICAgIGNvbnN0IHtcXG4gICAgICAgIGRhdGFQcm9wZXJ0aWVzVG9SZXBhaXI6IG9wdERhdGFQcm9wZXJ0aWVzVG9SZXBhaXIsXFxuICAgICAgICBzaGltczogb3B0aW9uYWxTaGltcyxcXG4gICAgICAgIHNsb3BweUdsb2JhbHMsXFxuICAgICAgICB3aGl0ZWxpc3Q6IG9wdFdoaXRlbGlzdCxcXG4gICAgICAgIC4uLm9wdGlvbnNSZXN0XFxuICAgICAgfSA9IG9wdGlvbnM7XFxuXFxuICAgICAgY29uc3Qgd2wgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG9wdFdoaXRlbGlzdCB8fCB3aGl0ZWxpc3QpKTtcXG4gICAgICBjb25zdCByZXBhaXJQbGFuID1cXG4gICAgICAgIG9wdERhdGFQcm9wZXJ0aWVzVG9SZXBhaXIgIT09IHVuZGVmaW5lZFxcbiAgICAgICAgICA/IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkob3B0RGF0YVByb3BlcnRpZXNUb1JlcGFpcikpXFxuICAgICAgICAgIDogZGF0YVByb3BlcnRpZXNUb1JlcGFpcjtcXG5cXG4gICAgICAvLyBGb3J3YXJkIHRoZSBkZXNpZ25hdGVkIFJlYWxtcyBvcHRpb25zLlxcbiAgICAgIGNvbnN0IHJlYWxtc09wdGlvbnMgPSB7fTtcXG4gICAgICBGT1JXQVJERURfUkVBTE1TX09QVElPTlMuZm9yRWFjaChrZXkgPT4ge1xcbiAgICAgICAgaWYgKGtleSBpbiBvcHRpb25zUmVzdCkge1xcbiAgICAgICAgICByZWFsbXNPcHRpb25zW2tleV0gPSBvcHRpb25zUmVzdFtrZXldO1xcbiAgICAgICAgfVxcbiAgICAgIH0pO1xcblxcbiAgICAgIGlmIChzbG9wcHlHbG9iYWxzKSB7XFxuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoYFxcXFxcXG5zbG9wcHlHbG9iYWxzIGNhbm5vdCBiZSBzcGVjaWZpZWQgZm9yIG1ha2VTRVNSb290UmVhbG0hXFxuWW91IHByb2JhYmx5IHdhbnQgYSBDb21wYXJ0bWVudCBpbnN0ZWFkLCBsaWtlOlxcbiAgY29uc3QgYyA9IHMuZ2xvYmFsLlJlYWxtLm1ha2VDb21wYXJ0bWVudCh7IHNsb3BweUdsb2JhbHM6IHRydWUgfSlgKTtcXG4gICAgICB9XFxuXFxuICAgICAgLy8gXFxcImFsbG93XFxcIiBlbmFibGVzIHJlYWwgRGF0ZS5ub3coKSwgYW55dGhpbmcgZWxzZSBnZXRzIE5hTlxcbiAgICAgIC8vIChpdCdkIGJlIG5pY2UgdG8gYWxsb3cgYSBmaXhlZCBudW1lcmljIHZhbHVlLCBidXQgdG9vIGhhcmQgdG9cXG4gICAgICAvLyBpbXBsZW1lbnQgcmlnaHQgbm93KVxcbiAgICAgIGlmIChvcHRpb25zLmRhdGVOb3dNb2RlICE9PSAnYWxsb3cnKSB7XFxuICAgICAgICBzaGltcy5wdXNoKGAoJHt0YW1lRGF0ZX0pKCk7YCk7XFxuICAgICAgfVxcblxcbiAgICAgIGlmIChvcHRpb25zLm1hdGhSYW5kb21Nb2RlICE9PSAnYWxsb3cnKSB7XFxuICAgICAgICBzaGltcy5wdXNoKGAoJHt0YW1lTWF0aH0pKCk7YCk7XFxuICAgICAgfVxcblxcbiAgICAgIC8vIEludGwgaXMgZGlzYWJsZWQgZW50aXJlbHkgZm9yIG5vdywgZGVsZXRlZCBieSByZW1vdmVQcm9wZXJ0aWVzLiBJZiB3ZVxcbiAgICAgIC8vIHdhbnQgdG8gYnJpbmcgaXQgYmFjayAodW5kZXIgdGhlIGNvbnRyb2wgb2YgdGhpcyBvcHRpb24pLCB3ZSdsbCBuZWVkXFxuICAgICAgLy8gdG8gYWRkIGl0IHRvIHRoZSB3aGl0ZWxpc3QgdG9vLCBhcyB3ZWxsIGFzIHRhbWluZyBpdCBwcm9wZXJseS5cXG4gICAgICBpZiAob3B0aW9ucy5pbnRsTW9kZSAhPT0gJ2FsbG93Jykge1xcbiAgICAgICAgLy8gdGhpcyBzaGltIGFsc28gZGlzYWJsZXMgT2JqZWN0LnByb3RvdHlwZS50b0xvY2FsZVN0cmluZ1xcbiAgICAgICAgc2hpbXMucHVzaChgKCR7dGFtZUludGx9KSgpO2ApO1xcbiAgICAgIH1cXG5cXG4gICAgICBpZiAob3B0aW9ucy5lcnJvclN0YWNrTW9kZSAhPT0gJ2FsbG93Jykge1xcbiAgICAgICAgc2hpbXMucHVzaChgKCR7dGFtZUVycm9yfSkoKTtgKTtcXG4gICAgICB9IGVsc2Uge1xcbiAgICAgICAgLy8gaWYgcmVtb3ZlUHJvcGVydGllcyBjbGVhbnMgdGhlc2UgdGhpbmdzIGZyb20gRXJyb3IsIHY4IHdvbid0IHByb3ZpZGVcXG4gICAgICAgIC8vIHN0YWNrIHRyYWNlcyBvciBldmVuIHRvU3RyaW5nIG9uIGV4Y2VwdGlvbnMsIGFuZCB0aGVuIE5vZGUuanMgcHJpbnRzXFxuICAgICAgICAvLyB1bmNhdWdodCBleGNlcHRpb25zIGFzIFxcXCJ1bmRlZmluZWRcXFwiIGluc3RlYWQgb2YgYSB0eXBlL21lc3NhZ2Uvc3RhY2suXFxuICAgICAgICAvLyBTbyBpZiB3ZSdyZSBhbGxvd2luZyBzdGFjayB0cmFjZXMsIG1ha2Ugc3VyZSB0aGUgd2hpdGVsaXN0IGlzXFxuICAgICAgICAvLyBhdWdtZW50ZWQgdG8gaW5jbHVkZSB0aGVtLlxcbiAgICAgICAgd2wubmFtZWRJbnRyaW5zaWNzLkVycm9yLmNhcHR1cmVTdGFja1RyYWNlID0gdHJ1ZTtcXG4gICAgICAgIHdsLm5hbWVkSW50cmluc2ljcy5FcnJvci5zdGFja1RyYWNlTGltaXQgPSB0cnVlO1xcbiAgICAgICAgd2wubmFtZWRJbnRyaW5zaWNzLkVycm9yLnByZXBhcmVTdGFja1RyYWNlID0gdHJ1ZTtcXG4gICAgICB9XFxuXFxuICAgICAgaWYgKG9wdGlvbnMucmVnZXhwTW9kZSAhPT0gJ2FsbG93Jykge1xcbiAgICAgICAgc2hpbXMucHVzaChgKCR7dGFtZVJlZ0V4cH0pKCk7YCk7XFxuICAgICAgfVxcblxcbiAgICAgIC8vIFRoZSBnZXRBbm9uSW50cmluc2ljcyBmdW5jdGlvbiBtaWdodCBiZSByZW5hbWVkIGJ5IGUuZy4gcm9sbHVwLiBUaGVcXG4gICAgICAvLyByZW1vdmVQcm9wZXJ0aWVzKCkgZnVuY3Rpb24gcmVmZXJlbmNlcyBpdCBieSBuYW1lLCBzbyB3ZSBuZWVkIHRvIGZvcmNlXFxuICAgICAgLy8gaXQgdG8gaGF2ZSBhIHNwZWNpZmljIG5hbWUuXFxuICAgICAgY29uc3QgcmVtb3ZlUHJvcCA9IGBjb25zdCBnZXRBbm9uSW50cmluc2ljcyA9ICgke2dldEFub25JbnRyaW5zaWNzJDF9KTtcXG4gICAgICAgICAgICAgICAoJHtyZW1vdmVQcm9wZXJ0aWVzfSkodGhpcywgJHtKU09OLnN0cmluZ2lmeSh3bCl9KWA7XFxuICAgICAgc2hpbXMucHVzaChyZW1vdmVQcm9wKTtcXG5cXG4gICAgICAvLyBBZGQgb3B0aW9ucy5zaGltcy5cXG4gICAgICBpZiAob3B0aW9uYWxTaGltcykge1xcbiAgICAgICAgc2hpbXMucHVzaCguLi5vcHRpb25hbFNoaW1zKTtcXG4gICAgICB9XFxuXFxuICAgICAgY29uc3QgciA9IFJlYWxtLm1ha2VSb290UmVhbG0oeyAuLi5yZWFsbXNPcHRpb25zLCBzaGltcyB9KTtcXG5cXG4gICAgICAvLyBCdWlsZCBhIGhhcmRlbigpIHdpdGggYW4gZW1wdHkgZnJpbmdlLiBJdCB3aWxsIGJlIHBvcHVsYXRlZCBsYXRlciB3aGVuXFxuICAgICAgLy8gd2UgY2FsbCBoYXJkZW4oYWxsSW50cmluc2ljcykuXFxuICAgICAgY29uc3QgbWFrZUhhcmRlbmVyU3JjID0gYCgke21ha2VIYXJkZW5lcn0pYDtcXG4gICAgICBjb25zdCBoYXJkZW4gPSByLmV2YWx1YXRlKG1ha2VIYXJkZW5lclNyYykoKTtcXG5cXG4gICAgICBjb25zdCBiID0gci5ldmFsdWF0ZShjcmVhdG9yU3RyaW5ncyk7XFxuICAgICAgYi5jcmVhdGVTRVNJblRoaXNSZWFsbShyLmdsb2JhbCwgY3JlYXRvclN0cmluZ3MsIHIpO1xcblxcbiAgICAgIC8vIEFsbG93IGhhcmRlbiB0byBiZSBhY2Nlc3NpYmxlIHZpYSB0aGUgU0VTIGdsb2JhbC5cXG4gICAgICByLmdsb2JhbC5TRVMuaGFyZGVuID0gaGFyZGVuO1xcblxcbiAgICAgIGlmIChvcHRpb25zLmNvbnNvbGVNb2RlID09PSAnYWxsb3cnKSB7XFxuICAgICAgICBjb25zdCBzID0gYCgke21ha2VDb25zb2xlfSlgO1xcbiAgICAgICAgci5nbG9iYWwuY29uc29sZSA9IHIuZXZhbHVhdGUocykoY29uc29sZSk7XFxuICAgICAgfVxcblxcbiAgICAgIC8vIEV4dHJhY3QgdGhlIGludHJpbnNpY3MgZnJvbSB0aGUgZ2xvYmFsLlxcbiAgICAgIGNvbnN0IGFub25JbnRyaW5zaWNzID0gci5ldmFsdWF0ZShgKCR7Z2V0QW5vbkludHJpbnNpY3MkMX0pYCkoci5nbG9iYWwpO1xcbiAgICAgIGNvbnN0IG5hbWVkSW50cmluc2ljcyA9IHIuZXZhbHVhdGUoYCgke2dldE5hbWVkSW50cmluc2ljc30pYCkoXFxuICAgICAgICByLmdsb2JhbCxcXG4gICAgICAgIHdoaXRlbGlzdCxcXG4gICAgICApO1xcblxcbiAgICAgIC8vIEdhdGhlciB0aGUgaW50cmluc2ljcyBvbmx5LlxcbiAgICAgIGNvbnN0IGFsbEludHJpbnNpY3MgPSByLmV2YWx1YXRlKGAoJHtnZXRBbGxQcmltb3JkaWFscyQxfSlgKShcXG4gICAgICAgIG5hbWVkSW50cmluc2ljcyxcXG4gICAgICAgIGFub25JbnRyaW5zaWNzLFxcbiAgICAgICk7XFxuXFxuICAgICAgLy8gR2F0aGVyIHRoZSBwcmltb3JkaWFscyBhbmQgdGhlIGdsb2JhbHMuXFxuICAgICAgY29uc3QgYWxsUHJpbW9yZGlhbHMgPSByLmV2YWx1YXRlKGAoJHtnZXRBbGxQcmltb3JkaWFsc30pYCkoXFxuICAgICAgICByLmdsb2JhbCxcXG4gICAgICAgIGFub25JbnRyaW5zaWNzLFxcbiAgICAgICk7XFxuXFxuICAgICAgLy8gUmVwYWlyIHRoZSBvdmVycmlkZSBtaXN0YWtlIG9uIHRoZSBpbnRyaW5zaWNzIG9ubHkuXFxuICAgICAgci5ldmFsdWF0ZShgKCR7cmVwYWlyRGF0YVByb3BlcnRpZXN9KWApKGFsbEludHJpbnNpY3MsIHJlcGFpclBsYW4pO1xcblxcbiAgICAgIC8vIEZpbmFsbHkgZnJlZXplIGFsbCB0aGUgcHJpbW9yZGlhbHMsIGFuZCB0aGUgZ2xvYmFsIG9iamVjdC4gVGhpcyBtdXN0XFxuICAgICAgLy8gYmUgdGhlIGxhc3QgdGhpbmcgd2UgZG8gdGhhdCBtb2RpZmllcyB0aGUgUmVhbG0ncyBnbG9iYWxzLlxcbiAgICAgIGhhcmRlbihhbGxQcmltb3JkaWFscyk7XFxuXFxuICAgICAgLy8gYnVpbGQgdGhlIG1ha2VSZXF1aXJlIGhlbHBlciwgZ2x1ZSBpdCB0byB0aGUgbmV3IFJlYWxtXFxuICAgICAgci5tYWtlUmVxdWlyZSA9IGhhcmRlbihyLmV2YWx1YXRlKGAoJHttYWtlTWFrZVJlcXVpcmV9KWApKHIsIGhhcmRlbikpO1xcbiAgICAgIHJldHVybiByO1xcbiAgICB9XFxuICAgIGNvbnN0IFNFUyA9IHtcXG4gICAgICBtYWtlU0VTUm9vdFJlYWxtLFxcbiAgICB9O1xcblxcbiAgICByZXR1cm4gU0VTO1xcbiAgfVxcblxcbiAgZnVuY3Rpb24gY3JlYXRlU0VTSW5UaGlzUmVhbG0oZ2xvYmFsLCBjcmVhdG9yU3RyaW5ncywgcGFyZW50UmVhbG0pIHtcXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXBhcmFtLXJlYXNzaWduLG5vLXVuZGVmXFxuICAgIGdsb2JhbC5TRVMgPSBjcmVhdGVTRVNXaXRoUmVhbG1Db25zdHJ1Y3RvcihjcmVhdG9yU3RyaW5ncywgUmVhbG0pO1xcbiAgICAvLyB0b2RvOiB3cmFwIGV4Y2VwdGlvbnMsIGVmZmVjdGl2ZWx5IHVuZG9pbmcgdGhlIHdyYXBwaW5nIHRoYXRcXG4gICAgLy8gUmVhbG0uZXZhbHVhdGUgZG9lc1xcblxcbiAgICBjb25zdCBlcnJvckNvbnN0cnVjdG9ycyA9IG5ldyBNYXAoW1xcbiAgICAgIFsnRXZhbEVycm9yJywgRXZhbEVycm9yXSxcXG4gICAgICBbJ1JhbmdlRXJyb3InLCBSYW5nZUVycm9yXSxcXG4gICAgICBbJ1JlZmVyZW5jZUVycm9yJywgUmVmZXJlbmNlRXJyb3JdLFxcbiAgICAgIFsnU3ludGF4RXJyb3InLCBTeW50YXhFcnJvcl0sXFxuICAgICAgWydUeXBlRXJyb3InLCBUeXBlRXJyb3JdLFxcbiAgICAgIFsnVVJJRXJyb3InLCBVUklFcnJvcl0sXFxuICAgIF0pO1xcblxcbiAgICAvLyBjYWxsQW5kV3JhcEVycm9yIGlzIGNvcGllZCBmcm9tIHRoZSBSZWFsbSBzaGltLiBPdXIgU0VTLmNvbmZpbmUgKGZyb21cXG4gICAgLy8gaW5zaWRlIHRoZSByZWFsbSkgZGVsZWdhdGVzIHRvIFJlYWxtLmV2YWx1YXRlIChmcm9tIG91dHNpZGUgdGhlIHJlYWxtKSxcXG4gICAgLy8gYnV0IHdlIG5lZWQgdGhlIGV4Y2VwdGlvbnMgdG8gY29tZSBmcm9tIG91ciBvd24gcmVhbG0sIHNvIHdlIHVzZSB0aGlzIHRvXFxuICAgIC8vIHJldmVyc2UgdGhlIHNoaW0ncyBvd24gY2FsbEFuZFdyYXBFcnJvci4gVE9ETzogbG9vayBmb3IgYSByZWFzb25hYmxlIHdheVxcbiAgICAvLyB0byBhdm9pZCB0aGUgZG91YmxlLXdyYXBwaW5nLCBtYXliZSBieSBjaGFuZ2luZyB0aGUgc2hpbS9SZWFsbXMtc3BlYyB0b1xcbiAgICAvLyBwcm92aWRlIHRoZSBzYWZlRXZhbHVhdG9yIGFzIGEgUmVhbG0uZXZhbHVhdGUgbWV0aG9kIChpbnNpZGUgYSByZWFsbSkuXFxuICAgIC8vIFRoYXQgd291bGQgbWFrZSB0aGlzIHRyaXZpYWw6IGdsb2JhbC5TRVMgPSBSZWFsbS5ldmFsdWF0ZSAobW9kdWxvXFxuICAgIC8vIHBvdGVudGlhbCAndGhpcycgaXNzdWVzKVxcblxcbiAgICAvLyB0aGUgY29tbWVudHMgaGVyZSB3ZXJlIHdyaXR0ZW4gZnJvbSB0aGUgUE9WIG9mIGEgcGFyZW50IGRlZmVuZGluZyBpdHNlbGZcXG4gICAgLy8gYWdhaW5zdCBhIG1hbGljaW91cyBjaGlsZCByZWFsbS4gSW4gdGhpcyBjYXNlLCB3ZSBhcmUgdGhlIGNoaWxkLlxcblxcbiAgICBmdW5jdGlvbiBjYWxsQW5kV3JhcEVycm9yKHRhcmdldCwgLi4uYXJncykge1xcbiAgICAgIHRyeSB7XFxuICAgICAgICByZXR1cm4gdGFyZ2V0KC4uLmFyZ3MpO1xcbiAgICAgIH0gY2F0Y2ggKGVycikge1xcbiAgICAgICAgaWYgKE9iamVjdChlcnIpICE9PSBlcnIpIHtcXG4gICAgICAgICAgLy8gZXJyIGlzIGEgcHJpbWl0aXZlIHZhbHVlLCB3aGljaCBpcyBzYWZlIHRvIHJldGhyb3dcXG4gICAgICAgICAgdGhyb3cgZXJyO1xcbiAgICAgICAgfVxcbiAgICAgICAgbGV0IGVOYW1lO1xcbiAgICAgICAgbGV0IGVNZXNzYWdlO1xcbiAgICAgICAgbGV0IGVTdGFjaztcXG4gICAgICAgIHRyeSB7XFxuICAgICAgICAgIC8vIFRoZSBjaGlsZCBlbnZpcm9ubWVudCBtaWdodCBzZWVrIHRvIHVzZSAnZXJyJyB0byByZWFjaCB0aGVcXG4gICAgICAgICAgLy8gcGFyZW50J3MgaW50cmluc2ljcyBhbmQgY29ycnVwdCB0aGVtLiBgJHtlcnIubmFtZX1gIHdpbGwgY2F1c2VcXG4gICAgICAgICAgLy8gc3RyaW5nIGNvZXJjaW9uIG9mICdlcnIubmFtZScuIElmIGVyci5uYW1lIGlzIGFuIG9iamVjdCAocHJvYmFibHlcXG4gICAgICAgICAgLy8gYSBTdHJpbmcgb2YgdGhlIHBhcmVudCBSZWFsbSksIHRoZSBjb2VyY2lvbiB1c2VzXFxuICAgICAgICAgIC8vIGVyci5uYW1lLnRvU3RyaW5nKCksIHdoaWNoIGlzIHVuZGVyIHRoZSBjb250cm9sIG9mIHRoZSBwYXJlbnQuIElmXFxuICAgICAgICAgIC8vIGVyci5uYW1lIHdlcmUgYSBwcmltaXRpdmUgKGUuZy4gYSBudW1iZXIpLCBpdCB3b3VsZCB1c2VcXG4gICAgICAgICAgLy8gTnVtYmVyLnRvU3RyaW5nKGVyci5uYW1lKSwgdXNpbmcgdGhlIGNoaWxkJ3MgdmVyc2lvbiBvZiBOdW1iZXJcXG4gICAgICAgICAgLy8gKHdoaWNoIHRoZSBjaGlsZCBjb3VsZCBtb2RpZnkgdG8gY2FwdHVyZSBpdHMgYXJndW1lbnQgZm9yIGxhdGVyXFxuICAgICAgICAgIC8vIHVzZSksIGhvd2V2ZXIgcHJpbWl0aXZlcyBkb24ndCBoYXZlIHByb3BlcnRpZXMgbGlrZSAucHJvdG90eXBlIHNvXFxuICAgICAgICAgIC8vIHRoZXkgYXJlbid0IHVzZWZ1bCBmb3IgYW4gYXR0YWNrLlxcbiAgICAgICAgICBlTmFtZSA9IGAke2Vyci5uYW1lfWA7XFxuICAgICAgICAgIGVNZXNzYWdlID0gYCR7ZXJyLm1lc3NhZ2V9YDtcXG4gICAgICAgICAgZVN0YWNrID0gYCR7ZXJyLnN0YWNrIHx8IGVNZXNzYWdlfWA7XFxuICAgICAgICAgIC8vIGVOYW1lL2VNZXNzYWdlL2VTdGFjayBhcmUgbm93IGNoaWxkLXJlYWxtIHByaW1pdGl2ZSBzdHJpbmdzLCBhbmRcXG4gICAgICAgICAgLy8gc2FmZSB0byBleHBvc2VcXG4gICAgICAgIH0gY2F0Y2ggKGlnbm9yZWQpIHtcXG4gICAgICAgICAgLy8gaWYgZXJyLm5hbWUudG9TdHJpbmcoKSB0aHJvd3MsIGtlZXAgdGhlIChwYXJlbnQgcmVhbG0pIEVycm9yIGF3YXlcXG4gICAgICAgICAgLy8gZnJvbSB0aGUgY2hpbGRcXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bmtub3duIGVycm9yJyk7XFxuICAgICAgICB9XFxuICAgICAgICBjb25zdCBFcnJvckNvbnN0cnVjdG9yID0gZXJyb3JDb25zdHJ1Y3RvcnMuZ2V0KGVOYW1lKSB8fCBFcnJvcjtcXG4gICAgICAgIHRyeSB7XFxuICAgICAgICAgIHRocm93IG5ldyBFcnJvckNvbnN0cnVjdG9yKGVNZXNzYWdlKTtcXG4gICAgICAgIH0gY2F0Y2ggKGVycjIpIHtcXG4gICAgICAgICAgZXJyMi5zdGFjayA9IGVTdGFjazsgLy8gcmVwbGFjZSB3aXRoIHRoZSBjYXB0dXJlZCBpbm5lciBzdGFja1xcbiAgICAgICAgICB0aHJvdyBlcnIyO1xcbiAgICAgICAgfVxcbiAgICAgIH1cXG4gICAgfVxcblxcbiAgICAvLyBXZSBtdXN0IG5vdCBhbGxvdyBvdGhlciBjaGlsZCBjb2RlIHRvIGFjY2VzcyB0aGF0IG9iamVjdC4gU0VTLmNvbmZpbmVcXG4gICAgLy8gY2xvc2VzIG92ZXIgdGhlIHBhcmVudCdzIFJlYWxtIG9iamVjdCBzbyBpdCBzaG91bGRuJ3QgYmUgYWNjZXNzaWJsZSBmcm9tXFxuICAgIC8vIHRoZSBvdXRzaWRlLlxcblxcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tcGFyYW0tcmVhc3NpZ25cXG4gICAgZ2xvYmFsLlNFUy5jb25maW5lID0gKGNvZGUsIGVuZG93bWVudHMpID0+XFxuICAgICAgY2FsbEFuZFdyYXBFcnJvcigoKSA9PiBwYXJlbnRSZWFsbS5ldmFsdWF0ZShjb2RlLCBlbmRvd21lbnRzKSk7XFxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1wYXJhbS1yZWFzc2lnblxcbiAgICBnbG9iYWwuU0VTLmNvbmZpbmVFeHByID0gKGNvZGUsIGVuZG93bWVudHMpID0+XFxuICAgICAgY2FsbEFuZFdyYXBFcnJvcigoKSA9PiBwYXJlbnRSZWFsbS5ldmFsdWF0ZShgKCR7Y29kZX0pYCwgZW5kb3dtZW50cykpO1xcbiAgfVxcblxcbiAgZXhwb3J0cy5jcmVhdGVTRVNJblRoaXNSZWFsbSA9IGNyZWF0ZVNFU0luVGhpc1JlYWxtO1xcbiAgZXhwb3J0cy5jcmVhdGVTRVNXaXRoUmVhbG1Db25zdHJ1Y3RvciA9IGNyZWF0ZVNFU1dpdGhSZWFsbUNvbnN0cnVjdG9yO1xcblxcbiAgcmV0dXJuIGV4cG9ydHM7XFxuXFxufSh7fSkpXCI7XG5cbiAgLy8gQ29weXJpZ2h0IChDKSAyMDE4IEFnb3JpY1xuXG4gIGNvbnN0IFNFUyA9IGNyZWF0ZVNFU1dpdGhSZWFsbUNvbnN0cnVjdG9yKGNyZWF0b3JTdHJpbmdzLCBSZWFsbSk7XG5cbiAgcmV0dXJuIFNFUztcblxufSkpO1xuXG4vLyBFTkQgb2YgaW5qZWN0ZWQgY29kZSBmcm9tIHNlc1xuICB9KSgpXG4gIHJldHVybiBtb2R1bGUuZXhwb3J0c1xufSkoKVxuICBjb25zdCBzZXNPcHRpb25zID0ge1xuICAgIC8vIHRoaXMgaXMgaW50cm9kdWNlcyBub24tZGV0ZXJtaW5pc20sIGJ1dCBpcyBvdGhlcndpc2Ugc2FmZVxuICAgIG1hdGhSYW5kb21Nb2RlOiAnYWxsb3cnLFxuICB9XG5cbiAgLy8gb25seSByZXZlYWwgZXJyb3Igc3RhY2tzIGluIGRlYnVnIG1vZGVcbiAgaWYgKGRlYnVnTW9kZSA9PT0gdHJ1ZSkge1xuICAgIHNlc09wdGlvbnMuZXJyb3JTdGFja01vZGUgPSAnYWxsb3cnXG4gIH1cbiAgY29uc3QgcmVhbG0gPSBTRVMubWFrZVNFU1Jvb3RSZWFsbShzZXNPcHRpb25zKVxuXG4gIC8vIGNvbmZpZyBhbmQgYnVuZGxlIG1vZHVsZSBzdG9yZVxuICBjb25zdCBsYXZhbW9hdENvbmZpZyA9IHsgcmVzb3VyY2VzOiB7fSB9XG4gIGNvbnN0IG1vZHVsZXMgPSB7fVxuXG4gIC8vIGluaXRpYWxpemUgdGhlIGtlcm5lbFxuICBjb25zdCBjcmVhdGVLZXJuZWwgPSAoZnVuY3Rpb24oKXtcblxuICByZXR1cm4gY3JlYXRlS2VybmVsXG5cbiAgZnVuY3Rpb24gY3JlYXRlS2VybmVsICh7IHJlYWxtLCBnbG9iYWxSZWYsIGRlYnVnTW9kZSwgdW5zYWZlRXZhbFdpdGhFbmRvd21lbnRzLCBsYXZhbW9hdENvbmZpZywgbG9hZE1vZHVsZURhdGEsIGdldFJlbGF0aXZlTW9kdWxlSWQgfSkge1xuICAgIC8vIGNyZWF0ZSBTRVMtd3JhcHBlZCBMYXZhTW9hdCBrZXJuZWxcbiAgICBjb25zdCBtYWtlS2VybmVsID0gcmVhbG0uZXZhbHVhdGUoYCgke3Vuc2FmZUNyZWF0ZUtlcm5lbH0pYCwgeyBjb25zb2xlIH0pXG4gICAgY29uc3QgbGF2YW1vYXRLZXJuZWwgPSBtYWtlS2VybmVsKHtcbiAgICAgIHJlYWxtLFxuICAgICAgdW5zYWZlRXZhbFdpdGhFbmRvd21lbnRzLFxuICAgICAgZ2xvYmFsUmVmLFxuICAgICAgZGVidWdNb2RlLFxuICAgICAgbGF2YW1vYXRDb25maWcsXG4gICAgICBsb2FkTW9kdWxlRGF0YSxcbiAgICAgIGdldFJlbGF0aXZlTW9kdWxlSWQsXG4gICAgfSlcblxuICAgIHJldHVybiBsYXZhbW9hdEtlcm5lbFxuICB9XG5cbiAgLy8gdGhpcyBpcyBzZXJpYWxpemVkIGFuZCBydW4gaW4gU0VTXG4gIC8vIG1vc3RseSBqdXN0IGV4aXN0cyB0byBleHBvc2UgdmFyaWFibGVzIHRvIGludGVybmFsUmVxdWlyZSBhbmQgbG9hZEJ1bmRsZVxuICBmdW5jdGlvbiB1bnNhZmVDcmVhdGVLZXJuZWwgKHtcbiAgICByZWFsbSxcbiAgICB1bnNhZmVFdmFsV2l0aEVuZG93bWVudHMsXG4gICAgZ2xvYmFsUmVmLFxuICAgIGRlYnVnTW9kZSxcbiAgICBsYXZhbW9hdENvbmZpZyxcbiAgICBsb2FkTW9kdWxlRGF0YSxcbiAgICBnZXRSZWxhdGl2ZU1vZHVsZUlkLFxuICB9KSB7XG4gICAgLy8gXCJ0ZW1wbGF0ZVJlcXVpcmVcIiBjYWxscyBhcmUgaW5saW5lZCBpbiBcImdlbmVyYXRlUHJlbHVkZVwiXG4gICAgY29uc3QgeyBnZXRFbmRvd21lbnRzRm9yQ29uZmlnIH0gPSAvLyBkZWZpbmUgbWFrZUdldEVuZG93bWVudHNGb3JDb25maWdcbihmdW5jdGlvbigpe1xuICBjb25zdCBnbG9iYWwgPSBnbG9iYWxSZWZcbiAgY29uc3QgZXhwb3J0cyA9IHt9XG4gIGNvbnN0IG1vZHVsZSA9IHsgZXhwb3J0cyB9XG4gIDsoZnVuY3Rpb24oKXtcbi8vIFNUQVJUIG9mIGluamVjdGVkIGNvZGUgZnJvbSBtYWtlR2V0RW5kb3dtZW50c0ZvckNvbmZpZ1xuLy8gdGhlIGNvbnRlbnRzIG9mIHRoaXMgZmlsZSB3aWxsIGJlIGNvcGllZCBpbnRvIHRoZSBwcmVsdWRlIHRlbXBsYXRlXG4vLyB0aGlzIG1vZHVsZSBoYXMgYmVlbiB3cml0dGVuIHNvIHRoYXQgaXQgcmVxdWlyZWQgZGlyZWN0bHkgb3IgY29waWVkIGFuZCBhZGRlZCB0byB0aGUgdGVtcGxhdGUgd2l0aCBhIHNtYWxsIHdyYXBwZXJcbm1vZHVsZS5leHBvcnRzID0gbWFrZUdldEVuZG93bWVudHNGb3JDb25maWdcblxuLy8gdXRpbGl0aWVzIGZvciBnZW5lcmF0aW5nIHRoZSBlbmRvd21lbnRzIG9iamVjdCBiYXNlZCBvbiBhIGdsb2JhbFJlZiBhbmQgYSBjb25maWdcblxuLy8gVGhlIGNvbmZpZyB1c2VzIGEgcGVyaW9kLWRlbGltaW5hdGVkIHBhdGggbm90YXRpb24gdG8gcHVsbCBvdXQgZGVlcCB2YWx1ZXMgZnJvbSBvYmplY3RzXG4vLyBUaGVzZSB1dGlsaXRpZXMgaGVscCBjcmVhdGUgYW4gb2JqZWN0IHBvcHVsYXRlZCB3aXRoIG9ubHkgdGhlIGRlZXAgcHJvcGVydGllcyBzcGVjaWZpZWQgaW4gdGhlIGNvbmZpZ1xuXG5mdW5jdGlvbiBtYWtlR2V0RW5kb3dtZW50c0ZvckNvbmZpZyAoKSB7XG4gIHJldHVybiB7XG4gICAgZ2V0RW5kb3dtZW50c0ZvckNvbmZpZyxcbiAgICBkZWVwR2V0QW5kQmluZCxcbiAgICBkZWVwR2V0LFxuICAgIGRlZXBEZWZpbmVcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEVuZG93bWVudHNGb3JDb25maWcgKGdsb2JhbFJlZiwgY29uZmlnKSB7XG4gICAgaWYgKCFjb25maWcuZ2xvYmFscykgcmV0dXJuIHt9XG4gICAgY29uc3QgZW5kb3dtZW50cyA9IHt9XG4gICAgT2JqZWN0LmVudHJpZXMoY29uZmlnLmdsb2JhbHMpLmZvckVhY2goKFtnbG9iYWxQYXRoLCBjb25maWdWYWx1ZV0pID0+IHtcbiAgICAgIGNvbnN0IHBhdGhQYXJ0cyA9IGdsb2JhbFBhdGguc3BsaXQoJy4nKVxuICAgICAgLy8gZGlzYWxsb3cgZHVuZGVyIHByb3RvIGluIHBhdGhcbiAgICAgIGNvbnN0IHBhdGhDb250YWluc0R1bmRlclByb3RvID0gcGF0aFBhcnRzLnNvbWUocGF0aFBhcnQgPT4gcGF0aFBhcnQgPT09ICdfX3Byb3RvX18nKVxuICAgICAgaWYgKHBhdGhDb250YWluc0R1bmRlclByb3RvKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTGF2YW1vYXQgLSBcIl9fcHJvdG9fX1wiIGRpc2FsbG93ZWQgaW4gZ2xvYmFscyBjb25maWcgcGF0aHMuIHNhdyBcIiR7Z2xvYmFsUGF0aH1cImApXG4gICAgICB9XG4gICAgICAvLyB3cml0ZSBhY2Nlc3MgaGFuZGxlZCBlbHNld2hlcmVcbiAgICAgIGlmIChjb25maWdWYWx1ZSA9PT0gJ3dyaXRlJykgcmV0dXJuXG4gICAgICBpZiAoY29uZmlnVmFsdWUgIT09IHRydWUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdMYXZhTW9hdCAtIHVua25vd24gdmFsdWUgZm9yIGNvbmZpZyBnbG9iYWxzJylcbiAgICAgIH1cbiAgICAgIGNvbnN0IHZhbHVlID0gZGVlcEdldEFuZEJpbmQoZ2xvYmFsUmVmLCBnbG9iYWxQYXRoKVxuICAgICAgLy8gVE9ETzogYWN0dWFsbHkgbWF0Y2ggcHJvcCBkZXNjcmlwdG9yXG4gICAgICBjb25zdCBwcm9wRGVzYyA9IHtcbiAgICAgICAgdmFsdWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGVudW1lcmFibGU6IHRydWVcbiAgICAgIH1cbiAgICAgIGRlZXBEZWZpbmUoZW5kb3dtZW50cywgZ2xvYmFsUGF0aCwgcHJvcERlc2MpXG4gICAgfSlcbiAgICByZXR1cm4gZW5kb3dtZW50c1xuICB9XG5cbiAgZnVuY3Rpb24gZGVlcEdldEFuZEJpbmQgKGdsb2JhbFJlZiwgcGF0aE5hbWUpIHtcbiAgICBjb25zdCBwYXRoUGFydHMgPSBwYXRoTmFtZS5zcGxpdCgnLicpXG4gICAgY29uc3QgcGFyZW50UGF0aCA9IHBhdGhQYXJ0cy5zbGljZSgwLCAtMSkuam9pbignLicpXG4gICAgY29uc3QgY2hpbGRLZXkgPSBwYXRoUGFydHNbcGF0aFBhcnRzLmxlbmd0aCAtIDFdXG4gICAgY29uc3QgcGFyZW50ID0gcGFyZW50UGF0aCA/IGRlZXBHZXQoZ2xvYmFsUmVmLCBwYXJlbnRQYXRoKSA6IGdsb2JhbFJlZlxuICAgIGlmICghcGFyZW50KSByZXR1cm4gcGFyZW50XG4gICAgY29uc3QgdmFsdWUgPSBwYXJlbnRbY2hpbGRLZXldXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgLy8gYmluZCBhbmQgY29weVxuICAgICAgY29uc3QgbmV3VmFsdWUgPSB2YWx1ZS5iaW5kKHBhcmVudClcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG5ld1ZhbHVlLCBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyh2YWx1ZSkpXG4gICAgICByZXR1cm4gbmV3VmFsdWVcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gcmV0dXJuIGFzIGlzXG4gICAgICByZXR1cm4gdmFsdWVcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBkZWVwR2V0IChvYmosIHBhdGhOYW1lKSB7XG4gICAgbGV0IHJlc3VsdCA9IG9ialxuICAgIHBhdGhOYW1lLnNwbGl0KCcuJykuZm9yRWFjaChwYXRoUGFydCA9PiB7XG4gICAgICBpZiAocmVzdWx0ID09PSBudWxsKSB7XG4gICAgICAgIHJlc3VsdCA9IHVuZGVmaW5lZFxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGlmIChyZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHJlc3VsdCA9IHJlc3VsdFtwYXRoUGFydF1cbiAgICB9KVxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlZXBEZWZpbmUgKG9iaiwgcGF0aE5hbWUsIHByb3BEZXNjKSB7XG4gICAgbGV0IHBhcmVudCA9IG9ialxuICAgIGNvbnN0IHBhdGhQYXJ0cyA9IHBhdGhOYW1lLnNwbGl0KCcuJylcbiAgICBjb25zdCBsYXN0UGF0aFBhcnQgPSBwYXRoUGFydHNbcGF0aFBhcnRzLmxlbmd0aCAtIDFdXG4gICAgY29uc3QgYWxsQnV0TGFzdFBhcnQgPSBwYXRoUGFydHMuc2xpY2UoMCwgLTEpXG4gICAgYWxsQnV0TGFzdFBhcnQuZm9yRWFjaChwYXRoUGFydCA9PiB7XG4gICAgICBjb25zdCBwcmV2UGFyZW50ID0gcGFyZW50XG4gICAgICBwYXJlbnQgPSBwYXJlbnRbcGF0aFBhcnRdXG4gICAgICBpZiAocGFyZW50ID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRGVlcFNldCAtIHVuYWJsZSB0byBzZXQgXCInICsgcGF0aE5hbWUgKyAnXCIgb24gbnVsbCcpXG4gICAgICB9XG4gICAgICBpZiAocGFyZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcGFyZW50ID0ge31cbiAgICAgICAgcHJldlBhcmVudFtwYXRoUGFydF0gPSBwYXJlbnRcbiAgICAgIH1cbiAgICB9KVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwYXJlbnQsIGxhc3RQYXRoUGFydCwgcHJvcERlc2MpXG4gIH1cbn1cblxuLy8gRU5EIG9mIGluamVjdGVkIGNvZGUgZnJvbSBtYWtlR2V0RW5kb3dtZW50c0ZvckNvbmZpZ1xuICB9KSgpXG4gIHJldHVybiBtb2R1bGUuZXhwb3J0c1xufSkoKSgpXG4gICAgY29uc3QgeyBwcmVwYXJlUmVhbG1HbG9iYWxGcm9tQ29uZmlnIH0gPSAvLyBkZWZpbmUgbWFrZVByZXBhcmVSZWFsbUdsb2JhbEZyb21Db25maWdcbihmdW5jdGlvbigpe1xuICBjb25zdCBnbG9iYWwgPSBnbG9iYWxSZWZcbiAgY29uc3QgZXhwb3J0cyA9IHt9XG4gIGNvbnN0IG1vZHVsZSA9IHsgZXhwb3J0cyB9XG4gIDsoZnVuY3Rpb24oKXtcbi8vIFNUQVJUIG9mIGluamVjdGVkIGNvZGUgZnJvbSBtYWtlUHJlcGFyZVJlYWxtR2xvYmFsRnJvbUNvbmZpZ1xuLy8gdGhlIGNvbnRlbnRzIG9mIHRoaXMgZmlsZSB3aWxsIGJlIGNvcGllZCBpbnRvIHRoZSBwcmVsdWRlIHRlbXBsYXRlXG4vLyB0aGlzIG1vZHVsZSBoYXMgYmVlbiB3cml0dGVuIHNvIHRoYXQgaXQgcmVxdWlyZWQgZGlyZWN0bHkgb3IgY29waWVkIGFuZCBhZGRlZCB0byB0aGUgdGVtcGxhdGUgd2l0aCBhIHNtYWxsIHdyYXBwZXJcbm1vZHVsZS5leHBvcnRzID0gbWFrZVByZXBhcmVSZWFsbUdsb2JhbEZyb21Db25maWdcblxuLy8gdXRpbGl0aWVzIGZvciBleHBvc2luZyBjb25maWd1cmluZyB0aGUgZXhwb3NlZCBlbmRvd21lbnRzIG9uIHRoZSBjb250YWluZXIgZ2xvYmFsXG5cbi8vIFRoZSBjb25maWcgdXNlcyBhIHBlcmlvZC1kZWxpbWluYXRlZCBwYXRoIG5vdGF0aW9uIHRvIHB1bGwgb3V0IGRlZXAgdmFsdWVzIGZyb20gb2JqZWN0c1xuLy8gVGhlc2UgdXRpbGl0aWVzIGhlbHAgbW9kaWZ5IHRoZSBjb250YWluZXIgZ2xvYmFsIHRvIGV4cG9zZSB0aGUgYWxsb3dlZCBnbG9iYWxzIGZyb20gdGhlIGdsb2JhbFN0b3JlIE9SIHRoZSBwbGF0Zm9ybSBnbG9iYWxcblxuZnVuY3Rpb24gbWFrZVByZXBhcmVSZWFsbUdsb2JhbEZyb21Db25maWcgKCkge1xuICByZXR1cm4ge1xuICAgIHByZXBhcmVSZWFsbUdsb2JhbEZyb21Db25maWcsXG4gICAgZ2V0VG9wTGV2ZWxSZWFkQWNjZXNzRnJvbVBhY2thZ2VDb25maWcsXG4gICAgZ2V0VG9wTGV2ZWxXcml0ZUFjY2Vzc0Zyb21QYWNrYWdlQ29uZmlnXG4gIH1cblxuICBmdW5jdGlvbiBnZXRUb3BMZXZlbFJlYWRBY2Nlc3NGcm9tUGFja2FnZUNvbmZpZyAoZ2xvYmFsc0NvbmZpZykge1xuICAgIGNvbnN0IHJlc3VsdCA9IE9iamVjdC5lbnRyaWVzKGdsb2JhbHNDb25maWcpXG4gICAgICAuZmlsdGVyKChba2V5LCB2YWx1ZV0pID0+IHZhbHVlID09PSAncmVhZCcgfHwgdmFsdWUgPT09IHRydWUgfHwgKHZhbHVlID09PSAnd3JpdGUnICYmIGtleS5zcGxpdCgnLicpLmxlbmd0aCA+IDEpKVxuICAgICAgLm1hcCgoW2tleV0pID0+IGtleS5zcGxpdCgnLicpWzBdKVxuICAgIC8vIHJldHVybiB1bmlxdWUgYXJyYXlcbiAgICByZXR1cm4gQXJyYXkuZnJvbShuZXcgU2V0KHJlc3VsdCkpXG4gIH1cblxuICBmdW5jdGlvbiBnZXRUb3BMZXZlbFdyaXRlQWNjZXNzRnJvbVBhY2thZ2VDb25maWcgKGdsb2JhbHNDb25maWcpIHtcbiAgICBjb25zdCByZXN1bHQgPSBPYmplY3QuZW50cmllcyhnbG9iYWxzQ29uZmlnKVxuICAgICAgLmZpbHRlcigoW2tleSwgdmFsdWVdKSA9PiB2YWx1ZSA9PT0gJ3dyaXRlJyAmJiBrZXkuc3BsaXQoJy4nKS5sZW5ndGggPT09IDEpXG4gICAgICAubWFwKChba2V5XSkgPT4ga2V5KVxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIGZ1bmN0aW9uIHByZXBhcmVSZWFsbUdsb2JhbEZyb21Db25maWcgKG1vZHVsZVJlYWxtR2xvYmFsLCBnbG9iYWxzQ29uZmlnLCBlbmRvd21lbnRzLCBnbG9iYWxTdG9yZSkge1xuICAgIC8vIGxvb2t1cCB0b3AgbGV2ZWwgcmVhZCArIHdyaXRlIGFjY2VzcyBrZXlzXG4gICAgY29uc3QgdG9wTGV2ZWxXcml0ZUFjY2Vzc0tleXMgPSBnZXRUb3BMZXZlbFdyaXRlQWNjZXNzRnJvbVBhY2thZ2VDb25maWcoZ2xvYmFsc0NvbmZpZylcbiAgICBjb25zdCB0b3BMZXZlbFJlYWRBY2Nlc3NLZXlzID0gZ2V0VG9wTGV2ZWxSZWFkQWNjZXNzRnJvbVBhY2thZ2VDb25maWcoZ2xvYmFsc0NvbmZpZylcbiAgICBjb25zdCBnbG9iYWxUaGlzUmVmcyA9IFsnc2VsZicsICd3aW5kb3cnLCAnZ2xvYmFsVGhpcycsICdnbG9iYWwnXVxuXG4gICAgLy8gZGVmaW5lIGFjY2Vzc29yc1xuXG4gICAgLy8gYWxsb3cgcmVhZCBhY2Nlc3MgdmlhIGdsb2JhbFN0b3JlIG9yIG1vZHVsZVJlYWxtR2xvYmFsXG4gICAgdG9wTGV2ZWxSZWFkQWNjZXNzS2V5cy5mb3JFYWNoKGtleSA9PiB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobW9kdWxlUmVhbG1HbG9iYWwsIGtleSwge1xuICAgICAgICBnZXQgKCkge1xuICAgICAgICAgIGlmIChnbG9iYWxTdG9yZS5oYXMoa2V5KSkge1xuICAgICAgICAgICAgcmV0dXJuIGdsb2JhbFN0b3JlLmdldChrZXkpXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBlbmRvd21lbnRzW2tleV1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNldCAoKSB7XG4gICAgICAgICAgLy8gVE9ETzogdGhlcmUgc2hvdWxkIGJlIGEgY29uZmlnIHRvIHRocm93IHZzIHNpbGVudGx5IGlnbm9yZVxuICAgICAgICAgIGNvbnNvbGUud2FybihgTGF2YU1vYXQ6IGlnbm9yaW5nIHdyaXRlIGF0dGVtcHQgdG8gcmVhZC1hY2Nlc3MgZ2xvYmFsIFwiJHtrZXl9XCJgKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pXG5cbiAgICAvLyBhbGxvdyB3cml0ZSBhY2Nlc3MgdG8gZ2xvYmFsU3RvcmVcbiAgICAvLyByZWFkIGFjY2VzcyB2aWEgZ2xvYmFsU3RvcmUgb3IgbW9kdWxlUmVhbG1HbG9iYWxcbiAgICB0b3BMZXZlbFdyaXRlQWNjZXNzS2V5cy5mb3JFYWNoKGtleSA9PiB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobW9kdWxlUmVhbG1HbG9iYWwsIGtleSwge1xuICAgICAgICBnZXQgKCkge1xuICAgICAgICAgIGlmIChnbG9iYWxTdG9yZS5oYXMoa2V5KSkge1xuICAgICAgICAgICAgcmV0dXJuIGdsb2JhbFN0b3JlLmdldChrZXkpXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBlbmRvd21lbnRzW2tleV1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNldCAodmFsdWUpIHtcbiAgICAgICAgICBnbG9iYWxTdG9yZS5zZXQoa2V5LCB2YWx1ZSlcbiAgICAgICAgfSxcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICAvLyBzZXQgY2lyY3VsYXIgZ2xvYmFsUmVmc1xuICAgIGdsb2JhbFRoaXNSZWZzLmZvckVhY2goa2V5ID0+IHtcbiAgICAgIC8vIGlmIGdsb2JhbFJlZiBpcyBhY3R1YWxseSBhbiBlbmRvd21lbnQsIGlnbm9yZVxuICAgICAgaWYgKHRvcExldmVsUmVhZEFjY2Vzc0tleXMuaW5jbHVkZXMoa2V5KSkgcmV0dXJuXG4gICAgICBpZiAodG9wTGV2ZWxXcml0ZUFjY2Vzc0tleXMuaW5jbHVkZXMoa2V5KSkgcmV0dXJuXG4gICAgICAvLyBzZXQgY2lyY3VsYXIgcmVmIHRvIGdsb2JhbFxuICAgICAgbW9kdWxlUmVhbG1HbG9iYWxba2V5XSA9IG1vZHVsZVJlYWxtR2xvYmFsXG4gICAgfSlcbiAgICAvLyBzdXBwb3J0IGNlcnRhaW4gZ2xvYmFsVGhpcyBnZXR0ZXJzXG4gICAgY29uc3Qgb3JpZ0Z1bmN0aW9uID0gbW9kdWxlUmVhbG1HbG9iYWwuRnVuY3Rpb25cbiAgICBjb25zdCBuZXdGdW5jdGlvbiA9IChzcmMpID0+IHtcbiAgICAgIHJldHVybiBvcmlnRnVuY3Rpb24oc3JjKS5iaW5kKG1vZHVsZVJlYWxtR2xvYmFsKVxuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhuZXdGdW5jdGlvbiwgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMob3JpZ0Z1bmN0aW9uKSlcbiAgICBtb2R1bGVSZWFsbUdsb2JhbC5GdW5jdGlvbiA9IG5ld0Z1bmN0aW9uXG4gIH1cbn1cblxuLy8gRU5EIG9mIGluamVjdGVkIGNvZGUgZnJvbSBtYWtlUHJlcGFyZVJlYWxtR2xvYmFsRnJvbUNvbmZpZ1xuICB9KSgpXG4gIHJldHVybiBtb2R1bGUuZXhwb3J0c1xufSkoKSgpXG4gICAgY29uc3QgeyBNZW1icmFuZSB9ID0gLy8gZGVmaW5lIGN5dG9wbGFzbVxuKGZ1bmN0aW9uKCl7XG4gIGNvbnN0IGdsb2JhbCA9IGdsb2JhbFJlZlxuICBjb25zdCBleHBvcnRzID0ge31cbiAgY29uc3QgbW9kdWxlID0geyBleHBvcnRzIH1cbiAgOyhmdW5jdGlvbigpe1xuLy8gU1RBUlQgb2YgaW5qZWN0ZWQgY29kZSBmcm9tIGN5dG9wbGFzbVxuKGZ1bmN0aW9uKGYpe2lmKHR5cGVvZiBleHBvcnRzPT09XCJvYmplY3RcIiYmdHlwZW9mIG1vZHVsZSE9PVwidW5kZWZpbmVkXCIpe21vZHVsZS5leHBvcnRzPWYoKX1lbHNlIGlmKHR5cGVvZiBkZWZpbmU9PT1cImZ1bmN0aW9uXCImJmRlZmluZS5hbWQpe2RlZmluZShbXSxmKX1lbHNle3ZhciBnO2lmKHR5cGVvZiB3aW5kb3chPT1cInVuZGVmaW5lZFwiKXtnPXdpbmRvd31lbHNlIGlmKHR5cGVvZiBnbG9iYWwhPT1cInVuZGVmaW5lZFwiKXtnPWdsb2JhbH1lbHNlIGlmKHR5cGVvZiBzZWxmIT09XCJ1bmRlZmluZWRcIil7Zz1zZWxmfWVsc2V7Zz10aGlzfWcuTWVtYnJhbmUgPSBmKCl9fSkoZnVuY3Rpb24oKXt2YXIgZGVmaW5lLG1vZHVsZSxleHBvcnRzO3JldHVybiAoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpKHsxOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5hc3NlcnQgPSBhc3NlcnQ7XG5cbmZ1bmN0aW9uIGFzc2VydChjb25kaXRpb24sIGVycm9yTWVzc2FnZSkge1xuICBpZiAoIWNvbmRpdGlvbikge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoZXJyb3JNZXNzYWdlKTtcbiAgfVxufVxufSx7fV0sMjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuY2hlY2tBbm9uSW50cmluc2ljcyA9IGNoZWNrQW5vbkludHJpbnNpY3M7XG5cbnZhciBfYXNzZXJ0ID0gcmVxdWlyZShcIi4vYXNzZXJ0LmpzXCIpO1xuXG5jb25zdCB7XG4gIGdldFByb3RvdHlwZU9mOiBfZ2V0UHJvdG90eXBlT2Zcbn0gPSBPYmplY3Q7XG5cbmZ1bmN0aW9uIGdldFByb3RvdHlwZU9mIChvYmopIHtcbiAgcmV0dXJuIG9iaiAmJiBfZ2V0UHJvdG90eXBlT2Yob2JqKVxufVxuLyoqXG4gKiBjaGVja0Fub25JbnRyaW5zaWNzKClcbiAqIEVuc3VyZSB0aGF0IHRoZSByb290QW5vbkludHJpbnNpY3MgYXJlIGNvbnNpc3RlbnQgd2l0aCBzcGVjcy4gVGhlc2VcbiAqIHRlc3RzIGFyZSBuZWNlc2FyeSB0byBlbnN1cmUgdGhhdCBzYW1wbGluZyB3YXMgY29ycmVjdGx5IGRvbmUuXG4gKi9cblxuZnVuY3Rpb24gY2hlY2tBbm9uSW50cmluc2ljcyhpbnRyaW5zaWNzKSB7XG4gIGNvbnN0IHtcbiAgICBGdW5jdGlvblByb3RvdHlwZUNvbnN0cnVjdG9yLFxuICAgIEFycmF5SXRlcmF0b3JQcm90b3R5cGUsXG4gICAgQXN5bmNGdW5jdGlvbixcbiAgICBBc3luY0dlbmVyYXRvcixcbiAgICBBc3luY0dlbmVyYXRvckZ1bmN0aW9uLFxuICAgIEFzeW5jR2VuZXJhdG9yUHJvdG90eXBlLFxuICAgIEFzeW5jSXRlcmF0b3JQcm90b3R5cGUsXG4gICAgR2VuZXJhdG9yLFxuICAgIEdlbmVyYXRvckZ1bmN0aW9uLFxuICAgIEl0ZXJhdG9yUHJvdG90eXBlLFxuICAgIE1hcEl0ZXJhdG9yUHJvdG90eXBlLFxuICAgIFJlZ0V4cFN0cmluZ0l0ZXJhdG9yUHJvdG90eXBlLFxuICAgIFNldEl0ZXJhdG9yUHJvdG90eXBlLFxuICAgIFN0cmluZ0l0ZXJhdG9yUHJvdG90eXBlLFxuICAgIFRocm93VHlwZUVycm9yLFxuICAgIFR5cGVkQXJyYXlcbiAgfSA9IGludHJpbnNpY3M7IC8vIDkuMi40LjEgJVRocm93VHlwZUVycm9yJVxuXG4gICgwLCBfYXNzZXJ0LmFzc2VydCkoZ2V0UHJvdG90eXBlT2YoVGhyb3dUeXBlRXJyb3IpID09PSBGdW5jdGlvbi5wcm90b3R5cGUsICdUaHJvd1R5cGVFcnJvci5fX3Byb3RvX18gc2hvdWxkIGJlIEZ1bmN0aW9uLnByb3RvdHlwZScpOyAvLyAyMS4xLjUuMiBUaGUgJVN0cmluZ0l0ZXJhdG9yUHJvdG90eXBlJSBPYmplY3RcblxuICAoMCwgX2Fzc2VydC5hc3NlcnQpKGdldFByb3RvdHlwZU9mKFN0cmluZ0l0ZXJhdG9yUHJvdG90eXBlKSA9PT0gSXRlcmF0b3JQcm90b3R5cGUsICdTdHJpbmdJdGVyYXRvclByb3RvdHlwZS5fX3Byb3RvX18gc2hvdWxkIGJlIEl0ZXJhdG9yUHJvdG90eXBlJyk7IC8vIDIxLjIuNy4xIFRoZSAlUmVnRXhwU3RyaW5nSXRlcmF0b3JQcm90b3R5cGUlIE9iamVjdFxuXG4gIC8vICgwLCBfYXNzZXJ0LmFzc2VydCkoZ2V0UHJvdG90eXBlT2YoUmVnRXhwU3RyaW5nSXRlcmF0b3JQcm90b3R5cGUpID09PSBJdGVyYXRvclByb3RvdHlwZSwgJ1JlZ0V4cFN0cmluZ0l0ZXJhdG9yUHJvdG90eXBlLl9fcHJvdG9fXyBzaG91bGQgYmUgSXRlcmF0b3JQcm90b3R5cGUnKTsgLy8gMjIuMi4xIFRoZSAlVHlwZWRBcnJheSUgSW50cmluc2ljIE9iamVjdFxuICAvLyBodHRwOi8vYmVzcGluLmN6L35vbmRyYXMvaHRtbC9jbGFzc3Y4XzFfMUFycmF5QnVmZmVyVmlldy5odG1sXG4gIC8vIGhhcyBtZSB3b3JyaWVkIHRoYXQgc29tZW9uZSBtaWdodCBtYWtlIHN1Y2ggYW4gaW50ZXJtZWRpYXRlXG4gIC8vIG9iamVjdCB2aXNpYmxlLlxuXG4gICgwLCBfYXNzZXJ0LmFzc2VydCkoZ2V0UHJvdG90eXBlT2YoVHlwZWRBcnJheSkgPT09IEZ1bmN0aW9uLnByb3RvdHlwZSwgJ1R5cGVkQXJyYXkuX19wcm90b19fIHNob3VsZCBiZSBGdW5jdGlvbi5wcm90b3R5cGUnKTsgLy8gMjMuMS41LjIgVGhlICVNYXBJdGVyYXRvclByb3RvdHlwZSUgT2JqZWN0XG5cbiAgKDAsIF9hc3NlcnQuYXNzZXJ0KShnZXRQcm90b3R5cGVPZihNYXBJdGVyYXRvclByb3RvdHlwZSkgPT09IEl0ZXJhdG9yUHJvdG90eXBlLCAnTWFwSXRlcmF0b3JQcm90b3R5cGUuX19wcm90b19fIHNob3VsZCBiZSBJdGVyYXRvclByb3RvdHlwZScpOyAvLyAyMy4yLjUuMiBUaGUgJVNldEl0ZXJhdG9yUHJvdG90eXBlJSBPYmplY3RcblxuICAoMCwgX2Fzc2VydC5hc3NlcnQpKGdldFByb3RvdHlwZU9mKFNldEl0ZXJhdG9yUHJvdG90eXBlKSA9PT0gSXRlcmF0b3JQcm90b3R5cGUsICdTZXRJdGVyYXRvclByb3RvdHlwZS5fX3Byb3RvX18gc2hvdWxkIGJlIEl0ZXJhdG9yUHJvdG90eXBlJyk7IC8vIDI1LjEuMiBUaGUgJUl0ZXJhdG9yUHJvdG90eXBlJSBPYmplY3RcblxuICAoMCwgX2Fzc2VydC5hc3NlcnQpKGdldFByb3RvdHlwZU9mKEl0ZXJhdG9yUHJvdG90eXBlKSA9PT0gT2JqZWN0LnByb3RvdHlwZSwgJ0l0ZXJhdG9yUHJvdG90eXBlLl9fcHJvdG9fXyBzaG91bGQgYmUgT2JqZWN0LnByb3RvdHlwZScpOyAvLyAyNS4xLjMgVGhlICVBc3luY0l0ZXJhdG9yUHJvdG90eXBlJSBPYmplY3RcblxuICAoMCwgX2Fzc2VydC5hc3NlcnQpKGdldFByb3RvdHlwZU9mKEFzeW5jSXRlcmF0b3JQcm90b3R5cGUpID09PSBPYmplY3QucHJvdG90eXBlLCAnQXN5bmNJdGVyYXRvclByb3RvdHlwZS5fX3Byb3RvX18gc2hvdWxkIGJlIE9iamVjdC5wcm90b3R5cGUnKTsgLy8gMjIuMS41LjIgVGhlICVBcnJheUl0ZXJhdG9yUHJvdG90eXBlJSBPYmplY3RcblxuICAoMCwgX2Fzc2VydC5hc3NlcnQpKGdldFByb3RvdHlwZU9mKEFycmF5SXRlcmF0b3JQcm90b3R5cGUpID09PSBJdGVyYXRvclByb3RvdHlwZSwgJ0FzeW5jSXRlcmF0b3JQcm90b3R5cGUuX19wcm90b19fIHNob3VsZCBiZSBJdGVyYXRvclByb3RvdHlwZScpOyAvLyAyNS4yLjIgUHJvcGVydGllcyBvZiB0aGUgR2VuZXJhdG9yRnVuY3Rpb24gQ29uc3RydWN0b3JcbiAgLy8gVXNlIEZ1bmN0aW9uLnByb3RvdHlwZS5jb25zdHJ1Y3RvciBpbiBjYXNlIEZ1bmN0aW9uIGhhcyBiZWVuIHRhbWVkXG5cbiAgKDAsIF9hc3NlcnQuYXNzZXJ0KShnZXRQcm90b3R5cGVPZihHZW5lcmF0b3JGdW5jdGlvbikgPT09IEZ1bmN0aW9uUHJvdG90eXBlQ29uc3RydWN0b3IsICdHZW5lcmF0b3JGdW5jdGlvbi5fX3Byb3RvX18gc2hvdWxkIGJlIEZ1bmN0aW9uJyk7XG4gICgwLCBfYXNzZXJ0LmFzc2VydCkoR2VuZXJhdG9yRnVuY3Rpb24ubmFtZSA9PT0gJ0dlbmVyYXRvckZ1bmN0aW9uJywgJ0dlbmVyYXRvckZ1bmN0aW9uLm5hbWUgc2hvdWxkIGJlIFwiR2VuZXJhdG9yRnVuY3Rpb25cIicpOyAvLyAyNS4yLjMgUHJvcGVydGllcyBvZiB0aGUgR2VuZXJhdG9yRnVuY3Rpb24gUHJvdG90eXBlIE9iamVjdFxuXG4gICgwLCBfYXNzZXJ0LmFzc2VydCkoZ2V0UHJvdG90eXBlT2YoR2VuZXJhdG9yKSA9PT0gRnVuY3Rpb24ucHJvdG90eXBlLCAnR2VuZXJhdG9yLl9fcHJvdG9fXyBzaG91bGQgYmUgRnVuY3Rpb24ucHJvdG90eXBlJyk7IC8vIDI1LjMuMSBUaGUgQXN5bmNHZW5lcmF0b3JGdW5jdGlvbiBDb25zdHJ1Y3RvclxuICAvLyBVc2UgRnVuY3Rpb24ucHJvdG90eXBlLmNvbnN0cnVjdG9yIGluIGNhc2UgRnVuY3Rpb24gaGFzIGJlZW4gdGFtZWRcblxuICAoMCwgX2Fzc2VydC5hc3NlcnQpKGdldFByb3RvdHlwZU9mKEFzeW5jR2VuZXJhdG9yRnVuY3Rpb24pID09PSBGdW5jdGlvblByb3RvdHlwZUNvbnN0cnVjdG9yLCAnQXN5bmNHZW5lcmF0b3JGdW5jdGlvbi5fX3Byb3RvX18gc2hvdWxkIGJlIEZ1bmN0aW9uJyk7XG4gICgwLCBfYXNzZXJ0LmFzc2VydCkoQXN5bmNHZW5lcmF0b3JGdW5jdGlvbi5uYW1lID09PSAnQXN5bmNHZW5lcmF0b3JGdW5jdGlvbicsICdBc3luY0dlbmVyYXRvckZ1bmN0aW9uLm5hbWUgc2hvdWxkIGJlIFwiQXN5bmNHZW5lcmF0b3JGdW5jdGlvblwiJyk7IC8vIDI1LjMuMyBQcm9wZXJ0aWVzIG9mIHRoZSBBc3luY0dlbmVyYXRvckZ1bmN0aW9uIFByb3RvdHlwZSBPYmplY3RcblxuICAoMCwgX2Fzc2VydC5hc3NlcnQpKGdldFByb3RvdHlwZU9mKEFzeW5jR2VuZXJhdG9yKSA9PT0gRnVuY3Rpb24ucHJvdG90eXBlLCAnQXN5bmNHZW5lcmF0b3IuX19wcm90b19fIHNob3VsZCBiZSBGdW5jdGlvbi5wcm90b3R5cGUnKTsgLy8gMjUuNS4xIFByb3BlcnRpZXMgb2YgdGhlIEFzeW5jR2VuZXJhdG9yIFByb3RvdHlwZSBPYmplY3RcblxuICAoMCwgX2Fzc2VydC5hc3NlcnQpKGdldFByb3RvdHlwZU9mKEFzeW5jR2VuZXJhdG9yUHJvdG90eXBlKSA9PT0gQXN5bmNJdGVyYXRvclByb3RvdHlwZSwgJ0FzeW5jR2VuZXJhdG9yUHJvdG90eXBlLl9fcHJvdG9fXyBzaG91bGQgYmUgQXN5bmNJdGVyYXRvclByb3RvdHlwZScpOyAvLyAyNS43LjEgVGhlIEFzeW5jRnVuY3Rpb24gQ29uc3RydWN0b3JcbiAgLy8gVXNlIEZ1bmN0aW9uLnByb3RvdHlwZS5jb25zdHJ1Y3RvciBpbiBjYXNlIEZ1bmN0aW9uIGhhcyBiZWVuIHRhbWVkXG5cbiAgKDAsIF9hc3NlcnQuYXNzZXJ0KShnZXRQcm90b3R5cGVPZihBc3luY0Z1bmN0aW9uKSA9PT0gRnVuY3Rpb25Qcm90b3R5cGVDb25zdHJ1Y3RvciwgJ0FzeW5jRnVuY3Rpb24uX19wcm90b19fIHNob3VsZCBiZSBGdW5jdGlvbicpO1xuICAoMCwgX2Fzc2VydC5hc3NlcnQpKEFzeW5jRnVuY3Rpb24ubmFtZSA9PT0gJ0FzeW5jRnVuY3Rpb24nLCAnQXN5bmNGdW5jdGlvbi5uYW1lIHNob3VsZCBiZSBcIkFzeW5jRnVuY3Rpb25cIicpO1xufVxufSx7XCIuL2Fzc2VydC5qc1wiOjF9XSwzOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5jaGVja0ludHJpbnNpY3MgPSBjaGVja0ludHJpbnNpY3M7XG5cbi8qKlxuICogY2hlY2tJbnRyaW5zaWNzKClcbiAqIEVuc3VyZSB0aGF0IHRoZSBpbnRyaW5zaWNzIGFyZSBjb25zaXN0ZW50IHdpdGggZGVmaW5lZC5cbiAqL1xuZnVuY3Rpb24gY2hlY2tJbnRyaW5zaWNzKGludHJpbnNpY3MpIHtcbiAgT2JqZWN0LmtleXMoaW50cmluc2ljcykuZm9yRWFjaChuYW1lID0+IHtcbiAgICBpZiAoaW50cmluc2ljc1tuYW1lXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBNYWxmb3JtZWQgaW50cmluc2ljOiAke25hbWV9YCk7XG4gICAgfVxuICB9KTtcbn1cbn0se31dLDQ6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmdldEFub255bW91c0ludHJpbnNpY3MgPSBnZXRBbm9ueW1vdXNJbnRyaW5zaWNzO1xuY29uc3Qge1xuICBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IsXG4gIGdldFByb3RvdHlwZU9mXG59ID0gT2JqZWN0O1xuLyoqXG4gKiBPYmplY3QuZ2V0Q29uc3RydWN0b3JPZigpXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG8gaW1wcm92ZSByZWFkYWJpbGl0eSwgc2ltaWxhciB0byBPYmplY3QuZ2V0UHJvdG90eXBlT2YoKS5cbiAqL1xuXG5mdW5jdGlvbiBnZXRDb25zdHJ1Y3Rvck9mKG9iaikge1xuICByZXR1cm4gZ2V0UHJvdG90eXBlT2Yob2JqKS5jb25zdHJ1Y3Rvcjtcbn1cbi8qKlxuICogZ2V0QW5vbnltb3VzSW50cmluc2ljcygpXG4gKiBHZXQgdGhlIGludHJpbnNpY3Mgbm90IG90aGVyd2lzZSByZWFjaGFibGUgYnkgbmFtZWQgb3duIHByb3BlcnR5XG4gKiB0cmF2ZXJzYWwgZnJvbSB0aGUgZ2xvYmFsIG9iamVjdC5cbiAqL1xuXG5cbmZ1bmN0aW9uIGdldEFub255bW91c0ludHJpbnNpY3MoKSB7XG4gIGNvbnN0IEZ1bmN0aW9uUHJvdG90eXBlQ29uc3RydWN0b3IgPSBGdW5jdGlvbi5wcm90b3R5cGUuY29uc3RydWN0b3I7XG4gIGNvbnN0IFN5bWJvbEl0ZXJhdG9yID0gdHlwZW9mIFN5bWJvbCAmJiBTeW1ib2wuaXRlcmF0b3IgfHwgJ0BAaXRlcmF0b3InO1xuICBjb25zdCBTeW1ib2xNYXRjaEFsbCA9IHR5cGVvZiBTeW1ib2wgJiYgU3ltYm9sLm1hdGNoQWxsIHx8ICdAQG1hdGNoQWxsJzsgLy8gOS4yLjQuMSAlVGhyb3dUeXBlRXJyb3IlXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBwcmVmZXItcmVzdC1wYXJhbXNcblxuICBjb25zdCBUaHJvd1R5cGVFcnJvciA9IGdldE93blByb3BlcnR5RGVzY3JpcHRvcihhcmd1bWVudHMsICdjYWxsZWUnKS5nZXQ7IC8vIDIxLjEuNS4yIFRoZSAlU3RyaW5nSXRlcmF0b3JQcm90b3R5cGUlIE9iamVjdFxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tbmV3LXdyYXBwZXJzXG5cbiAgY29uc3QgU3RyaW5nSXRlcmF0b3JPYmplY3QgPSBuZXcgU3RyaW5nKClbU3ltYm9sSXRlcmF0b3JdKCk7XG4gIGNvbnN0IFN0cmluZ0l0ZXJhdG9yUHJvdG90eXBlID0gZ2V0UHJvdG90eXBlT2YoU3RyaW5nSXRlcmF0b3JPYmplY3QpOyAvLyAyMS4yLjcuMSBUaGUgJVJlZ0V4cFN0cmluZ0l0ZXJhdG9yUHJvdG90eXBlJSBPYmplY3RcblxuICBsZXQgUmVnRXhwU3RyaW5nSXRlcmF0b3IsIFJlZ0V4cFN0cmluZ0l0ZXJhdG9yUHJvdG90eXBlXG4gIHRyeSB7XG4gICAgUmVnRXhwU3RyaW5nSXRlcmF0b3IgPSBuZXcgUmVnRXhwKClbU3ltYm9sTWF0Y2hBbGxdKCk7XG4gICAgUmVnRXhwU3RyaW5nSXRlcmF0b3JQcm90b3R5cGUgPSBnZXRQcm90b3R5cGVPZihSZWdFeHBTdHJpbmdJdGVyYXRvcik7IC8vIDIyLjEuNS4yIFRoZSAlQXJyYXlJdGVyYXRvclByb3RvdHlwZSUgT2JqZWN0XG4gIH0gY2F0Y2ggKF8pIHt9XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1hcnJheS1jb25zdHJ1Y3RvclxuXG4gIGNvbnN0IEFycmF5SXRlcmF0b3JPYmplY3QgPSBuZXcgQXJyYXkoKVtTeW1ib2xJdGVyYXRvcl0oKTtcbiAgY29uc3QgQXJyYXlJdGVyYXRvclByb3RvdHlwZSA9IGdldFByb3RvdHlwZU9mKEFycmF5SXRlcmF0b3JPYmplY3QpOyAvLyAyMi4yLjEgVGhlICVUeXBlZEFycmF5JSBJbnRyaW5zaWMgT2JqZWN0XG5cbiAgY29uc3QgVHlwZWRBcnJheSA9IGdldFByb3RvdHlwZU9mKEZsb2F0MzJBcnJheSk7IC8vIDIzLjEuNS4yIFRoZSAlTWFwSXRlcmF0b3JQcm90b3R5cGUlIE9iamVjdFxuXG4gIGNvbnN0IE1hcEl0ZXJhdG9yT2JqZWN0ID0gbmV3IE1hcCgpW1N5bWJvbEl0ZXJhdG9yXSgpO1xuICBjb25zdCBNYXBJdGVyYXRvclByb3RvdHlwZSA9IGdldFByb3RvdHlwZU9mKE1hcEl0ZXJhdG9yT2JqZWN0KTsgLy8gMjMuMi41LjIgVGhlICVTZXRJdGVyYXRvclByb3RvdHlwZSUgT2JqZWN0XG5cbiAgY29uc3QgU2V0SXRlcmF0b3JPYmplY3QgPSBuZXcgU2V0KClbU3ltYm9sSXRlcmF0b3JdKCk7XG4gIGNvbnN0IFNldEl0ZXJhdG9yUHJvdG90eXBlID0gZ2V0UHJvdG90eXBlT2YoU2V0SXRlcmF0b3JPYmplY3QpOyAvLyAyNS4xLjIgVGhlICVJdGVyYXRvclByb3RvdHlwZSUgT2JqZWN0XG5cbiAgY29uc3QgSXRlcmF0b3JQcm90b3R5cGUgPSBnZXRQcm90b3R5cGVPZihBcnJheUl0ZXJhdG9yUHJvdG90eXBlKTsgLy8gMjUuMi4xIFRoZSBHZW5lcmF0b3JGdW5jdGlvbiBDb25zdHJ1Y3RvclxuXG4gIGZ1bmN0aW9uKiBHZW5lcmF0b3JGdW5jdGlvbkluc3RhbmNlKCkge30gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1lbXB0eS1mdW5jdGlvblxuXG5cbiAgY29uc3QgR2VuZXJhdG9yRnVuY3Rpb24gPSBnZXRDb25zdHJ1Y3Rvck9mKEdlbmVyYXRvckZ1bmN0aW9uSW5zdGFuY2UpOyAvLyAyNS4yLjMgUHJvcGVydGllcyBvZiB0aGUgR2VuZXJhdG9yRnVuY3Rpb24gUHJvdG90eXBlIE9iamVjdFxuXG4gIGNvbnN0IEdlbmVyYXRvciA9IEdlbmVyYXRvckZ1bmN0aW9uLnByb3RvdHlwZTsgLy8gMjUuMy4xIFRoZSBBc3luY0dlbmVyYXRvckZ1bmN0aW9uIENvbnN0cnVjdG9yXG5cbiAgYXN5bmMgZnVuY3Rpb24qIEFzeW5jR2VuZXJhdG9yRnVuY3Rpb25JbnN0YW5jZSgpIHt9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZW1wdHktZnVuY3Rpb25cblxuXG4gIGNvbnN0IEFzeW5jR2VuZXJhdG9yRnVuY3Rpb24gPSBnZXRDb25zdHJ1Y3Rvck9mKEFzeW5jR2VuZXJhdG9yRnVuY3Rpb25JbnN0YW5jZSk7IC8vIDI1LjMuMi4yIEFzeW5jR2VuZXJhdG9yRnVuY3Rpb24ucHJvdG90eXBlXG5cbiAgY29uc3QgQXN5bmNHZW5lcmF0b3IgPSBBc3luY0dlbmVyYXRvckZ1bmN0aW9uLnByb3RvdHlwZTsgLy8gMjUuNS4xIFByb3BlcnRpZXMgb2YgdGhlIEFzeW5jR2VuZXJhdG9yIFByb3RvdHlwZSBPYmplY3RcblxuICBjb25zdCBBc3luY0dlbmVyYXRvclByb3RvdHlwZSA9IEFzeW5jR2VuZXJhdG9yLnByb3RvdHlwZTtcbiAgY29uc3QgQXN5bmNJdGVyYXRvclByb3RvdHlwZSA9IGdldFByb3RvdHlwZU9mKEFzeW5jR2VuZXJhdG9yUHJvdG90eXBlKTsgLy8gMjUuNy4xIFRoZSBBc3luY0Z1bmN0aW9uIENvbnN0cnVjdG9yXG5cbiAgYXN5bmMgZnVuY3Rpb24gQXN5bmNGdW5jdGlvbkluc3RhbmNlKCkge30gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1lbXB0eS1mdW5jdGlvblxuXG5cbiAgY29uc3QgQXN5bmNGdW5jdGlvbiA9IGdldENvbnN0cnVjdG9yT2YoQXN5bmNGdW5jdGlvbkluc3RhbmNlKTsgLy8gVkFMSURBVElPTlxuXG4gIGNvbnN0IGludHJpbnNpY3MgPSB7XG4gICAgRnVuY3Rpb25Qcm90b3R5cGVDb25zdHJ1Y3RvcixcbiAgICBBcnJheUl0ZXJhdG9yUHJvdG90eXBlLFxuICAgIEFzeW5jRnVuY3Rpb24sXG4gICAgQXN5bmNHZW5lcmF0b3IsXG4gICAgQXN5bmNHZW5lcmF0b3JGdW5jdGlvbixcbiAgICBBc3luY0dlbmVyYXRvclByb3RvdHlwZSxcbiAgICBBc3luY0l0ZXJhdG9yUHJvdG90eXBlLFxuICAgIEdlbmVyYXRvcixcbiAgICBHZW5lcmF0b3JGdW5jdGlvbixcbiAgICBJdGVyYXRvclByb3RvdHlwZSxcbiAgICBNYXBJdGVyYXRvclByb3RvdHlwZSxcbiAgICBSZWdFeHBTdHJpbmdJdGVyYXRvclByb3RvdHlwZSxcbiAgICBTZXRJdGVyYXRvclByb3RvdHlwZSxcbiAgICBTdHJpbmdJdGVyYXRvclByb3RvdHlwZSxcbiAgICBUaHJvd1R5cGVFcnJvcixcbiAgICBUeXBlZEFycmF5XG4gIH07XG4gIHJldHVybiBpbnRyaW5zaWNzO1xufVxufSx7fV0sNTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZ2V0TmFtZWRJbnRyaW5zaWMgPSBnZXROYW1lZEludHJpbnNpYztcblxudmFyIF9hc3NlcnQgPSByZXF1aXJlKFwiLi9hc3NlcnQuanNcIik7XG5cbmNvbnN0IHtcbiAgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yXG59ID0gT2JqZWN0O1xuLyoqXG4gKiBnZXROYW1lZEludHJpbnNpYygpXG4gKiBHZXQgdGhlIGludHJpbnNpYyBmcm9tIHRoZSBnbG9iYWwgb2JqZWN0LlxuICovXG5cbmZ1bmN0aW9uIGdldE5hbWVkSW50cmluc2ljKHJvb3QsIG5hbWUpIHtcbiAgLy8gQXNzdW1wdGlvbjogdGhlIGludHJpbnNpYyBuYW1lIG1hdGNoZXMgYSBnbG9iYWwgb2JqZWN0IHdpdGggdGhlIHNhbWUgbmFtZS5cbiAgY29uc3QgZGVzYyA9IGdldE93blByb3BlcnR5RGVzY3JpcHRvcihyb290LCBuYW1lKTsgLy8gQWJvcnQgaWYgYW4gYWNjZXNzb3IgaXMgZm91bmQgb24gdGhlIG9iamVjdCBpbnN0ZWFkIG9mIGEgZGF0YSBwcm9wZXJ0eS5cbiAgLy8gV2Ugc2hvdWxkIG5ldmVyIGdldCBpbnRvIHRoaXMgbm9uIHN0YW5kYXJkIHNpdHVhdGlvbi5cblxuICAoMCwgX2Fzc2VydC5hc3NlcnQpKCEoJ2dldCcgaW4gZGVzYyB8fCAnc2V0JyBpbiBkZXNjKSwgYHVuZXhwZWN0ZWQgYWNjZXNzb3Igb24gZ2xvYmFsIHByb3BlcnR5OiAke25hbWV9YCk7XG4gIHJldHVybiBkZXNjLnZhbHVlO1xufVxufSx7XCIuL2Fzc2VydC5qc1wiOjF9XSw2OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5pbnRyaW5zaWNOYW1lcyA9IHZvaWQgMDtcblxuLyoqXG4gKiBpbnRyaW5zaWNOYW1lc1xuICogVGhlIGZvbGxvd2luZyBsaXN0IGNvbnRhaW5zIGFsbCBpbnRyaXNpY3MgbmFtZXMgYXMgZGVmaW5lZCBpbiB0aGUgc3BlY3MsIGV4Y2VwdFxuICogdGhhdCB0aGUgbGVhZGluZyBhbiB0cmFpbGluZyAnJScgY2hhcmFjdGVycyBoYXZlIGJlZW4gcmVtb3ZlZC4gV2Ugd2FudCB0byBkZXNpZ25cbiAqIGZyb20gdGhlIHNwZWNzIHNvIHdlIGNhbiBiZXR0ZXIgdHJhY2sgY2hhbmdlcyB0byB0aGUgc3BlY3MuXG4gKi9cbmNvbnN0IGludHJpbnNpY05hbWVzID0gWy8vIDYuMS43LjQgV2VsbC1Lbm93biBJbnRyaW5zaWMgT2JqZWN0c1xuLy8gVGFibGUgODogV2VsbC1Lbm93biBJbnRyaW5zaWMgT2JqZWN0c1xuJ0FycmF5JywgJ0FycmF5QnVmZmVyJywgJ0FycmF5QnVmZmVyUHJvdG90eXBlJywgJ0FycmF5SXRlcmF0b3JQcm90b3R5cGUnLCAnQXJyYXlQcm90b3R5cGUnLCAvLyBUT0RPIEFycmF5UHJvdG9fKlxuLy8gJ0FycmF5UHJvdG9fZW50cmllcycsXG4vLyAnQXJyYXlQcm90b19mb3JFYWNoJyxcbi8vICdBcnJheVByb3RvX2tleXMnLFxuLy8gJ0FycmF5UHJvdG9fdmFsdWVzJyxcbi8vIDI1LjEuNC4yIFRoZSAlQXN5bmNGcm9tU3luY0l0ZXJhdG9yUHJvdG90eXBlJSBPYmplY3Rcbi8vIFRPRE8gQmVsZWl2ZWQgdG8gbm90IGJlIGRpcmVjdGx5IGFjY2Vzc2libGUgdG8gRUNNQVNjcmlwdCBjb2RlLlxuLy8gJ0FzeW5jRnJvbVN5bmNJdGVyYXRvclByb3RvdHlwZScsXG4nQXN5bmNGdW5jdGlvbicsICdBc3luY0Z1bmN0aW9uUHJvdG90eXBlJywgJ0FzeW5jR2VuZXJhdG9yJywgJ0FzeW5jR2VuZXJhdG9yRnVuY3Rpb24nLCAnQXN5bmNHZW5lcmF0b3JQcm90b3R5cGUnLCAnQXN5bmNJdGVyYXRvclByb3RvdHlwZScsICdBdG9taWNzJywgJ0JpZ0ludCcsIC8vIFRPVE86IE1pc3NpbmcgaW4gdGhlIHNwZWNzLlxuJ0JpZ0ludFByb3RvdHlwZScsICdCaWdJbnQ2NEFycmF5JywgLy8gVE9UTzogTWlzc2luZyBpbiB0aGUgc3BlY3MuXG4nQmlnSW50NjRBcnJheVByb3RvdHlwZScsICdCaWdVaW50NjRBcnJheScsIC8vIFRPVE86IE1pc3NpbmcgaW4gdGhlIHNwZWNzLlxuJ0JpZ1VpbnQ2NEFycmF5UHJvdG90eXBlJywgJ0Jvb2xlYW4nLCAnQm9vbGVhblByb3RvdHlwZScsICdEYXRhVmlldycsICdEYXRhVmlld1Byb3RvdHlwZScsICdEYXRlJywgJ0RhdGVQcm90b3R5cGUnLCAnZGVjb2RlVVJJJywgJ2RlY29kZVVSSUNvbXBvbmVudCcsICdlbmNvZGVVUkknLCAnZW5jb2RlVVJJQ29tcG9uZW50JywgJ0Vycm9yJywgJ0Vycm9yUHJvdG90eXBlJywgJ2V2YWwnLCAnRXZhbEVycm9yJywgJ0V2YWxFcnJvclByb3RvdHlwZScsICdGbG9hdDMyQXJyYXknLCAnRmxvYXQzMkFycmF5UHJvdG90eXBlJywgJ0Zsb2F0NjRBcnJheScsICdGbG9hdDY0QXJyYXlQcm90b3R5cGUnLCAvLyAxMy43LjUuMTYuMiBUaGUgJUZvckluSXRlcmF0b3JQcm90b3R5cGUlIE9iamVjdFxuLy8gRG9jdW1uZXRlZCBhcyBcIm5ldmVyIGRpcmVjdGx5IGFjY2Vzc2libGUgdG8gRUNNQVNjcmlwdCBjb2RlLlwiXG4vLyAnRm9ySW5JdGVyYXRvclByb3RvdHlwZScsXG4nRnVuY3Rpb24nLCAnRnVuY3Rpb25Qcm90b3R5cGUnLCAnR2VuZXJhdG9yJywgJ0dlbmVyYXRvckZ1bmN0aW9uJywgJ0dlbmVyYXRvclByb3RvdHlwZScsICdJbnQ4QXJyYXknLCAnSW50OEFycmF5UHJvdG90eXBlJywgJ0ludDE2QXJyYXknLCAnSW50MTZBcnJheVByb3RvdHlwZScsICdJbnQzMkFycmF5JywgJ0ludDMyQXJyYXlQcm90b3R5cGUnLCAnaXNGaW5pdGUnLCAnaXNOYU4nLCAnSXRlcmF0b3JQcm90b3R5cGUnLCAnSlNPTicsIC8vIFRPRE9cbi8vICdKU09OUGFyc2UnLFxuLy8gJ0pTT05TdHJpbmdpZnknLFxuJ01hcCcsICdNYXBJdGVyYXRvclByb3RvdHlwZScsICdNYXBQcm90b3R5cGUnLCAnTWF0aCcsICdOdW1iZXInLCAnTnVtYmVyUHJvdG90eXBlJywgJ09iamVjdCcsICdPYmplY3RQcm90b3R5cGUnLCAvLyBUT0RPXG4vLyAnT2JqUHJvdG9fdG9TdHJpbmcnLFxuLy8gJ09ialByb3RvX3ZhbHVlT2YnLFxuJ3BhcnNlRmxvYXQnLCAncGFyc2VJbnQnLCAnUHJvbWlzZScsICdQcm9taXNlUHJvdG90eXBlJywgLy8gVE9ET1xuLy8gJ1Byb21pc2VQcm90b190aGVuJyxcbi8vICdQcm9taXNlX2FsbCcsXG4vLyAnUHJvbWlzZV9yZWplY3QnLFxuLy8gJ1Byb21pc2VfcmVzb2x2ZScsXG4nUHJveHknLCAnUmFuZ2VFcnJvcicsICdSYW5nZUVycm9yUHJvdG90eXBlJywgJ1JlZmVyZW5jZUVycm9yJywgJ1JlZmVyZW5jZUVycm9yUHJvdG90eXBlJywgJ1JlZmxlY3QnLCAnUmVnRXhwJywgJ1JlZ0V4cFByb3RvdHlwZScsICdSZWdFeHBTdHJpbmdJdGVyYXRvclByb3RvdHlwZScsICdTZXQnLCAnU2V0SXRlcmF0b3JQcm90b3R5cGUnLCAnU2V0UHJvdG90eXBlJywgJ1NoYXJlZEFycmF5QnVmZmVyJywgJ1NoYXJlZEFycmF5QnVmZmVyUHJvdG90eXBlJywgJ1N0cmluZycsICdTdHJpbmdJdGVyYXRvclByb3RvdHlwZScsICdTdHJpbmdQcm90b3R5cGUnLCAnU3ltYm9sJywgJ1N5bWJvbFByb3RvdHlwZScsICdTeW50YXhFcnJvcicsICdTeW50YXhFcnJvclByb3RvdHlwZScsICdUaHJvd1R5cGVFcnJvcicsICdUeXBlZEFycmF5JywgJ1R5cGVkQXJyYXlQcm90b3R5cGUnLCAnVHlwZUVycm9yJywgJ1R5cGVFcnJvclByb3RvdHlwZScsICdVaW50OEFycmF5JywgJ1VpbnQ4QXJyYXlQcm90b3R5cGUnLCAnVWludDhDbGFtcGVkQXJyYXknLCAnVWludDhDbGFtcGVkQXJyYXlQcm90b3R5cGUnLCAnVWludDE2QXJyYXknLCAnVWludDE2QXJyYXlQcm90b3R5cGUnLCAnVWludDMyQXJyYXknLCAnVWludDMyQXJyYXlQcm90b3R5cGUnLCAnVVJJRXJyb3InLCAnVVJJRXJyb3JQcm90b3R5cGUnLCAnV2Vha01hcCcsICdXZWFrTWFwUHJvdG90eXBlJywgJ1dlYWtTZXQnLCAnV2Vha1NldFByb3RvdHlwZScsIC8vIEIuMi4xIEFkZGl0aW9uYWwgUHJvcGVydGllcyBvZiB0aGUgR2xvYmFsIE9iamVjdFxuLy8gVGFibGUgODc6IEFkZGl0aW9uYWwgV2VsbC1rbm93biBJbnRyaW5zaWMgT2JqZWN0c1xuJ2VzY2FwZScsICd1bmVzY2FwZScsIC8vIEVTTmV4dFxuJ0Z1bmN0aW9uUHJvdG90eXBlQ29uc3RydWN0b3InLCAnQ29tcGFydG1lbnQnLCAnQ29tcGFydG1lbnRQcm90b3R5cGUnLCAnaGFyZGVuJ107XG5leHBvcnRzLmludHJpbnNpY05hbWVzID0gaW50cmluc2ljTmFtZXM7XG59LHt9XSw3OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5jb25zdCBnbG9iYWxUaGlzID0gdHlwZW9mIGdsb2JhbCAhPT0gdW5kZWZpbmVkID8gZ2xvYmFsIDogc2VsZlxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5nZXRJbnRyaW5zaWNzID0gZ2V0SW50cmluc2ljcztcblxudmFyIF9jaGVja0Fub25JbnRyaW5zaWNzID0gcmVxdWlyZShcIi4vY2hlY2stYW5vbi1pbnRyaW5zaWNzLmpzXCIpO1xuXG52YXIgX2dldEFub255bW91c0ludHJpbnNpY3MgPSByZXF1aXJlKFwiLi9nZXQtYW5vbnltb3VzLWludHJpbnNpY3MuanNcIik7XG5cbnZhciBfaW50cmluc2ljTmFtZXMgPSByZXF1aXJlKFwiLi9pbnRyaW5zaWMtbmFtZXMuanNcIik7XG5cbnZhciBfZ2V0TmFtZWRJbnRyaW5zaWMgPSByZXF1aXJlKFwiLi9nZXQtbmFtZWQtaW50cmluc2ljLmpzXCIpO1xuXG52YXIgX2NoZWNrSW50cmluc2ljcyA9IHJlcXVpcmUoXCIuL2NoZWNrLWludHJpbnNpY3MuanNcIik7XG5cbi8vIFRoZSBpbnRyaW5zaWNzIGFyZSB0aGUgZGVmaWVuZCBpbiB0aGUgZ2xvYmFsIHNwZWNpZmljYXRpb25zLlxuLy9cbi8vIEFQSVxuLy9cbi8vICAgZ2V0SW50cmluc2ljcygpOiBPYmplY3Rcbi8vXG4vLyBPcGVyYXRpb24gc2ltaWxhciB0byBhYnN0cmFjdCBvcGVyYXRpb24gYENyZWF0ZUlucmluc2ljc2AgaW4gc2VjdGlvbiA4LjIuMlxuLy8gb2YgdGhlIEVTIHNwZWNpZmljYXRpb25zLlxuLy9cbi8vIFJldHVybiBhIHJlY29yZC1saWtlIG9iamVjdCBzaW1pbGFyIHRvIHRoZSBbW2ludHJpbnNpY3NdXSBzbG90IG9mIHRoZVxuLy8gcmVhbG1SZWMgZXhjZXB0cyBmb3IgdGhlIGZvbGxvd2luZyBzaW1waWZpY2F0aW9uczpcbi8vXG4vLyAgLSB3ZSBvbWl0IHRoZSBpbnRyaW5zaWNzIG5vdCByZWFjaGFibGUgYnkgSmF2YVNjcmlwdCBjb2RlLlxuLy9cbi8vICAtIHdlIG9taXQgaW50cmluc2ljcyB0aGF0IGFyZSBkaXJlY3QgcHJvcGVydGllcyBvZiB0aGUgZ2xvYmFsIG9iamVjdFxuLy8gICAgKGV4Y2VwdCBmb3IgdGhlIFwicHJvdG90eXBlXCIgcHJvcGVydHkpLCBhbmQgcHJvcGVydGllcyB0aGF0IGFyZSBkaXJlY3Rcbi8vICAgIHByb3BlcnRpZXMgb2YgdGhlIHByb3RvdHlwZXMgKGV4Y2VwdCBmb3IgXCJjb25zdHJ1Y3RvclwiKS5cbi8vXG4vLyAgLSB3ZSB1c2UgdGhlIG5hbWUgb2YgdGhlIGFzc29jaWF0ZWQgZ2xvYmFsIG9iamVjdCBwcm9wZXJ0eSBpbnN0ZWFkIG9mIHRoZVxuLy8gICAgaW50cmluc2ljIG5hbWUgKHVzdWFsbHksIGA8aW50cmluc2ljIG5hbWU+ID09PSAnJScgKyA8Z2xvYmFsIHByb3BlcnR5XG4vLyAgICBuYW1lPisgJyUnYCkuXG4vL1xuLy8gQXNzdW1wdGlvbnNcbi8vXG4vLyBUaGUgaW50cmluc2ljIG5hbWVzIGNvcnJlc3BvbmQgdG8gdGhlIG9iamVjdCBuYW1lcyB3aXRoIFwiJVwiIGFkZGVkIGFzIHByZWZpeCBhbmQgc3VmZml4LCBpLmUuIHRoZSBpbnRyaW5zaWMgXCIlT2JqZWN0JVwiIGlzIGVxdWFsIHRvIHRoZSBnbG9iYWwgb2JqZWN0IHByb3BlcnR5IFwiT2JqZWN0XCIuXG5jb25zdCB7XG4gIGFwcGx5XG59ID0gUmVmbGVjdDtcblxuY29uc3QgdW5jdXJyeVRoaXMgPSBmbiA9PiAodGhpc0FyZywgLi4uYXJncykgPT4gYXBwbHkoZm4sIHRoaXNBcmcsIGFyZ3MpO1xuXG5jb25zdCBoYXNPd25Qcm9wZXJ0eSA9IHVuY3VycnlUaGlzKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkpO1xuY29uc3Qgc3VmZml4ID0gJ1Byb3RvdHlwZSc7XG4vKipcbiAqIGdldEludHJpbnNpY3MoKVxuICogUmV0dXJuIGEgcmVjb3JkLWxpa2Ugb2JqZWN0IHNpbWlsYXIgdG8gdGhlIFtbaW50cmluc2ljc11dIHNsb3Qgb2YgdGhlIHJlYWxtUmVjXG4gKiBleGNlcHRzIGZvciB0aGUgZm9sbG93aW5nIHNpbXBpZmljYXRpb25zOlxuICogLSB3ZSBvbWl0IHRoZSBpbnRyaW5zaWNzIG5vdCByZWFjaGFibGUgYnkgSmF2YVNjcmlwdCBjb2RlLlxuICogLSB3ZSBvbWl0IGludHJpbnNpY3MgdGhhdCBhcmUgZGlyZWN0IHByb3BlcnRpZXMgb2YgdGhlIGdsb2JhbCBvYmplY3QgKGV4Y2VwdCBmb3IgdGhlXG4gKiAgIFwicHJvdG90eXBlXCIgcHJvcGVydHkpLCBhbmQgcHJvcGVydGllcyB0aGF0IGFyZSBkaXJlY3QgcHJvcGVydGllcyBvZiB0aGUgcHJvdG90eXBlc1xuICogICAoZXhjZXB0IGZvciBcImNvbnN0cnVjdG9yXCIpLlxuICogLSB3ZSB1c2UgdGhlIG5hbWUgb2YgdGhlIGFzc29jaWF0ZWQgZ2xvYmFsIG9iamVjdCBwcm9wZXJ0eSBpbnN0ZWFkIG9mIHRoZSBpbnRyaW5zaWNcbiAqICAgbmFtZSAodXN1YWxseSwgPGludHJpbnNpYyBuYW1lPiA9PT0gJyUnICsgPGdsb2JhbCBwcm9wZXJ0eSBuYW1lPisgJyUnKS5cbiAqL1xuXG5mdW5jdGlvbiBnZXRJbnRyaW5zaWNzKCkge1xuICBjb25zdCBpbnRyaW5zaWNzID0ge1xuICAgIF9fcHJvdG9fXzogbnVsbFxuICB9O1xuICBjb25zdCBhbm9uSW50cmluc2ljcyA9ICgwLCBfZ2V0QW5vbnltb3VzSW50cmluc2ljcy5nZXRBbm9ueW1vdXNJbnRyaW5zaWNzKSgpO1xuICAoMCwgX2NoZWNrQW5vbkludHJpbnNpY3MuY2hlY2tBbm9uSW50cmluc2ljcykoYW5vbkludHJpbnNpY3MpO1xuXG4gIGZvciAoY29uc3QgbmFtZSBvZiBfaW50cmluc2ljTmFtZXMuaW50cmluc2ljTmFtZXMpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkoYW5vbkludHJpbnNpY3MsIG5hbWUpKSB7XG4gICAgICBpbnRyaW5zaWNzW25hbWVdID0gYW5vbkludHJpbnNpY3NbbmFtZV07IC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb250aW51ZVxuXG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoaGFzT3duUHJvcGVydHkoZ2xvYmFsVGhpcywgbmFtZSkpIHtcbiAgICAgIGludHJpbnNpY3NbbmFtZV0gPSAoMCwgX2dldE5hbWVkSW50cmluc2ljLmdldE5hbWVkSW50cmluc2ljKShnbG9iYWxUaGlzLCBuYW1lKTsgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnRpbnVlXG5cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IGhhc1N1ZmZpeCA9IG5hbWUuZW5kc1dpdGgoc3VmZml4KTtcblxuICAgIGlmIChoYXNTdWZmaXgpIHtcbiAgICAgIGNvbnN0IHByZWZpeCA9IG5hbWUuc2xpY2UoMCwgLXN1ZmZpeC5sZW5ndGgpO1xuXG4gICAgICBpZiAoaGFzT3duUHJvcGVydHkoYW5vbkludHJpbnNpY3MsIHByZWZpeCkpIHtcbiAgICAgICAgY29uc3QgaW50cmluc2ljID0gYW5vbkludHJpbnNpY3NbcHJlZml4XTtcbiAgICAgICAgaW50cmluc2ljc1tuYW1lXSA9IGludHJpbnNpYy5wcm90b3R5cGU7IC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb250aW51ZVxuXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoaGFzT3duUHJvcGVydHkoZ2xvYmFsVGhpcywgcHJlZml4KSkge1xuICAgICAgICBjb25zdCBpbnRyaW5zaWMgPSAoMCwgX2dldE5hbWVkSW50cmluc2ljLmdldE5hbWVkSW50cmluc2ljKShnbG9iYWxUaGlzLCBwcmVmaXgpO1xuICAgICAgICBpbnRyaW5zaWNzW25hbWVdID0gaW50cmluc2ljLnByb3RvdHlwZTsgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnRpbnVlXG5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gKDAsIF9jaGVja0ludHJpbnNpY3MuY2hlY2tJbnRyaW5zaWNzKShpbnRyaW5zaWNzKTtcbiAgcmV0dXJuIGludHJpbnNpY3M7XG59XG59LHtcIi4vY2hlY2stYW5vbi1pbnRyaW5zaWNzLmpzXCI6MixcIi4vY2hlY2staW50cmluc2ljcy5qc1wiOjMsXCIuL2dldC1hbm9ueW1vdXMtaW50cmluc2ljcy5qc1wiOjQsXCIuL2dldC1uYW1lZC1pbnRyaW5zaWMuanNcIjo1LFwiLi9pbnRyaW5zaWMtbmFtZXMuanNcIjo2fV0sODpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5jb25zdCB7IGdldEludHJpbnNpY3MgfSA9IHJlcXVpcmUoJy4uL2xpYi9pbnRyaW5zaWNzLmpzJylcbm1vZHVsZS5leHBvcnRzID0ge1xuICBnZXRJbnRyaW5zaWNzOiAoKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBnZXRJbnRyaW5zaWNzKClcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnN0IHN1YkVyck1zZyA9IGVyci5zdGFjayB8fCBlcnIubWVzc2FnZSB8fCBlcnJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ3l0b3BsYXNtIGZhaWxlZCB0byBnYXRoZXIgaW50cmluc2ljcy4gUGxlYXNlIHNwZWNpZnkgYSBcInByaW1vcmRpYWxzXCIgb3B0aW9uIHRvIHRoZSBNZW1icmFuZSBjb25zdHJ1Y3RvciwgYXBwbHkgY29yZS1qcyBwb2x5ZmlsbHMsIG9yIHVzZSBub2RlIHYxMiBvciBoaWdoZXIuXFxuJHtzdWJFcnJNc2d9YClcbiAgICB9XG4gIH1cbn1cbn0se1wiLi4vbGliL2ludHJpbnNpY3MuanNcIjo3fV0sOTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4vLyB0aGVyZXMgc29tZSB0aGluZ3Mgd2UgbWF5IG5lZWQgdG8gZW5mb3JjZSBkaWZmZXJlbnRseSB3aGVuIGluIGFuZCBvdXQgb2Ygc3RyaWN0IG1vZGVcbi8vIGUuZy4gZm4uYXJndW1lbnRzXG4ndXNlIHN0cmljdCdcblxuY29uc3QgeyBnZXRJbnRyaW5zaWNzIH0gPSByZXF1aXJlKCcuL2dldEludHJpbnNpY3MnKVxuXG5jb25zdCB7IGlzQXJyYXkgfSA9IEFycmF5XG5cbmNsYXNzIE1lbWJyYW5lU3BhY2Uge1xuICBjb25zdHJ1Y3RvciAoeyBsYWJlbCwgY3JlYXRlSGFuZGxlciB9KSB7XG4gICAgdGhpcy5yYXdUb0JyaWRnZWQgPSBuZXcgV2Vha01hcCgpXG4gICAgdGhpcy5oYW5kbGVyRm9yUmVmID0gbmV3IFdlYWtNYXAoKVxuICAgIHRoaXMubGFiZWwgPSBsYWJlbFxuICAgIHRoaXMuY3JlYXRlSGFuZGxlciA9IGNyZWF0ZUhhbmRsZXIgfHwgKCgpID0+IFJlZmxlY3QpXG4gIH1cblxuICBnZXRIYW5kbGVyRm9yUmVmIChyYXdSZWYpIHtcbiAgICBpZiAodGhpcy5oYW5kbGVyRm9yUmVmLmhhcyhyYXdSZWYpKSB7XG4gICAgICByZXR1cm4gdGhpcy5oYW5kbGVyRm9yUmVmLmdldChyYXdSZWYpXG4gICAgfVxuICAgIGNvbnN0IGhhbmRsZXIgPSB0aGlzLmNyZWF0ZUhhbmRsZXIoe1xuICAgICAgc2V0SGFuZGxlckZvclJlZjogKHJlZiwgbmV3SGFuZGxlcikgPT4gdGhpcy5oYW5kbGVyRm9yUmVmLnNldChyZWYsIG5ld0hhbmRsZXIpXG4gICAgfSlcbiAgICB0aGlzLmhhbmRsZXJGb3JSZWYuc2V0KHJhd1JlZiwgaGFuZGxlcilcbiAgICByZXR1cm4gaGFuZGxlclxuICB9XG59XG5cbmNsYXNzIE1lbWJyYW5lIHtcbiAgY29uc3RydWN0b3IgKHsgZGVidWdNb2RlLCBwcmltb3JkaWFscyB9ID0ge30pIHtcbiAgICB0aGlzLmRlYnVnTW9kZSA9IGRlYnVnTW9kZVxuICAgIHRoaXMucHJpbW9yZGlhbHMgPSBwcmltb3JkaWFscyB8fCBPYmplY3QudmFsdWVzKGdldEludHJpbnNpY3MoKSlcbiAgICB0aGlzLmJyaWRnZWRUb1JhdyA9IG5ldyBXZWFrTWFwKClcbiAgICB0aGlzLnJhd1RvT3JpZ2luID0gbmV3IFdlYWtNYXAoKVxuICB9XG5cbiAgbWFrZU1lbWJyYW5lU3BhY2UgKHsgbGFiZWwsIGNyZWF0ZUhhbmRsZXIgfSkge1xuICAgIHJldHVybiBuZXcgTWVtYnJhbmVTcGFjZSh7IGxhYmVsLCBjcmVhdGVIYW5kbGVyIH0pXG4gIH1cblxuICAvLyBpZiByYXdPYmogaXMgbm90IHBhcnQgb2YgaW5HcmFwaCwgc2hvdWxkIHdlIGV4cGxvZGU/XG4gIGJyaWRnZSAoaW5SZWYsIGluR3JhcGgsIG91dEdyYXBoKSB7XG5cbiAgICAvL1xuICAgIC8vIHNraXAgaWYgc2hvdWxkIGJlIHBhc3NlZCBkaXJlY3RseSAoZGFuZ2VyKVxuICAgIC8vXG5cbiAgICBpZiAodGhpcy5zaG91bGRTa2lwQnJpZGdlKGluUmVmKSkge1xuICAgICAgLy8gY29uc29sZS5sb2coYG1lbWJyYW5lLmJyaWRnZSBzaG91bGQgc2tpcCBpbjoke2luR3JhcGgubGFiZWx9IC0+IG91dDoke291dEdyYXBoLmxhYmVsfWApXG4gICAgICByZXR1cm4gaW5SZWZcbiAgICB9XG5cbiAgICAvL1xuICAgIC8vIHVud3JhcCByZWYgYW5kIGRldGVjdCBcIm9yaWdpblwiIGdyYXBoXG4gICAgLy9cblxuICAgIGxldCByYXdSZWZcbiAgICBsZXQgb3JpZ2luR3JhcGhcblxuICAgIGlmICh0aGlzLmJyaWRnZWRUb1Jhdy5oYXMoaW5SZWYpKSB7XG4gICAgICAvLyB3ZSBrbm93IHRoaXMgcmVmXG4gICAgICByYXdSZWYgPSB0aGlzLmJyaWRnZWRUb1Jhdy5nZXQoaW5SZWYpXG4gICAgICBvcmlnaW5HcmFwaCA9IHRoaXMucmF3VG9PcmlnaW4uZ2V0KHJhd1JlZilcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gd2UndmUgbmV2ZXIgc2VlbiB0aGlzIHJlZiBiZWZvcmUgLSBtdXN0IGJlIHJhdyBhbmQgZnJvbSBpbkdyYXBoXG4gICAgICByYXdSZWYgPSBpblJlZlxuICAgICAgb3JpZ2luR3JhcGggPSBpbkdyYXBoXG4gICAgICAvLyByZWNvcmQgb3JpZ2luXG4gICAgICB0aGlzLnJhd1RvT3JpZ2luLnNldChpblJlZiwgaW5HcmFwaClcbiAgICB9XG5cbiAgICAvL1xuICAgIC8vIHdyYXAgZm9yIHJlZiBmb3IgXCJvdXRcIiBncmFwaFxuICAgIC8vXG5cbiAgICAvLyBpZiB0aGlzIHJlZiBvcmlnaW5hdGVzIGluIHRoZSBcIm91dFwiIGdyYXBoLCBkZWxpdmVyIHVud3JhcHBlZFxuICAgIGlmIChvcmlnaW5HcmFwaCA9PT0gb3V0R3JhcGgpIHtcbiAgICAgIHJldHVybiByYXdSZWZcbiAgICB9XG5cbiAgICAvLyBpZiBvdXRHcmFwaCBhbHJlYWR5IGhhcyBicmlkZ2VkIHdyYXBwaW5nIGZvciByYXdSZWYsIHVzZSBpdFxuICAgIGlmIChvdXRHcmFwaC5yYXdUb0JyaWRnZWQuaGFzKHJhd1JlZikpIHtcbiAgICAgIHJldHVybiBvdXRHcmFwaC5yYXdUb0JyaWRnZWQuZ2V0KHJhd1JlZilcbiAgICB9XG5cbiAgICAvLyBjcmVhdGUgbmV3IHdyYXBwaW5nIGZvciByYXdSZWZcbiAgICBjb25zdCBkaXN0b3J0aW9uSGFuZGxlciA9IG9yaWdpbkdyYXBoLmdldEhhbmRsZXJGb3JSZWYocmF3UmVmKVxuICAgIGNvbnN0IG1lbWJyYW5lUHJveHlIYW5kbGVyID0gY3JlYXRlTWVtYnJhbmVQcm94eUhhbmRsZXIoXG4gICAgICB0aGlzLmRlYnVnTW9kZSxcbiAgICAgIGRpc3RvcnRpb25IYW5kbGVyLFxuICAgICAgcmF3UmVmLFxuICAgICAgb3JpZ2luR3JhcGgsXG4gICAgICBvdXRHcmFwaCxcbiAgICAgIHRoaXMuYnJpZGdlLmJpbmQodGhpcyksXG4gICAgKVxuICAgIGNvbnN0IG91dFJlZiA9IGNyZWF0ZUZsZXhpYmxlUHJveHkocmF3UmVmLCBtZW1icmFuZVByb3h5SGFuZGxlcilcbiAgICAvLyBjYWNoZSBib3RoIHdheXNcbiAgICBvdXRHcmFwaC5yYXdUb0JyaWRnZWQuc2V0KHJhd1JlZiwgb3V0UmVmKVxuICAgIHRoaXMuYnJpZGdlZFRvUmF3LnNldChvdXRSZWYsIHJhd1JlZilcblxuICAgIC8vIGFsbCBkb25lXG4gICAgcmV0dXJuIG91dFJlZlxuICB9XG5cbiAgc2hvdWxkU2tpcEJyaWRnZSAodmFsdWUpIHtcbiAgICAvLyBDaGVjayBmb3IgbnVsbCBhbmQgdW5kZWZpbmVkXG4gICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3Igbm9uLW9iamVjdHNcbiAgICBjb25zdCB2YWx1ZVR5cGUgPSB0eXBlb2YgdmFsdWVcbiAgICBpZiAodmFsdWVUeXBlICE9PSAnb2JqZWN0JyAmJiB2YWx1ZVR5cGUgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuXG4gICAgLy8gcHJpbW9yZGlhbHMgc2hvdWxkIG5vdCBiZSB3cmFwcGVkXG4gICAgaWYgKHRoaXMucHJpbW9yZGlhbHMuaW5jbHVkZXModmFsdWUpKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cblxuICAgIC8vIEVhcmx5IGV4aXQgaWYgdGhlIG9iamVjdGlzIGFuIEFycmF5LlxuICAgIGlmIChpc0FycmF5KHZhbHVlKSA9PT0gdHJ1ZSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuLy8gaGFuZGxlciBzdGFja1xuXG4vLyBQcm94eUludmFyaWFudEhhbmRsZXIgY2FsbHMgbmV4dCgpIDwtLSBuZWVkcyB0byBoYXZlIGZpbmFsIHNheVxuLy8gICBNZW1icmFuZUhhbmRsZXIgY2FsbHMgbmV4dCgpIDwtLSBuZWVkcyB0byBzZWUgZGlzdG9ydGlvbiByZXN1bHRcbi8vICAgICBMb2NhbFdyaXRlc0hhbmRsZXIgc2V0cyBiZWhhdmlvclxuXG4vLyBjdXJyZW50bHkgY3JlYXRpbmcgaGFuZGxlciBwZXItb2JqZWN0XG4vLyBwZXJmOiBjcmVhdGUgb25seSBvbmNlP1xuLy8gICBiZXR0ZXIgdG8gY3JlYXRlIG9uZSBlYWNoIHRpbWUgd2l0aCByYXdSZWYgYm91bmQ/XG4vLyAgIG9yIGZpbmQgYSB3YXkgdG8gbWFwIHRhcmdldCB0byByYXdSZWZcbmZ1bmN0aW9uIGNyZWF0ZU1lbWJyYW5lUHJveHlIYW5kbGVyIChkZWJ1Z01vZGUsIHByZXZQcm94eUhhbmRsZXIsIHJhd1JlZiwgaW5HcmFwaCwgb3V0R3JhcGgsIGJyaWRnZSkge1xuICBjb25zdCBwcm94eUhhbmRsZXIgPSB7XG4gICAgZ2V0UHJvdG90eXBlT2Y6IGNyZWF0ZUhhbmRsZXJGbihkZWJ1Z01vZGUsIHByZXZQcm94eUhhbmRsZXIuZ2V0UHJvdG90eXBlT2YsIHJhd1JlZiwgaW5HcmFwaCwgb3V0R3JhcGgsIGJyaWRnZSksXG4gICAgc2V0UHJvdG90eXBlT2Y6IGNyZWF0ZUhhbmRsZXJGbihkZWJ1Z01vZGUsIHByZXZQcm94eUhhbmRsZXIuc2V0UHJvdG90eXBlT2YsIHJhd1JlZiwgaW5HcmFwaCwgb3V0R3JhcGgsIGJyaWRnZSksXG4gICAgaXNFeHRlbnNpYmxlOiBjcmVhdGVIYW5kbGVyRm4oZGVidWdNb2RlLCBwcmV2UHJveHlIYW5kbGVyLmlzRXh0ZW5zaWJsZSwgcmF3UmVmLCBpbkdyYXBoLCBvdXRHcmFwaCwgYnJpZGdlKSxcbiAgICBwcmV2ZW50RXh0ZW5zaW9uczogY3JlYXRlSGFuZGxlckZuKGRlYnVnTW9kZSwgcHJldlByb3h5SGFuZGxlci5wcmV2ZW50RXh0ZW5zaW9ucywgcmF3UmVmLCBpbkdyYXBoLCBvdXRHcmFwaCwgYnJpZGdlKSxcbiAgICBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I6IGNyZWF0ZUhhbmRsZXJGbihkZWJ1Z01vZGUsIHByZXZQcm94eUhhbmRsZXIuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yLCByYXdSZWYsIGluR3JhcGgsIG91dEdyYXBoLCBicmlkZ2UpLFxuICAgIGRlZmluZVByb3BlcnR5OiBjcmVhdGVIYW5kbGVyRm4oZGVidWdNb2RlLCBwcmV2UHJveHlIYW5kbGVyLmRlZmluZVByb3BlcnR5LCByYXdSZWYsIGluR3JhcGgsIG91dEdyYXBoLCBicmlkZ2UpLFxuICAgIGhhczogY3JlYXRlSGFuZGxlckZuKGRlYnVnTW9kZSwgcHJldlByb3h5SGFuZGxlci5oYXMsIHJhd1JlZiwgaW5HcmFwaCwgb3V0R3JhcGgsIGJyaWRnZSksXG4gICAgZ2V0OiBjcmVhdGVIYW5kbGVyRm4oZGVidWdNb2RlLCBwcmV2UHJveHlIYW5kbGVyLmdldCwgcmF3UmVmLCBpbkdyYXBoLCBvdXRHcmFwaCwgYnJpZGdlKSxcbiAgICBzZXQ6IGNyZWF0ZUhhbmRsZXJGbihkZWJ1Z01vZGUsIHByZXZQcm94eUhhbmRsZXIuc2V0LCByYXdSZWYsIGluR3JhcGgsIG91dEdyYXBoLCBicmlkZ2UpLFxuICAgIGRlbGV0ZVByb3BlcnR5OiBjcmVhdGVIYW5kbGVyRm4oZGVidWdNb2RlLCBwcmV2UHJveHlIYW5kbGVyLmRlbGV0ZVByb3BlcnR5LCByYXdSZWYsIGluR3JhcGgsIG91dEdyYXBoLCBicmlkZ2UpLFxuICAgIG93bktleXM6IGNyZWF0ZUhhbmRsZXJGbihkZWJ1Z01vZGUsIHByZXZQcm94eUhhbmRsZXIub3duS2V5cywgcmF3UmVmLCBpbkdyYXBoLCBvdXRHcmFwaCwgYnJpZGdlKSxcbiAgICBhcHBseTogY3JlYXRlSGFuZGxlckZuKGRlYnVnTW9kZSwgcHJldlByb3h5SGFuZGxlci5hcHBseSwgcmF3UmVmLCBpbkdyYXBoLCBvdXRHcmFwaCwgYnJpZGdlKSxcbiAgICBjb25zdHJ1Y3Q6IGNyZWF0ZUhhbmRsZXJGbihkZWJ1Z01vZGUsIHByZXZQcm94eUhhbmRsZXIuY29uc3RydWN0LCByYXdSZWYsIGluR3JhcGgsIG91dEdyYXBoLCBicmlkZ2UpXG4gIH1cbiAgcmV0dXJuIHByb3h5SGFuZGxlclxufVxuXG5mdW5jdGlvbiBjcmVhdGVIYW5kbGVyRm4gKGRlYnVnTW9kZSwgcmVmbGVjdEZuLCByYXdSZWYsIGluR3JhcGgsIG91dEdyYXBoLCBicmlkZ2UpIHtcbiAgaWYgKGRlYnVnTW9kZSkge1xuICAgIC8vIGluIGRlYnVnTW9kZSwgd2UgZG9udCBzYWZlbHkgY2F0Y2ggYW5kIHdyYXAgZXJyb3JzXG4gICAgLy8gd2hpbGUgdGhpcyBpcyBpbnNlY3VyZSwgaXQgbWFrZXMgZGVidWdnaW5nIG11Y2ggZWFzaWVyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChfLCAuLi5vdXRBcmdzKSB7XG4gICAgICBjb25zdCBpbkFyZ3MgPSBvdXRBcmdzLm1hcChhcmcgPT4gYnJpZGdlKGFyZywgb3V0R3JhcGgsIGluR3JhcGgpKVxuICAgICAgbGV0IHZhbHVlID0gcmVmbGVjdEZuKHJhd1JlZiwgLi4uaW5BcmdzKVxuICAgICAgcmV0dXJuIGJyaWRnZSh2YWx1ZSwgaW5HcmFwaCwgb3V0R3JhcGgpXG4gICAgfVxuICB9XG4gIHJldHVybiBmdW5jdGlvbiAoXywgLi4ub3V0QXJncykge1xuICAgIGNvbnN0IGluQXJncyA9IG91dEFyZ3MubWFwKGFyZyA9PiBicmlkZ2UoYXJnLCBvdXRHcmFwaCwgaW5HcmFwaCkpXG4gICAgbGV0IHZhbHVlLCBpbkVyclxuICAgIHRyeSB7XG4gICAgICB2YWx1ZSA9IHJlZmxlY3RGbihyYXdSZWYsIC4uLmluQXJncylcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGluRXJyID0gZXJyXG4gICAgfVxuICAgIGlmIChpbkVyciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBvdXRFcnIgPSBicmlkZ2UoaW5FcnIsIGluR3JhcGgsIG91dEdyYXBoKVxuICAgICAgdGhyb3cgb3V0RXJyXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBicmlkZ2UodmFsdWUsIGluR3JhcGgsIG91dEdyYXBoKVxuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHsgTWVtYnJhbmUsIE1lbWJyYW5lU3BhY2UgfVxuXG4vL1xuLy8gRmxleGlibGVQcm94eVxuLy9cblxuZnVuY3Rpb24gY3JlYXRlRmxleGlibGVQcm94eSAocmVhbFRhcmdldCwgcmVhbEhhbmRsZXIpIHtcbiAgY29uc3QgZmxleGlibGVUYXJnZXQgPSBnZXRQcm94eVRhcmdldEZvclZhbHVlKHJlYWxUYXJnZXQpXG4gIGNvbnN0IGZsZXhpYmxlSGFuZGxlciA9IHJlc3BlY3RQcm94eUludmFyaWFudHMocmVhbEhhbmRsZXIpXG4gIHJldHVybiBuZXcgUHJveHkoZmxleGlibGVUYXJnZXQsIGZsZXhpYmxlSGFuZGxlcilcbn1cblxuLy8gdXNlIHJlcGxhY2VtZW50IHByb3h5VGFyZ2V0IGZvciBmbGV4aWJsZSBkaXN0b3J0aW9ucyBsZXNzIHJlc3RyYWluZWQgYnkgXCJQcm94eSBpbnZhcmlhbnRcIlxuLy8gZS5nLiBoaWRlIG90aGVyd2lzZSBub24tY29uZmlndXJhYmxlIHByb3BlcnRpZXNcbmZ1bmN0aW9uIGdldFByb3h5VGFyZ2V0Rm9yVmFsdWUgKHZhbHVlKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICBpZiAodmFsdWUucHJvdG90eXBlKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkge31cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICgpID0+IHt9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgcmV0dXJuIFtdXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7fVxuICAgIH1cbiAgfVxufVxuXG4vLyBUT0RPIGVuc3VyZSB3ZSdyZSBlbmZvcmNpbmcgYWxsIHByb3h5IGludmFyaWFudHNcbmZ1bmN0aW9uIHJlc3BlY3RQcm94eUludmFyaWFudHMgKHJhd1Byb3h5SGFuZGxlcikge1xuICAvLyB0aGUgZGVmYXVsdHMgYXJlbnQgbmVlZGVkIGZvciB0aGUgbWVtYnJhbmVQcm94eUhhbmRsZXIsXG4gIC8vIGJ1dCBtaWdodCBiZSBmb3IgYW4gaW1jb21wbGV0ZSBwcm94eSBoYW5kbGVyXG4gIGNvbnN0IGhhbmRsZXJXaXRoRGVmYXVsdHMgPSBPYmplY3QuYXNzaWduKHt9LCBSZWZsZWN0LCByYXdQcm94eUhhbmRsZXIpXG4gIGNvbnN0IHJlc3BlY3RmdWxQcm94eUhhbmRsZXIgPSBPYmplY3QuYXNzaWduKHt9LCBoYW5kbGVyV2l0aERlZmF1bHRzKVxuICAvLyBlbmZvcmNlIGNvbmZpZ3VyYWJsZSBmYWxzZSBwcm9wc1xuICByZXNwZWN0ZnVsUHJveHlIYW5kbGVyLmdldE93blByb3BlcnR5RGVzY3JpcHRvciA9IChmYWtlVGFyZ2V0LCBrZXkpID0+IHtcbiAgICAvLyBlbnN1cmUgcHJvcERlc2MgbWF0Y2hlcyBwcm94eSB0YXJnZXQncyBub24tY29uZmlndXJhYmxlIHByb3BlcnR5XG4gICAgY29uc3QgcHJvcERlc2MgPSBoYW5kbGVyV2l0aERlZmF1bHRzLmdldE93blByb3BlcnR5RGVzY3JpcHRvcihmYWtlVGFyZ2V0LCBrZXkpXG4gICAgaWYgKHByb3BEZXNjICYmICFwcm9wRGVzYy5jb25maWd1cmFibGUpIHtcbiAgICAgIGNvbnN0IHByb3h5VGFyZ2V0UHJvcERlc2MgPSBSZWZsZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihmYWtlVGFyZ2V0LCBrZXkpXG4gICAgICBjb25zdCBwcm94eVRhcmdldFByb3BJc0NvbmZpZ3VyYWJsZSA9ICghcHJveHlUYXJnZXRQcm9wRGVzYyB8fCBwcm94eVRhcmdldFByb3BEZXNjLmNvbmZpZ3VyYWJsZSlcbiAgICAgIC8vIGNvbnNvbGUud2FybignQEAgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIC0gbm9uIGNvbmZpZ3VyYWJsZScsIFN0cmluZyhrZXkpLCAhIXByb3h5VGFyZ2V0UHJvcElzQ29uZmlndXJhYmxlKVxuICAgICAgLy8gaWYgcHJveHkgdGFyZ2V0IGlzIGNvbmZpZ3VyYWJsZSAoYW5kIHJlYWwgdGFyZ2V0IGlzIG5vdCkgdXBkYXRlIHRoZSBwcm94eSB0YXJnZXQgdG8gZW5zdXJlIHRoZSBpbnZhcmlhbnQgaG9sZHNcbiAgICAgIGlmIChwcm94eVRhcmdldFByb3BJc0NvbmZpZ3VyYWJsZSkge1xuICAgICAgICBSZWZsZWN0LmRlZmluZVByb3BlcnR5KGZha2VUYXJnZXQsIGtleSwgcHJvcERlc2MpXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwcm9wRGVzY1xuICB9XG4gIC8vIGVuZm9yY2UgcHJldmVudGluZyBleHRlbnNpb25zXG4gIHJlc3BlY3RmdWxQcm94eUhhbmRsZXIucHJldmVudEV4dGVuc2lvbnMgPSAoZmFrZVRhcmdldCkgPT4ge1xuICAgIC8vIGNoZWNrIGlmIHByb3ZpZGVkIGhhbmRsZXIgYWxsb3dlZCB0aGUgcHJldmVudEV4dGVuc2lvbnMgY2FsbFxuICAgIGNvbnN0IGRpZEFsbG93ID0gaGFuZGxlcldpdGhEZWZhdWx0cy5wcmV2ZW50RXh0ZW5zaW9ucyhmYWtlVGFyZ2V0KVxuICAgIC8vIGlmIGl0IGRpZCBhbGxvdywgd2UgbmVlZCB0byBlbmZvcmNlIHRoaXMgb24gdGhlIGZha2VUYXJnZXRcbiAgICBpZiAoZGlkQWxsb3cgPT09IHRydWUpIHtcbiAgICAgIC8vIHRyYW5zZmVyIGFsbCBrZXlzIG9udG8gZmFrZVRhcmdldFxuICAgICAgY29uc3QgcHJvcERlc2NzID0gaGFuZGxlcldpdGhEZWZhdWx0cy5vd25LZXlzKGZha2VUYXJnZXQpLm1hcChwcm9wID0+IHtcbiAgICAgICAgY29uc3QgcHJvcERlc2MgPSBoYW5kbGVyV2l0aERlZmF1bHRzLmdldE93blByb3BlcnR5RGVzY3JpcHRvcihmYWtlVGFyZ2V0LCBwcm9wKVxuICAgICAgICBSZWZsZWN0LmRlZmluZVByb3BlcnR5KGZha2VUYXJnZXQsIHByb3AsIHByb3BEZXNjKVxuICAgICAgfSlcbiAgICAgIC8vIHRyYW5zZmVyIHByb3RvdHlwZVxuICAgICAgUmVmbGVjdC5zZXRQcm90b3R5cGVPZihmYWtlVGFyZ2V0LCBoYW5kbGVyV2l0aERlZmF1bHRzLmdldFByb3RvdHlwZU9mKGZha2VUYXJnZXQpKVxuICAgICAgLy8gcHJldmVudCBleHRlbnNpb25zIG9uIGZha2VUYXJnZXRcbiAgICAgIFJlZmxlY3QucHJldmVudEV4dGVuc2lvbnMoZmFrZVRhcmdldClcbiAgICB9XG4gICAgLy8gcmV0dXJuIHRoZSByZXN1bHRcbiAgICByZXR1cm4gZGlkQWxsb3dcbiAgfVxuICAvLyBlbmZvcmNlIGRlZmluZVByb3BlcnR5IGNvbmZpZ3VyYWJsZTogZmFsc2VcbiAgcmVzcGVjdGZ1bFByb3h5SGFuZGxlci5kZWZpbmVQcm9wZXJ0eSA9IChmYWtlVGFyZ2V0LCBwcm9wLCBwcm9wRGVzYykgPT4ge1xuICAgIGNvbnN0IGRpZEFsbG93ID0gaGFuZGxlcldpdGhEZWZhdWx0cy5kZWZpbmVQcm9wZXJ0eShmYWtlVGFyZ2V0LCBwcm9wLCBwcm9wRGVzYylcbiAgICAvLyBuZWVkIHRvIGFsc28gZGVmaW5lIG9uIHRoZSBmYWtlVGFyZ2V0XG4gICAgaWYgKGRpZEFsbG93ICYmICFwcm9wRGVzYy5jb25maWd1cmFibGUpIHtcbiAgICAgIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkoZmFrZVRhcmdldCwgcHJvcCwgcHJvcERlc2MpXG4gICAgfVxuICAgIHJldHVybiBkaWRBbGxvd1xuICB9XG4gIC8vIHJldHVybiBtb2RpZmllZCBoYW5kbGVyXG4gIHJldHVybiByZXNwZWN0ZnVsUHJveHlIYW5kbGVyXG59XG59LHtcIi4vZ2V0SW50cmluc2ljc1wiOjh9XX0se30sWzldKSg5KVxufSk7XG5cbi8vIEVORCBvZiBpbmplY3RlZCBjb2RlIGZyb20gY3l0b3BsYXNtXG4gIH0pKClcbiAgcmV0dXJuIG1vZHVsZS5leHBvcnRzXG59KSgpXG4gICAgY29uc3QgY3JlYXRlUmVhZE9ubHlEaXN0b3J0aW9uID0gLy8gZGVmaW5lIGN5dG9wbGFzbS9kaXN0b3J0aW9ucy9yZWFkT25seVxuKGZ1bmN0aW9uKCl7XG4gIGNvbnN0IGdsb2JhbCA9IGdsb2JhbFJlZlxuICBjb25zdCBleHBvcnRzID0ge31cbiAgY29uc3QgbW9kdWxlID0geyBleHBvcnRzIH1cbiAgOyhmdW5jdGlvbigpe1xuLy8gU1RBUlQgb2YgaW5qZWN0ZWQgY29kZSBmcm9tIGN5dG9wbGFzbS9kaXN0b3J0aW9ucy9yZWFkT25seVxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVEaXN0b3J0aW9uXG5cbi8vIHN0aWxsIGFsbG93cyBmdW5jdGlvbnMgdGhhdCBjYXVzZSBzaWRlIGVmZmVjdHNcbmZ1bmN0aW9uIGNyZWF0ZURpc3RvcnRpb24gKHsgc2V0SGFuZGxlckZvclJlZiB9KSB7XG4gIHJldHVybiB7XG4gICAgLy8gcHJldmVudCBkaXJlY3QgbXV0YWJpbGl0eVxuICAgIHNldFByb3RvdHlwZU9mOiAoKSA9PiBmYWxzZSxcbiAgICBwcmV2ZW50RXh0ZW5zaW9uczogKCkgPT4gZmFsc2UsXG4gICAgZGVmaW5lUHJvcGVydHk6ICgpID0+IGZhbHNlLFxuICAgIHNldDogKHRhcmdldCwga2V5LCB2YWx1ZSwgcmVjZWl2ZXIpID0+IHtcbiAgICAgIC8vIE92ZXJyaWRlIG1pc3Rha2Ugd29ya2Fyb3VuZFxuICAgICAgaWYgKHRhcmdldCA9PT0gcmVjZWl2ZXIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG5cbiAgICAgIC8vIEluZGlyZWN0IHNldCwgcmVkaXJlY3QgdG8gYSBkZWZpbmVQcm9wZXJ0eVxuICAgICAgcmV0dXJuIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkocmVjZWl2ZXIsIGtleSwgeyB2YWx1ZSwgZW51bWVyYWJsZTogdHJ1ZSwgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9KVxuICAgIH0sXG4gICAgZGVsZXRlUHJvcGVydHk6ICgpID0+IGZhbHNlLFxuICAgIC8vIHNwZWNpYWwgY2FzZTogaW5zdGFudGlhdGVkIGNoaWxkcmVuIHNob3VsZCBiZSBtdXRhYmxlXG4gICAgY29uc3RydWN0OiAoLi4uYXJncykgPT4ge1xuICAgICAgLy8gY29uc3RydWN0IGNoaWxkXG4gICAgICBjb25zdCByZXN1bHQgPSBSZWZsZWN0LmNvbnN0cnVjdCguLi5hcmdzKVxuICAgICAgLy8gc2V0IGNoaWxkIGFzIG11dGFibGVcbiAgICAgIHNldEhhbmRsZXJGb3JSZWYocmVzdWx0LCBSZWZsZWN0KVxuICAgICAgLy8gcmV0dXJuIGNvbnN0cnVjdGVkIGNoaWxkXG4gICAgICByZXR1cm4gcmVzdWx0XG4gICAgfSxcbiAgICAvLyBkZWZhdWx0IGJlaGF2aW9yXG4gICAgYXBwbHk6IFJlZmxlY3QuYXBwbHksXG4gICAgZ2V0OiBSZWZsZWN0LmdldCxcbiAgICBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I6IFJlZmxlY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yLFxuICAgIGdldFByb3RvdHlwZU9mOiBSZWZsZWN0LmdldFByb3RvdHlwZU9mLFxuICAgIGhhczogUmVmbGVjdC5oYXMsXG4gICAgaXNFeHRlbnNpYmxlOiBSZWZsZWN0LmlzRXh0ZW5zaWJsZSxcbiAgICBvd25LZXlzOiBSZWZsZWN0Lm93bktleXNcbiAgfVxufVxuXG4vLyBFTkQgb2YgaW5qZWN0ZWQgY29kZSBmcm9tIGN5dG9wbGFzbS9kaXN0b3J0aW9ucy9yZWFkT25seVxuICB9KSgpXG4gIHJldHVybiBtb2R1bGUuZXhwb3J0c1xufSkoKVxuXG4gICAgY29uc3QgbW9kdWxlQ2FjaGUgPSBuZXcgTWFwKClcbiAgICBjb25zdCBnbG9iYWxTdG9yZSA9IG5ldyBNYXAoKVxuICAgIGNvbnN0IG1lbWJyYW5lU3BhY2VGb3JQYWNrYWdlID0gbmV3IE1hcCgpXG4gICAgY29uc3QgbWVtYnJhbmUgPSBuZXcgTWVtYnJhbmUoeyBkZWJ1Z01vZGUgfSlcblxuICAgIHJldHVybiB7XG4gICAgICBpbnRlcm5hbFJlcXVpcmUsXG4gICAgfVxuXG4gICAgLy8gdGhpcyBmdW5jdGlvbiBpbnN0YW50aWF0aWVzIGEgbW9kdWxlIGZyb20gYSBtb2R1bGVJZC5cbiAgICAvLyAxLiBsb2FkcyB0aGUgY29uZmlnIGZvciB0aGUgbW9kdWxlXG4gICAgLy8gMi4gaW5zdGFudGlhdGVzIGluIHRoZSBjb25maWcgc3BlY2lmaWVkIGVudmlyb25tZW50XG4gICAgLy8gMy4gY2FsbHMgY29uZmlnIHNwZWNpZmllZCBzdHJhdGVneSBmb3IgXCJwcm90ZWN0RXhwb3J0c0luc3RhbnRpYXRpb25UaW1lXCJcbiAgICBmdW5jdGlvbiBpbnRlcm5hbFJlcXVpcmUgKG1vZHVsZUlkKSB7XG4gICAgICBpZiAobW9kdWxlQ2FjaGUuaGFzKG1vZHVsZUlkKSkge1xuICAgICAgICBjb25zdCBtb2R1bGVFeHBvcnRzID0gbW9kdWxlQ2FjaGUuZ2V0KG1vZHVsZUlkKS5leHBvcnRzXG4gICAgICAgIHJldHVybiBtb2R1bGVFeHBvcnRzXG4gICAgICB9XG4gICAgICBjb25zdCBtb2R1bGVEYXRhID0gbG9hZE1vZHVsZURhdGEobW9kdWxlSWQpXG5cbiAgICAgIC8vIGlmIHdlIGRvbnQgaGF2ZSBpdCwgdGhyb3cgYW4gZXJyb3JcbiAgICAgIGlmICghbW9kdWxlRGF0YSkge1xuICAgICAgICBjb25zdCBlcnIgPSBuZXcgRXJyb3IoJ0Nhbm5vdCBmaW5kIG1vZHVsZSBcXCcnICsgbW9kdWxlSWQgKyAnXFwnJylcbiAgICAgICAgZXJyLmNvZGUgPSAnTU9EVUxFX05PVF9GT1VORCdcbiAgICAgICAgdGhyb3cgZXJyXG4gICAgICB9XG5cbiAgICAgIC8vIHByZXBhcmUgdGhlIG1vZHVsZSB0byBiZSBpbml0aWFsaXplZFxuICAgICAgY29uc3QgcGFja2FnZU5hbWUgPSBtb2R1bGVEYXRhLnBhY2thZ2VcbiAgICAgIGNvbnN0IG1vZHVsZVNvdXJjZSA9IG1vZHVsZURhdGEuc291cmNlU3RyaW5nXG4gICAgICBjb25zdCBjb25maWdGb3JNb2R1bGUgPSBnZXRDb25maWdGb3JQYWNrYWdlKGxhdmFtb2F0Q29uZmlnLCBwYWNrYWdlTmFtZSlcbiAgICAgIGNvbnN0IHBhY2thZ2VNZW1icmFuZVNwYWNlID0gZ2V0TWVtYnJhbmVTcGFjZUZvclBhY2thZ2UocGFja2FnZU5hbWUpXG4gICAgICBjb25zdCBpc0VudHJ5TW9kdWxlID0gbW9kdWxlRGF0YS5wYWNrYWdlID09PSAnPHJvb3Q+J1xuXG4gICAgICAvLyBjcmVhdGUgdGhlIGluaXRpYWwgbW9kdWxlT2JqXG4gICAgICBjb25zdCBtb2R1bGVPYmogPSB7IGV4cG9ydHM6IHt9IH1cbiAgICAgIC8vIGNhY2hlIG1vZHVsZU9iaiBoZXJlXG4gICAgICBtb2R1bGVDYWNoZS5zZXQobW9kdWxlSWQsIG1vZHVsZU9iailcbiAgICAgIC8vIHRoaXMgaXMgaW1wb3J0YW50IGZvciBtdWx0aS1tb2R1bGUgY2lyY2xlcyBpbiB0aGUgZGVwIGdyYXBoXG4gICAgICAvLyBpZiB5b3UgZG9udCBjYWNoZSBiZWZvcmUgcnVubmluZyB0aGUgbW9kdWxlSW5pdGlhbGl6ZXJcblxuICAgICAgLy8gcHJlcGFyZSBlbmRvd21lbnRzXG4gICAgICBjb25zdCBlbmRvd21lbnRzRnJvbUNvbmZpZyA9IGdldEVuZG93bWVudHNGb3JDb25maWcoZ2xvYmFsUmVmLCBjb25maWdGb3JNb2R1bGUpXG4gICAgICBsZXQgZW5kb3dtZW50cyA9IE9iamVjdC5hc3NpZ24oe30sIGxhdmFtb2F0Q29uZmlnLmRlZmF1bHRHbG9iYWxzLCBlbmRvd21lbnRzRnJvbUNvbmZpZylcbiAgICAgIC8vIHNwZWNpYWwgY2FzZSBmb3IgZXhwb3Npbmcgd2luZG93XG4gICAgICBpZiAoZW5kb3dtZW50cy53aW5kb3cpIHtcbiAgICAgICAgZW5kb3dtZW50cyA9IE9iamVjdC5hc3NpZ24oe30sIGVuZG93bWVudHMud2luZG93LCBlbmRvd21lbnRzKVxuICAgICAgfVxuXG4gICAgICAvLyB0aGUgZGVmYXVsdCBlbnZpcm9ubWVudCBpcyBcInVuZnJvemVuXCIgZm9yIHRoZSBhcHAgcm9vdCBtb2R1bGVzLCBcImZyb3plblwiIGZvciBkZXBlbmRlbmNpZXNcbiAgICAgIC8vIHRoaXMgbWF5IGJlIGEgYmFkIGRlZmF1bHQsIGJ1dCB3YXMgbWVhbnQgdG8gZWFzZSBhcHAgZGV2ZWxvcG1lbnRcbiAgICAgIC8vIFwiZnJvemVuXCIgbWVhbnMgaW4gYSBTRVMgY29udGFpbmVyXG4gICAgICAvLyBcInVuZnJvemVuXCIgbWVhbnMgdmlhIHVuc2FmZUV2YWxXaXRoRW5kb3dtZW50c1xuICAgICAgY29uc3QgZW52aXJvbm1lbnQgPSBjb25maWdGb3JNb2R1bGUuZW52aXJvbm1lbnQgfHwgKGlzRW50cnlNb2R1bGUgPyAndW5mcm96ZW4nIDogJ2Zyb3plbicpXG4gICAgICBjb25zdCBydW5JblNlcyA9IGVudmlyb25tZW50ICE9PSAndW5mcm96ZW4nXG5cbiAgICAgIC8vIGFsbG93IG1vZHVsZUluaXRpYWxpemVyIHRvIGJlIHNldCBieSBsb2FkTW9kdWxlRGF0YVxuICAgICAgbGV0IG1vZHVsZUluaXRpYWxpemVyID0gbW9kdWxlRGF0YS5tb2R1bGVJbml0aWFsaXplclxuICAgICAgLy8gb3RoZXJ3aXNlIHNldHVwIGluaXRpYWxpemVyIGZyb20gbW9kdWxlU291cmNlXG4gICAgICBpZiAoIW1vZHVsZUluaXRpYWxpemVyKSB7XG4gICAgICAgIC8vIGRldGVybWluZSBpZiBpdHMgYSBTRVMtd3JhcHBlZCBvciBuYWtlZCBtb2R1bGUgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgaWYgKHJ1bkluU2VzKSB7XG4gICAgICAgICAgLy8gc2V0IHRoZSBtb2R1bGUgaW5pdGlhbGl6ZXIgYXMgdGhlIFNFUy13cmFwcGVkIHZlcnNpb25cbiAgICAgICAgICBjb25zdCBtb2R1bGVSZWFsbSA9IHJlYWxtLmdsb2JhbC5SZWFsbS5tYWtlQ29tcGFydG1lbnQoKVxuICAgICAgICAgIGNvbnN0IGdsb2JhbHNDb25maWcgPSBjb25maWdGb3JNb2R1bGUuZ2xvYmFsc1xuICAgICAgICAgIGNvbnN0IGVuZG93bWVudHNNZW1icmFuZVNwYWNlID0gZ2V0TWVtYnJhbmVTcGFjZUZvclBhY2thZ2UoJzxlbmRvd21lbnRzPicpXG4gICAgICAgICAgY29uc3QgbWVtYnJhbmVFbmRvd21lbnRzID0gbWVtYnJhbmUuYnJpZGdlKGVuZG93bWVudHMsIGVuZG93bWVudHNNZW1icmFuZVNwYWNlLCBwYWNrYWdlTWVtYnJhbmVTcGFjZSlcbiAgICAgICAgICBwcmVwYXJlUmVhbG1HbG9iYWxGcm9tQ29uZmlnKG1vZHVsZVJlYWxtLmdsb2JhbCwgZ2xvYmFsc0NvbmZpZywgbWVtYnJhbmVFbmRvd21lbnRzLCBnbG9iYWxTdG9yZSlcbiAgICAgICAgICAvLyBleGVjdXRlIGluIG1vZHVsZSByZWFsbSB3aXRoIG1vZGlmaWVkIHJlYWxtIGdsb2JhbFxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBtb2R1bGVJbml0aWFsaXplciA9IG1vZHVsZVJlYWxtLmV2YWx1YXRlKGAke21vZHVsZVNvdXJjZX1gKVxuICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBMYXZhTW9hdCAtIEVycm9yIGV2YWx1YXRpbmcgbW9kdWxlIFwiJHttb2R1bGVJZH1cIiBmcm9tIHBhY2thZ2UgXCIke3BhY2thZ2VOYW1lfVwiYClcbiAgICAgICAgICAgIHRocm93IGVyclxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlbmRvd21lbnRzLmdsb2JhbCA9IGdsb2JhbFJlZlxuICAgICAgICAgIC8vIHNldCB0aGUgbW9kdWxlIGluaXRpYWxpemVyIGFzIHRoZSB1bndyYXBwZWQgdmVyc2lvblxuICAgICAgICAgIG1vZHVsZUluaXRpYWxpemVyID0gdW5zYWZlRXZhbFdpdGhFbmRvd21lbnRzKGAke21vZHVsZVNvdXJjZX1gLCBlbmRvd21lbnRzKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIG1vZHVsZUluaXRpYWxpemVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTGF2YU1vYXQgLSBtb2R1bGVJbml0aWFsaXplciBpcyBub3QgZGVmaW5lZCBjb3JyZWN0bHkuIGdvdCBcIiR7dHlwZW9mIG1vZHVsZUluaXRpYWxpemVyfVwiIHNlczoke3J1bkluU2VzfVxcbiR7bW9kdWxlU291cmNlfWApXG4gICAgICB9XG5cbiAgICAgIC8vIGJyb3dzZXJpZnkgZ29vcDpcbiAgICAgIC8vIHRoaXMgXCJtb2R1bGVzXCIgaW50ZXJmYWNlIGlzIGV4cG9zZWQgdG8gdGhlIGJyb3dzZXJpZnkgbW9kdWxlSW5pdGlhbGl6ZXJcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9icm93c2VyaWZ5L2Jyb3dzZXItcGFjay9ibG9iL2NkMGJkMzFmOGMxMTBlMTlhODA0MjkwMTliNjRlODg3YjFhODJiMmIvcHJlbHVkZS5qcyNMMzhcbiAgICAgIC8vIGJyb3dzZXJpZnkncyBicm93c2VyLXJlc29sdmUgdXNlcyBcImFyZ3VtZW50c1s0XVwiIHRvIGRvIGRpcmVjdCBtb2R1bGUgaW5pdGlhbGl6YXRpb25zXG4gICAgICAvLyBicm93c2VyaWZ5IHNlZW1zIHRvIGRvIHRoaXMgd2hlbiBtb2R1bGUgcmVmZXJlbmNlcyBhcmUgcmVkaXJlY3RlZCBieSB0aGUgXCJicm93c2VyXCIgZmllbGRcbiAgICAgIC8vIHRoaXMgcHJveHkgc2hpbXMgdGhpcyBiZWhhdmlvclxuICAgICAgLy8gVE9ETzogd291bGQgYmUgYmV0dGVyIHRvIGp1c3QgZml4IHRoaXMgYnkgcmVtb3ZpbmcgdGhlIGluZGlyZWN0aW9uIChtYXliZSBpbiBodHRwczovL2dpdGh1Yi5jb20vYnJvd3NlcmlmeS9tb2R1bGUtZGVwcz8pXG4gICAgICAvLyB0aG91Z2ggaGVyZSBhbmQgaW4gdGhlIG9yaWdpbmFsIGJyb3dzZXItcGFjayBwcmVsdWRlIGl0IGhhcyBhIHNpZGUgZWZmZWN0IHRoYXQgaXQgaXMgcmUtaW5zdGFudGlhdGVkIGZyb20gdGhlIG9yaWdpbmFsIG1vZHVsZSAobm8gc2hhcmVkIGNsb3N1cmUgc3RhdGUpXG4gICAgICBjb25zdCBkaXJlY3RNb2R1bGVJbnN0YW50aWF0aW9uSW50ZXJmYWNlID0gbmV3IFByb3h5KHt9LCB7XG4gICAgICAgIGdldCAoXywgdGFyZ2V0TW9kdWxlSWQpIHtcbiAgICAgICAgICBjb25zdCBmYWtlTW9kdWxlRGVmaW5pdGlvbiA9IFtmYWtlTW9kdWxlSW5pdGlhbGl6ZXJdXG4gICAgICAgICAgcmV0dXJuIGZha2VNb2R1bGVEZWZpbml0aW9uXG5cbiAgICAgICAgICBmdW5jdGlvbiBmYWtlTW9kdWxlSW5pdGlhbGl6ZXIgKCkge1xuICAgICAgICAgICAgY29uc3QgdGFyZ2V0TW9kdWxlRXhwb3J0cyA9IHJlcXVpcmVSZWxhdGl2ZVdpdGhDb250ZXh0KHRhcmdldE1vZHVsZUlkKVxuICAgICAgICAgICAgbW9kdWxlT2JqLmV4cG9ydHMgPSB0YXJnZXRNb2R1bGVFeHBvcnRzXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICAvLyBpbml0aWFsaXplIHRoZSBtb2R1bGUgd2l0aCB0aGUgY29ycmVjdCBjb250ZXh0XG4gICAgICBtb2R1bGVJbml0aWFsaXplci5jYWxsKG1vZHVsZU9iai5leHBvcnRzLCByZXF1aXJlUmVsYXRpdmVXaXRoQ29udGV4dCwgbW9kdWxlT2JqLCBtb2R1bGVPYmouZXhwb3J0cywgbnVsbCwgZGlyZWN0TW9kdWxlSW5zdGFudGlhdGlvbkludGVyZmFjZSlcblxuICAgICAgLy8gY29uZmlndXJlIG1lbWJyYW5lIGRlZmVuc2VcbiAgICAgIC8vIGRlZmVuc2UgaXMgY29uZmlndXJlZCBoZXJlIGJ1dCBhcHBsaWVkIGVsc2V3aGVyZVxuICAgICAgLy8gc2V0IG1vZHVsZUV4cG9ydHMgZ3JhcGggdG8gcmVhZC1vbmx5XG4gICAgICBjb25zdCBtb2R1bGVFeHBvcnRzID0gbW9kdWxlT2JqLmV4cG9ydHNcbiAgICAgIGRlZXBXYWxrKG1vZHVsZUV4cG9ydHMsICh2YWx1ZSkgPT4ge1xuICAgICAgICAvLyBza2lwIHBsYWluIHZhbHVlc1xuICAgICAgICBpZiAobWVtYnJhbmUuc2hvdWxkU2tpcEJyaWRnZSh2YWx1ZSkpIHJldHVyblxuICAgICAgICAvLyBzZXQgdGhpcyByZWYgdG8gcmVhZC1vbmx5XG4gICAgICAgIHBhY2thZ2VNZW1icmFuZVNwYWNlLmhhbmRsZXJGb3JSZWYuc2V0KHZhbHVlLCBjcmVhdGVSZWFkT25seURpc3RvcnRpb24oe1xuICAgICAgICAgIHNldEhhbmRsZXJGb3JSZWY6IChyZWYsIG5ld0hhbmRsZXIpID0+IHBhY2thZ2VNZW1icmFuZVNwYWNlLmhhbmRsZXJGb3JSZWYuc2V0KHJlZiwgbmV3SGFuZGxlcilcbiAgICAgICAgfSkpXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gbW9kdWxlRXhwb3J0c1xuXG4gICAgICAvLyB0aGlzIGlzIHBhc3NlZCB0byB0aGUgbW9kdWxlIGluaXRpYWxpemVyXG4gICAgICAvLyBpdCBhZGRzIHRoZSBjb250ZXh0IG9mIHRoZSBwYXJlbnQgbW9kdWxlXG4gICAgICAvLyB0aGlzIGNvdWxkIGJlIHJlcGxhY2VkIHZpYSBcIkZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kXCIgaWYgaXRzIG1vcmUgcGVyZm9ybWFudFxuICAgICAgZnVuY3Rpb24gcmVxdWlyZVJlbGF0aXZlV2l0aENvbnRleHQgKHJlcXVlc3RlZE5hbWUpIHtcbiAgICAgICAgY29uc3QgcGFyZW50TW9kdWxlRXhwb3J0cyA9IG1vZHVsZU9iai5leHBvcnRzXG4gICAgICAgIGNvbnN0IHBhcmVudE1vZHVsZURhdGEgPSBtb2R1bGVEYXRhXG4gICAgICAgIGNvbnN0IHBhcmVudFBhY2thZ2VDb25maWcgPSBjb25maWdGb3JNb2R1bGVcbiAgICAgICAgY29uc3QgcGFyZW50TW9kdWxlSWQgPSBtb2R1bGVJZFxuICAgICAgICByZXR1cm4gcmVxdWlyZVJlbGF0aXZlKHsgcmVxdWVzdGVkTmFtZSwgcGFyZW50TW9kdWxlRXhwb3J0cywgcGFyZW50TW9kdWxlRGF0YSwgcGFyZW50UGFja2FnZUNvbmZpZywgcGFyZW50TW9kdWxlSWQgfSlcbiAgICAgIH1cblxuICAgIH1cblxuICAgIC8vIHRoaXMgcmVzb2x2ZXMgYSBtb2R1bGUgZ2l2ZW4gYSByZXF1ZXN0ZWROYW1lIChlZyByZWxhdGl2ZSBwYXRoIHRvIHBhcmVudCkgYW5kIGEgcGFyZW50TW9kdWxlIGNvbnRleHRcbiAgICAvLyB0aGUgZXhwb3J0cyBhcmUgcHJvY2Vzc2VkIHZpYSBcInByb3RlY3RFeHBvcnRzUmVxdWlyZVRpbWVcIiBwZXIgdGhlIG1vZHVsZSdzIGNvbmZpZ3VyYXRpb25cbiAgICBmdW5jdGlvbiByZXF1aXJlUmVsYXRpdmUgKHsgcmVxdWVzdGVkTmFtZSwgcGFyZW50TW9kdWxlRXhwb3J0cywgcGFyZW50TW9kdWxlRGF0YSwgcGFyZW50UGFja2FnZUNvbmZpZywgcGFyZW50TW9kdWxlSWQgfSkge1xuICAgICAgY29uc3QgcGFyZW50TW9kdWxlUGFja2FnZU5hbWUgPSBwYXJlbnRNb2R1bGVEYXRhLnBhY2thZ2VcbiAgICAgIGNvbnN0IHBhcmVudFBhY2thZ2VzV2hpdGVsaXN0ID0gcGFyZW50UGFja2FnZUNvbmZpZy5wYWNrYWdlc1xuXG4gICAgICAvLyByZXNvbHZlIHRoZSBtb2R1bGVJZCBmcm9tIHRoZSByZXF1ZXN0ZWROYW1lXG4gICAgICBjb25zdCBtb2R1bGVJZCA9IGdldFJlbGF0aXZlTW9kdWxlSWQocGFyZW50TW9kdWxlSWQsIHJlcXVlc3RlZE5hbWUpXG5cbiAgICAgIC8vIGJyb3dzZXJpZnkgZ29vcDpcbiAgICAgIC8vIHJlY3Vyc2l2ZSByZXF1aXJlcyBkb250IGhpdCBjYWNoZSBzbyBpdCBpbmYgbG9vcHMsIHNvIHdlIHNob3J0Y2lyY3VpdFxuICAgICAgLy8gdGhpcyBvbmx5IHNlZW1zIHRvIGhhcHBlbiB3aXRoIGEgZmV3IGJyb3dzZXJpZnkgYnVpbHRpbnMgKG5vZGVqcyBidWlsdGluIG1vZHVsZSBwb2x5ZmlsbHMpXG4gICAgICAvLyB3ZSBjb3VsZCBsaWtlbHkgYWxsb3cgYW55IHJlcXVlc3RlZE5hbWUgc2luY2UgaXQgY2FuIG9ubHkgcmVmZXIgdG8gaXRzZWxmXG4gICAgICBpZiAobW9kdWxlSWQgPT09IHBhcmVudE1vZHVsZUlkKSB7XG4gICAgICAgIGlmIChbJ3RpbWVycycsICdidWZmZXInXS5pbmNsdWRlcyhyZXF1ZXN0ZWROYW1lKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYExhdmFNb2F0IC0gcmVjdXJzaXZlIHJlcXVpcmUgZGV0ZWN0ZWQ6IFwiJHtyZXF1ZXN0ZWROYW1lfVwiYClcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGFyZW50TW9kdWxlRXhwb3J0c1xuICAgICAgfVxuXG4gICAgICAvLyBsb2FkIG1vZHVsZVxuICAgICAgY29uc3QgbW9kdWxlRXhwb3J0cyA9IGludGVybmFsUmVxdWlyZShtb2R1bGVJZClcblxuICAgICAgLy8gbG9vayB1cCBjb25maWcgZm9yIG1vZHVsZVxuICAgICAgY29uc3QgbW9kdWxlRGF0YSA9IGxvYWRNb2R1bGVEYXRhKG1vZHVsZUlkKVxuICAgICAgY29uc3QgcGFja2FnZU5hbWUgPSBtb2R1bGVEYXRhLnBhY2thZ2VcblxuICAgICAgLy8gZGlzYWxsb3cgcmVxdWlyaW5nIHBhY2thZ2VzIHRoYXQgYXJlIG5vdCBpbiB0aGUgcGFyZW50J3Mgd2hpdGVsaXN0XG4gICAgICBjb25zdCBpc1NhbWVQYWNrYWdlID0gcGFja2FnZU5hbWUgPT09IHBhcmVudE1vZHVsZVBhY2thZ2VOYW1lXG4gICAgICBjb25zdCBpc0luUGFyZW50V2hpdGVsaXN0ID0gcGFja2FnZU5hbWUgaW4gcGFyZW50UGFja2FnZXNXaGl0ZWxpc3RcbiAgICAgIGNvbnN0IHBhcmVudElzRW50cnlNb2R1bGUgPSBwYXJlbnRNb2R1bGVQYWNrYWdlTmFtZSA9PT0gJzxyb290PidcblxuICAgICAgaWYgKCFwYXJlbnRJc0VudHJ5TW9kdWxlICYmICFpc1NhbWVQYWNrYWdlICYmICFpc0luUGFyZW50V2hpdGVsaXN0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTGF2YU1vYXQgLSByZXF1aXJlZCBwYWNrYWdlIG5vdCBpbiB3aGl0ZWxpc3Q6IHBhY2thZ2UgXCIke3BhcmVudE1vZHVsZVBhY2thZ2VOYW1lfVwiIHJlcXVlc3RlZCBcIiR7cGFja2FnZU5hbWV9XCIgYXMgXCIke3JlcXVlc3RlZE5hbWV9XCJgKVxuICAgICAgfVxuXG4gICAgICAvLyBtb2R1bGVFeHBvcnRzIHJlcXVpcmUtdGltZSBwcm90ZWN0aW9uXG4gICAgICBpZiAocGFyZW50TW9kdWxlUGFja2FnZU5hbWUgJiYgaXNTYW1lUGFja2FnZSkge1xuICAgICAgICAvLyByZXR1cm4gcmF3IGlmIHNhbWUgcGFja2FnZVxuICAgICAgICByZXR1cm4gbW9kdWxlRXhwb3J0c1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gYXBwbHkgbWVtYnJhbmUgcHJvdGVjdGlvbnNcbiAgICAgICAgY29uc3QgaW5HcmFwaCA9IGdldE1lbWJyYW5lU3BhY2VGb3JQYWNrYWdlKHBhY2thZ2VOYW1lKVxuICAgICAgICBsZXQgb3V0R3JhcGhcbiAgICAgICAgLy8gc2V0IDxyb290PidzIG1lbWJyYW5lIHNwYWNlIHRvIDxlbmRvd21lbnRzPiBzbyBpdCByZWNlaXZlcyB1bndyYXBwZWQgcmVmc1xuICAgICAgICBpZiAocGFyZW50TW9kdWxlUGFja2FnZU5hbWUgPT09ICc8cm9vdD4nKSB7XG4gICAgICAgICAgb3V0R3JhcGggPSBnZXRNZW1icmFuZVNwYWNlRm9yUGFja2FnZSgnPGVuZG93bWVudHM+JylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvdXRHcmFwaCA9IGdldE1lbWJyYW5lU3BhY2VGb3JQYWNrYWdlKHBhcmVudE1vZHVsZVBhY2thZ2VOYW1lKVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHByb3RlY3RlZEV4cG9ydHMgPSBtZW1icmFuZS5icmlkZ2UobW9kdWxlRXhwb3J0cywgaW5HcmFwaCwgb3V0R3JhcGgpXG4gICAgICAgIHJldHVybiBwcm90ZWN0ZWRFeHBvcnRzXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TWVtYnJhbmVTcGFjZUZvclBhY2thZ2UgKHBhY2thZ2VOYW1lKSB7XG4gICAgICBpZiAobWVtYnJhbmVTcGFjZUZvclBhY2thZ2UuaGFzKHBhY2thZ2VOYW1lKSkge1xuICAgICAgICByZXR1cm4gbWVtYnJhbmVTcGFjZUZvclBhY2thZ2UuZ2V0KHBhY2thZ2VOYW1lKVxuICAgICAgfVxuXG4gICAgICBjb25zdCBtZW1icmFuZVNwYWNlID0gbWVtYnJhbmUubWFrZU1lbWJyYW5lU3BhY2Uoe1xuICAgICAgICBsYWJlbDogcGFja2FnZU5hbWUsXG4gICAgICAgIC8vIGRlZmF1bHQgaXMgYSB0cmFuc3BhcmVudCBtZW1icmFuZSBoYW5kbGVyXG4gICAgICAgIGNyZWF0ZUhhbmRsZXI6ICgpID0+IFJlZmxlY3QsXG4gICAgICB9KVxuICAgICAgbWVtYnJhbmVTcGFjZUZvclBhY2thZ2Uuc2V0KHBhY2thZ2VOYW1lLCBtZW1icmFuZVNwYWNlKVxuICAgICAgcmV0dXJuIG1lbWJyYW5lU3BhY2VcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZWVwV2FsayAodmFsdWUsIHZpc2l0b3IpIHtcbiAgICAgIC8vIHRoZSB2YWx1ZSBpdHNlbGZcbiAgICAgIHZpc2l0b3IodmFsdWUpXG4gICAgICAvLyBsb29rdXAgY2hpbGRyZW5cbiAgICAgIGxldCBwcm90bywgcHJvcHMgPSBbXVxuICAgICAgdHJ5IHtcbiAgICAgICAgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodmFsdWUpXG4gICAgICAgIHByb3BzID0gT2JqZWN0LnZhbHVlcyhPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyh2YWx1ZSkpXG4gICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgIC8vIGlnbm9yZSBlcnJvciBpZiB3ZSBjYW4ndCBnZXQgcHJvdG8vcHJvcHMgKHZhbHVlIGlzIHVuZGVmaW5lZCwgbnVsbCwgZXRjKVxuICAgICAgfVxuICAgICAgLy8gdGhlIG93biBwcm9wZXJ0aWVzXG4gICAgICBwcm9wcy5tYXAoZW50cnkgPT4ge1xuICAgICAgICBpZiAoJ3ZhbHVlJyBpbiBlbnRyeSkgdmlzaXRvcihlbnRyeS52YWx1ZSlcbiAgICAgIH0pXG4gICAgICAvLyB0aGUgcHJvdG90eXBlXG4gICAgICBpZiAocHJvdG8pIHZpc2l0b3IocHJvdG8pXG4gICAgfVxuXG4gICAgLy8gdGhpcyBnZXRzIHRoZSBsYXZhTW9hdCBjb25maWcgZm9yIGEgbW9kdWxlIGJ5IHBhY2thZ2VOYW1lXG4gICAgLy8gaWYgdGhlcmUgd2VyZSBnbG9iYWwgZGVmYXVsdHMgKGUuZy4gZXZlcnl0aGluZyBnZXRzIFwiY29uc29sZVwiKSB0aGV5IGNvdWxkIGJlIGFwcGxpZWQgaGVyZVxuICAgIGZ1bmN0aW9uIGdldENvbmZpZ0ZvclBhY2thZ2UgKGNvbmZpZywgcGFja2FnZU5hbWUpIHtcbiAgICAgIGNvbnN0IHBhY2thZ2VDb25maWcgPSAoY29uZmlnLnJlc291cmNlcyB8fCB7fSlbcGFja2FnZU5hbWVdIHx8IHt9XG4gICAgICBwYWNrYWdlQ29uZmlnLmdsb2JhbHMgPSBwYWNrYWdlQ29uZmlnLmdsb2JhbHMgfHwge31cbiAgICAgIHBhY2thZ2VDb25maWcucGFja2FnZXMgPSBwYWNrYWdlQ29uZmlnLnBhY2thZ2VzIHx8IHt9XG4gICAgICByZXR1cm4gcGFja2FnZUNvbmZpZ1xuICAgIH1cblxuICAgIC8vIyBzb3VyY2VVUkw9TGF2YW1vYXQvY29yZS9rZXJuZWxcbiAgfVxuXG59KSgpXG4gIGNvbnN0IHsgaW50ZXJuYWxSZXF1aXJlIH0gPSBjcmVhdGVLZXJuZWwoe1xuICAgIHJlYWxtLFxuICAgIHVuc2FmZUV2YWxXaXRoRW5kb3dtZW50cyxcbiAgICBnbG9iYWxSZWYsXG4gICAgZGVidWdNb2RlLFxuICAgIGxhdmFtb2F0Q29uZmlnLFxuICAgIGxvYWRNb2R1bGVEYXRhLFxuICAgIGdldFJlbGF0aXZlTW9kdWxlSWQsXG4gIH0pXG5cbiAgLy8gY3JlYXRlIGEgbGF2YW1vYXQgcHVsaWMgQVBJIGZvciBsb2FkaW5nIG1vZHVsZXMgb3ZlciBtdWx0aXBsZSBmaWxlc1xuICBjb25zdCBsYXZhbW9hdFB1YmxpY0FwaSA9IE9iamVjdC5mcmVlemUoe1xuICAgIGxvYWRCdW5kbGU6IE9iamVjdC5mcmVlemUobG9hZEJ1bmRsZSksXG4gIH0pXG4gIGdsb2JhbFJlZi5MYXZhTW9hdCA9IGxhdmFtb2F0UHVibGljQXBpXG5cbiAgcmV0dXJuIGxvYWRCdW5kbGVcblxuXG4gIC8vIHRoaXMgcGVyZm9ybXMgYW4gdW5zYWZlRXZhbCBpbiB0aGUgY29udGV4dCBvZiB0aGUgcHJvdmlkZWQgZW5kb3dtZW50c1xuICBmdW5jdGlvbiB1bnNhZmVFdmFsV2l0aEVuZG93bWVudHMoY29kZSwgZW5kb3dtZW50cykge1xuICAgIHdpdGggKGVuZG93bWVudHMpIHtcbiAgICAgIHJldHVybiBldmFsKGNvZGUpXG4gICAgfVxuICB9XG5cblxuICAvLyBpdCBpcyBjYWxsZWQgYnkgdGhlIG1vZHVsZXMgY29sbGVjdGlvbiB0aGF0IHdpbGwgYmUgYXBwZW5kZWQgdG8gdGhpcyBmaWxlXG4gIGZ1bmN0aW9uIGxvYWRCdW5kbGUgKG5ld01vZHVsZXMsIGVudHJ5UG9pbnRzLCBuZXdDb25maWcpIHtcbiAgICAvLyB2ZXJpZnkgKyBsb2FkIGNvbmZpZ1xuICAgIE9iamVjdC5lbnRyaWVzKG5ld0NvbmZpZy5yZXNvdXJjZXMgfHwge30pLmZvckVhY2goKFtwYWNrYWdlTmFtZSwgcGFja2FnZUNvbmZpZ10pID0+IHtcbiAgICAgIGlmIChwYWNrYWdlTmFtZSBpbiBsYXZhbW9hdENvbmZpZykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYExhdmFNb2F0IC0gbG9hZEJ1bmRsZSBlbmNvdW50ZXJlZCByZWR1bmRhbnQgY29uZmlnIGRlZmluaXRpb24gZm9yIHBhY2thZ2UgXCIke3BhY2thZ2VOYW1lfVwiYClcbiAgICAgIH1cbiAgICAgIGxhdmFtb2F0Q29uZmlnLnJlc291cmNlc1twYWNrYWdlTmFtZV0gPSBwYWNrYWdlQ29uZmlnXG4gICAgfSlcbiAgICAvLyB2ZXJpZnkgKyBsb2FkIGluIGVhY2ggbW9kdWxlXG4gICAgZm9yIChjb25zdCBbbW9kdWxlSWQsIG1vZHVsZURhdGFdIG9mIE9iamVjdC5lbnRyaWVzKG5ld01vZHVsZXMpKSB7XG4gICAgICAvLyB2ZXJpZnkgdGhhdCBtb2R1bGUgaXMgbmV3XG4gICAgICBpZiAobW9kdWxlSWQgaW4gbW9kdWxlcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYExhdmFNb2F0IC0gbG9hZEJ1bmRsZSBlbmNvdW50ZXJlZCByZWR1bmRhbnQgbW9kdWxlIGRlZmluaXRpb24gZm9yIGlkIFwiJHttb2R1bGVJZH1cImApXG4gICAgICB9XG4gICAgICAvLyBjb252ZXJ0IGFsbCBtb2R1bGUgc291cmNlIHRvIHN0cmluZ1xuICAgICAgLy8gdGhpcyBjb3VsZCBoYXBwZW4gYXQgYnVpbGQgdGltZSxcbiAgICAgIC8vIGJ1dCBzaGlwcGluZyBpdCBhcyBjb2RlIG1ha2VzIGl0IGVhc2llciB0byBkZWJ1ZywgbWF5YmVcbiAgICAgIGZvciAobGV0IG1vZHVsZURhdGEgb2YgT2JqZWN0LnZhbHVlcyhuZXdNb2R1bGVzKSkge1xuICAgICAgICBsZXQgbW9kdWxlU291cmNlID0gYCgke21vZHVsZURhdGEuc291cmNlfSlgXG4gICAgICAgIGlmIChtb2R1bGVEYXRhLmZpbGUpIHtcbiAgICAgICAgICBjb25zdCBtb2R1bGVTb3VyY2VMYWJlbCA9IGAvLyBtb2R1bGVTb3VyY2U6ICR7bW9kdWxlRGF0YS5maWxlfWBcbiAgICAgICAgICBtb2R1bGVTb3VyY2UgKz0gYFxcblxcbiR7bW9kdWxlU291cmNlTGFiZWx9YFxuICAgICAgICB9XG4gICAgICAgIG1vZHVsZURhdGEuc291cmNlU3RyaW5nID0gbW9kdWxlU291cmNlXG4gICAgICB9XG4gICAgICAvLyBhZGQgdGhlIG1vZHVsZVxuICAgICAgbW9kdWxlc1ttb2R1bGVJZF0gPSBtb2R1bGVEYXRhXG4gICAgfVxuICAgIC8vIHJ1biBlYWNoIG9mIGVudHJ5UG9pbnRzXG4gICAgY29uc3QgZW50cnlFeHBvcnRzID0gQXJyYXkucHJvdG90eXBlLm1hcC5jYWxsKGVudHJ5UG9pbnRzLCAoZW50cnlJZCkgPT4ge1xuICAgICAgcmV0dXJuIGludGVybmFsUmVxdWlyZShlbnRyeUlkKVxuICAgIH0pXG4gICAgLy8gd2VicGFjayBjb21wYXQ6IHJldHVybiB0aGUgZmlyc3QgbW9kdWxlJ3MgZXhwb3J0c1xuICAgIHJldHVybiBlbnRyeUV4cG9ydHNbMF1cbiAgfVxuXG4gIGZ1bmN0aW9uIGxvYWRNb2R1bGVEYXRhIChtb2R1bGVJZCkge1xuICAgIHJldHVybiBtb2R1bGVzW21vZHVsZUlkXVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UmVsYXRpdmVNb2R1bGVJZCAocGFyZW50TW9kdWxlSWQsIHJlcXVlc3RlZE5hbWUpIHtcbiAgICBjb25zdCBwYXJlbnRNb2R1bGVEYXRhID0gbW9kdWxlc1twYXJlbnRNb2R1bGVJZF1cbiAgICBpZiAoIShyZXF1ZXN0ZWROYW1lIGluIHBhcmVudE1vZHVsZURhdGEuZGVwcykpIHtcbiAgICAgIGNvbnNvbGUud2FybihgbWlzc2luZyBkZXA6ICR7cGFyZW50TW9kdWxlRGF0YS5wYWNrYWdlTmFtZX0gcmVxdWVzdGVkICR7cmVxdWVzdGVkTmFtZX1gKVxuICAgIH1cbiAgICByZXR1cm4gcGFyZW50TW9kdWxlRGF0YS5kZXBzW3JlcXVlc3RlZE5hbWVdIHx8IHJlcXVlc3RlZE5hbWVcbiAgfVxuXG59KSgpXG4iXX0=
