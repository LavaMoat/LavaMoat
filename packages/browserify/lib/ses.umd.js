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

  // Remove code modifications.
  function cleanupSource(src) {
    /* START_TESTS_ONLY */

    // Restore eval which is modified by esm module.
    src = src.replace(/\(0,[^)]+\)/g, '(0, eval)');

    // Remove code coverage which is injected by nyc module.
    src = src.replace(/cov_[^+]+\+\+[;,]/g, '');

    /* END_TESTS_ONLY */
    return src;
  }

  // buildChildRealm is immediately turned into a string, and this function is
  // never referenced again, because it closes over the wrong intrinsics

  function buildChildRealm(unsafeRec, BaseRealm) {
    const {
      initRootRealm,
      initCompartment,
      getRealmGlobal,
      realmEvaluate
    } = BaseRealm;

    // This Object and Reflect are brand new, from a new unsafeRec, so no user
    // code has been run or had a chance to manipulate them. We extract these
    // properties for brevity, not for security. Don't ever run this function
    // *after* user code has had a chance to pollute its environment, or it
    // could be used to gain access to BaseRealm and primal-realm Error
    // objects.
    const { create, defineProperties } = Object;

    const errorConstructors = new Map([
      ['EvalError', EvalError],
      ['RangeError', RangeError],
      ['ReferenceError', ReferenceError],
      ['SyntaxError', SyntaxError],
      ['TypeError', TypeError],
      ['URIError', URIError]
    ]);

    // Like Realm.apply except that it catches anything thrown and rethrows it
    // as an Error from this realm
    function callAndWrapError(target, ...args) {
      try {
        return target(...args);
      } catch (err) {
        if (Object(err) !== err) {
          // err is a primitive value, which is safe to rethrow
          throw err;
        }
        let eName, eMessage, eStack;
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
        callAndWrapError(initRootRealm, unsafeRec, r, options);
        return r;
      }

      static makeCompartment(options = {}) {
        // Bypass the constructor.
        const r = create(Realm.prototype);
        callAndWrapError(initCompartment, unsafeRec, r, options);
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
        return callAndWrapError(getRealmGlobal, this);
      }

      evaluate(x, endowments, options = {}) {
        // safe against strange 'this', as above
        return callAndWrapError(realmEvaluate, this, x, endowments, options);
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
  const buildChildRealmString = cleanupSource(
    `'use strict'; (${buildChildRealm})`
  );

  function createRealmFacade(unsafeRec, BaseRealm) {
    const { unsafeEval } = unsafeRec;

    // The BaseRealm is the Realm class created by
    // the shim. It's only valid for the context where
    // it was parsed.

    // The Realm facade is a lightweight class built in the
    // context a different context, that provide a fully
    // functional Realm class using the intrisics
    // of that context.

    // This process is simplified because all methods
    // and properties on a realm instance already return
    // values using the intrinsics of the realm's context.

    // Invoke the BaseRealm constructor with Realm as the prototype.
    return unsafeEval(buildChildRealmString)(unsafeRec, BaseRealm);
  }

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

    return freeze({
      unsafeGlobal,
      sharedGlobalDescs,
      unsafeEval: unsafeGlobal.eval,
      unsafeFunction: unsafeGlobal.Function,
      allShims
    });
  }

  const repairAccessorsShim = cleanupSource(
    `"use strict"; (${repairAccessors})();`
  );
  const repairFunctionsShim = cleanupSource(
    `"use strict"; (${repairFunctions})();`
  );

  // Create a new unsafeRec from a brand new context, with new intrinsics and a
  // new global object
  function createNewUnsafeRec(allShims) {
    const unsafeGlobal = getNewUnsafeGlobal();
    unsafeGlobal.eval(repairAccessorsShim);
    unsafeGlobal.eval(repairFunctionsShim);
    return createUnsafeRec(unsafeGlobal, allShims);
  }

  // Create a new unsafeRec from the current context, where the Realm shim is
  // being parsed and executed, aka the "Primal Realm"
  function createCurrentUnsafeRec() {
    const unsafeGlobal = (0, eval)(unsafeGlobalSrc);
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
  function getOptimizableGlobals(safeGlobal) {
    const descs = getOwnPropertyDescriptors(safeGlobal);

    // getOwnPropertyNames does ignore Symbols so we don't need this extra check:
    // typeof name === 'string' &&
    const constants = arrayFilter(getOwnPropertyNames(descs), name => {
      // Ensure we have a valid identifier. We use regexpTest rather than
      // /../.test() to guard against the case where RegExp has been poisoned.
      if (
        name === 'eval' ||
        keywords.has(name) ||
        !regexpTest(identifierPattern, name)
      ) {
        return false;
      }

      const desc = descs[name];
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
   * alwaysThrowHandler is a proxy handler which throws on any trap called.
   * It's made from a proxy with a get trap that throws. Its target is
   * an immutable (frozen) object and is safe to share.
   */
  const alwaysThrowHandler = new Proxy(freeze({}), {
    get(target, prop) {
      throwTantrum(`unexpected scope handler trap called: ${prop}`);
    }
  });

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
   */
  function createScopeHandler(unsafeRec, safeGlobal, sloppyGlobals) {
    const { unsafeGlobal, unsafeEval } = unsafeRec;

    // This flag allow us to determine if the eval() call is an done by the
    // realm's code or if it is user-land invocation, so we can react differently.
    let useUnsafeEvaluator = false;

    return {
      // The scope handler throws if any trap other than get/set/has are run
      // (e.g. getOwnPropertyDescriptors, apply, getPrototypeOf).
      // eslint-disable-next-line no-proto
      __proto__: alwaysThrowHandler,

      allowUnsafeEvaluatorOnce() {
        useUnsafeEvaluator = true;
      },

      unsafeEvaluatorAllowed() {
        return useUnsafeEvaluator;
      },

      get(target, prop) {
        // Special treatment for eval. The very first lookup of 'eval' gets the
        // unsafe (real direct) eval, so it will get the lexical scope that uses
        // the 'with' context.
        if (prop === 'eval') {
          // test that it is true rather than merely truthy
          if (useUnsafeEvaluator === true) {
            // revoke before use
            useUnsafeEvaluator = false;
            return unsafeEval;
          }
          return target.eval;
        }

        // todo: shim integrity, capture Symbol.unscopables
        if (prop === Symbol.unscopables) {
          // Safe to return a primal realm Object here because the only code that
          // can do a get() on a non-string is the internals of with() itself,
          // and the only thing it does is to look for properties on it. User
          // code cannot do a lookup on non-strings.
          return undefined;
        }

        // Properties of the global.
        if (prop in target) {
          return target[prop];
        }

        // Prevent the lookup for other properties.
        return undefined;
      },

      // eslint-disable-next-line class-methods-use-this
      set(target, prop, value) {
        // todo: allow modifications when target.hasOwnProperty(prop) and it
        // is writable, assuming we've already rejected overlap (see
        // createSafeEvaluatorFactory.factory). This TypeError gets replaced with
        // target[prop] = value
        if (objectHasOwnProperty(target, prop)) {
          // todo: shim integrity: TypeError, String
          throw new TypeError(`do not modify endowments like ${String(prop)}`);
        }

        safeGlobal[prop] = value;

        // Return true after successful set.
        return true;
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

      has(target, prop) {
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
        if (prop === 'eval' || prop in target || prop in unsafeGlobal) {
          return true;
        }

        return false;
      }
    };
  }

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
    const { unsafeFunction } = unsafeRec;

    const scopeHandler = createScopeHandler(unsafeRec, safeGlobal, sloppyGlobals);
    const constants = getOptimizableGlobals(safeGlobal);
    const scopedEvaluatorFactory = createScopedEvaluatorFactory(
      unsafeRec,
      constants
    );

    function factory(endowments = {}, options = {}) {
      const localTransforms = options.transforms || [];
      const realmTransforms = transforms || [];

      const mandatoryTransforms = [rejectDangerousSourcesTransform];
      const allTransforms = [
        ...localTransforms,
        ...realmTransforms,
        ...mandatoryTransforms
      ];

      // We use the the concise method syntax to create an eval without a
      // [[Construct]] behavior (such that the invocation "new eval()" throws
      // TypeError: eval is not a constructor"), but which still accepts a
      // 'this' binding.
      const safeEval = {
        eval(src) {
          src = `${src}`;
          // Rewrite the source, threading through rewriter state as necessary.
          const rewriterState = allTransforms.reduce(
            (rs, transform) => (transform.rewrite ? transform.rewrite(rs) : rs),
            { src, endowments }
          );
          src = rewriterState.src;

          const scopeTarget = create(
            safeGlobal,
            getOwnPropertyDescriptors(rewriterState.endowments)
          );
          const scopeProxy = new Proxy(scopeTarget, scopeHandler);
          const scopedEvaluator = apply(scopedEvaluatorFactory, safeGlobal, [
            scopeProxy
          ]);

          scopeHandler.allowUnsafeEvaluatorOnce();
          let err;
          try {
            // Ensure that "this" resolves to the safe global.
            return apply(scopedEvaluator, safeGlobal, [src]);
          } catch (e) {
            // stash the child-code error in hopes of debugging the internal failure
            err = e;
            throw e;
          } finally {
            // belt and suspenders: the proxy switches this off immediately after
            // the first access, but if that's not the case we abort.
            if (scopeHandler.unsafeEvaluatorAllowed()) {
              throwTantrum('handler did not revoke useUnsafeEvaluator', err);
            }
          }
        }
      }.eval;

      // safeEval's prototype is currently the primal realm's
      // Function.prototype, which we must not let escape. To make 'eval
      // instanceof Function' be true inside the realm, we need to point it at
      // the RootRealm's value.

      // Ensure that eval from any compartment in a root realm is an instance
      // of Function in any compartment of the same root realm.
      setPrototypeOf(safeEval, unsafeFunction.prototype);

      assert(getPrototypeOf(safeEval).constructor !== Function, 'hide Function');
      assert(
        getPrototypeOf(safeEval).constructor !== unsafeFunction,
        'hide unsafeFunction'
      );

      // note: be careful to not leak our primal Function.prototype by setting
      // this to a plain arrow function. Now that we have safeEval, use it.
      defineProperties(safeEval, {
        toString: {
          // We break up the following literal string so that an
          // apparent direct eval syntax does not appear in this
          // file. Thus, we avoid rejection by the overly eager
          // rejectDangerousSources.
          value: safeEval("() => 'function eval' + '() { [shim code] }'"),
          writable: false,
          enumerable: false,
          configurable: true
        }
      });

      return safeEval;
    }

    return factory;
  }

  function createSafeEvaluator(safeEvaluatorFactory) {
    return safeEvaluatorFactory();
  }

  function createSafeEvaluatorWhichTakesEndowments(safeEvaluatorFactory) {
    return (x, endowments, options = {}) =>
      safeEvaluatorFactory(endowments, options)(x);
  }

  /**
   * A safe version of the native Function which relies on
   * the safety of evalEvaluator for confinement.
   */
  function createFunctionEvaluator(unsafeRec, safeEval) {
    const { unsafeFunction, unsafeGlobal } = unsafeRec;

    const safeFunction = function Function(...params) {
      const functionBody = `${arrayPop(params) || ''}`;
      let functionParams = `${arrayJoin(params, ',')}`;
      if (!regexpTest(/^[\w\s,]*$/, functionParams)) {
        throw new unsafeGlobal.SyntaxError(
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

      return safeEval(src);
    };

    // Ensure that Function from any compartment in a root realm can be used
    // with instance checks in any compartment of the same root realm.
    setPrototypeOf(safeFunction, unsafeFunction.prototype);

    assert(
      getPrototypeOf(safeFunction).constructor !== Function,
      'hide Function'
    );
    assert(
      getPrototypeOf(safeFunction).constructor !== unsafeFunction,
      'hide unsafeFunction'
    );

    defineProperties(safeFunction, {
      // Ensure that any function created in any compartment in a root realm is an
      // instance of Function in any compartment of the same root ralm.
      prototype: { value: unsafeFunction.prototype },

      // Provide a custom output without overwriting the
      // Function.prototype.toString which is called by some third-party
      // libraries.
      toString: {
        value: safeEval("() => 'function Function() { [shim code] }'"),
        writable: false,
        enumerable: false,
        configurable: true
      }
    });

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
    const safeEval = createSafeEvaluator(safeEvaluatorFactory);
    const safeEvalWhichTakesEndowments = createSafeEvaluatorWhichTakesEndowments(
      safeEvaluatorFactory
    );
    const safeFunction = createFunctionEvaluator(unsafeRec, safeEval);

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

    // eslint-disable-next-line no-use-before-define
    const Realm = createRealmFacade(unsafeRec, BaseRealm);

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
          call: t$1, // set by "web3.js"
        },
      },

      Error: {
        prototype: {
          constructor: t$1, // set by "fast-json-patch"
          message: t$1,
          name: t$1, // set by "precond"
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
      ArrayIteratorPrototype: '*',
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
      // b.removeProperties(r.global);

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

  const creatorStrings = "(function (exports) {\n  'use strict';\n\n  // Adapted from SES/Caja - Copyright (C) 2011 Google Inc.\n  // Copyright (C) 2018 Agoric\n\n  // Licensed under the Apache License, Version 2.0 (the \"License\");\n  // you may not use this file except in compliance with the License.\n  // You may obtain a copy of the License at\n  //\n  // http://www.apache.org/licenses/LICENSE-2.0\n  //\n  // Unless required by applicable law or agreed to in writing, software\n  // distributed under the License is distributed on an \"AS IS\" BASIS,\n  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  // See the License for the specific language governing permissions and\n  // limitations under the License.\n\n  // based upon:\n  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/startSES.js\n  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/repairES5.js\n  // then copied from proposal-frozen-realms deep-freeze.js\n  // then copied from SES/src/bundle/deepFreeze.js\n\n  /**\n   * @typedef HardenerOptions\n   * @type {object}\n   * @property {WeakSet=} fringeSet WeakSet to use for the fringeSet\n   * @property {Function=} naivePrepareObject Call with object before hardening\n   */\n\n  /**\n   * Create a `harden` function.\n   *\n   * @param {Iterable} initialFringe Objects considered already hardened\n   * @param {HardenerOptions=} options Options for creation\n   */\n  function makeHardener(initialFringe, options = {}) {\n    const { freeze, getOwnPropertyDescriptors, getPrototypeOf } = Object;\n    const { ownKeys } = Reflect;\n\n    // Objects that we won't freeze, either because we've frozen them already,\n    // or they were one of the initial roots (terminals). These objects form\n    // the \"fringe\" of the hardened object graph.\n    let { fringeSet } = options;\n    if (fringeSet) {\n      if (\n        typeof fringeSet.add !== 'function' ||\n        typeof fringeSet.has !== 'function'\n      ) {\n        throw new TypeError(\n          `options.fringeSet must have add() and has() methods`,\n        );\n      }\n\n      // Populate the supplied fringeSet with our initialFringe.\n      if (initialFringe) {\n        for (const fringe of initialFringe) {\n          fringeSet.add(fringe);\n        }\n      }\n    } else {\n      // Use a new empty fringe.\n      fringeSet = new WeakSet(initialFringe);\n    }\n\n    const naivePrepareObject = options && options.naivePrepareObject;\n\n    function harden(root) {\n      const toFreeze = new Set();\n      const prototypes = new Map();\n      const paths = new WeakMap();\n\n      // If val is something we should be freezing but aren't yet,\n      // add it to toFreeze.\n      function enqueue(val, path) {\n        if (Object(val) !== val) {\n          // ignore primitives\n          return;\n        }\n        const type = typeof val;\n        if (type !== 'object' && type !== 'function') {\n          // future proof: break until someone figures out what it should do\n          throw new TypeError(`Unexpected typeof: ${type}`);\n        }\n        if (fringeSet.has(val) || toFreeze.has(val)) {\n          // Ignore if this is an exit, or we've already visited it\n          return;\n        }\n        // console.log(`adding ${val} to toFreeze`, val);\n        toFreeze.add(val);\n        paths.set(val, path);\n      }\n\n      function freezeAndTraverse(obj) {\n        // Apply the naive preparer if they specified one.\n        if (naivePrepareObject) {\n          naivePrepareObject(obj);\n        }\n\n        // Now freeze the object to ensure reactive\n        // objects such as proxies won't add properties\n        // during traversal, before they get frozen.\n\n        // Object are verified before being enqueued,\n        // therefore this is a valid candidate.\n        // Throws if this fails (strict mode).\n        freeze(obj);\n\n        // we rely upon certain commitments of Object.freeze and proxies here\n\n        // get stable/immutable outbound links before a Proxy has a chance to do\n        // something sneaky.\n        const proto = getPrototypeOf(obj);\n        const descs = getOwnPropertyDescriptors(obj);\n        const path = paths.get(obj) || 'unknown';\n\n        // console.log(`adding ${proto} to prototypes under ${path}`);\n        if (proto !== null && !prototypes.has(proto)) {\n          prototypes.set(proto, path);\n          paths.set(proto, `${path}.__proto__`);\n        }\n\n        ownKeys(descs).forEach(name => {\n          const pathname = `${path}.${String(name)}`;\n          // todo uncurried form\n          // todo: getOwnPropertyDescriptors is guaranteed to return well-formed\n          // descriptors, but they still inherit from Object.prototype. If\n          // someone has poisoned Object.prototype to add 'value' or 'get'\n          // properties, then a simple 'if (\"value\" in desc)' or 'desc.value'\n          // test could be confused. We use hasOwnProperty to be sure about\n          // whether 'value' is present or not, which tells us for sure that this\n          // is a data property.\n          const desc = descs[name];\n          if ('value' in desc) {\n            // todo uncurried form\n            enqueue(desc.value, `${pathname}`);\n          } else {\n            enqueue(desc.get, `${pathname}(get)`);\n            enqueue(desc.set, `${pathname}(set)`);\n          }\n        });\n      }\n\n      function dequeue() {\n        // New values added before forEach() has finished will be visited.\n        toFreeze.forEach(freezeAndTraverse); // todo curried forEach\n      }\n\n      function checkPrototypes() {\n        prototypes.forEach((path, p) => {\n          if (!(toFreeze.has(p) || fringeSet.has(p))) {\n            // all reachable properties have already been frozen by this point\n            let msg;\n            try {\n              msg = `prototype ${p} of ${path} is not already in the fringeSet`;\n            } catch (e) {\n              // `${(async _=>_).__proto__}` fails in most engines\n              msg =\n                'a prototype of something is not already in the fringeset (and .toString failed)';\n              try {\n                console.log(msg);\n                console.log('the prototype:', p);\n                console.log('of something:', path);\n              } catch (_e) {\n                // console.log might be missing in restrictive SES realms\n              }\n            }\n            throw new TypeError(msg);\n          }\n        });\n      }\n\n      function commit() {\n        // todo curried forEach\n        // we capture the real WeakSet.prototype.add above, in case someone\n        // changes it. The two-argument form of forEach passes the second\n        // argument as the 'this' binding, so we add to the correct set.\n        toFreeze.forEach(fringeSet.add, fringeSet);\n      }\n\n      enqueue(root);\n      dequeue();\n      // console.log(\"fringeSet\", fringeSet);\n      // console.log(\"prototype set:\", prototypes);\n      // console.log(\"toFreeze set:\", toFreeze);\n      checkPrototypes();\n      commit();\n\n      return root;\n    }\n\n    return harden;\n  }\n\n  function tameDate() {\n    const unsafeDate = Date;\n    // Date(anything) gives a string with the current time\n    // new Date(x) coerces x into a number and then returns a Date\n    // new Date() returns the current time, as a Date object\n    // new Date(undefined) returns a Date object which stringifies to 'Invalid Date'\n\n    const newDateConstructor = function Date(...args) {\n      if (new.target === undefined) {\n        // we were not called as a constructor\n        // this would normally return a string with the current time\n        return 'Invalid Date';\n      }\n      // constructor behavior: if we get arguments, we can safely pass them through\n      if (args.length > 0) {\n        return Reflect.construct(unsafeDate, args, new.target);\n        // todo: test that our constructor can still be subclassed\n      }\n      // no arguments: return a Date object, but invalid\n      return Reflect.construct(unsafeDate, [NaN], new.target);\n    };\n\n    Object.defineProperties(\n      newDateConstructor,\n      Object.getOwnPropertyDescriptors(unsafeDate),\n    );\n    // that will copy the .prototype too, so this next line is unnecessary\n    // newDateConstructor.prototype = unsafeDate.prototype;\n    unsafeDate.prototype.constructor = newDateConstructor;\n    // disable Date.now\n    newDateConstructor.now = () => NaN;\n\n    Date = newDateConstructor; // eslint-disable-line no-global-assign\n  }\n\n  function tameMath() {\n    // Math.random = () => 4; // https://www.xkcd.com/221\n    Math.random = () => {\n      throw Error('disabled');\n    };\n  }\n\n  /* global Intl */\n\n  function tameIntl() {\n    // todo: somehow fix these. These almost certainly don't enable the reading\n    // of side-channels, but we want things to be deterministic across\n    // runtimes. Best bet is to just disallow calling these functions without\n    // an explicit locale name.\n\n    // the whitelist may have deleted Intl entirely, so tolerate that\n    if (typeof Intl !== 'undefined') {\n      Intl.DateTimeFormat = () => {\n        throw Error('disabled');\n      };\n      Intl.NumberFormat = () => {\n        throw Error('disabled');\n      };\n      Intl.getCanonicalLocales = () => {\n        throw Error('disabled');\n      };\n    }\n    // eslint-disable-next-line no-extend-native\n    Object.prototype.toLocaleString = () => {\n      throw new Error('toLocaleString suppressed');\n    };\n  }\n\n  function tameError() {\n    if (!Object.isExtensible(Error)) {\n      throw Error('huh Error is not extensible');\n    }\n    /* this worked back when we were running it on a global, but stopped\n    working when we turned it into a shim */\n    /*\n    Object.defineProperty(Error.prototype, \"stack\",\n                          { get() { return 'stack suppressed'; } });\n    */\n    delete Error.captureStackTrace;\n    if ('captureStackTrace' in Error) {\n      throw Error('hey we could not remove Error.captureStackTrace');\n    }\n\n    // we might do this in the future\n    /*\n    const unsafeError = Error;\n    const newErrorConstructor = function Error(...args) {\n      return Reflect.construct(unsafeError, args, new.target);\n    };\n\n    newErrorConstructor.prototype = unsafeError.prototype;\n    newErrorConstructor.prototype.construct = newErrorConstructor;\n\n    Error = newErrorConstructor;\n\n    EvalError.__proto__ = newErrorConstructor;\n    RangeError.__proto__ = newErrorConstructor;\n    ReferenceError.__proto__ = newErrorConstructor;\n    SyntaxError.__proto__ = newErrorConstructor;\n    TypeError.__proto__ = newErrorConstructor;\n    URIError.__proto__ = newErrorConstructor;\n    */\n  }\n\n  function tameRegExp() {\n    delete RegExp.prototype.compile;\n    if ('compile' in RegExp.prototype) {\n      throw Error('hey we could not remove RegExp.prototype.compile');\n    }\n\n    // We want to delete RegExp.$1, as well as any other surprising properties.\n    // On some engines we can't just do 'delete RegExp.$1'.\n    const unsafeRegExp = RegExp;\n\n    // eslint-disable-next-line no-global-assign\n    RegExp = function RegExp(...args) {\n      return Reflect.construct(unsafeRegExp, args, new.target);\n    };\n    RegExp.prototype = unsafeRegExp.prototype;\n    unsafeRegExp.prototype.constructor = RegExp;\n\n    if ('$1' in RegExp) {\n      throw Error('hey we could not remove RegExp.$1');\n    }\n  }\n\n  /* global getAnonIntrinsics */\n\n  // Copyright (C) 2011 Google Inc.\n  // Copyright (C) 2018 Agoric\n  //\n  // Licensed under the Apache License, Version 2.0 (the \"License\");\n  // you may not use this file except in compliance with the License.\n  // You may obtain a copy of the License at\n  //\n  // http://www.apache.org/licenses/LICENSE-2.0\n  //\n  // Unless required by applicable law or agreed to in writing, software\n  // distributed under the License is distributed on an \"AS IS\" BASIS,\n  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  // See the License for the specific language governing permissions and\n  // limitations under the License.\n\n  /* This is evaluated in an environment in which getAnonIntrinsics() is\n     already defined (by prepending the definition of getAnonIntrinsics to the\n     stringified removeProperties()), hence we don't use the following\n     import */\n  // import { getAnonIntrinsics } from './anonIntrinsics.js';\n\n  function removeProperties(global, whitelist) {\n    // walk global object, test against whitelist, delete\n\n    const uncurryThis = fn => (thisArg, ...args) =>\n      Reflect.apply(fn, thisArg, args);\n    const {\n      getOwnPropertyDescriptor: gopd,\n      getOwnPropertyNames: gopn,\n      keys,\n    } = Object;\n    const cleaning = new WeakMap();\n    const getProto = Object.getPrototypeOf;\n    const hop = uncurryThis(Object.prototype.hasOwnProperty);\n\n    const whiteTable = new WeakMap();\n\n    function addToWhiteTable(rootValue, rootPermit) {\n      /**\n       * The whiteTable should map from each path-accessible primordial\n       * object to the permit object that describes how it should be\n       * cleaned.\n       *\n       * We initialize the whiteTable only so that {@code getPermit} can\n       * process \"*\" inheritance using the whitelist, by walking actual\n       * inheritance chains.\n       */\n      const whitelistSymbols = [true, false, '*', 'maybeAccessor'];\n      function register(value, permit) {\n        if (value !== Object(value)) {\n          return;\n        }\n        if (typeof permit !== 'object') {\n          if (whitelistSymbols.indexOf(permit) < 0) {\n            throw new Error(\n              `syntax error in whitelist; unexpected value: ${permit}`,\n            );\n          }\n          return;\n        }\n        if (whiteTable.has(value)) {\n          throw new Error('primordial reachable through multiple paths');\n        }\n        whiteTable.set(value, permit);\n        keys(permit).forEach(name => {\n          // Use gopd to avoid invoking an accessor property.\n          // Accessor properties for which permit !== 'maybeAccessor'\n          // are caught later by clean().\n          const desc = gopd(value, name);\n          if (desc) {\n            register(desc.value, permit[name]);\n          }\n        });\n      }\n      register(rootValue, rootPermit);\n    }\n\n    /**\n     * Should the property named {@code name} be whitelisted on the\n     * {@code base} object, and if so, with what Permit?\n     *\n     * <p>If it should be permitted, return the Permit (where Permit =\n     * true | \"maybeAccessor\" | \"*\" | Record(Permit)), all of which are\n     * truthy. If it should not be permitted, return false.\n     */\n    function getPermit(base, name) {\n      let permit = whiteTable.get(base);\n      if (permit) {\n        if (hop(permit, name)) {\n          return permit[name];\n        }\n        // Allow escaping of magical names like '__proto__'.\n        if (hop(permit, `ESCAPE${name}`)) {\n          return permit[`ESCAPE${name}`];\n        }\n      }\n      // eslint-disable-next-line no-constant-condition\n      while (true) {\n        base = getProto(base); // eslint-disable-line no-param-reassign\n        if (base === null) {\n          return false;\n        }\n        permit = whiteTable.get(base);\n        if (permit && hop(permit, name)) {\n          const result = permit[name];\n          if (result === '*') {\n            return result;\n          }\n          return false;\n        }\n      }\n    }\n\n    /**\n     * Removes all non-whitelisted properties found by recursively and\n     * reflectively walking own property chains.\n     *\n     * <p>Inherited properties are not checked, because we require that\n     * inherited-from objects are otherwise reachable by this traversal.\n     */\n    function clean(value, prefix, num) {\n      if (value !== Object(value)) {\n        return;\n      }\n      if (cleaning.get(value)) {\n        return;\n      }\n\n      const proto = getProto(value);\n      if (proto !== null && !whiteTable.has(proto)) {\n        // reportItemProblem(rootReports, ses.severities.NOT_ISOLATED,\n        //                  'unexpected intrinsic', prefix + '.__proto__');\n        throw new Error(`unexpected intrinsic ${prefix}.__proto__`);\n      }\n\n      cleaning.set(value, true);\n      gopn(value).forEach(name => {\n        const path = prefix + (prefix ? '.' : '') + name;\n        const p = getPermit(value, name);\n        if (p) {\n          const desc = gopd(value, name);\n          if (hop(desc, 'value')) {\n            // Is a data property\n            const subValue = desc.value;\n            clean(subValue, path);\n          } else if (p !== 'maybeAccessor') {\n            // We are not saying that it is safe for the prop to be\n            // unexpectedly an accessor; rather, it will be deleted\n            // and thus made safe.\n            // reportProperty(ses.severities.SAFE_SPEC_VIOLATION,\n            //               'Not a data property', path);\n            delete value[name]; // eslint-disable-line no-param-reassign\n          } else {\n            clean(desc.get, `${path}<getter>`);\n            clean(desc.set, `${path}<setter>`);\n          }\n        } else {\n          delete value[name]; // eslint-disable-line no-param-reassign\n        }\n      });\n    }\n\n    addToWhiteTable(global, whitelist.namedIntrinsics);\n    const intr = getAnonIntrinsics(global);\n    addToWhiteTable(intr, whitelist.anonIntrinsics);\n    clean(global, '');\n  }\n\n  // Copyright (C) 2011 Google Inc.\n  // Copyright (C) 2018 Agoric\n  //\n  // Licensed under the Apache License, Version 2.0 (the \"License\");\n  // you may not use this file except in compliance with the License.\n  // You may obtain a copy of the License at\n  //\n  // https://www.apache.org/licenses/LICENSE-2.0\n  //\n  // Unless required by applicable law or agreed to in writing, software\n  // distributed under the License is distributed on an \"AS IS\" BASIS,\n  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  // See the License for the specific language governing permissions and\n  // limitations under the License.\n\n  // TODO(erights): We should test for\n  // We now have a reason to omit Proxy from the whitelist.\n  // The makeBrandTester in repairES5 uses Allen's trick at\n  // https://esdiscuss.org/topic/tostringtag-spoofing-for-null-and-undefined#content-59\n  // , but testing reveals that, on FF 35.0.1, a proxy on an exotic\n  // object X will pass this brand test when X will. This is fixed as of\n  // FF Nightly 38.0a1.\n\n  /**\n   * <p>Qualifying platforms generally include all JavaScript platforms\n   * shown on <a href=\"http://kangax.github.com/es5-compat-table/\"\n   * >ECMAScript 5 compatibility table</a> that implement {@code\n   * Object.getOwnPropertyNames}. At the time of this writing,\n   * qualifying browsers already include the latest released versions of\n   * Internet Explorer (9), Firefox (4), Chrome (11), and Safari\n   * (5.0.5), their corresponding standalone (e.g., server-side) JavaScript\n   * engines, Rhino 1.73, and BESEN.\n   *\n   * <p>On such not-quite-ES5 platforms, some elements of these\n   * emulations may lose SES safety, as enumerated in the comment on\n   * each problem record in the {@code baseProblems} and {@code\n   * supportedProblems} array below. The platform must at least provide\n   * {@code Object.getOwnPropertyNames}, because it cannot reasonably be\n   * emulated.\n   *\n   * <p>This file is useful by itself, as it has no dependencies on the\n   * rest of SES. It creates no new global bindings, but merely repairs\n   * standard globals or standard elements reachable from standard\n   * globals. If the future-standard {@code WeakMap} global is present,\n   * as it is currently on FF7.0a1, then it will repair it in place. The\n   * one non-standard element that this file uses is {@code console} if\n   * present, in order to report the repairs it found necessary, in\n   * which case we use its {@code log, info, warn}, and {@code error}\n   * methods. If {@code console.log} is absent, then this file performs\n   * its repairs silently.\n   *\n   * <p>Generally, this file should be run as the first script in a\n   * JavaScript context (i.e. a browser frame), as it relies on other\n   * primordial objects and methods not yet being perturbed.\n   *\n   * <p>TODO(erights): This file tries to protect itself from some\n   * post-initialization perturbation by stashing some of the\n   * primordials it needs for later use, but this attempt is currently\n   * incomplete. We need to revisit this when we support Confined-ES5,\n   * as a variant of SES in which the primordials are not frozen. See\n   * previous failed attempt at <a\n   * href=\"https://codereview.appspot.com/5278046/\" >Speeds up\n   * WeakMap. Preparing to support unfrozen primordials.</a>. From\n   * analysis of this failed attempt, it seems that the only practical\n   * way to support CES is by use of two frames, where most of initSES\n   * runs in a SES frame, and so can avoid worrying about most of these\n   * perturbations.\n   */\n  function getAnonIntrinsics$1(global) {\n\n    const gopd = Object.getOwnPropertyDescriptor;\n    const getProto = Object.getPrototypeOf;\n\n    // ////////////// Undeniables and Intrinsics //////////////\n\n    /**\n     * The undeniables are the primordial objects which are ambiently\n     * reachable via compositions of strict syntax, primitive wrapping\n     * (new Object(x)), and prototype navigation (the equivalent of\n     * Object.getPrototypeOf(x) or x.__proto__). Although we could in\n     * theory monkey patch primitive wrapping or prototype navigation,\n     * we won't. Hence, without parsing, the following are undeniable no\n     * matter what <i>other</i> monkey patching we do to the primordial\n     * environment.\n     */\n\n    // The first element of each undeniableTuple is a string used to\n    // name the undeniable object for reporting purposes. It has no\n    // other programmatic use.\n    //\n    // The second element of each undeniableTuple should be the\n    // undeniable itself.\n    //\n    // The optional third element of the undeniableTuple, if present,\n    // should be an example of syntax, rather than use of a monkey\n    // patchable API, evaluating to a value from which the undeniable\n    // object in the second element can be reached by only the\n    // following steps:\n    // If the value is primitve, convert to an Object wrapper.\n    // Is the resulting object either the undeniable object, or does\n    // it inherit directly from the undeniable object?\n\n    function* aStrictGenerator() {} // eslint-disable-line no-empty-function\n    const Generator = getProto(aStrictGenerator);\n    async function* aStrictAsyncGenerator() {} // eslint-disable-line no-empty-function\n    const AsyncGenerator = getProto(aStrictAsyncGenerator);\n    async function aStrictAsyncFunction() {} // eslint-disable-line no-empty-function\n    const AsyncFunctionPrototype = getProto(aStrictAsyncFunction);\n\n    // TODO: this is dead code, but could be useful: make this the\n    // 'undeniables' object available via some API.\n\n    const undeniableTuples = [\n      ['Object.prototype', Object.prototype, {}],\n      ['Function.prototype', Function.prototype, function foo() {}],\n      ['Array.prototype', Array.prototype, []],\n      ['RegExp.prototype', RegExp.prototype, /x/],\n      ['Boolean.prototype', Boolean.prototype, true],\n      ['Number.prototype', Number.prototype, 1],\n      ['String.prototype', String.prototype, 'x'],\n      ['%Generator%', Generator, aStrictGenerator],\n      ['%AsyncGenerator%', AsyncGenerator, aStrictAsyncGenerator],\n      ['%AsyncFunction%', AsyncFunctionPrototype, aStrictAsyncFunction],\n    ];\n\n    undeniableTuples.forEach(tuple => {\n      const name = tuple[0];\n      const undeniable = tuple[1];\n      let start = tuple[2];\n      if (start === undefined) {\n        return;\n      }\n      start = Object(start);\n      if (undeniable === start) {\n        return;\n      }\n      if (undeniable === getProto(start)) {\n        return;\n      }\n      throw new Error(`Unexpected undeniable: ${undeniable}`);\n    });\n\n    function registerIteratorProtos(registery, base, name) {\n      const iteratorSym =\n        (global.Symbol && global.Symbol.iterator) || '@@iterator'; // used instead of a symbol on FF35\n\n      if (base[iteratorSym]) {\n        const anIter = base[iteratorSym]();\n        const anIteratorPrototype = getProto(anIter);\n        registery[name] = anIteratorPrototype; // eslint-disable-line no-param-reassign\n        const anIterProtoBase = getProto(anIteratorPrototype);\n        if (anIterProtoBase !== Object.prototype) {\n          if (!registery.IteratorPrototype) {\n            if (getProto(anIterProtoBase) !== Object.prototype) {\n              throw new Error(\n                '%IteratorPrototype%.__proto__ was not Object.prototype',\n              );\n            }\n            registery.IteratorPrototype = anIterProtoBase; // eslint-disable-line no-param-reassign\n          } else if (registery.IteratorPrototype !== anIterProtoBase) {\n            throw new Error(`unexpected %${name}%.__proto__`);\n          }\n        }\n      }\n    }\n\n    /**\n     * Get the intrinsics not otherwise reachable by named own property\n     * traversal. See\n     * https://people.mozilla.org/~jorendorff/es6-draft.html#sec-well-known-intrinsic-objects\n     * and the instrinsics section of whitelist.js\n     *\n     * <p>Unlike getUndeniables(), the result of sampleAnonIntrinsics()\n     * does depend on the current state of the primordials, so we must\n     * run this again after all other relevant monkey patching is done,\n     * in order to properly initialize cajaVM.intrinsics\n     */\n\n    // TODO: we can probably unwrap this into the outer function, and stop\n    // using a separately named 'sampleAnonIntrinsics'\n    function sampleAnonIntrinsics() {\n      const result = {};\n\n      // If there are still other ThrowTypeError objects left after\n      // noFuncPoison-ing, this should be caught by\n      // test_THROWTYPEERROR_NOT_UNIQUE below, so we assume here that\n      // this is the only surviving ThrowTypeError intrinsic.\n      // eslint-disable-next-line prefer-rest-params\n      result.ThrowTypeError = gopd(arguments, 'callee').get;\n\n      // Get the ES6 %ArrayIteratorPrototype%,\n      // %StringIteratorPrototype%, %MapIteratorPrototype%,\n      // %SetIteratorPrototype% and %IteratorPrototype% intrinsics, if\n      // present.\n      registerIteratorProtos(result, [], 'ArrayIteratorPrototype');\n      registerIteratorProtos(result, '', 'StringIteratorPrototype');\n      if (typeof Map === 'function') {\n        registerIteratorProtos(result, new Map(), 'MapIteratorPrototype');\n      }\n      if (typeof Set === 'function') {\n        registerIteratorProtos(result, new Set(), 'SetIteratorPrototype');\n      }\n\n      // Get the ES6 %GeneratorFunction% intrinsic, if present.\n      if (getProto(Generator) !== Function.prototype) {\n        throw new Error('Generator.__proto__ was not Function.prototype');\n      }\n      const GeneratorFunction = Generator.constructor;\n      if (getProto(GeneratorFunction) !== Function.prototype.constructor) {\n        throw new Error(\n          'GeneratorFunction.__proto__ was not Function.prototype.constructor',\n        );\n      }\n      result.GeneratorFunction = GeneratorFunction;\n      const genProtoBase = getProto(Generator.prototype);\n      if (genProtoBase !== result.IteratorPrototype) {\n        throw new Error('Unexpected Generator.prototype.__proto__');\n      }\n\n      // Get the ES6 %AsyncGeneratorFunction% intrinsic, if present.\n      if (getProto(AsyncGenerator) !== Function.prototype) {\n        throw new Error('AsyncGenerator.__proto__ was not Function.prototype');\n      }\n      const AsyncGeneratorFunction = AsyncGenerator.constructor;\n      if (getProto(AsyncGeneratorFunction) !== Function.prototype.constructor) {\n        throw new Error(\n          'AsyncGeneratorFunction.__proto__ was not Function.prototype.constructor',\n        );\n      }\n      result.AsyncGeneratorFunction = AsyncGeneratorFunction;\n      const AsyncGeneratorPrototype = AsyncGenerator.prototype;\n      result.AsyncIteratorPrototype = getProto(AsyncGeneratorPrototype);\n      // it appears that the only way to get an AsyncIteratorPrototype is\n      // through this getProto() process, so there's nothing to check it\n      // against\n      if (getProto(result.AsyncIteratorPrototype) !== Object.prototype) {\n        throw new Error(\n          'AsyncIteratorPrototype.__proto__ was not Object.prototype',\n        );\n      }\n\n      // Get the ES6 %AsyncFunction% intrinsic, if present.\n      if (getProto(AsyncFunctionPrototype) !== Function.prototype) {\n        throw new Error(\n          'AsyncFunctionPrototype.__proto__ was not Function.prototype',\n        );\n      }\n      const AsyncFunction = AsyncFunctionPrototype.constructor;\n      if (getProto(AsyncFunction) !== Function.prototype.constructor) {\n        throw new Error(\n          'AsyncFunction.__proto__ was not Function.prototype.constructor',\n        );\n      }\n      result.AsyncFunction = AsyncFunction;\n\n      // Get the ES6 %TypedArray% intrinsic, if present.\n      (function getTypedArray() {\n        if (!global.Float32Array) {\n          return;\n        }\n        const TypedArray = getProto(global.Float32Array);\n        if (TypedArray === Function.prototype) {\n          return;\n        }\n        if (getProto(TypedArray) !== Function.prototype) {\n          // http://bespin.cz/~ondras/html/classv8_1_1ArrayBufferView.html\n          // has me worried that someone might make such an intermediate\n          // object visible.\n          throw new Error('TypedArray.__proto__ was not Function.prototype');\n        }\n        result.TypedArray = TypedArray;\n      })();\n\n      Object.keys(result).forEach(name => {\n        if (result[name] === undefined) {\n          throw new Error(`Malformed intrinsic: ${name}`);\n        }\n      });\n\n      return result;\n    }\n\n    return sampleAnonIntrinsics();\n  }\n\n  function getNamedIntrinsics(unsafeGlobal, whitelist) {\n    const { defineProperty, getOwnPropertyDescriptor, ownKeys } = Reflect;\n\n    const namedIntrinsics = {};\n\n    const propertyNames = ownKeys(whitelist.namedIntrinsics);\n\n    for (const name of propertyNames) {\n      const desc = getOwnPropertyDescriptor(unsafeGlobal, name);\n      if (desc) {\n        // Abort if an accessor is found on the unsafe global object\n        // instead of a data property. We should never get into this\n        // non standard situation.\n        if ('get' in desc || 'set' in desc) {\n          throw new TypeError(`unexpected accessor on global property: ${name}`);\n        }\n\n        defineProperty(namedIntrinsics, name, desc);\n      }\n    }\n\n    return namedIntrinsics;\n  }\n\n  function getAllPrimordials(global, anonIntrinsics) {\n\n    const root = {\n      global, // global plus all the namedIntrinsics\n      anonIntrinsics,\n    };\n    // todo: re-examine exactly which \"global\" we're freezing\n\n    return root;\n  }\n\n  function getAllPrimordials$1(namedIntrinsics, anonIntrinsics) {\n\n    const root = {\n      namedIntrinsics,\n      anonIntrinsics,\n    };\n\n    return root;\n  }\n\n  // Copyright (C) 2011 Google Inc.\n  // Copyright (C) 2018 Agoric\n  //\n  // Licensed under the Apache License, Version 2.0 (the \"License\");\n  // you may not use this file except in compliance with the License.\n  // You may obtain a copy of the License at\n  //\n  // http://www.apache.org/licenses/LICENSE-2.0\n  //\n  // Unless required by applicable law or agreed to in writing, software\n  // distributed under the License is distributed on an \"AS IS\" BASIS,\n  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  // See the License for the specific language governing permissions and\n  // limitations under the License.\n\n  /**\n   * @fileoverview Exports {@code ses.whitelist}, a recursively defined\n   * JSON record enumerating all the naming paths in the ES5.1 spec,\n   * those de-facto extensions that we judge to be safe, and SES and\n   * Dr. SES extensions provided by the SES runtime.\n   *\n   * <p>Assumes only ES3. Compatible with ES5, ES5-strict, or\n   * anticipated ES6.\n   *\n   * //provides ses.whitelist\n   * @author Mark S. Miller,\n   * @overrides ses, whitelistModule\n   */\n\n  /**\n   * <p>Each JSON record enumerates the disposition of the properties on\n   * some corresponding primordial object, with the root record\n   * representing the global object. For each such record, the values\n   * associated with its property names can be\n   * <ul>\n   * <li>Another record, in which case this property is simply\n   *     whitelisted and that next record represents the disposition of\n   *     the object which is its value. For example, {@code \"Object\"}\n   *     leads to another record explaining what properties {@code\n   *     \"Object\"} may have and how each such property, if present,\n   *     and its value should be tamed.\n   * <li>true, in which case this property is simply whitelisted. The\n   *     value associated with that property is still traversed and\n   *     tamed, but only according to the taming of the objects that\n   *     object inherits from. For example, {@code \"Object.freeze\"} leads\n   *     to true, meaning that the {@code \"freeze\"} property of {@code\n   *     Object} should be whitelisted and the value of the property (a\n   *     function) should be further tamed only according to the\n   *     markings of the other objects it inherits from, like {@code\n   *     \"Function.prototype\"} and {@code \"Object.prototype\").\n   *     If the property is an accessor property, it is not\n   *     whitelisted (as invoking an accessor might not be meaningful,\n   *     yet the accessor might return a value needing taming).\n   * <li>\"maybeAccessor\", in which case this accessor property is simply\n   *     whitelisted and its getter and/or setter are tamed according to\n   *     inheritance. If the property is not an accessor property, its\n   *     value is tamed according to inheritance.\n   * <li>\"*\", in which case this property on this object is whitelisted,\n   *     as is this property as inherited by all objects that inherit\n   *     from this object. The values associated with all such properties\n   *     are still traversed and tamed, but only according to the taming\n   *     of the objects that object inherits from. For example, {@code\n   *     \"Object.prototype.constructor\"} leads to \"*\", meaning that we\n   *     whitelist the {@code \"constructor\"} property on {@code\n   *     Object.prototype} and on every object that inherits from {@code\n   *     Object.prototype} that does not have a conflicting mark. Each\n   *     of these is tamed as if with true, so that the value of the\n   *     property is further tamed according to what other objects it\n   *     inherits from.\n   * <li>false, which suppresses permission inherited via \"*\".\n   * </ul>\n   *\n   * <p>TODO: We want to do for constructor: something weaker than '*',\n   * but rather more like what we do for [[Prototype]] links, which is\n   * that it is whitelisted only if it points at an object which is\n   * otherwise reachable by a whitelisted path.\n   *\n   * <p>The members of the whitelist are either\n   * <ul>\n   * <li>(uncommented) defined by the ES5.1 normative standard text,\n   * <li>(questionable) provides a source of non-determinism, in\n   *     violation of pure object-capability rules, but allowed anyway\n   *     since we've given up on restricting JavaScript to a\n   *     deterministic subset.\n   * <li>(ES5 Appendix B) common elements of de facto JavaScript\n   *     described by the non-normative Appendix B.\n   * <li>(Harmless whatwg) extensions documented at\n   *     <a href=\"http://wiki.whatwg.org/wiki/Web_ECMAScript\"\n   *     >http://wiki.whatwg.org/wiki/Web_ECMAScript</a> that seem to be\n   *     harmless. Note that the RegExp constructor extensions on that\n   *     page are <b>not harmless</b> and so must not be whitelisted.\n   * <li>(ES-Harmony proposal) accepted as \"proposal\" status for\n   *     EcmaScript-Harmony.\n   * </ul>\n   *\n   * <p>With the above encoding, there are some sensible whitelists we\n   * cannot express, such as marking a property both with \"*\" and a JSON\n   * record. This is an expedient decision based only on not having\n   * encountered such a need. Should we need this extra expressiveness,\n   * we'll need to refactor to enable a different encoding.\n   *\n   * <p>We factor out {@code true} into the variable {@code t} just to\n   * get a bit better compression from simple minifiers.\n   */\n\n  const t = true;\n  const j = true; // included in the Jessie runtime\n\n  let TypedArrayWhitelist; // defined and used below\n\n  var whitelist = {\n    // The accessible intrinsics which are not reachable by own\n    // property name traversal are listed here so that they are\n    // processed by the whitelist, although this also makes them\n    // accessible by this path.  See\n    // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-well-known-intrinsic-objects\n    // Of these, ThrowTypeError is the only one from ES5. All the\n    // rest were introduced in ES6.\n    anonIntrinsics: {\n      ThrowTypeError: {},\n      IteratorPrototype: {\n        // 25.1\n        // Technically, for SES-on-ES5, we should not need to\n        // whitelist 'next'. However, browsers are accidentally\n        // relying on it\n        // https://bugs.chromium.org/p/v8/issues/detail?id=4769#\n        // https://bugs.webkit.org/show_bug.cgi?id=154475\n        // and we will be whitelisting it as we transition to ES6\n        // anyway, so we unconditionally whitelist it now.\n        next: '*',\n        constructor: false,\n      },\n      ArrayIteratorPrototype: {},\n      StringIteratorPrototype: {},\n      MapIteratorPrototype: {},\n      SetIteratorPrototype: {},\n      // AsyncIteratorPrototype does not inherit from IteratorPrototype\n      AsyncIteratorPrototype: {},\n\n      // The %GeneratorFunction% intrinsic is the constructor of\n      // generator functions, so %GeneratorFunction%.prototype is\n      // the %Generator% intrinsic, which all generator functions\n      // inherit from. A generator function is effectively the\n      // constructor of its generator instances, so, for each\n      // generator function (e.g., \"g1\" on the diagram at\n      // http://people.mozilla.org/~jorendorff/figure-2.png )\n      // its .prototype is a prototype that its instances inherit\n      // from. Paralleling this structure, %Generator%.prototype,\n      // i.e., %GeneratorFunction%.prototype.prototype, is the\n      // object that all these generator function prototypes inherit\n      // from. The .next, .return and .throw that generator\n      // instances respond to are actually the builtin methods they\n      // inherit from this object.\n      GeneratorFunction: {\n        // 25.2\n        length: '*', // Not sure why this is needed\n        prototype: {\n          // 25.4\n          prototype: {\n            next: '*',\n            return: '*',\n            throw: '*',\n            constructor: '*', // Not sure why this is needed\n          },\n        },\n      },\n      AsyncGeneratorFunction: {\n        // 25.3\n        length: '*',\n        prototype: {\n          // 25.5\n          prototype: {\n            next: '*',\n            return: '*',\n            throw: '*',\n            constructor: '*', // Not sure why this is needed\n          },\n        },\n      },\n      AsyncFunction: {\n        // 25.7\n        length: '*',\n        prototype: '*',\n      },\n\n      TypedArray: (TypedArrayWhitelist = {\n        // 22.2\n        length: '*', // does not inherit from Function.prototype on Chrome\n        name: '*', // ditto\n        from: t,\n        of: t,\n        BYTES_PER_ELEMENT: '*',\n        prototype: {\n          buffer: 'maybeAccessor',\n          byteLength: 'maybeAccessor',\n          byteOffset: 'maybeAccessor',\n          copyWithin: '*',\n          entries: '*',\n          every: '*',\n          fill: '*',\n          filter: '*',\n          find: '*',\n          findIndex: '*',\n          forEach: '*',\n          includes: '*',\n          indexOf: '*',\n          join: '*',\n          keys: '*',\n          lastIndexOf: '*',\n          length: 'maybeAccessor',\n          map: '*',\n          reduce: '*',\n          reduceRight: '*',\n          reverse: '*',\n          set: '*',\n          slice: '*',\n          some: '*',\n          sort: '*',\n          subarray: '*',\n          values: '*',\n          BYTES_PER_ELEMENT: '*',\n        },\n      }),\n    },\n\n    namedIntrinsics: {\n      // In order according to\n      // http://www.ecma-international.org/ecma-262/ with chapter\n      // numbers where applicable\n\n      // 18 The Global Object\n\n      // 18.1\n      Infinity: j,\n      NaN: j,\n      undefined: j,\n\n      // 18.2\n      eval: j, // realms-shim depends on having indirect eval in the globals\n      isFinite: t,\n      isNaN: t,\n      parseFloat: t,\n      parseInt: t,\n      decodeURI: t,\n      decodeURIComponent: t,\n      encodeURI: t,\n      encodeURIComponent: t,\n\n      // 19 Fundamental Objects\n\n      Object: {\n        // 19.1\n        assign: t, // ES-Harmony\n        create: t,\n        defineProperties: t, // ES-Harmony\n        defineProperty: t,\n        entries: t, // ES-Harmony\n        freeze: j,\n        getOwnPropertyDescriptor: t,\n        getOwnPropertyDescriptors: t, // proposed ES-Harmony\n        getOwnPropertyNames: t,\n        getOwnPropertySymbols: t, // ES-Harmony\n        getPrototypeOf: t,\n        is: j, // ES-Harmony\n        isExtensible: t,\n        isFrozen: t,\n        isSealed: t,\n        keys: t,\n        preventExtensions: j,\n        seal: j,\n        setPrototypeOf: t, // ES-Harmony\n        values: t, // ES-Harmony\n\n        prototype: {\n          // B.2.2\n          // We need to prefix __proto__ with ESCAPE so that it doesn't\n          // just change the prototype of this object.\n          ESCAPE__proto__: 'maybeAccessor',\n          __defineGetter__: t,\n          __defineSetter__: t,\n          __lookupGetter__: t,\n          __lookupSetter__: t,\n\n          constructor: '*',\n          hasOwnProperty: t,\n          isPrototypeOf: t,\n          propertyIsEnumerable: t,\n          toLocaleString: '*',\n          toString: '*',\n          valueOf: '*',\n\n          // Generally allowed\n          [Symbol.iterator]: '*',\n          [Symbol.toPrimitive]: '*',\n          [Symbol.toStringTag]: '*',\n          [Symbol.unscopables]: '*',\n        },\n      },\n\n      Function: {\n        // 19.2\n        length: t,\n        prototype: {\n          apply: t,\n          bind: t,\n          call: t,\n          [Symbol.hasInstance]: '*',\n\n          // 19.2.4 instances\n          length: '*',\n          name: '*', // ES-Harmony\n          prototype: '*',\n          arity: '*', // non-std, deprecated in favor of length\n\n          // Generally allowed\n          [Symbol.species]: 'maybeAccessor', // ES-Harmony?\n        },\n      },\n\n      Boolean: {\n        // 19.3\n        prototype: t,\n      },\n\n      Symbol: {\n        // 19.4               all ES-Harmony\n        asyncIterator: t, // proposed? ES-Harmony\n        for: t,\n        hasInstance: t,\n        isConcatSpreadable: t,\n        iterator: t,\n        keyFor: t,\n        match: t,\n        matchAll: t,\n        replace: t,\n        search: t,\n        species: t,\n        split: t,\n        toPrimitive: t,\n        toStringTag: t,\n        unscopables: t,\n        prototype: t,\n      },\n\n      Error: {\n        // 19.5\n        prototype: {\n          name: '*',\n          message: '*',\n        },\n      },\n      // In ES6 the *Error \"subclasses\" of Error inherit from Error,\n      // since constructor inheritance generally mirrors prototype\n      // inheritance. As explained at\n      // https://code.google.com/p/google-caja/issues/detail?id=1963 ,\n      // debug.js hides away the Error constructor itself, and so needs\n      // to rewire these \"subclass\" constructors. Until we have a more\n      // general mechanism, please maintain this list of whitelisted\n      // subclasses in sync with the list in debug.js of subclasses to\n      // be rewired.\n      EvalError: {\n        prototype: t,\n      },\n      RangeError: {\n        prototype: t,\n      },\n      ReferenceError: {\n        prototype: t,\n      },\n      SyntaxError: {\n        prototype: t,\n      },\n      TypeError: {\n        prototype: t,\n      },\n      URIError: {\n        prototype: t,\n      },\n\n      // 20 Numbers and Dates\n\n      Number: {\n        // 20.1\n        EPSILON: t, // ES-Harmony\n        isFinite: j, // ES-Harmony\n        isInteger: t, // ES-Harmony\n        isNaN: j, // ES-Harmony\n        isSafeInteger: j, // ES-Harmony\n        MAX_SAFE_INTEGER: j, // ES-Harmony\n        MAX_VALUE: t,\n        MIN_SAFE_INTEGER: j, // ES-Harmony\n        MIN_VALUE: t,\n        NaN: t,\n        NEGATIVE_INFINITY: t,\n        parseFloat: t, // ES-Harmony\n        parseInt: t, // ES-Harmony\n        POSITIVE_INFINITY: t,\n        prototype: {\n          toExponential: t,\n          toFixed: t,\n          toPrecision: t,\n        },\n      },\n\n      Math: {\n        // 20.2\n        E: j,\n        LN10: j,\n        LN2: j,\n        LOG10E: t,\n        LOG2E: t,\n        PI: j,\n        SQRT1_2: t,\n        SQRT2: t,\n\n        abs: j,\n        acos: t,\n        acosh: t, // ES-Harmony\n        asin: t,\n        asinh: t, // ES-Harmony\n        atan: t,\n        atanh: t, // ES-Harmony\n        atan2: t,\n        cbrt: t, // ES-Harmony\n        ceil: j,\n        clz32: t, // ES-Harmony\n        cos: t,\n        cosh: t, // ES-Harmony\n        exp: t,\n        expm1: t, // ES-Harmony\n        floor: j,\n        fround: t, // ES-Harmony\n        hypot: t, // ES-Harmony\n        imul: t, // ES-Harmony\n        log: j,\n        log1p: t, // ES-Harmony\n        log10: j, // ES-Harmony\n        log2: j, // ES-Harmony\n        max: j,\n        min: j,\n        pow: j,\n        random: t, // questionable\n        round: j,\n        sign: t, // ES-Harmony\n        sin: t,\n        sinh: t, // ES-Harmony\n        sqrt: j,\n        tan: t,\n        tanh: t, // ES-Harmony\n        trunc: j, // ES-Harmony\n      },\n\n      // no-arg Date constructor is questionable\n      Date: {\n        // 20.3\n        now: t, // questionable\n        parse: t,\n        UTC: t,\n        prototype: {\n          // Note: coordinate this list with maintanence of repairES5.js\n          getDate: t,\n          getDay: t,\n          getFullYear: t,\n          getHours: t,\n          getMilliseconds: t,\n          getMinutes: t,\n          getMonth: t,\n          getSeconds: t,\n          getTime: t,\n          getTimezoneOffset: t,\n          getUTCDate: t,\n          getUTCDay: t,\n          getUTCFullYear: t,\n          getUTCHours: t,\n          getUTCMilliseconds: t,\n          getUTCMinutes: t,\n          getUTCMonth: t,\n          getUTCSeconds: t,\n          setDate: t,\n          setFullYear: t,\n          setHours: t,\n          setMilliseconds: t,\n          setMinutes: t,\n          setMonth: t,\n          setSeconds: t,\n          setTime: t,\n          setUTCDate: t,\n          setUTCFullYear: t,\n          setUTCHours: t,\n          setUTCMilliseconds: t,\n          setUTCMinutes: t,\n          setUTCMonth: t,\n          setUTCSeconds: t,\n          toDateString: t,\n          toISOString: t,\n          toJSON: t,\n          toLocaleDateString: t,\n          toLocaleString: t,\n          toLocaleTimeString: t,\n          toTimeString: t,\n          toUTCString: t,\n\n          // B.2.4\n          getYear: t,\n          setYear: t,\n          toGMTString: t,\n        },\n      },\n\n      // 21 Text Processing\n\n      String: {\n        // 21.2\n        fromCharCode: j,\n        fromCodePoint: t, // ES-Harmony\n        raw: j, // ES-Harmony\n        prototype: {\n          charAt: t,\n          charCodeAt: t,\n          codePointAt: t, // ES-Harmony\n          concat: t,\n          endsWith: j, // ES-Harmony\n          includes: t, // ES-Harmony\n          indexOf: j,\n          lastIndexOf: j,\n          localeCompare: t,\n          match: t,\n          normalize: t, // ES-Harmony\n          padEnd: t, // ES-Harmony\n          padStart: t, // ES-Harmony\n          repeat: t, // ES-Harmony\n          replace: t,\n          search: t,\n          slice: j,\n          split: t,\n          startsWith: j, // ES-Harmony\n          substring: t,\n          toLocaleLowerCase: t,\n          toLocaleUpperCase: t,\n          toLowerCase: t,\n          toUpperCase: t,\n          trim: t,\n\n          // B.2.3\n          substr: t,\n          anchor: t,\n          big: t,\n          blink: t,\n          bold: t,\n          fixed: t,\n          fontcolor: t,\n          fontsize: t,\n          italics: t,\n          link: t,\n          small: t,\n          strike: t,\n          sub: t,\n          sup: t,\n\n          trimLeft: t, // non-standard\n          trimRight: t, // non-standard\n\n          // 21.1.4 instances\n          length: '*',\n        },\n      },\n\n      RegExp: {\n        // 21.2\n        prototype: {\n          exec: t,\n          flags: 'maybeAccessor',\n          global: 'maybeAccessor',\n          ignoreCase: 'maybeAccessor',\n          [Symbol.match]: '*', // ES-Harmony\n          multiline: 'maybeAccessor',\n          [Symbol.replace]: '*', // ES-Harmony\n          [Symbol.search]: '*', // ES-Harmony\n          source: 'maybeAccessor',\n          [Symbol.split]: '*', // ES-Harmony\n          sticky: 'maybeAccessor',\n          test: t,\n          unicode: 'maybeAccessor', // ES-Harmony\n          dotAll: 'maybeAccessor', // proposed ES-Harmony\n\n          // B.2.5\n          compile: false, // UNSAFE. Purposely suppressed\n\n          // 21.2.6 instances\n          lastIndex: '*',\n          options: '*', // non-std\n        },\n      },\n\n      // 22 Indexed Collections\n\n      Array: {\n        // 22.1\n        from: j,\n        isArray: t,\n        of: j, // ES-Harmony?\n        prototype: {\n          concat: t,\n          copyWithin: t, // ES-Harmony\n          entries: t, // ES-Harmony\n          every: t,\n          fill: t, // ES-Harmony\n          filter: j,\n          find: t, // ES-Harmony\n          findIndex: t, // ES-Harmony\n          forEach: j,\n          includes: t, // ES-Harmony\n          indexOf: j,\n          join: t,\n          keys: t, // ES-Harmony\n          lastIndexOf: j,\n          map: j,\n          pop: j,\n          push: j,\n          reduce: j,\n          reduceRight: j,\n          reverse: t,\n          shift: j,\n          slice: j,\n          some: t,\n          sort: t,\n          splice: t,\n          unshift: j,\n          values: t, // ES-Harmony\n\n          // 22.1.4 instances\n          length: '*',\n        },\n      },\n\n      // 22.2 Typed Array stuff\n      // TODO: Not yet organized according to spec order\n\n      Int8Array: TypedArrayWhitelist,\n      Uint8Array: TypedArrayWhitelist,\n      Uint8ClampedArray: TypedArrayWhitelist,\n      Int16Array: TypedArrayWhitelist,\n      Uint16Array: TypedArrayWhitelist,\n      Int32Array: TypedArrayWhitelist,\n      Uint32Array: TypedArrayWhitelist,\n      Float32Array: TypedArrayWhitelist,\n      Float64Array: TypedArrayWhitelist,\n\n      // 23 Keyed Collections          all ES-Harmony\n\n      Map: {\n        // 23.1\n        prototype: {\n          clear: j,\n          delete: j,\n          entries: j,\n          forEach: j,\n          get: j,\n          has: j,\n          keys: j,\n          set: j,\n          size: 'maybeAccessor',\n          values: j,\n        },\n      },\n\n      Set: {\n        // 23.2\n        prototype: {\n          add: j,\n          clear: j,\n          delete: j,\n          entries: j,\n          forEach: j,\n          has: j,\n          keys: j,\n          size: 'maybeAccessor',\n          values: j,\n        },\n      },\n\n      WeakMap: {\n        // 23.3\n        prototype: {\n          // Note: coordinate this list with maintenance of repairES5.js\n          delete: j,\n          get: j,\n          has: j,\n          set: j,\n        },\n      },\n\n      WeakSet: {\n        // 23.4\n        prototype: {\n          add: j,\n          delete: j,\n          has: j,\n        },\n      },\n\n      // 24 Structured Data\n\n      ArrayBuffer: {\n        // 24.1            all ES-Harmony\n        isView: t,\n        length: t, // does not inherit from Function.prototype on Chrome\n        name: t, // ditto\n        prototype: {\n          byteLength: 'maybeAccessor',\n          slice: t,\n        },\n      },\n\n      // 24.2 TODO: Omitting SharedArrayBuffer for now\n\n      DataView: {\n        // 24.3               all ES-Harmony\n        length: t, // does not inherit from Function.prototype on Chrome\n        name: t, // ditto\n        BYTES_PER_ELEMENT: '*', // non-standard. really?\n        prototype: {\n          buffer: 'maybeAccessor',\n          byteOffset: 'maybeAccessor',\n          byteLength: 'maybeAccessor',\n          getFloat32: t,\n          getFloat64: t,\n          getInt8: t,\n          getInt16: t,\n          getInt32: t,\n          getUint8: t,\n          getUint16: t,\n          getUint32: t,\n          setFloat32: t,\n          setFloat64: t,\n          setInt8: t,\n          setInt16: t,\n          setInt32: t,\n          setUint8: t,\n          setUint16: t,\n          setUint32: t,\n        },\n      },\n\n      // 24.4 TODO: Omitting Atomics for now\n\n      JSON: {\n        // 24.5\n        parse: j,\n        stringify: j,\n      },\n\n      // 25 Control Abstraction Objects\n\n      Promise: {\n        // 25.4\n        all: j,\n        race: j,\n        reject: j,\n        resolve: j,\n        makeHandled: t, // eventual-send\n        prototype: {\n          catch: t,\n          then: j,\n          finally: t, // proposed ES-Harmony\n\n          // eventual-send\n          delete: t,\n          get: t,\n          put: t,\n          post: t,\n          invoke: t,\n          fapply: t,\n          fcall: t,\n\n          // nanoq.js\n          del: t,\n\n          // Temporary compat with the old makeQ.js\n          send: t,\n          end: t,\n        },\n      },\n\n      // nanoq.js\n      Q: {\n        all: t,\n        race: t,\n        reject: t,\n        resolve: t,\n\n        join: t,\n        isPassByCopy: t,\n        passByCopy: t,\n        makeRemote: t,\n        makeFar: t,\n\n        // Temporary compat with the old makeQ.js\n        shorten: t,\n        isPromise: t,\n        async: t,\n        rejected: t,\n        promise: t,\n        delay: t,\n        memoize: t,\n        defer: t,\n      },\n\n      // 26 Reflection\n\n      Reflect: {\n        // 26.1\n        apply: t,\n        construct: t,\n        defineProperty: t,\n        deleteProperty: t,\n        get: t,\n        getOwnPropertyDescriptor: t,\n        getPrototypeOf: t,\n        has: t,\n        isExtensible: t,\n        ownKeys: t,\n        preventExtensions: t,\n        set: t,\n        setPrototypeOf: t,\n      },\n\n      Proxy: {\n        // 26.2\n        revocable: t,\n      },\n\n      // Appendix B\n\n      // B.2.1\n      escape: t,\n      unescape: t,\n\n      // B.2.5 (RegExp.prototype.compile) is marked 'false' up in 21.2\n\n      // Other\n\n      StringMap: {\n        // A specialized approximation of ES-Harmony's Map.\n        prototype: {}, // Technically, the methods should be on the prototype,\n        // but doing so while preserving encapsulation will be\n        // needlessly expensive for current usage.\n      },\n\n      Realm: {\n        makeRootRealm: t,\n        makeCompartment: t,\n        prototype: {\n          global: 'maybeAccessor',\n          evaluate: t,\n        },\n      },\n\n      SES: {\n        confine: t,\n        confineExpr: t,\n      },\n\n      Nat: j,\n      def: j,\n    },\n  };\n\n  function makeConsole(parentConsole) {\n    /* 'parentConsole' is the parent Realm's original 'console' object. We must\n       wrap it, exposing a 'console' with a 'console.log' (and perhaps others)\n       to the local realm, without allowing access to the original 'console',\n       its return values, or its exception objects, any of which could be used\n       to break confinement via the unsafe Function constructor. */\n\n    // callAndWrapError is copied from proposal-realms/shim/src/realmFacade.js\n    // Like Realm.apply except that it catches anything thrown and rethrows it\n    // as an Error from this realm\n\n    const errorConstructors = new Map([\n      ['EvalError', EvalError],\n      ['RangeError', RangeError],\n      ['ReferenceError', ReferenceError],\n      ['SyntaxError', SyntaxError],\n      ['TypeError', TypeError],\n      ['URIError', URIError],\n    ]);\n\n    function callAndWrapError(target, ...args) {\n      try {\n        return target(...args);\n      } catch (err) {\n        if (Object(err) !== err) {\n          // err is a primitive value, which is safe to rethrow\n          throw err;\n        }\n        let eName;\n        let eMessage;\n        let eStack;\n        try {\n          // The child environment might seek to use 'err' to reach the\n          // parent's intrinsics and corrupt them. `${err.name}` will cause\n          // string coercion of 'err.name'. If err.name is an object (probably\n          // a String of the parent Realm), the coercion uses\n          // err.name.toString(), which is under the control of the parent. If\n          // err.name were a primitive (e.g. a number), it would use\n          // Number.toString(err.name), using the child's version of Number\n          // (which the child could modify to capture its argument for later\n          // use), however primitives don't have properties like .prototype so\n          // they aren't useful for an attack.\n          eName = `${err.name}`;\n          eMessage = `${err.message}`;\n          eStack = `${err.stack || eMessage}`;\n          // eName/eMessage/eStack are now child-realm primitive strings, and\n          // safe to expose\n        } catch (ignored) {\n          // if err.name.toString() throws, keep the (parent realm) Error away\n          // from the child\n          throw new Error('unknown error');\n        }\n        const ErrorConstructor = errorConstructors.get(eName) || Error;\n        try {\n          throw new ErrorConstructor(eMessage);\n        } catch (err2) {\n          err2.stack = eStack; // replace with the captured inner stack\n          throw err2;\n        }\n      }\n    }\n\n    const newConsole = {};\n    const passThrough = [\n      'log',\n      'info',\n      'warn',\n      'error',\n      'group',\n      'groupEnd',\n      'trace',\n      'time',\n      'timeLog',\n      'timeEnd',\n    ];\n    // TODO: those are the properties that MDN documents. Node.js has a bunch\n    // of additional ones that I didn't include, which might be appropriate.\n\n    passThrough.forEach(name => {\n      // TODO: do we reveal the presence/absence of these properties to the\n      // child realm, thus exposing nondeterminism (and a hint of what platform\n      // you might be on) when it is constructed with {consoleMode: allow} ? Or\n      // should we expose the same set all the time, but silently ignore calls\n      // to the missing ones, to hide that variation? We might even consider\n      // adding console.* to the child realm all the time, even without\n      // consoleMode:allow, but ignore the calls unless the mode is enabled.\n      if (name in parentConsole) {\n        const orig = parentConsole[name];\n        // TODO: in a stack trace, this appears as\n        // \"Object.newConsole.(anonymous function) [as trace]\"\n        // can we make that \"newConsole.trace\" ?\n        newConsole[name] = function newerConsole(...args) {\n          callAndWrapError(orig, ...args);\n        };\n      }\n    });\n\n    return newConsole;\n  }\n\n  function makeMakeRequire(r, harden) {\n    function makeRequire(config) {\n      const cache = new Map();\n\n      function build(what) {\n        // This approach denies callers the ability to use inheritance to\n        // manage their config objects, but a simple \"if (what in config)\"\n        // predicate would also be truthy for e.g. \"toString\" and other\n        // properties of Object.prototype, and require('toString') should be\n        // legal if and only if the config object included an own-property\n        // named 'toString'. Incidentally, this could have been\n        // \"config.hasOwnProperty(what)\" but eslint complained.\n        if (!Object.prototype.hasOwnProperty.call(config, what)) {\n          throw new Error(`Cannot find module '${what}'`);\n        }\n        const c = config[what];\n\n        // some modules are hard-coded ways to access functionality that SES\n        // provides directly\n        if (what === '@agoric/harden') {\n          return harden;\n        }\n\n        // If the config points at a simple function, it must be a pure\n        // function with no dependencies (i.e. no 'require' or 'import', no\n        // calls to other functions defined in the same file but outside the\n        // function body). We stringify it and evaluate it inside this realm.\n        if (typeof c === 'function') {\n          return r.evaluate(`(${c})`);\n        }\n\n        // else we treat it as an object with an 'attenuatorSource' property\n        // that defines an attenuator function, which we evaluate. We then\n        // invoke it with the config object, which can contain authorities that\n        // it can wrap. The return value from this invocation is the module\n        // object that gets returned from require(). The attenuator function\n        // and the module it returns are in-realm, the authorities it wraps\n        // will be out-of-realm.\n        const src = `(${c.attenuatorSource})`;\n        const attenuator = r.evaluate(src);\n        return attenuator(c);\n      }\n\n      function newRequire(whatArg) {\n        const what = `${whatArg}`;\n        if (!cache.has(what)) {\n          cache.set(what, harden(build(what)));\n        }\n        return cache.get(what);\n      }\n\n      return newRequire;\n    }\n\n    return makeRequire;\n  }\n\n  /**\n   * @fileoverview Exports {@code ses.dataPropertiesToRepair}, a recursively\n   * defined JSON record enumerating the optimal set of prototype properties\n   * on primordials that need to be repaired before hardening.\n   *\n   * //provides ses.dataPropertiesToRepair\n   * @author JF Paradis\n   */\n\n  /**\n   * <p>The optimal set of prototype properties that need to be repaired\n   * before hardening is applied on enviromments subject to the override\n   * mistake.\n   *\n   * <p>Because \"repairing\" replaces data properties with accessors, every\n   * time a repaired property is accessed, the associated getter is invoked,\n   * which degrades the runtime performance of all code executing in the\n   * repaired enviromment, compared to the non-repaired case. In order\n   * to maintain performance, we only repair the properties of objects\n   * for which hardening causes a breakage of their intended usage. There\n   * are three cases:\n   * <ul>Overriding properties on objects typically used as maps,\n   *     namely {@code \"Object\"} and {@code \"Array\"}. In the case of arrays,\n   *     a given program might not be aware that non-numerical properties are\n   *     stored on the undelying object instance, not on the array. When an\n   *     object is typically used as a map, we repair all of its prototype\n   *     properties.\n   * <ul>Overriding properties on objects that provide defaults on their\n   *     prototype that programs typically override by assignment, such as\n   *     {@code \"Error.prototype.message\"} and {@code \"Function.prototype.name\"}\n   *     (both default to \"\").\n   * <ul>Setting a prototype chain. The constructor is typically set by\n   *     assignment, for example {@code \"Child.prototype.constructor = Child\"}.\n   *\n   * <p>Each JSON record enumerates the disposition of the properties on\n   * some corresponding primordial object, with the root record containing:\n   * <ul>\n   * <li>The record for the global object.\n   * <li>The record for the anonymous intrinsics.\n   * </ul>\n   *\n   * <p>For each such record, the values associated with its property\n   * names can be:\n   * <ul>\n   * <li>Another record, in which case this property is simply left\n   *     unrepaired and that next record represents the disposition of\n   *     the object which is its value. For example, {@code \"Object\"}\n   *     leads to another record explaining what properties {@code\n   *     \"Object\"} may have and how each such property, if present,\n   *     and its value should be repaired.\n   * <li>true, in which case this property is simply repaired. The\n   *     value associated with that property is not traversed. For\n   * \t   example, {@code \"Function.prototype.name\"} leads to true,\n   *     meaning that the {@code \"name\"} property of {@code\n   *     \"Function.prototype\"} should be repaired (which is needed\n   *     when inheriting from @code{Function} and setting the subclass's\n   *     {@code \"prototype.name\"} property). If the property is\n   *     already an accessor property, it is not repaired (because\n   *     accessors are not subject to the override mistake).\n   * <li>\"*\", all properties on this object are repaired.\n   * <li>falsey, in which case this property is skipped.\n   * </ul>\n   *\n   * <p>We factor out {@code true} into the variable {@code t} just to\n   * get a bit better compression from simple minifiers.\n   */\n\n  const t$1 = true;\n\n  var dataPropertiesToRepair = {\n    namedIntrinsics: {\n      Object: {\n        prototype: '*',\n      },\n\n      Array: {\n        prototype: '*',\n      },\n\n      Function: {\n        prototype: {\n          constructor: t$1, // set by \"regenerator-runtime\"\n          bind: t$1, // set by \"underscore\"\n          name: t$1,\n          toString: t$1,\n          call: t$1, // set by \"web3.js\"\n        },\n      },\n\n      Error: {\n        prototype: {\n          constructor: t$1, // set by \"fast-json-patch\"\n          message: t$1,\n          name: t$1, // set by \"precond\"\n        },\n      },\n\n      Promise: {\n        prototype: {\n          constructor: t$1, // set by \"core-js\"\n        },\n      },\n    },\n\n    anonIntrinsics: {\n      TypedArray: {\n        prototype: '*',\n      },\n\n      GeneratorFunction: {\n        prototype: {\n          constructor: t$1,\n          name: t$1,\n          toString: t$1,\n        },\n      },\n\n      AsyncFunction: {\n        prototype: {\n          constructor: t$1,\n          name: t$1,\n          toString: t$1,\n        },\n      },\n\n      AsyncGeneratorFunction: {\n        prototype: {\n          constructor: t$1,\n          name: t$1,\n          toString: t$1,\n        },\n      },\n\n      IteratorPrototype: '*',\n      ArrayIteratorPrototype: '*',\n    },\n  };\n\n  // Adapted from SES/Caja\n  // Copyright (C) 2011 Google Inc.\n  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/startSES.js\n  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/repairES5.js\n\n  function repairDataProperties(intrinsics, repairPlan) {\n    // Object.defineProperty is allowed to fail silently,\n    // use Object.defineProperties instead.\n\n    const {\n      defineProperties,\n      getOwnPropertyDescriptor,\n      getOwnPropertyDescriptors,\n      prototype: { hasOwnProperty },\n    } = Object;\n\n    const { ownKeys } = Reflect;\n\n    /**\n     * For a special set of properties (defined in the repairPlan), it ensures\n     * that the effect of freezing does not suppress the ability to override\n     * these properties on derived objects by simple assignment.\n     *\n     * Because of lack of sufficient foresight at the time, ES5 unfortunately\n     * specified that a simple assignment to a non-existent property must fail if\n     * it would override a non-writable data property of the same name. (In\n     * retrospect, this was a mistake, but it is now too late and we must live\n     * with the consequences.) As a result, simply freezing an object to make it\n     * tamper proof has the unfortunate side effect of breaking previously correct\n     * code that is considered to have followed JS best practices, if this\n     * previous code used assignment to override.\n     */\n    function enableDerivedOverride(obj, prop, desc) {\n      if ('value' in desc && desc.configurable) {\n        const { value } = desc;\n\n        // eslint-disable-next-line no-inner-declarations\n        function getter() {\n          return value;\n        }\n\n        // Re-attach the data property on the object so\n        // it can be found by the deep-freeze traversal process.\n        getter.value = value;\n\n        // eslint-disable-next-line no-inner-declarations\n        function setter(newValue) {\n          if (obj === this) {\n            throw new TypeError(\n              `Cannot assign to read only property '${prop}' of object '${obj}'`,\n            );\n          }\n          if (hasOwnProperty.call(this, prop)) {\n            this[prop] = newValue;\n          } else {\n            defineProperties(this, {\n              [prop]: {\n                value: newValue,\n                writable: true,\n                enumerable: desc.enumerable,\n                configurable: desc.configurable,\n              },\n            });\n          }\n        }\n\n        defineProperties(obj, {\n          [prop]: {\n            get: getter,\n            set: setter,\n            enumerable: desc.enumerable,\n            configurable: desc.configurable,\n          },\n        });\n      }\n    }\n\n    function repairOneProperty(obj, prop) {\n      if (!obj) {\n        return;\n      }\n      const desc = getOwnPropertyDescriptor(obj, prop);\n      if (!desc) {\n        return;\n      }\n      enableDerivedOverride(obj, prop, desc);\n    }\n\n    function repairAllProperties(obj) {\n      if (!obj) {\n        return;\n      }\n      const descs = getOwnPropertyDescriptors(obj);\n      if (!descs) {\n        return;\n      }\n      ownKeys(descs).forEach(prop =>\n        enableDerivedOverride(obj, prop, descs[prop]),\n      );\n    }\n\n    function walkRepairPlan(obj, plan) {\n      if (!obj) {\n        return;\n      }\n      if (!plan) {\n        return;\n      }\n      ownKeys(plan).forEach(prop => {\n        const subPlan = plan[prop];\n        const subObj = obj[prop];\n        switch (subPlan) {\n          case true:\n            repairOneProperty(obj, prop);\n            break;\n\n          case '*':\n            repairAllProperties(subObj);\n            break;\n\n          default:\n            if (Object(subPlan) !== subPlan) {\n              throw TypeError(`Repair plan subPlan ${subPlan} is invalid`);\n            }\n            walkRepairPlan(subObj, subPlan);\n        }\n      });\n    }\n\n    // Do the repair.\n    walkRepairPlan(intrinsics, repairPlan);\n  }\n\n  // Copyright (C) 2018 Agoric\n\n  const FORWARDED_REALMS_OPTIONS = ['transforms'];\n\n  function createSESWithRealmConstructor(creatorStrings, Realm) {\n    function makeSESRootRealm(options) {\n      // eslint-disable-next-line no-param-reassign\n      options = Object(options); // Todo: sanitize\n      const shims = [];\n\n      const {\n        dataPropertiesToRepair: optDataPropertiesToRepair,\n        shims: optionalShims,\n        sloppyGlobals,\n        whitelist: optWhitelist,\n        ...optionsRest\n      } = options;\n\n      const wl = JSON.parse(JSON.stringify(optWhitelist || whitelist));\n      const repairPlan =\n        optDataPropertiesToRepair !== undefined\n          ? JSON.parse(JSON.stringify(optDataPropertiesToRepair))\n          : dataPropertiesToRepair;\n\n      // Forward the designated Realms options.\n      const realmsOptions = {};\n      FORWARDED_REALMS_OPTIONS.forEach(key => {\n        if (key in optionsRest) {\n          realmsOptions[key] = optionsRest[key];\n        }\n      });\n\n      if (sloppyGlobals) {\n        throw TypeError(`\\\nsloppyGlobals cannot be specified for makeSESRootRealm!\nYou probably want a Compartment instead, like:\n  const c = s.global.Realm.makeCompartment({ sloppyGlobals: true })`);\n      }\n\n      // \"allow\" enables real Date.now(), anything else gets NaN\n      // (it'd be nice to allow a fixed numeric value, but too hard to\n      // implement right now)\n      if (options.dateNowMode !== 'allow') {\n        shims.push(`(${tameDate})();`);\n      }\n\n      if (options.mathRandomMode !== 'allow') {\n        shims.push(`(${tameMath})();`);\n      }\n\n      // Intl is disabled entirely for now, deleted by removeProperties. If we\n      // want to bring it back (under the control of this option), we'll need\n      // to add it to the whitelist too, as well as taming it properly.\n      if (options.intlMode !== 'allow') {\n        // this shim also disables Object.prototype.toLocaleString\n        shims.push(`(${tameIntl})();`);\n      }\n\n      if (options.errorStackMode !== 'allow') {\n        shims.push(`(${tameError})();`);\n      } else {\n        // if removeProperties cleans these things from Error, v8 won't provide\n        // stack traces or even toString on exceptions, and then Node.js prints\n        // uncaught exceptions as \"undefined\" instead of a type/message/stack.\n        // So if we're allowing stack traces, make sure the whitelist is\n        // augmented to include them.\n        wl.namedIntrinsics.Error.captureStackTrace = true;\n        wl.namedIntrinsics.Error.stackTraceLimit = true;\n        wl.namedIntrinsics.Error.prepareStackTrace = true;\n      }\n\n      if (options.regexpMode !== 'allow') {\n        shims.push(`(${tameRegExp})();`);\n      }\n\n      // The getAnonIntrinsics function might be renamed by e.g. rollup. The\n      // removeProperties() function references it by name, so we need to force\n      // it to have a specific name.\n      const removeProp = `const getAnonIntrinsics = (${getAnonIntrinsics$1});\n               (${removeProperties})(this, ${JSON.stringify(wl)})`;\n      shims.push(removeProp);\n\n      // Add options.shims.\n      if (optionalShims) {\n        shims.push(...optionalShims);\n      }\n\n      const r = Realm.makeRootRealm({ ...realmsOptions, shims });\n\n      // Build a harden() with an empty fringe. It will be populated later when\n      // we call harden(allIntrinsics).\n      const makeHardenerSrc = `(${makeHardener})`;\n      const harden = r.evaluate(makeHardenerSrc)();\n\n      const b = r.evaluate(creatorStrings);\n      b.createSESInThisRealm(r.global, creatorStrings, r);\n      // b.removeProperties(r.global);\n\n      if (options.consoleMode === 'allow') {\n        const s = `(${makeConsole})`;\n        r.global.console = r.evaluate(s)(console);\n      }\n\n      // Extract the intrinsics from the global.\n      const anonIntrinsics = r.evaluate(`(${getAnonIntrinsics$1})`)(r.global);\n      const namedIntrinsics = r.evaluate(`(${getNamedIntrinsics})`)(\n        r.global,\n        whitelist,\n      );\n\n      // Gather the intrinsics only.\n      const allIntrinsics = r.evaluate(`(${getAllPrimordials$1})`)(\n        namedIntrinsics,\n        anonIntrinsics,\n      );\n\n      // Gather the primordials and the globals.\n      const allPrimordials = r.evaluate(`(${getAllPrimordials})`)(\n        r.global,\n        anonIntrinsics,\n      );\n\n      // Repair the override mistake on the intrinsics only.\n      r.evaluate(`(${repairDataProperties})`)(allIntrinsics, repairPlan);\n\n      // Finally freeze all the primordials, and the global object. This must\n      // be the last thing we do that modifies the Realm's globals.\n      harden(allPrimordials);\n\n      // build the makeRequire helper, glue it to the new Realm\n      r.makeRequire = harden(r.evaluate(`(${makeMakeRequire})`)(r, harden));\n      return r;\n    }\n    const SES = {\n      makeSESRootRealm,\n    };\n\n    return SES;\n  }\n\n  function createSESInThisRealm(global, creatorStrings, parentRealm) {\n    // eslint-disable-next-line no-param-reassign,no-undef\n    global.SES = createSESWithRealmConstructor(creatorStrings, Realm);\n    // todo: wrap exceptions, effectively undoing the wrapping that\n    // Realm.evaluate does\n\n    const errorConstructors = new Map([\n      ['EvalError', EvalError],\n      ['RangeError', RangeError],\n      ['ReferenceError', ReferenceError],\n      ['SyntaxError', SyntaxError],\n      ['TypeError', TypeError],\n      ['URIError', URIError],\n    ]);\n\n    // callAndWrapError is copied from the Realm shim. Our SES.confine (from\n    // inside the realm) delegates to Realm.evaluate (from outside the realm),\n    // but we need the exceptions to come from our own realm, so we use this to\n    // reverse the shim's own callAndWrapError. TODO: look for a reasonable way\n    // to avoid the double-wrapping, maybe by changing the shim/Realms-spec to\n    // provide the safeEvaluator as a Realm.evaluate method (inside a realm).\n    // That would make this trivial: global.SES = Realm.evaluate (modulo\n    // potential 'this' issues)\n\n    // the comments here were written from the POV of a parent defending itself\n    // against a malicious child realm. In this case, we are the child.\n\n    function callAndWrapError(target, ...args) {\n      try {\n        return target(...args);\n      } catch (err) {\n        if (Object(err) !== err) {\n          // err is a primitive value, which is safe to rethrow\n          throw err;\n        }\n        let eName;\n        let eMessage;\n        let eStack;\n        try {\n          // The child environment might seek to use 'err' to reach the\n          // parent's intrinsics and corrupt them. `${err.name}` will cause\n          // string coercion of 'err.name'. If err.name is an object (probably\n          // a String of the parent Realm), the coercion uses\n          // err.name.toString(), which is under the control of the parent. If\n          // err.name were a primitive (e.g. a number), it would use\n          // Number.toString(err.name), using the child's version of Number\n          // (which the child could modify to capture its argument for later\n          // use), however primitives don't have properties like .prototype so\n          // they aren't useful for an attack.\n          eName = `${err.name}`;\n          eMessage = `${err.message}`;\n          eStack = `${err.stack || eMessage}`;\n          // eName/eMessage/eStack are now child-realm primitive strings, and\n          // safe to expose\n        } catch (ignored) {\n          // if err.name.toString() throws, keep the (parent realm) Error away\n          // from the child\n          throw new Error('unknown error');\n        }\n        const ErrorConstructor = errorConstructors.get(eName) || Error;\n        try {\n          throw new ErrorConstructor(eMessage);\n        } catch (err2) {\n          err2.stack = eStack; // replace with the captured inner stack\n          throw err2;\n        }\n      }\n    }\n\n    // We must not allow other child code to access that object. SES.confine\n    // closes over the parent's Realm object so it shouldn't be accessible from\n    // the outside.\n\n    // eslint-disable-next-line no-param-reassign\n    global.SES.confine = (code, endowments) =>\n      callAndWrapError(() => parentRealm.evaluate(code, endowments));\n    // eslint-disable-next-line no-param-reassign\n    global.SES.confineExpr = (code, endowments) =>\n      callAndWrapError(() => parentRealm.evaluate(`(${code})`, endowments));\n  }\n\n  exports.createSESInThisRealm = createSESInThisRealm;\n  exports.createSESWithRealmConstructor = createSESWithRealmConstructor;\n\n  return exports;\n\n}({}))";

  // Copyright (C) 2018 Agoric

  const SES = createSESWithRealmConstructor(creatorStrings, Realm);

  return SES;

}));
