const { Readable } = require('readable-stream')
const { loadPolicy } = require('lavamoat-core')

module.exports = makePolicyLoaderStream

function makePolicyLoaderStream (lavamoatOpts) {
  const loaderStream = new Readable({
    // ignore eager reads
    read () { return false },
  })
  // asynchronously handle read
  setTimeout(populatePolicyLoaderStream)
  // return stream for immediate consumption
  return loaderStream

  async function populatePolicyLoaderStream () {
    let policyLoaderContent
    try {
      const policy = await loadPolicy(lavamoatOpts)
      policyLoaderContent = `LavaPack.loadPolicy(${JSON.stringify(policy, null, 2)})`
    } catch (err) {
      // forward any error to stream
      loaderStream.destroy(err)
      return
    }
    // forward result to stream
    loaderStream.end(policyLoaderContent)
  }
}