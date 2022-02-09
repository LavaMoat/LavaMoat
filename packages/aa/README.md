### @lavamoat/aa

LavaMoat's canonical package name convention.

Named after a type of lava: ‘A‘ā https://volcanoes.usgs.gov/vsc/glossary/aa.html

#### goals

- name that does not soley rely on the package of unknown provenance's self-determined name
- consistent across platform and package manager
- consistent whether only prod dependencies or dev and prod dependencies are installed 

#### scheme

The naming convention is to identify all "logical paths" from the project root to the normalized package disk location and choose the shortest logical path by string length.

For example the path: `project/node_modules/xyz`

with the logical paths:
- `abc>ijk>xyz`
- `abc>xyz`

In this case we would choose the name `abc>xyz` to represent this package.
