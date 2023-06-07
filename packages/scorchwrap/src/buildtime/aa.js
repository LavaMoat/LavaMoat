// Temporary implementation
// TODO: use real AA
/**
 * @param {string} modulePath
 * @returns
 */
const fakeAA = (modulePath) => {
  // TODO: properly resolve what belongs to which compartment
  let chunks = modulePath.split("node_modules/");
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

exports.pathsToIdentifiers = (paths) => {
  return Object.fromEntries(paths.map((p) => [p, fakeAA(p)]));
};
