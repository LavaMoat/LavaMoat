some notes
  - bundler plugins
    - two phases: generate config, generate build
  - lavamoat internals
    - requireRelativeWithContext
      - passed directly to moduleInitializer (untrusted code)
      - calls requireRelative with parentModule context added
    - requireRelative
      - translates the "requestedName" (eg relative path) to a moduleId (webpack doesnt need this, it rewrites the source to use the moduleId directly)
      - handles weird browserify-specific recursive lookups (eg buffer, timers)
      - calls internalRequire
      - uses the module config's protectExportsRequireTime
    - internalRequire:
      - instantiates the module in the specified context with
  - known / potential issues
    - sneaky setting of packageName by dir hacks?
    - magicCopy doesnt walk the full prototype graph
    - perf overhead
    - doesnt solve architectural weaknesses
    - doesnt enforce disabling scripts (yet!)

- [ ] review the audit
  - [ ] easy
    - [ ] Issue I: [LavaMoat] Code Injection via Label in ​wrapWithReturnCjsExports
    - [x] Issue G: [LavaMoat] Prevent Access to __​proto​__ from ​deepGet
      - fixed in f903354ca64b7aa46511d6c83d13921253df6ab1
    - [ ] Suggestion 4: [LavaMoat] Hide ​stacktraces
  - [ ] hard
    - [ ] Issue H: [LavaMoat] Exported Factory Function Can Return Shared Object
      - cant fix: exported functions can return objects that should be mutable.
      - we currently assume that classes they use are on module.exports somewhere
      - we may be able to do something like intercept every value and ensure its prototype is protected... should all prototypes be readOnly?
    - [ ] Issue J: [LavaMoat] Child dependencies Can Access a Parent Module’s Exports Before Harden is Applied
      - we should disallow package-level circular deps
      - to some degree you rely on your deps to mutate objects you give them
  - [ ] unknown difficulty
    - [ ] Suggestion 3: [LavaMoat] Detect Additional Primordials
    - [ ] Suggestion 5: [LavaMoat] Stronger Magic Copy

LA audit kickoff todos
- [x] clarify requireFns
- [x] audit cache, looks broken
- [x] transfer `sesify-tofu`
- [x] move as much code into ses as possible
- [x] remove alternate export protection strategies (underdeveloped)
- [x] comment shit you cowboy

another list of todos
- [x] isEntry based on packageName
- [x] remove modulePath
- [x] unify on `<entry>` or `<root>`
- [x] remove providedEndowments
- [x] enforce deps whitelist in config
- [x] devex would be improved if `--config` was constant and `--writeAutoConfig` used the `--config` path as destination
- [ ] unit test kernel components
- [ ] breakout kernel / kernel building utils
- [ ] unify on `depMap` (?)
- [ ] unify on `kernel`/`prelude`/`runtime`
- [ ] test sneaky setting of packageName by dir hacks
- [ ] module mappings
  - [ ] requestedName -> moduleId
  - [ ] moduleId -> { packageName, path }
- [ ] idea: maybe encode dep graph (and cache) as weakmap pointers so they disappear as `require` ref is dropped
- [ ] document browserify usage

- [ ] using `--writeAutoConfig` should create a valid build using the generated config

exportsProtection strategies
- [ ] harden strategy
  - tests
- [ ] fresh eval/instantion doesnt require magicCopy

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


### recent notes + todo
- importer can decorate: common
- importer can see late sets: uncommonn


SES
  - thoughts
    - worried im blocked by the `typeof xyz` erroring issue
    - can work around `globalThis.Object === Object`
    - need to summarize endowments-sloppyGlobals-globalThis requirements
  - [x] ok a plan of action
    - use compartments
    - remove sloppyGlobals
    - define getters/setters on readable/writable globals
  - [x] autoconfig / global detection does not support writes
    - re-examine tofu
    - otherwise consider whats needed to detect
  - [x] evaluate current proposal (fixed in SES)
    - await feedback
    - [x] examine for differences in using getters on endowments
    - [x] test in metamask
      - [x] Symbol.iterator, Symbol.asyncIterator, Symbol.toStringTag
  - [x] document and diagram scope
    - endowments
    - realm.global
    - cjs module source
  - [ ] endowment ref tree generation is kinda broken
    - [ ] how to handle deep sets?
  - [x] Function constructor globalThis hack (?)

