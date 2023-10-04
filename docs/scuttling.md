## Intro

Scuttling is a LavaMoat optional security feature, first introduced in [#360](https://github.com/LavaMoat/LavaMoat/pull/360).

## Warning ⚠️

This feature is experimental. This means that:

1. Getting it to work on your LavaMoat protected application without breaking parts of it might require some effort, especially if your application loads JavaScript code outside of LavaMoat protection.
2. There still might be issues with this feature when trying to use it (please inform us if so!).
3. The API to activate this feature might (and probably will) change before achieving stability.

## Usage

When using LavaMoat (node/lavapack/browserify), it accepts the argument `scuttleGlobalThis`:

```javascript
scuttleGlobalThis: {
  enabled: <boolean>,     // default: false
  exceptions: []<string>, // default: []
  scuttlerName: <string>, // default: ''
}
```

- `enabled` - whether to enable scuttling security feature or not
- `exceptions` - if `enabled:true`, provide a list of properties to avoid scuttling (which means, not to remove those from the global object)
- `scuttlerName` - optionally, you can provide a string pointing to a reference on the global object, which should refer to a function with which you can hook into the scuttling process at runtime (when `scuttlerName` is left untouched, LavaMoat runtime won't try using an external scuttler):

```javascript
Object.defineProperty(window, 'SCUTTLER', {
  value: (globalRef, scuttle) => {
    console.log('scuttler (start)')
    scuttle(globalRef)
    console.log('scuttler (end)')
  },
})
```

## Motivation

When using LavaMoat, each one of the different dependencies your protected application is made of is executed inside a dedicated "sandboxed" environment.
Each environment gets its own set of JavaScript APIs to function, and those are unique to each environment.

This by definition means that the JavaScript APIs that are endowed to each environment are different from the original ones - those that are accessible via the global object:

```html
Application
<script>
  LavaMoat runtime
    dependencies
      dep-a
        alert('This alert message was initiated by "dep-a"');
</script>
<script>
  alert('This alert message was initiated by the application')
</script>
```

In the example above, `dep-a` which is a dependency that was bundled and is protected by LavaMoat, calls the `alert` function, and afterwards a `script` tag by the application (outside of the LavaMoat protection) also calls the `alert` function.

But because of how LavaMoat works, the two instances of the `alert` functions are not the same.

What's also special about the LavaMoat sandbox envs, is that they make sure no other APIs are accessible by the dependency other than just the APIs the dependency is allowed to consume.

However, if for any reason the dependency manages to escape that sandboxed environment and find its way to the global object of the application, it can access all of the different APIs it has to offer, including those that it was not supposed to access originally.

Lucky for us, as a security enhancement to LavaMoat, we can remove those APIs from the global object, because as mentioned above, they are different from those that are endowed to each package which means they might not be needed.

That's what scuttling is for: when turning scuttling on, LavaMoat will remove all the properties that it can from the global object since they are not needed by any other entity in the application and can only pose danger to it.

## Issues

If different parts of your application run outside of LavaMoat's protection and rely on APIs accessible directly by the global object, they might not be accessible anymore when turning scuttling on, thus breaking your application.

In MetaMask, we had a similar issue when loading a third party service outside of LavaMoat protection, and therefore we had to wrap it with a destined sandboxed environment in order for it to work properly under a scuttled environment (see [here](https://github.com/MetaMask/metamask-extension/pull/17276/files))
