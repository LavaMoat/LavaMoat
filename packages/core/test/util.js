// @ts-check

const {
  parseForPolicy,
  LavamoatModuleRecord,
  generateKernel,
  getDefaultPaths,
} = require('../src')
const mergeDeep = require('merge-deep')
const { runInContext, createContext } = require('node:vm')
const path = require('node:path')
const tmp = require('tmp-promise')
const stringify = require('json-stable-stringify')
const { applySourceTransforms } = require('../src/sourceTransforms.js')

module.exports = {
  generateConfigFromFiles: generatePolicyFromFiles,
  createScenarioFromScaffold,
  runScenario,
  createConfigForTest,
  autoConfigForScenario,
  prepareScenarioOnDisk,
  convertOptsToArgs,
  evaluateWithSourceUrl,
  createHookedConsole,
  fillInFileDetails,
  functionToString,
  runAndTestScenario,
}

/**
 * @import {ParseForPolicyOpts} from '../src/parseForPolicy'
 * @import {NormalizedBuiltin,
 *   NormalizedScenario,
 *   NormalizedScenarioJSFile,
 *   Scenario,
 *   ScenarioCheckErrorFn,
 *   ScenarioCheckResultFn,
 *   ScenarioFile} from './scenario'
 * @import {LavaMoatPolicy, LavaMoatPolicyOverrides} from '@lavamoat/types'
 * @import {MakeDirectoryOptions} from 'node:fs'
 * @import {ExecutionContext} from 'ava'
 */

/**
 * @typedef {Partial<ParseForPolicyOpts> & {
 *   files: NormalizedScenarioJSFile[]
 * }} GeneratePolicyFromFilesOpts
 */

/**
 * @param {GeneratePolicyFromFilesOpts} opts
 * @returns
 */
async function generatePolicyFromFiles({ files, ...opts }) {
  const config = await parseForPolicy({
    moduleSpecifier: /** @type {NormalizedScenarioJSFile} */ (
      files.find((file) => file.entry)
    ).specifier,
    resolveHook: (requestedName, parentAddress) => {
      return /** @type {NormalizedScenarioJSFile} */ (
        files.find((file) => file.specifier === parentAddress)
      ).importMap[requestedName]
    },
    importHook: async (address) => {
      return new LavamoatModuleRecord(
        /** @type {NormalizedBuiltin} */ (
          files.find((file) => file.specifier === address)
        )
      )
    },
    isBuiltin: () => false,
    includeDebugInfo: false,
    ...opts,
  })

  return config
}

/**
 * Given an incomplete scenario definition, normalize it in preparation for
 * running.
 *
 * @template [Result=unknown] Default is `unknown`
 * @param {Scenario} scenario
 * @returns {NormalizedScenario<{ value: string }>}
 */
