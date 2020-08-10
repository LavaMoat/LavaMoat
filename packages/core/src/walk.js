// specifier = exact unique module name
// requestedName = what a module asks to import

module.exports = { walk }

async function walk ({
  moduleSpecifier,
  resolveHook,
  importHook,
  visitorFn,
  shouldImport = () => true,
  visitedSpecifiers = new Set()
}) {
  // walk next record
  const moduleRecord = await importHook(moduleSpecifier)
  visitorFn(moduleRecord)

  // walk children
  await Promise.all(Object.values(moduleRecord.importMap).map(async (childSpecifier) => {
    if (!shouldImport(childSpecifier, moduleSpecifier)) return
    // dont revisit specifiers
    if (visitedSpecifiers.has(childSpecifier)) return
    visitedSpecifiers.add(childSpecifier)
    // continue walking child
    await walk({
      moduleSpecifier: childSpecifier,
      resolveHook,
      importHook,
      visitorFn,
      shouldImport,
      visitedSpecifiers
    })
  }))
}
