#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const config = require("./installer.config");

// ─── Paths ───────────────────────────────────────────────────────────────────
const sourceDir = path.join(__dirname, "custom-structure");

// Determine project root:
// - If inside node_modules → consuming project is 2 levels up
// - If run via npx directly → process.cwd() is the target project
const parentDir = path.basename(path.resolve(__dirname, "../"));
const projectRoot =
  parentDir === "node_modules"
    ? path.resolve(__dirname, "../../")
    : process.cwd();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getProjectName() {
  const pkgPath = path.join(projectRoot, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (pkg.name) return pkg.name;
    } catch {}
  }
  return path.basename(projectRoot);
}

function copyDir(src, dest) {
  let added = 0;
  if (!fs.existsSync(src)) return 0;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      added += copyDir(path.join(src, item), path.join(dest, item));
    }
  } else {
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      if (dest.endsWith(".md")) {
        const content = fs.readFileSync(dest, "utf8");
        if (content.includes("{PROJECT_NAME}")) {
          fs.writeFileSync(
            dest,
            content.replaceAll("{PROJECT_NAME}", PROJECT_NAME),
            "utf8"
          );
        }
      }
      added = 1;
    }
  }
  return added;
}

/**
 * Strip single-line // comments and trailing commas from JSON-like content
 */
function stripJsonComments(text) {
  // Remove single-line comments (// ...)
  text = text.replace(/^\s*\/\/.*$/gm, "");
  // Remove inline trailing comments after values
  text = text.replace(/("|\d|true|false|null|\]|\})\s*\/\/.*$/gm, "$1");
  // Remove trailing commas before } or ]
  text = text.replace(/,\s*([}\]])/g, "$1");
  return text;
}

