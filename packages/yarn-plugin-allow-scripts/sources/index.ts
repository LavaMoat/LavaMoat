import { Plugin, type Hooks } from '@yarnpkg/core'
// eslint-disable-next-line n/no-extraneous-import
import { execute } from '@yarnpkg/shell'

const afterAllInstalled: NonNullable<Hooks['afterAllInstalled']> = async (
  _proj,
  options
) => {
  if (options.mode === 'update-lockfile') {
    return
  }
  const exitCode = await execute('yarn run allow-scripts')

  if (exitCode !== 0) {
    // We have to use `process.exit` here rather than setting `process.exitCode`
    // because Yarn will override any exit code set in this hook.
    process.exit(exitCode)
  }
}

const plugin: Plugin = {
  hooks: {
    afterAllInstalled,
  },
}

export default plugin
