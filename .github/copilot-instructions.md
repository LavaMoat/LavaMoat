# GitHub Copilot Instructions for LavaMoat

## Repository Overview

LavaMoat is a set of tools for securing JavaScript projects against software supply chain attacks. This is a **monorepo** using npm workspaces with packages focused on different aspects of JavaScript security.

## Core Concepts

- **Supply Chain Security**: Protecting against malicious dependencies
- **Runtime Protection**: Using SES (Secure EcmaScript) containers to limit API access
- **Policy-based Access Control**: Granular control over what packages can access
- **Install Script Management**: Controlling which dependency install scripts can run

## Repository Structure

```
/packages/
├── core/              # LavaMoat kernel and utilities
├── allow-scripts/     # Manages dependency install scripts
├── lavamoat-node/     # Node.js runtime protection
├── browserify/        # Browserify integration
├── webpack/           # Webpack integration
├── tofu/              # Policy generation tools
└── [other packages]/  # Various specialized tools
```

## Development Practices

### Code Style
- **ESLint**: Comprehensive rules in `.eslintrc.js` with ES2021 baseline
- **Prettier**: Auto-formatting with jsdoc plugins
- **TypeScript**: Used for type checking (`.ts` files and declaration files)
- **Node.js**: Minimum version 16.20.0, targets modern Node.js features

### Key Conventions
- Use `node:` prefix for built-in modules (e.g., `node:fs`, `node:path`)
- Prefer promises over callbacks for async operations
- Follow monorepo patterns - avoid cross-package dependencies when possible
- Use JSDoc with TypeScript for documentation

### Testing
- **Test Runner**: AVA test framework
- **Test Location**: `packages/*/test/*.spec.js`
- **Timeout**: 2 minutes default
- Tests should focus on security scenarios and edge cases

### Build System
- **TypeScript**: `tsc -b` for project references and type checking
- **Monorepo**: npm workspaces with cross-package dependencies
- **Scripts**: Use `npm run` commands defined in root package.json

## Security Considerations

When working with LavaMoat code:

1. **Always consider supply chain implications** - any code changes affect security posture
2. **Policy files are critical** - changes to policy generation or parsing need careful review  
3. **SES integration** - understand compartment boundaries and privilege escalation
4. **Install script controls** - be cautious with changes affecting allow-scripts behavior

## Key Files and Patterns

### Policy Files
- Located in `./lavamoat/node/policy.json` (or similar)
- Define package access permissions for `globals`, `builtin`, and `packages`
- Auto-generated but can be manually edited

### Package Structure
Each package typically has:
- `src/` - Source code
- `test/` - Test files
- `types/` - TypeScript declarations (generated)
- `.eslintrc.js` - Package-specific lint rules if needed

## Common Commands

```bash
# Setup and build
npm run setup          # Initial setup with Husky hooks
npm run build          # Build all packages and types
npm run rebuild        # Clean rebuild

# Development
npm run lint           # Run all linting
npm run test           # Build and test all packages
npm run watch:types    # Watch mode for TypeScript

# Package-specific
npm run --workspaces --if-present [command]  # Run command in all workspaces
```

## Working with Monorepo

- Each package in `/packages/` is a separate npm package
- Use workspace dependencies when referencing other LavaMoat packages
- TypeScript project references ensure proper build order
- Some packages emit declaration files, others don't

## Architecture Notes

- **lavamoat-core**: Foundation package with shared utilities
- **Policy system**: Central to all runtime protections
- **SES integration**: Provides the secure execution environment
- **Multiple runtimes**: Node.js, browsers, React Native support
- **Tool integrations**: Browserify, Webpack, etc.

## When Making Changes

1. Understand which packages are affected
2. Run tests early and often (`npm test`)
3. Consider security implications of any API changes
4. Update policy files if changing access patterns
5. Test with real-world scenarios when possible
6. Follow the existing patterns for error handling and logging

Remember: LavaMoat is security-focused software. Any change should be evaluated for its impact on the security guarantees provided to users.