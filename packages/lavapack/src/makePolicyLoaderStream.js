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
      const { debugMode, policy: policyPath, policyOverride: policyOverridePath } = lavamoatOpts
      const policy = await loadPolicy({ debugMode, policyPath, policyOverridePath })
      policyLoaderContent = `LavaPack.loadPolicy(${JSON.stringify(policy, null, 2)})`
    } catch (err) {
      // forward any error to stream
      loaderStream.destroy(err)
      return
    }
    // forward result to stream
    loaderStream.push(policyLoaderContent)
    // end stream
    loaderStream.push(null)
  }
}