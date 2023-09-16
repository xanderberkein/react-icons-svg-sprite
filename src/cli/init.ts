// this gets triggered if no .svg file is found
// indicating react-icons-svg-sprite should be initialized

import path from "node:path";
import { isTypescriptProject, rootDir } from "./util.js";
import { prompt } from "enquirer";
import fs from "node:fs/promises";

export default async function initialize() {
  // if this is not a Typescript project, no configuration is needed
  // because sprite will be exported to /public and types will be kept internal

  // TODO add welcome message?
  console.log("WELCOME TO REACT ICONS SVG SPRITE");
  const isTypescript = await isTypescriptProject();
  if (!isTypescript) {
    console.log("No SVG sprite detected. Creating new SVG file.");
    return;
  }

  console.log(
    "No SVG sprite found. Typescript detected. Let's set up react-icons!",
  );

  const responses = await prompt<{ typeDir: string; typeName: string }>([
    {
      type: "input",
      name: "typeDir",
      message: "Where would you like us to create your types file?",
      initial: "./types",
      validate(value) {
        if (value.endsWith(".ts")) {
          return `${value} is not a valid directory! You can choose your file name later.`;
        }
        return true;
      },
    },
    {
      type: "select",
      name: "typeName",
      message: "What naming convention do you prefer for your types file?",
      initial: 0,
      choices: [
        { name: "sprite.types.ts" },
        { name: "sprite.ts" },
        { name: "sprite.d.ts" },
      ],
    },
  ]);

  const typePath = path.join(rootDir, responses.typeDir, responses.typeName);
  const defaultType = "export type IconName = never";

  try {
    await fs.stat(path.dirname(typePath));
  } catch (error) {
    await fs.mkdir(path.dirname(typePath), { recursive: true });
  }
  await fs.writeFile(typePath, defaultType);
}
