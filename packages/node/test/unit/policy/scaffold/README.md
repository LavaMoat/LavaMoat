# test/policy-gen/scaffold/

This directory contains scaffolding for running code provided inline in a test
case. Used by the `testPolicyForModule` and `testPolicyForScript` AVA test
macros.

The format is `memfs`' [`DirectoryJSON`
format](https://github.com/streamich/memfs/blob/1a731872623199670e073974bd8a21706c942239/src/volume.ts#L197).
