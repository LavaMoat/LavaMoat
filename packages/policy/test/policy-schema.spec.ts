import { type LavaMoatPolicy } from '@lavamoat/types'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  assertLavaMoatPolicy,
  createLavaMoatPolicyJSONSchema,
  isLavaMoatPolicy,
  validateLavaMoatPolicy,
} from '../src/index.js'

// Example valid policy
const validPolicy: LavaMoatPolicy = {
  resources: {
    foo: {
      globals: { foo: true },
      builtin: { fs: true },
      packages: { bar: true },
      native: false,
    },
  },
  root: {
    usePolicy: 'foo',
  },
}

// Example valid policy (no root property)
const validPolicyNoRoot: LavaMoatPolicy = {
  resources: {
    foo: {
      globals: { foo: true },
      builtin: { fs: true },
      packages: { bar: true },
      native: false,
    },
  },
}

// Example invalid policy (missing resources)
const invalidPolicy = {
  resources: {},
  root: {
    usePolicy: 'not-a-resource',
  },
}

// Example invalid policy (invalid canonical name in resources)
const invalidCanonicalNamePolicy = {
  resources: {
    'not a canonical name!': {
      globals: { foo: true },
    },
  },
}

// Example invalid policy (invalid canonical name in packages)
const invalidPackageCanonicalNamePolicy = {
  resources: {
    foo: {
      packages: { 'not a canonical name!': true },
    },
  },
}

// Example invalid policy (global property with dot and value 'write')
const invalidGlobalWriteDotPolicy = {
  resources: {
    foo: {
      globals: { 'foo.bar': 'write' },
    },
  },
}

describe('isLavaMoatPolicy()', () => {
  it('returns true for valid policy', () => {
    assert.equal(isLavaMoatPolicy(validPolicy), true)
  })

  it('returns true for valid policy with no root property', () => {
    assert.equal(isLavaMoatPolicy(validPolicyNoRoot), true)
  })

  it('returns false for invalid policy', () => {
    assert.equal(isLavaMoatPolicy(invalidPolicy), false)
  })

  it('returns false for invalid canonical name in resources', () => {
    assert.equal(isLavaMoatPolicy(invalidCanonicalNamePolicy), false)
  })

  it('returns false for invalid canonical name in packages', () => {
    assert.equal(isLavaMoatPolicy(invalidPackageCanonicalNamePolicy), false)
  })

  it('returns false for global property with dot and value write', () => {
    assert.equal(isLavaMoatPolicy(invalidGlobalWriteDotPolicy), false)
  })
})

describe('validateLavaMoatPolicy()', () => {
  it('strips extra properties from result', () => {
    const policyWithExtra = {
      ...validPolicy,
      extraneous: 'should be stripped',
    }
    const result = validateLavaMoatPolicy(policyWithExtra)
    assert.equal(result.success, true)
    assert.deepEqual(validPolicy, result.data)
  })

  it('validates invalid canonical name in resources', () => {
    const result = validateLavaMoatPolicy(invalidCanonicalNamePolicy)
    assert.equal(result.success, false)
    assert.equal(
      result.message,
      '✖ Invalid canonical name; must be one or more package names delimited by ">"\n  → at resources["not a canonical name!"]'
    )
  })

  it('validates invalid canonical name in packages', () => {
    const result = validateLavaMoatPolicy(invalidPackageCanonicalNamePolicy)
    assert.equal(result.success, false)
    assert.equal(
      result.message,
      '✖ Invalid canonical name; must be one or more package names delimited by ">"\n  → at resources.foo.packages["not a canonical name!"]'
    )
  })

  it('validates global property with dot and value write', () => {
    const result = validateLavaMoatPolicy(invalidGlobalWriteDotPolicy)
    assert.equal(result.success, false)
    assert.equal(
      result.message,
      '✖ Writable properties of globals are currently unsupported\n  → at resources.foo.globals["foo.bar"]'
    )
  })
})

describe('assertLavaMoatPolicy()', () => {
  it('does not throw for valid policy', () => {
    assert.doesNotThrow(() => assertLavaMoatPolicy(validPolicy))
  })

  it('does not throw for valid policy with no root property', () => {
    assert.doesNotThrow(() => assertLavaMoatPolicy(validPolicyNoRoot))
  })

  it('throws for invalid policy', () => {
    assert.throws(() => assertLavaMoatPolicy(invalidPolicy))
  })

  it('throws for invalid canonical name in resources', () => {
    assert.throws(() => assertLavaMoatPolicy(invalidCanonicalNamePolicy))
  })

  it('throws for invalid canonical name in packages', () => {
    assert.throws(() => assertLavaMoatPolicy(invalidPackageCanonicalNamePolicy))
  })

  it('throws for global property with dot and value write', () => {
    assert.throws(() => assertLavaMoatPolicy(invalidGlobalWriteDotPolicy))
  })
})

describe('createLavaMoatPolicyJSONSchema()', () => {
  it('returns a valid JSON schema (snapshot)', (t) => {
    // @ts-expect-error - t.assert added in Node.js v20.0.0
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!t.assert?.snapshot) {
      t.skip('Skipping snapshot test; requires Node.js v22.3.0 or later')
      return
    }
    const schema = createLavaMoatPolicyJSONSchema()
    // @ts-expect-error - t.assert added in Node.js v20.0.0; snapshot added in v22.3.0
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    t.assert.snapshot(schema)
  })
})
