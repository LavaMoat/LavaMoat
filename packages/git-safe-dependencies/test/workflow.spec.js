const { execFile } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { promisify } = require('node:util')
const { default: test } = require('ava')

const execFileAsync = promisify(execFile)
const cliActionsPath = path.resolve(__dirname, '../src/cli-actions.js')
const workflowModulePath = path.resolve(__dirname, '../src/workflow.js')

const createTempRepo = (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-workflows-'))
  t.teardown(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  fs.mkdirSync(path.join(tmpDir, '.github', 'workflows'), { recursive: true })
  fs.mkdirSync(path.join(tmpDir, '.github', 'actions', 'local'), {
    recursive: true,
  })

  // Non-workflow YAML files in .github/ should be ignored by default
  fs.writeFileSync(
    path.join(tmpDir, '.github', 'labeler.yml'),
    'label:\n  - changed-files:\n      - any-glob-to-any-file: ["**/*"]\n'
  )
  fs.writeFileSync(
    path.join(tmpDir, '.github', 'actions', 'local', 'action.yml'),
    'name: Local action\nruns:\n  using: composite\n  steps:\n    - run: echo hi\n      shell: bash\n'
  )

  fs.writeFileSync(
    path.join(tmpDir, '.github', 'workflows', 'ci.yml'),
    'name: CI\non: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo ok\n'
  )

  return tmpDir
}

test('validateWorkflows defaults to .github/workflows and ignores other .github YAML files', async (t) => {
  const tmpDir = createTempRepo(t)
  const expectedDir = path.join(fs.realpathSync(tmpDir), '.github', 'workflows')

  const { stdout } = await execFileAsync(
    process.execPath,
    [
      '-e',
      `const { validateWorkflows } = require(${JSON.stringify(workflowModulePath)}); validateWorkflows().then((res) => console.log(JSON.stringify(res)))`,
    ],
    { cwd: tmpDir }
  )

  const result = JSON.parse(stdout)
  t.deepEqual(result.errors, [])
  t.deepEqual(result.info, [
    `Found 0 actions in 1 workflow files in ${expectedDir}`,
  ])
})

test('cli-actions defaults --workflows to .github/workflows', async (t) => {
  const tmpDir = createTempRepo(t)
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [cliActionsPath],
    { cwd: tmpDir }
  )
  const expectedDir = path.join(fs.realpathSync(tmpDir), '.github', 'workflows')

  t.is(stdout, '')
  t.true(stderr.includes(`[git-safe] Validating workflows at ${expectedDir}`))
  t.true(
    stderr.includes(`Found 0 actions in 1 workflow files in ${expectedDir}`)
  )
  t.true(stderr.includes('[git-safe] Validation successful'))
})
