const test = require('tape')
const { runAutoConfig } = require('./util')

test("pluginOpts - returns empty config if writeAutoConfig is specified", async (t) => {
    await runAutoConfig(t)
    t.end()
})
