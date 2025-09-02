import { common } from './common.js'
console.log(new URL('./common.js', import.meta.url))
console.log('this is the bootstrap entry point')
if (!common) {
  throw new Error('Common module not working')
}
