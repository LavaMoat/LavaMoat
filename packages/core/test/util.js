const { parseForConfig, LavamoatModuleRecord, generateKernel, packageNameFromPath, getDefaultPaths } = require('../src/index.js')
const mergeDeep = require('merge-deep')
const { runInContext, createContext } = require('vm')
const path = require('path')
const fromEntries = require('object.fromentries')
const { promises: fs } = require('fs')
var tmp = require('tmp-promise')
const stringify = require('json-stable-stringify')
const { applySourceTransforms } = require('../src/sourceTransforms.js')

module.exports = {
  generateConfigFromFiles,
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
  runAndTestScenario
}

async function generateConfigFromFiles ({ files, ...opts }) {
  const config = await parseForConfig({
    moduleSpecifier: files.find(file => file.entry).specifier,
    resolveHook: (requestedName, parentAddress) => {
      return files.find(file => file.specifier === parentAddress).importMap[requestedName]
    },
    importHook: async (address) => {
      return new LavamoatModuleRecord(files.find(file => file.specifier === address))
    },
    isBuiltin: () => false,
    includeDebugInfo: false,
    ...opts
  })

  return config
}

function createScenarioFromScaffold ({
  name = 'template scenario',
  expectedResult = {
    value: 'this is module two'
  },
  testType = 'deepEqual',
  checkPostRun = async (t, result, err, scenario) => {
    if (err) {
      await scenario.checkError(t, err, scenario)
    } else {
      await scenario.checkResult(t, result, scenario)
    }
  },
  checkError = async (t, err, scenario) => {
    if (scenario.expectedFailure) {
      t.truthy(err, `Scenario fails as expected: ${scenario.name} - ${err}`)
    } else {
      if (err) {
        t.fail(`Unexpected error in scenario: ${scenario.name} - ${err}`)
        throw (err)
      }
    }
  },
  checkResult = async (t, result, scenario) => {
    if (scenario.testType === 'truthy') {
      t.assert(result, `${scenario.name} - scenario gives expected truthy result`)
    } else if (scenario.testType === 'falsy') {
      t.falsy(result, `${scenario.name} - scenario gives expected falsy result`)
    } else {
      t.deepEqual(result, scenario.expectedResult, `${scenario.name} - scenario gives expected result`)
    }
  },
  expectedFailure = false,
  files = [],
  builtin = {},
  context = {},
  opts = {},
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
  function _defineEntry () {
    const testResult = require('one')
    console.log(JSON.stringify(testResult, null, 2))
  }

  function _defineOne () {
    module.exports = require('two')
  }

  function _defineTwo () {
    module.exports = {
      value: 'this is module two'
    }
  }

  function _defineThree () {
    module.exports = {
      value: 'this is module three'
    }
  }

  const _files = fillInFileDetails({
    'entry.js': {
      content: `(${defineEntry || _defineEntry}).call(this)`,
      packageName: '<root>',
      importMap: {
        one: 'node_modules/one/index.js',
        two: 'node_modules/two/index.js',
        three: 'node_modules/three/index.js'
      },
      entry: true
    },
    'node_modules/one/index.js': {
      packageName: 'one',
      content: `(${defineOne || _defineOne}).call(this)`,
      importMap: {
        two: 'node_modules/two/index.js',
        three: 'node_modules/three/index.js'
      }
    },
    'node_modules/two/index.js': {
      packageName: 'two',
      content: `(${defineTwo || _defineTwo}).call(this)`,
      importMap: {
        three: 'node_modules/three/index.js'
      }
    },
    'node_modules/three/index.js': {
      packageName: 'three',
      content: `(${defineThree || _defineThree}).call(this)`,
      importMap: {
        one: 'node_modules/one/index.js'
      }
    },
    ...files
  })

  let _config
  if (defaultPolicy) {
    _config = mergeDeep({
      resources: {
        one: {
          packages: {
            two: true,
            three: true
          }
        },
        two: {
          packages: {
            three: true
          }
        }
      }
    }, config)
  } else {
    _config = config
  }

  const _configOverride = mergeDeep({
    resources: {
      one: {
        packages: {
          five: true
        }
      }
    }
  }, configOverride)

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
    entries: ['entry.js'],
    files: _files,
    config: _config,
    configOverride: _configOverride,
    context,
    opts,
    dir,
  }
}

function createHookedConsole () {
  let hasResolved = false
  let resolve
  const firstLogEventPromise = new Promise(_resolve => { resolve = _resolve })
  const hookedLog = (message) => {
    if (hasResolved) {
      throw new Error('console.log called multiple times')
    }
    hasResolved = true
    // run result through serialization boundary. this ensures these tests:
    // - work across a serialization boundary
    // - return simple objects non wrapped by membranes
    const result = JSON.parse(message)
    resolve(result)
  }
  const hookedConsole = { ...console, log: hookedLog }
  return {
    firstLogEventPromise,
    hookedConsole,
  }
} 