function createScenarioFromScaffold({
  name = 'template scenario',
  expectedResult = {
    value: 'this is module two',
  },
  testType = 'deepEqual',
  checkPostRun = async (t, result, err, scenario) => {
    if (err) {
      await /** @type {ScenarioCheckErrorFn<Result>} */ (scenario.checkError)(
        t,
        err,
        scenario
      )
    } else {
      // assumes `result` is not undefined
      await /** @type {ScenarioCheckResultFn<Result>} */ (scenario.checkResult)(
        t,
        /** @type {Result} */ (result),
        scenario
      )
    }
  },
  checkError = async (t, err, scenario) => {
    if (scenario.expectedFailure) {
      t.truthy(err, `Scenario fails as expected: ${scenario.name} - ${err}`)
      t.regex(
        err.message,
        /** @type {RegExp} */ (scenario.expectedFailureMessageRegex),
        'Error message expects to match regex'
      )
    } else {
      if (err) {
        t.fail(`Unexpected error in scenario: ${scenario.name} - ${err}`)
        throw err
      }
    }
  },
  checkResult = async (t, result, scenario) => {
    if (scenario.testType === 'truthy') {
      t.assert(
        result,
        `${scenario.name} - scenario gives expected truthy result`
      )
    } else if (scenario.testType === 'falsy') {
      t.falsy(result, `${scenario.name} - scenario gives expected falsy result`)
    } else {
      t.deepEqual(
        result,
        scenario.expectedResult,
        `${scenario.name} - scenario gives expected result`
      )
    }
  },
  expectedFailure = false,
  expectedFailureMessageRegex = /[\s\S]*/,
  files = {},
  builtin = {},
  context = {},
  opts = { scuttleGlobalThis: {} },
  config,
  configOverride,
  defineEntry,
  defineOne,
  defineTwo,
  defineThree,
  defaultPolicy = true,
  dir,
  ...extraArgs
} = {}) {
  function _defineEntry() {
    // @ts-expect-error - does not exist
    const testResult = require('one')
    console.log(JSON.stringify(testResult, null, 2))
  }

  function _defineOne() {
    // @ts-expect-error - does not exist
    module.exports = require('two')
  }

  function _defineTwo() {
    module.exports = {
      value: 'this is module two',
    }
  }

  function _defineThree() {
    module.exports = {
      value: 'this is module three',
    }
  }

  const _files = fillInFileDetails({
    'entry.js': {
      content: `(${defineEntry || _defineEntry}).call(this)`,
      packageName: '$root$',
      importMap: {
        one: 'node_modules/one/index.js',
        two: 'node_modules/two/index.js',
        three: 'node_modules/three/index.js',
      },
      entry: true,
    },
    'package.json': {
      content: `${JSON.stringify(
        {
          name,
          dependencies: {
            one: '1.0.0',
            two: '1.0.0',
            three: '1.0.0',
          },
          devDependencies: {},
        },
        null,
        2
      )}`,
    },
    'node_modules/one/index.js': {
      packageName: 'one',
      content: `(${defineOne || _defineOne}).call(this)`,
      importMap: {
        two: 'node_modules/two/index.js',
        three: 'node_modules/three/index.js',
      },
    },
    'node_modules/one/package.json': {
      content: `${JSON.stringify(
        {
          name: 'one',
          dependencies: {
            two: '1.0.0',
            three: '1.0.0',
          },
        },
        null,
        2
      )}`,
    },
    'node_modules/two/index.js': {
      packageName: 'two',
      content: `(${defineTwo || _defineTwo}).call(this)`,
      importMap: {
        three: 'node_modules/three/index.js',
      },
    },
    'node_modules/two/package.json': {
      content: `${JSON.stringify(
        {
          name: 'two',
          dependencies: {
            three: '1.0.0',
          },
        },
        null,
        2
      )}`,
    },
    'node_modules/three/index.js': {
      packageName: 'three',
      content: `(${defineThree || _defineThree}).call(this)`,
      importMap: {
        one: 'node_modules/one/index.js',
      },
    },
    'node_modules/three/package.json': {
      content: `${JSON.stringify(
        {
          name: 'three',
          dependencies: {
            one: '1.0.0',
          },
        },
        null,
        2
      )}`,
    },
    ...files,
  })

  let _config
  if (defaultPolicy) {
    _config = mergeDeep(
      {
        resources: {
          one: {
            packages: {
              two: true,
              three: true,
            },
          },
          two: {
            packages: {
              three: true,
            },
          },
        },
      },
      config
    )
  } else {
    _config = config
  }

  const _configOverride = mergeDeep(
    {
      resources: {
        one: {
          packages: {
            five: true,
          },
        },
      },
    },
    configOverride
  )

  return {
    ...extraArgs,
    name: name,
    checkPostRun,
    checkResult,
    checkError,
    testType,
    builtin,
    expectedResult,
    expectedFailure,
    expectedFailureMessageRegex,
    entries: ['entry.js'],
    files: _files,
    config: /** @type {LavaMoatPolicy} */ (_config),
    configOverride: /** @type {LavaMoatPolicyOverrides} */ (_configOverride),
    context,
    opts,
    dir,
  }
}

