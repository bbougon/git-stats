# Changelog

## [0.2.8](https://github.com/bbougon/git-stats/compare/v0.2.7...v0.2.8) (2023-06-18)


### Bug Fixes

* when a period end is given, the end date is set at the end of the day at 23:59:59 ([3f66b64](https://github.com/bbougon/git-stats/commit/3f66b64b1f63998fca41c6902d3fe07684d7d250))
* when statistics are generated for a given period (i.e with a given end date), issues that are closed after the end date are accounted as opened during this period ([521e5ad](https://github.com/bbougon/git-stats/commit/521e5ad3d93b5091e221c5a93082fc583319880e))
* when statistics are generated for a given period (i.e with a given end date), merge events that are closed after the end date are accounted as opened during this period ([f3e8430](https://github.com/bbougon/git-stats/commit/f3e84303b1cebe7bfaf569b6ef968b33aab68d49))
* when statistics are generated for a given period (i.e with a given end date), merged events that are merged after the end date are accounted as opened during this period ([2babb62](https://github.com/bbougon/git-stats/commit/2babb62cf1abb52272e4eb711e0384849dea00c5))

## [0.2.7](https://github.com/bbougon/git-stats/compare/v0.2.6...v0.2.7) (2023-06-16)


### Bug Fixes

* Add missing cumulative issues statistics that made the display in console failing ([f7c50e6](https://github.com/bbougon/git-stats/commit/f7c50e6ebb172e58255d23bcac4666e1ee90eb57))
* Add missing issues statistics that made the display in console failing ([a800708](https://github.com/bbougon/git-stats/commit/a800708e9252d5b490b1cf1a62b803505ac635b5))
* Add missing period issues statistics that made the display in console failing ([cb4e319](https://github.com/bbougon/git-stats/commit/cb4e3194b2a380383e61f934a62e844f64d4a027))
* display progress bar for github when no pagination available ([406f6e5](https://github.com/bbougon/git-stats/commit/406f6e5710cd1d06be91ac3d2ab7dcdf17cd6bfe))

## [0.2.6](https://github.com/bbougon/git-stats/compare/v0.2.5...v0.2.6) (2023-05-18)


### Features

* display issues statistics in HTML report ([a979476](https://github.com/bbougon/git-stats/commit/a979476e9f8a3c95186436e16bd92465c73e828a))

## [0.2.5](https://github.com/bbougon/git-stats/compare/v0.2.4...v0.2.5) (2023-05-13)


### Features

* display aggregated issues doughnut graph ([aabec3b](https://github.com/bbougon/git-stats/commit/aabec3b47fd774efe4da053239f8ee6651ea7579))
* generate cumulative statistics for issues ([1891402](https://github.com/bbougon/git-stats/commit/18914029091ad46dd5ab78e8d27159a9f8acba31))

## [0.2.4](https://github.com/bbougon/git-stats/compare/v0.2.3...v0.2.4) (2023-05-07)


### Features

* aggregate statistics for issues ([d2022fa](https://github.com/bbougon/git-stats/commit/d2022fa7377e441cf7a89895d44a1b1e4f6e68b8))
* Display aggregated issues events oin issue panel ([bfd4f04](https://github.com/bbougon/git-stats/commit/bfd4f04ea9934a8c813ea6d8e9dffab85ca3a137))

## [0.2.3](https://github.com/bbougon/git-stats/compare/v0.2.2...v0.2.3) (2023-05-01)


### Features

* display cumulative statistics in console. ([5e32935](https://github.com/bbougon/git-stats/commit/5e329354c501f43b83694cbe1800657002cb2d6e))

## [0.2.2](https://github.com/bbougon/git-stats/compare/v0.2.1...v0.2.2) (2023-04-22)


### Features

* display burnup in HTML format ([bf43f0c](https://github.com/bbougon/git-stats/commit/bf43f0c6e162cfb4a2e61fa30f6cf57e135fc47c))
* generate cumulative statistics ([c4618e6](https://github.com/bbougon/git-stats/commit/c4618e6966c199f37d87506ac80b1323744b596f))


### Bug Fixes

* trend calculation ([872c0ad](https://github.com/bbougon/git-stats/commit/872c0adc45e07079a09417aa4ee9b038178444fc))

## [0.2.1](https://github.com/bbougon/git-stats/compare/v0.2.0...v0.2.1) (2023-04-19)


### Features

* Add median time and average time per period: ([3bfae34](https://github.com/bbougon/git-stats/commit/3bfae34c9cc538dd8c684cd6a77daa8a7426c4fc))
* Display months and weeks events ([3120c72](https://github.com/bbougon/git-stats/commit/3120c72b838e57b8952066471ec088e2eb8bdf0a))

## [0.2.0](https://github.com/bbougon/git-stats/compare/v0.1.4...v0.2.0) (2023-04-12)


### Features

* end period date is now optional ([224c4a8](https://github.com/bbougon/git-stats/commit/224c4a8e2e294ff7b422e7afe54c8ab441b85dc9))


### Bug Fixes

* chart display weeks instead of months ([2134be3](https://github.com/bbougon/git-stats/commit/2134be38849e8adeffc1803b45066d20293b140d))

## [0.1.4](https://github.com/bbougon/git-stats/compare/v0.1.3...v0.1.4) (2023-04-12)


### Bug Fixes

* release process ([248581d](https://github.com/bbougon/git-stats/commit/248581de65916161efdce538de6b5ba7ec471d45))
