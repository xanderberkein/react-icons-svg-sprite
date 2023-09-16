import path from "node:path";
import fs from "node:fs/promises";
import { type Config } from "../config.types";
import { glob } from "glob";
import { createHash } from "node:crypto";
import supportsHyperlink from "supports-hyperlinks";

// in local environment, this package is not installed within node_modules
const isLocalEnv = !__dirname.includes("node_modules/react-icons-svg-sprite");

export const rootDir = process.env.INIT_CWD || process.cwd();
export const nodeModulesDir = path.join(
  __dirname,
  isLocalEnv ? "../../node_modules" : "../../../",
);
export const reactIconsDir = path.join(nodeModulesDir, "react-icons");
export const cacheDir = path.join(nodeModulesDir, ".react-icons-svg-sprite");
export const publicDir = path.join(rootDir, "public");
const rootPackageJson = require(path.join(rootDir, "/package.json"));

export const isEsm = rootPackageJson.type === "module";
const importDynamic = new Function("modulePath", "return import(modulePath)");

export const defaultOut = "public";
export const defaultTypes = "types/sprite.types.ts";

export const symbolPattern = /<symbol[\s\S]*?id="(.*?)"[\s\S]*?<\/symbol>/g;

export async function getConfig(config?: string): Promise<Config> {
  const configPath = path.join(rootDir, config || "icons.config.js");

  let rawConfig;
  try {
    rawConfig = (await importDynamic(configPath)).default as Config;
  } catch (e) {} // no config file

  return rawConfig || {};
}

export async function getSpriteDir(
  outArg?: string,
  config?: Config,
): Promise<string> {
  const customOut = outArg ?? config?.out;

  if (customOut) {
    return path.join(rootDir, customOut);
  }

  const spritePath = await glob("**/sprite.*.svg", {
    ignore: ["node_modules"],
  });

  if (spritePath.length > 0) {
    return path.dirname(path.join(rootDir, spritePath[0]));
  }

  return path.join(rootDir, defaultOut);
}

export async function getTypesPath(
  typesArg?: string,
  config?: Config,
): Promise<string> {
  const customOut = typesArg ?? config?.types;

  if (customOut) {
    const out = customOut?.endsWith(".ts")
      ? customOut
      : path.join(customOut, "sprite.types.ts");
    return path.join(rootDir, out);
  }
  const typesPath = await glob("**/sprite.{ts,d.ts,types.ts}", {
    ignore: ["node_modules"],
  });

  if (typesPath.length > 0) {
    return path.join(rootDir, typesPath[0]);
  }

  // no types yet -> check if it's a Typescript project
  const isTypescript = await isTypescriptProject();

  // todo fix this also runs on postinstall
  if (isTypescript) {
    return path.join(rootDir, defaultTypes);
  }

  // if not Typescript, create types inside node_modules
  return path.join(cacheDir, "sprite.types.ts");
}

export async function writeFiles({
  svg,
  type,
  spritePath,
  typePath,
}: {
  svg?: string;
  type: string;
  spritePath: string;
  typePath?: string;
}): Promise<string> {
  // calculate sprite hash
  const iconHashFull = createHash("md5")
    .update(svg || "")
    .digest("base64url");
  const iconHash = iconHashFull.slice(0, 8);

  // create cache folder if not exists
  try {
    await fs.rm(cacheDir, { recursive: true, force: true });
  } catch (error) {}

  await fs.mkdir(cacheDir, { recursive: true });

  // generate icon.js
  const iconFile = await fs.readFile(path.join(__dirname, "../icon.js"), {
    encoding: "utf8",
  });
  const iconWithHash = iconFile.replace("__IMAGE_HASH__", iconHash.slice(0, 8));
  await fs.writeFile(path.join(cacheDir, "icon.js"), iconWithHash);
  await fs.copyFile(
    path.join(__dirname, "../icon.d.ts"),
    path.join(cacheDir, "icon.d.ts"),
  );
  await fs.copyFile(
    path.join(__dirname, "../icon.d.ts.map"),
    path.join(cacheDir, "icon.d.ts.map"),
  );

  const svgPath = path.join(spritePath, `sprite.${iconHash.slice(0, 8)}.svg`);

  if (svg) {
    try {
      await fs.stat(path.dirname(svgPath));

      // remove old svgs
      const relativeOldSvgPath = path.relative(rootDir, spritePath);
      const oldSvgs = await glob(`${relativeOldSvgPath}/sprite.*.svg`, {
        ignore: ["node_modules"],
      });

      if (oldSvgs.length) {
        for (const oldSvg of oldSvgs) {
          await fs.rm(path.join(rootDir, oldSvg), { force: true });
        }
      }
    } catch (error) {
      // create output folder if not exists
      await fs.mkdir(path.dirname(svgPath), { recursive: true });
    }

    await fs.writeFile(svgPath, svg);
  }

  if (typePath) {
    // create types folder if not exists
    try {
      await fs.stat(path.dirname(typePath));
    } catch (error) {
      await fs.mkdir(path.dirname(typePath), { recursive: true });
    }
    await fs.writeFile(typePath, type);

    // generate type import
    const relativeType = path.relative(cacheDir, typePath || "");
    const typeExport = `import { type IconName } from "${relativeType.replace(
      /(\.d\.ts|\.ts)$/i,
      "",
    )}";
  export { IconName };`;

    await fs.writeFile(path.join(cacheDir, "types.ts"), typeExport);
  }

  return svgPath;
}

export function terminalLink(text: string, url: string) {
  if (supportsHyperlink.stdout) {
    return `\u001b]8;;${url}\u0007${text}\u001b]8;;\u0007`;
  }
  return `${text}: ${url}`;
}

export async function isTypescriptProject() {
  try {
    await import("typescript");
    return true;
  } catch (e) {
    return false;
  }
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
