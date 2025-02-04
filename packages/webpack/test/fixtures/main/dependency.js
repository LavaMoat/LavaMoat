const fs = require('fs') // this is here also to put fs in the bundle
const result = require('prototype-poisoning-package/tostring')

if (fs === result.fs) {
  throw Error('toString exploit successful')
}
if (result.count > 1) {
  throw Error('toString on a selector called more than once')
}
