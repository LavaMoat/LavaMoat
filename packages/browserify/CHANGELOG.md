# Changelog

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/lavapack bumped from ^5.2.2 to ^5.2.3
    * lavamoat-core bumped from ^14.2.2 to ^14.2.3

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/lavapack bumped from ^5.2.3 to ^5.2.4

## [17.0.0](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-browserify-v16.0.0...lavamoat-browserify-v17.0.0) (2023-10-18)


### ⚠ BREAKING CHANGES

* The minimum supported Node.js version is now v16.20.0.

### Features

* **core:** add overrideTaming: 'severe' for improved developer experience under lavamoat ([#730](https://github.com/LavaMoat/LavaMoat/issues/730)) ([20e4f76](https://github.com/LavaMoat/LavaMoat/commit/20e4f764dfdabcf21c7e72ad45fcfeaf45fd2b6c))
* node20 ([ef3a0da](https://github.com/LavaMoat/LavaMoat/commit/ef3a0da9960d7f5734e3d4180ebafdae2432a260))


### Bug Fixes

* **browserify,node,tofu,viz:** bump babel packages ([4e12040](https://github.com/LavaMoat/LavaMoat/commit/4e12040945897983456dce9b83a174e116c99f66))
* **browserify/examples:** Use workspace version of lavamoat-browserify ([06de8c8](https://github.com/LavaMoat/LavaMoat/commit/06de8c8d3d07d0eebd1f831dacc8db9644154a05))
* drop Node.js v14 ([#729](https://github.com/LavaMoat/LavaMoat/issues/729)) ([10c667b](https://github.com/LavaMoat/LavaMoat/commit/10c667bd88eaabf60a8fd8e4493cc7676848b201))
* **lavapack:** run build (generate runtimes) ([d2749e9](https://github.com/LavaMoat/LavaMoat/commit/d2749e9d4c972ad99d02388c11f89af6284ce650))
* normalize all package versions ([0800c11](https://github.com/LavaMoat/LavaMoat/commit/0800c113c3504af312d904c48eb9a6844b10d6b1))
* run test:prep ([2cb45f0](https://github.com/LavaMoat/LavaMoat/commit/2cb45f04f5b90ef0f45bcda3e25cb684ba8a3516))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/aa bumped from ^3.1.5 to ^4.0.0
    * @lavamoat/lavapack bumped from ^5.4.1 to ^6.0.0
    * lavamoat-core bumped from ^14.4.1 to ^15.0.0

## [15.9.1](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-browserify-v15.9.0...lavamoat-browserify-v15.9.1) (2023-09-14)


### Bug Fixes

* **browserify/examples:** Use workspace version of lavamoat-browserify ([06de8c8](https://github.com/LavaMoat/LavaMoat/commit/06de8c8d3d07d0eebd1f831dacc8db9644154a05))
* **lavapack:** run build (generate runtimes) ([d2749e9](https://github.com/LavaMoat/LavaMoat/commit/d2749e9d4c972ad99d02388c11f89af6284ce650))
* normalize all package versions ([0800c11](https://github.com/LavaMoat/LavaMoat/commit/0800c113c3504af312d904c48eb9a6844b10d6b1))
* run test:prep ([2cb45f0](https://github.com/LavaMoat/LavaMoat/commit/2cb45f04f5b90ef0f45bcda3e25cb684ba8a3516))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/aa bumped from ^3.1.0 to ^3.1.5
    * @lavamoat/lavapack bumped from ^5.2.4 to ^5.4.1
    * lavamoat-core bumped from ^14.2.3 to ^14.4.1

## [15.7.2](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-browserify-v15.7.1...lavamoat-browserify-v15.7.2) (2023-09-08)


### Bug Fixes

* **browserify/examples:** Use workspace version of lavamoat-browserify ([06de8c8](https://github.com/LavaMoat/LavaMoat/commit/06de8c8d3d07d0eebd1f831dacc8db9644154a05))
* **lavapack:** run build (generate runtimes) ([d2749e9](https://github.com/LavaMoat/LavaMoat/commit/d2749e9d4c972ad99d02388c11f89af6284ce650))
* run test:prep ([2cb45f0](https://github.com/LavaMoat/LavaMoat/commit/2cb45f04f5b90ef0f45bcda3e25cb684ba8a3516))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @lavamoat/lavapack bumped from ^5.2.1 to ^5.2.2
    * lavamoat-core bumped from ^14.2.1 to ^14.2.2

### 3.0.0

- Plugin option `writeAutoConfig` now requires `config` to be set to a string, and uses that as the path to write the config to.