- also interested in doing deeper dep analysis for dep dashboard
  - draw lines for global writes to global reads

debug bundle sesh in metamask
- ??
  -- in sentry deps, mod.require is undefined. `module.require` appears in node
    maybe fine, as we already use this in browserify and its not supported
  - "obs-store" doesnt have localStorage access despite use?
  - [x] setTimeout not whitelisted for package "process"
    - problem: packageName is "_process"
  - ui <root> deps maps "react-dom" to "react-dom", not moduleId (why?)
    - external deps (uideps bundle)
  - metamask minifying the whole bundle, including kernel?

- sesify
  - [x] allow deletes for global writes
  - [x] must support globalThis getter via Function
  - [x] loading "buffer" fails - seems not added to parent modules deps map (witnessed in bn.js)
      why: node_modules/ethjs-abi/node_modules/bn.js/lib/bn.js | grep "'buf' + 'fer'"
      need to upgrade to a proper error
  - [ ] drop console warns
  - [ ] debugging: label package + file name
  - [x] globals
    - [x] global writes
      - [x] feature
      - [x] test
      - [x] autoconfig
    - [x] inspect globals
      - [x] should check for anything
        - [x] "Blob"
        - [x] "regeneratorRuntime"
      - [x] fix endowment generation
        - [x] Blob.prototype is undefined
  - [x] workaround for assigning to __proto__
  - [ ] endowments
    - [ ] make sure generateEndowments works correctly with globalStore
      - seeing an error with regeneratorRuntime.mark in eth-json-rpc-middleware / json-rpc-engine
      - cant call defineProperty on a string (`location.href.indexOf`)
  - [ ] options
    - [ ] conflicts when autogen + config is specified
    - [ ] use autogen config in output
    - [ ] investigate "unfrozen" reccomendation reasoning
  - [ ] DevEx
    - [ ] seems to break on live reload
      - doesnt seem to get new config on reload?
      - reload on config change only works once?
- [x] babel-thing (obsolete due to fix in SES)
  - [x] handle frozen prototype writes to `next` (iterator)
  - [x] length of array is writable but not configurable, so defining 'length' fails (in bignumber.js)

- metamask
  - [x] "content-hash" current version contains reserved word "package"
  - [x] sentry does weird shit, maybe remove it for now
  - [x] inpage, cleanContextForImports called before var dec? (due to error?)
  - [x] transforming ui with babel-thing
  - [ ] shouldnt need regeneratorRuntime ?
    - getting it in eth-json-rpc-middleware / json-rpc-engine
  - [ ] aes-js (old ver) modifies Array.prototype
    dep paths:
      <root>
      eth-hd-keyring
      eth-simple-keyring
      gaba
        ethereumjs-wallet
          aes-js

# older bundleEntryForModule
todo
- [x] shared instances of modules
  - [x] revert the seperation of eval / global injection
- [x] make config like agoric prototype
  - [x] config is json
  - [x] global-grabbing engine needs to move to sesify prelude
- [x] update SES
  - [x] some issue with prelude or SES kernel running in strict mode
- [x] shared instances of modules
  - [x] revert the seperation of eval / global injection
  - [x] update cache key generator
- [x] mark question: while `this` is container global, `self` is undefined
- [x] fix globalRefs
  - [x] fix objCheckSelf
  - [x] fix objCheckGlobal
