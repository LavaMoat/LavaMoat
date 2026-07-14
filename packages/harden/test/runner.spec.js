import test from 'ava'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'

const execFileAsync = promisify(execFile)

const PKGMGR_LIST = ['npm', 'pnpm'] // no yarn yet
const PROJECTS_DIR = new URL('./projects/', import.meta.url).pathname

for (const pm of PKGMGR_LIST) {
  test(`.runner.cjs captures scripts in ${pm}`, async (t) => {
    const cwd = join(PROJECTS_DIR, `runner-${pm}`)
    const result = await execFileAsync(pm, ['test'], {
      cwd,
      env: { ...process.env, TOKEN: 'SECRET', BISFOR: 'Bananas' },
    })
    t.log(result.stderr)
    t.regex(result.stdout, /^Absolutely$/gm, 'Expected output not found')
    t.regex(result.stdout, /^Bananas$/gm, 'Expected output not found')
    t.notRegex(
      result.stdout,
      /SECRET/gm,
      'Expected no secret leakage, but SECRET is present'
    )
  })
}
