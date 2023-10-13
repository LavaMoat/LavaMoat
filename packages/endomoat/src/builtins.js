import 'ses'

const { freeze, keys, fromEntries } = Object
const { all: promiseAll } = Promise

/**
 * This generated via `require('module').builtinModules`
 */
// prettier-ignore
const NODE_RAW_BUILTINS = /** @type {const} */([
  '_http_agent',         '_http_client',        '_http_common',
  '_http_incoming',      '_http_outgoing',      '_http_server',
  '_stream_duplex',      '_stream_passthrough', '_stream_readable',
  '_stream_transform',   '_stream_wrap',        '_stream_writable',
  '_tls_common',         '_tls_wrap',           'assert',
  'assert/strict',       'async_hooks',         'buffer',
  'child_process',       'cluster',             'console',
  'constants',           'crypto',              'dgram',
  'diagnostics_channel', 'dns',                 'dns/promises',
  'domain',              'events',              'fs',
  'fs/promises',         'http',                'http2',
  'https',               'inspector',           'module',
  'net',                 'os',                  'path',
  'path/posix',          'path/win32',          'perf_hooks',
  'process',             'punycode',            'querystring',
  'readline',            'readline/promises',   'repl',
  'stream',              'stream/consumers',    'stream/promises',
  'stream/web',          'string_decoder',      'sys',
  'timers',              'timers/promises',     'tls',
  'trace_events',        'tty',                 'url',
  'util',                'util/types',          'v8',
  'vm',                  'wasi',                'worker_threads',
  'zlib'
]);

/**
 * Each one of Node's builtins can also be referred to via a `node:` prefix.
 */
const NODE_BUILTINS = /** @type {const} */ ([
  ...NODE_RAW_BUILTINS,
  ...NODE_RAW_BUILTINS.map((name) => `node:${name}`),
])

export async function findNodeBuiltins() {
  return await findBuiltins(NODE_BUILTINS)
}

/**
 * @template {readonly string[]} T
 * @param {T} moduleNames
 * @returns {Promise<import('ses').ModuleExportsNamespace>}
 */
export async function findBuiltins(moduleNames) {
  /** @typedef {T[number]} ModuleName */

  /** @type {Record<ModuleName, any>} */
  const realModules = /** @type {any} */ ({})

  const coreModulesCompartment = new Compartment(
    {},
    {},
    {
      // is this name important?
      name: 'coreModules',
      resolveHook: (moduleSpecifier) => moduleSpecifier,
      importHook: async (moduleId) => {
        // do we need to throw if moduleId isn't a builtin?
        const moduleSpecifier = /** @type {ModuleName} */ (moduleId)

        // why do we care about .default?
        const ns =
          realModules[moduleSpecifier].default ?? realModules[moduleSpecifier]

        // why do we need to freeze this?
        const staticModuleRecord = freeze(
          /** @type {import('ses').ThirdPartyStaticModuleInterface} */ ({
            imports: [],
            exports: [...new Set([...keys(ns), 'default'])],

            execute: (moduleExports) => {
              // prettier-ignore
              Object.assign(moduleExports, ns)
              /** @type {any} */(moduleExports).default = ns
            },
          })
        )
        return staticModuleRecord
      },
    }
  )

  for (let name of moduleNames) {
    try {
      realModules[/** @type {ModuleName} */ (name)] = await import(name)
    } catch (e) {
      // why warn? if a builtin can't be loaded, we have bigger problems, yes?
      console.warn(e)
    }
  }

  return fromEntries(
    await promiseAll(
      keys(realModules).map(async (name) => [
        name,
        (await coreModulesCompartment.import(name)).namespace,
      ])
    )
  )
}
