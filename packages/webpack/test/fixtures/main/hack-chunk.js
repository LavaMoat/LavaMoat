const chunkLoader = require('chunk-loader')

Promise.resolve()
  .then(() => chunkLoader.loadChunk(CHUNK_ID))
  .then(() => TEST_FINISHED(), TEST_FINISHED)
