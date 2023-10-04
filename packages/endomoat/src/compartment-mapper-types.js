/**
 * An object representing a full attenuation definition.
 * @typedef {object} FullAttenuationDefinition
 * @property {string} attenuate - The type of attenuation.
 * @property {ImplicitAttenuationDefinition} params - The parameters for the attenuation.
 */

/**
 * An array of any type representing an implicit attenuation definition.
 * @typedef {[any, ...any[]]} ImplicitAttenuationDefinition
 */

/**
 * A type representing an attenuation definition, which can be either a full or implicit definition.
 * @typedef {FullAttenuationDefinition | ImplicitAttenuationDefinition} AttenuationDefinition
 */

/**
 * @typedef {object} UnifiedAttenuationDefinition
 * @property {string} displayName
 * @property {string | null} specifier
 * @property {Array<any>} [params]
 */

/**
 * @template {[any, ...any[]]} [GlobalParams=[any, ...any[]]]
 * @template {[any, ...any[]]} [ModuleParams=[any, ...any[]]]
 * @typedef Attenuator
 * @property {GlobalAttenuatorFn<GlobalParams>} [attenuateGlobals]
 * @property {ModuleAttenuatorFn<ModuleParams>} [attenuateModule]
 */

/**
 * @template {[any, ...any[]]} [Params=[any, ...any[]]]
 * @callback GlobalAttenuatorFn
 * @param {Params} params
 * @param {Record<PropertyKey, any>} originalObject
 * @param {Record<PropertyKey, any>} globalThis
 * @returns {void}
 * @todo Unsure if we can do much typing of `originalObject` and `globalThis` here.
 */

/**
 * @template {[any, ...any[]]} [Params=[any, ...any[]]]
 * @template [T=unknown]
 * @template [U=T]
 * @callback ModuleAttenuatorFn
 * @param {Params} params
 * @param {T} ns
 * @returns {U}
 */

/**
 * @typedef {object} DeferredAttenuatorsProvider
 * @property {(attenuatorSpecifier: string|null) => Promise<Attenuator>} import
 */

/**
 * A type representing a wildcard policy, which can be 'any'.
 * @typedef {'any'} WildcardPolicy
 */

/**
 * A type representing a property policy, which is a record of string keys and boolean values.
 * @typedef {Record<string, boolean>} PropertyPolicy
 */

/**
 * A type representing a policy item, which can be a {@link WildcardPolicy wildcard policy}, a property policy, `undefined`, or defined by an attenuator
 * @template [T=void]
 * @typedef {WildcardPolicy|PropertyPolicy|T} PolicyItem
 */

/**
 * An object representing a nested attenuation definition.
 * @typedef {Record<string, AttenuationDefinition | boolean>} NestedAttenuationDefinition
 */

/**
 * An object representing a base package policy.
 * @template [PackagePolicyItem=void]
 * @template [GlobalsPolicyItem=void]
 * @template [BuiltinsPolicyItem=void]
 * @typedef {object} PackagePolicy
 * @property {string} [defaultAttenuator] - The default attenuator.
 * @property {PolicyItem<PackagePolicyItem>} [packages] - The policy item for packages.
 * @property {PolicyItem<GlobalsPolicyItem>|AttenuationDefinition} [globals] - The policy item or full attenuation definition for globals.
 * @property {PolicyItem<BuiltinsPolicyItem>|NestedAttenuationDefinition} [builtins] - The policy item or nested attenuation definition for builtins.
 * @property {boolean} [noGlobalFreeze] - Whether to disable global freeze.
 */

/**
 * An object representing a base policy.
 * @template [PackagePolicyItem=void]
 * @template [GlobalsPolicyItem=void]
 * @template [BuiltinsPolicyItem=void]
 * @typedef {object} Policy
 * @property {Record<string, PackagePolicy<PackagePolicyItem, GlobalsPolicyItem, BuiltinsPolicyItem>>} resources - The package policies for the resources.
 * @property {string} [defaultAttenuator] - The default attenuator.
 * @property {PackagePolicy<PackagePolicyItem, GlobalsPolicyItem, BuiltinsPolicyItem>} [entry] - The package policy for the entry.
 */
