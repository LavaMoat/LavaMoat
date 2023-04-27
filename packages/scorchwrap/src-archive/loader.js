const { wrapSource } = require("../src/wrapper.js");

const fakeAA = (path) => {
  // TODO: properly resolve what belongs to which compartment
  let chunks = path.split("node_modules/");
  chunks[0] = "app";
  chunks = chunks.map((chunk) => {
    // only keep the @scope/package or package name
    const parts = chunk.split("/");
    if (parts[0].startsWith("@")) {
      return parts.slice(0, 2).join("/");
    }
    return parts[0];
  });
  return chunks.join(">");
};

module.exports = function (source) {
  const options = this.getOptions();
  return wrapSource({
    source,
    id: fakeAA(this.resourcePath),
    runtimeKit: ["module", "exports", "__webpack_require__"], // looking at what we learned from the plugin, this list was extremely inadequate.
    runChecks: options.runChecks,
  });
};
