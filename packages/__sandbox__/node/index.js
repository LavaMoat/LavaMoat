import { sha256 } from '@noble/hashes/sha2.js'
import { foo } from 'local__package'
const hash = sha256(Uint8Array.from([0xca, 0xfe, 0x01, foo]))
console.log(hash)
