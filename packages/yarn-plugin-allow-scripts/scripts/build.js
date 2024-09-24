const { spawnSync } = require('node:child_process');
const { readFileSync, writeFileSync } = require('node:fs');
const { platform } = require('node:os');
const { join } = require('node:path');
const { argv, cwd, env } = process;

const isWindows = platform() === 'win32';
const BUILDER_CMD = isWindows ? 'builder.cmd' : 'builder';

const buildResult = spawnSync(
  BUILDER_CMD,
  [
    'build', 'plugin', '--no-minify', ...argv.slice(2),
  ],
  {
    cwd: cwd(),
    env: env,
    encoding: 'utf8',
  },
);
if (buildResult.status !== 0) {
  console.error('Build failed');
  console.log(buildResult.stdout);
  console.error(buildResult.stderr);
  process.exit(buildResult.status);
}

const bundlePath = join(cwd(), 'bundles', '@yarnpkg', 'plugin-allow-scripts.js')
// patch broken yarn bundling
const buildOutput = readFileSync(bundlePath, { encoding: 'utf-8' })
  .replace(/npm_config_node_gyp = __require.resolve/g, 'npm_config_node_gyp = resolve')

writeFileSync(bundlePath, buildOutput, { encoding: 'utf-8' });
