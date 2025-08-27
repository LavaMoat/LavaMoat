# @lavamoat/policy

> Policy schema & validation for LavaMoat

## JSON Schema

**[`lavamoat-policy.schema.json`](./lavamoat-policy.schema.json)**

## Usage

```js
import {
  isLavaMoatPolicy,
  assertLavaMoatPolicy,
  createLavaMoatPolicyJSONSchema,
} from '@lavamoat/policy'
import { z } from 'zod/v4'

const policy = {
  // ... LavaMoat policy object
}

const onFailure = (message, err) => {
  console.error('Policy validation failed:', message)
  err.name // ZodError
}

const onSuccess = (policy) => {
  // policy is copy of original object stripped of any extra properties
}

if (isLavaMoatPolicy(policy, { onSuccess, onFailure })) {
  // ok
} else {
  // not ok
}

try {
  assertLavaMoatPolicy(policy)
  // ok
} catch (err) {
  // not ok
  console.error(z.prettifyError(err))
}

// JSON schema (version 2020-12) object
const lavaMoatPolicyJSONSchema = createLavaMoatPolicyJSONSchema()
```

## License

Copyright © 2025 Consensys, Inc. Licensed MIT
