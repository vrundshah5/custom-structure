#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// When npm runs postinstall, cwd is the consuming project's root
// __dirname is node_modules/custom-package/
const sourceDir = path.join(__dirname, "custom-structure");
const projectRoot = path.resolve(__dirname, "../../");

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

const targets = [
  { name: ".github/skills",   src: path.join(sourceDir, "skills"),   dest: path.join(projectRoot, ".github", "skills") },
  { name: ".github/agents",   src: path.join(sourceDir, "agents"),   dest: path.join(projectRoot, ".github", "agents") },
  { name: ".vscode/mcp.json", src: path.join(sourceDir, ".vscode"),  dest: path.join(projectRoot, ".vscode") },
];

for (const { name, src, dest } of targets) {
  if (!fs.existsSync(src)) continue;
  try {
    copyRecursive(src, dest);
    console.log(`[custom-package] ✓ ${name} copied to your project`);
  } catch (err) {
    console.error(`[custom-package] Failed to copy ${name}:`, err.message);
  }
}
