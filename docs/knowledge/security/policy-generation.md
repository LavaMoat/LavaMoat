# Policy Generation Security Considerations

This document covers security considerations when generating and reviewing LavaMoat policies.

## The Trust Boundary

Policy generation runs your application to observe what capabilities each package actually uses. This means:

- **Policy generation must run trusted code**: If malicious code runs during policy generation, it could hide its actual capabilities or manipulate the generated policy.
- **Review policies carefully**: Auto-generated policies represent observed behavior, not necessarily intended or safe behavior.

## Common Red Flags in Policies

When reviewing a generated policy, watch for:

### Dangerous Built-in Access

- `child_process`: Can execute arbitrary commands
- `fs`: Can read/write anywhere on the filesystem
- `net` / `dgram`: Can make network connections
- `worker_threads`: Can spawn threads with full access

A logging library requesting `child_process` is suspicious. A build tool requesting it may be legitimate.

### Global Write Access

Packages requesting write access to globals like `Object`, `Array`, or `Function` can potentially escape compartmentalization. This should be rare and well-justified.

### Overly Broad Permissions

If a package requests access to many built-ins or globals, consider:

- Is this package doing too much?
- Is there a more minimal alternative?
- Can you refactor to reduce its scope?

## Policy Drift

Policies can drift over time as:

- Dependencies update and change their behavior
- New code paths are exercised
- Transitive dependencies change

Run policy generation regularly (e.g., in CI) and review diffs carefully.
