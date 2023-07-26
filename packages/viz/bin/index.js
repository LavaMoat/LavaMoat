#!/usr/bin/env node
/* eslint-env node */
/* eslint-disable import/unambiguous */

const { promises: fs } = require('fs')
const path = require('path')
const http = require('http')
const yargs = require('yargs')
const { ncp } = require('ncp')
const pify = require('pify')
const openUrl = require('open')
const handler = require('serve-handler')
const { getDefaultPaths } = require('lavamoat-core')

const defaultPaths = getDefaultPaths('node')
const commandDefaults = {
  dest: 'viz/',
  policiesDir: defaultPaths.policiesDir,
  policyNames: [],
}

main().catch((err) => console.error(err))

function parseArgs () {
  const defaultCommand = 'generate'
  const argsParser = yargs
    .usage('Usage: $0 <command> [options]')
    .command(['generate', '$0'], 'generate topological visualization for dep graph', (yargs) => {
      // path to write viz output
      yargs.option('dest', {
        describe: 'path to write viz output',
        type: 'string',
        default: commandDefaults.dest,
      })
      // the directory containing the individual policy directories
      yargs.option('policiesDir', {
        describe: 'the directory containing the individual policy directories',
        type: 'string',
        default: commandDefaults.policiesDir,
      })
      // the name of the policies to include in the dashboard under the policies directory. default: all
      yargs.option('policyNames', {
        describe: 'the name of the policies to include in the dashboard under the policies directory. default: all',
        type: 'array',
        default: commandDefaults.policyNames,
      })
      // JSON object containings paths to the specific policy files
      yargs.option('policyFilePathsJson', {
        describe: 'json string indicating the individual policy file locations',
        type: 'string',
      })
      // open the output dir
      yargs.option('open', {
        describe: 'open the visualization',
        type: 'boolean',
        default: false,
      })
      // open the output dir
      yargs.option('serve', {
        describe: 'serve the visualization via a static server',
        type: 'boolean',
        default: false,
      })
    })
    .command('serve', 'serve the visualization via a static server', (yargs) => {
      // path to serve viz output
      yargs.option('dest', {
        describe: 'path to serve the viz from',
        type: 'string',
        default: commandDefaults.dest,
      })
    })
    .help()
    .strict()

  const parsedArgs = argsParser.parse()
  parsedArgs.command = parsedArgs['_'][0] || defaultCommand
  return parsedArgs
}

async function main () {
  const args = parseArgs()
  const { command, dest } = args
  switch (command) {
    case 'generate':  {
      // newline for clearer output
      console.info('')
      return await generateViz(args)
    }
    case 'serve':  {
      console.info('serving a pre-built dashboard. to generate new dashboard and serve use "lavamoat-viz --serve"')
      console.info('this is equivalent to "npx serve ./viz"')
      console.info('\n')
      const fullDest = path.resolve(dest)
      return await serveViz(dest)
    }
    default: {
      throw new Error(`Unknown command "${command}"`)
    }
  }
}

async function generateViz (args) {
  let { dest, open, serve, policiesDir, policyNames, policyFilePathsJson } = args
  const fullDest = path.resolve(dest)
  const source = path.join(__dirname, '/../dist/')
  // copy app dir
  await fs.mkdir(fullDest, { recursive: true })
  await pify((cb) => ncp(source, fullDest, cb))()
  // load policy names if not specified
  if (!policyNames.length) {
    policyNames = await getDirectories(policiesDir)
  }
  const policyFilePaths = policyFilePathsJson ? JSON.parse(policyFilePathsJson) : {}
  // write each policy data injection
  const policyDataInjectionFilePaths = await Promise.all(policyNames.map(async (policyName) => {
    const policyFilePathsForProject = policyFilePaths[policyName] || {}
    return await createPolicyDataInjectionFile({ policyName, fullDest, policyFilePathsForProject })
  }))
  // add data-injection file
  const dataInjectionContent = policyDataInjectionFilePaths
    // .map(filepath => { console.log(filepath, fullDest, path.relative(fullDest, filepath)); return filepath;})
    .map(filepath => path.relative(fullDest, filepath))
    .map(relPath => `import "./${relPath}";`)
    .join('\n')
  await fs.writeFile(`${fullDest}/injectConfigDebugData.js`, dataInjectionContent)

  // dashboard prepared! report done
  console.log(`generated viz in "${dest}"`)
  let dashboardUrl
  if (serve) {
    dashboardUrl = await serveViz(fullDest)
  }

  // trigger opening of dashboard
  if (open) {
    if (serve) {
      openUrl(dashboardUrl)
    } else {
      openUrl(`file:///${fullDest}/index.html`)
    }
  }
}

async function serveViz (fullDest) {
  const server = http.createServer((req, res) => handler(req, res, { public: fullDest }))
  const port = 5000
  const url = `http://localhost:${port}`
  await new Promise(resolve => server.listen(port, resolve))
  console.log(`Running at ${url}`)
  return url
}

async function createPolicyDataInjectionFile ({ policyName, fullDest, policyFilePathsForProject }) {
  const policyData = await loadPolicyData(policyName, policyFilePathsForProject)
  // json esm modules dont exist yet so we do this
  const policyDataInjectionContent = `
  {
    const policies = globalThis.LavamoatPolicies = globalThis.LavamoatPolicies || {};
    policies["${policyName}"] = ${JSON.stringify(policyData, null, 2)};
  }
  `
  // write to disk
  const filepath = path.join(fullDest, `policy-${policyName}.js`)
  await fs.writeFile(filepath, policyDataInjectionContent)
  return filepath
}

async function loadPolicyData (policyName, fileLocations) {
  const defaultPaths = getDefaultPaths(policyName)
  const [
    debug,
    primary,
    override,
  ] = await Promise.all([
    loadPolicyFile(fileLocations.debug || defaultPaths.debug),
    loadPolicyFile(fileLocations.primary || defaultPaths.primary),
    // loadPolicyFile(fileLocations.override || defaultPaths.override),
  ])
  const policyData = { primary, override, debug }
  return policyData
}

async function loadPolicyFile (filepath) {
  const content = await fs.readFile(filepath, 'utf8')
  const policy = JSON.parse(content)
  return policy
}

async function getDirectories (filepath) {
  const dirEntries = await fs.readdir(filepath, { withFileTypes: true })
  return dirEntries
    .filter(entry => entry.isDirectory())
    .map(dir => dir.name)
}
