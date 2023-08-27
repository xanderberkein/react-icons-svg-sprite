import fs from "node:fs/promises";
import path from "node:path";
import { cacheDir, getConfig, getSpritePath, symbolPattern } from "./util";

export default async function remove(icons: string[], configPath: string) {
  const config = getConfig(configPath);
  const spritePath = getSpritePath(config);

  let svg: string | undefined;
  try {
    svg = await fs.readFile(spritePath, {
      encoding: "utf8",
    });
  } catch (e) {} // no file yet

  if (!svg) {
    console.log(`No svg found at output directory (${spritePath})`);
    process.exit();
  }

  const svgLines = svg.split("\n");
  const typeLines: string[] = [];
  const removedItems: string[] = [];

  typeLines.push("export type IconName = ");

  const allIcons = Array.from(svg.matchAll(symbolPattern), match => match[1]);
  allIcons.forEach((icon, idx) => {
    if (icons.includes(icon)) {
      svgLines.splice(idx + 2, 1);
      removedItems.push(icon);
    } else {
      typeLines.push(`  | "${icon}"`);
    }
  });

  const generatedSvg = svgLines.join("\n");
  const generatedType = typeLines.join("\n");

  // todo createoutput path if not exists?
  await fs.writeFile(spritePath, generatedSvg);

  // no icons left
  if (svgLines.length === 4) {
    const emptyType = "export type IconName = never";
    await fs.writeFile(path.join(cacheDir, "types.ts"), emptyType);
  } else {
    await fs.writeFile(path.join(cacheDir, "types.ts"), generatedType);
  }

  if (removedItems.length) {
    console.log(`Removed: ${removedItems.join(", ")}`);
  } else {
    console.log("No icons removed");
  }

  console.log(`${svgLines.length - 4} icons remaining in your collection`);
}
