import fs from "node:fs/promises";
import {
  getConfig,
  getSpriteDir,
  getTypesPath,
  symbolPattern,
  writeFiles,
} from "./util";
import { glob } from "glob";

export default async function remove(
  icons: string[],
  args: Record<string, string>,
) {
  const config = await getConfig(args.config);
  const spritePath = await getSpriteDir(args.out, config);
  const typePath = await getTypesPath(args.out, config);

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

  const emptyType = "export type IconName = never";

  try {
    await writeFiles({
      svg: generatedSvg,
      type: svgLines.length > 4 ? generatedType : emptyType,
      spritePath,
      typePath,
    });
  } catch (e) {
    console.error("Unable to write output files");
    console.error(e);
    process.exit(1);
  }

  if (removedItems.length) {
    console.log(`Removed: ${removedItems.join(", ")}`);
  } else {
    console.log("No icons removed");
  }

  console.log(`${svgLines.length - 4} icons remaining in your collection`);
  process.exit(0);
}
