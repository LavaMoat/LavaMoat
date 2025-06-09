# Development

> Notes and plans for further development

Implemented capabilities:

- [x] wrapping built module sources
- [x] runtime to make wrapped modules work
- [x] turn off concatenateModules and warn it's incompatible
- [x] inlining runtime into the bundle
- [x] including actual policies
- [x] using identifiers matching the policy
- [x] using policies to control module loading at runtime
- [x] using policies to limit globals at runtime
- [x] adding lockdown.js from ses to dist
- [x] support for "write" value in globals policy
- [x] researching and covering all default `__webpack_require__.*` functions for security as needed
- [x] support dynamic imports/requires reaching beyond the bundled content
- [x] policy generation built into the plugin
- [x] research potential concatenateModules support
- [ ] paranoid mode checks
- [ ] researching and covering oher `__webpack_require__.*` functions maybe?
- [ ] ecosystem compatibility quirks we're yet to find

## Control flow

To better understand the control flow of the plugin, observe the `PROGRESS` tool and how it indicates the sequence of steps happening in the plugin.
`PROGRESS` logs various diagnostic information on levels 2 and 3

NOTE: A setup might exist where some steps get revisited with multiple chunks or entries. The progress tool will complain even if plugin still works in such case. We'll have to adjust when we get there.

### diagram

The diagram is generated from sources: (diagram.md)[diagram.md]

## Testing improvements

https://github.com/webpack/webpack/tree/main/examples contains potentially all unique things webpack supports. We should pick examples to cover from there.

List of what to cover ordered by priority

- [x] e2e test creating a bundle and run it to check for errors
- [x] e2e test covering basic security claims
- [ ] cover all module types
- [x] configure bundle splitting
- [x] cover webpack magic comments
- [ ] test with ESM target

### package identifiers

We use @lavamoat/aa to identify packages for the policy.
As part of this plugin we'll need to identify modules in a compatible way and then work the policy into the bundle runtime.  
At that point, when everything i bundled, there's no point in maintaining full identifiers, so they can be replaced with numbers to occupy less space.

```mermaid
flowchart TD;

aa[AA identifiers in policy] --> p[policy processing]
wp[paths of the bundle] --> waa[paths mapped to AAs]
waa --> p
p --> w[replace AAs with numbers from a sequence]
w --> b[use short identifiers in the bundle and inlined policy]

```

# Feature ideas

### modes

- default
- paranoid - adds extra checks (not implemented)

Things it could check in paranoid mode

- use other hooks to check if the number of bundle entries equals the number of entries processed by the wrapper
- add a local reference before the with blocks and a function within to look it up and alert if it can be found - should trigger if a transform or plugin action breaks the withproxies. This would be best implemented by the plugin injecting a tiny module with the source to do this.
- allow optionally importing a canary package that tries to escape (kinda overlaps with above, but could use more methods)
- run an AST on the final bundle to identify the scopes without the `with` blocks (after all minitication etc.)
