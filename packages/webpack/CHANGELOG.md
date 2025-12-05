# Changelog

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^15.1.0 to ^15.1.1

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^15.1.1 to ^15.1.2

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^15.2.0 to ^15.2.1

## [1.6.0](https://github.com/PEAC337/LavaMoat/compare/webpack-v1.5.6...webpack-v1.6.0) (2025-12-05)


### Features

* **webpack,core:** Add a meta field to policy resource, report webpack optimizations to it. ([a53b434](https://github.com/PEAC337/LavaMoat/commit/a53b434e21e074d2261a4e84b85e33fe8aa87278))
* **webpack:** add explicit error messages when a compilation concludes with nothing to protect ([f12985f](https://github.com/PEAC337/LavaMoat/commit/f12985f15a46e0d022d9caef8a0e5e646529575c))
* **webpack:** add generatePolicyOnly option ([#1789](https://github.com/PEAC337/LavaMoat/issues/1789)) ([72900cd](https://github.com/PEAC337/LavaMoat/commit/72900cd22a954a15d9fe96a8bd4b2f844ba3797c))
* **webpack:** add undocumented __unsafeAllowContextModules flag to allow experimenting with contextmodules without leaving them vulnerable by default ([8eca7f1](https://github.com/PEAC337/LavaMoat/commit/8eca7f16dc0270875f99e329b46fd5555c8e1e9d))
* **webpack:** avoid emiting resource assets from packages by default ([#1451](https://github.com/PEAC337/LavaMoat/issues/1451)) ([325bf2a](https://github.com/PEAC337/LavaMoat/commit/325bf2a1dc5c9c048ef36148d5611a2a5112ec0d))
* **webpack:** defend webpack runtime from scuttling ([#1740](https://github.com/PEAC337/LavaMoat/issues/1740)) ([0f094bd](https://github.com/PEAC337/LavaMoat/commit/0f094bd38a1a2c159d5f49864ef97ec57403a43f))
* **webpack:** document and officially release scuttling in webpack plugin ([#1829](https://github.com/PEAC337/LavaMoat/issues/1829)) ([9c83030](https://github.com/PEAC337/LavaMoat/commit/9c83030d97371478bf59b10d636e63168bd8473d))
* **webpack:** enable syntax checks by default, check prior to concatenation. ([e74a55b](https://github.com/PEAC337/LavaMoat/commit/e74a55bdc7f83739d8d1fec0b3c5f6852470c6cc))
* **webpack:** null runtime ([4374b7a](https://github.com/PEAC337/LavaMoat/commit/4374b7a65ef551d123396b32e78cd6fd976ecd8e))
* **webpack:** policy debugging capabilities and tighter tests ([20b12ad](https://github.com/PEAC337/LavaMoat/commit/20b12ad38a78678c8291b4841e8c4d00b349c1aa))
* **webpack:** prevent webpack from eliminating reexports and failing policy enforcement ([#1827](https://github.com/PEAC337/LavaMoat/issues/1827)) ([5f4d4fc](https://github.com/PEAC337/LavaMoat/commit/5f4d4fcdf6395bd749918d2b6bed7c5e822629e2))
* **webpack:** properly expose types for the plugin ([#1741](https://github.com/PEAC337/LavaMoat/issues/1741)) ([abd4450](https://github.com/PEAC337/LavaMoat/commit/abd445066bd698ada041bc717b8ebcee5ea6b296))
* **webpack:** repair for window.event deprecated leaky poperty ([#1785](https://github.com/PEAC337/LavaMoat/issues/1785)) ([86d944b](https://github.com/PEAC337/LavaMoat/commit/86d944bfc0f65e5d27c6f598add72016de579565))
* **webpack:** repairs for globals that need more than unwrap from core ([#1751](https://github.com/PEAC337/LavaMoat/issues/1751)) ([86ad964](https://github.com/PEAC337/LavaMoat/commit/86ad964f6b1d33950aea10849052e8cfc8459663))
* **webpack:** static shims for runtime, runtimeConfigurationPerChunk_experimental to control embedded runtime options ([#1792](https://github.com/PEAC337/LavaMoat/issues/1792)) ([c69a08d](https://github.com/PEAC337/LavaMoat/commit/c69a08d5af47e20ee0580fa5f0fcc804cb6d6928))
* **webpack:** support scuttling ([#1298](https://github.com/PEAC337/LavaMoat/issues/1298)) ([9630600](https://github.com/PEAC337/LavaMoat/commit/963060078d16fab80f24d49ea945a08fc51b9384))
* **webpack:** unlockedChunksUnsafe option to refrain from protecting selected chunks ([#1375](https://github.com/PEAC337/LavaMoat/issues/1375)) ([1f24683](https://github.com/PEAC337/LavaMoat/commit/1f24683e2e6cddefbc492c0925d0d7d5e3b995c0))
* **webpack:** use the final module info in connections to handle the optimizations webpack sideEffect option does. wip ([9c7b305](https://github.com/PEAC337/LavaMoat/commit/9c7b3050460b4cc79b04ac422bdfb69540893bd9))
* **webpack:** webpack context modules and chunk lazy loading support ([#1553](https://github.com/PEAC337/LavaMoat/issues/1553)) ([3602f65](https://github.com/PEAC337/LavaMoat/commit/3602f6598196ec99287fe239aa1708d9f80c0e0c))


### Bug Fixes

* add Node.js v24.0.0 to supported engines ([ad9cdcd](https://github.com/PEAC337/LavaMoat/commit/ad9cdcdf83ccbda8bf2eba427d0c80f761f47a0a))
* **core,webpack:** remove deprecated lockdown options ([efec539](https://github.com/PEAC337/LavaMoat/commit/efec5391eec838689ce2426de617571d0f276f2c)), closes [#1578](https://github.com/PEAC337/LavaMoat/issues/1578)
* **core:** block circular global object endowments ([#1505](https://github.com/PEAC337/LavaMoat/issues/1505)) ([6745a0e](https://github.com/PEAC337/LavaMoat/commit/6745a0edee85171e4062aaec31d7f25bf3a97e46))
* **deps:** update babel monorepo ([afc9fe5](https://github.com/PEAC337/LavaMoat/commit/afc9fe5fef98c53abe014ff657a1d4f59883abe8))
* **deps:** update babel monorepo ([e6f4e70](https://github.com/PEAC337/LavaMoat/commit/e6f4e70cffe8237c27126046bb0cfa5515c2d138))
* **deps:** update babel monorepo to v7.25.8 ([1dcb35e](https://github.com/PEAC337/LavaMoat/commit/1dcb35e023823710343b5f0a4ca589cdfe647e7d))
* **deps:** update babel monorepo to v7.25.9 ([6d9d5a3](https://github.com/PEAC337/LavaMoat/commit/6d9d5a3336444fada49e239756ffc3c207d3ff5d))
* **deps:** update babel monorepo to v7.26.7 ([#1524](https://github.com/PEAC337/LavaMoat/issues/1524)) ([7285fdf](https://github.com/PEAC337/LavaMoat/commit/7285fdf6ce5c337443840525b79c7653708b541f))
* **deps:** update babel monorepo to v7.26.9 ([6a9dc73](https://github.com/PEAC337/LavaMoat/commit/6a9dc735f18a5b95e82b86ec2bd466ee4433172f))
* **deps:** update babel monorepo to v7.27.0 ([#1589](https://github.com/PEAC337/LavaMoat/issues/1589)) ([efd83d7](https://github.com/PEAC337/LavaMoat/commit/efd83d7ea7a5f5f9d2157248d4e2f8b7f9c48c56))
* **deps:** update dependency json-stable-stringify to v1.3.0 ([#1613](https://github.com/PEAC337/LavaMoat/issues/1613)) ([f9314d1](https://github.com/PEAC337/LavaMoat/commit/f9314d1a238d31a0164356c1c6bd6f6e36246d56))
* **deps:** update dependency ses to v1.10.0 ([#1422](https://github.com/PEAC337/LavaMoat/issues/1422)) ([b6f0589](https://github.com/PEAC337/LavaMoat/commit/b6f0589cf9730fac8173a3fca0c4a031bd64f12f))
* **deps:** update dependency ses to v1.12.0 [security] ([#1605](https://github.com/PEAC337/LavaMoat/issues/1605)) ([881ae86](https://github.com/PEAC337/LavaMoat/commit/881ae86b9a4c27ab60a3c76a4a69f5de246eb2ed))
* **deps:** update dependency ses to v1.14.0 ([#1746](https://github.com/PEAC337/LavaMoat/issues/1746)) ([3e4b834](https://github.com/PEAC337/LavaMoat/commit/3e4b834df3430d9f919e7df31f42d23e9b6bb352))
* **deps:** update dependency ses to v1.9.0 ([75cae74](https://github.com/PEAC337/LavaMoat/commit/75cae74063c444184fea3370bf9925bc7946846a))
* make policy ordering consistntly manifest itself in json files produced ([a149a7d](https://github.com/PEAC337/LavaMoat/commit/a149a7d16d65bc4255cf32211a671823356565da))
* typescript got confused into creating a cyclic reference in types for scuttling in core ([5e25a36](https://github.com/PEAC337/LavaMoat/commit/5e25a361094a7b3ed7ae2744cd405910f9dc3baa))
* upgrade ses to v1.11.0 ([a12dae1](https://github.com/PEAC337/LavaMoat/commit/a12dae13e8c7f70082199ba186659ea413e82ded))
* **webpack:** adapt scuttling config for runtime regardless of where it comes from ([#1839](https://github.com/PEAC337/LavaMoat/issues/1839)) ([b1ad321](https://github.com/PEAC337/LavaMoat/commit/b1ad321cb8b3e36a44fa661a7d2f5899f7a08fdc))
* **webpack:** add j to the list of harmless fields on __webpack_require__ ([#1838](https://github.com/PEAC337/LavaMoat/issues/1838)) ([7035a40](https://github.com/PEAC337/LavaMoat/commit/7035a404627d038e9ff7b4d5fd2e7b7ed8928194))
* **webpack:** adjust MessageEvent repair to reliably work in the bizarre context of Firefox webextension contentscript ([#1830](https://github.com/PEAC337/LavaMoat/issues/1830)) ([33d83d7](https://github.com/PEAC337/LavaMoat/commit/33d83d7402f9b914c7f4d7f9cd18f979c2f406c5))
* **webpack:** avoid scuttling the global Webpack uses for sharing chunks ([#1762](https://github.com/PEAC337/LavaMoat/issues/1762)) ([6f39c95](https://github.com/PEAC337/LavaMoat/commit/6f39c95407a280aa13bf90adb634f8b86821e0f0))
* **webpack:** fix how ambient asset files requests are filtered ([#1739](https://github.com/PEAC337/LavaMoat/issues/1739)) ([3f914cf](https://github.com/PEAC337/LavaMoat/commit/3f914cf3716d3a4978a80f419fb265db10fc0ae6))
* **webpack:** fix the naive assumption that there can only be 1 module with a certain path ([#1793](https://github.com/PEAC337/LavaMoat/issues/1793)) ([262bb3d](https://github.com/PEAC337/LavaMoat/commit/262bb3d61016b42977d0c21c83b22cfbbd78a3e9))
* **webpack:** import types from ses ([78aca55](https://github.com/PEAC337/LavaMoat/commit/78aca5583adc5366c8717fd196b72bdd828b38ed))
* **webpack:** MessageEvent repair should not prevent further overrides ([#1787](https://github.com/PEAC337/LavaMoat/issues/1787)) ([0c8fc19](https://github.com/PEAC337/LavaMoat/commit/0c8fc1914e0e7a8432edbf6d9e8d2604ee17d291))
* **webpack:** prevent toString manipulation on a specifier ([1163085](https://github.com/PEAC337/LavaMoat/commit/1163085b29bcc5a78f08b840393bf1edbe099045))
* **webpack:** strip policy meta from the policy that goes into the bundle, fix related tests ([645d0f2](https://github.com/PEAC337/LavaMoat/commit/645d0f2311a9871694b6bf14bb4ce3c81b2311c8))
* **webpack:** support regex in scuttling exceptions ([#1529](https://github.com/PEAC337/LavaMoat/issues/1529)) ([45c0308](https://github.com/PEAC337/LavaMoat/commit/45c0308c655c9903f9bdfa17a30460b10f22a219))
* **webpack:** undo the forced overwrite of parent and top references ([#1666](https://github.com/PEAC337/LavaMoat/issues/1666)) ([adec627](https://github.com/PEAC337/LavaMoat/commit/adec627069e201a7353a89876d0964dd54e1fa9b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/aa bumped from ^4.3.4 to ^4.3.5
    * @lavamoat/types bumped from ^0.1.0 to ^0.2.0
    * lavamoat-core bumped from ^17.1.2 to ^18.0.0

## [1.5.6](https://github.com/LavaMoat/LavaMoat/compare/webpack-v1.5.5...webpack-v1.5.6) (2025-12-02)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^17.1.1 to ^17.1.2

## [1.5.5](https://github.com/LavaMoat/LavaMoat/compare/webpack-v1.5.4...webpack-v1.5.5) (2025-12-01)


### Bug Fixes

* typescript got confused into creating a cyclic reference in types for scuttling in core ([5e25a36](https://github.com/LavaMoat/LavaMoat/commit/5e25a361094a7b3ed7ae2744cd405910f9dc3baa))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^17.1.0 to ^17.1.1

## [1.5.4](https://github.com/LavaMoat/LavaMoat/compare/webpack-v1.5.3...webpack-v1.5.4) (2025-11-19)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^17.0.1 to ^17.1.0

## [1.5.3](https://github.com/LavaMoat/LavaMoat/compare/webpack-v1.5.2...webpack-v1.5.3) (2025-10-30)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^17.0.0 to ^17.0.1

## [1.5.2](https://github.com/LavaMoat/LavaMoat/compare/webpack-v1.5.1...webpack-v1.5.2) (2025-10-27)


### Bug Fixes

* **webpack:** adapt scuttling config for runtime regardless of where it comes from ([#1839](https://github.com/LavaMoat/LavaMoat/issues/1839)) ([b1ad321](https://github.com/LavaMoat/LavaMoat/commit/b1ad321cb8b3e36a44fa661a7d2f5899f7a08fdc))
* **webpack:** add j to the list of harmless fields on __webpack_require__ ([#1838](https://github.com/LavaMoat/LavaMoat/issues/1838)) ([7035a40](https://github.com/LavaMoat/LavaMoat/commit/7035a404627d038e9ff7b4d5fd2e7b7ed8928194))

## [1.5.1](https://github.com/LavaMoat/LavaMoat/compare/webpack-v1.5.0...webpack-v1.5.1) (2025-10-09)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.7.1 to ^17.0.0

## [1.5.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v1.4.0...webpack-v1.5.0) (2025-10-01)


### Features

* **webpack,core:** Add a meta field to policy resource, report webpack optimizations to it. ([a53b434](https://github.com/LavaMoat/LavaMoat/commit/a53b434e21e074d2261a4e84b85e33fe8aa87278))
* **webpack:** use the final module info in connections to handle the optimizations webpack sideEffect option does. wip ([9c7b305](https://github.com/LavaMoat/LavaMoat/commit/9c7b3050460b4cc79b04ac422bdfb69540893bd9))


### Bug Fixes

* **webpack:** strip policy meta from the policy that goes into the bundle, fix related tests ([645d0f2](https://github.com/LavaMoat/LavaMoat/commit/645d0f2311a9871694b6bf14bb4ce3c81b2311c8))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/types bumped from ^0.0.1 to ^0.1.0
    * lavamoat-core bumped from ^16.7.0 to ^16.7.1

## [1.4.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v1.3.2...webpack-v1.4.0) (2025-09-25)


### Features

* **webpack:** document and officially release scuttling in webpack plugin ([#1829](https://github.com/LavaMoat/LavaMoat/issues/1829)) ([9c83030](https://github.com/LavaMoat/LavaMoat/commit/9c83030d97371478bf59b10d636e63168bd8473d))
* **webpack:** prevent webpack from eliminating reexports and failing policy enforcement ([#1827](https://github.com/LavaMoat/LavaMoat/issues/1827)) ([5f4d4fc](https://github.com/LavaMoat/LavaMoat/commit/5f4d4fcdf6395bd749918d2b6bed7c5e822629e2))


### Bug Fixes

* **webpack:** adjust MessageEvent repair to reliably work in the bizarre context of Firefox webextension contentscript ([#1830](https://github.com/LavaMoat/LavaMoat/issues/1830)) ([33d83d7](https://github.com/LavaMoat/LavaMoat/commit/33d83d7402f9b914c7f4d7f9cd18f979c2f406c5))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.6.2 to ^16.7.0

## [1.3.2](https://github.com/LavaMoat/LavaMoat/compare/webpack-v1.3.1...webpack-v1.3.2) (2025-09-22)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.6.1 to ^16.6.2

## [1.3.1](https://github.com/LavaMoat/LavaMoat/compare/webpack-v1.3.0...webpack-v1.3.1) (2025-09-19)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/types bumped from ^0.0.0 to ^0.0.1
    * lavamoat-core bumped from ^16.6.0 to ^16.6.1

## [1.3.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v1.2.0...webpack-v1.3.0) (2025-09-16)


### Features

* **webpack:** add explicit error messages when a compilation concludes with nothing to protect ([f12985f](https://github.com/LavaMoat/LavaMoat/commit/f12985f15a46e0d022d9caef8a0e5e646529575c))
* **webpack:** add generatePolicyOnly option ([#1789](https://github.com/LavaMoat/LavaMoat/issues/1789)) ([72900cd](https://github.com/LavaMoat/LavaMoat/commit/72900cd22a954a15d9fe96a8bd4b2f844ba3797c))
* **webpack:** null runtime ([4374b7a](https://github.com/LavaMoat/LavaMoat/commit/4374b7a65ef551d123396b32e78cd6fd976ecd8e))
* **webpack:** repair for window.event deprecated leaky poperty ([#1785](https://github.com/LavaMoat/LavaMoat/issues/1785)) ([86d944b](https://github.com/LavaMoat/LavaMoat/commit/86d944bfc0f65e5d27c6f598add72016de579565))
* **webpack:** static shims for runtime, runtimeConfigurationPerChunk_experimental to control embedded runtime options ([#1792](https://github.com/LavaMoat/LavaMoat/issues/1792)) ([c69a08d](https://github.com/LavaMoat/LavaMoat/commit/c69a08d5af47e20ee0580fa5f0fcc804cb6d6928))


### Bug Fixes

* **webpack:** fix the naive assumption that there can only be 1 module with a certain path ([#1793](https://github.com/LavaMoat/LavaMoat/issues/1793)) ([262bb3d](https://github.com/LavaMoat/LavaMoat/commit/262bb3d61016b42977d0c21c83b22cfbbd78a3e9))
* **webpack:** MessageEvent repair should not prevent further overrides ([#1787](https://github.com/LavaMoat/LavaMoat/issues/1787)) ([0c8fc19](https://github.com/LavaMoat/LavaMoat/commit/0c8fc1914e0e7a8432edbf6d9e8d2604ee17d291))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.5.1 to ^16.6.0

## [1.2.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v1.1.0...webpack-v1.2.0) (2025-08-25)


### Features

* **webpack:** repairs for globals that need more than unwrap from core ([#1751](https://github.com/LavaMoat/LavaMoat/issues/1751)) ([86ad964](https://github.com/LavaMoat/LavaMoat/commit/86ad964f6b1d33950aea10849052e8cfc8459663))


### Bug Fixes

* **deps:** update dependency ses to v1.14.0 ([#1746](https://github.com/LavaMoat/LavaMoat/issues/1746)) ([3e4b834](https://github.com/LavaMoat/LavaMoat/commit/3e4b834df3430d9f919e7df31f42d23e9b6bb352))
* **webpack:** avoid scuttling the global Webpack uses for sharing chunks ([#1762](https://github.com/LavaMoat/LavaMoat/issues/1762)) ([6f39c95](https://github.com/LavaMoat/LavaMoat/commit/6f39c95407a280aa13bf90adb634f8b86821e0f0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/aa bumped from ^4.3.3 to ^4.3.4
    * lavamoat-core bumped from ^16.5.0 to ^16.5.1

## [1.1.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v1.0.0...webpack-v1.1.0) (2025-07-28)


### Features

* **webpack:** defend webpack runtime from scuttling ([#1740](https://github.com/LavaMoat/LavaMoat/issues/1740)) ([0f094bd](https://github.com/LavaMoat/LavaMoat/commit/0f094bd38a1a2c159d5f49864ef97ec57403a43f))
* **webpack:** properly expose types for the plugin ([#1741](https://github.com/LavaMoat/LavaMoat/issues/1741)) ([abd4450](https://github.com/LavaMoat/LavaMoat/commit/abd445066bd698ada041bc717b8ebcee5ea6b296))


### Bug Fixes

* **webpack:** fix how ambient asset files requests are filtered ([#1739](https://github.com/LavaMoat/LavaMoat/issues/1739)) ([3f914cf](https://github.com/LavaMoat/LavaMoat/commit/3f914cf3716d3a4978a80f419fb265db10fc0ae6))

## [1.0.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v1.0.0...webpack-v1.0.0) (2025-06-24)


### Features

* **webpack:** add undocumented __unsafeAllowContextModules flag to allow experimenting with contextmodules without leaving them vulnerable by default ([8eca7f1](https://github.com/LavaMoat/LavaMoat/commit/8eca7f16dc0270875f99e329b46fd5555c8e1e9d))
* **webpack:** avoid emiting resource assets from packages by default ([#1451](https://github.com/LavaMoat/LavaMoat/issues/1451)) ([325bf2a](https://github.com/LavaMoat/LavaMoat/commit/325bf2a1dc5c9c048ef36148d5611a2a5112ec0d))
* **webpack:** enable syntax checks by default, check prior to concatenation. ([e74a55b](https://github.com/LavaMoat/LavaMoat/commit/e74a55bdc7f83739d8d1fec0b3c5f6852470c6cc))
* **webpack:** policy debugging capabilities and tighter tests ([20b12ad](https://github.com/LavaMoat/LavaMoat/commit/20b12ad38a78678c8291b4841e8c4d00b349c1aa))
* **webpack:** support scuttling ([#1298](https://github.com/LavaMoat/LavaMoat/issues/1298)) ([9630600](https://github.com/LavaMoat/LavaMoat/commit/963060078d16fab80f24d49ea945a08fc51b9384))
* **webpack:** unlockedChunksUnsafe option to refrain from protecting selected chunks ([#1375](https://github.com/LavaMoat/LavaMoat/issues/1375)) ([1f24683](https://github.com/LavaMoat/LavaMoat/commit/1f24683e2e6cddefbc492c0925d0d7d5e3b995c0))
* **webpack:** webpack context modules and chunk lazy loading support ([#1553](https://github.com/LavaMoat/LavaMoat/issues/1553)) ([3602f65](https://github.com/LavaMoat/LavaMoat/commit/3602f6598196ec99287fe239aa1708d9f80c0e0c))


### Bug Fixes

* add Node.js v24.0.0 to supported engines ([ad9cdcd](https://github.com/LavaMoat/LavaMoat/commit/ad9cdcdf83ccbda8bf2eba427d0c80f761f47a0a))
* **core,webpack:** remove deprecated lockdown options ([efec539](https://github.com/LavaMoat/LavaMoat/commit/efec5391eec838689ce2426de617571d0f276f2c)), closes [#1578](https://github.com/LavaMoat/LavaMoat/issues/1578)
* **core:** block circular global object endowments ([#1505](https://github.com/LavaMoat/LavaMoat/issues/1505)) ([6745a0e](https://github.com/LavaMoat/LavaMoat/commit/6745a0edee85171e4062aaec31d7f25bf3a97e46))
* **deps:** update babel monorepo ([afc9fe5](https://github.com/LavaMoat/LavaMoat/commit/afc9fe5fef98c53abe014ff657a1d4f59883abe8))
* **deps:** update babel monorepo ([e6f4e70](https://github.com/LavaMoat/LavaMoat/commit/e6f4e70cffe8237c27126046bb0cfa5515c2d138))
* **deps:** update babel monorepo to v7.25.8 ([1dcb35e](https://github.com/LavaMoat/LavaMoat/commit/1dcb35e023823710343b5f0a4ca589cdfe647e7d))
* **deps:** update babel monorepo to v7.25.9 ([6d9d5a3](https://github.com/LavaMoat/LavaMoat/commit/6d9d5a3336444fada49e239756ffc3c207d3ff5d))
* **deps:** update babel monorepo to v7.26.7 ([#1524](https://github.com/LavaMoat/LavaMoat/issues/1524)) ([7285fdf](https://github.com/LavaMoat/LavaMoat/commit/7285fdf6ce5c337443840525b79c7653708b541f))
* **deps:** update babel monorepo to v7.26.9 ([6a9dc73](https://github.com/LavaMoat/LavaMoat/commit/6a9dc735f18a5b95e82b86ec2bd466ee4433172f))
* **deps:** update babel monorepo to v7.27.0 ([#1589](https://github.com/LavaMoat/LavaMoat/issues/1589)) ([efd83d7](https://github.com/LavaMoat/LavaMoat/commit/efd83d7ea7a5f5f9d2157248d4e2f8b7f9c48c56))
* **deps:** update dependency json-stable-stringify to v1.3.0 ([#1613](https://github.com/LavaMoat/LavaMoat/issues/1613)) ([f9314d1](https://github.com/LavaMoat/LavaMoat/commit/f9314d1a238d31a0164356c1c6bd6f6e36246d56))
* **deps:** update dependency ses to v1.10.0 ([#1422](https://github.com/LavaMoat/LavaMoat/issues/1422)) ([b6f0589](https://github.com/LavaMoat/LavaMoat/commit/b6f0589cf9730fac8173a3fca0c4a031bd64f12f))
* **deps:** update dependency ses to v1.12.0 [security] ([#1605](https://github.com/LavaMoat/LavaMoat/issues/1605)) ([881ae86](https://github.com/LavaMoat/LavaMoat/commit/881ae86b9a4c27ab60a3c76a4a69f5de246eb2ed))
* **deps:** update dependency ses to v1.9.0 ([75cae74](https://github.com/LavaMoat/LavaMoat/commit/75cae74063c444184fea3370bf9925bc7946846a))
* make policy ordering consistntly manifest itself in json files produced ([a149a7d](https://github.com/LavaMoat/LavaMoat/commit/a149a7d16d65bc4255cf32211a671823356565da))
* upgrade ses to v1.11.0 ([a12dae1](https://github.com/LavaMoat/LavaMoat/commit/a12dae13e8c7f70082199ba186659ea413e82ded))
* **webpack:** import types from ses ([78aca55](https://github.com/LavaMoat/LavaMoat/commit/78aca5583adc5366c8717fd196b72bdd828b38ed))
* **webpack:** prevent toString manipulation on a specifier ([1163085](https://github.com/LavaMoat/LavaMoat/commit/1163085b29bcc5a78f08b840393bf1edbe099045))
* **webpack:** support regex in scuttling exceptions ([#1529](https://github.com/LavaMoat/LavaMoat/issues/1529)) ([45c0308](https://github.com/LavaMoat/LavaMoat/commit/45c0308c655c9903f9bdfa17a30460b10f22a219))
* **webpack:** undo the forced overwrite of parent and top references ([#1666](https://github.com/LavaMoat/LavaMoat/issues/1666)) ([adec627](https://github.com/LavaMoat/LavaMoat/commit/adec627069e201a7353a89876d0964dd54e1fa9b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/aa bumped from ^4.3.2 to ^4.3.3
    * lavamoat-core bumped from ^16.4.0 to ^16.5.0

## [0.10.0-beta.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v0.9.0-beta.0...webpack-v0.10.0-beta.0) (2025-05-01)


### Features

* **webpack:** webpack context modules and chunk lazy loading support ([#1553](https://github.com/LavaMoat/LavaMoat/issues/1553)) ([3602f65](https://github.com/LavaMoat/LavaMoat/commit/3602f6598196ec99287fe239aa1708d9f80c0e0c))


### Bug Fixes

* **core,webpack:** remove deprecated lockdown options ([efec539](https://github.com/LavaMoat/LavaMoat/commit/efec5391eec838689ce2426de617571d0f276f2c)), closes [#1578](https://github.com/LavaMoat/LavaMoat/issues/1578)
* **core:** block circular global object endowments ([#1505](https://github.com/LavaMoat/LavaMoat/issues/1505)) ([6745a0e](https://github.com/LavaMoat/LavaMoat/commit/6745a0edee85171e4062aaec31d7f25bf3a97e46))
* **deps:** update babel monorepo to v7.27.0 ([#1589](https://github.com/LavaMoat/LavaMoat/issues/1589)) ([efd83d7](https://github.com/LavaMoat/LavaMoat/commit/efd83d7ea7a5f5f9d2157248d4e2f8b7f9c48c56))
* **deps:** update dependency json-stable-stringify to v1.3.0 ([#1613](https://github.com/LavaMoat/LavaMoat/issues/1613)) ([f9314d1](https://github.com/LavaMoat/LavaMoat/commit/f9314d1a238d31a0164356c1c6bd6f6e36246d56))
* **deps:** update dependency ses to v1.12.0 [security] ([#1605](https://github.com/LavaMoat/LavaMoat/issues/1605)) ([881ae86](https://github.com/LavaMoat/LavaMoat/commit/881ae86b9a4c27ab60a3c76a4a69f5de246eb2ed))
* upgrade ses to v1.11.0 ([a12dae1](https://github.com/LavaMoat/LavaMoat/commit/a12dae13e8c7f70082199ba186659ea413e82ded))
* **webpack:** import types from ses ([78aca55](https://github.com/LavaMoat/LavaMoat/commit/78aca5583adc5366c8717fd196b72bdd828b38ed))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.3.2 to ^16.4.0

## [0.9.0-beta.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v0.8.1-beta.0...webpack-v0.9.0-beta.0) (2025-03-11)


### Features

* **webpack:** support scuttling ([#1298](https://github.com/LavaMoat/LavaMoat/issues/1298)) ([9630600](https://github.com/LavaMoat/LavaMoat/commit/963060078d16fab80f24d49ea945a08fc51b9384))


### Bug Fixes

* **deps:** update babel monorepo to v7.26.7 ([#1524](https://github.com/LavaMoat/LavaMoat/issues/1524)) ([7285fdf](https://github.com/LavaMoat/LavaMoat/commit/7285fdf6ce5c337443840525b79c7653708b541f))
* **deps:** update babel monorepo to v7.26.9 ([6a9dc73](https://github.com/LavaMoat/LavaMoat/commit/6a9dc735f18a5b95e82b86ec2bd466ee4433172f))
* **webpack:** support regex in scuttling exceptions ([#1529](https://github.com/LavaMoat/LavaMoat/issues/1529)) ([45c0308](https://github.com/LavaMoat/LavaMoat/commit/45c0308c655c9903f9bdfa17a30460b10f22a219))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/aa bumped from ^4.3.1 to ^4.3.2
    * lavamoat-core bumped from ^16.3.1 to ^16.3.2

## [0.8.1-beta.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v0.8.0-beta.0...webpack-v0.8.1-beta.0) (2025-01-28)


### Bug Fixes

* **deps:** update dependency ses to v1.10.0 ([#1422](https://github.com/LavaMoat/LavaMoat/issues/1422)) ([b6f0589](https://github.com/LavaMoat/LavaMoat/commit/b6f0589cf9730fac8173a3fca0c4a031bd64f12f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.3.0 to ^16.3.1

## [0.8.0-beta.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v0.7.1-beta.0...webpack-v0.8.0-beta.0) (2025-01-15)


### Features

* **webpack:** add undocumented __unsafeAllowContextModules flag to allow experimenting with contextmodules without leaving them vulnerable by default ([8eca7f1](https://github.com/LavaMoat/LavaMoat/commit/8eca7f16dc0270875f99e329b46fd5555c8e1e9d))
* **webpack:** avoid emiting resource assets from packages by default ([#1451](https://github.com/LavaMoat/LavaMoat/issues/1451)) ([325bf2a](https://github.com/LavaMoat/LavaMoat/commit/325bf2a1dc5c9c048ef36148d5611a2a5112ec0d))
* **webpack:** policy debugging capabilities and tighter tests ([20b12ad](https://github.com/LavaMoat/LavaMoat/commit/20b12ad38a78678c8291b4841e8c4d00b349c1aa))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.2.2 to ^16.3.0

## [0.7.1-beta.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v0.7.0-beta.0...webpack-v0.7.1-beta.0) (2024-12-20)


### Bug Fixes

* **core:** update vendored lockdown.umd.js ([41a2d54](https://github.com/LavaMoat/LavaMoat/commit/41a2d541f80956b2623d6176d8580825df29b52d))
* **deps:** update babel monorepo ([e6f4e70](https://github.com/LavaMoat/LavaMoat/commit/e6f4e70cffe8237c27126046bb0cfa5515c2d138))
* **deps:** update babel monorepo to v7.25.9 ([6d9d5a3](https://github.com/LavaMoat/LavaMoat/commit/6d9d5a3336444fada49e239756ffc3c207d3ff5d))
* **deps:** update dependency ses to v1.9.0 ([75cae74](https://github.com/LavaMoat/LavaMoat/commit/75cae74063c444184fea3370bf9925bc7946846a))
* make policy ordering consistntly manifest itself in json files produced ([a149a7d](https://github.com/LavaMoat/LavaMoat/commit/a149a7d16d65bc4255cf32211a671823356565da))
* **webpack:** prevent toString manipulation on a specifier ([1163085](https://github.com/LavaMoat/LavaMoat/commit/1163085b29bcc5a78f08b840393bf1edbe099045))

## [0.7.0-beta.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v0.7.0-beta.0...webpack-v0.7.0-beta.0) (2024-12-09)


### Bug Fixes

* **deps:** update babel monorepo ([e6f4e70](https://github.com/LavaMoat/LavaMoat/commit/e6f4e70cffe8237c27126046bb0cfa5515c2d138))
* **deps:** update babel monorepo to v7.25.9 ([6d9d5a3](https://github.com/LavaMoat/LavaMoat/commit/6d9d5a3336444fada49e239756ffc3c207d3ff5d))
* **deps:** update dependency ses to v1.9.0 ([75cae74](https://github.com/LavaMoat/LavaMoat/commit/75cae74063c444184fea3370bf9925bc7946846a))
* make policy ordering consistntly manifest itself in json files produced ([a149a7d](https://github.com/LavaMoat/LavaMoat/commit/a149a7d16d65bc4255cf32211a671823356565da))
* **webpack:** prevent toString manipulation on a specifier ([1163085](https://github.com/LavaMoat/LavaMoat/commit/1163085b29bcc5a78f08b840393bf1edbe099045))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.2.1 to ^16.2.2

## [0.7.0-beta.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v0.7.0-beta.0...webpack-v0.7.0-beta.0) (2024-12-05)


### Bug Fixes

* **deps:** update babel monorepo ([e6f4e70](https://github.com/LavaMoat/LavaMoat/commit/e6f4e70cffe8237c27126046bb0cfa5515c2d138))
* **deps:** update babel monorepo to v7.25.9 ([6d9d5a3](https://github.com/LavaMoat/LavaMoat/commit/6d9d5a3336444fada49e239756ffc3c207d3ff5d))
* **deps:** update dependency ses to v1.9.0 ([75cae74](https://github.com/LavaMoat/LavaMoat/commit/75cae74063c444184fea3370bf9925bc7946846a))
* make policy ordering consistntly manifest itself in json files produced ([a149a7d](https://github.com/LavaMoat/LavaMoat/commit/a149a7d16d65bc4255cf32211a671823356565da))
* **webpack:** prevent toString manipulation on a specifier ([1163085](https://github.com/LavaMoat/LavaMoat/commit/1163085b29bcc5a78f08b840393bf1edbe099045))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.2.0 to ^16.2.1

## [0.7.0-beta.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v0.7.0-beta.0...webpack-v0.7.0-beta.0) (2024-12-04)


### Bug Fixes

* **deps:** update babel monorepo ([e6f4e70](https://github.com/LavaMoat/LavaMoat/commit/e6f4e70cffe8237c27126046bb0cfa5515c2d138))
* **deps:** update babel monorepo to v7.25.9 ([6d9d5a3](https://github.com/LavaMoat/LavaMoat/commit/6d9d5a3336444fada49e239756ffc3c207d3ff5d))
* **deps:** update dependency ses to v1.9.0 ([75cae74](https://github.com/LavaMoat/LavaMoat/commit/75cae74063c444184fea3370bf9925bc7946846a))
* **webpack:** prevent toString manipulation on a specifier ([1163085](https://github.com/LavaMoat/LavaMoat/commit/1163085b29bcc5a78f08b840393bf1edbe099045))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/aa bumped from ^4.3.0 to ^4.3.1
    * lavamoat-core bumped from ^16.1.0 to ^16.2.0

## [0.7.0-beta.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v0.6.0-beta.0...webpack-v0.7.0-beta.0) (2024-10-11)


### Features

* **webpack:** change how inlining lockdown is configured  ([#1296](https://github.com/LavaMoat/LavaMoat/issues/1296)) ([54d12cb](https://github.com/LavaMoat/LavaMoat/commit/54d12cbfd1419cc32ed01a6e2d5e99856e1c23cb))
* **webpack:** support thisAsExports runtime requirement ([#1301](https://github.com/LavaMoat/LavaMoat/issues/1301)) ([e057d23](https://github.com/LavaMoat/LavaMoat/commit/e057d236f723d4b922e75dc9f81ce8e0b153c0d9))


### Bug Fixes

* **deps:** update babel monorepo to v7.25.7 ([1ee84bf](https://github.com/LavaMoat/LavaMoat/commit/1ee84bf754b470781ee77bc299a797033b01d7ab))
* **deps:** update babel monorepo to v7.25.8 ([1dcb35e](https://github.com/LavaMoat/LavaMoat/commit/1dcb35e023823710343b5f0a4ca589cdfe647e7d))
* **webpack:** allow setting rootDir ([9641bb7](https://github.com/LavaMoat/LavaMoat/commit/9641bb770079db9dfa809c611c41a52db53ba7e5))
* **webpack:** an implementation of builtins that actually works ([#1308](https://github.com/LavaMoat/LavaMoat/issues/1308)) ([2cc24cf](https://github.com/LavaMoat/LavaMoat/commit/2cc24cf1872a280fbdc562cace42fcceb9a938dd))
* **webpack:** improve how error details are output in diagnostics ([a60c92e](https://github.com/LavaMoat/LavaMoat/commit/a60c92ebc0733a726339ec4998ec983fae9f6dbb))
* **webpack:** skip inspecting modules lacking userRequest ([332679f](https://github.com/LavaMoat/LavaMoat/commit/332679f723583c6aa7c04bf0491723db3893e364))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.0.1 to ^16.1.0

## [0.6.0-beta.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v0.5.0-beta.0...webpack-v0.6.0-beta.0) (2024-09-11)


### Features

* **webpack:** avoid errors when code is instrumented for HMR despite HMR not being enabled ([edea44c](https://github.com/LavaMoat/LavaMoat/commit/edea44c6977642a7e45e37fe3b0fe8aa402d54b8))
* **webpack:** support ContextModule - skip enforcement of policy ([#1319](https://github.com/LavaMoat/LavaMoat/issues/1319)) ([b0dd461](https://github.com/LavaMoat/LavaMoat/commit/b0dd46104dd82561c0273224bdb47a49e17cb138))


### Bug Fixes

* **deps:** update babel monorepo to v7.25.4 ([6b59ee5](https://github.com/LavaMoat/LavaMoat/commit/6b59ee5fe7436ea8f2b84260b6fb3e4a02022657))
* **deps:** update dependency ses to v1.7.0 ([#1262](https://github.com/LavaMoat/LavaMoat/issues/1262)) ([0209007](https://github.com/LavaMoat/LavaMoat/commit/0209007898d9d1a288832dc1b903720735d3558d))
* **deps:** update dependency ses to v1.8.0 ([7e5bece](https://github.com/LavaMoat/LavaMoat/commit/7e5bece4a1c2cdaf7890c8750d26eadd495a1a52))
* **webpack:** allow __webpack_require__.t in webpack runtime ([b3daf8b](https://github.com/LavaMoat/LavaMoat/commit/b3daf8be3f6aded6b637cb0e9090c035d8751678))
* **webpack:** deny handling of a null-id module ([2ff8efc](https://github.com/LavaMoat/LavaMoat/commit/2ff8efc511e91309c76eebb4cfdca38c46397130))
* **webpack:** overwrite global aliases even if endowed ([1044d4c](https://github.com/LavaMoat/LavaMoat/commit/1044d4c2bfa81d0bcc57be203862bf0ab268d88b))
* **webpack:** wrap nmd and hmd wrappers equally ([01656b4](https://github.com/LavaMoat/LavaMoat/commit/01656b40b6ff7670362c9e2a28ecc84a8bb17a9c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.0.0 to ^16.0.1

## [0.5.0-beta.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v0.4.0-beta.0...webpack-v0.5.0-beta.0) (2024-08-15)


### ⚠ BREAKING CHANGES

* **node:** remove support for Node.js v16
* **browserify:** remove support for Node.js v16
* **perf:** remove support for Node.js v16
* **tofu:** remove support for Node.js v16
* **webpack:** remove support for Node.js v16
* **core:** remove support for Node.js v16

### Features

* global store with attenuation support ([#1158](https://github.com/LavaMoat/LavaMoat/issues/1158)) ([f7175a6](https://github.com/LavaMoat/LavaMoat/commit/f7175a6de366cc975ab158c631dbef16cb346fde))
* **webpack:** builtin support in plugin opt and buildtime ([494e1fb](https://github.com/LavaMoat/LavaMoat/commit/494e1fbf15dbed048383d18614af4ece3ab10b05))
* **webpack:** builtin support in runtime ([92f30fb](https://github.com/LavaMoat/LavaMoat/commit/92f30fbd4abc176bbf6e3aa7e5a803879dccbe43))
* **webpack:** implement builtins attenuation by policy ([7f79782](https://github.com/LavaMoat/LavaMoat/commit/7f7978264732cdcb5575304f4e317243c84a4db7))
* **webpack:** support Node.js ^22.5.1 ([d743fb1](https://github.com/LavaMoat/LavaMoat/commit/d743fb11b7b757c08acaa8d96f17984f16fe1bd0))


### Bug Fixes

* **deps:** update babel monorepo ([0880e2e](https://github.com/LavaMoat/LavaMoat/commit/0880e2edde6e8f661e4fdebddcb47e585a43b469))
* **deps:** update babel monorepo ([d9d40b4](https://github.com/LavaMoat/LavaMoat/commit/d9d40b4e5358734bd9fdd680a5b8048d9efbc55c))
* **deps:** update babel monorepo ([b6aa714](https://github.com/LavaMoat/LavaMoat/commit/b6aa71446e00e9e201fad90abdc847d12b0d27a0))
* **webpack:** fix policy generation builtins slipping into packages ([b8a4ebc](https://github.com/LavaMoat/LavaMoat/commit/b8a4ebce3ef6f64df4ba1f1b5a2cd4df2bb512f8))
* **webpack:** handle excluding modules in policy generation ([5f51ae1](https://github.com/LavaMoat/LavaMoat/commit/5f51ae15d810b5ed2f1efb65b141575a66651a4e))


### Miscellaneous Chores

* **browserify:** remove support for Node.js v16 ([6ca05ba](https://github.com/LavaMoat/LavaMoat/commit/6ca05baa80bf7b022255b8ef476577343e514018))
* **core:** remove support for Node.js v16 ([6ca05ba](https://github.com/LavaMoat/LavaMoat/commit/6ca05baa80bf7b022255b8ef476577343e514018))
* **node:** remove support for Node.js v16 ([6ca05ba](https://github.com/LavaMoat/LavaMoat/commit/6ca05baa80bf7b022255b8ef476577343e514018))
* **perf:** remove support for Node.js v16 ([6ca05ba](https://github.com/LavaMoat/LavaMoat/commit/6ca05baa80bf7b022255b8ef476577343e514018))
* **tofu:** remove support for Node.js v16 ([6ca05ba](https://github.com/LavaMoat/LavaMoat/commit/6ca05baa80bf7b022255b8ef476577343e514018))
* **webpack:** remove support for Node.js v16 ([6ca05ba](https://github.com/LavaMoat/LavaMoat/commit/6ca05baa80bf7b022255b8ef476577343e514018))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^15.4.0 to ^16.0.0

## [0.4.0-beta.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v0.3.0-beta.0...webpack-v0.4.0-beta.0) (2024-07-11)


### Features

* **webpack:** lockdown inlining ([#1101](https://github.com/LavaMoat/LavaMoat/issues/1101)) ([7444b47](https://github.com/LavaMoat/LavaMoat/commit/7444b47bf2e9e1940f7fc37122f87d62a48488b7))


### Bug Fixes

* **deps:** update babel monorepo ([246ec25](https://github.com/LavaMoat/LavaMoat/commit/246ec256790a0a2cb993d5895ae13a0b716da1c6))
* **deps:** update babel monorepo to v7.24.5 ([7e466bd](https://github.com/LavaMoat/LavaMoat/commit/7e466bd5718a0a1b92df24a2d023c0bb1f54b872))
* **deps:** update babel monorepo to v7.24.6 ([f6d450f](https://github.com/LavaMoat/LavaMoat/commit/f6d450fa48c8f166dac72a2b606429dafa5a70c4))
* **deps:** update dependency ses to v1.5.0 ([9b871f7](https://github.com/LavaMoat/LavaMoat/commit/9b871f7623474d8f626042a948a5efb082918d13))
* **webpack:** fix progress order errors covering compilation errors, improve __webpack_require__.nmd compatibility ([#1172](https://github.com/LavaMoat/LavaMoat/issues/1172)) ([f3e53c8](https://github.com/LavaMoat/LavaMoat/commit/f3e53c8c44f063f000adc620b0aa3f7a41dda5c6))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/aa bumped from ^4.2.0 to ^4.3.0
    * lavamoat-core bumped from ^15.3.0 to ^15.4.0

## [0.3.0-beta.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v0.2.1-beta.0...webpack-v0.3.0-beta.0) (2024-03-26)


### Features

* **core:** add external package name fallback function to options in generatePolicy, use it in webpack ([8a3a0a6](https://github.com/LavaMoat/LavaMoat/commit/8a3a0a621eba439d028a5c185f898441a7888695))


### Bug Fixes

* **webpack:** dependency fixes ([f9cc277](https://github.com/LavaMoat/LavaMoat/commit/f9cc277bd549606b56a81cf3351e6105dca50b25))
* **webpack:** fix global aliases in non-root compartments ([18840ea](https://github.com/LavaMoat/LavaMoat/commit/18840ea153376e2bf300a3dd36077b09ee91f74c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/aa bumped from ^4.1.0 to ^4.2.0
    * lavamoat-core bumped from ^15.2.1 to ^15.3.0

## [0.2.0-beta.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v0.1.3-beta.0...webpack-v0.2.0-beta.0) (2024-02-29)


### Features

* **webpack:** policy generation - experimental ([2d8c49a](https://github.com/LavaMoat/LavaMoat/commit/2d8c49ad622d53e0cdfddf12dfb3d7587905f771))
* **webpack:** policy loading, generation and overrides put together ([1bf3702](https://github.com/LavaMoat/LavaMoat/commit/1bf370270c91afafa20b6331b0b478b16cd1b55b))
* **webpack:** support webpack replacing  with __webpack_require__.g ([6c25451](https://github.com/LavaMoat/LavaMoat/commit/6c254510286964f0753dc0600d7b7798f7eded9c))
* **webpack:** switch to browser-resolve and include dev dependencies in aa ([29cc3ac](https://github.com/LavaMoat/LavaMoat/commit/29cc3acb89f9f464a56076cf2d7a29c182352995))


### Bug Fixes

* **webpack:** fix typescript complaints ([fc41eda](https://github.com/LavaMoat/LavaMoat/commit/fc41eda86bfd680fbeadce72954b787864c2884f))
* **webpack:** prevent lockdown from being minified ([aa195e5](https://github.com/LavaMoat/LavaMoat/commit/aa195e5c0ba663cda67189fd4ecd7aa62b2a1484))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/aa bumped from ^4.0.1 to ^4.1.0
    * lavamoat-core bumped from ^15.1.2 to ^15.2.0

## [0.1.1-beta.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v0.1.0-beta.0...webpack-v0.1.1-beta.0) (2024-01-18)


### Bug Fixes

* **deps:** pin dependencies ([4006c1f](https://github.com/LavaMoat/LavaMoat/commit/4006c1f386c3024e8a8092ded9b98ede20de084e))
* **webpack,survey:** add missing deps ([52e7b1c](https://github.com/LavaMoat/LavaMoat/commit/52e7b1ce3a3302f119bc5ff44aa298c21f77b255))
* **webpack:** compatibility fix for overwriting exports reference in cjs ([2259d74](https://github.com/LavaMoat/LavaMoat/commit/2259d74c23f627cb4839370ffc1dc98813b495d6))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/aa bumped from ^4.0.0 to ^4.0.1
    * lavamoat-core bumped from ^15.0.0 to ^15.1.0

## [0.1.0-beta.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v0.0.1-beta.0...webpack-v0.1.0-beta.0) (2023-11-23)


### Features

* **webpack:** add emitting lockdown.js to dist ([5eb0bfb](https://github.com/LavaMoat/LavaMoat/commit/5eb0bfbf18936485e627e423c1818e65bdfd111d))


### Bug Fixes

* **webpack:** avoid missing the script insertion if head tag is missing in html-webpack-plugin template ([fc1d2aa](https://github.com/LavaMoat/LavaMoat/commit/fc1d2aadc1c7d68a882f71ae696b21f8c09e6f73))
* **webpack:** improve regex-based script insertion for html-webpack-plugin in emitSes.js ([3d8b4db](https://github.com/LavaMoat/LavaMoat/commit/3d8b4db8853e6fc8bea133e11e204e7360dcf557))

## [0.0.1-beta.0](https://github.com/LavaMoat/LavaMoat/compare/webpack-v0.0.1-beta.0...webpack-v0.0.1-beta.0) (2023-10-18)


### Features

* **scorchwrap:** add default lockdown options ([f9acfaf](https://github.com/LavaMoat/LavaMoat/commit/f9acfaf6c47c4d1ac9922acd9a3afe7e7153de4c))
* **webpack:** Merge branch 'naugtur-scorchwrap' containing the webpack plugin ([b88495c](https://github.com/LavaMoat/LavaMoat/commit/b88495c50471bd3347a6a1c4ba18b994458209cf))


### Bug Fixes

* **scorchwrap:** add heaps of review fixes ([def9abf](https://github.com/LavaMoat/LavaMoat/commit/def9abf045498d3e6149ea9e72d56c5aae92a3f2))
* **scorchwrap:** avoid unnecessary work before skipping a chunk ([de556e1](https://github.com/LavaMoat/LavaMoat/commit/de556e160e6812f4418bf431802b97280eb27edb))


### Miscellaneous Chores

* **webpack:** enable release, remove unused dependency ([ee044ed](https://github.com/LavaMoat/LavaMoat/commit/ee044ed0ee2ea0d2b7a368aec7d6f7f7d5873b85))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^14.2.1 to ^15.0.0
