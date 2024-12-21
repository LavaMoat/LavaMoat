// @ts-check

const { execute } = require('@yarnpkg/shell')

/**
 * @import {Plugin} from '@yarnpkg/core'
 */

module.exports = /** @type {Plugin} */ {
  hooks: {
    afterAllInstalled: async () => {
      const exitCode = await execute('yarn run allow-scripts')

      if (exitCode !== 0) {
        // We have to use `process.exit` here rather than setting `process.exitCode`
        // because Yarn will override any exit code set in this hook.
        // eslint-disable-next-line n/no-process-exit
        process.exit(exitCode)
      }
    },
  },
}
