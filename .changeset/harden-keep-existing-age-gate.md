---
'@lavamoat/harden': patch
---

Keep existing release age gate values (`minimumReleaseAge`, `npmMinimalAgeGate`, `min-release-age`) and their comments instead of overwriting them. Any existing value counts as satisfied by `harden check`; all other settings are still enforced.
