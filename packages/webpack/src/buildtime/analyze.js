/**
 * Bundle-analysis report generator.
 *
 * Walks the sealed compilation graph and produces a JSON-serialisable object
 * describing entries, chunks, runtime chunks, layers and modules. Modules are
 * additionally decorated with LavaMoat-specific info sourced from the plugin's
 * runtime state (canonical name, policy status, unenforceable / context
 * flags).
 *
 * This module exports pure data producers only. Emitting assets is the caller's
 * responsibility (see plugin.js).
 *
 * @module
 */

const ANALYSIS_DIR = 'lavamoat-analyzer'
const ANALYSIS_JSON_FILENAME = 'lavamoat-webpack-analysis.json'
const ANALYSIS_HTML_FILENAME = 'index.html'

/**
 * @typedef {Object} ReportDecoration
 * @property {import('@lavamoat/aa').CanonicalNameMap} [canonicalNameMap]
 *   Reserved for future use; not consumed in this pass.
 * @property {ReadonlyArray<[string, ReadonlyArray<string | number>]>} [identifiersForModuleIds]
 *   From `identifierLookup.identifiersForModuleIds`: tuples of `[canonicalName,
 *   moduleIds]`. Inverted to look up a module's canonical name from its id.
 * @property {ReadonlyArray<string | number>} [unenforceableModuleIds]
 * @property {ReadonlyArray<string | number>} [contextModuleIds]
 * @property {import('@lavamoat/types').LavaMoatPolicy} [runtimeOptimizedPolicy]
 */

/**
 * @param {import('webpack').Chunk['runtime']} runtime
 * @returns {string[]}
 */
function normalizeRuntime(runtime) {
  if (runtime === undefined) {
    return []
  }
  if (typeof runtime === 'string') {
    return [runtime]
  }
  return Array.from(runtime)
}

/**
 * @param {import('webpack').Module} module
 * @param {import('webpack').ChunkGraph} chunkGraph
 * @returns {string}
 */
function resolveModuleId(module, chunkGraph) {
  const id = chunkGraph.getModuleId(module)
  if (id !== null && id !== undefined && id !== '') {
    return String(id)
  }
  return `INNER_${module.identifier()}`
}

/**
 * @param {import('webpack').Compilation} compilation
 * @param {import('webpack').ChunkGraph} chunkGraph
 * @param {Set<string | number>} entryChunkIds Populated as a side effect.
 */
function collectEntries(compilation, chunkGraph, entryChunkIds) {
  const entries = []
  for (const [name, entrypoint] of compilation.entrypoints) {
    const chunkIds = entrypoint.chunks.map((chunk) => chunk.id)
    for (const id of chunkIds) {
      if (id !== null && id !== undefined) {
        entryChunkIds.add(id)
      }
    }
    const runtimeChunk = entrypoint.getRuntimeChunk()
    const entryModules = []
    const entryChunk = entrypoint.getEntrypointChunk()
    if (entryChunk) {
      for (const mod of chunkGraph.getChunkEntryModulesIterable(entryChunk)) {
        entryModules.push(resolveModuleId(mod, chunkGraph))
      }
    }
    entries.push({
      name,
      chunks: chunkIds,
      runtimeChunk: runtimeChunk ? runtimeChunk.id : null,
      entryModules,
    })
  }
  return entries
}

/**
 * @param {import('webpack').Compilation} compilation
 * @param {Set<string | number>} entryChunkIds
 */
function collectChunks(compilation, entryChunkIds) {
  const chunks = []
  for (const chunk of compilation.chunks) {
    chunks.push({
      id: chunk.id,
      name: chunk.name,
      ids: chunk.ids,
      files: Array.from(chunk.files),
      runtime: normalizeRuntime(chunk.runtime),
      hasRuntime: chunk.hasRuntime(),
      isOnlyInitial: chunk.isOnlyInitial(),
      isEntry:
        chunk.id !== null &&
        chunk.id !== undefined &&
        entryChunkIds.has(chunk.id),
    })
  }
  return chunks
}

/**
 * @param {import('webpack').Compilation} compilation
 * @param {import('webpack').ChunkGraph} chunkGraph
 */
function collectRuntimeChunks(compilation, chunkGraph) {
  const runtimeChunks = []
  for (const chunk of compilation.chunks) {
    if (!chunk.hasRuntime()) {
      continue
    }
    const runtimeModules = Array.from(
      chunkGraph.getChunkRuntimeModulesIterable(chunk)
    ).map((rm) => rm.name ?? rm.constructor.name)
    runtimeChunks.push({
      chunkId: chunk.id,
      runtime: normalizeRuntime(chunk.runtime),
      runtimeModules,
    })
  }
  return runtimeChunks
}

/**
 * @param {ReportDecoration} decoration
 */
