# Drinking your own champagne

AKA Eating your own dogfood

To each their own, eh?

## What is this?

This is an elaborate end-to-end test aiming at ensuring `@lavamoat/node` works with a setup containing `@lavamoat/webpack` plugin so the build can run with protections.

## How to run it?

```sh
npm run lavamoat:generate
npm run lavamoat
```

Or for the simpler case of bypassing the webpack cli usaage

```sh
npm run lavamoat_2:generate
npm run lavamoat_2
```

One of those is always wired up to `test:prep` and `test` scripts in the `package.json` file.
