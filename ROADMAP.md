| Status | Meaning                         |
| ------ | ------------------------------- |
| 🆕     | new idea, under consideration   |
| ⚪     | intended, but no work           |
| 🟡     | starting next                   |
| 🟢     | work started                    |
| 🚀     | shipped                         |
| 🔴     | stalled/blocked                 |
| ❔     | not sure if possible/reasonable |

# LavaMoat Roadmap

- new tools
  - kipuka
  - [❔] additional global hardening for node and the browser (think: lockdown-more or sesaw) - could go into core
  - [⚪] config instead of just policy-override
- @lavamoat/node
  - [🟢] dogfooding (enough ecosystem compatibility to run webpack with @lavamoat/webpack)
- @lavamoat/webpack
  - support for vetted shims
  - grow the number of repairs for browser compatibility and security
    - all postmessage infrastructure repairs
- @lavamoat/allow-scripts
  - [🆕] pin version numbers and disallow updated scripts by default
  - [❔] pin to a checksum of the install script
- core
  - [🟢] independent storage for writables to decouple from root compartment global
- @lavamoat/aa
  - [❔] more friendy unique identifiers than canonical names
  - [🆕] add version numbers at the end of canonical names
- perf
  - [⚪] add performance benchmarks to show impact of hardening and lavamoat
- policy
  - policy tools
    - [⚪] policy visualizer
      - basic policy visualization
      - color-coding powerful capabilities
      - tracking how capabilities could spread
        - indicate DOM access spreading
    - policy diff tools
      - highlight powerful capabilities in diff
  - policy features
    - hardening exports (with opt-out per package)
    - custom capabilities definition and endowment
    - top level settings
      - platform hardening settings
        - node.js permissions
        - bundling/web options
      - vetted shims to go between repair and harden
  - composable policy overrides
    - library of shareable policy overrides
