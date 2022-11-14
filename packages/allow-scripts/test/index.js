const test = require('ava')
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

test('cli - auto command', async (t) => {
  // set up the directories
  let allowScriptsSrcRoot = path.join(__dirname, '..', 'src')
  let projectRoot = path.join(__dirname, 'projects', '1')

  // delete any existing package.json
  fs.unlink(path.join(projectRoot, 'package.json'), err => {
    if (err && err.code !== 'ENOENT') {
      throw err
    }
  })

  // npm init -y
  spawnSync('npm', ['init', '-y'], { cwd: projectRoot })

  // run the auto command
  let cmd = path.join(allowScriptsSrcRoot, 'cli.js')
  let result = spawnSync(cmd, ['auto'], { cwd: projectRoot })

  // forward error output for debugging
  console.error(result.stderr.toString('utf-8'))

  // get the package.json
  const packageJsonContents = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))

  // assert its contents
  t.deepEqual(packageJsonContents.lavamoat, {
    allowBins: {
      aaa: 'node_modules/aaa/index.js',
      karramba: 'node_modules/bbb/index.js',
    },
    allowScripts: {
      'bbb>evil_dep': false
    }
  })
})

test('cli - run command - good dep at the root', async (t) => {
  // set up the directories
  let allowScriptsSrcRoot = path.join(__dirname, '..', 'src')
  let projectRoot = path.join(__dirname, 'projects', '2')

  // clean up from a previous run
  // the force option is only here to stop rm complaining if target is missing
  fs.rmSync(path.join(projectRoot, './node_modules/.bin'), {
    recursive: true,
    force: true
  })

  // run the "run" command
  let cmd = path.join(allowScriptsSrcRoot, 'cli.js')
  let result = spawnSync(cmd, ['run'], { cwd: projectRoot })

  // forward error output for debugging
  console.error(result.stderr.toString('utf-8'))

  // assert the output
  t.deepEqual(result.stdout.toString().split('\n'), [
    'installing bin scripts',
    '- good_dep',
    'running lifecycle scripts for event \"preinstall\"',
    '- good_dep',
    'running lifecycle scripts for event \"install\"',
    'running lifecycle scripts for event \"postinstall\"',
    'running lifecycle scripts for top level package',
    '',
  ])

  t.assert(fs.existsSync(path.join(projectRoot, './node_modules/.bin/good')), 'Expected a bin script to be installed in top level node_modules')

  // note
  // we could also test whether the preinstall script is
  // actually executing. we did it manually by replacing
  // with
  // "preinstall": "touch /tmp/$( date '+%Y-%m-%d_%H-%M-%S' )"
})


test('cli - run command - good dep as a sub dep', async (t) => {
  // set up the directories
  let allowScriptsSrcRoot = path.join(__dirname, '..', 'src')
  let projectRoot = path.join(__dirname, 'projects', '3')

  // clean up from a previous run
  // the force option is only here to stop rm complaining if target is missing
  fs.rmSync(path.join(projectRoot, './node_modules/bbb/.goodscriptworked'), { force: true })
  fs.rmSync(path.join(projectRoot, './node_modules/bbb/node_modules/.bin'), {
    recursive: true,
    force: true
  })
  // run the "run" command
  let cmd = path.join(allowScriptsSrcRoot, 'cli.js')
  let result = spawnSync(cmd, ['run'], { cwd: projectRoot })

  // uncomment to forward error output for debugging
  // console.error(result.stdout.toString('utf-8'))
  // console.error(result.stderr.toString('utf-8'))

  // assert the output
  t.deepEqual(result.stdout.toString().split('\n'), [
    'installing bin scripts',
    '- aaa',
    'running lifecycle scripts for event \"preinstall\"',
    '- bbb>good_dep',
    'running lifecycle scripts for event \"install\"',
    'running lifecycle scripts for event \"postinstall\"',
    '- bbb',
    '',
  ])
  const errarr = result.stderr.toString().split('\n')
  t.assert(errarr.every(line=>!line.includes('you shall not pass')), 'Should not have run the parent script from the nested package postinstall')
  t.assert(errarr.some(line=>line.includes(`"good": "node_modules/good_dep/cli.sh"`)), 'Expected to see instructions on how to enable a bin script')

  t.assert(fs.existsSync(path.join(projectRoot, './node_modules/bbb/node_modules/.bin/good')), 'Expected a nested bin script to be installed in bbb/node_modules/.bin')

})
