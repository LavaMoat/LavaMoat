import test from 'ava'
import { splitArgs } from '../../src/args.js'

test('splitArgs - bare spec', (t) => {
  t.deepEqual(splitArgs(['cowsay']), {
    optionTokens: [],
    spec: 'cowsay',
    forwardedArgs: [],
  })
})

test('splitArgs - spec with forwarded args', (t) => {
  t.deepEqual(splitArgs(['cowsay', 'hello', 'world']), {
    optionTokens: [],
    spec: 'cowsay',
    forwardedArgs: ['hello', 'world'],
  })
})

test('splitArgs - leading boolean option', (t) => {
  t.deepEqual(splitArgs(['--force', 'cowsay', 'hi']), {
    optionTokens: ['--force'],
    spec: 'cowsay',
    forwardedArgs: ['hi'],
  })
})

test('splitArgs - value option (separate token)', (t) => {
  t.deepEqual(splitArgs(['--cache', '/tmp/x', 'cowsay']), {
    optionTokens: ['--cache', '/tmp/x'],
    spec: 'cowsay',
    forwardedArgs: [],
  })
})

test('splitArgs - value option (equals form)', (t) => {
  t.deepEqual(splitArgs(['--cache=/tmp/x', 'cowsay']), {
    optionTokens: ['--cache=/tmp/x'],
    spec: 'cowsay',
    forwardedArgs: [],
  })
})

test('splitArgs - forwarded flags go to the bin, not lavax', (t) => {
  t.deepEqual(splitArgs(['cowsay', '--help', '-e', 'oO']), {
    optionTokens: [],
    spec: 'cowsay',
    forwardedArgs: ['--help', '-e', 'oO'],
  })
})

test('splitArgs - explicit -- separates spec from forwarded args', (t) => {
  t.deepEqual(splitArgs(['--force', '--', 'cowsay', '--version']), {
    optionTokens: ['--force'],
    spec: 'cowsay',
    forwardedArgs: ['--version'],
  })
})

test('splitArgs - leading -- before forwarded args is dropped once', (t) => {
  t.deepEqual(splitArgs(['cowsay', '--', '--version']), {
    optionTokens: [],
    spec: 'cowsay',
    forwardedArgs: ['--version'],
  })
})

test('splitArgs - only options, no spec', (t) => {
  t.deepEqual(splitArgs(['--help']), {
    optionTokens: ['--help'],
    spec: undefined,
    forwardedArgs: [],
  })
})

test('splitArgs - short value option', (t) => {
  t.deepEqual(splitArgs(['-c', 'mybin', 'pkg', 'arg']), {
    optionTokens: ['-c', 'mybin'],
    spec: 'pkg',
    forwardedArgs: ['arg'],
  })
})
