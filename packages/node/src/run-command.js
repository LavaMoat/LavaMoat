#!/usr/bin/env node
/* eslint-disable no-eval */

const path = require('path')
const fs = require('fs')
const yargs = require('yargs')
const jsonStringify = require('json-stable-stringify')
const { loadPolicy, getDefaultPaths } = require('lavamoat-core')
const { loadCanonicalNameMap } = require('@lavamoat/aa')
const { parseForPolicy } = require('./parseForPolicy')
const { createKernel } = require('./kernel')
const yargsFlags = require('./yargsFlags')


runLava().catch(err => {
  // explicity log stack to workaround https://github.com/endojs/endo/issues/944
  console.error(err.stack || err)
  process.exit(1)
})

async function runLava () {
  const {
    commandName,
    writeAutoPolicy,
    writeAutoPolicyDebug,
    writeAutoPolicyAndRun,
    policyPath,
    policyDebugPath,
    policyOverridePath,
    projectRoot,
    debugMode,
    statsMode,
    _: argv, // this is where yargs puts all arguments after --
  } = parseArgs()
  const shouldParseApplication = writeAutoPolicy || writeAutoPolicyDebug || writeAutoPolicyAndRun
  const shouldRunApplication = (!writeAutoPolicy && !writeAutoPolicyDebug) || writeAutoPolicyAndRun

  const binEntry = path.resolve(process.cwd(), './node_modules/.bin/', commandName);
  if (!fs.existsSync(binEntry)) {
    console.error(`Error: '${commandName}' is not one of the locally installed commands. Missing: '${binEntry}'
    Possible reasons for this error:
    - node_modules not installed
    - trying to run a globally installed script or command, 
      which is not supported and not recommended`)
    process.exit(4)
  }

  const entryId = path.resolve(
    process.cwd(), 
    'node_modules/.bin/',
    fs.readlinkSync(binEntry)
  )

  if (shouldParseApplication) {
    // parse mode
    const includeDebugInfo = Boolean(writeAutoPolicyDebug)
    const policyOverride= await loadPolicy({ debugMode, policyPath: policyOverridePath })
    console.warn(`LavaMoat generating policy from entry "${entryId}"...`)
    const policy = await parseForPolicy({ projectRoot, entryId, policyOverride, includeDebugInfo })
    // write policy debug file
    if (includeDebugInfo) {
      fs.mkdirSync(path.dirname(policyDebugPath), { recursive: true })
      fs.writeFileSync(policyDebugPath, jsonStringify(policy, { space: 2 }))
      console.warn(`LavaMoat wrote policy debug to "${policyDebugPath}"`)
    }
    // cleanup debug info
    delete policy.debugInfo
    // write policy file
    fs.mkdirSync(path.dirname(policyPath), { recursive: true })
    fs.writeFileSync(policyPath, jsonStringify(policy, { space: 2 }))
    console.warn(`LavaMoat wrote policy to "${policyPath}"`)
  }
  if (shouldRunApplication) {
    // execution mode
    const lavamoatPolicy = await loadPolicy({ debugMode, policyPath })
    const canonicalNameMap = await loadCanonicalNameMap({ rootDir: projectRoot, includeDevDeps: true })
      // process.exit(420)
    const kernel = createKernel({ projectRoot, lavamoatPolicy, canonicalNameMap, debugMode, statsMode })
    // patch process.argv so it matches the normal pattern
    // e.g. [runtime path, entrypoint, ...args]
    // we'll use the LavaMoat path as the runtime
    // so we just remove the node path
    process.argv = [process.argv[0], ...argv]

    // run entrypoint
    kernel.internalRequire(entryId)
  }
}

function parseArgs () {
  const defaultPaths = getDefaultPaths('node')
  const argsParser = yargs
    .usage('$0', 'lavamoat-run-command [flags for lavamoat] -- command [args for the command]', (yarn) => yargsFlags(yarn, defaultPaths))
    .help()

  const parsedArgs = argsParser.parse()
  parsedArgs.commandName = parsedArgs._[0];
  // resolve paths
  parsedArgs.policyPath = path.resolve(parsedArgs.policyPath)
  parsedArgs.policyOverridePath = path.resolve(parsedArgs.policyOverridePath)
  parsedArgs.policyDebugPath = path.resolve(parsedArgs.policyDebugPath)
  parsedArgs.projectRoot = path.resolve(parsedArgs.projectRoot)

  return parsedArgs
}
