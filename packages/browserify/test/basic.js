const test = require('tape-promise').default(require('tape'))
const pify = require('pify')

const { generatePrelude } = require('../src/index')
const {
  createBundleFromRequiresArray,
  createBundleFromRequiresArrayPath,
  createBundleFromEntry,
  generateConfigFromFiles,
} = require('./util')

test('basic - bundle works', async (t) => {
  const path = __dirname + '/fixtures/basic-deps.json'
  const sesifyConfig = {}
  const result = await createBundleFromRequiresArrayPath(path, sesifyConfig)
  try {
    eval(result)
    t.equal(global.testResult, 555)
  } catch (err) {
    t.fail(err)
  }
})

test('basic - browserify plugin', async (t) => {
  const basicSesifyPrelude = generatePrelude()
  const bundle = await createBundleFromEntry(__dirname + '/fixtures/nothing.js')
  t.assert(basicSesifyPrelude.length > 10, 'prelude not empty')
  t.assert(bundle.includes(basicSesifyPrelude))
})

// test('basic - config and bundle', async (t) => {
//   const files = [{
//     // id must be full path
//     id: './apple.js',
//     deps: {
//       'banana': './node_modules/banana/index.js',
//     },
//     source: 'global.testResult = require("banana")()',
//     entry: true,
//   }, {
//     // non-entry
//     id: './node_modules/banana/index.js',
//     deps: {},
//     source: 'module.exports = () => location.href',
//   }]
//   const config = await generateConfigFromFiles({ files })
//   console.log(JSON.stringify(config, null, 2))
//   const prelude = generatePrelude({ endowmentsConfig: config })
//   const bundle = await createBundleFromRequiresArray(files, { endowmentsConfig: config })

//   t.assert(prelude.includes('"banana": true'), 'prelude includes banana config')
//   t.assert(bundle.includes(prelude), 'bundle includes expected prelude')

//   const testHref = 'https://funky.town.gov/yolo?snake=yes'
//   const location = { href: testHref }
//   eval(bundle)
//   t.equal(global.testResult, 123, testHref)
// })
