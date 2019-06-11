const test = require('tape-promise').default(require('tape'))

const { createBundleFromRequiresArrayPath } = require('./util')


test('config - require-time specified endowments', async (t) => {
  const path = __dirname + '/fixtures/overwrite-deps.json'
  const sesifyConfig = {}
  const result = await createBundleFromRequiresArrayPath(path, sesifyConfig)

  eval(result)
  t.deepEqual(global.testResult, ['ho', 'hum'])
})

// here we are providing an endowments only to a module deep in a dep graph
test('config - deep endow', async (t) => {
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
          "two three": {
            $: postMessageEndowment,
          },
        },
      }`,
  }

  const result = await createBundleFromRequiresArrayPath(path, sesifyConfig)
    
  eval(result)
  t.deepEqual(global.testResult, '12345')
})