function createHookedConsole() {
  let hasResolved = false
  /** @type {(arg: any) => void} */
  let resolve
  const firstLogEventPromise = new Promise((_resolve) => {
    resolve = _resolve
  })
  /** @param {string} message */
  const hookedLog = (message) => {
    if (hasResolved) {
      throw new Error(`console.log called multiple times. got "${message}"`)
    }
    hasResolved = true
    // run result through serialization boundary. this ensures these tests:
    // - work across a serialization boundary
    // - return simple objects non wrapped by membranes
    let result
    try {
      result = JSON.parse(message)
    } catch (err) {
      throw new Error(`LavaMoat - failed to parse test output:\n${message}`)
    }
    resolve(result)
  }
  const hookedConsole = { ...console, log: hookedLog }
  return {
    firstLogEventPromise,
    hookedConsole,
  }
}

/**
 * Options for {@link PlatformRunScenario}
 *
 * @template [Result=unknown] Default is `unknown`
 * @typedef PlatformRunScenarioOpts
 * @property {NormalizedScenario<Result>} scenario
 * @property {boolean} [runWithPrecompiledModules]
 * @property {(...args: any[]) => void} [log]
 */

/**
 * Scenario runner function provided by the consuming platform.
 *
 * Called by {@link runAndTestScenario}
 *
 * @template [Result=unknown] Default is `unknown`
 * @callback PlatformRunScenario
 * @param {PlatformRunScenarioOpts<Result>} opts
 * @returns {Promise<Result>}
 */

/**
 * Run the given scenario.
 *
 * The `scenario` itself should be passed thru `createScenarioFromScaffold` to
 * normalize it.
 *
 * @template [Result=unknown] Default is `unknown`
 * @type {PlatformRunScenario<Result>}
 */
async function runScenario({ scenario, runWithPrecompiledModules = false }) {
  const {
    entries,
    files,
    config,
    configOverride,
    builtin,
    kernelArgs = {},
    opts = {},
    beforeCreateKernel = () => {},
  } = scenario
  const lavamoatConfig = mergeDeep(config, configOverride)
  const kernelSrc = generateKernel(opts)
  const { hookedConsole, firstLogEventPromise } = createHookedConsole()
  Object.assign(scenario.context, { console: hookedConsole })
  const {
    result: createKernel,
    vmGlobalThis,
    vmContext,
    vmFeralFunction,
  } = evaluateWithSourceUrl(
    'LavaMoat/core-test/kernel',
    kernelSrc,
    scenario.context
  )
  // root global for test realm
  scenario.globalThis = vmGlobalThis
  scenario.vmContext = vmContext
  // call hook before kernel is created
  beforeCreateKernel(scenario)
  // create kernel
  const kernel = createKernel({
    runWithPrecompiledModules,
    lavamoatConfig,
    /** @param {string} id */
    loadModuleData: (id) => {
      if (id in builtin) {
        return moduleDataForBuiltin(builtin, id)
      }
      const moduleRecord = files[id]
      /**
       * @type {any}
       * @todo Need a type for "module data"
       */
      const moduleData = {
        id: moduleRecord.specifier,
        package: moduleRecord.packageName,
        type: moduleRecord.type,
        file: moduleRecord.file,
        deps: moduleRecord.importMap,
        moduleInitializer: moduleRecord.moduleInitializer,
      }
      // append the source or prepare the precompiledInitializer
      const intializerSource = `(function(exports, require, module, __filename, __dirname){\n${applySourceTransforms(
        moduleRecord.content
      )}\n})`
      if (runWithPrecompiledModules) {
        moduleData.precompiledInitializer = vmFeralFunction(`
          with (this.scopeTerminator) {
          with (this.globalThis) {
            return function() {
              'use strict';
              return ${intializerSource}
            };
          }
          }
        `)
      } else {
        moduleData.source = intializerSource
      }
      return moduleData
    },
    /**
     * @param {string} id
     * @param {string} relative
     * @returns {string}
     */
    getRelativeModuleId: (id, relative) => {
      return (
        /** @type {NormalizedScenarioJSFile} */ (files[id]).importMap[
          relative
        ] || relative
      )
    },
    prepareModuleInitializerArgs,
    ...kernelArgs,
  })

  entries.forEach((id) => kernel.internalRequire(id))
  const testResult = await firstLogEventPromise
  return testResult
}

