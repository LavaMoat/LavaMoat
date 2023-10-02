/**
 * @typedef {Object} Policy
 * @property {Record<string,object>} resources
 */

/**
 * @typedef {Object} LavaMoatPluginOptions
 * @property {boolean} [runChecks] - check resulting code with wrapping for correctness
 * @property {boolean} [readableResourceIds] - should resourceIds be readable or turned into numbers - defaults to (mode==='development')
 * @property {number} [diagnosticsVerbosity] - a number representing diagnostics output verbosity, the larger the more overwhelming
 * @property {Object} policy - LavaMoat policy
 * @property {Object} [lockdown] - options to pass to lockdown
 */

/**
 * @typedef {function} GetEndowmentsForConfig Creates an object populated with only the deep properties specified in the packagePolicy
 * @param {object} sourceRef - Object from which to copy properties
 * @param {object} packagePolicy - LavaMoat policy item representing a package
 * @param {object} unwrapTo - For getters and setters, when the this-value is unwrapFrom, is replaced as unwrapTo
 * @param {object} unwrapFrom - For getters and setters, the this-value to replace (default: targetRef)
 * @return {object} - The targetRef
 *
 */

/**
 * @typedef {Object} EndowmentsToolkit
 * @property {GetEndowmentsForConfig} getEndowmentsForConfig
 * @property {Function} makeMinimalViewOfRef - Creates a minimal view of a reference (e.g. a global) that only exposes the properties specified in the packagePolicy
 * @property {Function} copyValueAtPath - Copies a value at a specific path from the source reference to the target reference
 * @property {Function} applyGetSetPropDescTransforms 
 * @property {Function} applyEndowmentPropDescTransforms 
 * @property {Function} copyWrappedGlobals - Copies wrapped globals from a global reference to a target object with wrapping
 * @property {Function} createFunctionWrapper - conditionally binds a function - used to ensure functions (like fetch) get called on the this they expect
 */

/**
 * @typedef {function} EndowmentsToolkitFactory
 * @returns {EndowmentsToolkit}
 */

/**
 * @typedef {Object} RuntimeNamespace
 * @property {string} root - key used to indicate the root resource
 * @property {Array<[string, string[]]>} idmap - mapping from resourceIds to moduleIds
 * @property {string[]} unenforceable - List of module ids that are impossible to handle for import policy enforcement
 * @property {LavaMoatPluginOptions} options - plugin options
 * @property {Policy} policy - LavaMoat policy
 * @property {Record<string, string>} ENUM - short names for items to minimize bundle size withotu losing readability
 * @property {EndowmentsToolkitFactory} endowmentsToolkit - a function that returns endowmentsToolkit
 * @property {function} defaultExport - the function that will be surfaced to the wrapper as `__webpack_require__._LM_`
 */
