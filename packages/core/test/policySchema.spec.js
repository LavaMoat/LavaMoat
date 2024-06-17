const test = require('ava')
const Ajv = require('ajv')

const schema = require('../schema/lavamoat-policy.v0-0-1.schema.json')
const validPolicy = require('./policy/valid.json')
const invalidPolicyEmpty = require('./policy/invalid-empty.json')
const invalidBadPath = require('./policy/invalid-bad-path.json')

const ajv = new Ajv({ allErrors: true })
const validate = ajv.compile(schema)
test('policy schema - known good policy', (t) => {
  t.truthy(validate(validPolicy))
})

test('policy schema - invalid policy - empty', (t) => {
  t.falsy(validate(invalidPolicyEmpty))
  t.snapshot(validate.errors)
})

test('policy schema - invalid policy - bad resolution path', (t) => {
  t.falsy(validate(invalidBadPath))
  t.snapshot(validate.errors)
})
