const esbuild = require("esbuild");
const fs = require("node:fs");
const path = require("node:path");

fs.rmSync("dist", { force: true, recursive: true });
fs.mkdirSync("dist", { recursive: true });

const common = {
  bundle: true,
  entryPoints: ["src/index.ts"],
  external: ["react", "react/jsx-runtime"],
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
])
  .then(() => {
    fs.copyFileSync(
      path.join("browser", "form.js"),
      path.join("dist", "form.js"),
    );
    fs.copyFileSync(
      path.join("browser", "builder.js"),
      path.join("dist", "builder.js"),
    );
  })
  .catch(() => process.exit(1));
