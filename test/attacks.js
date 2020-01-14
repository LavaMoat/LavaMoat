const {
  getTape,
  testEntryAttackerVictim,
  createBundleFromRequiresArray,
  evalBundle,
} = require('./util')

const test = getTape()

test('attack - prevent primitive modification', async (t) => {
  const depsArray = [
    {
      'id': '/1.js',
      'file': '/1.js',
      'source': "require('foo'); global.testResult = !!Object.xyz",
      'deps': { 'foo': '/node_modules/2/index.js' },
      'entry': true
    },
    {
      'id': '/node_modules/2/index.js',
      'file': '/node_modules/2/index.js',
      'source': 'try { Object.xyz = 123 } catch (_) { }',
      'deps': {}
    }
  ]

  const config = {
    "resources": {
      "<root>": {
        "packages": {
          "2": true,
        }
      }
    }
  }
  const bundle = await createBundleFromRequiresArray(depsArray, { config })
  const result = evalBundle(bundle)

  t.equal(result, false)
})

test('attack - limit platform api', async (t) => {
  const depsArray = [
    {
      'id': '/1.js',
      'file': '/1.js',
      'source': "global.testResult = typeof require('foo') === 'function'",
      'deps': { 'foo': '/node_modules/2/index.js' },
      'entry': true
    },
    {
      'id': '/node_modules/2/index.js',
      'file': '/node_modules/2/index.js',
      'source': 'try { module.exports = setTimeout } catch (_) {}',
      'deps': {}
    }
  ]

  const config = {
    "resources": {
      "<root>": {
        "packages": {
          "2": true,
        }
      }
    }
  }
  const bundle = await createBundleFromRequiresArray(depsArray, { config })
  const result = evalBundle(bundle)

  t.equal(result, false)
})

test('attack - prevent module cache attack', async (t) => {

  function defineAttacker () {
    try {
      require('victim').action = () => true
    } catch (_) {}
  }

  function defineVictim () {
    module.exports.action = () => false
  }

  await testEntryAttackerVictim(t, { defineAttacker, defineVictim })
})

test('attack - prevent module cache attack in proto chain', async (t) => {

  function defineAttacker () {
    try {
      const victim = require('victim')
      Object.getPrototypeOf(victim).action = () => true
    } catch (_) {}
  }

  function defineVictim () {
    const parent = {
      action: () => false
    }
    const child = Object.create(parent)
    module.exports = child
  }

  await testEntryAttackerVictim(t, { defineAttacker, defineVictim })
})
