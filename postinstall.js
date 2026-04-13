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

function mergeMcpJson(src, dest) {
  const source = JSON.parse(fs.readFileSync(src, "utf8"));
  const sourceServers = source.servers || {};

  if (!Object.keys(sourceServers).length) {
    return 0; // nothing to merge
  }

  let target = { servers: {} };
  if (fs.existsSync(dest)) {
    try { target = JSON.parse(fs.readFileSync(dest, "utf8")); } catch {}
  } else {
    if (!fs.existsSync(path.dirname(dest))) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
    }
  }
  if (!target.servers) target.servers = {};

  let added = 0;
  for (const [key, value] of Object.entries(sourceServers)) {
    if (!target.servers[key]) {
      target.servers[key] = value;
      added++;
    }
  }

  if (added > 0) {
    fs.writeFileSync(dest, JSON.stringify(target, null, 2) + "\n", "utf8");
  }
  return added;
}

const targets = [
  { name: ".github/skills",   src: path.join(sourceDir, "skills"),  dest: path.join(projectRoot, ".github", "skills"), merge: false },
  { name: ".github/agents",   src: path.join(sourceDir, "agents"),  dest: path.join(projectRoot, ".github", "agents"), merge: false },
  { name: ".vscode/mcp.json", src: path.join(sourceDir, ".vscode", "mcp.json"), dest: path.join(projectRoot, ".vscode", "mcp.json"), merge: true },
];

for (const { name, src, dest, merge } of targets) {
  if (!fs.existsSync(src)) continue;
  try {
    const added = merge ? mergeMcpJson(src, dest) : syncDir(src, dest);
    if (added > 0) {
      console.log(`[custom-package] ✓ ${name}: ${added} new ${merge ? "server(s)" : "file(s)"} added`);
    } else {
      console.log(`[custom-package] ✓ ${name}: already up to date`);
    }
  } catch (err) {
    console.error(`[custom-package] Failed to sync ${name}:`, err.message);
  }
}
