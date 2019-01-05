const test = require('tape')
const { createBundleFromRequiresArray } = require('./util')


test('config - require-time specified endowments', (t) => {
  const path = __dirname + '/fixtures/overwrite-deps.json'
  const sesifyConfig = {}
  createBundleFromRequiresArray(path, sesifyConfig, (err, result) => {
    if (err) return t.fail(err)
    try {
      eval(result)
      t.deepEqual(global.testResult, ['ho', 'hum'])
    } catch (err) {
      t.fail(err)
    } finally {
      t.end()
    }
  })
})

// here we are providing an endowments only to a module deep in a dep graph
test('config - deep endow', (t) => {
  const path = __dirname + '/fixtures/need-config-endow.json'
  const sesifyConfig = {
    endowmentsConfig: `
      const postMessageEndowment = {
        window: {
          postMessage: (message) => { global.testResult = message }
        }
      }

      return {
        dependencies: {
          "two": {
            "three": {
              $: postMessageEndowment,
            },
          },
        },
      }`,
  }

  createBundleFromRequiresArray(path, sesifyConfig, (err, result) => {
    if (err) return t.fail(err)

    try {
      eval(result)
      t.deepEqual(global.testResult, '12345')
    } catch (err) {
      t.fail(err)
    } finally {
      t.end()
    }
  })
})