/**
 * The subset of the `fs/promises` module that is used by
 * `prepareScenarioOnDisk`.
 *
 * @typedef FsPromiseApi
 * @property {(
 *   dir: string,
 *   opts?: MakeDirectoryOptions & { recursive: true }
 * ) => Promise<string | undefined>} mkdir
 * @property {(filepath: string, data: any) => Promise<void>} writeFile
 */

/**
 * Prepares a scenario on disk by writing files based on the provided scenario
 * object.
 *
 * @param {Object} options - The options for preparing the scenario.
 * @param {FsPromiseApi} [options.fs] - The file system module to use (default:
 *   `node:fs/promises`).
 * @param {Scenario} options.scenario - The scenario object containing the files
 *   to write.
 * @param {string} [options.policyName='policies'] - The name of the policy
 *   directory (default: 'policies'). Default is `'policies'`
 * @param {string} [options.projectDir] - The project directory path.
 * @returns {Promise<{ projectDir: string; policyDir: string }>} - An object
 *   containing the project directory path and the policy directory path.
 */
async function prepareScenarioOnDisk({
  fs = require('node:fs/promises'),
  scenario,
  policyName = 'policies',
  projectDir,
}) {
  if (projectDir === undefined) {
    ;({ path: projectDir } = await tmp.dir())
  }
  const filesToWrite = Object.values(scenario.files ?? {})
  if (!scenario.opts?.writeAutoPolicy) {
    const defaultPaths = getDefaultPaths(policyName)
    const primaryPath =
      typeof scenario.opts?.policyPath === 'string'
        ? scenario.opts.policyPath
        : defaultPaths.primary
    filesToWrite.push({
      file: primaryPath,
      content: stringify(scenario.config),
    })
    if (scenario.configOverride) {
      const overridePath =
        typeof scenario.opts?.policyOverridePath === 'string'
          ? scenario.opts.policyOverridePath
          : defaultPaths.override
      filesToWrite.push({
        file: overridePath,
        content: stringify(scenario.configOverride),
      })
    }
  }
  await Promise.all(
    filesToWrite.map(async (file) => {
      const fullPath = path.join(
        /** @type {string} */ (projectDir),
        /** @type {NormalizedScenarioJSFile} */ (file).file
      )
      const dirname = path.dirname(fullPath)
      await fs.mkdir(dirname, { recursive: true })
      await fs.writeFile(fullPath, file.content)
    })
  )
  return {
    projectDir,
    policyDir: path.join(projectDir, `/lavamoat/${policyName}/`),
  }
}

/**
 * @param {Record<string, ScenarioFile>} files
 * @returns
 */
function fillInFileDetails(files) {
  Object.entries(files).forEach(([file, fileObj]) => {
    fileObj.file = fileObj.file || file
    if (path.extname(file) === '.js') {
      // parse as LavamoatModuleRecord
      fileObj.specifier = fileObj.file || file
      fileObj.type = fileObj.type || 'js'
      fileObj.entry = Boolean(fileObj.entry)
    }
  })
  return files
}

/**
 * @param {Record<string, any>} builtinObj
 * @param {string} name
 * @returns {any}
 * @todo Type the module data
 */
function moduleDataForBuiltin(builtinObj, name) {
  return {
    id: name,
    file: name,
    package: name,
    type: 'builtin',
    /** @type {ScenarioFile['moduleInitializer']} */
    moduleInitializer: (_, _2, module) => {
      module.exports = builtinObj[name]
    },
  }
}

/**
 * @param {((id: string) => unknown) & { resolve: (id: string) => string }} requireRelativeWithContext
 * @param {any} moduleObj
 * @param {any} moduleData
 * @returns
 */
function prepareModuleInitializerArgs(
  requireRelativeWithContext,
  moduleObj,
  moduleData
) {
  /** @type {NodeJS.Require} */
  const require = /** @type {any} */ (requireRelativeWithContext)
  const module = moduleObj
  const exports = moduleObj.exports
  const __filename = moduleData.file
  const __dirname = path.dirname(__filename)
  require.resolve = /** @type {any} */ (
    () => {
      throw new Error(
        'require.resolve not implemented in lavamoat-core test harness'
      )
    }
  )
  return [exports, require, module, __filename, __dirname]
}

