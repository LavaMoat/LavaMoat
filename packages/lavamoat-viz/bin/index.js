#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const argv = require('yargs').argv
const { ncp } = require('ncp')
const pify = require('pify')

const { config, deps, dest } = argv

if (!dest) throw new Error('missing cli argument "--dest')
if (!deps) throw new Error('missing cli argument "--deps')
if (!config) throw new Error('missing cli argument "--config')

const source = path.resolve(__dirname, '/../dist/')

main()

async function main () {
  // copy app dir
  await pify(cb => ncp(source, dest, cb))()
  // add data-injection file
  const configContent = fs.readFileSync(config, 'utf8')
  const depsContent = fs.readFileSync(deps, 'utf8')
  const dataInjectionContent = `
  self.CONFIG = ${configContent};
  self.DEPS = ${depsContent};
  `
  fs.writeFileSync(dest + '/data-injection.js', dataInjectionContent)
  console.log(`generated viz in ${dest}`)
}