function mergeMcpJson(src, dest) {
  if (!fs.existsSync(src)) return 0;
  const raw = fs.readFileSync(src, "utf8");
  const source = JSON.parse(stripJsonComments(raw));
  const sourceServers = source.servers || {};
  if (!Object.keys(sourceServers).length) return 0;

  let target = { servers: {} };
  if (fs.existsSync(dest)) {
    try {
      const destRaw = fs.readFileSync(dest, "utf8");
      target = JSON.parse(stripJsonComments(destRaw));
    } catch {}
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

// ─── Interactive Prompts (using readline) ────────────────────────────────────

function createRL() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function clearLine() {
  process.stdout.write("\x1B[2K\x1B[0G");
}

/**
 * Single-select prompt with arrow keys
 */
async function selectPrompt(question, options) {
  return new Promise((resolve) => {
    let selected = 0;

    const render = () => {
      // Move cursor up to redraw
      if (selected >= 0) {
        process.stdout.write(`\x1B[${options.length}A`);
      }
      options.forEach((opt, i) => {
        const prefix = i === selected ? "\x1B[36m❯\x1B[0m" : " ";
        const label =
          i === selected
            ? `\x1B[36m${opt.name}\x1B[0m`
            : opt.name;
        const desc = opt.description ? ` \x1B[90m(${opt.description})\x1B[0m` : "";
        process.stdout.write(`\x1B[2K  ${prefix} ${label}${desc}\n`);
      });
    };

    console.log(`\n\x1B[1m${question}\x1B[0m\n\x1B[90m(Use arrow keys to select, Enter to confirm)\x1B[0m\n`);
    // Initial render
    options.forEach((opt, i) => {
      const prefix = i === selected ? "\x1B[36m❯\x1B[0m" : " ";
      const label =
        i === selected ? `\x1B[36m${opt.name}\x1B[0m` : opt.name;
      const desc = opt.description ? ` \x1B[90m(${opt.description})\x1B[0m` : "";
      process.stdout.write(`  ${prefix} ${label}${desc}\n`);
    });

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const onKey = (key) => {
      if (key === "\u001B[A") {
        // Up
        selected = selected > 0 ? selected - 1 : options.length - 1;
        render();
      } else if (key === "\u001B[B") {
        // Down
        selected = selected < options.length - 1 ? selected + 1 : 0;
        render();
      } else if (key === "\r" || key === "\n") {
        // Enter
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onKey);
        console.log(
          `\n  \x1B[32m✔\x1B[0m Selected: \x1B[1m${options[selected].name}\x1B[0m\n`
        );
        resolve(options[selected]);
      } else if (key === "\u0003") {
        // Ctrl+C
        process.stdin.setRawMode(false);
        process.exit(0);
      }
    };

    process.stdin.on("data", onKey);
  });
}

/**
 * Multi-select prompt with arrow keys and space to toggle
 */
async function multiSelectPrompt(question, options) {
  return new Promise((resolve) => {
    let cursor = 0;
    const checked = new Set();
    // Pre-select all by default
    options.forEach((_, i) => checked.add(i));

    const render = () => {
      process.stdout.write(`\x1B[${options.length}A`);
      options.forEach((opt, i) => {
        const pointer = i === cursor ? "\x1B[36m❯\x1B[0m" : " ";
        const check = checked.has(i) ? "\x1B[32m◉\x1B[0m" : "○";
        const label =
          i === cursor ? `\x1B[36m${opt.name}\x1B[0m` : opt.name;
        const desc = opt.description
          ? ` \x1B[90m— ${opt.description}\x1B[0m`
          : "";
        process.stdout.write(`\x1B[2K  ${pointer} ${check} ${label}${desc}\n`);
      });
    };

    console.log(
      `\n\x1B[1m${question}\x1B[0m\n\x1B[90m(↑↓ navigate, Space toggle, A toggle all, Enter confirm)\x1B[0m\n`
    );
    // Initial render
    options.forEach((opt, i) => {
      const pointer = i === cursor ? "\x1B[36m❯\x1B[0m" : " ";
      const check = checked.has(i) ? "\x1B[32m◉\x1B[0m" : "○";
      const label =
        i === cursor ? `\x1B[36m${opt.name}\x1B[0m` : opt.name;
      const desc = opt.description
        ? ` \x1B[90m— ${opt.description}\x1B[0m`
        : "";
      process.stdout.write(`  ${pointer} ${check} ${label}${desc}\n`);
    });

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const onKey = (key) => {
      if (key === "\u001B[A") {
        cursor = cursor > 0 ? cursor - 1 : options.length - 1;
        render();
      } else if (key === "\u001B[B") {
        cursor = cursor < options.length - 1 ? cursor + 1 : 0;
        render();
      } else if (key === " ") {
        if (checked.has(cursor)) checked.delete(cursor);
        else checked.add(cursor);
        render();
      } else if (key === "a" || key === "A") {
        if (checked.size === options.length) checked.clear();
        else options.forEach((_, i) => checked.add(i));
        render();
      } else if (key === "\r" || key === "\n") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onKey);
        const selected = options.filter((_, i) => checked.has(i));
        const names = selected.map((s) => s.name).join(", ");
        console.log(
          `\n  \x1B[32m✔\x1B[0m Selected: \x1B[1m${names || "None"}\x1B[0m\n`
        );
        resolve(selected);
      } else if (key === "\u0003") {
        process.stdin.setRawMode(false);
        process.exit(0);
      }
    };

    process.stdin.on("data", onKey);
  });
}

// ─── Install Logic ───────────────────────────────────────────────────────────

function installAgents(agents, destDir) {
  const srcDir = path.join(sourceDir, "agents");
  const dest = path.join(projectRoot, destDir);
  let total = 0;

  for (const agent of agents) {
    const src = path.join(srcDir, agent.file);
    const destFile = path.join(dest, agent.file);
    if (fs.existsSync(src)) {
      total += copyDir(src, destFile);
    }
  }
  return total;
}

