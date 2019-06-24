# new todo
- [x] update SES
  - [x] some issue with prelude or SES kernel running in strict mode
- [x] shared instances of modules
  - [x] revert the seperation of eval / global injection
  - [x] update cache key generator
- [x] mark question: while `this` is container global, `self` is undefined
- [x] fix globalRefs
  - [x] fix objCheckSelf
  - [x] fix objCheckGlobal
- [ ] new config
  - [x] make config like agoric prototype
  - [x] config is json
  - [x] config -> endowments in sesify prelude
  - [x] need tests that generate config then use it 
  - [x] cleanup old config generation
  - [x] get packageName from modules stream
  - [x] allow easy override of configuration
  - [ ] no longer de-duping overlapping namespaces? (needs test)
- [ ] config advanced
  - [ ] environment/container options
    - [x] autogen config from "alt environment heuristics"
    - [ ] execute unfrozen in fresh realm
  - [ ] defensibility/hardening options
    - [ ] harden/deep-freeze exports (needs test)
    - [x] require time, magic copy as default
  - [ ] enforce configuration
    - [ ] fail at buildtime if deps violation
    - [x] enforce globals
  - [ ] move SES config into sesify config
- [ ] mystery bugs
  - [ ] `this.Object` gets transformed to `undefined.Object` in mm
- [ ] cleanup prelude
- [ ] sesify metamask
  - [x] autogen config
  - [x] setup build sys
  - [ ] debug boot
  - [ ] debug runtime
  - [ ] gulp task for autogen
- [ ] improve pluginOpts
  - [ ] config vs sesifyConfig
  - [ ] if autoconfig, use that config
- [ ] question
  - [ ] sesify with unfrozen realm
    - should be on Realm.evaluate, verify
  - [x] how to create a copy of a fn class
- [ ] moduleExports wrap
  - [ ] make a version of muta that wraps fns correctly
    - [ ] apply/construct wrapper
    - [ ] without json-patch stuff

### alt environment heuristics
```js
<obj>.hasOwnProperty = <value>
<obj>.toString = <value>
```

### cli testing
eval in sesify bundle
```
echo 'console.log(self.process === process)' | browserify - --detect-globals false --no-builtins -p [ './src/index.js' --sesifyConfig '{"resources":{"<entry>":{"globals":{"console":true,"process":true}}}}' ] | node
```
eval in ses
```
node -p "try { require('ses').makeSESRootRealm().evaluate('const x = {}; x.hasOwnProperty = ()=>{}') } catch (err) { console.log(err.message) }"
```
npm bug workaround
```
npm unlink sesify && npm i && npm link sesify
```

### trail of dead
- https://github.com/substack/node-deep-equal/issues/62
- https://github.com/Starcounter-Jack/JSON-Patch/pull/227

# berlin notes
next TC39 meeting <<<----
  end of July 23-25th
  RSVP via agoric
TC53:
  - SES as a js derived standard for use in IoT/wearables
  - why this target?
    - less backwards conmpat pressure
module semantics:
  - live bindings via "export let x"
  - does pass by reference
  - export as default does not pass by reference (!)
root realms:
  - Brave case has 3 realms
  - 2 combined realms that are not confined
  - use SES to contril the comms between them
  - Root Realm vs Root SES Realm (FrozenRealm)
  - SES Realms dont require an iframe now
  - factoring into two steps
    - creation of RootRealm
    - securing a RootRealm from the inside
  - harden()
    - does not walk up proto chains

### summary of components
- Config
  - auto config generation
    - tofu rich parsing
      - read/write
  - user config overrides
  - config
    - agoric prototype: https://github.com/erights/legacy-todo/blob/master/manifest.json
      - per-package:
        - modules
        - globals

  - per package or per package path?
  - config requires whitelist of dep graph?
  - CSP style config for auto generating attenuations

