import path from "node:path";
import fs from "node:fs/promises";
import {
  cacheDir,
  getConfig,
  getSpritePath,
  getTypesPath,
  writeFiles,
} from "./util";
import parse from "node-html-parser";

export async function generate(args?: Record<string, string>) {
  const config = await getConfig(args?.config);
  let spritePath = await getSpritePath(args?.out, config);
  const typesPath = await getTypesPath(args?.types, config);
  let isTypescript = false;

  let svg: string | undefined;
  try {
    svg = await fs.readFile(spritePath, {
      encoding: "utf8",
    });
  } catch (e) {} // no file yet

  const typeLines = [];
  let icons = [];

  if (svg) {
    const pattern = /<symbol[\s\S]*?id="(.*?)"[\s\S]*?<\/symbol>/g;

    icons = Array.from(svg.matchAll(pattern), match => match[1]);

    typeLines.push("export type IconName = ");

    icons.sort().forEach(icon => {
      typeLines.push(`  | "${icon}"`);
    });

    // check if this is a typescript project
    const doc = parse(svg);

    const parsedSvg = doc.querySelector("svg");
    isTypescript = parsedSvg?.getAttribute("data-ts") === "true";
  } else {
    typeLines.push("export type IconName = never");
  }

  const generatedType = typeLines.join("\n");
  let generatedSvg;

  // if no svg, generate emtpy one and store it in node_modules cache
  // so build doesn't fail
  if (!svg) {
    const svgLines = [
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" data-ts="${isTypescript}">`,
      `<defs>`,
      `</defs>`,
      `</svg>`,
    ];
    generatedSvg = svgLines.join("\n");

    spritePath = path.join(cacheDir, "sprite.svg");
  }

  try {
    await writeFiles({
      svg: generatedSvg,
      type: generatedType,
      spritePath,
      typePath: isTypescript ? typesPath : undefined,
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
