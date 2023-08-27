#! /usr/bin/env node

import yargsParser from "yargs-parser";

import { packageJson } from "./util";
import list from "./list";
import remove from "./remove";
import add from "./add";

const argv = yargsParser(process.argv.slice(2), {
  string: ["config", "out"],
  boolean: ["version", "help"],
  alias: {
    config: ["c"],
  },
});

const [command, ...icons] = argv._;

if (argv.version || argv.v) {
  console.log(require(packageJson).version);
  process.exit();
}

if (!command && argv.help) {
  console.log("react-icons <command>");
  console.log(" ");
  console.log("Commands:");
  console.log(`  react-icons add [icons]    [options]`);
  console.log(`  react-icons list           [options]`);
  console.log(`  react-icons remove [icons] [options]`);
  console.log("");
  console.log("Options:");
  console.log("  --config, -c     Path to config file");
  console.log("  --help");
  // console.log("  -lib, -l        Force this library when adding icons");
}

if (command === "add") {
  add(icons.map(String), argv.config);
}

if (command === "list") {
  list(argv.config);
}

if (command === "remove") {
  remove(icons.map(String), argv.config);
}
