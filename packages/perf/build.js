const fs = require('fs')
const browserify = require('browserify')
const lavamoatPlugin = require('lavamoat-browserify')
const { pipeline } = require('stream')

// "autogen": "--plugin [ lavamoat-browserify --writeAutoPolicy --policy ./lavamoat-policy.json ] > /dev/null",
// "default": "--plugin [ lavamoat-browserify --policy ./lavamoat-policy.json ] > bundle.js",
// "harden": "--plugin [ lavamoat-browserify --policy ./lavamoat-policy-harden.json ] > bundle.js",
// "unsafe": "> bundle.js",

const buildTarget = process.env.TARGET
const useLavamoat = buildTarget !== 'unsafe'
const policyName = buildTarget
const destPath = `./bundle/${buildTarget}.js`
const writeAutoPolicy = true

const plugin = []

// add lavamoat
if (useLavamoat) {
  plugin.push([lavamoatPlugin, {
    writeAutoPolicy,
    policyName: policyName,
  }])
}

// configure bundler
const bundler = browserify(['./entry.js'], {
  plugin,
  ...(useLavamoat && lavamoatPlugin.args),
})

// build

async function main () {
  fs.mkdirSync('./bundle', { recursive: true })
  await performBundle()
  // workaround for lavamoat-browserify - need to rebuild after policy is written
  if (useLavamoat) {
    await performBundle()
  }
}

function performBundle () {
  return new Promise((resolve, reject) => {
    pipeline(
      bundler.bundle(),
      fs.createWriteStream(destPath),
      (err, bundle) => {
        if (err) {
          return reject(err)
        }
        resolve(bundle)
      },
    )
  })
}
