import fs from "fs";
import path from "path";

const directoryPath = path.join(
  process.cwd(),
  "node_modules/.react-icons-svg-sprite",
);
const typesPath = path.join(directoryPath, "types.ts");
const iconPath = path.join(directoryPath, "icon.js");

if (!fs.existsSync(typesPath)) {
  fs.mkdirSync(directoryPath, { recursive: true });
  fs.writeFileSync(typesPath, "export type IconName = string;", "utf-8");
}
if (!fs.existsSync(iconPath)) {
  fs.mkdirSync(directoryPath, { recursive: true });
  fs.writeFileSync(iconPath, "export default function Icon(){ return(null); }");
}
