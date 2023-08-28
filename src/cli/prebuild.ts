import fs from "fs";
import path from "path";

const directoryPath = path.join(
  process.cwd(),
  "node_modules/.react-icons-svg-sprite",
);
const filePath = path.join(directoryPath, "types.ts");

if (!fs.existsSync(filePath)) {
  fs.mkdirSync(directoryPath, { recursive: true });
  fs.writeFileSync(filePath, "export type IconName = string;", "utf-8");
}
