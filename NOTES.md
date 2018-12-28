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

- [ ] need to not break sourcemaps
- [ ] lockdown everything thats passed to module initializer
  - [ ] wrap newRequire, etc
  - [ ] remove excessive + dangerous moduleInitializer args
    - [ ] investigate why corejs was using arguments[4] and see if others are too
- [ ] try using the frozen realm + container architecture
- [ ] handle module names with @xyz/abc format
- [ ] allow less restrictive sandboxing modes (prototype.toString())
- [ ] battletest via metamask
  - [x] background boot works : )
  - [x] sent first tx for background-only sesified
  - [ ] contentscript doesnt?
  - [ ] find sane default endowments
- [ ] cleanup prelude
- [?] browserify the prelude
- [?] allow global caching ?

questions:

are we safe if we keep cache per-module (to avoid module.exports modifications) but share a global realm
  - clearTimeout/clearInterval interference
  - realm modifications, e.g. globals?
  - definitely endowments
