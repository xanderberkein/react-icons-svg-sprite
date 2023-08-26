#! /usr/bin/env node

import path from "node:path";
import fs from "node:fs/promises";
import {
  cacheDir,
  defaultOut,
  getConfig,
  getSpritePath,
  rootDir,
} from "./util";

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

  await fs.writeFile(path.join(cacheDir, "sprite.js"), spriteExport);
  await fs.writeFile(path.join(cacheDir, "types.ts"), generatedType);
}

postInstall();