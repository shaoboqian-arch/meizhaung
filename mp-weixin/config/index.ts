import path from "node:path";
import { defineConfig } from "@tarojs/cli";

export default defineConfig({
  projectName: "beauty-ingredient-mp",
  date: "2026-06-05",
  designWidth: 750,
  deviceRatio: {
    640: 2.34,
    750: 1,
    828: 1.81
  },
  sourceRoot: "src",
  outputRoot: process.env.BEAUTY_MP_OUTPUT_DIR
    ? path.relative(path.resolve(__dirname, ".."), path.resolve(process.env.BEAUTY_MP_OUTPUT_DIR)) : "dist",
  framework: "react",
  compiler: "webpack5",
  plugins: ["@tarojs/plugin-framework-react"],
  alias: {
    "@shared/data": path.resolve(__dirname, "../../src/data"),
    "@shared/types": path.resolve(__dirname, "../../src/types")
  },
  mini: {
    webpackChain(chain) {
      chain.module.rule("script").include.add(path.resolve(__dirname, "../../src"));
    },
    postcss: {
      pxtransform: {
        enable: true,
        config: {}
      },
      cssModules: {
        enable: false
      }
    }
  }
});
