import 'commonjs-package'
import { common } from './common.js'

console.log(new URL('./common.js', import.meta.url).protocol)
console.log('this is the bootstrap entry point')
if (!common) {
  throw new Error('Common module not working')
}
