const path = require('path');
const test = require('ava');
const { loadCanonicalNameMap } = require('../src/index.js');

test('project 1', async t => {
  const canonicalNameMap = await loadCanonicalNameMap({ rootDir: path.join(__dirname, 'projects', '1') });
  // normalize results to be relative
  const normalizedMapEntries = Array.from(canonicalNameMap.entries()).sort()
    .map(([packagePath,canonicalName])=>[path.relative(__dirname,packagePath), canonicalName])
  t.deepEqual(normalizedMapEntries, [
    [
      'projects/1',
      '$root$',
    ],
    [
      'projects/1/node_modules/aaa',
      'aaa'
    ],
    [
      'projects/1/node_modules/bbb',
      'bbb',
    ],
    [
      'projects/1/node_modules/bbb/node_modules/evil_dep',
      'bbb>evil_dep',
    ],
  ])
})

test('project 2', async t => {
  const canonicalNameMap = await loadCanonicalNameMap({ rootDir: path.join(__dirname, 'projects', '2') });
  // normalize results to be relative
  const normalizedMapEntries = Array.from(canonicalNameMap.entries()).sort()
    .map(([packagePath,canonicalName])=>[path.relative(__dirname,packagePath), canonicalName])
  t.deepEqual(normalizedMapEntries, [
    [
      'projects/2',
      '$root$',
    ],
    [
      'projects/2/node_modules/aaa',
      'aaa',
    ],
    [
      'projects/2/node_modules/bbb',
      'bbb',
    ],
    [
      'projects/2/node_modules/bbb/node_modules/evil_dep',
      'bbb>evil_dep',
    ],
    [
      'projects/2/node_modules/good_dep',
      'good_dep',
    ]
  ])
})

test('project 3', async t => {
  const canonicalNameMap = await loadCanonicalNameMap({ rootDir: path.join(__dirname, 'projects', '3') });
  // normalize results to be relative
  const normalizedMapEntries = Array.from(canonicalNameMap.entries()).sort()
    .map(([packagePath,canonicalName])=>[path.relative(__dirname,packagePath), canonicalName])
  t.deepEqual(normalizedMapEntries, [
    [
      'projects/3',
      '$root$',
    ],
    [
      'projects/3/node_modules/aaa',
      'aaa',
    ],
    [
      'projects/3/node_modules/bbb',
      'bbb',
    ],
    [
      'projects/3/node_modules/bbb/node_modules/good_dep',
      'bbb>good_dep',
    ],
    [
      'projects/3/node_modules/evil_dep',
      'evil_dep',
    ],
  ])
})