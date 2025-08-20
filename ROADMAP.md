# LavaMoat Roadmap

| Status | Meaning                         |
| ------ | ------------------------------- |
| 🆕     | new idea, under consideration   |
| ⚪     | intended, but no work           |
| 🟡     | starting next                   |
| 🟢     | work started                    |
| 🚀     | shipped                         |
| 🔴     | stalled/blocked                 |
| ❔     | not sure if possible/reasonable |

## New Tools

- [🟢] [kipuka][]
- [❔] additional global hardening for node and the browser (think: lockdown-more or sesaw) - could go into core
- [🟢] [@lavamoat/vog][] - unified logging system for CLI tools
- [🆕] LavaMoat REPL 🤣

## Project-Specific

### [@lavamoat/node][]

- [🟢] dogfooding (run webpack with [@lavamoat/webpack][] and generate a working app)
- [❔] worker thread & subprocess support
- [⚪] Online exception/error reference
- [⚪] End-user documentation
- [🆕] Better progress reporting (see [@endo/compartment-mapper](#endocompartment-mapper))
- [❔] Tree-shaking policy
- [🟢] Wide-ranging ecosystem integration tests
  - Only exploratory work done thus far; needs some design work staved off a nightmare

### [@lavamoat/webpack][]

- [⚪] refactor how scuttling and snow are integrated, allow for other global repairs/shims along with scuttling to happen at the same time.
- [🆕] support for vetted shims
- [🆕] grow the number of repairs for browser compatibility and security
  - all postmessage infrastructure repairs

### [@lavamoat/allow-scripts][]

- [🆕] pin version numbers and disallow updated scripts by default
- [❔] pin to a checksum of the install script
- [⚪] Drop Node.js v16 support
- [🆕] Detect pnpm and mention that pnpm has a built-in allow-scripts feature

### [lavamoat-core][]

- [🟢] independent storage for writables to decouple from root compartment global

### [@lavamoat/aa][]

- [❔] more friendy unique identifiers than canonical names
- [🆕] add version numbers at the end of canonical names

## Cross-Cutting Concerns

### Performance

- [⚪] add performance benchmarks to show impact of hardening and lavamoat
  - track benchmarks over time
  - eventually: performance budget

### Policy

#### Policy Tooling

- [⚪] policy visualizer
  - basic policy visualization
  - color-coding powerful capabilities
  - tracking how capabilities could spread
    - indicate DOM access spreading
- [🆕] policy diff tools
  - highlight powerful capabilities in diff
- [🟢] JSON schema & validation

#### Policy Enhancements

- [⚪] config instead of just policy-override (read: actual config files)
- [🆕] hardening exports (with opt-out per package)
- [🆕] custom capabilities definition and endowment
- [🆕] top level settings
  - platform hardening settings
    - node.js permissions
    - bundling/web options
  - vetted shims to go between repair and harden
- [🆕] composable policy overrides
- [🆕] library of shareable policy overrides

### Other

- [🟢] Extract common types into package
- [⚪] Upgrade ESLint to v9.x
- [🆕] Migrate from AVA to `node:test`

## External

### [@endo/compartment-mapper]

- [🆕] Comprehensive reporting (some sort of event stream or handlers)
- [🆕] Better tracing through [ses][] and back again (visualization of steps taken to load or execute a given module)

[kipuka]: https://github.com/lavamoat/kipuka
[@lavamoat/node]: https://github.com/lavamoat/lavamoat/tree/main/packages/node
[@lavamoat/webpack]: https://github.com/lavamoat/lavamoat/tree/main/packages/webpack
[@lavamoat/allow-scripts]: https://github.com/lavamoat/lavamoat/tree/main/packages/allow-scripts
[@lavamoat/aa]: https://github.com/lavamoat/lavamoat/tree/main/packages/aa
[lavamoat-core]: https://github.com/lavamoat/lavamoat/tree/main/packages/core
[ses]: https://github.com/endojs/endo/tree/master/packages/ses
[@endo/compartment-mapper]: https://github.com/endojs/endo/tree/master/packages/compartment-mapper
[@lavamoat/vog]: https://github.com/LavaMoat/LavaMoat/pull/1712
