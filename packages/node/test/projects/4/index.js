// this is an integration test
// of importing a package with a name that overlaps with a builtin

const eventsA = require('a')
const eventsB = require('b')

eventsA.once('hello', () => console.log('hi from a'))
eventsB.once('hello', () => console.log('hi from b'))

eventsA.emit('hello')
eventsB.emit('hello')