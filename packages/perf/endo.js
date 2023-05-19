const fs = require('fs')
const url = require('url')
const crypto = require('crypto')

require('ses')
lockdown()

const rawModules = {};
const syntheticModulesCompartment = new Compartment(
  {},
  {},
  {
    name: 'syntheticModules',
    resolveHook: moduleSpecifier => moduleSpecifier,
    importHook: async moduleSpecifier => {
      const ns =
        rawModules[moduleSpecifier].default || rawModules[moduleSpecifier];

      const staticModuleRecord = Object.freeze({
        imports: [],
        exports: Array.from(new Set(Object.keys(ns).concat(['default']))),
        execute: moduleExports => {
          Object.assign(moduleExports, ns);
          moduleExports.default = ns;
        },
      });
      return staticModuleRecord;
    },
  },
);
const addToCompartment = async (name, nsObject) => {
  rawModules[name] = nsObject;
  return (await syntheticModulesCompartment.import(name)).namespace;
};


main().catch((err) => {
  console.error(err)
  process.exit(1)
})

async function main () {
  const { makeReadPowers } = await import('@endo/compartment-mapper/node-powers.js');
  const { importLocation } = await import('@endo/compartment-mapper')
  const { transforms } = await import('ses/tools.js');
  const {
    evadeHtmlCommentTest,
    evadeImportExpressionTest,
    applyTransforms,
  } = transforms;

  const modules = {
    stream: await addToCompartment('stream', require('stream')),
    events: await addToCompartment('events', require('events')),
    buffer: await addToCompartment('buffer', require('buffer')),
    util: await addToCompartment('util', require('util')),
    crypto: await addToCompartment('crypto', require('crypto')),
    assert: await addToCompartment('assert', require('assert')),
    path: await addToCompartment('path', require('path')),
    fs: await addToCompartment('fs', require('fs')),
  }
  

  const readPowers = makeReadPowers({ fs, url, crypto })
  const moduleLocation = url.pathToFileURL(process.cwd() + '/entry.js')
  await importLocation(
    readPowers,
    moduleLocation,
    {
      modules,
      globals: {
        // providing the whole process causes an issue on node v16.26.0
        // https://github.com/nodejs/node/issues/43496
        process: {
          env: process.env,
          cwd: process.cwd,
          version: process.version,
          nextTick: process.nextTick,
        },
        console,
        Buffer,
        // expose node global as globalThis alias
        get global () {
          return this
        }
      },
      moduleTransforms: {
        'cjs': makeSesModuleTransform('cjs'),
        'mjs': makeSesModuleTransform('mjs'),
      },
      commonDependencies: {
        'loose-envify': 'loose-envify',
      }
    },
  )

  function makeSesModuleTransform (language) {
    return function sesModuleTransform (sourceBytes, _speciefier, _location) {
      const transformedSource = _applySourceTransforms(sourceBytes.toString())
      const bytes = Buffer.from(transformedSource, 'utf8')
      return { bytes, parser: language }
    }
  }

  function _applySourceTransforms (source) {
    const result = applySourceTransforms(source)
    // if (result !== source) {
    //   console.log('transformed source')
    //   console.log(result.split('\n').map((line, i) => `${i + 1}: ${line}`).join('\n'))
    //   console.log('check that the transform result is valid js')
    //   transforms.rejectHtmlComments(result)
    // }
    return result
  }

  
  function applySourceTransforms (source) {
    return applyTransforms(source, [
      evadeHtmlCommentTest,
      evadeImportExpressionTest,
      (src) => {
        const someDirectEvalPattern = /(^|[^.])\beval(\s*\()/g;      
        return src.replaceAll(someDirectEvalPattern, '$1(0,eval)(')
      },
    ])
  }
}
