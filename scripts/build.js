const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sourceDirectory = path.join(__dirname, "..", "src");
const sourceFiles = [];

const collectJavaScriptFiles = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      collectJavaScriptFiles(entryPath);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      sourceFiles.push(entryPath);
    }
  }
};

collectJavaScriptFiles(sourceDirectory);
sourceFiles.sort();

for (const filePath of sourceFiles) {
  new vm.Script(fs.readFileSync(filePath, "utf8"), {
    filename: filePath,
  });
}

console.log(`Syntax check passed for ${sourceFiles.length} JavaScript files.`);
