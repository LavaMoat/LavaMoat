# @lavamoat/policy

> Policy schema & validation for LavaMoat

This package exposes utilities for working with LavaMoat policies, as well as a [JSON schema][schema] for policy files.

## Resources

- **[LavaMoat Policy JSON Schema][schema]**
- **[LavaMoat Policy Type Definition][types]**

## Usage

### Utilities

```ts
import {
  isLavaMoatPolicy,
  assertLavaMoatPolicy,
  validateLavaMoatPolicy,
  type LavaMoatPolicy,
} from '@lavamoat/policy'

const policy: LavaMoatPolicy = {
  resources: {
    // ... LavaMoat policy object
  },
}

// type guard
if (isLavaMoatPolicy(policy)) {
  // ok
} else {
  // not ok
}

// assertion
try {
  assertLavaMoatPolicy(policy)
  // ok
} catch (error) {
  // not ok

  // error is a ZodError
  console.error(error.message)
}

// validation
const result = validateLavaMoatPolicy(policy)
if (result.success) {
  // ok
  const { data } = result
} else {
  // not ok

  // ZodSafeParseResult w/ extra `message` prop
  // success === false
  const { error, message, success } = result

  // message is a Zod-prettified ZodError
  console.error(message)

  // error is the original ZodError
  throw error
}

// type inference
const maybePolicy = {
  resources: {
    // ... LavaMoat policy object
  },
}
// inferredPolicy is a well-typed LavaMoatPolicy<T>
const inferredPolicy = inferLavaMoatPolicy(maybePolicy)
```

For purposes of schema composition, the Zod schema itself is exported as `lavaMoatPolicySchema`.

### JSON Schema

#### Import JSON Schema directly

```js
import schema from '@lavamoat/policy/schema.json' with { type: 'json' }
```

#### On-the-fly Generation

```js
import { createLavaMoatPolicyJSONSchema } from '@lavamoat/policy'

// JSON schema (version 2020-12) object
const lavaMoatPolicyJSONSchema = createLavaMoatPolicyJSONSchema()
```

## License

Copyright © 2025 Consensys, Inc. Licensed MIT

[schema]: ./lavamoat-policy.schema.json
[types]: https://github.com/LavaMoat/LavaMoat/blob/main/packages/types/src/policy-schema/lavamoat-policy.v0-0-1.schema.ts
