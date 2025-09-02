import { common } from './common.js'
console.log('this is the app entry point')
if (!common) {
  throw new Error('Common module not working')
}
