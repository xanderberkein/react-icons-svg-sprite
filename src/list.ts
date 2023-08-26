import fs from "node:fs/promises";
import { getConfig, getSpritePath, symbolPattern } from "./util";

export default async function list(configPath: string) {
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

  const icons = Array.from(svg.matchAll(symbolPattern), match => match[1]);

  console.log("[");
  icons.sort().forEach(icon => {
    console.log(`  '${icon}',`);
  });
  console.log("]");

  process.exit();
}
