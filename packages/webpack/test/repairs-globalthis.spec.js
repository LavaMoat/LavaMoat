const test = /** @type {import('ava').TestFn} */ (require('ava'))
const { runChunks } = require('./scaffold.js')
const { readFileSync } = require('node:fs')

function lyingGlobalThis() {
  const hiddenProto = new Proxy(
    Object.create({
      addEventListener: function () {
        return 42
      },
    }),
    {
      getPrototypeOf() {
        return null
      },
    }
  )
  Object.setPrototypeOf(Object.getPrototypeOf(globalThis), hiddenProto)
}

function assertGlobalThisLies() {
  if (!globalThis.addEventListener) {
    throw Error('no addEventListener on globalThis')
  }
  let current = globalThis
  while (current) {
    if (Object.getOwnPropertyNames(current).includes('addEventListener')) {
      throw Error(
        'addEventListener should not be among discoverable properties before repair'
      )
    }
    current = Object.getPrototypeOf(current)
  }
}

function assertRepairWorks() {
  if (!globalThis.addEventListener) {
    throw Error('no addEventListener on globalThis after repair')
  }
  const props = Object.getOwnPropertyNames(globalThis)
  if (!props.includes('addEventListener')) {
    throw Error(
      'addEventListener should be among discoverable properties after repair'
    )
  }
  if (globalThis.addEventListener() !== 42) {
    throw Error(
      'addEventListener should be the one from hidden prototype, not replaced with the one from window'
    )
  }
}

test.before(() => {
  // sanity check that our lyingGlobalThis setup is working as intended
  runChunks([
    lyingGlobalThis.toString(),
    assertGlobalThisLies.toString(),
    `
    lyingGlobalThis()
    assertGlobalThisLies()
    `,
  ])
})

test('repairs/globalthis - enables listing properties on hidden prototype in globalThis', (t) => {
  const repair = readFileSync(
    require.resolve('../src/runtime/repairs/globalthis')
  )
  // The repair relies on `window` prototype chain containing properties with names matching the ones secretly available on globalThis
  t.notThrows(() =>
    runChunks(
      [
        lyingGlobalThis.toString(),
        assertRepairWorks.toString(),
        'lyingGlobalThis()',
        repair,
        `assertRepairWorks()`,
      ],
      {
        window: Object.create(EventTarget.prototype),
      }
    )
  )
})
