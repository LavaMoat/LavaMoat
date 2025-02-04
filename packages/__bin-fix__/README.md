# `@lavamoat/__bin-fix__`

> Provides consistent executables for a LavaMoat development environment

## What Is This Thing

**[lavamoat][] and [@lavamoat/node][] both want to provide the `lavamoat` executable.** So after running `npm install` in a working copy of [LavaMoat/LavaMoat][], what is `node_modules/.bin/lavamoat` symlinked to? _The most recently installed workspace._ And when you run `npm install`, which one is that?

¯\\\_(ツ)\_/¯

Your guess is as good as mine. It's deterministic (allegedly), but not in a way that makes sense to you or me.

So to ensure that developers can execute the `lavamoat` that they meant, we provide this package. It provides two (2) executables in a development environment _only_; this package is not intended to be published or otherwise consumed outside of a [working copy][LavaMoat/LavaMoat]

## Usage

Run [lavamoat][]:

```sh
lavamoat-node <args..>
```

Run [@lavamoat/node][]:

```sh
lavamoat2 <args..>
```

## Other Approaches Considered

- A post-install script which would create symlinks:
  - We _[don't run][allow-scripts]_ `postinstall` lifecycle scripts, so it would have to be a manual task (e.g., piggybacking on the `setup` script)
  - Too easily clobbered by `npm`
- Adding a second executable (`bin` entry) to each `package.json` of `lavamoat` and `@lavamoat/node`
  - This creates a second executable _for all users_ of these packages, which is silly and bad; this is only helpful in a development environment
- Attempting to force the root workspace to symlink executables from its workspaces:
  - This… does not work. (Kinda wish it did?)
  - If a package's `package.json` has a `bin` (or `directories.bin`) field, the executables defined will _only_ be symlinked into `node_modules/.bin` _if that package is a dependency of another package_. Since our package is _the root workspace_, such entries in its `package.json` will be ignored. Only the dependencies of a workspace—_including the root workspace_—will have their executables symlinked into `node_modules/.bin`.

[lavamoat]: ../lavamoat-node/
[@lavamoat/node]: ../node/
[LavaMoat/LavaMoat]: ../
[allow-scripts]: ../allow-scripts/
