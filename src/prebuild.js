const fs = require("fs");
const path = require("path");

const directoryPath = path.join(
  process.cwd(),
  "node_modules/.react-icons-svg-sprite",
);
const filePath = path.join(directoryPath, "types.ts");

if (!fs.existsSync(filePath)) {
  fs.mkdirSync(directoryPath, { recursive: true });
  fs.writeFileSync(filePath, 'export type IconName = string;', 'utf-8');
}
