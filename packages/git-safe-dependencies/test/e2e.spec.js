const test = require('ava')
const { exec } = require('node:child_process')
const path = require('node:path')
const { promisify } = require('node:util')

const execAsync = promisify(exec)

const runCliTest = test.macro(async (t, { args, cli = 'cli.js' } = {}) => {
  const resolvedArgs = Object.entries(args).map(
    ([key, value]) =>
      `--${key}=${path.relative(process.cwd(), path.resolve(__dirname, 'fixtures', value))}`
  )

  const bin = path.relative(
    process.cwd(),
    path.resolve(__dirname, '..', 'src', cli)
  )
  const command = `node ${bin} ${resolvedArgs.join(' ')}`
  const {
    stdout,
    stderr,
    code = 0,
  } = await execAsync(command, {
    shell: true,
  }).catch((error) => error)
  t.snapshot({
    command,
    stdout,
    stderr: stderr.replace(
      process.cwd(),
      '/LavaMoat/packages/git-safe-dependencies'
    ),
    code,
  })
})

test('npm project', runCliTest, { args: { projectRoot: 'npm' } })
test('npm workspaces project', runCliTest, {
  args: { projectRoot: 'npm-workspaces' },
})
test('npm realistic project', runCliTest, {
  args: { projectRoot: 'npm-realistic' },
})
test('yarn berry project', runCliTest, { args: { projectRoot: 'yarn-berry' } })
test('yarn berry realistic project', runCliTest, {
  args: { projectRoot: 'yarn-berry-realistic' },
})
test('yarn classic project', runCliTest, {
  args: { projectRoot: 'yarn-classic' },
})
test('yarn classic no package project', runCliTest, {
  args: { projectRoot: 'yarn-classic-nopackage' },
})
test('yarn classic realistic project', runCliTest, {
  args: { projectRoot: 'yarn-classic-realistic' },
})
test('yarn classic realistic with ignore', runCliTest, {
  args: {
    projectRoot: 'yarn-classic-realistic',
    ignore: 'yarn-classic-realistic/yarn.lock.ignore.json',
  },
})
test('yarn mmm project', runCliTest, { args: { projectRoot: 'yarn-mmm' } })

test('actions workflow', runCliTest, {
  cli: 'cli-actions.js',
  args: { workflows: 'workflows' },
})
test('actions workflow2 with ignores', runCliTest, {
  cli: 'cli-actions.js',
  args: { workflows: 'workflows2', ignore: 'workflows2/ignore.json' },
})
