// resolving this one relies on using the native require resolver because it doesn't have a main in package.json, but uses exports instead.
// meanwhile, "b" is a normal package with a main field, but linked from above the project root, so the native resolver will resolve the symlink to the target path and force a fallback to implementation in resolve package.
const { action } = require('a')

const result = action()

console.log(`sha256: ${result.toString('hex')}`)
