import path from "node:path";
import { type Config } from "./config.types";

export const rootDir = process.cwd();
export const nodeModulesDir = path.join(rootDir, "node_modules");
export const reactIconsDir = path.join(nodeModulesDir, "react-icons");
export const cacheDir = path.join(nodeModulesDir, ".react-icons-svg-sprite");

export const defaultOut = "assets";

export function getConfig(config?: string): Config {
  const configPath = path.join(rootDir, config || "icons.config.js");

  let rawConfig;
  try {
    rawConfig = require(configPath) as Config;
  } catch (e) {}

  return rawConfig || {};
}
