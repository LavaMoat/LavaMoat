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

- [?] try using the frozen realm + container architecture
- [ ] allow less restrictive sandboxing modes (prototype.toString())
- [ ] battletest via metamask
  - [x] background boot works : )
  - [x] sent first tx for background-only sesified
  - [ ] contentscript doesnt?
  - [ ] find sane default endowments
- [?] browserify the prelude
- [?] is global caching safe? (no)

# tofu parser
- [x] mvp
    - [x] analyze required files for platform API usage
    - [x] use this to spit out a sesify config file (or something)
    - [x] get dependency info
    - [x] use generated config
- [ ] not terrible
    - [ ] more granular autogen config
        - [ ] detect API usage on global
    - [ ] easy user override
    - [ ] user config defaultGlobals
    - [ ] verify basic safety
- [ ] fancy
    - [ ] permissions as higher abstractions (network, persistence, DOM)
    - [ ] permissions sorted by risk (?)


questions:

are we safe if we keep cache per-module (to avoid module.exports modifications) but share a global realm
  - clearTimeout/clearInterval interference
  - realm modifications, e.g. globals?
  - definitely endowments
