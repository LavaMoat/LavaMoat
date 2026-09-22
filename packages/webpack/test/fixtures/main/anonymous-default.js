import anonymousDefault from './src/anonymous-default.mjs'

// `report` is supplied as a global by the test.
report({ name: anonymousDefault.name, result: anonymousDefault() })
