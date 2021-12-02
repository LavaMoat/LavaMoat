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
  spawnSync('npm', ['init', '-y'], {cwd: projectRoot})

  // run the auto command
  let cmd = path.join(allowScriptsSrcRoot, 'cli.js')
  let result = spawnSync(cmd, ['auto'], {cwd: projectRoot})

  // get the package.json
  const packageJsonContents = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))

  // assert its contents
  t.deepEqual(packageJsonContents.lavamoat, {allowScripts: {'bbb>evil_dep': false}})
})

test('cli - run command - good dep at the root', async (t) => {
  // set up the directories
  let allowScriptsSrcRoot = path.join(__dirname, '..', 'src')
  let projectRoot = path.join(__dirname, 'projects', '2')

  // run the "run" command
  let cmd = path.join(allowScriptsSrcRoot, 'cli.js')
  let result = spawnSync(cmd, ['run'], {cwd: projectRoot})

  // assert the output
  t.deepEqual(result.stdout.toString().split('\n'), [
    'running lifecycle scripts for event \"preinstall\"',
    '- good_dep',
    'running lifecycle scripts for event \"install\"',
    'running lifecycle scripts for event \"postinstall\"',
    'running lifecycle scripts for top level package',
    '',
  ])

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

  // run the "run" command
  let cmd = path.join(allowScriptsSrcRoot, 'cli.js')
  let result = spawnSync(cmd, ['run'], {cwd: projectRoot})

  // assert the output
  t.deepEqual(result.stdout.toString().split('\n'), [
    'running lifecycle scripts for event \"preinstall\"',
    '- bbb>good_dep',
    'running lifecycle scripts for event \"install\"',
    'running lifecycle scripts for event \"postinstall\"',
    'running lifecycle scripts for top level package',
    '',
  ])
})
