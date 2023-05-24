const ethUtil = require('ethereumjs-util')
const Buffer = require('buffer').Buffer
const BN = require('secp256k1/lib/js/bn')
const ECJPoint = require('secp256k1/lib/js/ecjpoint')
const ECPoint = require('secp256k1/lib/js/ecpoint')

// use globalThis.process to avoid hardcoding value when bundling
const nTimes = Number.parseInt(globalThis.process.env.PERF_N || 5, 10)

// This test is based on a discovered slowdown secp256k1's internals

const passphrase = `brain wallet seed #${0}`
const privKey = ethUtil.keccak256(Buffer.from(passphrase))

const privateKey = privKey
const d = BN.fromBuffer(privateKey)
if (d.isOverflow() || d.isZero()) throw new Error(messages.EC_PUBLIC_KEY_CREATE_FAIL)

// // ECPOINTG
const __this = {}

//   // constructor
__this.x = BN.fromBuffer(Buffer.from('79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798', 'hex'))
__this.y = BN.fromBuffer(Buffer.from('483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8', 'hex'))
__this.inf = false

//   // _precompute
var ecpoint = new ECPoint(__this.x, __this.y)

var dstep = 4
var points = new Array(1 + Math.ceil(257 / dstep))
var acc = points[0] = ecpoint
for (var i = 1; i < points.length; ++i) {
  for (var j = 0; j < dstep; j++) acc = acc.dbl()
  points[i] = acc
}

__this.precomputed = {
  naf: ecpoint._getNAFPoints(7),
  doubles: {
    step: dstep,
    points: points,
    negpoints: points.map(function (p) { return p.neg() })
  }
}

// mul
const num = d
var step = __this.precomputed.doubles.step
var points = __this.precomputed.doubles.points

var naf = num.getNAF(1)

// Translate into more windowed form
var repr = []
for (var j = 0; j < naf.length; j += step) {
  var nafW = 0
  for (var k = j + step - 1; k >= j; k--) nafW = (nafW << 1) + naf[k]
  repr.push(nafW)
}

var b = new ECJPoint(null, null, null)

for (let _index = 0; _index < nTimes; _index++) { 
  b = b.mixedAdd(points[45])
}
