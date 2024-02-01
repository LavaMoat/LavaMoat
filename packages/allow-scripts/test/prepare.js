const { execSync } = require('child_process')
const { readdirSync } = require('node:fs')
const { join, normalize } = require('node:path')

// Execute allow-scripts command inside each test project directory
readdirSync(join(__dirname, '../test/projects/'), { withFileTypes: true })
  .filter((p) => p.isDirectory())
  .forEach((dir) => {
    try {
      execSync(`node ${normalize('../../../src/cli.js')} auto --experimental-bins`, {
        cwd: join(__dirname, '../test/projects/', dir.name),
        stdio: 'inherit',
      })
    } catch (e) {
      // ignore expected error
      if (e.status !== 1) {
        throw e
      }
    }
  })
