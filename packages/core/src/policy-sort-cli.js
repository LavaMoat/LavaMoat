#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const { jsonStringifySortedPolicy } = require('./stringifyPolicy')

const policyArg = process.argv[2]

if (!policyArg) {
  console.error('Usage: lavamoat-policy-sort <path-to-policy>')
  process.exit(1)
}
const policyPath = path.resolve(policyArg)

if (!fs.existsSync(policyPath)) {
  console.error(`Error: The file at path ${policyPath} does not exist.`)
  process.exit(1)
}

try {
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'))
  fs.writeFileSync(policyPath, jsonStringifySortedPolicy(policy))
} catch (e) {
  console.error(`Error: Unable to process file at path ${policyPath}`)
  console.error(e)
  process.exit(1)
}
