const fs = require('fs')
const path = require('path')

const htmlPath = path.resolve(__dirname, '../dist/index.html')

// read file
let indexContent = fs.readFileSync(htmlPath, 'utf8')
// fix relative urls
indexContent = indexContent
  .split(`"/metamask-deps-explorer-sesify/`)
  .join(`"./`)
// insert data script
indexContent = indexContent
  .split(`<body>`)
  .join(`<body><script src="./data-injection.js"></script>`)
// write file
fs.writeFileSync(htmlPath, indexContent)