function buildDecorationLookups(decoration) {
  /** @type {Map<string | number, string>} */
  const moduleIdToCanonicalName = new Map()
  for (const [name, moduleIds] of decoration.identifiersForModuleIds ?? []) {
    for (const mid of moduleIds) {
      moduleIdToCanonicalName.set(mid, name)
    }
  }
  const unenforceable = new Set(decoration.unenforceableModuleIds ?? [])
  const contextModules = new Set(decoration.contextModuleIds ?? [])
  const policyResources = decoration.runtimeOptimizedPolicy?.resources ?? {}
  return {
    moduleIdToCanonicalName,
    unenforceable,
    contextModules,
    policyResources,
  }
}

/**
 * @param {import('webpack').Compilation} compilation
 * @param {import('webpack').ChunkGraph} chunkGraph
 * @param {import('webpack').ModuleGraph} moduleGraph
 * @param {Map<import('webpack').Chunk, string[]>} chunkRuntimes
 * @param {ReturnType<typeof buildDecorationLookups>} lookups
 */
function collectModules(
  compilation,
  chunkGraph,
  moduleGraph,
  chunkRuntimes,
  lookups
) {
  const knownModuleIds = new Set()
  const modules = []
  for (const module of compilation.modules) {
    const rawId = chunkGraph.getModuleId(module)
    if (rawId && knownModuleIds.has(rawId)) {
      throw Error(`Duplicate module id detected: ${rawId}`)
    }
    knownModuleIds.add(rawId)
    const id = resolveModuleId(module, chunkGraph)
    const moduleChunks = Array.from(chunkGraph.getModuleChunksIterable(module))
    const chunkIds = moduleChunks.map((c) => c.id)

    const runtimeSet = new Set()
    for (const chunk of moduleChunks) {
      const runtimes = chunkRuntimes.get(chunk)
      if (runtimes) {
        for (const r of runtimes) {
          runtimeSet.add(r)
        }
      }
    }

    const childIds = new Set()
    for (const conn of moduleGraph.getOutgoingConnections(module)) {
      const target = conn.module
      if (!target || target === module) {
        continue
      }
      childIds.add(resolveModuleId(target, chunkGraph))
    }

    const nm = /** @type {any} */ (module)

    // Decoration: only meaningful for modules with a real webpack id.
    const hasRealId = rawId !== null && rawId !== undefined && rawId !== ''
    const canonicalName = hasRealId
      ? (lookups.moduleIdToCanonicalName.get(rawId) ?? null)
      : null
    const isUnenforceable = hasRealId && lookups.unenforceable.has(rawId)
    const isContextModule = hasRealId && lookups.contextModules.has(rawId)
    const hasPolicy =
      canonicalName !== null &&
      Object.prototype.hasOwnProperty.call(
        lookups.policyResources,
        canonicalName
      )

    modules.push({
      id,
      identifier: module.identifier(),
      readableIdentifier: module.readableIdentifier(
        compilation.requestShortener
      ),
      rawRequest: typeof nm.rawRequest === 'string' ? nm.rawRequest : undefined,
      resource: typeof nm.resource === 'string' ? nm.resource : undefined,
      type: module.type,
      layer: module.layer ?? null,
      chunks: chunkIds,
      runtimes: Array.from(runtimeSet),
      children: Array.from(childIds),
      canonicalName,
      isUnenforceable,
      isContextModule,
      hasPolicy,
    })
  }
  return modules
}

/**
 * @param {ReturnType<typeof collectModules>} modules
 */
function collectLayers(modules) {
  const layers = new Set()
  for (const m of modules) {
    layers.add(m.layer)
  }
  return Array.from(layers)
}

/**
 * Produce the analysis report object for a sealed compilation.
 *
 * Call this from a hook that runs after the chunk graph is fully populated
 * (runtime modules attached) and after LavaMoat's own analysis has run — i.e.
 * `compilation.hooks.afterProcessAssets` when `emitBundleAnalysis` is enabled
 * on `LavaMoatPlugin`.
 *
 * @param {import('webpack').Compilation} compilation
 * @param {ReportDecoration} [decoration]
 */
function buildReport(compilation, decoration = {}) {
  const { chunkGraph, moduleGraph } = compilation

  /** @type {Map<import('webpack').Chunk, string[]>} */
  const chunkRuntimes = new Map()
  for (const chunk of compilation.chunks) {
    chunkRuntimes.set(chunk, normalizeRuntime(chunk.runtime))
  }

  /** @type {Set<string | number>} */
  const entryChunkIds = new Set()
  const entries = collectEntries(compilation, chunkGraph, entryChunkIds)
  const chunks = collectChunks(compilation, entryChunkIds)
  const runtimeChunks = collectRuntimeChunks(compilation, chunkGraph)
  const lookups = buildDecorationLookups(decoration)
  const modules = collectModules(
    compilation,
    chunkGraph,
    moduleGraph,
    chunkRuntimes,
    lookups
  )
  const layers = collectLayers(modules)

  return {
    entries,
    chunks,
    runtimeChunks,
    layers,
    modules,
  }
}

module.exports = {
  buildReport,
  ANALYSIS_DIR,
  ANALYSIS_JSON_FILENAME,
  ANALYSIS_HTML_FILENAME,
}
