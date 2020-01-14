const {
    runSimpleOneTwo,
    getTape,
} = require('./util')

const test = getTape()


test('endowments - bridged endowments matches original endowments object', async (t) => {
    function defineOne() {
        const two = require('two')
        module.exports = global.testCheck(two)
    }
    function defineTwo() {
        module.exports = global.testGet()
    }
    const testObj = {}
    global.testGet = () => {
        console.log(`Test Get: ${testObj}`)
        return testObj
    }
    global.testCheck = (target) => {
        console.log(`Test Check: target: ${target} testObj: ${testObj}`)
        return target === testObj
    }

    const config = {
        resources: {
            one: {
                globals: {
                    testCheck: true
                }
            },
            two: {
                globals: {
                    testGet: true
                }
            }
        }
    }

    const one = await runSimpleOneTwo({ defineOne, defineTwo, config})

    t.equal(one, true)
})