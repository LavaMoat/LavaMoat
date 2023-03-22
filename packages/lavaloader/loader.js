const wrapper = require("./wrapper.js");

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

  // console.log(
  //   Object.fromEntries(
  //     Object.entries(this).filter(([k, v]) => typeof v === "string")
  //   )
  // );
  // console.log(source);

  return wrapper({
    source,
    id: fakeAA(this.resourcePath),
    runtimeKit: ["module", "exports", "__webpack_require__"],
  });
};
