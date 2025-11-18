import stringify from 'json-stable-stringify'
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createLavaMoatPolicyJSONSchema } from '../src/index.js'

const DEST = new URL('../lavamoat-policy.schema.json', import.meta.url)

const json = stringify(createLavaMoatPolicyJSONSchema(), { space: 2 })

if (!json) {
  throw new TypeError('Failed to stringify schema')
}

writeFileSync(DEST, json, 'utf-8')

execSync(`npx prettier --write ${fileURLToPath(DEST)}`)

console.error('Wrote schema to', fileURLToPath(DEST))
