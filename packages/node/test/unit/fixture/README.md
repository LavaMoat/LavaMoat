# test/unit/fixture/

This directory contains _package fixtures_ common to the various test suites.

Often a fixture will have a `start` script which uses [snapshot-fs](https://npm.im/snapshot-fs) to generate and write a snapshot to [the `json-fixture` directory](../json-fixture).

## TODO

- [ ] Any fixture that the "execution" suite doesn't use can be likely removed once [boneskull/snapshot-fs#224](https://github.com/boneskull/snapshot-fs/issues/224) is resolved.
