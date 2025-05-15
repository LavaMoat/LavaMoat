// run this with node to produce the test build to disk
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { scaffold } = require('../../scaffold.js')
const { makeConfig } = require('../../fixtures/main/webpack.config.js')
const webpackConfig = makeConfig({
  // generatePolicy: true,
  policyLocation: path.resolve(__dirname, 'lavamoat'),
})
webpackConfig.entry = {
  app: './postmessage.js',
}
webpackConfig.mode = 'development'
webpackConfig.devtool = false

const cache = new Set()
function assertFolderFor(file) {
  const folder = path.dirname(file)
  if (cache.has(folder)) return
  const target = folder.replace(/^\//, '')
  fs.mkdirSync(path.join('.', target), { recursive: true })
  cache.add(folder)
}

function writeFromSnapshot(snapshot) {
  const files = Object.keys(snapshot)
  for (const file of files) {
    assertFolderFor(file)
    fs.writeFileSync(path.join('.', file), snapshot[file])
  }
}

scaffold(webpackConfig).then(({ stdout, snapshot }) => {
  console.log(stdout)
  writeFromSnapshot(snapshot)

  const handler = async (req, res) => {
    const filePath = path.join(
      __dirname,
      req.url === '/' ? 'index.html' : req.url
    )
    try {
      const content = await fs.promises.readFile(filePath)
      const ext = path.extname(filePath)
      const contentType = ext === '.html' ? 'text/html' : 'text/javascript'
      res.writeHead(200, { 'Content-Type': contentType })
      res.end(content)
    } catch (err) {
      res.writeHead(404)
      res.end('File not found')
    }
  }

  const server = http.createServer(handler)
  server.listen(8080, () => {
    console.log('Server running at http://localhost:8080/')
  })
})
