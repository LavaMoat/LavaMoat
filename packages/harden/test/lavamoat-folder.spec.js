import test from 'ava'
import { constants } from 'node:fs'
import { access, mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { applyLavamoatFolder } from '../src/tools/lavamoat-folder.js'

test('applyLavamoatFolder writes executable files for string entries', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'harden-lavamoat-folder-'))

  await applyLavamoatFolder(cwd, [
    {
      target: '/lavamoat',
      key: '.runner-plugin.js',
      value: 'module.exports = {}\n',
    },
  ])

  const filePath = join(cwd, 'lavamoat', '.runner-plugin.js')

  await t.notThrowsAsync(access(filePath, constants.X_OK))
})
