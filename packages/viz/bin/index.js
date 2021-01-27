#!/usr/bin/env node
/* eslint-env node */
/* eslint-disable import/unambiguous */

const { promises: fs } = require('fs')
const path = require('path')
const yargs = require('yargs')
const { ncp } = require('ncp')
const pify = require('pify')
const openUrl = require('open')
const { mergeConfig, getDefaultPaths } = require('lavamoat-core')

const defaultPaths = getDefaultPaths('node')

main().catch((err) => console.error(err))

function parseArgs () {
  const argsParser = yargs
    .usage('$0', 'generate topological visualization for dep graph', () => {
      // path to write viz output
      yargs.option('dest', {
        describe: 'path to write viz output',
        type: 'string',
        default: './viz/'
      })
      // the directory containing the individual policy directories
      yargs.option('policiesDir', {
        describe: 'the directory containing the individual policy directories',
        type: 'string',
        default: defaultPaths.policiesDir
      })
      // the name of the policies to include in the dashboard under the policies directory. default: all
      yargs.option('policyNames', {
        describe: 'the name of the policies to include in the dashboard under the policies directory. default: all',
        type: 'array',
        default: []
      })
      // open the output dir
      yargs.option('open', {
        describe: 'open the visualization',
        type: 'boolean',
        default: false
      })
    })
    .help()

  const parsedArgs = argsParser.parse()
  return parsedArgs
}

async function main () {
  let { dest, open, policiesDir, policyNames } = parseArgs()
  const fullDest = path.resolve(dest)
  const source = path.join(__dirname, '/../dist/')
  // copy app dir
  await fs.mkdir(fullDest, { recursive: true })
  await pify((cb) => ncp(source, fullDest, cb))()
  // load policy names if not specified
  if (!policyNames.length) {
    policyNames = await getDirectories(policiesDir)
  }
  // write each policy data injection
  const policyDataInjectionFilePath = await Promise.all(policyNames.map(async (policyName) => {
    return await addPolicyComprehension({ policyName, fullDest })
  }))
  // add data-injection file
  const dataInjectionContent = policyDataInjectionFilePath
    // .map(filepath => { console.log(filepath, fullDest, path.relative(fullDest, filepath)); return filepath;})
    .map(filepath => path.relative(fullDest, filepath))
    .map(relPath => `import "./${relPath}";`)
    .join('\n')
  await fs.writeFile(`${fullDest}/injectConfigDebugData.js`, dataInjectionContent)
  // trigger opening of file
  if (open) {
    openUrl(`file:///${fullDest}/index.html`)
  }
  // report done
  console.log(`generated viz in "${dest}"`)
}

async function addPolicyComprehension ({ policyName, fullDest }) {
  const defaultPaths = getDefaultPaths(policyName)
  const [
    policyDebugContent,
    policyPrimary,
    policyOverride,
  ] = await Promise.all([
    fs.readFile(defaultPaths.debug, 'utf8'),
    loadPolicyFile(defaultPaths.primary),
    loadPolicyFile(defaultPaths.override),
  ])
  const mergedPolicy = mergeConfig(policyPrimary, policyOverride)
  const policyDataInjectionContent = `
  globalThis.CONFIG_DEBUG = ${policyDebugContent};
  globalThis.CONFIG = ${JSON.stringify(policyPrimary)};
  globalThis.CONFIG_OVERRIDE = ${JSON.stringify(policyOverride)};
  globalThis.CONFIG_FINAL = ${JSON.stringify(mergedPolicy)};
  `
  // write to disk
  const filepath = path.join(fullDest, `policy-${policyName}.js`)
  await fs.writeFile(filepath, policyDataInjectionContent)
  return filepath
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