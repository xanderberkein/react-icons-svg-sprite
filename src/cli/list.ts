import fs from "node:fs/promises";
import { getConfig, getSpriteDir, symbolPattern } from "./util";
import { glob } from "glob";

export default async function list(args: Record<string, string>,) {
  const config = await getConfig(args.config);
  const spritePath = await getSpriteDir(args.out, config);

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
