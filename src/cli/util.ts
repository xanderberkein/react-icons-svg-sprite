import path from "node:path";
import fs from "node:fs/promises";
import { type Config } from "../config.types";

// in local environment, this package is not installed within node_modules
const isLocalEnv = !__dirname.includes("node_modules/react-icons-svg-sprite");

export const rootDir = process.env.INIT_CWD || process.cwd();
export const nodeModulesDir = path.join(
  __dirname,
  isLocalEnv ? "../../node_modules" : "../../../",
);
export const reactIconsDir = path.join(nodeModulesDir, "react-icons");
export const cacheDir = path.join(nodeModulesDir, ".react-icons-svg-sprite");
const rootPackageJson = require(path.join(rootDir, "/package.json"));

export const isEsm = rootPackageJson.type === "module";
const importDynamic = new Function('modulePath', 'return import(modulePath)')

export const defaultOut = "assets";

export const symbolPattern = /<symbol[\s\S]*?id="(.*?)"[\s\S]*?<\/symbol>/g;

export async function getConfig(config?: string): Promise<Config> {
  const configPath = path.join(rootDir, config || "icons.config.js");

  let rawConfig;
  try {
    rawConfig = (await importDynamic(configPath)).default as Config;
  } catch (e) {
    console.log(e);
  }


  return rawConfig || {};
}

export function getSpritePath(outArg?: string, config?: Config): string {
  const customOut = outArg ?? config?.out;

  const out = customOut?.endsWith(".svg")
    ? customOut
    : path.join(customOut || defaultOut, "sprite.svg");

  const spritePath = path.join(rootDir, out);
  return spritePath;
}

export async function writeFiles({
  svg,
  type,
  spritePath,
}: {
  svg?: string;
  type: string;
  spritePath: string;
}) {
  if (svg) {
    // create output folder if not exists
    try {
      await fs.stat(path.dirname(spritePath));
    } catch (error) {
      await fs.mkdir(path.dirname(spritePath), { recursive: true });
    }

    await fs.writeFile(spritePath, svg);
  }

  // create cache folder if not exists
  try {
    await fs.stat(cacheDir);
  } catch (error) {
    await fs.mkdir(cacheDir, { recursive: true });
  }

  await fs.writeFile(path.join(cacheDir, "types.ts"), type);

  // generate svg import
  const relativeSprite = path.relative(cacheDir, spritePath);
  const spriteExport = isEsm
    ? `export default require("./${relativeSprite}");`
    : `module.exports = require("./${relativeSprite}");`;

  await fs.writeFile(path.join(cacheDir, "sprite.js"), spriteExport);
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
