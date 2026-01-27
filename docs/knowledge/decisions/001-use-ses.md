# ADR-001: Use SES for Compartmentalization

## Status

Accepted

## Context

LavaMoat needs a mechanism to isolate JavaScript packages from each other and from sensitive globals/built-ins. Several approaches were considered:

1. **VM module**: Node's built-in `vm` module provides some isolation but has known escape vectors and doesn't work in browsers.

2. **iframes/Workers**: Browser-only solutions that add significant overhead and complexity for cross-compartment communication.

3. **SES (Secure EcmaScript)**: A TC39 proposal (now stage 3) that provides language-level compartmentalization with hardened globals.

## Decision

We chose SES because:

- **Cross-platform**: Works in both Node.js and browsers with the same semantics
- **Standards-track**: Being developed through TC39, likely to become part of the language
- **Proven**: Developed and maintained by Agoric with years of security research
- **Minimal overhead**: Compartments are lightweight compared to iframes or workers
- **Synchronous**: No need for async message passing between compartments

## Consequences

### Positive

- Consistent security model across all JavaScript environments
- Low runtime overhead
- Can leverage ongoing improvements from Agoric and TC39

### Negative

- SES is still a shim, not native—adds bundle size
- Some legitimate code patterns (e.g., modifying primordials) won't work
- Debugging can be harder due to the hardened environment
- Requires keeping the SES shim updated for security patches
