const { promisify } = require('util')
const path = require('path')
const os = require('os')
const { promises: fs } = require('fs')
const { spawn, exec: execCb } = require('child_process')


const exec = promisify(execCb)
const makeTempDir = async () => {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'lavamoat-survey-')) 
}
const mitmPath = new URL('../mitm', `file://${__filename}`).pathname

module.exports = {
  execTest,
}

execTest({
  gitRepo: 'git@github.com:MetaMask/eth-sig-util.git',
}).catch(console)

// 1. clone + cd
// 2. npm/yarn install
// 3. npm run test (no lavamoat)
// 4. run tests (lavamoat gen-and-run)
async function execTest ({ gitRepo, gitRef }) {
  const projectDir = await makeTempDir()
  console.log('running lavamoat exec test')
  console.log(`${gitRepo} #${gitRef ? gitRef : '<default>'} in ${projectDir}`)
  await prepareRepo({ projectDir, gitRepo, gitRef })
  await installDependencies({ projectDir })
  await runPlainTests({ projectDir })
  await runLavamoatTests({ projectDir })
}

async function prepareRepo ({ projectDir, gitRepo, gitRef }) {
  await exec(`git clone ${gitRepo} .`, { cwd: projectDir })
  if (gitRef) {
    await exec(`git checkout ${gitRef}`, { cwd: projectDir })
  }
  console.log(`repo prepared ${projectDir}`)
}

async function installDependencies ({ projectDir }) {
  const { stdout, stderr } = await exec('yarn install', { cwd: projectDir })
  console.log('deps installed')
}

async function runPlainTests ({ projectDir }) {
  const { stdout, stderr } = await exec('yarn run test', { cwd: projectDir })
  console.log('tests passed directly')
}

async function runLavamoatTests ({ projectDir }) {
  // yarn modifies the path, injecting a `node` ref so we avoid it
  // npx is whitelisted in the node mitm script
  const testCommand = require(`${projectDir}/package.json`).scripts.test
  await mitmExec('npx', ['-c', testCommand], { cwd: projectDir })
}

async function mitmExec(arg, args, opts) {
  const { env } = process
  const child = spawn(arg, args, {
    env: { ...env, PATH: `${mitmPath}:${env.PATH}` },
    stdio: 'inherit',
    ...opts,
  })
  return new Promise(resolve => child.on('exit', resolve))
}
