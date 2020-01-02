const test = require('tape')
const index = require('../src/index')
const { runAutoConfig } = require('./util')

test("pluginOpts - returns empty config if writeAutoConfig is specified", async (t) => {
    runAutoConfig(t)
    t.end()
})
