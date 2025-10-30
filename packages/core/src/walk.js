// @ts-check

// specifier = exact unique module name
// requestedName = what a module asks to import

module.exports = { walk, eachNodeInTree }

/**
 * @import {LavamoatModuleRecord} from '@lavamoat/types'
 * @import {ImportHookFn, ShouldImportFn} from './parseForPolicy'
 */

/**
 * @callback VisitorFn
 * @param {LavamoatModuleRecord} moduleRecord
 * @returns {void}
 */

/**
 * @param {object} options
 * @param {string} options.moduleSpecifier
 * @param {ImportHookFn} options.importHook
 * @param {VisitorFn} options.visitorFn
 * @param {ShouldImportFn} options.shouldImport
 * @param {Set<string>} [options.visitedSpecifiers]
 */
async function walk({
  moduleSpecifier,
  importHook,
  visitorFn,
  shouldImport,
  visitedSpecifiers,
}) {
  for await (const moduleRecord of eachNodeInTree({
    moduleSpecifier,
    importHook,
    shouldImport,
    visitedSpecifiers,
  })) {
    // walk next record
    visitorFn(moduleRecord)
  }
}

/**
 * @param {object} options
 * @param {string} options.moduleSpecifier
 * @param {ImportHookFn} options.importHook
 * @param {ShouldImportFn} [options.shouldImport]
 * @param {Set<string>} [options.visitedSpecifiers]
 * @returns {AsyncIterableIterator<LavamoatModuleRecord>}
 */
// NOTE: i think this is depth first in a way that doesnt take advantage of concurrency
async function* eachNodeInTree({
  moduleSpecifier,
  importHook,
  shouldImport = () => true,
  visitedSpecifiers = new Set(),
}) {
  // walk next record
  const moduleRecord = await importHook(moduleSpecifier)
  if (moduleRecord === undefined) {
    return
  }
  yield moduleRecord

  // walk children specified in importMap and policyOverride
  const importMapChildren = Object.values(moduleRecord.importMap ?? {})
  for (const childSpecifier of importMapChildren) {
    // skip children that are set to null (resolution was skipped)
    if (childSpecifier === null) {
      continue
    }
    // skip modules we're told not to import
    if (!shouldImport(childSpecifier, moduleSpecifier)) {
      continue
    }
    // dont revisit specifiers
    if (visitedSpecifiers.has(childSpecifier)) {
      continue
    }
    visitedSpecifiers.add(childSpecifier)
    // continue walking child
    yield* eachNodeInTree({
      moduleSpecifier: childSpecifier,
      importHook,
      shouldImport,
      visitedSpecifiers,
    })
  }
}
