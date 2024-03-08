const fs = require('node:fs')
const url = require('node:url')
const crypto = require('node:crypto')

require('ses')
lockdown()

const rawModules = {}
const syntheticModulesCompartment = new Compartment(
  {},
  {},
  {
    name: 'syntheticModules',
    resolveHook: (moduleSpecifier) => moduleSpecifier,
    importHook: async (moduleSpecifier) => {
      const ns =
        rawModules[moduleSpecifier].default || rawModules[moduleSpecifier]

      const staticModuleRecord = Object.freeze({
        imports: [],
        exports: Array.from(new Set(Object.keys(ns).concat(['default']))),
        execute: (moduleExports) => {
          Object.assign(moduleExports, ns)
          moduleExports.default = ns
        },
      })
      return staticModuleRecord
    },
  }
)
const addToCompartment = async (name, nsObject) => {
  rawModules[name] = nsObject
  return (await syntheticModulesCompartment.import(name)).namespace
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

async function main() {
  const { makeReadPowers } = await import(
    '@endo/compartment-mapper/node-powers.js'
  )
  const { importLocation } = await import('@endo/compartment-mapper')
  const { transforms } = await import('ses/tools.js')
  const { evadeHtmlCommentTest, evadeImportExpressionTest, applyTransforms } =
    transforms

  const modules = {
    stream: await addToCompartment('stream', require('node:stream')),
    events: await addToCompartment('events', require('node:events')),
    buffer: await addToCompartment('buffer', require('node:buffer')),
    util: await addToCompartment('util', require('node:util')),
    crypto: await addToCompartment('crypto', require('node:crypto')),
    assert: await addToCompartment('assert', require('node:assert')),
    path: await addToCompartment('path', require('node:path')),
    fs: await addToCompartment('fs', require('node:fs')),
  }

  const readPowers = makeReadPowers({ fs, url, crypto })
  const moduleLocation = url.pathToFileURL(process.cwd() + '/entry.js')
  await importLocation(readPowers, moduleLocation, {
    modules,
    globals: {
      console,
      process,
      Buffer,
    },
    moduleTransforms: {
      cjs: makeSesModuleTransform('cjs'),
      mjs: makeSesModuleTransform('mjs'),
    },
  })

  function makeSesModuleTransform(language) {
    return function sesModuleTransform(sourceBytes) {
      const transformedSource = _applySesEvasions(sourceBytes.toString())
      const bytes = Buffer.from(transformedSource, 'utf8')
      return { bytes, parser: language }
    }
  }

  function _applySesEvasions(source) {
    const result = applySesEvasions(source)
    // if (result !== source) {
    //   console.log('transformed source')
    //   console.log(result.split('\n').map((line, i) => `${i + 1}: ${line}`).join('\n'))
    //   console.log('check that the transform result is valid js')
    //   transforms.rejectHtmlComments(result)
    // }
    return result
  }

  function applySesEvasions(source) {
    return applyTransforms(source, [
      evadeHtmlCommentTest,
      evadeImportExpressionTest,
      (src) => {
        const someDirectEvalPattern = /(^|[^.])\beval(\s*\()/g
        return src.replaceAll(someDirectEvalPattern, '$1(0,eval)(')
      },
    ])
  }
}
