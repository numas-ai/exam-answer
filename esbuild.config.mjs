import * as esbuild from "esbuild";

/*
 * 学生侧面板：与其它浏览器扩展同一套构建（platform browser，只把 vscode 当 external）。
 * 不允许出现 node 内建模块 —— 需要 node 能力时说明这个扩展的形态选错了。
 */
await esbuild.build({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outdir: "dist",
  external: ["vscode"],
  format: "cjs",
  platform: "browser",
  target: "es2022",
  sourcemap: false,
  minify: true,
  keepNames: true,
  tsconfig: "tsconfig.json",
});
