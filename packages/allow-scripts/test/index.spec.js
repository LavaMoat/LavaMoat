const test = require('ava')
const os = require('node:os')
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { pathToFileURL } = require('node:url')

const NPM_CMD = os.platform() === 'win32' ? 'npm.cmd' : 'npm'

/**
 * For fat fingers
 */
const PACKAGE_JSON = 'package.json'

/**
 * Execute allow-scripts binaries with the given arguments
 * @param {any} t ava test object
 * @param {string[]} args Arguments to pass
 * @param {string} cwd Working directory to execute command from
 * @returns {{stderr: string, stdout: string, status: number}} Process result
 */
const run = (t, args, cwd) => {
  // Path to the allow-scripts executable
  const ALLOW_SCRIPTS_BIN = require.resolve('../src/cli')
  const options = realisticEnvOptions(cwd)
  const result = spawnSync(
    'node',
    [
      ALLOW_SCRIPTS_BIN,
      ...args,
    ],
    options,
  )

  if (typeof result.stderr === 'undefined' || typeof result.status !== 'number') {
    t.fail(
      `Failed calling 'node ${ALLOW_SCRIPTS_BIN} ${args.join(' ')}': ${JSON.stringify(
        {
          cwd,
          options,
          result,
        },
        undefined,
        2
      )}`
    )
  }

  // forward error output for debugging
  t.log(result.stderr.toString('utf-8'))

  return {
    status: result.status,
    stderr: result.stderr,
    stdout: result.stdout,
  }
}


test('cli - auto command', (t) => {
  // set up the directories
  let projectRoot = path.join(__dirname, 'projects', '1')

  // delete any existing package.json
  fs.rmSync(path.join(projectRoot, PACKAGE_JSON), { force: true })

  // npm init -y
  let initResult = spawnSync(
    NPM_CMD,
    ['init', '-y'],
    realisticEnvOptions(projectRoot)
  )

  // forward error output for debugging
  if (typeof initResult.stderr !== 'undefined') {
    t.log(initResult.stderr.toString('utf-8'))
  } else {
    t.fail(
      `Failed calling 'npm init -y': ${JSON.stringify(
        {
          projectRoot,
          options: realisticEnvOptions(projectRoot),
          initResult,
        },
        undefined,
        2
      )}`
    )
  }

  // run the auto command
  run(t, ['auto'], projectRoot)

  // get the package.json
  const packageJsonContents = JSON.parse(
    fs.readFileSync(
      pathToFileURL(
        path.join(projectRoot.replace(path.sep, '/'), PACKAGE_JSON),
        'utf8'
      )
    )
  )

  // assert its contents
  t.deepEqual(packageJsonContents.lavamoat, {
    allowScripts: {
      'bbb>evil_dep': false,
    },
  })
})

test('cli - auto command with experimental bins', (t) => {
  // set up the directories
  let projectRoot = path.join(__dirname, 'projects', '1')

  fs.rmSync(path.join(projectRoot, PACKAGE_JSON), { force: true })

  // npm init -y
  spawnSync(NPM_CMD, ['init', '-y'], realisticEnvOptions(projectRoot))

  // run the auto command
  run(t, ['auto', '--experimental-bins'], projectRoot)

  // get the package.json
  const packageJsonContents = JSON.parse(
    fs.readFileSync(
      pathToFileURL(
        path.join(projectRoot.replace(path.sep, '/'), PACKAGE_JSON),
        'utf8'
      )
    )
  )

  // assert its contents
  t.deepEqual(packageJsonContents.lavamoat, {
    allowBins: {
      aaa: 'node_modules/aaa/index.js',
      karramba: 'node_modules/bbb/index.js',
    },
    allowScripts: {
      'bbb>evil_dep': false,
    },
  })
})

