const { createScenarioFromScaffold } = require('../util.js')

module.exports = [
  async () => {
    const storage = {}
    return createScenarioFromScaffold({
      name: 'policyEvasion - package should not be evaluated before policy check',
      defaultPolicy: false,
      config: {
        resources: {
          one: {
            packages: {
              two: true,
            },
            builtin: {
              fs: true,
            },
          },
          two: {
            packages: {},
          },
          three: {
            // This package should never be imported, it's allowed fs just to verify whether it was
            builtin: {
              fs: true,
            },
          },
        },
      },
      // Supply the Node builtin to the harness so policy can grant it to a package.
      builtin: {
        fs: {
          writeFileSync(path, contents) {
            storage[path] = contents
          },
          existsSync(path) {
            return path in storage
          },
        },
      },
      defineOne: () => {
        const fs = require('fs')
        const { importAllowed } = require('two')
        module.exports = { importAllowed, pocWritten: fs.existsSync('poc.txt') }
      },
      defineTwo: () => {
        // vulnerable-package deliberately tries a denied import
        exports.importAllowed = true
        try {
          require('three')
        } catch (err) {
          exports.importAllowed = false
        }
      },
      defineThree: () => {
        // This package should not execute when two imports it,
        // because policy does not allow that dependency edge.
        // In the vulnerable behavior, the file write still happens.
        const fs = require('fs')
        fs.writeFileSync(
          'poc.txt',
          'package executed before LavaMoat denied the import\n'
        )
      },
      expectedResult: {
        importAllowed: false,
        pocWritten: false,
      },
    })
  },
]