function installSkills(skills, destDir) {
  const srcDir = path.join(sourceDir, "skills");
  let total = 0;

  for (const skill of skills) {
    const src = path.join(srcDir, skill.folder);
    const dest = path.join(projectRoot, destDir, skill.folder);
    if (fs.existsSync(src)) {
      total += copyDir(src, dest);
    }
  }
  return total;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const PROJECT_NAME = getProjectName();

async function main() {
  const isInteractive = process.stdin.isTTY;

  console.log("\n\x1B[1m╭──────────────────────────────────────────╮\x1B[0m");
  console.log("\x1B[1m│   📦  Custom Package — Setup Wizard      │\x1B[0m");
  console.log("\x1B[1m╰──────────────────────────────────────────╯\x1B[0m");
  console.log(`\n  Project: \x1B[1m${PROJECT_NAME}\x1B[0m`);

  if (!isInteractive) {
    // Non-interactive mode (CI) — install everything to .github/
    console.log("\n  \x1B[33m⚠ Non-interactive mode detected. Installing all agents & skills to .github/\x1B[0m\n");
    const agentCount = installAgents(config.agents, ".github/agents");
    const allSkills = config.skills;
    const skillCount = installSkills(allSkills, ".github/skills");
    const mcpCount = mergeMcpJson(
      path.join(sourceDir, ".vscode", "mcp.json"),
      path.join(projectRoot, ".vscode", "mcp.json")
    );
    printSummary(agentCount, skillCount, mcpCount);
    return;
  }

  // ─── Step 1: Structure Selection ─────────────────────────────────────────
  const structure = await selectPrompt(
    "Where should agents & skills be installed?",
    config.structures
  );

  // ─── Step 2: Agent Selection (multi-select) ──────────────────────────────
  const selectedAgents = await multiSelectPrompt(
    "Which agents do you want to install?",
    config.agents
  );

  if (selectedAgents.length === 0) {
    console.log("  \x1B[33m⚠ No agents selected. Nothing to install.\x1B[0m\n");
    return;
  }

  // ─── Step 3: Determine & confirm skills ──────────────────────────────────
  // Collect skills required by selected agents
  const requiredSkillValues = new Set();
  for (const agent of selectedAgents) {
    for (const skill of agent.skills) {
      requiredSkillValues.add(skill);
    }
  }

  const availableSkills = config.skills.filter((s) =>
    requiredSkillValues.has(s.value)
  );

  let selectedSkills = [];
  if (availableSkills.length > 0) {
    selectedSkills = await multiSelectPrompt(
      "Which skills do you want to install? (based on selected agents)",
      availableSkills
    );
  }

  // ─── Step 4: Install ─────────────────────────────────────────────────────
  console.log("\n\x1B[1m  Installing...\x1B[0m\n");

  const agentCount = installAgents(selectedAgents, structure.agentsDir);
  const skillCount = installSkills(selectedSkills, structure.skillsDir);

  // Always merge MCP config to .vscode/
  const mcpCount = mergeMcpJson(
    path.join(sourceDir, ".vscode", "mcp.json"),
    path.join(projectRoot, ".vscode", "mcp.json")
  );

  printSummary(agentCount, skillCount, mcpCount);
}

function printSummary(agentCount, skillCount, mcpCount) {
  console.log("\x1B[1m  ┌─────────────────────────────────────┐\x1B[0m");
  console.log("\x1B[1m  │         Installation Summary         │\x1B[0m");
  console.log("\x1B[1m  ├─────────────────────────────────────┤\x1B[0m");
  console.log(
    `  │  Agents:  ${agentCount > 0 ? "\x1B[32m" + agentCount + " file(s) added\x1B[0m" : "already up to date"}`.padEnd(52) + "│"
  );
  console.log(
    `  │  Skills:  ${skillCount > 0 ? "\x1B[32m" + skillCount + " file(s) added\x1B[0m" : "already up to date"}`.padEnd(52) + "│"
  );
  console.log(
    `  │  MCP:     ${mcpCount > 0 ? "\x1B[32m" + mcpCount + " server(s) added\x1B[0m" : "already up to date"}`.padEnd(52) + "│"
  );
  console.log("\x1B[1m  └─────────────────────────────────────┘\x1B[0m\n");
}

main().catch((err) => {
  console.error("\x1B[31m[custom-package] Setup failed:\x1B[0m", err.message);
  process.exit(1);
});
