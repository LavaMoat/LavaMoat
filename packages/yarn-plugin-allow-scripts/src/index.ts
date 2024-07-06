import { runAllowedPackages } from '@lavamoat/allow-scripts'
import { Plugin } from '@yarnpkg/core'
import { getCli } from '@yarnpkg/cli'
// import fs from 'fs';
// import { getCli, runExit } from '@yarnpkg/cli'

const plugin: Plugin = {
  hooks: {
    afterAllInstalled: async () => {
      const { defaultContext } = await getCli()
      runAllowedPackages({rootDir: defaultContext.cwd})
      /*
      console.error('Foo', JSON.stringify(defaultContext))
      await runExit(['run', 'allow-scripts'], {
        cwd: defaultContext.cwd,
        selfPath: null,
        pluginConfiguration: defaultContext.plugins,
      })
      */
    },
  },
}

export default plugin
