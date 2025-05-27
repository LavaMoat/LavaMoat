import { askMe } from 'globals-package'

const values = askMe(['self', 'window', 'top', 'parent'])
assert(!!values.self, 'Expected values.self to exist')
assert(values.top !== undefined, 'values.top should not be undefined')
assert(globalThis.top === values.top, 'globalThis.top should match values.top')
assert(
  globalThis.parent === values.parent,
  'globalThis.parent should match values.parent'
)
assert(
  values.window === values.self,
  'globalThis.window should match values.self'
)
