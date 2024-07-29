import test from 'ava'
import { platform } from 'node:os'
import { rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { SpawnSyncOptions } from 'node:child_process'
import { spawnSync } from 'node:child_process'

const isWindows = platform() === 'win32'
const YARN_CMD = isWindows ? 'yarn.cmd' : 'yarn'

/**
 * For fat fingers
 */
const PACKAGE_JSON = 'package.json'

/**
 * Execute allow-scripts binaries with the given arguments
 *
 * @param t Ava test object
 * @param args Arguments to pass
 * @param cwd Working directory to execute command from
 * @returns Process result
 */
const run = (
  t: any,
  args: string[],
  cwd: string,
  env: {} = {},
): {exitCode: number|null, out: string, err: string} => {
  try {
    console.log({cwd, env})
    const result = spawnSync(
      YARN_CMD,
      args,
      {
        env: {
          ...process.env,
          ...realisticEnvOptions(cwd),
          ...env,
        }
      },
    )
    console.log({result})
    return {
      exitCode: result.status,
      out: result.stdout.toString().trim(),
      err: result.stderr.toString().trim(),
    }
  } catch(error) {
    console.error(error);
    t.fail(
      `Failed calling '${args.join(' ')}': ${JSON.stringify(
        {
          cwd,
          error,
        },
        undefined,
        2
      )}`
    )
    return {
      exitCode: null,
      out: '',
      err: '',
    };
  }
}

test('cli - auto command', async (t: any) => {
  // set up the directories
  const projectRoot = join(dirname(import.meta.url.replace(/^file:/, '')), 'projects', 'uninitialized')

  // delete any leftover test artefacts
  rmSync(join(projectRoot, PACKAGE_JSON), { force: true })

  // init project
  const initRes = run(t, ['init', '-y'], projectRoot)
  t.is(initRes.exitCode, 0);

  // install the plugin
  const importRes = run(t, ['plugin', 'import', '../../../bundles/@yarnpkg/plugin-allow-scripts.js'], projectRoot)
  t.is(importRes.err, '');
  t.regex(importRes.out, /YN0000: Saving the new plugin in .yarn\/plugins\/@yarnpkg\/plugin-allow-scripts.cjs/);
  t.is(importRes.exitCode, 0);

  const addRes = run(t, ['add', '@lavamoat/preinstall-always-fail'], projectRoot)
  t.is(addRes.err, '');
  t.regex(addRes.out, /YN0000:.*Completed/);
  t.is(addRes.exitCode, 0);

  // trigger the plugin
  const installRes = run(t, ['install'], projectRoot)
  t.is(installRes.err, '');
  t.regex(installRes.out, /allow-scripts detected attempted execution of unconfigured package script. {"npm_package_name":"@lavamoat\/preinstall-always-fail","npm_lifecycle_event":"preinstall"/);
  t.is(installRes.exitCode, 1);


  /*
  // get the package.json
  const packageJsonContents = JSON.parse(
    readFileSync(
      pathToFileURL(
        join(projectRoot.replace(sep, '/'), PACKAGE_JSON),
        'utf8'
      )
    )
  )

  // assert its contents
  t.deepEqual(packageJsonContents.lavamoat, {
    allowScripts: {
      'bbb>evil_dep': false,
    },
  })
  */
})

function realisticEnvOptions(projectRoot: string): SpawnSyncOptions {
  return {
    cwd: projectRoot,
    env: {
      PATH: process.env.PATH,
      COREPACK_ENABLE_NETWORK: '1',
      COREPACK_DEFAULT_TO_LATEST: '1',
      COREPACK_AUTO_PIN: '1',
      COREPACK_ENABLE_PROJECT_SPEC: '0',
      COREPACK_ENABLE_STRICT: '0',
    },
    encoding: 'utf-8',
    shell: true,
  }
}
