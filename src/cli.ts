#! /usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { Config } from "./config.types";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { renderToString } from "react-dom/server";
import { parse } from "node-html-parser";

import { cancel, intro, outro, select } from "@clack/prompts";

const ICON_LIBRARY_NAME_MAP: Record<string, string> = {
  ai: "Ant Design Icons",
  bi: "Bootstrap Icons",
  bs: "BoxIcons",
  cg: "Circum Icons",
  ci: "css.gg",
  di: "Devicons",
  fa: "Font Awesome 5",
  fa6: "Font Awesome 6",
  fc: "Flat Color Icons",
  fi: "Feather",
  gi: "Game Icons",
  go: "Github Octicons icons",
  gr: "Grommet-Icons",
  hi: "Heroicons",
  hi2: "Heroicons 2",
  im: "IcoMoon Free",
  io: "Ionicons 4",
  io5: "Ionicons 5",
  lia: "Icons8 Line Awesome",
  lu: "Lucide",
  md: "Material Design icons",
  pi: "Phosphor Icons",
  ri: "Remix Icon",
  rx: "Radix Icons",
  si: "Simple Icons",
  sl: "Simple Line Icons",
  tb: "Tabler Icons",
  tfi: "Themify Icons",
  ti: "Typicons",
  vsc: "VS Code Icons",
  wi: "Weather Icons",
} as const;

const DEFAULT_EXPORT = "assets";

type IconMap = Record<string, string[]>;

// examples to test
// GiAbstract082
// LiaAngellist (triple start)
// HiAcademicCap (has double)

let args = process.argv.slice(2);

console.log(args);

// commands
// add
// remove
// list
// generate (to fix types)

type Args = {
  config?: string;
};

type AddArgs = {
  icon?: string;
  lib?: string;
  config?: string;
};

yargs(hideBin(process.argv))
  .command(
    "add [icon]",
    "add svg icon",
    yargs => {
      return yargs.positional("icon", {
        describe: "icon to generate",
      });
    },
    async argv => {
      console.log(argv);
      if (argv.icon) {
        await build(argv as AddArgs);
      }
    },
  )
  .option("lib", {
    alias: "l",
    type: "string",
    description: "Force icon to be from this icon library",
  })
  .option("config", {
    alias: "c",
    type: "string",
    description: "Custom config file",
  })
  .strictCommands()
  .demandCommand(1)
  .parse();

async function build(argv: AddArgs) {
  if (!argv.icon) {
    cancel("Please provide an icon");
    process.exit(0);
  }

  const configPath = path.join(process.cwd(), argv.config || "icons.config.js");

  console.log(configPath);

  let config;
  try {
    config = require(configPath) as Config;
  } catch (e) {
    console.log(e);
    console.log("xd");
  }

  const outputPath = path.join(process.cwd(), config?.out || "");

  const iconMap: IconMap = {};

  // this should only happen on install START (maybe not since it's very performant)

  const reactIconsDir = path.join(process.cwd(), "node_modules/react-icons");
  const reactIconsFolders = (
    await fs.readdir(reactIconsDir, {
      withFileTypes: true,
    })
  )
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(reactIconsFolders);

  await Promise.allSettled(
    reactIconsFolders.map(async folder => {
      const filePath = path.join(reactIconsDir, folder, "index.d.ts");

      const fileContent = await fs.readFile(filePath, "utf-8");

      const regex = /export\s+declare\s+const\s+([A-Za-z0-9_]+):\s+IconType;/g;

      [...fileContent.matchAll(regex)].forEach(([, match]) => {
        if (iconMap[match]) iconMap[match].push(folder);
        else iconMap[match] = [folder];
      });
    }),
  );

  const iconLibs = iconMap[argv.icon];
  let IconComponent;

  if (!iconLibs.length) {
    cancel("Couldn't find this icon");
    process.exit(0);
  }

  if (iconLibs.length === 1) {
    IconComponent = require(`react-icons/${iconLibs[0]}`)[argv.icon];
    console.log(IconComponent);
  } else {
    const selectedLib = await select({
      message: "Two matches for this icon. Pick an icon library.",
      options: iconLibs.map(lib => ({
        value: lib,
        label: ICON_LIBRARY_NAME_MAP[lib] || lib,
      })),
    });
    IconComponent = require(`react-icons/${selectedLib}`)[argv.icon];
  }

  let oldSvg: string | undefined;
  try {
    oldSvg = await fs.readFile(path.join(outputPath, "sprite.svg"), {
      encoding: "utf8",
    });
  } catch (e) {
    console.log("no file yet");
  }

  let oldIcons: string[] = [];
  const svgLines: string[] = [];
  const typeLines: string[] = [];

  svgLines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`,
  );
  svgLines.push("<defs>");
  typeLines.push("export type IconName = ");

  // push old symbols
  if (oldSvg) {
    const oldSvgLines = oldSvg.split("\n");
    svgLines.push(...oldSvgLines.splice(2, oldSvgLines.length - 4));
    const pattern = /<symbol[\s\S]*?id="(.*?)"[\s\S]*?<\/symbol>/g;

    oldIcons = Array.from(oldSvg.matchAll(pattern), match => match[1]);
  }

  // check if old svg has icon already
  // if it has, overwrite
  // if not, add it to oldIcons
  const sameIconIdx = oldIcons.findIndex(icon => icon === argv.icon);
  if (sameIconIdx >= 0) {
    svgLines.splice(sameIconIdx + 2, 1);
  }

  // parse and add new icon
  console.time("renderToString");

  const input = renderToString(IconComponent());
  console.timeEnd("renderToString");

  const doc = parse(input);

  const svg = doc.querySelector("svg");
  if (!svg) throw new Error("No SVG element found");

  svg.tagName = "symbol";
  svg.setAttribute("id", argv.icon);
  svg.removeAttribute("xmlns");
  svg.removeAttribute("xmlns:xlink");
  svg.removeAttribute("version");
  svg.removeAttribute("width");
  svg.removeAttribute("height");

  svgLines.push(`${svg.toString().trim()}`);

  svgLines.push("</defs>");
  svgLines.push("</svg>");

  // generate types
  if (sameIconIdx === -1) {
    oldIcons.push(argv.icon);
  }
  oldIcons.sort().forEach(icon => {
    typeLines.push(`  | "${icon}"`);
  });

  const generatedSvg = svgLines.join("\n");
  const generatedType = typeLines.join("\n");

  const thisPath = path.resolve(__filename);
  console.log(thisPath);

  try {
    await fs.stat(outputPath);
  } catch (error) {
    await fs.mkdir(outputPath, { recursive: true });
  }

  await fs.writeFile(path.join(outputPath, "sprite.svg"), generatedSvg);

  const outputPath2 = path.join(
    process.cwd(),
    "node_modules/.react-icons-svg-sprite",
  );
  try {
    await fs.stat(outputPath2);
  } catch (error) {
    await fs.mkdir(outputPath2, { recursive: true });
  }

  await fs.writeFile(path.join(outputPath2, "types.ts"), generatedType);

  const spriteExport = `module.exports = require("${path.join(
    config?.out || "",
    "sprite.svg",
  )}");`;

  // generate output import
  await fs.writeFile(path.join(outputPath2, "sprite.js"), spriteExport);
}
