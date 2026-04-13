#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// When npm runs postinstall, cwd is the consuming project's root
// __dirname is node_modules/custom-package/
const sourceDir = path.join(__dirname, "custom-structure");
const projectRoot = path.resolve(__dirname, "../../");

function syncDir(src, dest) {
  let added = 0;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      added += syncDir(path.join(src, item), path.join(dest, item));
    }
  } else {
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      added = 1;
    }
  }
  return added;
}

const targets = [
  { name: ".github/skills",   src: path.join(sourceDir, "skills"),   dest: path.join(projectRoot, ".github", "skills") },
  { name: ".github/agents",   src: path.join(sourceDir, "agents"),   dest: path.join(projectRoot, ".github", "agents") },
  { name: ".vscode/mcp.json", src: path.join(sourceDir, ".vscode"),  dest: path.join(projectRoot, ".vscode") },
];

for (const { name, src, dest } of targets) {
  if (!fs.existsSync(src)) continue;
  try {
    const added = syncDir(src, dest);
    if (added > 0) {
      console.log(`[custom-package] ✓ ${name}: ${added} new file(s) added`);
    } else {
      console.log(`[custom-package] ✓ ${name}: already up to date (no files overwritten)`);
    }
  } catch (err) {
    console.error(`[custom-package] Failed to sync ${name}:`, err.message);
  }
}
