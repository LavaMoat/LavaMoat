const { getPackageNameForModulePath } = require('@lavamoat/aa')
const diag = require('./diagnostics')

const ROOT_IDENTIFIER = '$root$'

/**
 * Looks up a value in a haystack object based on the given needle.
 *
 * @template {string | number} T
 * @param {T} needle - The value to look for.
 * @param {Record<T, any>} haystack - The object to search in.
 * @returns {any} - The value found in the haystack, or undefined if not found.
 */
const lookUp = (needle, haystack) => {
  const value = haystack[needle]
  if (value === undefined) {
    // TODO: remove this or replace with a better integrated warning
    // When using the resolve-related hooks for finding out paths we'd get paths not included in the bundle trigger this case. Now it should not happen unless policy is incomplete.
    // This needs more observation/investigation
    console.trace(`Cannot find a match for ${needle} in policy`)
    // console.log(haystack);
  }
  return value
}

/**
 * @param {Set<string>} neededIds
 * @param {string[]} policyIds
 */
const crossReference = (neededIds, policyIds) => {
  // Policy generator skips packages that don't use anything, so it's ok for policy to be missing.
  // This is only for debugging

  /** @type {string[]} */
  const missingIds = []
  neededIds.forEach((id) => {
    if (!policyIds.includes(id)) {
      missingIds.push(id)
    }
  })
  diag.rawDebug(4, { missingIds, policyIds, neededIds })
  if (missingIds.length > 0) {
    diag.rawDebug(
      1,
      `Policy is missing the following resources: ${missingIds.join(', ')}`
    )
  }
}

/**
 * @typedef {Object} IdentifierLookup
 * @property {string} root
 * @property {(string | number)[]} unenforceableModuleIds
 * @property {Record<string | number, string>} externals
 * @property {[string, (string | number)[]][]} identifiersForModuleIds
 * @property {(path: string) => string | undefined} pathToResourceId
 * @property {(id: string) => string} policyIdentifierToResourceId
 * @property {() => object} getTranslatedPolicy
 */

/**
 * @param {object} options
 * @param {{ path: string; moduleId: string | number }[]} options.paths
 * @param {import('@lavamoat/types').LavaMoatPolicy} options.policy
 * @param {import('@lavamoat/aa').CanonicalNameMap} options.canonicalNameMap
 * @param {(string | number)[]} options.unenforceableModuleIds
 * @param {Record<string | number, string>} options.externals
 * @param {boolean | undefined} options.readableResourceIds
 * @returns {IdentifierLookup}
 */
exports.generateIdentifierLookup = ({
  paths,
  policy,
  canonicalNameMap,
  unenforceableModuleIds,
  externals,
  readableResourceIds,
}) => {
  /**
   * @typedef {Record<string, { aa: string; moduleId: number | string }>} PathMapping
   */
  const pathsToIdentifiers = () => {
    /** @type {PathMapping} */
    const mapping = {}
    for (const p of paths) {
      if (p.path) {
        mapping[p.path] = {
          aa: getPackageNameForModulePath(canonicalNameMap, p.path),
          moduleId: p.moduleId,
        }
      }
    }
    return mapping
  }

  const usedIdentifiers = Object.keys(policy.resources || {})
  usedIdentifiers.unshift(ROOT_IDENTIFIER)
  const usedIdentifiersIndex = Object.fromEntries(
    usedIdentifiers.map((id, index) => [id, index])
  )
  /**
   * @type {(i: string) => string}
   */
  let translate
  if (readableResourceIds) {
    translate = (i) => i
  } else {
    // Why is this a string? There was way too much confusion involved when it was not. If the 2 extra characters are ever worth the hassle, feel free to change it back to numbers.
    translate = (i) => `${usedIdentifiersIndex[i]}`
  }

  // TODO: consider taking the list of paths used by webpack and running the entire AA algorithm only on that instead of relying on AA running through everything first.
  // It might give us identifiers that are more stable and would surely be much faster.

  const pathLookup = pathsToIdentifiers()
  const identifiersWithKnownPaths = new Set(
    Object.values(pathLookup).map((pl) => pl.aa)
  )

  crossReference(identifiersWithKnownPaths, usedIdentifiers)

  const identifiersForModuleIds = Object.entries(
    Object.entries(pathLookup).reduce((acc, [, { aa, moduleId }]) => {
      const key = translate(aa)
      if (acc[key] === undefined) {
        acc[key] = []
      }
      acc[key].push(moduleId)
      return acc
    }, /** @type {Record<string, (string | number)[]>} */ ({}))
  )

  /**
   * TODO: use real policy type here
   *
   * @param {any} resource
   * @returns
   */
  const translateResource = (resource) => ({
    ...resource,
    packages:
      resource.packages &&
      Object.fromEntries(
        Object.entries(resource.packages).map(([id, value]) => [
          translate(id),
          value,
        ])
      ),
  })

  return {
    root: translate(ROOT_IDENTIFIER),
    unenforceableModuleIds,
    externals,
    identifiersForModuleIds,
    pathToResourceId: (path) => {
      const pathInfo = lookUp(path, pathLookup)
      if (!pathInfo) {
        return undefined
      }
      return translate(pathInfo.aa)
    },
    policyIdentifierToResourceId: (id) => translate(id),
    getTranslatedPolicy: () => {
      if (readableResourceIds) {
        return policy
      }
      const { resources = Object.create(null) } = policy
      const translatedPolicy = {
        ...policy,
        resources: Object.fromEntries(
          Object.entries(resources)
            .filter(([id]) => identifiersWithKnownPaths.has(id)) // only saves resources that are actually used
            .map(([id, resource]) => [
              translate(id),
              translateResource(resource),
            ])
        ),
      }
      return translatedPolicy
    },
  }
}
