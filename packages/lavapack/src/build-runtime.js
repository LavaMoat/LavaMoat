const start = require('./builder-runtime')

start().catch(err => {
  console.error(err)
  process.exit(1)
})
