//prettier-ignore
module.exports = {
name: "@yarnpkg/plugin-allow-scripts",
factory: function (/** @type {(arg0: string) => { execute: any; }} */ require) {
    const { execute } = require(`@yarnpkg/shell`);
    return {
      hooks: {
        afterAllInstalled: async () => {
          const exitCode = await execute('yarn run allow-scripts')
          if (exitCode !== 0) {
            process.exit(exitCode)
          }
        },
      },
    }
  }
};
