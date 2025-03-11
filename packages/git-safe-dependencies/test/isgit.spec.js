const test = require('ava')
const { gitInfo, isGitUrl, isGitSpecifier } = require('../src/isgit')

test('isGitUrl should identify git URLs correctly', (t) => {
  t.plan(9)
  t.true(isGitUrl('git+https://github.com/user/repo'))
  t.true(isGitUrl('github:user/repo'))
  t.true(isGitUrl('git://github.com/user/repo'))
  t.true(isGitUrl('https://github.com/user/repo'))
  t.true(isGitUrl('git+ssh://git@github.com/user/repo'))
  t.true(isGitUrl('git@github.com:user/repo'))
  t.false(isGitUrl('not-a-git-url'))
  t.false(isGitUrl('npm:@types/bn.js@^4.11.6'))
  t.false(isGitUrl('user/repo'))
})

test('isGitSpecifier should identify git specifiers correctly', (t) => {
  t.plan(7)
  t.true(isGitSpecifier('git+https://github.com/user/repo'))
  t.true(isGitSpecifier('github:user/repo'))
  t.true(isGitSpecifier('user/repo'))
  t.true(isGitSpecifier('organization/repo-name'))
  t.false(isGitSpecifier('not/a/valid/repo/path'))
  t.false(isGitSpecifier('npm:@types/bn.js@^4.11.6'))
  t.false(isGitSpecifier('just-package-name'))
})

test('isGitSpecifier should handle various formats', (t) => {
  t.plan(5)
  t.true(isGitSpecifier('user/repo#branch'))
  t.true(isGitSpecifier('user/repo#commit-hash'))
  t.true(isGitSpecifier('github:user/repo#tag'))
  t.true(isGitSpecifier('git+https://github.com/user/repo.git'))
  t.false(isGitSpecifier('https://not-github.com/user/repo'))
})

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

test('gitInfo should return correct info for git+http URL', (t) => {
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
