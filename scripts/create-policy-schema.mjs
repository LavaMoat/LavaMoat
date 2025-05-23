import { createLavaMoatPolicyJSONSchema } from '@lavamoat/node/schema'
import stringify from 'json-stable-stringify'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const DEST = new URL(
  '../packages/core/lavamoat-policy.schema.json',
  import.meta.url
)

const json = stringify(createLavaMoatPolicyJSONSchema(), { space: 2 })

if (!json) {
  throw new TypeError('Failed to stringify schema')
}

writeFileSync(DEST, json, 'utf-8')

console.error('Wrote schema to', fileURLToPath(DEST))
