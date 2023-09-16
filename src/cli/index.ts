#!/usr/bin/env node

import yargsParser from "yargs-parser";

import list from "./list.js";
import remove from "./remove.js";
import add from "./add.js";
import { generate } from "./generate.js";

const helpText = `react-icons-svg-sprite

Usage:
  react-icons <command>

Commands:
  react-icons add [icons]    [options]
  react-icons list           [options]
  react-icons remove [icons] [options]
  react-icons generate       [options]

Options:
  --help, -h        Print this help message
  --version, -v     Print the CLI version

  --config, -c      Path to config file
  --out, -o         Output file of the generated svg
  --lib, -l         Default library to use when icon is available in multiple icon libraries
  --types, -t         Output file of the generated types
`;

export const argv = yargsParser(process.argv.slice(2), {
  string: ["config", "out", "lib", "types", ],
  boolean: ["version", "help"],
  alias: {
    config: ["c"],
    out: ["o"],
    help: ["h"],
    version: ["v"],
    lib: ["l"],
    types: ["t"],
  },
});

const [command, ...icons] = argv._;

if (argv.version || argv.v) {
  const packageJson = require("../../package.json");
  console.log(packageJson.version);
  process.exit();
}

if (argv.help) {
  console.log(helpText);
  process.exit();
}

if (command === "add") {
  add(icons.map(String), argv);
}

if (command === "list") {
  list(argv);
}

if (command === "remove") {
  remove(icons.map(String), argv);
}

if (command === "generate") {
  generate(argv);
}
