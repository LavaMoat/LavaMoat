
lavamoat/survey execTest trials
  - [ ] chalk@4
    - [x] de-hashbang
    - [ ] 
  - [ ] eth-sig-util
    - [x] native module resolution error
    - [ ] es-abstract etc issues
    - [ ] ArrayBuffer.isView bug https://github.com/LavaMoat/cytoplasm/issues/6


me
- [x] lavamoat runtime survey
- metamask build sys!
  - [x] bug! getMinimalViewOfRef `fakeParent` is not the deep parent, need to combine  deepGetAndBind + deepDefine so that fakeParent is the immediate parent
  - [ ] ses-compat function.prototype.name no can set : (
    - [ ] "gulp-livereload#tiny-lr#body#error"
  - [ ] ENOENT: no such file or directory, open 'worker_threads' (builtin missing in node v10)
  - [ ] lavamoat - unable to resolve "../../object/valid-value" from "/home/xyz/Development/metamask-extension/node_modules/es5-ext/array/#/clear.js"



michaelfig
- [ ] allow build nodejs bundles

guybedford user study!
- [ ] multiple entry points
- [ ] interactive/dynamic mode? (for whitelisting things as it goes)
  - [ ] exec code with full permission
  - [ ] understand global lookups
- [ ] config schema validation
- [ ] dislikes camelcase in cli args
- [ ] shorter cli args, shortcuts
- [ ] viewing config diffs in git is confusing sometimes because it can cut the package name
  - [ ] better summatry of changes tp config
- [ ] lavamoat-tofu bug: this structure is not a global ref, also getters { hello() {} }
- [ ] Errors are ugly as hell
- [ ] generate nodejs policies file!

- [ ] makeResolve hook needs to resolve to null and not break (emulate nodejs optional dep behavior)
  e.g. `node-fetch` optional requires `encoding`

blocking
- [ ] feat: exportsProtections config - `chalk@2` intentionally modifies `ansi-styles` exports
- [ ] dynamic requires / "*" wildcard in policy files
annoying
- [ ] browserify: defaults config paths for lavamoat-node and -browserify differ
- [ ] err: required package not in whitelist: package "readable-stream" requested "events" as "events"
  - maybe related to multiple versions of the package?
- [ ] source transforms: possible html comment syntax rejected around line 4598
- [ ] doc: debugMode - this is what you see:
        LavaMoat/core/kernel:945
                throw outErr
                ^
        Object <[Object: null prototype] {}> {}
- [ ] doc: dynamicRequires - this is what you see
        Error <Object <[Object: null prototype] {}>>: LavaMoat - required package not in whitelist: package "module-deps" requested "envify" as "/home/xyz/Development/eth-faucet/node_modules/envify/index.js"


globalLexicals for cjs
moduleRecord.execute
importRelativeHook may need to be called for every value of live binding, change interface to transform a value
  hey its membrane-like (parentModuleRecord, childModuleRecord, name, value)

lavamoat as a sandbox for cli's (npx for lavamoat)

problems:
  node-gyp-build, bindings
    require('node-gyp-build')(__dirname)
      just do a special case?
  synchronous dynamic cjs requires
    policy file for allowing dynamic cjs
    lets add to survey!


- [ ] deliver homework for kriskowal
  - "a fn that will build a policy file for a cjs module"
  - "... and for an esm"
  - [ ] test generating policy for esm
  - [ ] throw an error here, if ignore flag is not set
  - [ ] ship new major core
    - [ ] require native modules behind policy flag
      - [ ] refactor module inspector to use switch statement for type
    - [ ] use LavamoatModuleRecord everywhere
      - [x] core/parseForConfig
      - [x] node/parseForConfig
      - [x] core/generateConfig
        - [x] browserify still using this via createConfigSpy
        - [x] packageModules[ ] collecting moduleData (previously)
        - [x] debugData now contains moduleRecords
      - [x] browserify/*?
      - [ ] core/kernel
        - [ ] sync things must become async
        - [ ] options migration
          getRelativeModuleId -> makeResolveHook Sync (?)
          loadModuleData -> makeImportHook
      - [ ] packageDataForModule
        - [ ] browserify/createPackageDataStream
        - [ ] node/kernel
        - [ ] node/parseForConfig  
    - [x] move core -> browserify?
      - [x] createPackageDataStream
      - [x] createConfigSpy
      - [x] generatePrelude
        - ref'd in webpack, so maybe ok to keep for now
    - [ ] remove "package" key (keep packageName) from LavamoatModuleRecord
      - [ ] core/kernelCoreTemplate
      - [ ] core/test/builtin
- [x] be podcast ready

- [ ] re-examine pluggable exportsDefense strat?


- [x] importHook/resolveHook based parseForConfig
- [x] survey: report on primordial mutators
- [x] tofu/inspectEnvironment: richer analysis results
- [x] inspectImports: ensure `require` is the global `require`
- [ ] survey: de-blacklist nyc, others
- [ ] survey/tofu: tolerate and report non-strict modules

- [x] dont error if copying minimal view finds a missing key
- [x] unused imports need to be whitelisted or at least allowed as empty (e.g. mime)
- [x] minimal view doesnt look at prototype chain : (
- [x] get minimal view before applying membrane
- [x] err: package "safe-event-emitter" requested "events" as "events/"
- [x] native module policy
- [x] native module auto config
- [x] deterministic policy file (node?)
- [x] cleanup violations warning "Incomptabile code detected in package "browserify"
- [ ] update all example and test repo configs





- [ ] strict mode compat
  - syntax errors
    - no `with`              <--
    - `delete identifier`    <-- 
    - legacy octals          <-- trivial rewrite
      unicode escape sequences
    - reserved words under strict mode  <-- babel plugin exists

  - runtime error
    - implicit globals / assigning to undefined var
    - failed assignment/delete causes a throw


TODO
- analysis: why are primordials mutated
- ses whitelist: get actual list of primordials for mutation checking

"private"
  premise incorrect

kepler

2 phase commit
  reserve resources
  commit

cosmos sentry arch
socially established network of validators

agoric
  getting started

internal hackathon monday-thursday


ses mtg



is there a list of "undeniables"
  maybe @caridy has one
  where to keep
    262 non-normative?
    realm spec?
    compartment spec?

whats the identity discontinuity story for compartments, endo
  compartments
    mostly dont encounter this problem
    need unique constructors that close over their parent (?)
      but also need to differentiate from the start compartment
  endo?
    same as compartments
    but transformations like metering are relevant
      which may require a custom Compartment constructor

relationship of compartments + lockdown
  compartments can exist without lockdown
  "lockdown needs to be aware of everything presented in global scope"
    akin to relationship of lockdown to function
  shims need to run after repairs and before hardening
    1. repair
      taming function constructors (+ eval?)
      other tame options
    2. whitelist intrisics, delete disallowed properties
    3. property overrides
    4. shims, if any
    5. harden

membrane call
  when do we need Near Membranes
    seems so, even within one realm
      blue proxy for red date instance
        Date.prototype is same
    NM initializes the correspondance tables
      hard because of the exotic internal slot
      potentially problematic statements across membrane boundaries
        Date.prototype.getTime.call(dateProxy)
        dateProxy.getTime()
      example monkey patch
        have a fallback for getTime() "Magic" from the slides
      how many things are problematic?
        Date and other things with exotic internal slot
      exotic
        transparent: eg Proxy will trap on [[prototype]]
        Proxy has no chance to emulate the internal slot
        "an internal slot that a Proxy cant trap for"

endo timeline?
  in review


membrane space

for any 2 packages 

endo post processing?
  assemble fn accepting an additional opt that would "allow you to interpose"
    hook for,
      signature function (a value, src, dest) {}
        https://github.com/Agoric/SES-shim/blob/master/packages/ses/src/compartment-shim.js#L97-L98
        https://github.com/Agoric/SES-shim/blob/master/packages/ses/src/compartment-shim.js#L97-L154
        functor is the transformed module code
        https://github.com/Agoric/SES-shim/blob/master/packages/ses/src/module-instance.js#L333
        https://github.com/Agoric/SES-shim/blob/master/packages/ses/src/module-link.js
        https://github.com/Agoric/SES-shim/blob/master/packages/ses/src/module-load.js#L52-L63
        
        somewhere around here we need to apply a hook with the src/dest compartments
        https://github.com/Agoric/SES-shim/blob/master/packages/ses/src/module-instance.js#L254-L255


moddable's compartment
  resolveHook
  no external for loading
  no internal for


exhaustive list for modules

"live bindings are tricky"


commonjs
  increase code we can run in the start compartment without modification
    distinct compartment constructors
      allow different taming per compartment
      inherit a static module from a parent?

  external linkage (eg non js)
    StaticModuleInterface
      commonjs goes here

"you dont want a static child to be able to observe lazy loading"



- endo:
  - post-import hook
    - synthetic static module records 
  - compartment configuration hook?

- snap-dragon:
  - service discovery

- ocap ref analysis
  - answer questions like who gets access to this obj and its values
  - symbolic execution for branch analysis?

BP: Behavior-based bound on EP
TP: Topology-based (Arrangement-based) bound on EA

permission: direct access to cap
authority: connectivity across permissions to a cap

Static Analysis
  points-to analysis
  escape analysis
  ownership types

Lavamoat is currently showing *initial permissions*
  does not take into account how caps can be passed *into* and out of packages 


- continue ref checking
- print papers
- mm pr


esm/cjs endo/lavamoat sync/async
  require (execute?): sync
  
  resolve (makeResolveHook): async
  load (makeImportHook): async

  so resolve + load all, then syncly execute?
  
  init becomes async? (top-level doesnt run synchronously)
    option to skip resolve/load (browserify) -> everything is already in cache!

  need to initialize all deps first? no, but need to load them
  execution order is reversed
  e.g. can't monkey-patch globals before requiring something

  getRelativeModuleId -> makeResolveHook
  loadModuleData -> makeImportHook

- [x] markm wants to know what RegExp prop needs repair for node v10 (resolved?)
- [x] kriskowal wants survey api usage link, core/parseForConfig createModuleInspector
