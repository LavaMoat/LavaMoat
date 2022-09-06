# LavaMoat

![LavaMoat](./assets/lavamoat-logo.png "LavaMoat logo")

**LavaMoat** is a set of tools for securing JavaScript projects against a category of attacks called **software supply chain attacks.**

This genre of attack occurs when a malicious dependency makes its way into a developer's application. An attacker could use the dependency to then steal important secrets (like credit card numbers, private keys, or data) or make the application vulnerable to a range of other attacks.

These attacks have already hit e.g. the cryptocurrency ecosystem and present a significant risk for the developers and users of wallets and apps.

In order to help mitigate the risk of such an attack we are building a suite of tools that aim to tackle the supply chain security at various stages of software lifecycle i.e. at the installation of the package, at build time and most of all - at runtime.


**The goal of LavaMoat** is to bring added protections to modern JavaScript apps without having to rewrite them from scratch and automate a good first-start security configuration.


## [Watch the introduction video](https://www.youtube.com/watch?v=iaqe6F4S2tA&feature=emb_title&ab_channel=Feross)


### How to secure your app against supplychain attacks

1. disable/allow dependency lifecycle scripts (eg. "postinstall") via [@lavamoat/allow-scripts][LavamoatAllowScripts]
2. run your server or build process in [lavamoat-node][LavamoatNode]
3. build your ui with LavaMoat for [Browserify][LavamoatBrowserify]

Even starting with adding just step 1 - the allow-scripts is a great improvement to your supply chain security.

## How LavaMoat works

### Install scripts

Lavamoat's allow-scripts configures your project to disable running install scripts by default and
gives you a configuration section in package.json where the allowed ones can be listed.  
It also installs a package with an install script that fails installation as early as possible if the configuration is accidentally removed.

No new install scripts showing up in your dependencies will run unexpectedly. That way you eliminate the most popular attack vector of malicious packages in recent years.

### Runtime protections

You can use lavamoat to prevent malicious code introduced into a package from running. 

The LavaMoat runtime reduces the supply chain risk by:
  1. Prevent modifying JavaScript's primordials (Object, String, Number, Array, ...)
  2. Limit access to the platform API (window, document, XHR, etc) per-package

Both are provided by [SES][SesGithub] containers. Platform API access is granted by a policy file that LavaMoat can generate and allow the project to selectively customize. All details of policy file structure are documented in the [Policy file explained][PolicyDoc] doc.

#### SecureEcmaScript (SES)

[SES][SesGithub] is the sandbox used in LavaMoat. See SES's [secure computing guide][SesComputingGuide] to learn more about the risks of untrusted javascript.

### LavaMoat runtime protection in Node.js

Run your server or app building code with protections via [LavaMoat Node][LavamoatNode]

### LavaMoat runtime protection in the browser

When using LavaMoat in the browser, you can just use your favorite bundler if there is an available plugin.

App bundles have **two** major components:

1. Runtime (aka kernel / loader / prelude / trusted computing base)
This is the code that initializes and runs the bundle. For example, the implementation of the `require` function.

2. Module sources
This includes the js content of the module sources, and sometimes some config information like module name aliases.

LavaMoat modifies the bundle's runtime to enforce the configured constraints.

- [LavaMoat Browserify][LavamoatBrowserify]


### Lavamoat Viz

[lavamoatViz]: https://lavamoat.github.io/LavaMoat/
The [lavamoat viz][lavamoatViz] is a tool to visualize an application's dependency graph and assess package dangerousness.


## Further reading on software supplychain security

### Articles:
- [HackerNoon - I’m harvesting credit card numbers and passwords from your site. Here’s how](https://medium.com/hackernoon/im-harvesting-credit-card-numbers-and-passwords-from-your-site-here-s-how-9a8cb347c5b5)
- [Agoric - POLA Would Have Prevented the Event-Stream Incident](https://medium.com/agoric/pola-would-have-prevented-the-event-stream-incident-45653ecbda99)
- [Snyk - Why npm lockfiles can be a security blindspot for injecting malicious modules](https://snyk.io/blog/why-npm-lockfiles-can-be-a-security-blindspot-for-injecting-malicious-modules/)
- [Bytecode Alliance - Building a secure by default, composable future for WebAssembly](https://bytecodealliance.org/articles/announcing-the-bytecode-alliance)

### Videos:
- [Making 'npm install' Safe - Kate Sills - QCon 2020 ~40min](https://www.infoq.com/presentations/npm-install/)
- [JavaScript Supply Chain Security - Adam Baldwin - LocoMocoSec 2019 ~25min](https://www.youtube.com/watch?v=HDo2iOlkbyc)
- [Analysis of an exploited npm package – Jarrod Overson - Amsterdam JSNation Conference 2019  ~25min](https://www.youtube.com/watch?v=cvtt8TexqbU)
- [How Malicious NPM Packages Make Your Apps Vulnerable - SnykLive stream 2022 ~1h](https://youtu.be/STC_ubJNiMs?t=287)

## Supporters

Made with love by [MetaMask](https://github.com/metamask/)

Funded by [ConsenSys](https://github.com/consensys)

Runs on [Agoric](https://github.com/agoric/)

[SesGithub]: https://github.com/endojs/endo/tree/master/packages/ses
[SesComputingGuide]: https://github.com/endojs/endo/blob/master/packages/ses/docs/secure-coding-guide.md

[PolicyDoc]: ./docs/policy.md
[LavamoatNode]: ./packages/node
[LavamoatBrowserify]: ./packages/browserify
[LavamoatViz]: ./packages/viz
[LavamoatAllowScripts]: ./packages/allow-scripts
