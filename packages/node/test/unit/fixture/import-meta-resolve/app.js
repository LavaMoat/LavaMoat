import { nestedMetaUrl, resolvedFromNested } from 'helper'

const resolvedBuiltin = import.meta.resolve('node:path') === 'node:path'
const resolvedSelf = import.meta.resolve('./app.js').endsWith('/app.js')
const nestedMetaUrlCorrect = nestedMetaUrl.endsWith('/helper/lib/nested.js')

export {
  nestedMetaUrlCorrect,
  resolvedBuiltin,
  resolvedFromNested,
  resolvedSelf,
}
