const { execSync } = require('node:child_process')
const { existsSync, readdirSync } = require('node:fs')
const { join, normalize } = require('node:path')

// Execute allow-scripts command inside each test project directory
const baseDir = join(__dirname, '../test/projects/')
readdirSync(baseDir, { withFileTypes: true })
  .filter((p) => p.isDirectory() && existsSync(join(baseDir, p.name, 'package.json')))
  .forEach((dir) => {
    execSync(
      [process.execPath, normalize('../../../src/cli.js'), 'auto', '--experimental-bins'].join(' '),
      {
        cwd: join(baseDir, dir.name),
        stdio: 'inherit',
      }
    )
  })
