import path from "node:path";
import {
  ICON_LIBRARY_MAP,
  cacheDir,
  getConfig,
  getSpritePath,
  reactIconsDir,
} from "./util";
import fs from "node:fs/promises";
import { select } from "@clack/prompts";
import { renderToString } from "react-dom/server";
import parse from "node-html-parser";

export default async function add(configPath: string, icons: string[]) {
  if (!icons.length) {
    console.log("No icons provided");
    process.exit();
  }

  const config = getConfig(configPath);
  const spritePath = getSpritePath(config);

  // build available icon map based on react-icons types
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

  const svgLines: string[] = [];
  const addedIcons: string[] = [];
  const replacedIcons: string[] = [];
  const allIcons: string[] = [];

  svgLines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`,
  );
  svgLines.push("<defs>");

  // add old icons
  let svg: string | undefined;
  try {
    svg = await fs.readFile(spritePath, {
      encoding: "utf8",
    });
  } catch (e) {} // no file yet

  if (svg) {
    const oldSvgLines = svg.split("\n");
    svgLines.push(...oldSvgLines.splice(2, oldSvgLines.length - 4));
    const pattern = /<symbol[\s\S]*?id="(.*?)"[\s\S]*?<\/symbol>/g;

    allIcons.push(...Array.from(svg.matchAll(pattern), match => match[1]));
  }

  // add new icons
  await Promise.allSettled(
    icons.map(async icon => {
      const iconLibs = iconMap[icon]; // libraries this icon is part of

      let IconComponent;
      if (iconLibs.length === 1) {
        IconComponent = require(`react-icons/${iconLibs[0]}`)[icon];
      } else {
        const selectedLib = await select({
          message:
            "This icon is available in 2 icon libraries. What library do you want to get the icon from?",
          options: iconLibs.map(lib => ({
            value: lib,
            label: ICON_LIBRARY_MAP[lib] || lib,
          })),
        });
        IconComponent = require(`react-icons/${selectedLib}`)[icon];
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
      svg.removeAttribute("xmlns");
      svg.removeAttribute("xmlns:xlink");
      svg.removeAttribute("version");
      svg.removeAttribute("width");
      svg.removeAttribute("height");

      // check if old svg has icon already
      // if it has, overwrite
      // if not, add it to the allIcons list
      const sameIconIdx = allIcons.findIndex(icon => icon === icon);
      if (sameIconIdx >= 0) {
        svgLines.splice(sameIconIdx + 2, 1);
        replacedIcons.push(icon);
      } else {
        allIcons.push(icon);
        addedIcons.push(icon);
      }

      svgLines.push(`${svg.toString().trim()}`);
    }),
  );

  // types
  const typeLines = ["export type IconName = "];

  icons.sort().forEach(icon => {
    typeLines.push(`  | "${icon}"`);
  });

  const generatedSvg = svgLines.join("\n");
  const generatedType = typeLines.join("\n");

  // create output folder if not exist
  try {
    await fs.stat(path.dirname(spritePath));
  } catch (error) {
    await fs.mkdir(path.dirname(spritePath), { recursive: true });
  }

  await fs.writeFile(spritePath, generatedSvg);

  try {
    await fs.stat(cacheDir);
  } catch (error) {
    await fs.mkdir(cacheDir, { recursive: true });
  }

  await fs.writeFile(path.join(cacheDir, "types.ts"), generatedType);

  const spriteExport = `module.exports = require("${path.join(
    config?.out || "",
    "sprite.svg",
  )}");`;

  // generate output import
  await fs.writeFile(path.join(cacheDir, "sprite.js"), spriteExport);

  console.log(`Added: ${addedIcons.join(", ") || 0}`);
  if (replacedIcons.length) {
    console.log(`Replaced: ${replacedIcons.join(", ")}`);
  }
  console.log(`Total: ${allIcons.length} icon in your collection`);
  process.exit();
}
