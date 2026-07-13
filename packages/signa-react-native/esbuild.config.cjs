const esbuild = require("esbuild");
const fs = require("node:fs");

fs.rmSync("dist", { force: true, recursive: true });
fs.mkdirSync("dist", { recursive: true });

const common = {
  bundle: true,
  entryPoints: ["src/index.ts"],
  external: [
    "react",
    "react/jsx-runtime",
    "react-native",
    "react-native-webview",
  ],
  minify: true,
  sourcemap: true,
  target: ["es2020"],
};

Promise.all([
  esbuild.build({
    ...common,
    outfile: "dist/index.js",
    format: "esm",
  }),
  esbuild.build({
    ...common,
    outfile: "dist/index.cjs",
    format: "cjs",
  }),
]).catch(() => process.exit(1));
