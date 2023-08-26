#! /usr/bin/env node

import path from "node:path";
import fs from "node:fs/promises";
import { cacheDir, defaultOut, getConfig, getSpritePath } from "./util";

async function postInstall() {
  const config = getConfig();
  const spritePath = getSpritePath(config);

  let svg: string | undefined;
  try {
    svg = await fs.readFile(spritePath, {
      encoding: "utf8",
    });
  } catch (e) {} // no file yet

  const typeLines = [];

  if (svg) {
    const pattern = /<symbol[\s\S]*?id="(.*?)"[\s\S]*?<\/symbol>/g;

    const icons = Array.from(svg.matchAll(pattern), match => match[1]);

    typeLines.push("export type IconName = ");

    icons.sort().forEach(icon => {
      typeLines.push(`  | "${icon}"`);
    });
  } else {
    typeLines.push("export type IconName = never");
  }

  const spriteExport = `module.exports = require("${path.join(
    config.out || defaultOut,
    "sprite.svg",
  )}");`;
  const generatedType = typeLines.join("\n");

  try {
    await fs.stat(cacheDir);
  } catch (error) {
    await fs.mkdir(cacheDir, { recursive: true });
  }

  await fs.writeFile(path.join(cacheDir, "sprite.js"), spriteExport);
  await fs.writeFile(path.join(cacheDir, "types.ts"), generatedType);

  // if no svg, generate emtpy one and store it in node_modules cache
  // so build doesn't fail
  if (!svg) {
    const svgLines = [];
    svgLines.push(
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`,
    );
    svgLines.push("<defs>");
    svgLines.push("</defs>");
    svgLines.push("</svg>");

    const emptySpriteExport = `module.exports = require("./sprite.svg");`;

    const generatedSvg = svgLines.join("\n");
    await fs.writeFile(path.join(cacheDir, "sprite.svg"), generatedSvg);
    await fs.writeFile(path.join(cacheDir, "sprite.js"), emptySpriteExport);
  }
}

postInstall();
