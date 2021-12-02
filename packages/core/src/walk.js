// specifier = exact unique module name
// requestedName = what a module asks to import

module.exports = { walk, eachNodeInTree }

/**
 * @function walk
 * @param {object} options
 * @param {string} options.moduleSpecifier
 * @param {function} options.importHook
 * @param {function} options.visitorFn
 * @param {function} options.shouldImport
 * @param {Set<string>} options.visitedSpecifiers
 */
async function walk ({
  moduleSpecifier,
  importHook,
  visitorFn,
  shouldImport,
  visitedSpecifiers
}) {
  for await (const moduleRecord of eachNodeInTree({
    moduleSpecifier,
    importHook,
    shouldImport,
    visitedSpecifiers
  })) {
    // walk next record
    visitorFn(moduleRecord)
  }
}

/**
 * @function eachNodeInTree
 * @param {object} options
 * @param {string} options.moduleSpecifier,
 * @param {function} options.importHook,
 * @param {bool} options.shouldImport,
 * @param {Set<string>} options.visitedSpecifiers
 * @returns {AsyncIterableIterator<ModuleRecord>}
 */
async function * eachNodeInTree ({
  moduleSpecifier,
  importHook,
  shouldImport = () => true,
  visitedSpecifiers = new Set()
}) {
  // walk next record
  const moduleRecord = await importHook(moduleSpecifier)
  yield moduleRecord

  // walk children
  for (const childSpecifier of Object.values(moduleRecord.importMap)) {
    // skip children that are set to null (resolution was skipped)
    if (childSpecifier === null) continue
    // skip modules we're told not to import
    if (!shouldImport(childSpecifier, moduleSpecifier)) continue
    // dont revisit specifiers
    if (visitedSpecifiers.has(childSpecifier)) continue
    visitedSpecifiers.add(childSpecifier)
    // continue walking child
    yield* eachNodeInTree({
      moduleSpecifier: childSpecifier,
      importHook,
      shouldImport,
      visitedSpecifiers
    })
  }
}
