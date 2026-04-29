const { execSync } = require('node:child_process')
const { existsSync, readdirSync } = require('node:fs')
const { join, normalize } = require('node:path')
const { portableExecPath } = require('./utils.js')

// Execute allow-scripts command inside each test project directory
const baseDir = join(__dirname, '../test/projects/')
readdirSync(baseDir, { withFileTypes: true })
  .filter(
    (p) => p.isDirectory() && existsSync(join(baseDir, p.name, 'package.json'))
  )
  .forEach((dir) => {
    console.log(`running "auto" command for project "${dir.name}"...`)
    execSync(
      [
        portableExecPath(process.execPath),
        normalize('../../../src/cli.js'),
        'auto',
        '--experimental-bins',
        dir.name === 'skip_versions' ? '--skip-versions' : '',
      ].join(' '),
      {
        cwd: join(baseDir, dir.name),
        shell: true,
        stdio: 'inherit',
      }
    )
  })
