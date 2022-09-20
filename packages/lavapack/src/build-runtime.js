const build = require('./builder-runtime')

build().catch(err => {
  console.error(err)
  process.exit(1)
})
