// @ts-check
// Should translate AAs to numbers?
const { getPackageNameForModulePath } = require("@lavamoat/aa");
const diag = require("./diagnostics");

const ROOT_IDENTIFIER = "$root$";

const lookUp = (needle, haystack) => {
  const value = haystack[needle];
  if (value === undefined) {
    // When using the resolve-related hooks for finding out paths we'd get paths not included in the bundle trigger this case. Now it should not happen unless policy is incomplete.
    // This needs more observation/investigation
    console.trace(`Cannot find a match for ${needle} in policy`);
    // console.log(haystack);
  }
  return value;
};

/**
 * @param {Set<string>} neededIds
 * @param {Array<string>} policyIds
 */
const crossReference = (neededIds, policyIds) => {
  const missingIds = [];
  neededIds.forEach((id) => {
    if (!policyIds.includes(id)) {
      missingIds.push(id);
    }
  });
  diag.rawDebug(4, { missingIds, policyIds, neededIds });
  if (missingIds.length > 0) {
    throw new Error(
      `Policy is missing the following resources: ${missingIds.join(", ")}`
    );
  }
};

exports.generateIdentifierLookup = ({
  paths,
  policy,
  canonicalNameMap,
  unenforceableModuleIds,
  readableResourceIds,
}) => {
  const pathsToIdentifiers = (paths) => {
    const mapping = {};
    for (const p of paths) {
      if (p.path) {
        mapping[p.path] = {
          aa: getPackageNameForModulePath(canonicalNameMap, p.path),
          moduleId: p.moduleId,
        };
      }
    }
    return mapping;
  };

  const usedIdentifiers = Object.keys(policy.resources);
  usedIdentifiers.unshift(ROOT_IDENTIFIER);
  const usedIdentifiersIndex = Object.fromEntries(
    usedIdentifiers.map((id, index) => [id, index])
  );
  // choose the implementation - to translate from AA to numbers or not
  let translate;
  if (readableResourceIds) {
    translate = (i) => i;
  } else {
    // Why is this a string? There was way too much confusion involved when it was not. If the 2 extra characters are ever worth the hassle, feel free to change it back to numbers.
    translate = (i) => `${usedIdentifiersIndex[i]}`;
  }

  // TODO: it's likely that the current way we generate real AAs from node_modules would produce different identifiers than it'd otherwise produce from just looking at the paths in use.
  // We'll need to persist enough data to look up paths OR make sure policy generation only takes into account the paths involved.
  // Also, the numbers should probably come from webpack itself for later lookup at runtime

  const pathLookup = pathsToIdentifiers(paths);
  const identifiersWithKnownPaths = new Set(
    Object.values(pathLookup).map((pl) => pl.aa)
  );

  crossReference(identifiersWithKnownPaths, usedIdentifiers);

  const identifiersForModuleIds = Object.entries(
    Object.entries(pathLookup).reduce((acc, [_path, { aa, moduleId }]) => {
      const key = translate(aa);
      if (acc[key] === undefined) {
        acc[key] = [];
      }
      acc[key].push(moduleId);
      return acc;
    }, {})
  );

  const translateResource = (resource) => ({
    ...resource,
    packages:
      resource.packages &&
      Object.fromEntries(
        Object.entries(resource.packages).map(([id, value]) => [
          translate(id),
          value,
        ])
      ),
  });

  return {
    root: translate(ROOT_IDENTIFIER),
    unenforceableModuleIds,
    identifiersForModuleIds,
    pathToResourceId: (path) => {
      const pathInfo = lookUp(path, pathLookup);
      if (!pathInfo) return undefined;
      return translate(pathInfo.aa);
    },
    policyIdentifierToResourceId: (id) => translate(id),
    getTranslatedPolicy: () => {
      if (readableResourceIds) {
        return policy;
      }
      const translatedPolicy = {
        ...policy,
        resources: Object.fromEntries(
          Object.entries(policy.resources)
            .filter(([id]) => identifiersWithKnownPaths.has(id)) // only saves resources that are actually used
            .map(([id, resource]) => [
              translate(id),
              translateResource(resource),
            ])
        ),
      };
      return translatedPolicy;
    },
  };
};
