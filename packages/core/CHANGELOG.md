# Changelog

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-tofu bumped from ^7.2.1 to ^7.2.2

## [15.2.0](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-core-v15.1.2...lavamoat-core-v15.2.0) (2024-02-29)


### Features

* **core:** ESM support in policy generation ([60dc4fa](https://github.com/LavaMoat/LavaMoat/commit/60dc4fa750ffea336f23baaee7f82ea21d2ca8e3))
* **core:** return attempted path when parsing JSON of policy fails ([ea7f3d4](https://github.com/LavaMoat/LavaMoat/commit/ea7f3d49c42e57723707eefd3c399943344077cc))
* **core:** turn off localeTaming in ses lockdown by default ([e37582f](https://github.com/LavaMoat/LavaMoat/commit/e37582f201070bfaa734f378aa6b851892adc684))
* **webpack:** policy loading, generation and overrides put together ([1bf3702](https://github.com/LavaMoat/LavaMoat/commit/1bf370270c91afafa20b6331b0b478b16cd1b55b))


### Bug Fixes

* **core/test:** platform-agnostic line separator ([0a898a3](https://github.com/LavaMoat/LavaMoat/commit/0a898a3e231b4281d6bd8e5543e5ead7c8f28511))
* **core:** detect ESM/CJS imports properly ([c2c37e2](https://github.com/LavaMoat/LavaMoat/commit/c2c37e235d67a8f3ac17fed6f9475481010ef881))
* **core:** export types from generatePolicy ([b999545](https://github.com/LavaMoat/LavaMoat/commit/b999545567e6673b42ed6b2c34153d84d7a4b283))
* **webpack:** fix typescript complaints ([fc41eda](https://github.com/LavaMoat/LavaMoat/commit/fc41eda86bfd680fbeadce72954b787864c2884f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-tofu bumped from ^7.2.0 to ^7.2.1

## [15.1.2](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-core-v15.1.1...lavamoat-core-v15.1.2) (2024-02-07)


### Bug Fixes

* **core:** update LavamoatModuleRecord ([152534d](https://github.com/LavaMoat/LavaMoat/commit/152534debcc869d72dab50e7e6b031578d13324c))
* **deps:** update dependency @babel/types to v7.23.9 ([c2f91e9](https://github.com/LavaMoat/LavaMoat/commit/c2f91e9a3c00ff9cf47eb8d7a4eb1ace7e155c64))
* **deps:** update dependency json-stable-stringify to v1.1.1 ([7d28e79](https://github.com/LavaMoat/LavaMoat/commit/7d28e79a5430f1f7c3987fc128e800efe590dd2a))
* **deps:** update dependency type-fest to v4.10.0 ([9f2cf3c](https://github.com/LavaMoat/LavaMoat/commit/9f2cf3cb3e00fc5184268bedb6967ffc8d29d066))
* **deps:** update dependency type-fest to v4.10.1 ([36567e7](https://github.com/LavaMoat/LavaMoat/commit/36567e7f54efab0efd2021b9f82b5e4e4c77fe4d))
* **deps:** update dependency type-fest to v4.10.2 ([1580ed9](https://github.com/LavaMoat/LavaMoat/commit/1580ed967085ae277384fcee3eac32ab9930adcd))
* **deps:** update dependency type-fest to v4.9.0 ([70e9ffd](https://github.com/LavaMoat/LavaMoat/commit/70e9ffdf740a7d79cee9d583a55188e4ab02617d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-tofu bumped from ^7.1.0 to ^7.2.0

## [15.1.1](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-core-v15.1.0...lavamoat-core-v15.1.1) (2024-01-18)


### Bug Fixes

* **core:** update SES to v1.1.0 in core ([29ad47d](https://github.com/LavaMoat/LavaMoat/commit/29ad47d0a80014c2fe37433734a853309d065c69))

## [15.1.0](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-core-v15.0.0...lavamoat-core-v15.1.0) (2024-01-18)


### Features

* **core:** ship some types ([#732](https://github.com/LavaMoat/LavaMoat/issues/732)) ([d5de381](https://github.com/LavaMoat/LavaMoat/commit/d5de381edccb622b81dd02f9bd59cae605e71cdf))


### Bug Fixes

* **core:** add better types to policy loading and merging functions ([db799d1](https://github.com/LavaMoat/LavaMoat/commit/db799d17633a638a5a76ec52cb788ef705ae6f77))
* **core:** update LavaMoatPolicy types ([d9292ca](https://github.com/LavaMoat/LavaMoat/commit/d9292ca7b99a0eedc215670cb1791f6dd0c3ce07))
* **deps:** pin dependencies ([4006c1f](https://github.com/LavaMoat/LavaMoat/commit/4006c1f386c3024e8a8092ded9b98ede20de084e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-tofu bumped from ^7.0.0 to ^7.1.0

## [15.0.0](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-core-v14.4.1...lavamoat-core-v15.0.0) (2023-10-18)


### ⚠ BREAKING CHANGES

* The minimum supported Node.js version is now v16.20.0.

### Features

* **core:** add overrideTaming: 'severe' for improved developer experience under lavamoat ([#730](https://github.com/LavaMoat/LavaMoat/issues/730)) ([20e4f76](https://github.com/LavaMoat/LavaMoat/commit/20e4f764dfdabcf21c7e72ad45fcfeaf45fd2b6c))
* node20 ([ef3a0da](https://github.com/LavaMoat/LavaMoat/commit/ef3a0da9960d7f5734e3d4180ebafdae2432a260))


### Bug Fixes

* drop Node.js v14 ([#729](https://github.com/LavaMoat/LavaMoat/issues/729)) ([10c667b](https://github.com/LavaMoat/LavaMoat/commit/10c667bd88eaabf60a8fd8e4493cc7676848b201))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-tofu bumped from ^6.2.1 to ^7.0.0

## [14.4.1](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-core-v14.4.0...lavamoat-core-v14.4.1) (2023-09-14)


### Bug Fixes

* **core,perf:** bump ses to 0.18.7 and reenable lib:ses script ([986fc1f](https://github.com/LavaMoat/LavaMoat/commit/986fc1f9c97e083901b1dfda7e7a8ba298aa4c8d))
* **core,perf:** bump ses to 0.18.8 ([d7a3b4d](https://github.com/LavaMoat/LavaMoat/commit/d7a3b4dc6ccf019673029c849dc59312c0410692))
* normalize all package versions ([0800c11](https://github.com/LavaMoat/LavaMoat/commit/0800c113c3504af312d904c48eb9a6844b10d6b1))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-tofu bumped from ^6.0.3 to ^6.2.1

## [14.2.3](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-core-v14.2.2...lavamoat-core-v14.2.3) (2023-09-13)


### Bug Fixes

* **core,perf:** bump ses to 0.18.8 ([d7a3b4d](https://github.com/LavaMoat/LavaMoat/commit/d7a3b4dc6ccf019673029c849dc59312c0410692))

## [14.2.2](https://github.com/LavaMoat/LavaMoat/compare/lavamoat-core-v14.2.1...lavamoat-core-v14.2.2) (2023-09-08)


### Bug Fixes

* **core,perf:** bump ses to 0.18.7 and reenable lib:ses script ([986fc1f](https://github.com/LavaMoat/LavaMoat/commit/986fc1f9c97e083901b1dfda7e7a8ba298aa4c8d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * lavamoat-tofu bumped from ^6.0.2 to ^6.0.3
