const test = require('tape-promise').default(require('tape'))

const { createBundleFromRequiresArray } = require('./util')

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

  const config = {}
  const result = await createBundleFromRequiresArray(depsArray, config)

  eval(result)
  t.equal(global.testResult, false)
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

  const config = {}
  const result = await createBundleFromRequiresArray(depsArray, config)

  eval(result)
  t.equal(global.testResult, false)
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

async function testEntryAttackerVictim (t, { defineAttacker, defineVictim }) {

  function defineEntry () {
    require('attacker')
    const result = require('victim').action()
    global.testResult = result
  }

  const depsArray = [
    {
      'id': '/entry.js',
      'file': '/entry.js',
      'source': `(${defineEntry})()`,
      'deps': {
        'attacker': '/node_modules/attacker/index.js',
        'victim': '/node_modules/victim/index.js'
      },
      'entry': true
    },
    {
      'id': '/node_modules/attacker/index.js',
      'file': '/node_modules/attacker/index.js',
      'source': `(${defineAttacker})()`,
      'deps': {
        'victim': '/node_modules/victim/index.js'
      }
    },
    {
      'id': '/node_modules/victim/index.js',
      'file': '/node_modules/victim/index.js',
      'source': `(${defineVictim})()`,
      'deps': {}
    }
  ]

  const config = {}
  const result = await createBundleFromRequiresArray(depsArray, config)

  eval(result)
  t.equal(global.testResult, false)
}