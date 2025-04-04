const test = require('ava')
const { analyze } = require('../src/analyze.js')

test('analyze reports when package count changes for no good reason', (t) => {
  const previousJson = {
    resources: {
      'pkg>foo': {
        packages: { bar: true },
      },
    },
  }
  const currentJson = {
    resources: {
      'pkg>foo': {
        packages: { bar: true },
      },
      'other>foo': {
        packages: { bar: true },
      },
    },
  }

  const result = analyze(previousJson, currentJson)
  t.snapshot(result)
})

test('analyze reports when package count changes because there is a new dependent', (t) => {
  const previousJson = {
    resources: {
      pkg: {
        packages: { 'pkg>foo': true },
      },
      'pkg>foo': {
        packages: { bar: true },
      },
    },
  }
  const currentJson = {
    resources: {
      pkg: {
        packages: { 'pkg>foo': true },
      },
      other: {
        packages: { 'other>foo': true },
      },
      'pkg>foo': {
        packages: { bar: true },
      },
      'other>foo': {
        packages: { bar: true },
      },
    },
  }

  const result = analyze(previousJson, currentJson)
  t.snapshot(result)
})

test('analyze reports nothing when no changes', (t) => {
  const previousJson = {
    resources: {
      'pkg>foo': {
        packages: { bar: true },
      },
    },
  }
  const currentJson = {
    resources: {
      'pkg>foo': {
        packages: { bar: true },
      },
    },
  }

  const result = analyze(previousJson, currentJson)
  t.snapshot(result)
})

test('analyze reports changes in dependency tree', (t) => {
  const previousJson = {
    resources: {
      'a>pkg': {
        packages: { 'a>pkg>foo': true },
      },
      'a>other': {
        packages: { 'a>pkg>foo': true },
      },
      'a>pkg>foo': {
      },
    },
  }
  const currentJson = {
    resources: {
      'a>pkg': {
        packages: { 'a>foo': true },
      },
      'a>other': {
        packages: { 'a>foo': true },
      },
      'a>foo': {
      },
    },
  }

  const result = analyze(previousJson, currentJson)
  t.snapshot(result)
})

test('analyze handles complex nested dependency structures', (t) => {
  // CHANGES between previous and current:
  //
  // FOO COPIES:
  // Previous had 3 copies:     Current has 3 copies:
  // - pkg>dep1>foo            - pkg>dep1>foo (unchanged)
  // - pkg>dep2>other>foo      - pkg>dep4>sub>foo (new)
  // - pkg>dep3>foo            - pkg>dep5>other>foo (new)
  //
  // DEPENDENTS:
  // Previous:                  Current:
  // - consumer1 uses 2 copies  - consumer1 uses 2 copies
  // - consumer2 uses 1 copy    - consumer3 uses 1 copy (consumer2 removed)

  const previousJson = {
    resources: {
      'pkg>dep1>foo': {},
      'pkg>dep2>other>foo': {},
      'pkg>dep3>foo': {},
      'pkg>dep1': {
        packages: {
          'pkg>dep1>foo': true,
        },
      },
      'pkg>dep2': {
        packages: {
          'pkg>dep2>other>foo': true,
        },
      },
      'pkg>dep3': {
        packages: {
          'pkg>dep3>foo': true,
        },
      },
      'pkg>consumer1': {
        packages: {
          'pkg>dep1>foo': true,
          'pkg>dep2>other>foo': true,
        },
      },
      'pkg>consumer2': {
        packages: {
          'pkg>dep3>foo': true,
        },
      },
    },
  }

  const currentJson = {
    resources: {
      'pkg>dep1>foo': {},
      'pkg>dep4>sub>foo': {},
      'pkg>dep5>other>foo': {},
      'pkg>dep1': {
        packages: {
          'pkg>dep1>foo': true,
        },
      },
      'pkg>dep4': {
        packages: {
          'pkg>dep4>sub>foo': true,
        },
      },
      'pkg>dep5': {
        packages: {
          'pkg>dep5>other>foo': true,
        },
      },
      'pkg>consumer1': {
        packages: {
          'pkg>dep1>foo': true,
          'pkg>dep4>sub>foo': true,
        },
      },
      'pkg>consumer3': {
        packages: {
          'pkg>dep5>other>foo': true,
        },
      },
    },
  }

  const result = analyze(previousJson, currentJson)
  t.snapshot(result)
})
