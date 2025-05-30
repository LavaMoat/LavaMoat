import { type LavaMoatPolicy } from '@lavamoat/types'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  assertLavaMoatPolicy,
  createLavaMoatPolicyJSONSchema,
  isLavaMoatPolicy,
  type IsLavaMoatPolicyOnFailureFn,
  type IsLavaMoatPolicyOnSuccessFn,
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

describe('isLavaMoatPolicy', () => {
  it('isLavaMoatPolicy - returns true for valid policy', (t) => {
    assert.equal(isLavaMoatPolicy(validPolicy), true)
  })

  it('isLavaMoatPolicy - returns true for valid policy with no root property', (t) => {
    assert.equal(isLavaMoatPolicy(validPolicyNoRoot), true)
  })

  it('isLavaMoatPolicy - returns false for invalid policy', (t) => {
    assert.equal(isLavaMoatPolicy(invalidPolicy), false)
  })

  it('isLavaMoatPolicy - returns false for invalid canonical name in resources', (t) => {
    assert.equal(isLavaMoatPolicy(invalidCanonicalNamePolicy), false)
  })

  it('isLavaMoatPolicy - returns false for invalid canonical name in packages', (t) => {
    assert.equal(isLavaMoatPolicy(invalidPackageCanonicalNamePolicy), false)
  })

  it('isLavaMoatPolicy - returns false for global property with dot and value write', (t) => {
    assert.equal(isLavaMoatPolicy(invalidGlobalWriteDotPolicy), false)
  })

  it('isLavaMoatPolicy - calls onSuccess for valid policy', (t) => {
    const onSuccess: IsLavaMoatPolicyOnSuccessFn = (data) => {
      assert.deepEqual(data, validPolicy)
    }
    assert.ok(isLavaMoatPolicy(validPolicy, { onSuccess }))
  })

  it('isLavaMoatPolicy - calls onSuccess for valid policy with no root property', (t) => {
    const onSuccess: IsLavaMoatPolicyOnSuccessFn = (data) => {
      assert.deepEqual(data, validPolicyNoRoot)
    }
    assert.ok(isLavaMoatPolicy(validPolicyNoRoot, { onSuccess }))
  })

  it('isLavaMoatPolicy - calls onFailure for invalid policy', (t) => {
    const onFailure: IsLavaMoatPolicyOnFailureFn = (pretty, error) => {
      assert.equal(
        pretty,
        '✖ If provided, root policy must reference a known resource\n  → at root.usePolicy'
      )
      assert.equal(error.name, 'ZodError')
    }
    assert.equal(isLavaMoatPolicy(invalidPolicy, { onFailure }), false)
  })

  it('isLavaMoatPolicy - strips extra properties and passes cleaned object to onSuccess', (t) => {
    const policyWithExtra = {
      ...validPolicy,
      extraneous: 'should be stripped',
    }
    const onSuccess = (data: LavaMoatPolicy) => {
      assert.deepEqual(validPolicy, data)
    }
    assert.ok(isLavaMoatPolicy(policyWithExtra, { onSuccess }))
  })

  it('isLavaMoatPolicy - calls onFailure for invalid canonical name in resources', (t) => {
    const onFailure: IsLavaMoatPolicyOnFailureFn = (pretty, error) => {
      assert.equal(
        pretty,
        '✖ Invalid canonical name; must be one or more package names delimited by ">"\n  → at resources["not a canonical name!"]'
      )
      assert.equal(error.name, 'ZodError')
    }
    assert.equal(
      isLavaMoatPolicy(invalidCanonicalNamePolicy, { onFailure }),
      false
    )
  })

  it('isLavaMoatPolicy - calls onFailure for invalid canonical name in packages', (t) => {
    const onFailure: IsLavaMoatPolicyOnFailureFn = (pretty, error) => {
      assert.equal(
        pretty,
        '✖ Invalid canonical name; must be one or more package names delimited by ">"\n  → at resources.foo.packages["not a canonical name!"]'
      )
      assert.equal(error.name, 'ZodError')
    }
    assert.equal(
      isLavaMoatPolicy(invalidPackageCanonicalNamePolicy, { onFailure }),
      false
    )
  })

  it('isLavaMoatPolicy - calls onFailure for global property with dot and value write', (t) => {
    const onFailure: IsLavaMoatPolicyOnFailureFn = (pretty, error) => {
      assert.equal(
        pretty,
        '✖ Writable properties of globals are currently unsupported\n  → at resources.foo.globals["foo.bar"]'
      )
      assert.equal(error.name, 'ZodError')
    }
    assert.equal(
      isLavaMoatPolicy(invalidGlobalWriteDotPolicy, { onFailure }),
      false
    )
  })
})

describe('assertLavaMoatPolicy', () => {
  it('assertLavaMoatPolicy - does not throw for valid policy', (t) => {
    assert.doesNotThrow(() => assertLavaMoatPolicy(validPolicy))
  })

  it('assertLavaMoatPolicy - does not throw for valid policy with no root property', (t) => {
    assert.doesNotThrow(() => assertLavaMoatPolicy(validPolicyNoRoot))
  })

  it('assertLavaMoatPolicy - throws for invalid policy', (t) => {
    assert.throws(() => assertLavaMoatPolicy(invalidPolicy))
  })

  it('assertLavaMoatPolicy - throws for invalid canonical name in resources', (t) => {
    assert.throws(() => assertLavaMoatPolicy(invalidCanonicalNamePolicy))
  })

  it('assertLavaMoatPolicy - throws for invalid canonical name in packages', (t) => {
    assert.throws(() => assertLavaMoatPolicy(invalidPackageCanonicalNamePolicy))
  })

  it('assertLavaMoatPolicy - throws for global property with dot and value write', (t) => {
    assert.throws(() => assertLavaMoatPolicy(invalidGlobalWriteDotPolicy))
  })
})

describe('createLavaMoatPolicyJSONSchema()', () => {
  it('createLavaMoatPolicyJSONSchema - returns a valid JSON schema (snapshot)', (t) => {
    // @ts-expect-error - t.assert added in Node.js v20.0.0
    if (!t.assert?.snapshot) {
      t.skip('Skipping snapshot test; requires Node.js v22.3.0 or later')
      return
    }
    const schema = createLavaMoatPolicyJSONSchema()
    // @ts-expect-error - t.assert added in Node.js v20.0.0; snapshot added in v22.3.0
    t.assert.snapshot(schema)
  })
})
