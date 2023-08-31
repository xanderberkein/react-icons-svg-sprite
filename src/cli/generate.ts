import path from "node:path";
import fs from "node:fs/promises";
import { cacheDir, getConfig, getSpritePath, writeFiles } from "./util";

export async function generate(args?: Record<string, string>) {
  const config = await getConfig(args?.config);
  let spritePath = getSpritePath(args?.out, config);

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
  } else {
    typeLines.push("export type IconName = never");
  }

  const generatedType = typeLines.join("\n");
  let generatedSvg;

  // if no svg, generate emtpy one and store it in node_modules cache
  // so build doesn't fail
  if (!svg) {
    const svgLines = [
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`,
      `<defs>`,
      `</defs>`,
      `</svg>`,
    ];
    generatedSvg = svgLines.join("\n");

    spritePath = path.join(cacheDir, "sprite.svg");
  }

  try {
    await writeFiles({ svg: generatedSvg, type: generatedType, spritePath });
  } catch (e) {
    console.error("Unable to write output files");
    console.error(e);
    process.exit(1);
  }

  console.log("Successfully generated types");
  console.log(`${icons.length} icon(s) in your collection`);

  process.exit();
}
