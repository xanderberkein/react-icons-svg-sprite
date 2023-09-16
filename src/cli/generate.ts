import path from "node:path";
import fs from "node:fs/promises";
import {
  cacheDir,
  getConfig,
  getSpriteDir,
  getTypesPath,
  writeFiles,
} from "./util";
import parse from "node-html-parser";
import { glob } from "glob";

export async function generate(args?: Record<string, string>) {
  const config = await getConfig(args?.config);
  let spritePath = await getSpriteDir(args?.out, config);
  const typesPath = await getTypesPath(args?.types, config);

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

  const typeLines = [];
  let icons = [];

  if (svg) {
    const pattern = /<symbol[\s\S]*?id="(.*?)"[\s\S]*?<\/symbol>/g;

    icons = Array.from(svg.matchAll(pattern), match => match[1]);

    if (icons.length <= 1) {
      typeLines.push("export type IconName = never");
    } else {
      typeLines.push("export type IconName = ");

      icons.sort().forEach(icon => {
        typeLines.push(`  | "${icon}"`);
      });
    }
  } else {
    typeLines.push("export type IconName = never");
  }

  const generatedType = typeLines.join("\n");

  try {
    await writeFiles({
      type: generatedType,
      spritePath,
      typePath: typesPath,
    });
  } catch (e) {
    console.error("Unable to write output files");
    console.error(e);
    process.exit(1);
  }

  console.log("Successfully generated types");
  console.log(`${icons.length} icon(s) in your collection`);

  process.exit();
}
