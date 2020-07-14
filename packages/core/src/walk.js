// specifier = exact unique module name
// requestedName = what a module asks to import

module.exports = { walk }

async function walk ({
  moduleSpecifier,
  resolveHook,
  importHook,
  visitorFn,
  shouldResolve = () => true,
  shouldImport = () => true,
  visitedSpecifiers = new Set()
}) {
  // walk next record
  const moduleRecord = await importHook(moduleSpecifier)
  visitorFn(moduleRecord)

  // walk children
  await Promise.all(moduleRecord.imports.map(async (requestedName) => {
    if (!shouldResolve(requestedName, moduleSpecifier)) return
    const childSpecifier = resolveHook(requestedName, moduleSpecifier)
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
      shouldResolve,
      shouldImport,
      visitedSpecifiers
    })
  }))
}
