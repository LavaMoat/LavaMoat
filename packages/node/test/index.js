const test = require('tape')
const { parseForConfig } = require('../src/parseForConfig')
const { runLavamoat } = require('./util')

test('resolutions - parseForConfig', async (t) => {
  const projectRoot = `${__dirname}/projects/1`
  const entryId = `${projectRoot}/index.js`
  const resolutions = {
    a: {
      fs: `${projectRoot}/fake-fs.js`,
      b: `${projectRoot}/fake-b.js`
    }
  }

  const config1 = await parseForConfig({ entryId })

  // comparing resources only, to skip core-modules
  t.deepEqual(config1.resources, {
    '<root>': {
      packages: {
        a: true
      }
    },
    a: {
      packages: {
        b: true,
        fs: true
      }
    },
    b: {
      packages: {
        http: true
      }
    }
  })

  const config2 = await parseForConfig({ entryId, resolutions })

  // comparing resources only, to skip core-modules
  t.deepEqual(config2.resources, {
    '<root>': {
      packages: {
        a: true
      }
    },
    a: {
      packages: {
        '<root>': true
      }
    }
  }, 'config resources do not include data on packages not parsed due to resolutions')

  t.end()
})

// run lavamoat-node
test('resolutions - execute', async (t) => {
  const projectRoot = `${__dirname}/projects/1`
  const entryId = './index.js'
  const { output } = await runLavamoat({
    cwd: projectRoot,
    args: [entryId]
  })
  console.log(output.stdout)
  t.equal(output.stderr, '', 'should not have any error output')
  t.deepEqual(output.stdout.split('\n'), [
    'fake-fs called',
    'value: 42',
    ''
  ], 'should not have any standard output')
  t.end()
})
