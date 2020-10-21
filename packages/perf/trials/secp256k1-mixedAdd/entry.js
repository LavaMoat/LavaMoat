const ethUtil = require('ethereumjs-util')
const Buffer = require('safe-buffer').Buffer

// use `global.process` so it works correctly under node
const nTimes = Number.parseInt(global.process.env.PERF_N || 5, 10)

const passphrase = `brain wallet seed #${0}`
const privKey = ethUtil.keccak256(Buffer.from(passphrase))
const BN = require('secp256k1/lib/js/bn')
const ECJPoint = require('secp256k1/lib/js/ecjpoint')
const ECPoint = require('secp256k1/lib/js/ecpoint')


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
  var negpoints = __this.precomputed.doubles.negpoints

  var naf = num.getNAF(1)
  var I = ((1 << (step + 1)) - (step % 2 === 0 ? 2 : 1)) / 3

  // Translate into more windowed form
  var repr = []
  for (var j = 0; j < naf.length; j += step) {
    var nafW = 0
    for (var k = j + step - 1; k >= j; k--) nafW = (nafW << 1) + naf[k]
    repr.push(nafW)
  }

  var a = new ECJPoint(null, null, null)
  var b = new ECJPoint(null, null, null)

Array(nTimes).fill().forEach((_, index) => {

  b = b.mixedAdd(points[45])

  // // mixedAdd
  // const _this = b
  // const p = points[45]

  // if (_this.inf) {
  //   b = p.toECJPoint()
  //   return
  // }

  // // P + O = P
  // if (p.inf) {
  //   b = _this
  //   return
  // }

  // // http://hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html#addition-add-1998-cmo-2
  // //   with p.z = 1
  // // 8M + 3S + 7A
  // var z2 = _this.z.redSqr()
  // var u1 = _this.x
  // var u2 = p.x.redMul(z2)
  // var s1 = _this.y
  // var s2 = p.y.redMul(z2).redMul(_this.z)

  // var h = u1.redSub(u2)
  // var r = s1.redSub(s2)
  // if (h.isZero()) {
  //   if (r.isZero()) {
  //     b = _this.dbl()
  //     return
  //   }
  //   b = new ECJPoint(null, null, null)
  //   return
  // }

  // var h2 = h.redSqr()
  // var v = u1.redMul(h2)
  // var h3 = h2.redMul(h)

  // var nx = r.redSqr().redIAdd(h3).redISub(v).redISub(v)
  // var ny = r.redMul(v.redISub(nx)).redISub(s1.redMul(h3))
  // var nz = _this.z.redMul(h)

  // b = new ECJPoint(nx, ny, nz)
})


// what is slow?
// cross realm back-and-forth?
// would package realm-sharing improve perf?
// seems like `getAddressString` imparts a large slowdown
// cross realm BN ops?

// (task name): (lavamoat), (lavamoat+harden)
// full wallet: 4.2, 3.7
// ----------------------
// keccak: 2.9, 2.0
// privateToPublic: 4.6, 4.0
// publicToAddress: 2.2, 2.0
// bufferToHex: 2.6, 2.4

// publicKeyCreate: 4.7
// g.mul(d).toPublicKey(false): 4.8
// g.mul(d): 4.9

// ( then i started calculating time differently )

// g.mul(d): 5.7
// full mul: 5.4
// mul wo from ecj: 5.8
// naf+repr: 3.0
// naf: 3.0
// new ECJPoint + ecj for-for: 5.6
// new ECJPoint: 184.2, 192.8 (wow! but still fast)
// ecj for-for: 5.6
// b-only: 5.6
// mixedAdd: 6.0, 6.0

// de-sandboxing mas minor effect
// time 4.6 -> 3.6
// slow 5.7 -> 6.3

// redMul: 6.2, 6.2
// uMul: 7.0, 7.0
// manual uMul: 14.0, 13.2
// new BN, new Array: 54.5, 54.1
// new BN: 79.1, 78.5
// new Array: 3.4, 3.3
// uMul if-chain: 2.7, 2.7
