// TODO: fill this in with loading the files and wrapping them
import * as esbuild from "esbuild";
import fs from "node:fs";
import wrapper from "../wrapper.js";

const onLoadMaker = (loader) => async (args) => {
  const { path } = args;
  const source = await fs.promises.readFile(path, "utf8");
  return {
    contents: wrapper({
      source,
      id: path,
      runChecks: false,
      runtimeKit: ["module", "exports"],
    }),
    loader,
  };
};

let lavaMoatPlugin = {
  name: "LavaMoat",
  setup(build) {
    build.onLoad({ filter: /\.js/ }, onLoadMaker("js"));
    build.onLoad({ filter: /\.ts/ }, onLoadMaker("ts"));
  },
};

await esbuild.build({
  entryPoints: ["./app.js"],
  bundle: true,
  outfile: "./dist/app.bundle.js",
  plugins: [lavaMoatPlugin],
});
