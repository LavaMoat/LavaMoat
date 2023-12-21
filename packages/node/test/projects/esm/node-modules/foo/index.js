import { stuff } from '#stuff'
import util from 'node:util'
import { foo } from './a.cjs'

console.log(util.format('foo is %s', foo))

export { foo, stuff }
export default foo
