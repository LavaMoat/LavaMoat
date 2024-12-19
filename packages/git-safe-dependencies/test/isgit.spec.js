const test = require('ava')
const { gitInfo } = require('../src/isgit')

test('gitInfo should return correct info for codeload URL', (t) => {
  const url =
    'https://codeload.github.com/naugtur/not-really-a-package/tar.gz/05ba7b1263a4ba5b98eaf5c103432297962c4719'
  const result = gitInfo(url)
  t.is(result.type, 'github')
  t.is(result.user, 'naugtur')
  t.is(result.project, 'not-really-a-package')
  t.is(result.committish, '05ba7b1263a4ba5b98eaf5c103432297962c4719')
})

test('gitInfo should return correct info for https URL', (t) => {
  const url = 'https://github.com/naugtur/not-really-a-package.git'
  const result = gitInfo(url)
  t.is(result.type, 'github')
  t.is(result.user, 'naugtur')
  t.is(result.project, 'not-really-a-package')
  t.is(result.committish, '')
})

test.failing('gitInfo should return correct info for git+http URL', (t) => {
  const url = 'git+http://github.com/naugtur/not-really-a-package'
  const result = gitInfo(url)
  t.is(result.type, 'github')
  t.is(result.user, 'naugtur')
  t.is(result.project, 'not-really-a-package')
  t.is(result.committish, '')
})

test('gitInfo should return correct info for git+https URL', (t) => {
  const url = 'git+https://github.com/naugtur/not-really-a-package'
  const result = gitInfo(url)
  t.is(result.type, 'github')
  t.is(result.user, 'naugtur')
  t.is(result.project, 'not-really-a-package')
  t.is(result.committish, '')
})

test('gitInfo should return correct info for git+https URL with short hash', (t) => {
  const url = 'git+https://github.com/naugtur/not-really-a-package#107f4ad'
  const result = gitInfo(url)
  t.is(result.type, 'github')
  t.is(result.user, 'naugtur')
  t.is(result.project, 'not-really-a-package')
  t.is(result.committish, '107f4ad')
})

test('gitInfo should return correct info for fork-branch URL', (t) => {
  const url = 'naugtur/not-really-a-package#testbranch'
  const result = gitInfo(url)
  t.is(result.type, 'github')
  t.is(result.user, 'naugtur')
  t.is(result.project, 'not-really-a-package')
  t.is(result.committish, 'testbranch')
})

test('gitInfo should return correct info for fork-full-hash URL', (t) => {
  const url =
    'naugtur/not-really-a-package#05ba7b1263a4ba5b98eaf5c103432297962c4719'
  const result = gitInfo(url)
  t.is(result.type, 'github')
  t.is(result.user, 'naugtur')
  t.is(result.project, 'not-really-a-package')
  t.is(result.committish, '05ba7b1263a4ba5b98eaf5c103432297962c4719')
})

test('gitInfo should return correct info for fork-longer-hash URL', (t) => {
  const url = 'naugtur/not-really-a-package#05ba7b1263a4ba5b98'
  const result = gitInfo(url)
  t.is(result.type, 'github')
  t.is(result.user, 'naugtur')
  t.is(result.project, 'not-really-a-package')
  t.is(result.committish, '05ba7b1263a4ba5b98')
})

test('gitInfo should return correct info for fork-merge-hash URL', (t) => {
  const url =
    'naugtur/not-really-a-package#2a0d442b8a68a802b72f6a4a8240d2ae8ef950aa'
  const result = gitInfo(url)
  t.is(result.type, 'github')
  t.is(result.user, 'naugtur')
  t.is(result.project, 'not-really-a-package')
  t.is(result.committish, '2a0d442b8a68a802b72f6a4a8240d2ae8ef950aa')
})

test('gitInfo should return correct info for fork-short-hash URL', (t) => {
  const url = 'naugtur/not-really-a-package#05ba7b1'
  const result = gitInfo(url)
  t.is(result.type, 'github')
  t.is(result.user, 'naugtur')
  t.is(result.project, 'not-really-a-package')
  t.is(result.committish, '05ba7b1')
})

test('gitInfo should return correct info for fork-short-head URL', (t) => {
  const url = 'naugtur/not-really-a-package#1/head'
  const result = gitInfo(url)
  t.is(result.type, 'github')
  t.is(result.user, 'naugtur')
  t.is(result.project, 'not-really-a-package')
  t.is(result.committish, '1/head')
})

test('gitInfo should return correct info for fork-short-merge URL', (t) => {
  const url = 'naugtur/not-really-a-package#1/merge'
  const result = gitInfo(url)
  t.is(result.type, 'github')
  t.is(result.user, 'naugtur')
  t.is(result.project, 'not-really-a-package')
  t.is(result.committish, '1/merge')
})
