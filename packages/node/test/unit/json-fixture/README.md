# test/fixture/json

This contains test fixtures in either [DirectoryJSON](https://github.com/streamich/memfs/blob/1a731872623199670e073974bd8a21706c942239/src/volume.ts#L197) or [Compact JSON](https://jsonjoy.com/specs/compact-json) format.

[memfs](https://npm.im/memfs) can load these fixtures as virtual filesystems. They were created by [snapshot-fs](https://npm.im/snapshot-fs).

> [!IMPORTANT]
>
> At the time of writing, `snapshot-fs` is _one-way_—it can create a snapshot from
> a real filesystem, but _cannot_ create a real filesystem from a snapshot.
>
> TODO: Remove this warning once
> [boneskull/snapshot-fs#224](https://github.com/boneskull/snapshot-fs/issues/224)
> is resolved.
