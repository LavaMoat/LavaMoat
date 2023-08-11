import { Plugin } from '@yarnpkg/core'
// eslint-disable-next-line n/no-extraneous-import
import { execute } from '@yarnpkg/shell'

const plugin: Plugin = {
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

export default plugin
