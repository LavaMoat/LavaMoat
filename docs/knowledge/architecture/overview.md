# LavaMoat Architecture Overview

This document provides a high-level overview of LavaMoat's architecture and core concepts.

## Core Concept: Compartmentalization

LavaMoat's primary security mechanism is compartmentalization. Each package in your dependency tree runs in its own isolated compartment with limited access to globals, other packages, and Node.js built-ins.

This is implemented using SES (Secure EcmaScript) which provides a hardened JavaScript environment where:

- The global object is frozen and immutable
- Dangerous primordials are tamed or removed
- Each compartment has its own global scope

## Policy System

The policy file (`lavamoat-policy.json`) is the heart of LavaMoat's security model. It explicitly defines:

- Which built-in modules each package can access (e.g., `fs`, `net`, `child_process`)
- Which globals each package can read or write
- Which other packages each package can import

Policies are generated automatically by analyzing your application's runtime behavior, then reviewed and committed to version control.

## Package Relationships

LavaMoat distinguishes between:

- **Direct dependencies**: Packages you explicitly depend on
- **Transitive dependencies**: Packages your dependencies depend on

Both are subject to policy restrictions, but the policy generation process traces actual usage patterns to determine minimum necessary permissions.

## Build-Time vs Runtime

LavaMoat operates at two phases:

1. **Build-time** (bundlers): For browser applications, LavaMoat integrates with bundlers like Webpack or Browserify to wrap each package in a compartment at build time.

2. **Runtime** (Node.js): For Node.js applications, LavaMoat wraps the module loader to enforce policies at runtime.
