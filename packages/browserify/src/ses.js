// slightly modified by kumavis for better browserify support
// - made exports easy to use
// - realms fix: `if (isBrowser) isNode = false`

const { SES } = (function (exports) {
  'use strict';

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

  function createSESWithRealmConstructor(creatorStrings, Realm) {
    function makeSESRootRealm(options) {
      options = Object(options); // Todo: sanitize
      const r = Realm.makeRootRealm();
      const b = r.evaluate(creatorStrings);
      b.createSESInThisRealm(r.global, creatorStrings, r);
      //b.removeProperties(r.global);
      b.tamePrimordials(r.global, options);
      r.global.def = b.def;
      r.global.Nat = b.Nat;

      b.deepFreezePrimordials(r.global);
      return r;
    }
    const SES = {
      makeSESRootRealm,
    };

    return SES;
  }

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

  function deepFreeze(root) {

    const { freeze, getOwnPropertyDescriptors, getPrototypeOf } = Object;
    const { ownKeys } = Reflect;

    // Objects that are deeply frozen.
    const frozenSet = new WeakSet();

    /**
     * "innerDeepFreeze()" acts like "Object.freeze()", except that:
     *
     * To deepFreeze an object is to freeze it and all objects transitively
     * reachable from it via transitive reflective property and prototype
     * traversal.
     */
    function innerDeepFreeze(node) {
      // Objects that we have frozen in this round.
      const freezingSet = new Set();

      // If val is something we should be freezing but aren't yet,
      // add it to freezingSet.
      function enqueue(val) {
        if (Object(val) !== val) {
          // ignore primitives
          return;
        }
        const type = typeof val;
        if (type !== 'object' && type !== 'function') {
          // future proof: break until someone figures out what it should do
          throw new TypeError(`Unexpected typeof: ${type}`);
        }
        if (frozenSet.has(val) || freezingSet.has(val)) {
          // todo use uncurried form
          // Ignore if already frozen or freezing
          return;
        }
        freezingSet.add(val); // todo use uncurried form
      }

      function doFreeze(obj) {
        // Immediately freeze the object to ensure reactive
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
        enqueue(proto);
        ownKeys(descs).forEach(name => {
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
            enqueue(desc.value);
          } else {
            enqueue(desc.get);
            enqueue(desc.set);
          }
        });
      }

      function dequeue() {
        // New values added before forEach() has finished will be visited.
        freezingSet.forEach(doFreeze); // todo curried forEach
      }

      function commit() {
        // todo curried forEach
        // we capture the real WeakSet.prototype.add above, in case someone
        // changes it. The two-argument form of forEach passes the second
        // argument as the 'this' binding, so we add to the correct set.
        freezingSet.forEach(frozenSet.add, frozenSet);
      }

      enqueue(node);
      dequeue();
      commit();
    }

    innerDeepFreeze(root);
    return root;
  }

  // Copyright (C) 2011 Google Inc.

  // Copyright (C) 2011 Google Inc.

  // Copyright (C) 2011 Google Inc.

  // Copyright (C) 2018 Agoric

  // Copyright (C) 2018 Agoric

  function def(node) {
    // TODO HACK return a shallow freeze unless Object.prototype is frozen.
    // This detects whether we are in a SES realm.

    // TODO: this currently does too much work: it doesn't remember what's been
    // frozen already, so it will re-freeze things like Function.prototype
    // every time. To fix this, deepFreeze() needs to be turned into a
    // "Freezer" object that retains a WeakMap of everything it has ever
    // frozen, this def() function should take a Freezer, and the def() exposed
    // as a global should close over the Freezer and deliver it here.
    // deepFreezePrimordials() should use that same Freezer

    if (Object.isFrozen(Object.prototype)) {
      deepFreeze(node);
    } else {
      Object.freeze(node);
    }
    return node;
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
   * Is allegenNum a number in the contiguous range of exactly and
   * unambiguously representable natural numbers (non-negative integers)?
   *
   * <p>See <a href=
   * "https://code.google.com/p/google-caja/issues/detail?id=1801"
   * >Issue 1801: Nat must include at most (2**53)-1</a>
   * and <a href=
   * "https://mail.mozilla.org/pipermail/es-discuss/2013-July/031716.html"
   * >Allen Wirfs-Brock's suggested phrasing</a> on es-discuss.
   */
  function Nat(allegedNum) {
    // TODO simplify by using Number.isSafeInteger
    if (typeof allegedNum !== 'number') {
      throw new RangeError('not a number');
    }
    if (allegedNum !== allegedNum) { throw new RangeError('NaN not natural'); }
    if (allegedNum < 0)            { throw new RangeError('negative'); }
    if (allegedNum % 1 !== 0)      { throw new RangeError('not integral'); }
    if (allegedNum > Number.MAX_SAFE_INTEGER) { throw new RangeError('too big'); }
    return allegedNum;
  }

  // Copyright (C) 2018 Agoric

  const creatorStrings = "(function (exports) {\n  'use strict';\n\n  // Copyright (C) 2018 Agoric\n  //\n  // Licensed under the Apache License, Version 2.0 (the \"License\");\n  // you may not use this file except in compliance with the License.\n  // You may obtain a copy of the License at\n  //\n  // http://www.apache.org/licenses/LICENSE-2.0\n  //\n  // Unless required by applicable law or agreed to in writing, software\n  // distributed under the License is distributed on an \"AS IS\" BASIS,\n  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  // See the License for the specific language governing permissions and\n  // limitations under the License.\n\n  function createSESWithRealmConstructor(creatorStrings, Realm) {\n    function makeSESRootRealm(options) {\n      options = Object(options); // Todo: sanitize\n      const r = Realm.makeRootRealm();\n      const b = r.evaluate(creatorStrings);\n      b.createSESInThisRealm(r.global, creatorStrings, r);\n      //b.removeProperties(r.global);\n      b.tamePrimordials(r.global, options);\n      r.global.def = b.def;\n      r.global.Nat = b.Nat;\n\n      b.deepFreezePrimordials(r.global);\n      return r;\n    }\n    const SES = {\n      makeSESRootRealm,\n    };\n\n    return SES;\n  }\n\n  function createSESInThisRealm(global, creatorStrings, parentRealm) {\n    global.SES = createSESWithRealmConstructor(creatorStrings, Realm);\n    // todo: wrap exceptions, effectively undoing the wrapping that\n    // Realm.evaluate does\n\n    const errorConstructors = new Map([\n      ['EvalError', EvalError],\n      ['RangeError', RangeError],\n      ['ReferenceError', ReferenceError],\n      ['SyntaxError', SyntaxError],\n      ['TypeError', TypeError],\n      ['URIError', URIError]\n    ]);\n\n    // callAndWrapError is copied from the Realm shim. Our SES.confine (from\n    // inside the realm) delegates to Realm.evaluate (from outside the realm),\n    // but we need the exceptions to come from our own realm, so we use this to\n    // reverse the shim's own callAndWrapError. TODO: look for a reasonable way\n    // to avoid the double-wrapping, maybe by changing the shim/Realms-spec to\n    // provide the safeEvaluator as a Realm.evaluate method (inside a realm).\n    // That would make this trivial: global.SES = Realm.evaluate (modulo\n    // potential 'this' issues)\n\n    // the comments here were written from the POV of a parent defending itself\n    // against a malicious child realm. In this case, we are the child.\n\n    function callAndWrapError(target, ...args) {\n      try {\n        return target(...args);\n      } catch (err) {\n        if (Object(err) !== err) {\n          // err is a primitive value, which is safe to rethrow\n          throw err;\n        }\n        let eName, eMessage, eStack;\n        try {\n          // The child environment might seek to use 'err' to reach the\n          // parent's intrinsics and corrupt them. `${err.name}` will cause\n          // string coercion of 'err.name'. If err.name is an object (probably\n          // a String of the parent Realm), the coercion uses\n          // err.name.toString(), which is under the control of the parent. If\n          // err.name were a primitive (e.g. a number), it would use\n          // Number.toString(err.name), using the child's version of Number\n          // (which the child could modify to capture its argument for later\n          // use), however primitives don't have properties like .prototype so\n          // they aren't useful for an attack.\n          eName = `${err.name}`;\n          eMessage = `${err.message}`;\n          eStack = `${err.stack}`;\n          // eName/eMessage/eStack are now child-realm primitive strings, and\n          // safe to expose\n        } catch (ignored) {\n          // if err.name.toString() throws, keep the (parent realm) Error away\n          // from the child\n          throw new Error('unknown error');\n        }\n        const ErrorConstructor = errorConstructors.get(eName) || Error;\n        try {\n          throw new ErrorConstructor(eMessage);\n        } catch (err2) {\n          err2.stack = eStack; // replace with the captured inner stack\n          throw err2;\n        }\n      }\n    }\n\n    // We must not allow other child code to access that object. SES.confine\n    // closes over the parent's Realm object so it shouldn't be accessible from\n    // the outside.\n\n    global.SES.confine = (code, endowments) => callAndWrapError(\n      () => parentRealm.evaluate(code, endowments));\n    global.SES.confineExpr = (code, endowments) => callAndWrapError(\n      () => parentRealm.evaluate(`(${code})`, endowments));\n  }\n\n  // Adapted from SES/Caja - Copyright (C) 2011 Google Inc.\n  // Copyright (C) 2018 Agoric\n\n  // Licensed under the Apache License, Version 2.0 (the \"License\");\n  // you may not use this file except in compliance with the License.\n  // You may obtain a copy of the License at\n  //\n  // http://www.apache.org/licenses/LICENSE-2.0\n  //\n  // Unless required by applicable law or agreed to in writing, software\n  // distributed under the License is distributed on an \"AS IS\" BASIS,\n  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  // See the License for the specific language governing permissions and\n  // limitations under the License.\n\n  // based upon:\n  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/startSES.js\n  // https://github.com/google/caja/blob/master/src/com/google/caja/ses/repairES5.js\n  // then copied from proposal-frozen-realms deep-freeze.js\n\n  function deepFreeze(root) {\n\n    const { freeze, getOwnPropertyDescriptors, getPrototypeOf } = Object;\n    const { ownKeys } = Reflect;\n\n    // Objects that are deeply frozen.\n    const frozenSet = new WeakSet();\n\n    /**\n     * \"innerDeepFreeze()\" acts like \"Object.freeze()\", except that:\n     *\n     * To deepFreeze an object is to freeze it and all objects transitively\n     * reachable from it via transitive reflective property and prototype\n     * traversal.\n     */\n    function innerDeepFreeze(node) {\n      // Objects that we have frozen in this round.\n      const freezingSet = new Set();\n\n      // If val is something we should be freezing but aren't yet,\n      // add it to freezingSet.\n      function enqueue(val) {\n        if (Object(val) !== val) {\n          // ignore primitives\n          return;\n        }\n        const type = typeof val;\n        if (type !== 'object' && type !== 'function') {\n          // future proof: break until someone figures out what it should do\n          throw new TypeError(`Unexpected typeof: ${type}`);\n        }\n        if (frozenSet.has(val) || freezingSet.has(val)) {\n          // todo use uncurried form\n          // Ignore if already frozen or freezing\n          return;\n        }\n        freezingSet.add(val); // todo use uncurried form\n      }\n\n      function doFreeze(obj) {\n        // Immediately freeze the object to ensure reactive\n        // objects such as proxies won't add properties\n        // during traversal, before they get frozen.\n\n        // Object are verified before being enqueued,\n        // therefore this is a valid candidate.\n        // Throws if this fails (strict mode).\n        freeze(obj);\n\n        // we rely upon certain commitments of Object.freeze and proxies here\n\n        // get stable/immutable outbound links before a Proxy has a chance to do\n        // something sneaky.\n        const proto = getPrototypeOf(obj);\n        const descs = getOwnPropertyDescriptors(obj);\n        enqueue(proto);\n        ownKeys(descs).forEach(name => {\n          // todo uncurried form\n          // todo: getOwnPropertyDescriptors is guaranteed to return well-formed\n          // descriptors, but they still inherit from Object.prototype. If\n          // someone has poisoned Object.prototype to add 'value' or 'get'\n          // properties, then a simple 'if (\"value\" in desc)' or 'desc.value'\n          // test could be confused. We use hasOwnProperty to be sure about\n          // whether 'value' is present or not, which tells us for sure that this\n          // is a data property.\n          const desc = descs[name];\n          if ('value' in desc) {\n            // todo uncurried form\n            enqueue(desc.value);\n          } else {\n            enqueue(desc.get);\n            enqueue(desc.set);\n          }\n        });\n      }\n\n      function dequeue() {\n        // New values added before forEach() has finished will be visited.\n        freezingSet.forEach(doFreeze); // todo curried forEach\n      }\n\n      function commit() {\n        // todo curried forEach\n        // we capture the real WeakSet.prototype.add above, in case someone\n        // changes it. The two-argument form of forEach passes the second\n        // argument as the 'this' binding, so we add to the correct set.\n        freezingSet.forEach(frozenSet.add, frozenSet);\n      }\n\n      enqueue(node);\n      dequeue();\n      commit();\n    }\n\n    innerDeepFreeze(root);\n    return root;\n  }\n\n\n  function deepFreezePrimordials(global) {\n    const primordialRoots = { global,\n                              // todo: add other roots, to reach the\n                              // unreachables/\"anonIntrinsics\": see\n                              // whitelist.js for a list\n                              //anonIntrinsics: getAnonIntrinsics(global)\n                            };\n    deepFreeze(primordialRoots);\n  }\n\n  // Copyright (C) 2011 Google Inc.\n  // Copyright (C) 2018 Agoric\n  //\n  // Licensed under the Apache License, Version 2.0 (the \"License\");\n  // you may not use this file except in compliance with the License.\n  // You may obtain a copy of the License at\n  //\n  // http://www.apache.org/licenses/LICENSE-2.0\n  //\n  // Unless required by applicable law or agreed to in writing, software\n  // distributed under the License is distributed on an \"AS IS\" BASIS,\n  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  // See the License for the specific language governing permissions and\n  // limitations under the License.\n\n  /**\n   * @fileoverview Exports {@code ses.whitelist}, a recursively defined\n   * JSON record enumerating all the naming paths in the ES5.1 spec,\n   * those de-facto extensions that we judge to be safe, and SES and\n   * Dr. SES extensions provided by the SES runtime.\n   *\n   * <p>Assumes only ES3. Compatible with ES5, ES5-strict, or\n   * anticipated ES6.\n   *\n   * //provides ses.whitelist\n   * @author Mark S. Miller,\n   * @overrides ses, whitelistModule\n   */\n\n  /**\n   * <p>Each JSON record enumerates the disposition of the properties on\n   * some corresponding primordial object, with the root record\n   * representing the global object. For each such record, the values\n   * associated with its property names can be\n   * <ul>\n   * <li>Another record, in which case this property is simply\n   *     whitelisted and that next record represents the disposition of\n   *     the object which is its value. For example, {@code \"Object\"}\n   *     leads to another record explaining what properties {@code\n   *     \"Object\"} may have and how each such property, if present,\n   *     and its value should be tamed.\n   * <li>true, in which case this property is simply whitelisted. The\n   *     value associated with that property is still traversed and\n   *     tamed, but only according to the taming of the objects that\n   *     object inherits from. For example, {@code \"Object.freeze\"} leads\n   *     to true, meaning that the {@code \"freeze\"} property of {@code\n   *     Object} should be whitelisted and the value of the property (a\n   *     function) should be further tamed only according to the\n   *     markings of the other objects it inherits from, like {@code\n   *     \"Function.prototype\"} and {@code \"Object.prototype\").\n   *     If the property is an accessor property, it is not\n   *     whitelisted (as invoking an accessor might not be meaningful,\n   *     yet the accessor might return a value needing taming).\n   * <li>\"maybeAccessor\", in which case this accessor property is simply\n   *     whitelisted and its getter and/or setter are tamed according to\n   *     inheritance. If the property is not an accessor property, its\n   *     value is tamed according to inheritance.\n   * <li>\"*\", in which case this property on this object is whitelisted,\n   *     as is this property as inherited by all objects that inherit\n   *     from this object. The values associated with all such properties\n   *     are still traversed and tamed, but only according to the taming\n   *     of the objects that object inherits from. For example, {@code\n   *     \"Object.prototype.constructor\"} leads to \"*\", meaning that we\n   *     whitelist the {@code \"constructor\"} property on {@code\n   *     Object.prototype} and on every object that inherits from {@code\n   *     Object.prototype} that does not have a conflicting mark. Each\n   *     of these is tamed as if with true, so that the value of the\n   *     property is further tamed according to what other objects it\n   *     inherits from.\n   * <li>false, which suppresses permission inherited via \"*\".\n   * </ul>\n   *\n   * <p>TODO: We want to do for constructor: something weaker than '*',\n   * but rather more like what we do for [[Prototype]] links, which is\n   * that it is whitelisted only if it points at an object which is\n   * otherwise reachable by a whitelisted path.\n   *\n   * <p>The members of the whitelist are either\n   * <ul>\n   * <li>(uncommented) defined by the ES5.1 normative standard text,\n   * <li>(questionable) provides a source of non-determinism, in\n   *     violation of pure object-capability rules, but allowed anyway\n   *     since we've given up on restricting JavaScript to a\n   *     deterministic subset.\n   * <li>(ES5 Appendix B) common elements of de facto JavaScript\n   *     described by the non-normative Appendix B.\n   * <li>(Harmless whatwg) extensions documented at\n   *     <a href=\"http://wiki.whatwg.org/wiki/Web_ECMAScript\"\n   *     >http://wiki.whatwg.org/wiki/Web_ECMAScript</a> that seem to be\n   *     harmless. Note that the RegExp constructor extensions on that\n   *     page are <b>not harmless</b> and so must not be whitelisted.\n   * <li>(ES-Harmony proposal) accepted as \"proposal\" status for\n   *     EcmaScript-Harmony.\n   * </ul>\n   *\n   * <p>With the above encoding, there are some sensible whitelists we\n   * cannot express, such as marking a property both with \"*\" and a JSON\n   * record. This is an expedient decision based only on not having\n   * encountered such a need. Should we need this extra expressiveness,\n   * we'll need to refactor to enable a different encoding.\n   *\n   * <p>We factor out {@code true} into the variable {@code t} just to\n   * get a bit better compression from simple minifiers.\n   */\n  function buildWhitelist() {\n\n    var t = true;\n    var j = true;  // included in the Jessie runtime\n    var TypedArrayWhitelist;  // defined and used below\n\n    const whitelist = {\n      cajaVM: {                        // Caja support\n        // The accessible intrinsics which are not reachable by own\n        // property name traversal are listed here so that they are\n        // processed by the whitelist, although this also makes them\n        // accessible by this path.  See\n        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-well-known-intrinsic-objects\n        // Of these, ThrowTypeError is the only one from ES5. All the\n        // rest were introduced in ES6.\n        anonIntrinsics: {\n          ThrowTypeError: {},\n          IteratorPrototype: {  // 25.1\n            // Technically, for SES-on-ES5, we should not need to\n            // whitelist 'next'. However, browsers are accidentally\n            // relying on it\n            // https://bugs.chromium.org/p/v8/issues/detail?id=4769#\n            // https://bugs.webkit.org/show_bug.cgi?id=154475\n            // and we will be whitelisting it as we transition to ES6\n            // anyway, so we unconditionally whitelist it now.\n            next: '*',\n            constructor: false\n          },\n          ArrayIteratorPrototype: {},\n          StringIteratorPrototype: {},\n          MapIteratorPrototype: {},\n          SetIteratorPrototype: {},\n\n          // The %GeneratorFunction% intrinsic is the constructor of\n          // generator functions, so %GeneratorFunction%.prototype is\n          // the %Generator% intrinsic, which all generator functions\n          // inherit from. A generator function is effectively the\n          // constructor of its generator instances, so, for each\n          // generator function (e.g., \"g1\" on the diagram at\n          // http://people.mozilla.org/~jorendorff/figure-2.png )\n          // its .prototype is a prototype that its instances inherit\n          // from. Paralleling this structure, %Generator%.prototype,\n          // i.e., %GeneratorFunction%.prototype.prototype, is the\n          // object that all these generator function prototypes inherit\n          // from. The .next, .return and .throw that generator\n          // instances respond to are actually the builtin methods they\n          // inherit from this object.\n          GeneratorFunction: {  // 25.2\n            length: '*',  // Not sure why this is needed\n            prototype: {  // 25.3\n              prototype: {\n                next: '*',\n                return: '*',\n                throw: '*',\n                constructor: '*'  // Not sure why this is needed\n              }\n            }\n          },\n          // TODO: 25.5 AsyncFunction\n\n          TypedArray: TypedArrayWhitelist = {  // 22.2\n            length: '*',  // does not inherit from Function.prototype on Chrome\n            name: '*',  // ditto\n            from: t,\n            of: t,\n            BYTES_PER_ELEMENT: '*',\n            prototype: {\n              buffer: 'maybeAccessor',\n              byteLength: 'maybeAccessor',\n              byteOffset: 'maybeAccessor',\n              copyWithin: '*',\n              entries: '*',\n              every: '*',\n              fill: '*',\n              filter: '*',\n              find: '*',\n              findIndex: '*',\n              forEach: '*',\n              includes: '*',\n              indexOf: '*',\n              join: '*',\n              keys: '*',\n              lastIndexOf: '*',\n              length: 'maybeAccessor',\n              map: '*',\n              reduce: '*',\n              reduceRight: '*',\n              reverse: '*',\n              set: '*',\n              slice: '*',\n              some: '*',\n              sort: '*',\n              subarray: '*',\n              values: '*',\n              BYTES_PER_ELEMENT: '*'\n            }\n          }\n        },\n\n        log: t,\n        tamperProof: t,\n        constFunc: t,\n        Nat: j,\n        def: j,\n        is: t,\n\n        compileExpr: t,\n        confine: j,\n        compileModule: t,              // experimental\n        compileProgram: t,             // Cannot be implemented in just ES5.1.\n        eval: t,\n        Function: t,\n\n        sharedImports: t,\n        makeImports: t,\n        copyToImports: t,\n\n        GuardT: {\n          coerce: t\n        },\n        makeTableGuard: t,\n        Trademark: {\n          stamp: t\n        },\n        guard: t,\n        passesGuard: t,\n        stamp: t,\n        makeSealerUnsealerPair: t,\n\n        makeArrayLike: {\n          canBeFullyLive: t\n        }\n      },\n\n      // In order according to\n      // http://www.ecma-international.org/ecma-262/ with chapter\n      // numbers where applicable\n\n\n      // 18 The Global Object\n\n      // 18.1\n      Infinity: j,\n      NaN: j,\n      undefined: j,\n\n      // 18.2\n      // eval: t,                      // Whitelisting under separate control\n                                       // by TAME_GLOBAL_EVAL in startSES.js\n      isFinite: t,\n      isNaN: t,\n      parseFloat: t,\n      parseInt: t,\n      decodeURI: t,\n      decodeURIComponent: t,\n      encodeURI: t,\n      encodeURIComponent: t,\n\n\n      // 19 Fundamental Objects\n\n      Object: {  // 19.1\n        assign: t,                     // ES-Harmony\n        create: t,\n        defineProperties: t,           // ES-Harmony\n        defineProperty: t,\n        entries: t,                    // ES-Harmony\n        freeze: j,\n        getOwnPropertyDescriptor: t,\n        getOwnPropertyDescriptors: t,  // proposed ES-Harmony\n        getOwnPropertyNames: t,\n        getOwnPropertySymbols: t,      // ES-Harmony\n        getPrototypeOf: t,\n        is: j,                         // ES-Harmony\n        isExtensible: t,\n        isFrozen: t,\n        isSealed: t,\n        keys: t,\n        preventExtensions: j,\n        seal: j,\n        setPrototypeOf: t,             // ES-Harmony\n        values: t,                     // ES-Harmony\n\n        prototype: {\n\n          // B.2.2\n          // __proto__: t, whitelisted manually in startSES.js\n          __defineGetter__: t,\n          __defineSetter__: t,\n          __lookupGetter__: t,\n          __lookupSetter__: t,\n\n          constructor: '*',\n          hasOwnProperty: t,\n          isPrototypeOf: t,\n          propertyIsEnumerable: t,\n          toLocaleString: '*',\n          toString: '*',\n          valueOf: '*',\n\n          // Generally allowed\n          [Symbol.iterator]: '*',\n          [Symbol.toPrimitive]: '*',\n          [Symbol.toStringTag]: '*',\n          [Symbol.unscopables]: '*'\n        }\n      },\n\n      Function: {  // 19.2\n        length: t,\n        prototype: {\n          apply: t,\n          bind: t,\n          call: t,\n          [Symbol.hasInstance]: '*',\n\n          // 19.2.4 instances\n          length: '*',\n          name: '*',                   // ES-Harmony\n          prototype: '*',\n          arity: '*',                   // non-std, deprecated in favor of length\n\n          // Generally allowed\n          [Symbol.species]: 'maybeAccessor'  // ES-Harmony?\n        }\n      },\n\n      Boolean: {  // 19.3\n        prototype: t\n      },\n\n      Symbol: {  // 19.4               all ES-Harmony\n        asyncIterator: t,              // proposed? ES-Harmony\n        for: t,\n        hasInstance: t,\n        isConcatSpreadable: t,\n        iterator: t,\n        keyFor: t,\n        match: t,\n        replace: t,\n        search: t,\n        species: t,\n        split: t,\n        toPrimitive: t,\n        toStringTag: t,\n        unscopables: t,\n        prototype: t\n      },\n\n      Error: {  // 19.5\n        prototype: {\n          name: '*',\n          message: '*'\n        }\n      },\n      // In ES6 the *Error \"subclasses\" of Error inherit from Error,\n      // since constructor inheritance generally mirrors prototype\n      // inheritance. As explained at\n      // https://code.google.com/p/google-caja/issues/detail?id=1963 ,\n      // debug.js hides away the Error constructor itself, and so needs\n      // to rewire these \"subclass\" constructors. Until we have a more\n      // general mechanism, please maintain this list of whitelisted\n      // subclasses in sync with the list in debug.js of subclasses to\n      // be rewired.\n      EvalError: {\n        prototype: t\n      },\n      RangeError: {\n        prototype: t\n      },\n      ReferenceError: {\n        prototype: t\n      },\n      SyntaxError: {\n        prototype: t\n      },\n      TypeError: {\n        prototype: t\n      },\n      URIError: {\n        prototype: t\n      },\n\n\n      // 20 Numbers and Dates\n\n      Number: {  // 20.1\n        EPSILON: t,                    // ES-Harmony\n        isFinite: j,                   // ES-Harmony\n        isInteger: t,                  // ES-Harmony\n        isNaN: j,                      // ES-Harmony\n        isSafeInteger: j,              // ES-Harmony\n        MAX_SAFE_INTEGER: j,           // ES-Harmony\n        MAX_VALUE: t,\n        MIN_SAFE_INTEGER: j,           // ES-Harmony\n        MIN_VALUE: t,\n        NaN: t,\n        NEGATIVE_INFINITY: t,\n        parseFloat: t,                 // ES-Harmony\n        parseInt: t,                   // ES-Harmony\n        POSITIVE_INFINITY: t,\n        prototype: {\n          toExponential: t,\n          toFixed: t,\n          toPrecision: t\n        }\n      },\n\n      Math: {  // 20.2\n        E: j,\n        LN10: j,\n        LN2: j,\n        LOG10E: t,\n        LOG2E: t,\n        PI: j,\n        SQRT1_2: t,\n        SQRT2: t,\n\n        abs: j,\n        acos: t,\n        acosh: t,                      // ES-Harmony\n        asin: t,\n        asinh: t,                      // ES-Harmony\n        atan: t,\n        atanh: t,                      // ES-Harmony\n        atan2: t,\n        cbrt: t,                       // ES-Harmony\n        ceil: j,\n        clz32: t,                      // ES-Harmony\n        cos: t,\n        cosh: t,                       // ES-Harmony\n        exp: t,\n        expm1: t,                      // ES-Harmony\n        floor: j,\n        fround: t,                     // ES-Harmony\n        hypot: t,                      // ES-Harmony\n        imul: t,                       // ES-Harmony\n        log: j,\n        log1p: t,                      // ES-Harmony\n        log10: j,                      // ES-Harmony\n        log2: j,                       // ES-Harmony\n        max: j,\n        min: j,\n        pow: j,\n        random: t,                     // questionable\n        round: j,\n        sign: t,                       // ES-Harmony\n        sin: t,\n        sinh: t,                       // ES-Harmony\n        sqrt: j,\n        tan: t,\n        tanh: t,                       // ES-Harmony\n        trunc: j                       // ES-Harmony\n      },\n\n      // no-arg Date constructor is questionable\n      Date: {  // 20.3\n        now: t,                        // questionable\n        parse: t,\n        UTC: t,\n        prototype: {\n          // Note: coordinate this list with maintanence of repairES5.js\n          getDate: t,\n          getDay: t,\n          getFullYear: t,\n          getHours: t,\n          getMilliseconds: t,\n          getMinutes: t,\n          getMonth: t,\n          getSeconds: t,\n          getTime: t,\n          getTimezoneOffset: t,\n          getUTCDate: t,\n          getUTCDay: t,\n          getUTCFullYear: t,\n          getUTCHours: t,\n          getUTCMilliseconds: t,\n          getUTCMinutes: t,\n          getUTCMonth: t,\n          getUTCSeconds: t,\n          setDate: t,\n          setFullYear: t,\n          setHours: t,\n          setMilliseconds: t,\n          setMinutes: t,\n          setMonth: t,\n          setSeconds: t,\n          setTime: t,\n          setUTCDate: t,\n          setUTCFullYear: t,\n          setUTCHours: t,\n          setUTCMilliseconds: t,\n          setUTCMinutes: t,\n          setUTCMonth: t,\n          setUTCSeconds: t,\n          toDateString: t,\n          toISOString: t,\n          toJSON: t,\n          toLocaleDateString: t,\n          toLocaleString: t,\n          toLocaleTimeString: t,\n          toTimeString: t,\n          toUTCString: t,\n\n          // B.2.4\n          getYear: t,\n          setYear: t,\n          toGMTString: t\n        }\n      },\n\n\n      // 21 Text Processing\n\n      String: {  // 21.2\n        fromCharCode: j,\n        fromCodePoint: t,              // ES-Harmony\n        raw: j,                        // ES-Harmony\n        prototype: {\n          charAt: t,\n          charCodeAt: t,\n          codePointAt: t,              // ES-Harmony\n          concat: t,\n          endsWith: j,                 // ES-Harmony\n          includes: t,                 // ES-Harmony\n          indexOf: j,\n          lastIndexOf: j,\n          localeCompare: t,\n          match: t,\n          normalize: t,                // ES-Harmony\n          padEnd: t,                   // ES-Harmony\n          padStart: t,                 // ES-Harmony\n          repeat: t,                   // ES-Harmony\n          replace: t,\n          search: t,\n          slice: j,\n          split: t,\n          startsWith: j,               // ES-Harmony\n          substring: t,\n          toLocaleLowerCase: t,\n          toLocaleUpperCase: t,\n          toLowerCase: t,\n          toUpperCase: t,\n          trim: t,\n\n          // B.2.3\n          substr: t,\n          anchor: t,\n          big: t,\n          blink: t,\n          bold: t,\n          fixed: t,\n          fontcolor: t,\n          fontsize: t,\n          italics: t,\n          link: t,\n          small: t,\n          strike: t,\n          sub: t,\n          sup: t,\n\n          trimLeft: t,                 // non-standard\n          trimRight: t,                // non-standard\n\n          // 21.1.4 instances\n          length: '*'\n        }\n      },\n\n      RegExp: {  // 21.2\n        prototype: {\n          exec: t,\n          flags: 'maybeAccessor',\n          global: 'maybeAccessor',\n          ignoreCase: 'maybeAccessor',\n          [Symbol.match]: '*',         // ES-Harmony\n          multiline: 'maybeAccessor',\n          [Symbol.replace]: '*',       // ES-Harmony\n          [Symbol.search]: '*',        // ES-Harmony\n          source: 'maybeAccessor',\n          [Symbol.split]: '*',         // ES-Harmony\n          sticky: 'maybeAccessor',\n          test: t,\n          unicode: 'maybeAccessor',    // ES-Harmony\n          dotAll: 'maybeAccessor',     // proposed ES-Harmony\n\n          // 21.2.6 instances\n          lastIndex: '*',\n          options: '*'                 // non-std\n        }\n      },\n\n\n      // 22 Indexed Collections\n\n      Array: {  // 22.1\n        from: j,\n        isArray: t,\n        of: j,                         // ES-Harmony?\n        prototype: {\n          concat: t,\n          copyWithin: t,               // ES-Harmony\n          entries: t,                  // ES-Harmony\n          every: t,\n          fill: t,                     // ES-Harmony\n          filter: j,\n          find: t,                     // ES-Harmony\n          findIndex: t,                // ES-Harmony\n          forEach: j,\n          includes: t,                 // ES-Harmony\n          indexOf: j,\n          join: t,\n          keys: t,                     // ES-Harmony\n          lastIndexOf: j,\n          map: j,\n          pop: j,\n          push: j,\n          reduce: j,\n          reduceRight: j,\n          reverse: t,\n          shift: j,\n          slice: j,\n          some: t,\n          sort: t,\n          splice: t,\n          unshift: j,\n          values: t,                   // ES-Harmony\n\n          // B.2.5\n          compile: false,              // UNSAFE. Purposely suppressed\n\n          // 22.1.4 instances\n          length: '*'\n        }\n      },\n\n      // 22.2 Typed Array stuff\n      // TODO: Not yet organized according to spec order\n\n      Int8Array: TypedArrayWhitelist,\n      Uint8Array: TypedArrayWhitelist,\n      Uint8ClampedArray: TypedArrayWhitelist,\n      Int16Array: TypedArrayWhitelist,\n      Uint16Array: TypedArrayWhitelist,\n      Int32Array: TypedArrayWhitelist,\n      Uint32Array: TypedArrayWhitelist,\n      Float32Array: TypedArrayWhitelist,\n      Float64Array: TypedArrayWhitelist,\n\n\n      // 23 Keyed Collections          all ES-Harmony\n\n      Map: {  // 23.1\n        prototype: {\n          clear: j,\n          delete: j,\n          entries: j,\n          forEach: j,\n          get: j,\n          has: j,\n          keys: j,\n          set: j,\n          size: 'maybeAccessor',\n          values: j\n        }\n      },\n\n      Set: {  // 23.2\n        prototype: {\n          add: j,\n          clear: j,\n          delete: j,\n          entries: j,\n          forEach: j,\n          has: j,\n          keys: j,\n          size: 'maybeAccessor',\n          values: j\n        }\n      },\n\n      WeakMap: {  // 23.3\n        prototype: {\n          // Note: coordinate this list with maintenance of repairES5.js\n          delete: j,\n          get: j,\n          has: j,\n          set: j\n        }\n      },\n\n      WeakSet: {  // 23.4\n        prototype: {\n          add: j,\n          delete: j,\n          has: j\n        }\n      },\n\n\n      // 24 Structured Data\n\n      ArrayBuffer: {  // 24.1            all ES-Harmony\n        isView: t,\n        length: t,  // does not inherit from Function.prototype on Chrome\n        name: t,    // ditto\n        prototype: {\n          byteLength: 'maybeAccessor',\n          slice: t\n        }\n      },\n\n      // 24.2 TODO: Omitting SharedArrayBuffer for now\n\n      DataView: {  // 24.3               all ES-Harmony\n        length: t,  // does not inherit from Function.prototype on Chrome\n        name: t,    // ditto\n        BYTES_PER_ELEMENT: '*',          // non-standard. really?\n        prototype: {\n          buffer: 'maybeAccessor',\n          byteOffset: 'maybeAccessor',\n          byteLength: 'maybeAccessor',\n          getFloat32: t,\n          getFloat64: t,\n          getInt8: t,\n          getInt16: t,\n          getInt32: t,\n          getUint8: t,\n          getUint16: t,\n          getUint32: t,\n          setFloat32: t,\n          setFloat64: t,\n          setInt8: t,\n          setInt16: t,\n          setInt32: t,\n          setUint8: t,\n          setUint16: t,\n          setUint32: t\n        }\n      },\n\n      // 24.4 TODO: Omitting Atomics for now\n\n      JSON: {  // 24.5\n        parse: j,\n        stringify: j\n      },\n\n\n      // 25 Control Abstraction Objects\n\n      Promise: {  // 25.4\n        all: j,\n        race: j,\n        reject: j,\n        resolve: j,\n        prototype: {\n          catch: t,\n          then: j,\n          finally: t,                    // proposed ES-Harmony\n\n          // nanoq.js\n          get: t,\n          put: t,\n          del: t,\n          post: t,\n          invoke: t,\n          fapply: t,\n          fcall: t,\n\n          // Temporary compat with the old makeQ.js\n          send: t,\n          delete: t,\n          end: t\n        }\n      },\n\n      // nanoq.js\n      Q: {\n        all: t,\n        race: t,\n        reject: t,\n        resolve: t,\n\n        join: t,\n        isPassByCopy: t,\n        passByCopy: t,\n        makeRemote: t,\n        makeFar: t,\n\n        // Temporary compat with the old makeQ.js\n        shorten: t,\n        isPromise: t,\n        async: t,\n        rejected: t,\n        promise: t,\n        delay: t,\n        memoize: t,\n        defer: t\n      },\n\n\n      // 26 Reflection\n\n      Reflect: {  // 26.1\n        apply: t,\n        construct: t,\n        defineProperty: t,\n        deleteProperty: t,\n        get: t,\n        getOwnPropertyDescriptor: t,\n        getPrototypeOf: t,\n        has: t,\n        isExtensible: t,\n        ownKeys: t,\n        preventExtensions: t,\n        set: t,\n        setPrototypeOf: t\n      },\n\n      Proxy: {  // 26.2\n        revocable: t\n      },\n\n\n      // Appendix B\n\n      // B.2.1\n      escape: t,\n      unescape: t,\n\n\n      // Other\n\n      StringMap: {  // A specialized approximation of ES-Harmony's Map.\n        prototype: {} // Technically, the methods should be on the prototype,\n                      // but doing so while preserving encapsulation will be\n                      // needlessly expensive for current usage.\n      }\n    };\n\n    return whitelist;\n  }\n\n  // Copyright (C) 2011 Google Inc.\n  // Copyright (C) 2018 Agoric\n  //\n  // Licensed under the Apache License, Version 2.0 (the \"License\");\n  // you may not use this file except in compliance with the License.\n  // You may obtain a copy of the License at\n  //\n  // https://www.apache.org/licenses/LICENSE-2.0\n  //\n  // Unless required by applicable law or agreed to in writing, software\n  // distributed under the License is distributed on an \"AS IS\" BASIS,\n  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  // See the License for the specific language governing permissions and\n  // limitations under the License.\n\n  // TODO(erights): We should test for\n  // We now have a reason to omit Proxy from the whitelist.\n  // The makeBrandTester in repairES5 uses Allen's trick at\n  // https://esdiscuss.org/topic/tostringtag-spoofing-for-null-and-undefined#content-59\n  // , but testing reveals that, on FF 35.0.1, a proxy on an exotic\n  // object X will pass this brand test when X will. This is fixed as of\n  // FF Nightly 38.0a1.\n\n\n\n  /**\n   * <p>Qualifying platforms generally include all JavaScript platforms\n   * shown on <a href=\"http://kangax.github.com/es5-compat-table/\"\n   * >ECMAScript 5 compatibility table</a> that implement {@code\n   * Object.getOwnPropertyNames}. At the time of this writing,\n   * qualifying browsers already include the latest released versions of\n   * Internet Explorer (9), Firefox (4), Chrome (11), and Safari\n   * (5.0.5), their corresponding standalone (e.g., server-side) JavaScript\n   * engines, Rhino 1.73, and BESEN.\n   *\n   * <p>On such not-quite-ES5 platforms, some elements of these\n   * emulations may lose SES safety, as enumerated in the comment on\n   * each problem record in the {@code baseProblems} and {@code\n   * supportedProblems} array below. The platform must at least provide\n   * {@code Object.getOwnPropertyNames}, because it cannot reasonably be\n   * emulated.\n   *\n   * <p>This file is useful by itself, as it has no dependencies on the\n   * rest of SES. It creates no new global bindings, but merely repairs\n   * standard globals or standard elements reachable from standard\n   * globals. If the future-standard {@code WeakMap} global is present,\n   * as it is currently on FF7.0a1, then it will repair it in place. The\n   * one non-standard element that this file uses is {@code console} if\n   * present, in order to report the repairs it found necessary, in\n   * which case we use its {@code log, info, warn}, and {@code error}\n   * methods. If {@code console.log} is absent, then this file performs\n   * its repairs silently.\n   *\n   * <p>Generally, this file should be run as the first script in a\n   * JavaScript context (i.e. a browser frame), as it relies on other\n   * primordial objects and methods not yet being perturbed.\n   *\n   * <p>TODO(erights): This file tries to protect itself from some\n   * post-initialization perturbation by stashing some of the\n   * primordials it needs for later use, but this attempt is currently\n   * incomplete. We need to revisit this when we support Confined-ES5,\n   * as a variant of SES in which the primordials are not frozen. See\n   * previous failed attempt at <a\n   * href=\"https://codereview.appspot.com/5278046/\" >Speeds up\n   * WeakMap. Preparing to support unfrozen primordials.</a>. From\n   * analysis of this failed attempt, it seems that the only practical\n   * way to support CES is by use of two frames, where most of initSES\n   * runs in a SES frame, and so can avoid worrying about most of these\n   * perturbations.\n   */\n  function getAnonIntrinsics(global) {\n\n    /**\n     * A known sloppy function which returns its arguments object.\n     *\n     * Defined using Function so it'll be sloppy (not strict and not\n     * builtin).\n     */\n    var sloppyArguments = Function('return arguments;');\n\n    /**\n     * If present, a known strict generator function which yields its\n     * arguments object.\n     *\n     * <p>TODO: once all supported browsers implement ES6 generators, we\n     * can drop the \"try\"s below, drop the check for old Mozilla\n     * generator syntax, and treat strictArgumentsGenerator as\n     * unconditional in the test of the code.\n     */\n    var strictArgumentsGenerator = void 0;\n    try {\n      // ES6 syntax\n      strictArgumentsGenerator =\n          eval('(function*() { \"use strict\"; yield arguments; })');\n    } catch (ex) {\n      if (!(ex instanceof SyntaxError)) { throw ex; }\n      try {\n        // Old Firefox syntax\n        strictArgumentsGenerator =\n            eval('(function() { \"use strict\"; yield arguments; })');\n      } catch (ex2) {\n        if (!(ex2 instanceof SyntaxError)) { throw ex2; }\n      }\n    }\n\n    /**\n     * The undeniables are the primordial objects which are ambiently\n     * reachable via compositions of strict syntax, primitive wrapping\n     * (new Object(x)), and prototype navigation (the equivalent of\n     * Object.getPrototypeOf(x) or x.__proto__). Although we could in\n     * theory monkey patch primitive wrapping or prototype navigation,\n     * we won't. Hence, without parsing, the following are undeniable no\n     * matter what <i>other</i> monkey patching we do to the primordial\n     * environment.\n     */\n    function getUndeniables() {\n      var getProto = Object.getPrototypeOf;\n\n      // The first element of each undeniableTuple is a string used to\n      // name the undeniable object for reporting purposes. It has no\n      // other programmatic use.\n      //\n      // The second element of each undeniableTuple should be the\n      // undeniable itself.\n      //\n      // The optional third element of the undeniableTuple, if present,\n      // should be an example of syntax, rather than use of a monkey\n      // patchable API, evaluating to a value from which the undeniable\n      // object in the second element can be reached by only the\n      // following steps:\n      // If the value is primitve, convert to an Object wrapper.\n      // Is the resulting object either the undeniable object, or does\n      // it inherit directly from the undeniable object?\n\n      var undeniableTuples = [\n          ['Object.prototype', Object.prototype, {}],\n          ['Function.prototype', Function.prototype, function(){}],\n          ['Array.prototype', Array.prototype, []],\n          ['RegExp.prototype', RegExp.prototype, /x/],\n          ['Boolean.prototype', Boolean.prototype, true],\n          ['Number.prototype', Number.prototype, 1],\n          ['String.prototype', String.prototype, 'x'],\n      ];\n      var result = {};\n\n      // Get the ES6 %Generator% intrinsic, if present.\n      // It is undeniable because individual generator functions inherit\n      // from it.\n      (function() {\n        // See http://people.mozilla.org/~jorendorff/figure-2.png\n        // i.e., Figure 2 of section 25.2 \"Generator Functions\" of the\n        // ES6 spec.\n        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorfunction-objects\n        if (!strictArgumentsGenerator) { return; }\n        var Generator = getProto(strictArgumentsGenerator);\n        undeniableTuples.push(['%Generator%', Generator,\n                               strictArgumentsGenerator]);\n        strictArgumentsGenerator = strictArgumentsGenerator;\n      }());\n\n      undeniableTuples.forEach(function(tuple) {\n        var name = tuple[0];\n        var undeniable = tuple[1];\n        var start = tuple[2];\n        result[name] = undeniable;\n        if (start === void 0) { return; }\n        start = Object(start);\n        if (undeniable === start) { return; }\n        if (undeniable === getProto(start)) { return; }\n        throw new Error('Unexpected undeniable: ' + undeniable);\n      });\n\n      return result;\n    }\n\n    // For consistency checking, once we've done all our whitelist\n    // processing and monkey patching, we will call getUndeniables again\n    // and check that the undeniables are the same.\n    const earlyUndeniables = getUndeniables();\n\n\n    function registerIteratorProtos(registery, base, name) {\n      var iteratorSym = global.Symbol && global.Symbol.iterator ||\n          \"@@iterator\"; // used instead of a symbol on FF35\n      var getProto = Object.getPrototypeOf;\n\n      if (base[iteratorSym]) {\n        var anIter = base[iteratorSym]();\n        var anIteratorPrototype = getProto(anIter);\n        registery[name] = anIteratorPrototype;\n        var anIterProtoBase = getProto(anIteratorPrototype);\n        if (anIterProtoBase !== Object.prototype) {\n          if (!registery.IteratorPrototype) {\n            if (getProto(anIterProtoBase) !== Object.prototype) {\n              throw new Error(\n                '%IteratorPrototype%.__proto__ was not Object.prototype');\n            }\n            registery.IteratorPrototype = anIterProtoBase;\n          } else {\n            if (registery.IteratorPrototype !== anIterProtoBase) {\n              throw new Error('unexpected %' + name + '%.__proto__');\n            }\n          }\n        }\n      }\n    }\n\n\n    /**\n     * Get the intrinsics not otherwise reachable by named own property\n     * traversal. See\n     * https://people.mozilla.org/~jorendorff/es6-draft.html#sec-well-known-intrinsic-objects\n     * and the instrinsics section of whitelist.js\n     *\n     * <p>Unlike getUndeniables(), the result of getAnonIntrinsics()\n     * does depend on the current state of the primordials, so we must\n     * run this again after all other relevant monkey patching is done,\n     * in order to properly initialize cajaVM.intrinsics\n     */\n    function getAnonIntrinsics() {\n      var gopd = Object.getOwnPropertyDescriptor;\n      var getProto = Object.getPrototypeOf;\n      var result = {};\n\n      // If there are still other ThrowTypeError objects left after\n      // noFuncPoison-ing, this should be caught by\n      // test_THROWTYPEERROR_NOT_UNIQUE below, so we assume here that\n      // this is the only surviving ThrowTypeError intrinsic.\n      result.ThrowTypeError = gopd(arguments, 'callee').get;\n\n      // Get the ES6 %ArrayIteratorPrototype%,\n      // %StringIteratorPrototype%, %MapIteratorPrototype%,\n      // %SetIteratorPrototype% and %IteratorPrototype% intrinsics, if\n      // present.\n      (function() {\n        registerIteratorProtos(result, [], 'ArrayIteratorPrototype');\n        registerIteratorProtos(result, '', 'StringIteratorPrototype');\n        if (typeof Map === 'function') {\n          registerIteratorProtos(result, new Map(), 'MapIteratorPrototype');\n        }\n        if (typeof Set === 'function') {\n          registerIteratorProtos(result, new Set(), 'SetIteratorPrototype');\n        }\n      }());\n\n      // Get the ES6 %GeneratorFunction% intrinsic, if present.\n      (function() {\n        var Generator = earlyUndeniables['%Generator%'];\n        if (!Generator || Generator === Function.prototype) { return; }\n        if (getProto(Generator) !== Function.prototype) {\n          throw new Error('Generator.__proto__ was not Function.prototype');\n        }\n        var GeneratorFunction = Generator.constructor;\n        if (GeneratorFunction === Function) { return; }\n        if (getProto(GeneratorFunction) !== Function) {\n          throw new Error('GeneratorFunction.__proto__ was not Function');\n        }\n        result.GeneratorFunction = GeneratorFunction;\n        var genProtoBase = getProto(Generator.prototype);\n        if (genProtoBase !== result.IteratorPrototype &&\n            genProtoBase !== Object.prototype) {\n          throw new Error('Unexpected Generator.prototype.__proto__');\n        }\n      }());\n\n      // Get the ES6 %TypedArray% intrinsic, if present.\n      (function() {\n        if (!global.Float32Array) { return; }\n        var TypedArray = getProto(global.Float32Array);\n        if (TypedArray === Function.prototype) { return; }\n        if (getProto(TypedArray) !== Function.prototype) {\n          // http://bespin.cz/~ondras/html/classv8_1_1ArrayBufferView.html\n          // has me worried that someone might make such an intermediate\n          // object visible.\n          throw new Error('TypedArray.__proto__ was not Function.prototype');\n        }\n        result.TypedArray = TypedArray;\n      }());\n\n      for (var name in result) {\n        if (result[name] === void 0) {\n          throw new Error('Malformed intrinsic: ' + name);\n        }\n      }\n\n      return result;\n    }\n\n    return getAnonIntrinsics();\n  }\n\n  // Copyright (C) 2011 Google Inc.\n\n  function removeProperties(global) {\n    // walk global object, test against whitelist, delete\n\n    const whitelist = buildWhitelist();\n\n    const uncurryThis = fn => (thisArg, ...args) => Reflect.apply(fn, thisArg, args);\n    const gopd = Object.getOwnPropertyDescriptor;\n    const gopn = Object.getOwnPropertyNames;\n    const keys = Object.keys;\n    const cleaning = new WeakMap();\n    const getProto = Object.getPrototypeOf;\n    const hop = uncurryThis(Object.prototype.hasOwnProperty);\n\n    const whiteTable = new WeakMap();\n\n    function addToWhiteTable(global) {\n      /**\n       * The whiteTable should map from each path-accessible primordial\n       * object to the permit object that describes how it should be\n       * cleaned.\n       *\n       * We initialize the whiteTable only so that {@code getPermit} can\n       * process \"*\" inheritance using the whitelist, by walking actual\n       * inheritance chains.\n       */\n      const whitelistSymbols = [true, false, '*', 'maybeAccessor'];\n      function register(value, permit) {\n        if (value !== Object(value)) { return; }\n        if (typeof permit !== 'object') {\n          if (whitelistSymbols.indexOf(permit) < 0) {\n            throw new Error('syntax error in whitelist; unexpected value: ' + permit);\n          }\n          return;\n        }\n        if (whiteTable.has(value)) {\n          throw new Error('primordial reachable through multiple paths');\n        }\n        whiteTable.set(value, permit);\n        keys(permit).forEach(function(name) {\n          // Use gopd to avoid invoking an accessor property.\n          // Accessor properties for which permit !== 'maybeAccessor'\n          // are caught later by clean().\n          const desc = gopd(value, name);\n          if (desc) {\n            register(desc.value, permit[name]);\n          }\n        });\n      }\n      register(global, whitelist);\n    }\n\n\n    /**\n     * Should the property named {@code name} be whitelisted on the\n     * {@code base} object, and if so, with what Permit?\n     *\n     * <p>If it should be permitted, return the Permit (where Permit =\n     * true | \"maybeAccessor\" | \"*\" | Record(Permit)), all of which are\n     * truthy. If it should not be permitted, return false.\n     */\n    function getPermit(base, name) {\n      let permit = whiteTable.get(base);\n      if (permit) {\n        if (hop(permit, name)) { return permit[name]; }\n      }\n      while (true) {\n        base = getProto(base);\n        if (base === null) { return false; }\n        permit = whiteTable.get(base);\n        if (permit && hop(permit, name)) {\n          const result = permit[name];\n          if (result === '*') {\n            return result;\n          } else {\n            return false;\n          }\n        }\n      }\n    }\n\n    /**\n     * Removes all non-whitelisted properties found by recursively and\n     * reflectively walking own property chains.\n     *\n     * <p>Inherited properties are not checked, because we require that\n     * inherited-from objects are otherwise reachable by this traversal.\n     */\n    function clean(value, prefix) {\n      if (value !== Object(value)) { return; }\n      if (cleaning.get(value)) { return; }\n\n      const proto = getProto(value);\n      if (proto !== null && !whiteTable.has(proto)) {\n        //reportItemProblem(rootReports, ses.severities.NOT_ISOLATED,\n        //                  'unexpected intrinsic', prefix + '.__proto__');\n        throw new Error(`unexpected intrinsic ${prefix}.__proto__`);\n      }\n\n      cleaning.set(value, true);\n      gopn(value).forEach(function(name) {\n        const path = prefix + (prefix ? '.' : '') + name;\n        const p = getPermit(value, name);\n        if (p) {\n          const desc = gopd(value, name);\n          if (hop(desc, 'value')) {\n            // Is a data property\n            const subValue = desc.value;\n            clean(subValue, path);\n          } else {\n            if (p !== 'maybeAccessor') {\n              // We are not saying that it is safe for the prop to be\n              // unexpectedly an accessor; rather, it will be deleted\n              // and thus made safe.\n              //reportProperty(ses.severities.SAFE_SPEC_VIOLATION,\n              //               'Not a data property', path);\n              delete value[name];\n            } else {\n              clean(desc.get, path + '<getter>');\n              clean(desc.set, path + '<setter>');\n            }\n          }\n        } else {\n          delete value[name];\n        }\n      });\n    }\n\n    addToWhiteTable(global);\n    addToWhiteTable(getAnonIntrinsics());\n    clean(global, '');\n\n  }\n\n  // Copyright (C) 2018 Agoric\n  //\n  // Licensed under the Apache License, Version 2.0 (the \"License\");\n  // you may not use this file except in compliance with the License.\n  // You may obtain a copy of the License at\n  //\n  // http://www.apache.org/licenses/LICENSE-2.0\n  //\n  // Unless required by applicable law or agreed to in writing, software\n  // distributed under the License is distributed on an \"AS IS\" BASIS,\n  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  // See the License for the specific language governing permissions and\n  // limitations under the License.\n\n  function tameDate(global, options) {\n    const unsafeDate = global.Date;\n    // Date(anything) gives a string with the current time\n    // new Date(x) coerces x into a number and then returns a Date\n    // new Date() returns the current time, as a Date object\n    // new Date(undefined) returns a Date object which stringifies to 'Invalid Date'\n\n    function Date(...args) {\n      if (new.target === undefined) {\n        // we were not called as a constructor\n        // this would normally return a string with the current time\n        return 'Invalid Date';\n      }\n      // constructor behavior: if we get arguments, we can safely pass them through\n      if (args.length > 0) {\n        return Reflect.construct(unsafeDate, args, new.target);\n        // todo: make sure our constructor can still be subclassed\n      }\n      // no arguments: return a Date object, but invalid\n      return Reflect.construct(unsafeDate, [NaN], new.target);\n    }\n    Object.defineProperties(Date, Object.getOwnPropertyDescriptors(unsafeDate));\n    // that will copy the .prototype too, so this next line is unnecessary\n    //Date.prototype = unsafeDate.prototype;\n    unsafeDate.prototype.constructor = Date;\n    const dateNowTrap = options.dateNowTrap;\n    if (dateNowTrap === false) ; else {\n      // disable it\n      Date.now = () => NaN;\n    }\n    global.Date = Date;\n  }\n\n  function tameMath(global) {\n    //global.Math.random = () => 4; // https://www.xkcd.com/221\n    global.Math.random = () => NaN;\n  }\n\n  function tameIntl(global) {\n    // todo: somehow fix these. These almost certainly don't enable the reading\n    // of side-channels, but we want things to be deterministic across\n    // runtimes.\n    global.Intl.DateTimeFormat = () => 0;\n    global.Intl.NumberFormat = () => 0;\n    global.Intl.getCanonicalLocales = () => [];\n    global.Object.prototype.toLocaleString = () => {\n      throw new Error('toLocaleString suppressed');\n    };\n  }\n\n  function tameError(global) {\n    Object.defineProperty(global.Error.prototype, \"stack\",\n                          { get() { return 'stack suppressed'; } });\n  }\n\n  function tamePrimordials(global, options) {\n    tameDate(global, options);\n    tameMath(global);\n    tameIntl(global);\n    tameError(global);\n  }\n\n  // Copyright (C) 2018 Agoric\n\n  function def(node) {\n    // TODO HACK return a shallow freeze unless Object.prototype is frozen. \n    // This detects whether we are in a SES realm.\n\n    // TODO: this currently does too much work: it doesn't remember what's been\n    // frozen already, so it will re-freeze things like Function.prototype\n    // every time. To fix this, deepFreeze() needs to be turned into a\n    // \"Freezer\" object that retains a WeakMap of everything it has ever\n    // frozen, this def() function should take a Freezer, and the def() exposed\n    // as a global should close over the Freezer and deliver it here.\n    // deepFreezePrimordials() should use that same Freezer\n\n    if (Object.isFrozen(Object.prototype)) {\n      deepFreeze(node);\n    } else {\n      Object.freeze(node);\n    }\n    return node;\n  }\n\n  // Copyright (C) 2011 Google Inc.\n  // Copyright (C) 2018 Agoric\n  //\n  // Licensed under the Apache License, Version 2.0 (the \"License\");\n  // you may not use this file except in compliance with the License.\n  // You may obtain a copy of the License at\n  //\n  // http://www.apache.org/licenses/LICENSE-2.0\n  //\n  // Unless required by applicable law or agreed to in writing, software\n  // distributed under the License is distributed on an \"AS IS\" BASIS,\n  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  // See the License for the specific language governing permissions and\n  // limitations under the License.\n\n  /**\n   * Is allegenNum a number in the contiguous range of exactly and\n   * unambiguously representable natural numbers (non-negative integers)?\n   *\n   * <p>See <a href=\n   * \"https://code.google.com/p/google-caja/issues/detail?id=1801\"\n   * >Issue 1801: Nat must include at most (2**53)-1</a>\n   * and <a href=\n   * \"https://mail.mozilla.org/pipermail/es-discuss/2013-July/031716.html\"\n   * >Allen Wirfs-Brock's suggested phrasing</a> on es-discuss.\n   */\n  function Nat(allegedNum) {\n    // TODO simplify by using Number.isSafeInteger\n    if (typeof allegedNum !== 'number') {\n      throw new RangeError('not a number');\n    }\n    if (allegedNum !== allegedNum) { throw new RangeError('NaN not natural'); }\n    if (allegedNum < 0)            { throw new RangeError('negative'); }\n    if (allegedNum % 1 !== 0)      { throw new RangeError('not integral'); }\n    if (allegedNum > Number.MAX_SAFE_INTEGER) { throw new RangeError('too big'); }\n    return allegedNum;\n  }\n\n  // Copyright (C) 2018 Agoric\n\n  exports.createSESWithRealmConstructor = createSESWithRealmConstructor;\n  exports.createSESInThisRealm = createSESInThisRealm;\n  exports.deepFreezePrimordials = deepFreezePrimordials;\n  exports.removeProperties = removeProperties;\n  exports.tamePrimordials = tamePrimordials;\n  exports.getAnonIntrinsics = getAnonIntrinsics;\n  exports.def = def;\n  exports.Nat = Nat;\n\n  return exports;\n\n}({}))";

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
    const { initRootRealm, initCompartment, getRealmGlobal, realmEvaluate } = BaseRealm;

    // This Object and Reflect are brand new, from a new unsafeRec, so no user
    // code has been run or had a chance to manipulate them. We extract these
    // properties for brevity, not for security. Don't ever run this function
    // *after* user code has had a chance to pollute its environment, or it
    // could be used to gain access to BaseRealm and primal-realm Error
    // objects.
    const { create, defineProperty } = Object;

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
          eStack = `${err.stack}`;
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

      static makeRootRealm(options) {
        // This is the exposed interface.
        options = Object(options); // todo: sanitize

        // Bypass the constructor.
        const r = create(Realm.prototype);
        callAndWrapError(initRootRealm, unsafeRec, r, options);
        return r;
      }

      static makeCompartment() {
        // Bypass the constructor.
        const r = create(Realm.prototype);
        callAndWrapError(initCompartment, unsafeRec, r);
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

      evaluate(x, endowments) {
        // safe against strange 'this', as above
        return callAndWrapError(realmEvaluate, this, x, endowments);
      }
    }

    defineProperty(Realm, 'toString', {
      value: () => 'function Realm() { [shim code] }',
      writable: false,
      enumerable: false,
      configurable: true
    });

    defineProperty(Realm.prototype, 'toString', {
      value: () => '[object Realm]',
      writable: false,
      enumerable: false,
      configurable: true
    });

    return Realm;
  }

  // The parentheses means we don't bind the 'buildChildRealm' name inside the
  // child's namespace. this would accept an anonymous function declaration.
  // function expression (not a declaration) so it has a completion value.
  const buildChildRealmString = cleanupSource(`'use strict'; (${buildChildRealm})`);

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
    defineProperties,
    defineProperty,
    freeze,
    getOwnPropertyDescriptor,
    getOwnPropertyDescriptors,
    getOwnPropertyNames,
    getPrototypeOf,
    setPrototypeOf
  } = Object;

  const {
    apply,
    ownKeys // Reflect.ownKeys includes Symbols and unenumerables, unlike Object.keys()
  } = Reflect;

  /**
   * uncurryThis()
   * See http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
   * which only lives at http://web.archive.org/web/20160805225710/http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
   *
   * Performance:
   * 1. The native call is about 10x faster on FF than chrome
   * 2. The version using Function.bind() is about 100x slower on FF, equal on chrome, 2x slower on Safari
   * 3. The version using a spread and Reflect.apply() is about 10x slower on FF, equal on chrome, 2x slower on Safari
   *
   * const bind = Function.prototype.bind;
   * const uncurryThis = bind.bind(bind.call);
   */
  const uncurryThis = fn => (thisArg, ...args) => apply(fn, thisArg, args);

  // We also capture these for security: changes to Array.prototype after the
  // Realm shim runs shouldn't affect subsequent Realm operations.
  const objectHasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty),
    arrayFilter = uncurryThis(Array.prototype.filter),
    arrayPop = uncurryThis(Array.prototype.pop),
    arrayJoin = uncurryThis(Array.prototype.join),
    arrayConcat = uncurryThis(Array.prototype.concat),
    regexpTest = uncurryThis(RegExp.prototype.test),
    stringIncludes = uncurryThis(String.prototype.includes);

  // All the following stdlib items have the same name on both our intrinsics
  // object and on the global object. Unlike Infinity/NaN/undefined, these
  // should all be writable and configurable.
  const sharedGlobalPropertyNames = [
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
    'Date',
    'Error',
    'EvalError',
    'Float32Array',
    'Float64Array',
    // 'Function', // comes from safeFunction instead
    'Int8Array',
    'Int16Array',
    'Int32Array',
    'Map',
    'Number',
    'Object',
    'Promise',
    'Proxy',
    'RangeError',
    'ReferenceError',
    'RegExp',
    'Set',
    // 'SharedArrayBuffer' // removed on Jan 5, 2018
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
    'unescape',

    // *** ECMA-402

    'Intl'

    // *** ESNext

    // 'Realm' // Comes from createRealmGlobalObject()
  ];

  function getSharedGlobalDescs(unsafeGlobal) {
    const descriptors = {
      // *** 18.1 Value Properties of the Global Object
      Infinity: { value: Infinity },
      NaN: { value: NaN },
      undefined: { value: undefined }
    };

    for (const name of sharedGlobalPropertyNames) {
      const desc = getOwnPropertyDescriptor(unsafeGlobal, name);
      if (desc) {
        // Abort if an accessor is found on the unsafe global object instead of a
        // data property. We should never get into this non standard situation.
        assert('value' in desc, `unexpected accessor on global property: ${name}`);

        descriptors[name] = {
          value: desc.value,
          writable: true,
          configurable: true
        };
      }
    }

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
   * the function to have no dependencies, so don't import anything from the outside.
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

    // On some platforms, the implementation of these functions act as if they are
    // in sloppy mode: if they're invoked badly, they will expose the global object,
    // so we need to repair these for security. Thus it is our responsibility to fix
    // this, and we need to include repairAccessors. E.g. Chrome in 2016.

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
    const { defineProperty, getPrototypeOf, setPrototypeOf } = Object;

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
          // Prevent failure on platforms where async and/or generators are not supported.
          return;
        }
        // Re-throw
        throw e;
      }
      const FunctionPrototype = getPrototypeOf(FunctionInstance);

      // Prevents the evaluation of source when calling constructor on the prototype of functions.
      // eslint-disable-next-line no-new-func
      const TamedFunction = Function('throw new TypeError("Not available");');
      defineProperty(TamedFunction, 'name', { value: name });

      // (new Error()).constructors does not inherit from Function, because Error
      // was defined before ES6 classes. So we don't need to repair it too.

      // (Error()).constructor inherit from Function, which gets a tamed constructor here.

      // todo: in an ES6 class that does not inherit from anything, what does its
      // constructor inherit from? We worry that it inherits from Function, in
      // which case instances could give access to unsafeFunction. markm says
      // we're fine: the constructor inherits from Object.prototype

      // This line replaces the original constructor in the prototype chain
      // with the tamed one. No copy of the original is peserved.
      defineProperty(FunctionPrototype, 'constructor', { value: TamedFunction });

      // This line sets the tamed constructor's prototype data property to
      // the original one.
      defineProperty(TamedFunction, 'prototype', { value: FunctionPrototype });

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

  // Platform detection.
  let isNode = typeof exports === 'object' && typeof module !== 'undefined';
  const isBrowser = typeof document === 'object';
  if (isBrowser) isNode = false
  if ((!isNode && !isBrowser) || (isNode && isBrowser)) {
    throw new Error('unexpected platform, unable to create Realm');
  }
  const vm = isNode ? require('vm') : undefined;

  // note: in a node module, the top-level 'this' is not the global object
  // (it's *something* but we aren't sure what), however an indirect eval of
  // 'this' will be the correct global object.

  const unsafeGlobalSrc = "'use strict'; this";
  const unsafeGlobalEvalSrc = `(0, eval)("'use strict'; this")`;

  // This method is only exported for testing purposes.
  function createNewUnsafeGlobalForNode() {
    // Use unsafeGlobalEvalSrc to ensure we get the right 'this'.
    const unsafeGlobal = vm.runInNewContext(unsafeGlobalEvalSrc);

    return unsafeGlobal;
  }

  // This method is only exported for testing purposes.
  function createNewUnsafeGlobalForBrowser() {
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

  const getNewUnsafeGlobal = isNode ? createNewUnsafeGlobalForNode : createNewUnsafeGlobalForBrowser;

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

  const repairAccessorsShim = cleanupSource(`"use strict"; (${repairAccessors})();`);
  const repairFunctionsShim = cleanupSource(`"use strict"; (${repairFunctions})();`);

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
      if (name === 'eval' || keywords.has(name) || !regexpTest(identifierPattern, name)) {
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
  function createScopeHandler(unsafeRec) {
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

        // todo (optimization): keep a reference to the shadow avoids calling
        // getPrototypeOf on the target every time the set trap is invoked,
        // since safeGlobal === getPrototypeOf(target).
        getPrototypeOf(target)[prop] = value;

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

        // unsafeGlobal: hide all properties of unsafeGlobal at the expense of 'typeof'
        // being wrong for those properties. For example, in the browser, evaluating
        // 'document = 3', will add a property to  safeGlobal instead of throwing a
        // ReferenceError.
        if (prop === 'eval' || prop in target || prop in unsafeGlobal) {
          return true;
        }

        return false;
      }
    };
  }

  // this \s *must* match all kinds of syntax-defined whitespace. If e.g.
  // U+2028 (LINE SEPARATOR) or U+2029 (PARAGRAPH SEPARATOR) is treated as
  // whitespace by the parser, but not matched by /\s/, then this would admit
  // an attack like: import\u2028('power.js') . We're trying to distinguish
  // something like that from something like importnotreally('power.js') which
  // is perfectly safe.

  const importParser = /^(.*)\bimport\s*(\(|\/\/|\/\*)/m;

  function rejectImportExpressions(s) {
    const matches = importParser.exec(s);
    if (matches) {
      // todo: if we have a full parser available, use it here. If there is no
      // 'import' token in the string, we're safe.
      // if (!parse(s).contains('import')) return;
      const linenum = matches[1].split('\n').length; // more or less
      throw new SyntaxError(`possible import expression rejected around line ${linenum}`);
    }
  }

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
    //    b) its 'this' is the this binding seen by the code being directly evaluated.

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

  function createSafeEvaluatorFactory(unsafeRec, safeGlobal) {
    const { unsafeFunction } = unsafeRec;

    const scopeHandler = createScopeHandler(unsafeRec);
    const optimizableGlobals = getOptimizableGlobals(safeGlobal);
    const scopedEvaluatorFactory = createScopedEvaluatorFactory(unsafeRec, optimizableGlobals);

    function factory(endowments = {}) {
      // todo (shim limitation): scan endowments, throw error if endowment
      // overlaps with the const optimization (which would otherwise
      // incorrectly shadow endowments), or if endowments includes 'eval'. Also
      // prohibit accessor properties (to be able to consistently explain
      // things in terms of shimming the global lexical scope).
      // writeable-vs-nonwritable == let-vs-const, but there's no
      // global-lexical-scope equivalent of an accessor, outside what we can
      // explain/spec
      const scopeTarget = create(safeGlobal, getOwnPropertyDescriptors(endowments));
      const scopeProxy = new Proxy(scopeTarget, scopeHandler);
      const scopedEvaluator = apply(scopedEvaluatorFactory, safeGlobal, [scopeProxy]);

      // We use the the concise method syntax to create an eval without a
      // [[Construct]] behavior (such that the invocation "new eval()" throws
      // TypeError: eval is not a constructor"), but which still accepts a
      // 'this' binding.
      const safeEval = {
        eval(src) {
          src = `${src}`;
          rejectImportExpressions(src);
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
      assert(getPrototypeOf(safeEval).constructor !== unsafeFunction, 'hide unsafeFunction');

      // note: be careful to not leak our primal Function.prototype by setting
      // this to a plain arrow function. Now that we have safeEval, use it.
      defineProperty(safeEval, 'toString', {
        value: safeEval("() => 'function eval() { [shim code] }'"),
        writable: false,
        enumerable: false,
        configurable: true
      });

      return safeEval;
    }

    return factory;
  }

  function createSafeEvaluator(safeEvaluatorFactory) {
    return safeEvaluatorFactory();
  }

  function createSafeEvaluatorWhichTakesEndowments(safeEvaluatorFactory) {
    return (x, endowments) => safeEvaluatorFactory(endowments)(x);
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

        // note: v8 throws just like this does, but chrome accepts e.g. 'a = new Date()'
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

      // todo: fix `this` binding in Function().
      const src = `(function(${functionParams}){\n${functionBody}\n})`;

      return safeEval(src);
    };

    // Ensure that Function from any compartment in a root realm can be used
    // with instance checks in any compartment of the same root realm.
    setPrototypeOf(safeFunction, unsafeFunction.prototype);

    assert(getPrototypeOf(safeFunction).constructor !== Function, 'hide Function');
    assert(getPrototypeOf(safeFunction).constructor !== unsafeFunction, 'hide unsafeFunction');

    // Ensure that any function created in any compartment in a root realm is an
    // instance of Function in any compartment of the same root ralm.
    defineProperty(safeFunction, 'prototype', { value: unsafeFunction.prototype });

    // Provide a custom output without overwriting the Function.prototype.toString
    // which is called by some third-party libraries.
    defineProperty(safeFunction, 'toString', {
      value: safeEval("() => 'function Function() { [shim code] }'"),
      writable: false,
      enumerable: false,
      configurable: true
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
    assert(!RealmRecForRealmInstance.has(realm), 'Realm instance already has a record');

    RealmRecForRealmInstance.set(realm, realmRec);
  }

  // Initialize the global variables for the new Realm.
  function setDefaultBindings(sharedGlobalDescs, safeGlobal, safeEval, safeFunction) {
    defineProperties(safeGlobal, sharedGlobalDescs);

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

  function createRealmRec(unsafeRec) {
    const { sharedGlobalDescs, unsafeGlobal } = unsafeRec;

    const safeGlobal = create(unsafeGlobal.Object.prototype);
    const safeEvaluatorFactory = createSafeEvaluatorFactory(unsafeRec, safeGlobal);
    const safeEval = createSafeEvaluator(safeEvaluatorFactory);
    const safeEvalWhichTakesEndowments = createSafeEvaluatorWhichTakesEndowments(
      safeEvaluatorFactory
    );
    const safeFunction = createFunctionEvaluator(unsafeRec, safeEval);

    setDefaultBindings(sharedGlobalDescs, safeGlobal, safeEval, safeFunction);

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
    const { shims: newShims } = options;
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
    const realmRec = createRealmRec(unsafeRec);

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
  function initCompartment(unsafeRec, self) {
    // note: 'self' is the instance of the Realm.

    const realmRec = createRealmRec(unsafeRec);

    // The realmRec acts as a private field on the realm instance.
    registerRealmRecForRealmInstance(self, realmRec);
  }

  function getRealmGlobal(self) {
    const { safeGlobal } = getRealmRecForRealmInstance(self);
    return safeGlobal;
  }

  function realmEvaluate(self, x, endowments = {}) {
    // todo: don't pass in primal-realm objects like {}, for safety. OTOH its
    // properties are copied onto the new global 'target'.
    // todo: figure out a way to membrane away the contents to safety.
    const { safeEvalWhichTakesEndowments } = getRealmRecForRealmInstance(self);
    return safeEvalWhichTakesEndowments(x, endowments);
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
  const Realm$1 = buildChildRealm(currentUnsafeRec, BaseRealm);

  // Copyright (C) 2018 Agoric

  const SES = createSESWithRealmConstructor(creatorStrings, Realm$1);

  // Copyright (C) 2018 Agoric

  // f = compileExpr(source); then f(imports) can only affect 'imports'
  //exports.compileExpr = function(exprSrc, opt_mitigateOpts) { };


  /*
  exports.makeRootSESRealm = function() {
    const r = new Realm({
      // wishlist: if set, dateNowTrap is used for 'Date.now()' and 'new
      // Date()' inside the Realm it should return a number just like
      // Date.now(). The behavior of dateNowTrap and randTrap must be inherited
      // by all child Realms, whether constructed with {intrinsics: 'inherit'}
      // or not. The new Realm will have new identities for the Date
      // constructor and Math.random even though their behavior delegates.

      //dateNowTrap() {throw TypeError("nondeterministic");},

      // wishlist: if set, randTrap is used for 'Math.random()', and should
      // either 1: always return a float or 2: always throw

      //randTrap() {throw TypeError("nondeterministic");}
    });
    r.evaluate(prepareSESRealm_js)(r.global); //populate r
    r.spawn = r.global.ses.spawn;
    r.confine = r.global.ses.confine;

    tamperProofDataProperties(r.intrinsics);
    deepFreeze(r.global);
    return r;
  }
  */

  exports.default = SES;
  exports.def = def;
  exports.Nat = Nat;
  exports.SES = SES;

  return exports;

}({}));
//# sourceMappingURL=ses-shim.js.map