async function runScenario ({ scenario }) {
  const {
    entries,
    files,
    config,
    configOverride,
    builtin,
    kernelArgs = {},
    beforeCreateKernel = () => {}
} = scenario
  const lavamoatConfig = mergeDeep(config, configOverride)
  const kernelSrc = generateKernel()
  const { hookedConsole, firstLogEventPromise } = createHookedConsole()
  Object.assign(scenario.context, { console: hookedConsole })
  const { result: createKernel, vmGlobalThis, vmContext } = evaluateWithSourceUrl('LavaMoat/core-test/kernel', kernelSrc, scenario.context)
  //root global for test realm
  scenario.globalThis = vmGlobalThis
  scenario.vmContext = vmContext
  // call hook before kernel is created
  beforeCreateKernel(scenario)
  // create kernel
  const kernel = createKernel({
    lavamoatConfig,
    loadModuleData: (id) => {
      if (id in builtin) {
        return moduleDataForBuiltin(builtin, id)
      }
      const moduleRecord = files[id]
      return {
        id: moduleRecord.specifier,
        package: moduleRecord.packageName,
        source: `(function(exports, require, module, __filename, __dirname){\n${applySourceTransforms(moduleRecord.content)}\n})`,
        type: moduleRecord.type,
        file: moduleRecord.file,
        deps: moduleRecord.importMap,
        moduleInitializer: moduleRecord.moduleInitializer
      }
    },
    getRelativeModuleId: (id, relative) => {
      return files[id].importMap[relative] || relative
    },
    prepareModuleInitializerArgs,
    ...kernelArgs,
  })

  entries.forEach(id => kernel.internalRequire(id))
  const testResult = await firstLogEventPromise
  return testResult
}

async function prepareScenarioOnDisk ({ scenario, policyName = 'policies' }) {
  const { path: projectDir } = await tmp.dir()
  const filesToWrite = Object.values(scenario.files)
  if (!scenario.opts.writeAutoPolicy) {
    const defaultPaths = getDefaultPaths(policyName)
    const primaryPath = typeof scenario.opts.policy === 'string' ? scenario.opts.policy : defaultPaths.primary
    filesToWrite.push({ file: primaryPath, content: stringify(scenario.config) })
    if (scenario.configOverride) {
      const overridePath = typeof scenario.opts.policyOverride === 'string' ? scenario.opts.policyOverride : defaultPaths.override
      filesToWrite.push({ file: overridePath, content: stringify(scenario.configOverride) })
    }
  }
  await Promise.all(filesToWrite.map(async (file) => {
    const fullPath = path.join(projectDir, file.file)
    const dirname = path.dirname(fullPath)
    await fs.mkdir(dirname, { recursive: true })
    await fs.writeFile(fullPath, file.content)
  }))
  return { projectDir, policyDir: path.join(projectDir, `/lavamoat/${policyName}/`) }
}

function fillInFileDetails (files) {
  Object.entries(files).forEach(([file, moduleRecord]) => {
    moduleRecord.file = moduleRecord.file || file
    moduleRecord.specifier = moduleRecord.file || file
    moduleRecord.packageName = moduleRecord.packageName || packageNameFromPath(file) || '<root>'
    moduleRecord.type = moduleRecord.type || 'js'
    moduleRecord.entry = Boolean(moduleRecord.entry)
  })
  return files
}

function moduleDataForBuiltin (builtinObj, name) {
  return {
    id: name,
    file: name,
    package: name,
    type: 'builtin',
    moduleInitializer: (_, _2, module) => { module.exports = builtinObj[name] }
  }
}

function prepareModuleInitializerArgs (requireRelativeWithContext, moduleObj, moduleData) {
  const require = requireRelativeWithContext
  const module = moduleObj
  const exports = moduleObj.exports
  const __filename = moduleData.file
  const __dirname = path.dirname(__filename)
  require.resolve = (requestedName) => {
    throw new Error('require.resolve not implemented in lavamoat-core test harness')
  }
  return [exports, require, module, __filename, __dirname]
}

function evaluateWithSourceUrl (filename, content, context) {

  const vmContext = createContext()
  const vmGlobalThis = runInContext('this', vmContext)

  Object.defineProperties(vmGlobalThis, Object.getOwnPropertyDescriptors(context))

  // circular ref (used when globalThis is not present)
  if (!vmGlobalThis.globalThis) {
    vmGlobalThis.globalThis = vmGlobalThis
  }
  // perform eval
  let result
  try {
    result = runInContext(`${content}\n//# sourceURL=${filename}`, vmContext)
  } catch (e) {
    console.log(e.stack)
    throw e
  }
  // pull out test result value from context (not always used)
  return { result, vmGlobalThis, vmContext }
}

async function createConfigForTest (testFn, opts = {}) {
  const files = [{
    type: 'js',
    specifier: './entry.js',
    file: './entry.js',
    packageName: '<root>',
    packageVersion: '0.0.0',
    importMap: {
      test: './node_modules/test/index.js'
    },
    content: 'require("test")',
    entry: true
  }, {
    // non-entry
    type: 'js',
    specifier: './node_modules/test/index.js',
    file: './node_modules/test/index.js',
    packageName: 'test',
    packageVersion: '1.2.3',
    importMap: {},
    content: `(${testFn})()`
  }]
  const config = await generateConfigFromFiles({ files, ...opts })
  return config
}

async function autoConfigForScenario ({ scenario, opts = {} }) {
  const files = Object.values(scenario.files)
  const config = await generateConfigFromFiles({ files, ...opts })
  scenario.config = config
}

function convertOptsToArgs ({ scenario }) {
  const { entries } = scenario
  if (entries.length !== 1) throw new Error('LavaMoat - invalid entries')
  const firstEntry = entries[0]
  return [firstEntry]
}

function functionToString(func) {
  return `(${func}).call(this)`
}

async function runAndTestScenario(t, scenario, platformRunScenario) {
  let result, err
  try {
    result = await platformRunScenario({ scenario })
  } catch (e) {
    err = e
  }
  await scenario.checkPostRun(t, result, err, scenario)
  return result
}