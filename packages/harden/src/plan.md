- minimize use of dependencies
- note the existing folder structure

## initial plan

1. base cli

- use util.parseArgs from node to parse args
- support --help and --version
- `harden defaults <flags>` to generate a config with reasonable defaults

- all functionality should be available from index.js as a programmatic API as well, so the cli should just call the relevant methods from the index.js module

- the current implementation is non-interactive. an interactive mode might be added later. every method should be designed to accept `options` that are internal and known upfront and an object called `decisions` with functions to call asynchronously to obtain user decisions via prompt or from cli args, just wrapped in a decision call.

Decisions use example: The functionality to harden defaults should see whether a package manager was provided as an option, if not, it should attempt to call the `packageManager` decision function and use the result of that. Decisions should return null if not implemented or not interactive. That's how it obtains input. Make sure decisions are not all called upfront, but only at the point where the information is actually needed.

that way the codebase will be prepared to use

2. package manager detection

- use the knowledge from [./detecting-config.md](./detecting-config.md) to detect package manager
- accept `--package-manager` (`-p` for short) flag to select package manager
- accept `--level` (`-l` for short) flag to select hardening level (strict, moderate, baseline)
- if the detected package manager is different than declared, warn the user
- package manager detection is a separate module with two methods:
  - `collectFacts` that checks for existence and contents of all necessary files and returns a well defined and typed object with all the relevant info
  - `detectPackageManager` that takes the output of `collectFacts` and returns the detected package manager and version if possible to infer from the facts

3. modules to handle reading and modifying the config files (minimal implementations necessary to avoid messing up the files. a dependency on yaml parser will likely be required. we also care about putting comments above each line.)
   Each module should accept an input of an array of objects representing a config change (a config entry and a comment to put on it OR an item to comment-out with explanation why). The module should be responsible for merging the new entries with the existing config, ensuring that the output is deterministic and that comments are preserved. (for the .npmrc file we can avoid dependencies and just read it line-by-line and search for keys in lines)

4. separate modules for each package manager that will generate the config based on the facts collected in (2) and some reasonable defaults. These modules will be used both in the cli and in the programmatic api.
   Each packagemanager specific module should export a method `reasonableDefaults(facts)` that takes the facts collected in (2) and returns an array of config changes (see (3)) that should be applied to harden the project. Each config change should also have a level assigned to it (e.g. "strict", "moderate", "baseline") that indicates how strong the change is and can be used to allow users to select a level of hardening.

5. all opinions about reasonable config are to be stored in a single module called opinions, with the following shape:

```js
{
    description: "some text describing the opinion and the reasoning behind it",
    level: "strict" | "moderate" | "baseline", // a level indicating how strong the opinion is. this can be used to allow users to select a level of hardening
    applicableTo: ["npm", "yarn", "pnpm"], // an array of package managers that this opinion applies to. if empty or not present, it passes initial filtering. The changes are package-manager-config-file specific anyway.
    //NOTE: it is possible for a change to aply to yarn but have a pnpm config - to prevent pnpm from running at all, for example.
    // all below are optional:
    npm: [{key, value, comment}],
    yarn: [{key, value, comment}],
    pnpm: [{key, value, comment}],
    packagejson: [{key, value}], // can't have a comment
    execute: (facts) => {} // a function that takes the facts collected in (2) and performs additional tasks like creating extra files. If it throws, the config change should not be applied.
}
```

Create an initial set of opinions based on the knowledge in the [./detecting-config.md](./detecting-config.md) file and https://lavamoat.github.io/guides/hardening-dev

---

## clarifications

### Scope of `harden defaults`

- Only writes config files. Does NOT install dependencies directly.
- Installing deps (like `@lavamoat/allow-scripts`) belongs in `execute()` within opinions or PM-specific modules, gated by decisions.
- Skip implementing allow-scripts integration for now — allowlisting is a future iteration.

### Level selection

- `--level baseline|moderate|strict` flag is used by the `shouldApplyOpinion` decision function to filter opinions.
- In non-interactive mode, level is the only input. In future interactive mode, the same decision function can prompt the user per-opinion.

### Decision function shape

- Named decision functions (not one generic). For opinions: `shouldApplyOpinion(opinion, facts)` → boolean.
- Other decisions (e.g. `packageManager`) can return strings or null.
- Decisions return `null` if not implemented or not interactive — caller handles fallback.
- Decisions are NOT all called upfront; each is called lazily at the point where the information is needed.

### Yarn v1

- Refuse to generate config for yarn v1. Print a message telling the user to upgrade.

### Config file conflicts

- Merge strategy: override only security-critical keys that opinions declare.
- Preserve user's existing non-conflicting values.

### opinions.js vs PM modules (items 4 & 5)

- `opinions.js` is pure data — an array of opinion objects with the shape described in item 5.
- PM modules (`npm/`, `yarn/`, `pnpm/`) have their own logic: they read opinions, filter by PM applicability, use the decision function, and produce config change arrays for the config-file modules.
- PM modules also call `execute()` if present on an opinion.
- Item 4's `reasonableDefaults(facts)` is the entry point in each PM module, but it delegates to opinions for the data.

### Config entry format

- `{key, value, comment}` for .npmrc (INI-style) and YAML files.
- `{key, value}` for `packagejson` — no comment support (JSON). Key is a deep path to merge into package.json (e.g. `engines.npm`).

### YAML handling

- Use the `yaml` npm package for reading and writing `.yarnrc.yml` and `pnpm-workspace.yaml`.
- For `.npmrc`, line-based editing without dependencies (key=value format is simple enough).

### Output

- Print a summary of changes made (files modified, keys added/changed).

### src/tools/ directory

- Shared utilities not specific to any package manager.
- Includes: package manager detection module (`collectFacts`, `detectPackageManager`), file I/O helpers.

### Package name

- `@lavamoat/harden`

### execute() in opinions

- No concrete examples from reference material yet. Will be populated later when writing opinions.
- Potential uses: creating supplementary files, installing plugins, adding preinstall scripts.
