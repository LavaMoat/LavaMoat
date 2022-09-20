const build = require('./build-runtime')

build().catch(err => {
  console.error(err)
  process.exit(1)
})
