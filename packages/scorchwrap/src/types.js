/**
 * @typedef {Object} Policy
 * @property {Record<string,object>} resources
 */

/**
 * @typedef {Object} ScorchWrapPluginOptions
 * @property {boolean} [runChecks] - check resulting code with wrapping for correctness
 * @property {boolean} [readableResourceIds] - should resourceIds be readable or turned into numbers - defaults to (mode==='development')
 * @property {number} [diagnosticsVerbosity] - a number representing diagnostics output verbosity, the larger the more overwhelming
 * @property {Object} policy - LavaMoat policy
 * @property {Object} [lockdown] - options to pass to lockdown
 */

/**
 * @typedef {Object} RuntimeNamespace
 * @property {string} root - key used to indicate the root resource
 * @property {Array<[string, string[]]>} idmap - mapping from resourceIds to moduleIds
 * @property {string[]} unenforceable - List of module ids that are impossible to handle for import policy enforcement
 * @property {ScorchWrapPluginOptions} options - plugin options
 * @property {Policy} policy - LavaMoat policy
 * @property {Record<string, string>} ENUM - short names for items to minimize bundle size withotu losing readability
 * @property {function} defaultExport - the function that will be surfaced to the wrapper as `__webpack_require__._LM_`
 */
