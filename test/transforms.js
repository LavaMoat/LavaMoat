const {
    runSimpleOneTwo,
    getTape,
} = require('./util')

const test = getTape()


test("transforms - Ses transforms work", async (t) => {
    function defineOne() {
        const two = require('two')
        module.exports = two
    }
    function defineTwo() {
        const comment = '-->'
        const importString = 'import()'
        module.exports = {comment, importString}
    }

    const one = await runSimpleOneTwo({ defineOne, defineTwo })
    t.ok(one)
})
