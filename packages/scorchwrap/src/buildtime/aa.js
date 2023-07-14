// Should translate AAs to numbers?
const TRANSLATE_AA_TO_NUMBERS = false;

// Temporary implementation
// TODO: use real AA
/**
 * @param {string} modulePath
 * @returns
 */
const fakeAA = (modulePath) => {
  // TODO: properly resolve what belongs to which compartment
  let chunks = modulePath.split("node_modules/");
  chunks[0] = "$root$";
  chunks = chunks.map((chunk) => {
    // only keep the @scope/package or package name
    const parts = chunk.split("/");
    if (parts[0].startsWith("@")) {
      return parts.slice(0, 2).join("/");
    }
    return parts[0];
  });
  if (chunks.length > 1) {
    chunks.shift();
  }
  return chunks.join(">");
};

const pathsToIdentifiers = (paths) => {
  return Object.fromEntries(paths.map((p) => [p, fakeAA(p)]));
};

exports.pathsToIdentifiers = pathsToIdentifiers;

const lookUp = (needle, haystack) => {
  const value = haystack[needle];
  if (value === undefined) {
    // webpack may attempt to go through out-of-policy stuff as we're plugging into webpack's `resolve` and that may be used by plugins to resolve things not in the bundle. Eg. app/node_modules/esbuild-loader/dist/index.cjs is being resolved.
    console.error(`Cannot find a match for ${needle} in policy`);
  }
  return value;
};

// choose the implementation - to translate from AA to numbers or not
let translate;
if (TRANSLATE_AA_TO_NUMBERS) {
  translate = lookUp;
} else {
  translate = (i) => i;
}

exports.generateIdentifierLookup = (paths, policy) => {
  const usedIdentifiers = Object.keys(policy.resources);

  // TODO: it's likely that the current way we generate real AAs from node_modules would produce some shorter identifiers than it'd otherwise produce from just looking at the paths in use.
  // We'll need to persist enough data to look up paths OR make sure policy generation only takes into account the paths involved.
  // Also, the numbers should probably come from webpack itself for later lookup at runtime

  const pathLookup = pathsToIdentifiers(paths);
  const identifiersWithKnownPaths = new Set(Object.values(pathLookup));
  const usedIdentifiersIndex = Object.fromEntries(
    usedIdentifiers.map((id, index) => [id, index])
  );

  const translateResource = (resource) => ({
    ...resource,
    packages:
      resource.packages &&
      Object.fromEntries(
        Object.entries(resource.packages).map(([id, value]) => [
          translate(id, usedIdentifiersIndex),
          value,
        ])
      ),
  });

  return {
    pathToModuleId: (path) =>
      translate(lookUp(path, pathLookup), usedIdentifiersIndex),
    policyIdentifierToModuleId: (id) => translate(id, usedIdentifiersIndex),
    getTranslatedPolicy: () => {
      if (!TRANSLATE_AA_TO_NUMBERS) {
        return policy;
      }
      const translatedPolicy = {
        ...policy,
        resources: Object.fromEntries(
          Object.entries(policy.resources)
            .filter(([id]) => identifiersWithKnownPaths.has(id))
            .map(([id, resource]) => [
              translate(id, usedIdentifiersIndex),
              translateResource(resource),
            ])
        ),
      };
      return translatedPolicy;
    },
  };
};
