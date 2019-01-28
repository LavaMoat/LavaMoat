# the big ones
- [ ] (external) SES prototype.toString etc
- [ ] autogen granularity
- [ ] sourcemaps

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
  - [ ] ensure we keep the "this" context, esp for deepGets
  - [ ] ensure we dont break Constructors with our "this" fix
- [ ] browserify insertGlobal is ruining the parsing of properties on global
- [ ] sourcemaps
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
  - [ ] easy user override
    - [ ] likely need revDeps pointers at run time
  - [ ] use SES.confine instead of realm.evaluate
  - [ ] update ses
  - [ ] basic safety review
- [ ] fancy
  - [ ] permissions as higher abstractions (network, persistence, DOM)
  - [ ] permissions sorted by risk (?)
