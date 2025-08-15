# LavaMoat Developer Instructions

**ALWAYS follow these instructions first.** Only search for additional information or use bash commands when the information here is incomplete or found to be in error.

LavaMoat is a JavaScript supply chain security toolkit providing runtime protections, dependency management, and bundler integrations to protect applications from malicious packages.

## Essential Setup Commands

Bootstrap the development environment with these exact commands:

```bash
# Verify Node.js version (requirement: ^16.20.0 || ^18.0.0 || ^20.0.0 || ^22.0.0 || ^24.0.0)
node --version

# Verify npm version (requirement: >=7.0.0)
npm --version

# Install dependencies - takes 6 minutes. NEVER CANCEL. Set timeout to 10+ minutes.
npm ci --foreground-scripts

# Setup development environment - takes 10 seconds
npm run setup
```

## Build and Test Commands

**NEVER CANCEL builds or tests - they may take several minutes to complete:**

```bash
# Build all packages - takes 2 seconds after setup
npm run build

# Run complete test suite - takes 6 minutes. NEVER CANCEL. Set timeout to 10+ minutes.
npm test

# Run linting - takes 20 seconds
npm run lint

# Clean and rebuild everything - takes 10 seconds
npm run rebuild
```

**CRITICAL:** Tests may output expected error messages to STDERR as part of security policy validation, but the test runner (AVA) should exit with code 0 when tests pass. Exit code 1 indicates actual test failures, not expected behavior.

ALWAYS manually validate changes using these scenarios:

### Core Functionality Test

```bash
# Test allow-scripts CLI functionality
node packages/allow-scripts/src/cli.js --help

# Test lavamoat-node CLI functionality
node packages/lavamoat-node/src/cli.js --help

# Test @lavamoat/node CLI functionality
node packages/node/src/cli.js --help

# Create test project to validate allow-scripts
cd /tmp && mkdir test-project && cd test-project && npm init -y
node /path/to/LavaMoat/packages/allow-scripts/src/cli.js setup
cat package.json  # Should show @lavamoat/preinstall-always-fail dependency
cat .npmrc        # Should show ignore-scripts=true

# Test LavaMoat Node execution
echo 'console.log("Hello from LavaMoat!", process.version)' > hello.js
node /path/to/LavaMoat/packages/lavamoat-node/src/cli.js hello.js
```

### Package Testing

```bash
# Test individual packages (each takes 1-3 minutes)
npm run --workspace=packages/core test
npm run --workspace=packages/allow-scripts test
npm run --workspace=packages/node test
npm run --workspace=packages/lavamoat-node test
npm run --workspace=packages/browserify test
npm run --workspace=packages/webpack test
npm run --workspace=packages/aa test
npm run --workspace=packages/git-safe-dependencies test
npm run --workspace=packages/lavapack test
npm run --workspace=packages/laverna test
npm run --workspace=packages/react-native-lockdown test
npm run --workspace=packages/tofu test
```

## Repository Structure

### Key Packages

- `packages/core/` - Core LavaMoat runtime and policy generation
- `packages/node/` - Node.js CLI tool for policy generation and execution
- `packages/lavamoat-node/` - Legacy Node.js runtime protection
- `packages/allow-scripts/` - Dependency install script management
- `packages/browserify/` - Browserify integration plugin
- `packages/webpack/` - Webpack integration plugin
- `packages/aa/` - Archive analysis utilities
- `packages/git-safe-dependencies/` - Git-based dependency safety utilities
- `packages/lavapack/` - Package bundling utilities
- `packages/laverna/` - Documentation and analysis tools
- `packages/react-native-lockdown/` - React Native security lockdown
- `packages/tofu/` - JavaScript analysis tools

### Important Files

- `package.json` - Root workspace configuration and scripts
- `.nvmrc` - Node.js version specification (22.17.1)
- `tsconfig.json` - TypeScript build configuration
- `.github/workflows/` - CI/CD pipeline definitions

## Common Development Tasks

### Making Changes

1. **ALWAYS run setup first:** `npm run setup`
2. **Build before testing:** `npm run build`
3. **Test your changes:** Run relevant package tests
4. **Lint before committing:** `npm run lint` - must pass for CI

### CI Validation Commands

```bash
# These must pass before committing - mirrors CI pipeline
npm run lint:eslint     # ESLint checks
npm run lint:deps       # Dependency analysis
npm run lint:lockfile   # Package lock validation
npm run build:types     # TypeScript compilation
```

### Debugging Failed Tests

- Check individual package tests if main test suite reports issues
- Allow-scripts tests may show intentional policy violation errors - this is correct behavior
- Check test output for "known failures" and "tests skipped" - these are expected

## Working with Specific Features

### Allow-Scripts Development

```bash
# CLI location
packages/allow-scripts/src/cli.js

# Test project setup
packages/allow-scripts/test/projects/

# Key commands
node packages/allow-scripts/src/cli.js setup    # Configure project
node packages/allow-scripts/src/cli.js auto     # Generate policy
node packages/allow-scripts/src/cli.js run      # Execute allowed scripts
```

### @lavamoat/node Development

```bash
# CLI location
packages/node/src/cli.js

# Generate policy for a Node.js application
node packages/node/src/cli.js generate app.js

# Run application with LavaMoat protection
node packages/node/src/cli.js app.js --policy ./lavamoat/node/policy.json
```

### Policy Files

- Default policy location: `./lavamoat/node/policy.json`
- Override policy: `./lavamoat/node/policy-override.json`
- Debug policy: `./lavamoat/node/policy-debug.json`
- Browserify policies: `./lavamoat/browserify/policy.json`

## Timing Expectations

**NEVER CANCEL these operations - always set appropriate timeouts:**

- `npm ci --foreground-scripts`: 6 minutes (set 10+ minute timeout)
- `npm test`: 6 minutes (set 10+ minute timeout)
- `npm run setup`: 10 seconds
- `npm run build`: 2 seconds
- `npm run lint`: 20 seconds
- `npm run rebuild`: 10 seconds
- Individual package tests: 1-3 minutes each

## Platform Support

**Officially supported:**

- Ubuntu LTS (x86_64)
- Debian Stable (x86_64)
- Alpine Linux Stable (x86_64)

**Best effort support:**

- macOS 13.5+ (x86_64/aarch64)
- Windows Subsystem for Linux
- Other architectures (aarch64)

## Troubleshooting

### Common Issues

- **"Long build/test times"** - Normal, DO NOT CANCEL operations
- **"Policy generation warnings"** - Expected for dynamic requires and primordial mutations
- **"TypeScript version warning"** - Non-blocking, project uses newer TypeScript than officially supported by eslint

### Build Issues

```bash
# npm run setup & run rebuild will typically be sufficient
npm run clean:types
npm run rebuild
```

### Test Issues

```bash
# Run test preparation separately if needed
npm run test:prep

# Test specific workspaces only
npm run test:workspaces
```

**Always check that your changes don't break the core security functionality by running the CI test suite before submitting code.**
