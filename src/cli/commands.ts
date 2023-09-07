import { glob } from "glob";
import path from "node:path";
import fs from "node:fs/promises";
import { select } from "@clack/prompts";
import { ICON_LIBRARY_MAP } from "./util";
import { renderToString } from "react-dom/server";
import parse from "node-html-parser";

type Config = {
  icons: Record<string, string[]>;
  defaultLib?: string;
  out?: string;
};

export async function add(icons: string[], args: Record<string, string>) {
  if (!icons.length) {
    console.log("No icons provided");
    process.exit();
  }

  const config = await getConfig();
  const spritePath = getSpritePath(args.out, config);

  // build available icon map based on react-icons types
  // e.g.: { MdArrowLeft: ["md"], HiArrowLeft: ["hi", "hi2"] }
  const iconMap = await buildIconMap();

  const svgLines: string[] = [];
  const addedIcons: string[] = [];
  const replacedIcons: string[] = [];
  const allIcons: string[] = [];

  svgLines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`,
  );
  svgLines.push("<defs>");

  // add new icons (1 by 1, so we can ask what library to use if needed)
  await Promise.allSettled(
    [...Object.entries(config.icons), ["", icons]].map(async ([lib, icons]) => {
      for (const icon of icons) {
        const iconLibs = iconMap[icon]; // libraries this icon is part of

        // Since react-icons doesn't expose the original SVGs but only the generated JSX components,
        // we use `react-dom` to render the component to an HTML string
        // that we can parse and modify, before stringifying it again
        let IconComponent;
        let selectedIconLib: string = lib.toString() || iconLibs[0];
        console.log(selectedIconLib);
        try {
          if (iconLibs.length === 1) {
            IconComponent = require(`react-icons/${iconLibs[0]}`)[icon];
          } else {
            const defaultLib = args.lib ?? config.defaultLib;
            if (defaultLib && iconMap[icon].includes(defaultLib)) {
              IconComponent = require(`react-icons/${defaultLib}`)[icon];
            } else {
              const selectedLib = (await select({
                message: `Icon ${icon} is available in 2 icon libraries. Pick the library you want to use.`,
                options: iconLibs.map(lib => ({
                  value: lib,
                  label: ICON_LIBRARY_MAP[lib] || lib,
                })),
              })) as string;
              selectedIconLib = selectedLib;
              IconComponent = require(`react-icons/${selectedLib}`)[icon];
            }
          }
        } catch (e) {
          console.log(`SVG not found: ${icon}`);
        }

        const input = renderToString(IconComponent());
        const doc = parse(input);

        const svg = doc.querySelector("svg");

        if (!svg) {
          console.log(`SVG not found: ${icon}`);
          process.exit();
        }

        svg.tagName = "symbol";
        svg.setAttribute("id", icon);
        svg.setAttribute("data-lib", selectedIconLib);
        svg.removeAttribute("xmlns");
        svg.removeAttribute("xmlns:xlink");
        svg.removeAttribute("version");
        svg.removeAttribute("width");
        svg.removeAttribute("height");

        // check if svg sprite has this icon already
        // if it has, overwrite
        // if not, add it to the allIcons list
        const sameIconIdx = allIcons.findIndex(ic => ic === icon);
        if (sameIconIdx >= 0) {
          svgLines[sameIconIdx + 2] = `${svg.toString().trim()}`;
          replacedIcons.push(icon);
        } else {
          allIcons.push(icon);
          addedIcons.push(icon);
          svgLines.push(`${svg.toString().trim()}`);
        }
      }
    }),
  );

  svgLines.push("</defs>");
  svgLines.push("</svg>");

  const generatedSvg = svgLines.join("\n");

  try {
    await writeFiles({
      svg: generatedSvg,
      spritePath,
    });
  } catch (e) {
    console.error("Unable to write output files");
    console.error(e);
    process.exit(1);
  }

  console.log(`Added: ${addedIcons.join(", ") || 0}`);
  if (replacedIcons.length) {
    console.log(`Replaced: ${replacedIcons.join(", ")}`);
  }
  console.log(`Total: ${allIcons.length} icon(s) in your collection`);
  process.exit();
}

// in local environment, this package is not installed within node_modules
const isLocalEnv = !__dirname.includes("node_modules/react-icons-svg-sprite");

const rootDir = process.env.INIT_CWD || process.cwd();
const nodeModulesDir = path.join(
  __dirname,
  isLocalEnv ? "../../node_modules" : "../../../",
);
const cacheDir = path.join(nodeModulesDir, ".react-icons-svg-sprite");
const rootPackageJson = require(path.join(rootDir, "/package.json"));
const reactIconsDir = path.join(nodeModulesDir, "react-icons");

const isEsm = rootPackageJson.type === "module";
const importDynamic = new Function("modulePath", "return import(modulePath)");

// util
async function getConfig(): Promise<Config> {
  const configPaths = await glob("**/icons.json", {
    ignore: ["node_modules/**", "build/**"],
  });

  console.log(configPaths);

  if (configPaths.length === 0) {
    // todo generate ?
    console.log("No icons.json found");
    process.exit();
  }

  let config;
  try {
    config = require(path.join(rootDir, configPaths[0])) as Config;
    // config = (await importDynamic(configPaths[0])).default as Config;
  } catch (e) {
    console.log("this?");
    console.log(e);
    process.exit();
  }

  return config || {};
}

function getSpritePath(outArg?: string, config?: Config): string {
  const customOut = outArg ?? config?.out;

  if (customOut) {
    const out = customOut?.endsWith(".svg")
      ? customOut
      : path.join(customOut, "sprite.svg");

    return path.join(rootDir, out);
  }

  return path.join(cacheDir, "sprite.svg");
}

async function buildIconMap(): Promise<Record<string, string[]>> {
  const iconMap: Record<string, string[]> = {};

  const reactIconsFolders = (
    await fs.readdir(reactIconsDir, {
      withFileTypes: true,
    })
  )
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  await Promise.allSettled(
    reactIconsFolders.map(async folder => {
      const filePath = path.join(reactIconsDir, folder, "index.d.ts");

      const fileContent = await fs.readFile(filePath, "utf-8");

      const regex = /export\s+declare\s+const\s+([A-Za-z0-9_]+):\s+IconType;/g;

      [...fileContent.matchAll(regex)].forEach(([, match]) => {
        if (iconMap[match]) iconMap[match].push(folder);
        else iconMap[match] = [folder];
      });
    }),
  );

  return iconMap;
}

async function writeFiles({
  svg,
  spritePath,
}: {
  svg?: string;
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

  // find config path
  const configx = (await glob("**/icons.json", {
    ignore: ["node_modules/**", "build/**"],
  }))[0];

  const configPath = path.relative(cacheDir, path.join(rootDir, configx));

  console.log(configPath);

  const types = `
import 
  `


  // // create cache folder if not exists
  // try {
  //   await fs.stat(cacheDir);
  // } catch (error) {
  //   await fs.mkdir(cacheDir, { recursive: true });
  // }

  // // await fs.writeFile(path.join(cacheDir, "types.ts"), type);

  // generate svg import
  const relativeSprite = path.relative(cacheDir, spritePath);
  const spriteExport = isEsm
    ? `export default require("./${relativeSprite}");`
    : `module.exports = require("./${relativeSprite}");`;

  await fs.writeFile(path.join(cacheDir, "sprite.js"), spriteExport);
}
