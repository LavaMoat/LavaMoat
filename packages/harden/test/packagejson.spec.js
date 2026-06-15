import test from 'ava'
import { mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { applyPackageJson } from '../src/tools/packagejson.js'

test('applyPackageJson supports nested fields via array paths', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'harden-pkgjson-nested-'))
  const filePath = join(cwd, 'package.json')
  await writeFile(filePath, JSON.stringify({ name: 'fixture' }, null, 2) + '\n')

  const changed = await applyPackageJson(cwd, [
    {
      target: 'package.json',
      key: ['lavamoat', 'allowScripts'],
      value: {},
    },
  ])

  const pkg = JSON.parse(await readFile(filePath, 'utf8'))
  t.deepEqual(pkg.lavamoat, { allowScripts: {} })
  t.deepEqual(changed, [
    {
      file: 'package.json',
      key: ['lavamoat', 'allowScripts'],
      value: {},
    },
  ])
})

test('applyPackageJson supports nested fields with literal dots in segments via array keys', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'harden-pkgjson-escaped-'))
  const filePath = join(cwd, 'package.json')
  await writeFile(filePath, JSON.stringify({ name: 'fixture' }, null, 2) + '\n')

  const changed = await applyPackageJson(cwd, [
    {
      target: 'package.json',
      key: ['devDependencies', '@lavamoat/allow-scripts'],
      value: '^5.0.2',
    },
  ])

  const pkg = JSON.parse(await readFile(filePath, 'utf8'))
  t.is(pkg.devDependencies?.['@lavamoat/allow-scripts'], '^5.0.2')
  t.deepEqual(changed, [
    {
      file: 'package.json',
      key: ['devDependencies', '@lavamoat/allow-scripts'],
      value: '^5.0.2',
    },
  ])
})

test('applyPackageJson preserves existing devDependencies when adding another item', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'harden-pkgjson-devdeps-'))
  const filePath = join(cwd, 'package.json')
  await writeFile(
    filePath,
    JSON.stringify(
      {
        name: 'fixture',
        devDependencies: {
          ava: '^6.0.0',
        },
      },
      null,
      2
    ) + '\n'
  )

  const changed = await applyPackageJson(cwd, [
    {
      target: 'package.json',
      key: ['devDependencies', '@lavamoat/allow-scripts'],
      value: '^5.0.2',
    },
  ])

  const pkg = JSON.parse(await readFile(filePath, 'utf8'))
  t.deepEqual(pkg.devDependencies, {
    ava: '^6.0.0',
    '@lavamoat/allow-scripts': '^5.0.2',
  })
  t.deepEqual(changed, [
    {
      file: 'package.json',
      key: ['devDependencies', '@lavamoat/allow-scripts'],
      value: '^5.0.2',
    },
  ])
})
