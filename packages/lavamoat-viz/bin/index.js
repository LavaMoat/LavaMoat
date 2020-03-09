#!/usr/bin/env node

const { promises: fs } = require('fs')
const path = require('path')
const argv = require('yargs').argv
const { ncp } = require('ncp')
const pify = require('pify')

const { config, deps, dest } = argv

if (!dest) throw new Error('missing cli argument "--dest')
if (!deps) throw new Error('missing cli argument "--deps')
if (!config) throw new Error('missing cli argument "--config')

const source = path.join(__dirname, '/../dist/')

main().catch(err => console.error(err))

async function main () {
  console.log(`"${source}", "${dest}"`)
  // copy app dir
  await fs.mkdir(dest, { recursive: true })
  await pify(cb => ncp(source, dest, cb))()
  // add data-injection file
  const configContent = await fs.readFile(config, 'utf8')
  const depsContent = await fs.readFile(deps, 'utf8')
  const dataInjectionContent = `
  self.CONFIG = ${configContent};
  self.DEPS = ${depsContent};
  `
  await fs.writeFile(dest + '/data-injection.js', dataInjectionContent)
  console.log(`generated viz in ${dest}`)
}
