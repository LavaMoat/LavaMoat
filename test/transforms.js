const test = require('tape')
const {
    runSimpleOneTwo
} = require('./util')

test("transforms - Ses transforms work", async (t) => {
    function defineOne() {
        const two = require('two')
        module.exports = two
    }
    function defineTwo() {
        const comment = '-->'
        const importString = 'import x from "y"'
        module.exports = {comment, importString}
    }

    const one = await runSimpleOneTwo({ defineOne, defineTwo })
    t.ok(one)
    t.end()
})
