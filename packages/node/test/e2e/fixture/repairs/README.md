# repairs

This fixture exercises the "repair" feature of LavaMoat's custom capabilities.

We have a repair in [`frobnicate.cap.js`](./lavamoat/node/frobnicate.cap.js) that neuters `process.env` then sets the `process.env.FROBNICATE` and `process.env.ENCABULATE` environment variables.

The entrypoint [`app.js`](./app.js) imports two modules, `env-a` and `env-b`, which reference both env variables and export an object containing the values thereof. `app.js` then logs a stringified JSON array of the two objects.

The [Policy](./lavamoat/node/policy.json) (created via override) enables access to `process.env.FROBNICATE` for `env-a`, but not `env-b`.

When we run the entrypoint, we expect the output of `env-a` to contain `FROBNICATE` and `ENCABULATE`, but the output of `env-b` to only contain `ENCABULATE`.
