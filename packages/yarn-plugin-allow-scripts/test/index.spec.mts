import test from 'ava'
import { existsSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'
import { SpawnSyncOptions } from 'node:child_process'
import { spawnSync } from 'node:child_process'
import { npmRunPath } from 'npm-run-path';

const isWindows = process.platform === 'win32';
const portablePath = isWindows
  ? (p: string) => p.replace(/^[\\]/, '')
  : (p: string) => p

const cleanup = (projectName: string) => {
  const projectRoot = join(dirname(import.meta.url.replace(/^file:/, '')), 'projects', projectName)
  // post-test cleanup of messy `yarn init`
  spawnSync(
    'corepack',
    [
      'npm@9',
      'exec',
      'rimraf',
      '.git',
      '.yarn',
    ],
    {
      cwd: projectRoot,
      encoding: 'utf-8',
      shell: isWindows,
    },
  );
  spawnSync(
    'git',
    [
      'clean',
      '-fdx',
      normalize(`test/projects/${projectName}`),
    ],
    {
      encoding: 'utf-8',
      shell: isWindows,
    },
  );
  spawnSync(
    'git',
    [
      'restore',
      normalize(`test/projects/${projectName}/`),
    ],
    {
      encoding: 'utf-8',
      shell: isWindows,
    },
  );
};

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
): {exitCode: number|null, out: string, err: string, output: (string|Buffer|null)[], signal: string|null, error?: Error|undefined} => {
  try {
    const defaultOpts = realisticEnvOptions(cwd);
    const result = spawnSync(
      isWindows
        ? process.env.COMSPEC || 'cmd.exe'
        : process.env.SHELL || '/bin/sh',
      [
        ...(isWindows ? ['/d', '/s', '/c'] : ['-c']),
        [
          isWindows ? 'corepack.cmd' : 'corepack',
          'yarn@4',
          ...args
        ].join(' '),
      ],
      {
        ...defaultOpts,
        env: {
          ...process.env,
          ...defaultOpts.env,
          ...env,
        }
      },
    )
    return {
      exitCode: result.status,
      out: result?.stdout?.toString()?.trim(),
      err: result?.stderr?.toString()?.trim(),
      output: result?.output,
      signal: result.signal,
      error: result.error,
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
      error,
      output: [],
      exitCode: null,
      signal: null,
      out: '',
      err: '',
    };
  }
}

test('install - errors when adding dependency with unspecified preinstall script', async (t: any) => {
  const projectName = 'uninitialized';
  const projectRoot = join(dirname(import.meta.url.replace(/^file:/, '')), 'projects', projectName);

  try {
    // init project
    const initRes = run(t, ['init', '-y'], projectRoot)
    t.is(initRes.exitCode, 0);

    // install the plugin
    const importRes = run(t, ['plugin', 'import', normalize('../../../bundles/@yarnpkg/plugin-allow-scripts.js')], projectRoot)
    t.is(importRes.err, '');
    t.regex(importRes.out, /YN0000: Saving the new plugin in .yarn\/plugins\/@yarnpkg\/plugin-allow-scripts.cjs/);
    t.is(importRes.exitCode, 0);

    const addRes = run(t, ['add', '@lavamoat/preinstall-always-fail'], projectRoot)
    t.regex(addRes.err, /allow-scripts detected attempted execution of unconfigured package script. \["@lavamoat\/preinstall-always-fail","preinstall"/);
    t.is(addRes.exitCode, 1);

    // trigger the plugin
    const installRes = run(t, ['install'], projectRoot)
    t.regex(installRes.out, /packages missing configuration:\n- @lavamoat\/preinstall-always-fail/);
    t.regex(installRes.err, /@lavamoat\/allow-scripts has detected dependencies without configuration. explicit configuration required./);
    t.is(installRes.exitCode, 1);
  } finally {
    cleanup(projectName);
  }
})

test('install - allows adding and installing package with specified preinstall script', async (t: any) => {
  const projectName = 'allowed';
  const projectRoot = join(dirname(import.meta.url.replace(/^file:/, '')), 'projects', projectName)

  try {
    run(t, ['plugin', 'import', normalize('../../../bundles/@yarnpkg/plugin-allow-scripts.js')], projectRoot)
    const addRes = run(t, ['add', '@lavamoat/preinstall-always-fail'], projectRoot)
    t.is(addRes.exitCode, 0);

    // trigger the plugin
    const installRes = run(t, ['install'], projectRoot)
    t.is(installRes.exitCode, 0);
  } finally {
    cleanup(projectName);
  }
})

test('install - allows execution of allowed yarn classic dependencies', async (t: any) => {
  const projectName = 'protected-configured';
  const projectRoot = join(dirname(import.meta.url.replace(/^file:/, '')), 'projects', projectName)

  try {
    run(t, ['plugin', 'import', normalize('../../../bundles/@yarnpkg/plugin-allow-scripts.js')], projectRoot)

    // trigger the plugin
    const installRes = run(t, ['install', '--inline-builds'], projectRoot, {YARN_IGNORE_SCRIPTS: 'false'})
    t.is(installRes.exitCode, 0);
    t.true(existsSync(portablePath(join(projectRoot, 'node_modules', 'allowed-dep', 'foo'))));
  } finally {
    cleanup(projectName);
  }
})

test('install - blocks execution of unallowed yarn classic dependencies', async (t: any) => {
  const projectName = 'protected-unconfigured';
  const projectRoot = join(dirname(import.meta.url.replace(/^file:/, '')), 'projects', projectName)

  try {
    run(t, ['plugin', 'import', normalize('../../../bundles/@yarnpkg/plugin-allow-scripts.js')], projectRoot)
    run(t, ['config', 'set', 'enableScripts', 'false'], projectRoot)

    // trigger the plugin
    const installRes = run(t, ['install', '--inline-builds'], projectRoot)
    t.is(installRes.exitCode, 1);
    t.false(existsSync(portablePath(join(projectRoot, 'node_modules', 'allowed-dep', 'foo'))));
    t.false(existsSync(portablePath(join(projectRoot, 'node_modules', 'disallowed-dep', 'foo'))));
  } finally {
    cleanup(projectName);
  }
})

function realisticEnvOptions(projectRoot: string): SpawnSyncOptions {
  return {
    cwd: isWindows ? projectRoot.replace(/^[\/\\]/, '') : projectRoot,
    env: {
      PATH: npmRunPath({ path: process.env.PATH }),
      COREPACK_ENABLE_NETWORK: '1',
      COREPACK_DEFAULT_TO_LATEST: '1',
      COREPACK_AUTO_PIN: '0',
      COREPACK_ENABLE_PROJECT_SPEC: '1',
      COREPACK_ENABLE_STRICT: '0',
      YARN_ENABLE_COLORS: false.toString(),
      // without this, yarn berry will error on env vars intended for yarn v1
      YARN_ENABLE_STRICT_SETTINGS: false.toString(),

      YARN_NODE_LINKER: 'node-modules',
      // yarn ignores its own color settings only in GitHub Actions
      FORCE_COLOR: '0',
      GITHUB_ACTIONS: undefined,
      GITHUB_EVENT_PATH: undefined,
      CI: false.toString(),
      INIT_CWD: projectRoot,
    },
    windowsVerbatimArguments: isWindows,
    encoding: 'utf-8',
    shell: isWindows,
  }
}
