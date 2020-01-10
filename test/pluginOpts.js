const test = require('tape-promise').default(require('tape'))
const { runAutoConfig } = require('./util')

test("pluginOpts - returns empty config if writeAutoConfig is specified", async (t) => {
    await runAutoConfig(t)
})
