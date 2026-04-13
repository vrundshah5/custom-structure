#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// When npm runs postinstall, cwd is the consuming project's root
// __dirname is node_modules/custom-package/
const packageSkillsDir = path.join(__dirname, "skills");
const projectRoot = path.resolve(__dirname, "../../");
const targetSkillsDir = path.join(projectRoot, "skills");

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    // Don't overwrite existing files — user may have customized them
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
    }
  }
}

try {
  copyRecursive(packageSkillsDir, targetSkillsDir);
  console.log("[custom-package] ✓ Skills copied to your project's /skills folder");
} catch (err) {
  console.error("[custom-package] Failed to copy skills:", err.message);
}