- [x] new config
  - [x] make config like agoric prototype
  - [x] config is json
  - [x] config -> endowments in sesify prelude
  - [x] need tests that generate config then use it
  - [x] cleanup old config generation
  - [x] get packageName from modules stream
  - [x] allow easy override of configuration
  - [x] no longer de-duping overlapping namespaces? (needs test)
- [ ] config advanced
  - [ ] execution environment options
    - [x] autogen config from "alt environment heuristics"
    - [ ] execute unfrozen in fresh realm
  - [ ] defensibility/hardening options
    - [x] magic copy
    - [x] kowtow
    - [x] return raw if same package (dont defense)
    - [ ] @agoric/harden
      - ? metamask error hardening proto chain
  - [ ] enforce configuration
    - [ ] fail at buildtime if deps violation
    - [x] enforce globals
  - [ ] move SES config into sesify config
- [x] mystery bugs
  - [x] `this.Object` gets transformed to `undefined.Object` in mm
- [ ] cleanup prelude
- [ ] sesify metamask
  - [x] autogen config
  - [x] setup build sys
  - [x] debug boot
  - [ ] debug runtime
  - [x] gulp task for autogen
- [ ] improve pluginOpts
  - [ ] config vs sesifyConfig
  - [ ] if autoconfig, use that config
- [ ] question
  - [x] sesify with unfrozen realm
    - should be on Realm.evaluate, verify
  - [x] how to create a copy of a fn class

if autogen config
  - allow browserPack to pause stream until config is generated
  - generate config then unpause browserPack
  - back pressure could cause a dead lock (?)


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

- [x] (external) allow less restrictive sandboxing modes (prototype.toString())
- [x] (external) closer control over global? pass in "window" such that (window.Object === Object)

- [?] browserify the prelude

# tofu parser
- [x] mvp
  - [x] analyze required files for platform API usage
  - [x] use this to spit out a sesify config file (or something)
  - [x] get dependency info
  - [x] use generated config
- [ ] not terrible
  - [x] more granular autogen config
    - [x] detect API usage on global
    - [x] dont pass window if no property accessed
    - [x] granularity on certain apis, e.g. document
    - [x] raise platform api granularity to common denominator (e.g. dedupe "location" and "location.href"), including defaultGlobals
    - [?] maybe limit granularity to actual platform API surface (e.g. not "location.href.indexOf")
    - [x] browserify insertGlobal is ruining the parsing of properties on global
        - bc declaring the global object and passing it into a closure causes acorn-globals to ignore the uses of the global var
  - [x] user config defaultGlobals
  - [?] location and document.location is redundant
  - [x] location and location.href trigers page reload < !!! wow ouch !!! >
  - [x] easy user override
    - [x] likely need revDeps pointers at run time
  - [x] use SES.confine instead of realm.evaluate
  - [x] update ses

# audit
- [ ] basic safety review
- [ ] LA audit

# devx
- [ ] use autogen config if set to generate ?
- [ ] cli support (?)
  - [x] config gen
  - [x] config read
- [ ] lots of config noise due to console, setTimeout
- [ ] sourcemaps
  - metamask sourcemaps are already a mess
  - then sesify sourcemaps get a bit worse

# idea icebox
- [ ] permissions as higher abstractions (network, persistence, DOM)
- [ ] permissions sorted by risk (?)

# the big ones
- [x] autogen granularity
- [x] sourcemaps
- [x] do call with agoric/MM
- [x] (external) SES prototype.toString etc
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

### cli testing
eval in sesify bundle
```
echo 'console.log(self.process === process)' | browserify - --detect-globals false --no-builtins -p [ './src/index.js' --sesifyConfig '{"resources":{"<root>":{"globals":{"console":true,"process":true}}}}' ] | node
```
eval in ses
```
node -p "try { require('ses').makeSESRootRealm().evaluate('const x = {}; x.hasOwnProperty = ()=>{}') } catch (err) { console.log(err.message) }"
```
npm bug workaround
```
npm unlink sesify && npm i && npm link sesify
```
