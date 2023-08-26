import path from "node:path";
import { type Config } from "./config.types";

// in local environment, this package is not installed within node_modules
const isLocalEnv = !__dirname.includes("node_modules");

export const rootDir = process.cwd();
export const nodeModulesDir = path.join(
  __dirname,
  isLocalEnv ? "../node_modules" : "../../",
);
export const reactIconsDir = path.join(nodeModulesDir, "react-icons");
export const cacheDir = path.join(nodeModulesDir, ".react-icons-svg-sprite");
export const packageJson = path.resolve(__dirname, "../package.json");

export const defaultOut = "assets";

export const symbolPattern = /<symbol[\s\S]*?id="(.*?)"[\s\S]*?<\/symbol>/g;

export function getConfig(config?: string): Config {
  const configPath = path.join(rootDir, config || "icons.config.js");

  let rawConfig;
  try {
    rawConfig = require(configPath) as Config;
  } catch (e) {}

  return rawConfig || {};
}

export function getSpritePath(config?: Config): string {
  const out = config?.out?.endsWith(".svg")
    ? config.out
    : path.join(config?.out || defaultOut, "sprite.svg");

  const spritePath = path.join(rootDir, out);
  return spritePath;
}

export const ICON_LIBRARY_MAP: Record<string, string> = {
  ai: "Ant Design Icons",
  bi: "Bootstrap Icons",
  bs: "BoxIcons",
  cg: "Circum Icons",
  ci: "css.gg",
  di: "Devicons",
  fa: "Font Awesome 5",
  fa6: "Font Awesome 6",
  fc: "Flat Color Icons",
  fi: "Feather",
  gi: "Game Icons",
  go: "Github Octicons icons",
  gr: "Grommet-Icons",
  hi: "Heroicons",
  hi2: "Heroicons 2",
  im: "IcoMoon Free",
  io: "Ionicons 4",
  io5: "Ionicons 5",
  lia: "Icons8 Line Awesome",
  lu: "Lucide",
  md: "Material Design icons",
  pi: "Phosphor Icons",
  ri: "Remix Icon",
  rx: "Radix Icons",
  si: "Simple Icons",
  sl: "Simple Line Icons",
  tb: "Tabler Icons",
  tfi: "Themify Icons",
  ti: "Typicons",
  vsc: "VS Code Icons",
  wi: "Weather Icons",
} as const;