/**
 * @param {string} filename
 * @param {string} content
 * @param {object} context
 */
function evaluateWithSourceUrl(filename, content, context) {
  const vmContext = createContext()
  const vmGlobalThis = runInContext('this', vmContext)
  const vmFeralFunction = vmGlobalThis.Function

  Object.defineProperties(
    vmGlobalThis,
    Object.getOwnPropertyDescriptors(context)
  )

  // circular ref (used when globalThis is not present)
  if (!vmGlobalThis.globalThis) {
    vmGlobalThis.globalThis = vmGlobalThis
  }
  // Since the browserify test uses this vm util as a browser env simulation,
  // creating actual dom nodes that can leak the real global object is not possible,
  // therefore there is no way to access the real global object otherwise, but since we
  // have to (for the scuttling tests) - we intentionally export this util func to solve this:
  vmGlobalThis.getTrueGlobalThisForTestsOnly = () => vmGlobalThis
  // perform eval
  let result
  try {
    result = runInContext(`${content}\n//# sourceURL=${filename}`, vmContext)
  } catch (e) {
    console.log(/** @type {Error} */ (e).stack)
    throw e
  }
  // pull out test result value from context (not always used)
  return { result, vmGlobalThis, vmContext, vmFeralFunction }
}

/**
 * Create a LavaMoat policy config for a given test function
 *
 * @param {() => any} testFn - Test function which will be wrapped and used as
 *   the module contents; otherwise a string of the module contents. ESM modules
 *   must use a string, since `import` and `export` are only valid at the top
 *   level.
 * @param {Partial<GeneratePolicyFromFilesOpts>} [opts]
 * @returns {Promise<LavaMoatPolicy>}
 */
async function createConfigForTest(testFn, opts = {}) {
  /** @type {NormalizedScenarioJSFile[]} */
  const files = [
    {
      type: 'js',
      specifier: './entry.js',
      file: './entry.js',
      packageName: '$root$',
      importMap: {
        test: './node_modules/test/index.js',
      },
      content: 'require("test")',
      entry: true,
    },
    {
      // non-entry
      type: 'js',
      specifier: './node_modules/test/index.js',
      file: './node_modules/test/index.js',
      packageName: 'test',
      importMap: {},
      content: typeof testFn === 'function' ? `(${testFn})()` : `${testFn}`,
    },
  ]
  const policy = await generatePolicyFromFiles({ files, ...opts })
  return policy
}

/**
 * @param {object} opts
 * @param {Scenario} opts.scenario
 * @param {Partial<GeneratePolicyFromFilesOpts>} [opts.opts]
 */
async function autoConfigForScenario({ scenario, opts = {} }) {
  const files = /** @type {NormalizedScenarioJSFile[]} */ (
    Object.values(scenario.files ?? {})
  )
  const policy = await generatePolicyFromFiles({ files, ...opts })
  scenario.config = policy
}

/**
 * @param {object} opts
 * @param {NormalizedScenario} opts.scenario
 */
function convertOptsToArgs({ scenario }) {
  const { entries } = scenario
  if (entries.length !== 1) {
    throw new Error('LavaMoat - invalid entries')
  }
  const firstEntry = entries[0]
  return [firstEntry]
}

/**
 * @param {string} func
 * @returns {unknown}
 */
function functionToString(func) {
  return `(${func}).call(this)`
}

/**
 * @template [Result=unknown] Default is `unknown`
 * @param {ExecutionContext} t
 * @param {NormalizedScenario<Result>} scenario
 * @param {PlatformRunScenario<Result>} platformRunScenario
 * @returns {Promise<Result | undefined>}
 */
async function runAndTestScenario(t, scenario, platformRunScenario) {
  /** @type {Result | undefined} */
  let result
  /** @type {Error | undefined} */
  let err
  try {
    result = await platformRunScenario({ scenario, log: t.log.bind(t) })
  } catch (e) {
    err = /** @type {Error} */ (e)
  }
  await scenario.checkPostRun(t, result, err, scenario)
  return result
}
