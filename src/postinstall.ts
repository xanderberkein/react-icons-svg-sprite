#! /usr/bin/env node

import path from "node:path";
import fs from "node:fs/promises";
import { cacheDir, defaultOut, getConfig, rootDir } from "./util";

async function postInstall() {
  const config = getConfig();
  const spritePath = path.join(rootDir, config.out || defaultOut, "sprite.svg");

  let existingSvg: string | undefined;
  try {
    existingSvg = await fs.readFile(spritePath, {
      encoding: "utf8",
    });
  } catch (e) {} // no file yet

  const typeLines = [];

  if (existingSvg) {
    const pattern = /<symbol[\s\S]*?id="(.*?)"[\s\S]*?<\/symbol>/g;

    const icons = Array.from(existingSvg.matchAll(pattern), match => match[1]);

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
