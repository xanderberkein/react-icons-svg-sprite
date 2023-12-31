import path from "node:path";
import {
  ICON_LIBRARY_MAP,
  getConfig,
  getSpriteDir,
  getTypesPath,
  isInitialized,
  reactIconsDir,
  writeFiles,
} from "./util";
import fs from "node:fs/promises";
import { renderToString } from "react-dom/server";
import parse from "node-html-parser";
import { glob } from "glob";
import { prompt } from "enquirer";
import initialize from "./init";

export default async function add(
  icons: string[],
  args: Record<string, string>,
) {
  if (!icons.length) {
    console.log("No icons provided");
    process.exit();
  }

  if (!(await isInitialized())) {
    await initialize();
  }

  const config = await getConfig(args.config);
  const spritePath = await getSpriteDir(args.out, config);
  const typesPath = await getTypesPath(args.types, config);

  // build available icon map based on react-icons types
  // e.g.: { MdArrowLeft: ["md"], HiArrowLeft: ["hi", "hi2"] }
  const iconMap = await buildIconMap();

  const svgLines: string[] = [];
  const addedIcons: string[] = [];
  const replacedIcons: string[] = [];
  const allIcons: string[] = [];

  // add old icons
  let svg: string | undefined;
  try {
    const svgPath = await glob("**/sprite.*.svg", {
      ignore: ["node_modules"],
    });
    if (svgPath.length) {
      svg = await fs.readFile(svgPath[0], {
        encoding: "utf8",
      });
    }
  } catch (e) {} // no file yet

  if (svg) {
    const oldSvgLines = svg.split("\n");
    svgLines.push(...oldSvgLines.splice(0, oldSvgLines.length - 2));
    const pattern = /<symbol[\s\S]*?id="(.*?)"[\s\S]*?<\/symbol>/g;

    allIcons.push(...Array.from(svg.matchAll(pattern), match => match[1]));
  } else {
    svgLines.push(
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`,
    );
    svgLines.push("<defs>");
  }

  // add new icons (1 by 1, so we can ask what library to use if needed)
  for (const icon of icons) {
    const iconLibs = iconMap[icon]; // libraries this icon is part of

    // Since react-icons doesn't expose the original SVGs but only the generated JSX components,
    // we use `react-dom` to render the component to an HTML string
    // that we can parse and modify, before stringifying it again
    let IconComponent;
    let selectedLib: string;
    if (iconLibs.length === 1) {
      IconComponent = require(`react-icons/${iconLibs[0]}`)[icon];
      selectedLib = iconLibs[0];
    } else {
      const defaultLib = args.lib ?? config.lib;
      if (defaultLib && iconMap[icon].includes(defaultLib)) {
        IconComponent = require(`react-icons/${defaultLib}`)[icon];
        selectedLib = defaultLib;
      } else {
        selectedLib = "";
        selectedLib = await prompt({
          type: "select",
          name: "typeName",
          message: `Icon ${icon} is available in 2 icon libraries. Pick the library you want to use.`,
          initial: 0,
          choices: iconLibs.map(lib => ({
            value: lib,
            name: ICON_LIBRARY_MAP[lib] || lib,
          })),
        });
        IconComponent = require(`react-icons/${selectedLib}`)[icon];
      }
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
    svg.setAttribute("data-lib", selectedLib);
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

  svgLines.push("</defs>");
  svgLines.push("</svg>");

  // types
  const typeLines = ["export type IconName = "];

  allIcons.sort().forEach(icon => {
    typeLines.push(`  | "${icon}"`);
  });

  const generatedSvg = svgLines.join("\n");
  const generatedType = typeLines.join("\n");

  try {
    await writeFiles({
      svg: generatedSvg,
      type: generatedType,
      spritePath,
      typePath: typesPath,
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