test('cli - run command - good dep at the root', (t) => {
  // set up the directories
  let projectRoot = path.join(__dirname, 'projects', '2')

  // clean up from a previous run
  // the force option is only here to stop rm complaining if target is missing
  fs.rmSync(path.join(projectRoot, 'node_modules', '.bin'), {
    recursive: true,
    force: true,
  })

  // run the "run" command
  const result = run(t, ['run'], projectRoot)

  // assert the output
  t.deepEqual(result.stdout.toString().split('\n'), [
    'running lifecycle scripts for event "preinstall"',
    '- good_dep',
    'running lifecycle scripts for event "install"',
    'running lifecycle scripts for event "postinstall"',
    'running lifecycle scripts for top level package',
    '',
  ])

  // note
  // we could also test whether the preinstall script is
  // actually executing. we did it manually by replacing
  // with
  // "preinstall": "touch /tmp/$( date '+%Y-%m-%d_%H-%M-%S' )"
})
test('cli - run command - good dep at the root with experimental bins', (t) => {
  // set up the directories
  let projectRoot = path.join(__dirname, 'projects', '2')

  // clean up from a previous run
  // the force option is only here to stop rm complaining if target is missing
  fs.rmSync(path.join(projectRoot, 'node_modules', '.bin'), {
    recursive: true,
    force: true,
  })

  // run the "run" command
  const result = run(t, ['run', '--experimental-bins'], projectRoot)

  // assert the output
  t.deepEqual(result.stdout.toString().split('\n'), [
    'installing bin scripts',
    '- good - from package: good_dep',
    'running lifecycle scripts for event "preinstall"',
    '- good_dep',
    'running lifecycle scripts for event "install"',
    'running lifecycle scripts for event "postinstall"',
    'running lifecycle scripts for top level package',
    '',
  ])

  t.assert(
    fs.existsSync(path.join(projectRoot, 'node_modules', '.bin', 'good')),
    'Expected a bin script to be installed in top level node_modules'
  )

  // note
  // we could also test whether the preinstall script is
  // actually executing. we did it manually by replacing
  // with
  // "preinstall": "touch /tmp/$( date '+%Y-%m-%d_%H-%M-%S' )"
})

test('cli - run command - good dep as a sub dep', (t) => {
  // set up the directories
  let projectRoot = path.join(__dirname, 'projects', '3')

  // clean up from a previous run
  // the force option is only here to stop rm complaining if target is missing
  fs.rmSync(
    path.join(projectRoot, 'node_modules', 'bbb', '.goodscriptworked'),
    { force: true }
  )
  fs.rmSync(path.join(projectRoot, 'node_modules', '.bin'), {
    recursive: true,
    force: true,
  })

  // generate the bin link
  spawnSync(NPM_CMD, ['rebuild', 'good_dep'], realisticEnvOptions(projectRoot))

  // run the "run" command
  const result = run(t, ['run'], projectRoot)

  // assert the output
  t.deepEqual(result.stdout.toString().split('\n'), [
    'running lifecycle scripts for event "preinstall"',
    '- bbb>good_dep',
    'running lifecycle scripts for event "install"',
    'running lifecycle scripts for event "postinstall"',
    '- bbb',
    'running lifecycle scripts for top level package',
    '',
  ])
})

test('cli - run command - good dep as a sub dep with experimental bins', (t) => {
  // set up the directories
  let projectRoot = path.join(__dirname, 'projects', '3')

  // clean up from a previous run
  // the force option is only here to stop rm complaining if target is missing
  fs.rmSync(
    path.join(projectRoot, 'node_modules', 'bbb', '.goodscriptworked'),
    { force: true }
  )
  fs.rmSync(path.join(projectRoot, 'node_modules', '.bin'), {
    recursive: true,
    force: true,
  })
  // run the "run" command
  const result = run(t, ['run', '--experimental-bins'], projectRoot)

  t.assert(
    fs.existsSync(
      path.join(
        projectRoot,
        'node_modules',
        'bbb',
        'node_modules',
        '.bin',
        'good'
      )
    ),
    'Expected a nested bin script to be installed in bbb/node_modules/.bin'
  )
  const errarr = result.stderr.toString().split('\n')
  t.assert(
    errarr.every((line) => !line.includes('you shall not pass')),
    'Should not have run the parent script from the nested package postinstall'
  )
  t.assert(
    errarr.some((line) => line.includes('"good": "node_modules/')),
    'Expected to see instructions on how to enable a bin script1'
  )
  t.assert(
    errarr.some((line) => line.includes('node_modules/good_dep/cli.js')),
    'Expected to see instructions on how to enable a bin script2'
  )
  t.assert(
    errarr.some((line) => line.includes('node_modules/aaa/shouldntrun.sh')),
    'Expected to see instructions on how to enable a bin script3'
  )
  // assert the output
  t.deepEqual(result.stdout.toString().split('\n'), [
    'installing bin scripts',
    '- good - from package: aaa',
    'running lifecycle scripts for event "preinstall"',
    '- bbb>good_dep',
    'running lifecycle scripts for event "install"',
    'running lifecycle scripts for event "postinstall"',
    '- bbb',
    '',
  ])
})

/**
 * @param {string} projectRoot
 * @returns {import('node:child_process').SpawnSyncOptions}
 */
function realisticEnvOptions(projectRoot) {
  return {
    cwd: projectRoot,
    env: { ...process.env, INIT_CWD: projectRoot },
    encoding: 'utf-8',
  }
}
