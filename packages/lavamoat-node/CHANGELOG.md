# Changelog

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^14.2.2 to ^14.2.3

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^15.1.0 to ^15.1.1

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^15.2.0 to ^15.2.1
    * lavamoat-tofu bumped from ^7.2.1 to ^7.2.2

## [11.0.0](https://github.com/PEAC337/LavaMoat/compare/lavamoat-v10.0.5...lavamoat-v11.0.0) (2025-12-05)


### ⚠ BREAKING CHANGES

* indicate breaking change propagation: stop overwriting the policy file while loading. ([#1835](https://github.com/PEAC337/LavaMoat/issues/1835))

### Bug Fixes

* 2 bugs manifested in walking content from policy-overrides ([#1471](https://github.com/PEAC337/LavaMoat/issues/1471)) ([7599146](https://github.com/PEAC337/LavaMoat/commit/7599146f6412777dd13d681283e1b5344297d0eb))
* add Node.js v24.0.0 to supported engines ([ad9cdcd](https://github.com/PEAC337/LavaMoat/commit/ad9cdcdf83ccbda8bf2eba427d0c80f761f47a0a))
* **browserify,core,lavamoat-node,node:** do not publish extraneous files ([#1866](https://github.com/PEAC337/LavaMoat/issues/1866)) ([e7666d8](https://github.com/PEAC337/LavaMoat/commit/e7666d804e2f9af71fb0cd948af04a283458b6d1)), closes [#1865](https://github.com/PEAC337/LavaMoat/issues/1865)
* **core:** block circular global object endowments ([#1505](https://github.com/PEAC337/LavaMoat/issues/1505)) ([6745a0e](https://github.com/PEAC337/LavaMoat/commit/6745a0edee85171e4062aaec31d7f25bf3a97e46))
* **deps:** update babel monorepo ([afc9fe5](https://github.com/PEAC337/LavaMoat/commit/afc9fe5fef98c53abe014ff657a1d4f59883abe8))
* **deps:** update babel monorepo ([e6f4e70](https://github.com/PEAC337/LavaMoat/commit/e6f4e70cffe8237c27126046bb0cfa5515c2d138))
* **deps:** update babel monorepo to v7.25.9 ([6d9d5a3](https://github.com/PEAC337/LavaMoat/commit/6d9d5a3336444fada49e239756ffc3c207d3ff5d))
* **deps:** update babel monorepo to v7.26.2 ([9bac12a](https://github.com/PEAC337/LavaMoat/commit/9bac12abd602632a6bd0ad3af5026cc627bf2b31))
* **deps:** update dependency corepack to v0.30.0 ([4f4fd6e](https://github.com/PEAC337/LavaMoat/commit/4f4fd6e503a79a2acee6347605be5b888f070d3b))
* **deps:** update dependency corepack to v0.32.0 ([#1611](https://github.com/PEAC337/LavaMoat/issues/1611)) ([854bf40](https://github.com/PEAC337/LavaMoat/commit/854bf40c464686bf866542dd2278d3121def064f))
* **deps:** update dependency corepack to v0.33.0 ([#1682](https://github.com/PEAC337/LavaMoat/issues/1682)) ([0de2351](https://github.com/PEAC337/LavaMoat/commit/0de235120f3ad41d55462ebda645ded45d86accc))
* **deps:** update dependency node-gyp-build to v4.8.4 ([1c21367](https://github.com/PEAC337/LavaMoat/commit/1c21367dff7d83bc94cdcfb8b0245a27d3e32bd0))
* **deps:** update dependency resolve to v1.22.10 ([#1535](https://github.com/PEAC337/LavaMoat/issues/1535)) ([17bee26](https://github.com/PEAC337/LavaMoat/commit/17bee26ef5d24f8bcc48d4aac0a7e066a8bbf7af))
* indicate breaking change propagation: stop overwriting the policy file while loading. ([#1835](https://github.com/PEAC337/LavaMoat/issues/1835)) ([81f2cb0](https://github.com/PEAC337/LavaMoat/commit/81f2cb0bf00e61c9ddfb637ad20deacba95ca967))
* **lavamoat-node:** cli entry args ([#1857](https://github.com/PEAC337/LavaMoat/issues/1857)) ([#1859](https://github.com/PEAC337/LavaMoat/issues/1859)) ([f949577](https://github.com/PEAC337/LavaMoat/commit/f9495777dc0fe853064fe1de241a0421e925b212))
* **lavamoat-node:** fix missing cjs extension in the list of extensions to resolve ([#1856](https://github.com/PEAC337/LavaMoat/issues/1856)) ([f2eeced](https://github.com/PEAC337/LavaMoat/commit/f2eecedbcf6f501e4f7163f47b97821b9e5dc8a1))
* **lavamoat-node:** fix the bug that prevented following dependency relationships listed in policy overrides ([61df9ed](https://github.com/PEAC337/LavaMoat/commit/61df9edc47bca3c47d2975032d7db30de833b458))
* **lavamoat-node:** support packages with falsy main field ([e8c489c](https://github.com/PEAC337/LavaMoat/commit/e8c489c5fe3054bf6099658b3e9f3d1da07f7bc2)), closes [#1706](https://github.com/PEAC337/LavaMoat/issues/1706)
* make policy ordering consistntly manifest itself in json files produced ([a149a7d](https://github.com/PEAC337/LavaMoat/commit/a149a7d16d65bc4255cf32211a671823356565da))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/aa bumped from ^4.3.4 to ^4.3.5
    * lavamoat-core bumped from ^17.1.2 to ^18.0.0
    * lavamoat-tofu bumped from ^8.1.0 to ^8.2.0

## [10.0.5](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v10.0.4...lavamoat-v10.0.5) (2025-12-02)


### Bug Fixes

* **browserify,core,lavamoat-node,node:** do not publish extraneous files ([#1866](https://github.com/LavaMoat/LavaMoat/issues/1866)) ([e7666d8](https://github.com/LavaMoat/LavaMoat/commit/e7666d804e2f9af71fb0cd948af04a283458b6d1)), closes [#1865](https://github.com/LavaMoat/LavaMoat/issues/1865)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^17.1.1 to ^17.1.2

## [10.0.4](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v10.0.3...lavamoat-v10.0.4) (2025-12-01)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^17.1.0 to ^17.1.1

## [10.0.3](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v10.0.2...lavamoat-v10.0.3) (2025-11-28)


### Bug Fixes

* **lavamoat-node:** cli entry args ([#1857](https://github.com/LavaMoat/LavaMoat/issues/1857)) ([#1859](https://github.com/LavaMoat/LavaMoat/issues/1859)) ([f949577](https://github.com/LavaMoat/LavaMoat/commit/f9495777dc0fe853064fe1de241a0421e925b212))
* **lavamoat-node:** fix missing cjs extension in the list of extensions to resolve ([#1856](https://github.com/LavaMoat/LavaMoat/issues/1856)) ([f2eeced](https://github.com/LavaMoat/LavaMoat/commit/f2eecedbcf6f501e4f7163f47b97821b9e5dc8a1))

## [10.0.2](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v10.0.1...lavamoat-v10.0.2) (2025-11-19)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^17.0.1 to ^17.1.0
    * lavamoat-tofu bumped from ^8.0.11 to ^8.1.0

## [10.0.1](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v10.0.0...lavamoat-v10.0.1) (2025-10-30)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^17.0.0 to ^17.0.1

## [10.0.0](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v9.0.16...lavamoat-v10.0.0) (2025-10-09)


### ⚠ BREAKING CHANGES

* indicate breaking change propagation: stop overwriting the policy file while loading. ([#1835](https://github.com/LavaMoat/LavaMoat/issues/1835))

### Bug Fixes

* indicate breaking change propagation: stop overwriting the policy file while loading. ([#1835](https://github.com/LavaMoat/LavaMoat/issues/1835)) ([81f2cb0](https://github.com/LavaMoat/LavaMoat/commit/81f2cb0bf00e61c9ddfb637ad20deacba95ca967))

## [9.0.16](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v9.0.15...lavamoat-v9.0.16) (2025-10-01)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.7.0 to ^16.7.1
    * lavamoat-tofu bumped from ^8.0.10 to ^8.0.11

## [9.0.15](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v9.0.14...lavamoat-v9.0.15) (2025-09-25)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.6.2 to ^16.7.0

## [9.0.14](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v9.0.13...lavamoat-v9.0.14) (2025-09-22)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.6.1 to ^16.6.2
    * lavamoat-tofu bumped from ^8.0.9 to ^8.0.10

## [9.0.13](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v9.0.12...lavamoat-v9.0.13) (2025-09-19)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.6.0 to ^16.6.1
    * lavamoat-tofu bumped from ^8.0.8 to ^8.0.9

## [9.0.12](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v9.0.11...lavamoat-v9.0.12) (2025-09-16)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.5.1 to ^16.6.0

## [9.0.11](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v9.0.10...lavamoat-v9.0.11) (2025-08-25)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/aa bumped from ^4.3.3 to ^4.3.4
    * lavamoat-core bumped from ^16.5.0 to ^16.5.1

## [9.0.10](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v9.0.9...lavamoat-v9.0.10) (2025-06-24)


### Bug Fixes

* add Node.js v24.0.0 to supported engines ([ad9cdcd](https://github.com/LavaMoat/LavaMoat/commit/ad9cdcdf83ccbda8bf2eba427d0c80f761f47a0a))
* **deps:** update babel monorepo ([afc9fe5](https://github.com/LavaMoat/LavaMoat/commit/afc9fe5fef98c53abe014ff657a1d4f59883abe8))
* **deps:** update dependency corepack to v0.33.0 ([#1682](https://github.com/LavaMoat/LavaMoat/issues/1682)) ([0de2351](https://github.com/LavaMoat/LavaMoat/commit/0de235120f3ad41d55462ebda645ded45d86accc))
* **lavamoat-node:** support packages with falsy main field ([e8c489c](https://github.com/LavaMoat/LavaMoat/commit/e8c489c5fe3054bf6099658b3e9f3d1da07f7bc2)), closes [#1706](https://github.com/LavaMoat/LavaMoat/issues/1706)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/aa bumped from ^4.3.2 to ^4.3.3
    * lavamoat-core bumped from ^16.4.0 to ^16.5.0
    * lavamoat-tofu bumped from ^8.0.7 to ^8.0.8

## [9.0.9](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v9.0.8...lavamoat-v9.0.9) (2025-05-01)


### Bug Fixes

* **core:** block circular global object endowments ([#1505](https://github.com/LavaMoat/LavaMoat/issues/1505)) ([6745a0e](https://github.com/LavaMoat/LavaMoat/commit/6745a0edee85171e4062aaec31d7f25bf3a97e46))
* **deps:** update dependency corepack to v0.32.0 ([#1611](https://github.com/LavaMoat/LavaMoat/issues/1611)) ([854bf40](https://github.com/LavaMoat/LavaMoat/commit/854bf40c464686bf866542dd2278d3121def064f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.3.2 to ^16.4.0
    * lavamoat-tofu bumped from ^8.0.6 to ^8.0.7

## [9.0.8](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v9.0.7...lavamoat-v9.0.8) (2025-03-11)


### Bug Fixes

* **deps:** update dependency resolve to v1.22.10 ([#1535](https://github.com/LavaMoat/LavaMoat/issues/1535)) ([17bee26](https://github.com/LavaMoat/LavaMoat/commit/17bee26ef5d24f8bcc48d4aac0a7e066a8bbf7af))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/aa bumped from ^4.3.1 to ^4.3.2
    * lavamoat-core bumped from ^16.3.1 to ^16.3.2
    * lavamoat-tofu bumped from ^8.0.5 to ^8.0.6

## [9.0.7](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v9.0.6...lavamoat-v9.0.7) (2025-01-28)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.3.0 to ^16.3.1
    * lavamoat-tofu bumped from ^8.0.4 to ^8.0.5

## [9.0.6](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v9.0.5...lavamoat-v9.0.6) (2025-01-15)


### Bug Fixes

* **deps:** update dependency corepack to v0.30.0 ([4f4fd6e](https://github.com/LavaMoat/LavaMoat/commit/4f4fd6e503a79a2acee6347605be5b888f070d3b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.2.2 to ^16.3.0

## [9.0.5](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v9.0.4...lavamoat-v9.0.5) (2024-12-09)


### Bug Fixes

* 2 bugs manifested in walking content from policy-overrides ([#1471](https://github.com/LavaMoat/LavaMoat/issues/1471)) ([7599146](https://github.com/LavaMoat/LavaMoat/commit/7599146f6412777dd13d681283e1b5344297d0eb))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.2.1 to ^16.2.2

## [9.0.4](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v9.0.3...lavamoat-v9.0.4) (2024-12-05)


### Bug Fixes

* make policy ordering consistntly manifest itself in json files produced ([a149a7d](https://github.com/LavaMoat/LavaMoat/commit/a149a7d16d65bc4255cf32211a671823356565da))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.2.0 to ^16.2.1
    * lavamoat-tofu bumped from ^8.0.3 to ^8.0.4

## [9.0.3](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v9.0.2...lavamoat-v9.0.3) (2024-12-04)


### Bug Fixes

* **deps:** update babel monorepo ([e6f4e70](https://github.com/LavaMoat/LavaMoat/commit/e6f4e70cffe8237c27126046bb0cfa5515c2d138))
* **deps:** update babel monorepo to v7.25.9 ([6d9d5a3](https://github.com/LavaMoat/LavaMoat/commit/6d9d5a3336444fada49e239756ffc3c207d3ff5d))
* **deps:** update babel monorepo to v7.26.2 ([9bac12a](https://github.com/LavaMoat/LavaMoat/commit/9bac12abd602632a6bd0ad3af5026cc627bf2b31))
* **deps:** update dependency node-gyp-build to v4.8.4 ([1c21367](https://github.com/LavaMoat/LavaMoat/commit/1c21367dff7d83bc94cdcfb8b0245a27d3e32bd0))
* **lavamoat-node:** fix the bug that prevented following dependency relationships listed in policy overrides ([61df9ed](https://github.com/LavaMoat/LavaMoat/commit/61df9edc47bca3c47d2975032d7db30de833b458))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/aa bumped from ^4.3.0 to ^4.3.1
    * lavamoat-core bumped from ^16.1.0 to ^16.2.0
    * lavamoat-tofu bumped from ^8.0.2 to ^8.0.3

## [9.0.2](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v9.0.1...lavamoat-v9.0.2) (2024-10-11)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.0.1 to ^16.1.0
    * lavamoat-tofu bumped from ^8.0.1 to ^8.0.2

## [9.0.1](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v9.0.0...lavamoat-v9.0.1) (2024-09-11)


### Bug Fixes

* **browserify:** support Node.js ^20.17.0 ([a5a3949](https://github.com/LavaMoat/LavaMoat/commit/a5a3949438daded29420e4940e6ce6aa3ed12333))
* **deps:** update dependency corepack to v0.29.4 ([a8d265b](https://github.com/LavaMoat/LavaMoat/commit/a8d265b722f6d4395b490e153c7608638b39b373))
* **deps:** update dependency node-gyp-build to v4.8.2 ([59c26bd](https://github.com/LavaMoat/LavaMoat/commit/59c26bd0e91c0ffba911413c96c4be74e5e5f8fa))
* **node:** support Node.js ^20.17.0 ([a5a3949](https://github.com/LavaMoat/LavaMoat/commit/a5a3949438daded29420e4940e6ce6aa3ed12333))
* **perf:** support Node.js ^20.17.0 ([a5a3949](https://github.com/LavaMoat/LavaMoat/commit/a5a3949438daded29420e4940e6ce6aa3ed12333))
* support Node.js ^20.17.0 ([a5a3949](https://github.com/LavaMoat/LavaMoat/commit/a5a3949438daded29420e4940e6ce6aa3ed12333))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^16.0.0 to ^16.0.1
    * lavamoat-tofu bumped from ^8.0.0 to ^8.0.1

## [9.0.0](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v8.0.7...lavamoat-v9.0.0) (2024-08-15)


### ⚠ BREAKING CHANGES

* **node:** remove support for Node.js v16
* **browserify:** remove support for Node.js v16
* **perf:** remove support for Node.js v16
* **tofu:** remove support for Node.js v16
* **webpack:** remove support for Node.js v16
* **core:** remove support for Node.js v16

### Bug Fixes

* **deps:** update babel monorepo ([b6aa714](https://github.com/LavaMoat/LavaMoat/commit/b6aa71446e00e9e201fad90abdc847d12b0d27a0))
* **node:** support Node.js ^22.5.1 ([f631ae2](https://github.com/LavaMoat/LavaMoat/commit/f631ae25b8c6fb0c5a2eee49f973c6244eda3e28))
* **perf:** support Node.js ^22.5.1 ([f631ae2](https://github.com/LavaMoat/LavaMoat/commit/f631ae25b8c6fb0c5a2eee49f973c6244eda3e28))


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
    * lavamoat-tofu bumped from ^7.3.0 to ^8.0.0

## [8.0.7](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v8.0.6...lavamoat-v8.0.7) (2024-07-11)


### Bug Fixes

* **deps:** update babel monorepo ([246ec25](https://github.com/LavaMoat/LavaMoat/commit/246ec256790a0a2cb993d5895ae13a0b716da1c6))
* **deps:** update babel monorepo to v7.24.5 ([7e466bd](https://github.com/LavaMoat/LavaMoat/commit/7e466bd5718a0a1b92df24a2d023c0bb1f54b872))
* **deps:** update babel monorepo to v7.24.6 ([f6d450f](https://github.com/LavaMoat/LavaMoat/commit/f6d450fa48c8f166dac72a2b606429dafa5a70c4))
* **deps:** update dependency node-gyp-build to v4.8.1 ([aa04eda](https://github.com/LavaMoat/LavaMoat/commit/aa04edafc6c22b8d0e278d6cd45c9497d549c04e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/aa bumped from ^4.2.0 to ^4.3.0
    * lavamoat-core bumped from ^15.3.0 to ^15.4.0
    * lavamoat-tofu bumped from ^7.2.3 to ^7.3.0

## [8.0.6](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v8.0.5...lavamoat-v8.0.6) (2024-03-26)


### Bug Fixes

* **node:** remove unused props from LavaMoatOpts type ([7c9ae4a](https://github.com/LavaMoat/LavaMoat/commit/7c9ae4a2c8e4f65806eb59fe2c56b75212a5ab23))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/aa bumped from ^4.1.0 to ^4.2.0
    * lavamoat-core bumped from ^15.2.1 to ^15.3.0
    * lavamoat-tofu bumped from ^7.2.2 to ^7.2.3

## [8.0.4](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v8.0.3...lavamoat-v8.0.4) (2024-02-29)


### Bug Fixes

* **lavamoat:** update for ESM support in policy gen ([612b9f9](https://github.com/LavaMoat/LavaMoat/commit/612b9f9302dd04d2cd1fbe88c08bd46af5f70775))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/aa bumped from ^4.0.1 to ^4.1.0
    * lavamoat-core bumped from ^15.1.2 to ^15.2.0
    * lavamoat-tofu bumped from ^7.2.0 to ^7.2.1

## [8.0.3](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v8.0.2...lavamoat-v8.0.3) (2024-02-07)


### Bug Fixes

* **deps:** update babel monorepo ([e30facc](https://github.com/LavaMoat/LavaMoat/commit/e30facc83fd9506310bc66df34970b599243eb47))
* **deps:** update dependency json-stable-stringify to v1.1.1 ([7d28e79](https://github.com/LavaMoat/LavaMoat/commit/7d28e79a5430f1f7c3987fc128e800efe590dd2a))
* **deps:** update dependency node-gyp-build to v4.8.0 ([f25d495](https://github.com/LavaMoat/LavaMoat/commit/f25d4957b1abb522d13697ef2d2323485ec51597))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^15.1.1 to ^15.1.2
    * lavamoat-tofu bumped from ^7.1.0 to ^7.2.0

## [8.0.1](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v8.0.0...lavamoat-v8.0.1) (2024-01-18)


### Bug Fixes

* **deps:** pin dependencies ([4006c1f](https://github.com/LavaMoat/LavaMoat/commit/4006c1f386c3024e8a8092ded9b98ede20de084e))
* **deps:** update dependency node-gyp-build to v4.6.1 ([570e00f](https://github.com/LavaMoat/LavaMoat/commit/570e00fcf70535e8c1abb9ee117d873130283cca))
* **deps:** update dependency yargs to v17.7.2 ([a1b21d3](https://github.com/LavaMoat/LavaMoat/commit/a1b21d3db1904d05cd9e82bc62eb56dfafb76be2))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/aa bumped from ^4.0.0 to ^4.0.1
    * lavamoat-core bumped from ^15.0.0 to ^15.1.0
    * lavamoat-tofu bumped from ^7.0.0 to ^7.1.0

## [8.0.0](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v7.3.1...lavamoat-v8.0.0) (2023-10-18)


### ⚠ BREAKING CHANGES

* The minimum supported Node.js version is now v16.20.0.

### Features

* **core:** add overrideTaming: 'severe' for improved developer experience under lavamoat ([#730](https://github.com/LavaMoat/LavaMoat/issues/730)) ([20e4f76](https://github.com/LavaMoat/LavaMoat/commit/20e4f764dfdabcf21c7e72ad45fcfeaf45fd2b6c))
* node20 ([ef3a0da](https://github.com/LavaMoat/LavaMoat/commit/ef3a0da9960d7f5734e3d4180ebafdae2432a260))


### Bug Fixes

* **browserify,node,tofu,viz:** bump babel packages ([4e12040](https://github.com/LavaMoat/LavaMoat/commit/4e12040945897983456dce9b83a174e116c99f66))
* drop Node.js v14 ([#729](https://github.com/LavaMoat/LavaMoat/issues/729)) ([10c667b](https://github.com/LavaMoat/LavaMoat/commit/10c667bd88eaabf60a8fd8e4493cc7676848b201))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/aa bumped from ^3.1.5 to ^4.0.0
    * lavamoat-core bumped from ^14.4.1 to ^15.0.0
    * lavamoat-tofu bumped from ^6.2.1 to ^7.0.0

## [7.3.1](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v7.3.0...lavamoat-v7.3.1) (2023-09-14)


### Bug Fixes

* **lavamoat:** allow prefixed builtins ([6ef1593](https://github.com/LavaMoat/LavaMoat/commit/6ef1593cf4e145b67971e75ef176c2b8223f1077)), closes [#652](https://github.com/LavaMoat/LavaMoat/issues/652)
* **lavamoat:** fix main entry point ([09dc176](https://github.com/LavaMoat/LavaMoat/commit/09dc17650bdaa04355768ff671f575ba8d7548a0))
* **node/examples:** Use workspace version of lavamoat ([9f1d14d](https://github.com/LavaMoat/LavaMoat/commit/9f1d14d5d626b65f31792898f6dca5ecbbb18968))
* normalize all package versions ([0800c11](https://github.com/LavaMoat/LavaMoat/commit/0800c113c3504af312d904c48eb9a6844b10d6b1))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/aa bumped from ^3.1.0 to ^3.1.5
    * lavamoat-core bumped from ^14.2.3 to ^14.4.1
    * lavamoat-tofu bumped from ^6.0.3 to ^6.2.1

## [7.1.1](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-v7.1.0...lavamoat-v7.1.1) (2023-09-08)


### Bug Fixes

* **lavamoat:** allow prefixed builtins ([6ef1593](https://github.com/LavaMoat/LavaMoat/commit/6ef1593cf4e145b67971e75ef176c2b8223f1077)), closes [#652](https://github.com/LavaMoat/LavaMoat/issues/652)
* **lavamoat:** fix main entry point ([09dc176](https://github.com/LavaMoat/LavaMoat/commit/09dc17650bdaa04355768ff671f575ba8d7548a0))
* **node/examples:** Use workspace version of lavamoat ([9f1d14d](https://github.com/LavaMoat/LavaMoat/commit/9f1d14d5d626b65f31792898f6dca5ecbbb18968))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-core bumped from ^14.2.1 to ^14.2.2
    * lavamoat-tofu bumped from ^6.0.2 to ^6.0.3
