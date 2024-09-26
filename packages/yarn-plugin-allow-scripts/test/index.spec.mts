import test from 'ava'
import { existsSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'
import { SpawnSyncOptions } from 'node:child_process'
import { spawnSync } from 'node:child_process'
import { npmRunPath } from 'npm-run-path';
import { rimrafSync } from 'rimraf';

type TestContext = {
  projectName: string
}
const isWindows = process.platform === 'win32';
const portablePath = isWindows
  ? (p: string) => p.replace(/^[\\]/, '')
  : (p: string) => p

  test.afterEach.always((t) => {
    const { projectName } = t.context as TestContext;
  // post-test cleanup of messy `yarn init`
  rimrafSync([
    '.git',
    '.yarn',
  ]);
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
});

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
    const defaultOpts = realisticEnvOptions(cwd, {
      ...process.env,
      ...env,
    });
    const result = isWindows
      ? spawnSync(
        process.env.COMSPEC || 'cmd.exe',
        [
          '/d', '/s', '/c',
          [
            'corepack.cmd',
            'yarn@4',
            ...args
          ].join(' '),
        ],
        {
          ...defaultOpts,
        },
      ) : spawnSync(
        process.env.SHELL || '/bin/sh',
      [
        '-c',
        [
          'corepack',
          'yarn@4',
          ...args
        ].join(' '),
      ],
      {
        ...defaultOpts,
      },
    );
    return {
      exitCode: result.status,
      out: result?.stdout?.toString()?.trim(),
      err: result?.stderr?.toString()?.trim(),
      output: result?.output,
      signal: result.signal,
      error: result.error,
    };
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
  t.context.projectName = 'uninitialized';
  const projectRoot = join(dirname(import.meta.url.replace(/^file:/, '')), 'projects', t.context.projectName);

  // init project
  const initRes = run(t, ['init', '-y'], projectRoot)
  t.is(initRes.exitCode, 0);

  // install the plugin
  const importRes = run(t, ['plugin', 'import', normalize('../../../bundles/@yarnpkg/plugin-allow-scripts.js')], projectRoot)
  t.is(importRes.err, '');
  t.regex(importRes.out, /YN0000: Saving the new plugin in .yarn\/plugins\/@yarnpkg\/plugin-allow-scripts.cjs/);
  t.is(importRes.exitCode, 0);

  const addRes = run(t, ['add', '@lavamoat/preinstall-always-fail'], projectRoot)
  t.regex(addRes.err, /allow-scripts blocked execution of unconfigured package script. \["@lavamoat\/preinstall-always-fail","preinstall"/);
  t.is(addRes.exitCode, 1);

  // trigger the plugin
  const installRes = run(t, ['install'], projectRoot)
  t.regex(installRes.out, /packages missing configuration:\n- @lavamoat\/preinstall-always-fail/);
  t.regex(installRes.err, /@lavamoat\/allow-scripts has detected dependencies without configuration. explicit configuration required./);
  t.is(installRes.exitCode, 1);
})

test('install - allows adding and installing package with preconfigured preinstall script', async (t: any) => {
  t.context.projectName = 'allowed';
  const projectRoot = join(dirname(import.meta.url.replace(/^file:/, '')), 'projects', t.context.projectName);

  run(t, ['plugin', 'import', normalize('../../../bundles/@yarnpkg/plugin-allow-scripts.js')], projectRoot)

  const addRes = run(t, ['add', 'allowed-dep@file:./vendor/allowed-dep'], projectRoot)
  t.regex(addRes.out, /allowed-dep@.* must be built/);
  t.is(addRes.exitCode, 0);
  // verify that file got created by allowed lifecycle script in fixture on add
  t.true(existsSync(portablePath(join(projectRoot, 'node_modules', 'allowed-dep', 'foo'))));
  rimrafSync(portablePath(join(projectRoot, 'node_modules')));

  const installRes = run(t, ['install', '--refresh-lockfile'], projectRoot)
  t.is(installRes.exitCode, 0);
  // verify that file got recreated by allowed lifecycle script in fixture on install
  t.true(existsSync(portablePath(join(projectRoot, 'node_modules', 'allowed-dep', 'foo'))));
})


test('install - blocks execution of disallowed scripts', async (t: any) => {
  t.context.projectName = 'blocked';
  const projectRoot = join(dirname(import.meta.url.replace(/^file:/, '')), 'projects', t.context.projectName)

  run(t, ['plugin', 'import', normalize('../../../bundles/@yarnpkg/plugin-allow-scripts.js')], projectRoot)
  const addRes = run(t, ['add', '@lavamoat/preinstall-always-fail'], projectRoot)
  t.is(addRes.exitCode, 0);

  const installRes = run(t, ['install', '--refresh-lockfile'], projectRoot)
  t.is(installRes.exitCode, 0);
})

// See README.md in protected-unconfigured test project for details
test('install - allows execution of allowed yarn classic dependencies', async (t: any) => {
  t.context.projectName = 'protected-configured';
  const projectRoot = join(dirname(import.meta.url.replace(/^file:/, '')), 'projects', t.context.projectName)

  run(t, ['plugin', 'import', normalize('../../../bundles/@yarnpkg/plugin-allow-scripts.js')], projectRoot)

  const installRes = run(t, ['install', '--inline-builds', '--refresh-lockfile'], projectRoot, {YARN_IGNORE_SCRIPTS: 'false'})
  t.is(installRes.exitCode, 0);
  // verify that file got created by allowed lifecycle script in fixture on install
  t.true(existsSync(portablePath(join(projectRoot, 'node_modules', 'allowed-dep', 'foo'))));
})

// See README.md in protected-unconfigured test project for details
test('install - blocks execution of unallowed yarn classic dependencies', async (t: any) => {
  t.context.projectName = 'protected-unconfigured';
  const projectRoot = join(dirname(import.meta.url.replace(/^file:/, '')), 'projects', t.context.projectName)

  run(t, ['plugin', 'import', normalize('../../../bundles/@yarnpkg/plugin-allow-scripts.js')], projectRoot)
  run(t, ['config', 'set', 'enableScripts', 'false'], projectRoot)

  const installRes = run(t, ['install', '--inline-builds', '--refresh-lockfile'], projectRoot)
  t.is(installRes.exitCode, 1);
  // verify that file did not get created by disallowed lifecycle script in fixture on install
  t.false(existsSync(portablePath(join(projectRoot, 'node_modules', 'disallowed-dep', 'foo'))));
  // the file created bu allowed script also gets removed on failure
  t.false(existsSync(portablePath(join(projectRoot, 'node_modules', 'allowed-dep', 'foo'))));
})

function realisticEnvOptions(projectRoot: string, env: {} = {}): SpawnSyncOptions {
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
      YARN_CLONE_CONCURRENCY: '1',
      YARN_ENABLE_IMMUTABLE_INSTALLS: '0',
      // without this, yarn berry will error on env vars intended for yarn v1
      YARN_ENABLE_STRICT_SETTINGS: false.toString(),

      YARN_NODE_LINKER: 'node-modules',
      // yarn ignores its own color settings only in GitHub Actions
      FORCE_COLOR: '0',
      GITHUB_ACTIONS: undefined,
      GITHUB_EVENT_PATH: undefined,
      CI: false.toString(),
      INIT_CWD: projectRoot,
      ...env,
    },
    windowsVerbatimArguments: isWindows,
    encoding: 'utf-8',
    shell: isWindows,
  }
}
