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
