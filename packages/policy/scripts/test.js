import { spawn } from 'node:child_process'
import path from 'node:path'

if (
  process.versions.node.startsWith('20.') ||
  process.versions.node.startsWith('18.')
) {
  console.error('Skipping tests for unsupported Node.js v18.x-v20.x')
} else {
  spawn('npm run test:run', {
    stdio: 'inherit',
    shell: true,
    // @ts-expect-error old @types/node
    cwd: path.join(import.meta.dirname, '..'),
  }).once('exit', (code) => {
    process.exitCode = code ?? 0
  })
}
