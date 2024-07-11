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
