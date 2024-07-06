import test from 'ava'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import { SpawnSyncOptions } from 'node:child_process'
import { spawnSync } from 'node:child_process'
import { getCli, runExit } from '@yarnpkg/cli';
import type { type PortablePath} from '@yarnpkg/fslib';

const isWindows = os.platform() === 'win32'
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
const run = async (
  t: any,
  args: string[],
  cwd: string,
  //options: any = realisticEnvOptions(cwd),
): Promise<void> => {
  // const result = execute(process.execPath, [cmd, ...args], options)
  //const result = await execute(cmd, args, options)
  try {
    // await runExit([cmd, ...args], options)
    const { defaultContext }  = await getCli({
      cwd: cwd as PortablePath,
    });
    console.error({defaultContext})
    await runExit(args, {
      cwd: cwd as PortablePath,
      selfPath: null,
      pluginConfiguration: defaultContext.plugins,
      //stderr: process.stderr,
      //stdout: process.stderr,
    })
  } catch(error) {
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
  }
}

test('cli - auto command', async (t: any) => {
  // set up the directories
  let projectRoot = path.join(path.dirname(import.meta.url), 'projects', '1')

  // delete any existing package.json
  ////fs.rmSync(path.join(projectRoot, PACKAGE_JSON), { force: true })

  // yarn init -y
  await run(
    t,
    ['init', '-y'],
    projectRoot,
  )

  // sttempt installing the plugin
  await run(t, ['yarn', 'plugin', 'import', '../../../bundles/@yarnpkg/plugin-allow-scripts.js'], projectRoot)

  /*
  // get the package.json
  const packageJsonContents = JSON.parse(
    fs.readFileSync(
      pathToFileURL(
        path.join(projectRoot.replace(path.sep, '/'), PACKAGE_JSON),
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
    env: { ...process.env, INIT_CWD: projectRoot },
    encoding: 'utf-8',
    // stdio: [null, null],
  }
}