- Containment
  - can happen less granularly than modules
    - in addition to granularity of modules
  - module instance per path? purity?
    - no, it explodes
  - if config per-path we need to split eval and endowments
    - if you want special config, do higher level containment
  - how to correctly specify the global object
  - how to do attenuations
    - specify module/global replacements
    - maybe add a config for common attenuations

# the big ones
- [x] autogen granularity
- [x] sourcemaps
- [x] do call with agoric/MM
- [ ] (external) SES prototype.toString etc
- [ ] perf

# make perf better
  - reduce instantiations
    - allow module cache under certain conditions
      - cant harden exports?
    - lazy instantiation via "universal proxy"
      - my guess: we use most things on boot
  - improve instantiation perf
    - transform src with endowments injection (build time slow down)

# dangers of module cache
- mutating the exports
- cant be done if it includes unhardenables (?)

# sesify prelude/kernel
- [x] pass custom endowments at require time
- [x] pass custom endowments at config time
  - [x] get config into bundle
  - [x] lookup config by module id / dep path
  - [?] how to deal with entry point name if entries specified by id / multiple entry points
- [x] include SES in prelude
- [x] share realm for all files in module?
- [x] make global module config as well
- [x] allow some sort of global realm sharing
- [x] set custom prelude in browserify via plugin
  - [x] works but sometimes breaks things...
  - [x] plugin without breaking things via b.reset()?  
- [x] need to not break sourcemaps
  - [x] good enough for now
  - [x] handle module names with @xyz/abc format
- [x] lockdown everything thats passed to module initializer
  - [x] wrap newRequire, etc
  - [x] remove excessive + dangerous moduleInitializer args
    - [x] investigate why corejs was using arguments[4] and see if others are too
- [x] cleanup prelude
- [x] is global caching safe? (no)
- [x] try using the frozen realm + container architecture
- [x] battletest via metamask
  - [x] background boot works : )
  - [x] sent first tx for background-only sesified
  - [x] contentscript doesnt?
  - [x] find sane default endowments

- [ ] support granular config
  - [x] actually expose api from granular config
  - [x] ensure we keep the "this" context, esp for deepGets
  - [ ] ensure we dont break Constructors with our "this" fix
- [x] browserify insertGlobal is ruining the parsing of properties on global
- [ ] sourcemaps
  - [x] needs to be able to compose over existing sourcemaps
  - [ ] needs to work when there are no existing sourcemaps
  - [x] config to specify inline or file
  - [x] config to dump map somewhere file
  - [?] ahhhhh nested inline sourcemaps?? not my problem??

- [ ] (external) allow less restrictive sandboxing modes (prototype.toString())
- [ ] (external) closer control over global? pass in "window" such that (window.Object === Object)

- [?] browserify the prelude

# tofu parser
- [x] mvp
  - [x] analyze required files for platform API usage
  - [x] use this to spit out a sesify config file (or something)
  - [x] get dependency info
  - [x] use generated config
- [ ] not terrible
  - [ ] more granular autogen config
    - [x] detect API usage on global
    - [x] dont pass window if no property accessed
    - [x] granularity on certain apis, e.g. document
    - [ ] raise platform api granularity to common denominator (e.g. dedupe "location" and "location.href"), including defaultGlobals
    - [ ] maybe limit granularity to actual platform API surface (e.g. not "location.href.indexOf")
    - [ ] browserify insertGlobal is ruining the parsing of properties on global
        - bc declaring the global object and passing it into a closure causes acorn-globals to ignore the uses of the global var
  - [x] user config defaultGlobals
  - [ ] location and document.location is redundant
  - [ ] location and location.href trigers page reload < !!! wow ouch !!! >
  - [ ] easy user override
    - [ ] likely need revDeps pointers at run time
  - [ ] use SES.confine instead of realm.evaluate
  - [ ] update ses
  - [ ] basic safety review
  - [ ] use autogen config if set to generate ?
- [ ] fancy
  - [ ] permissions as higher abstractions (network, persistence, DOM)
  - [ ] permissions sorted by risk (?)

# usability
  - [ ] cli support
    - [x] config gen
    - [ ] config read