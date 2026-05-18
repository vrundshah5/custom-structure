#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");

// Run the interactive setup with inherited stdio so prompts work
try {
  execSync(`node "${path.join(__dirname, "setup.js")}"`, {
    stdio: "inherit",
    cwd: __dirname,
  });
} catch (err) {
  // If interactive mode fails (e.g., CI without TTY), the setup.js
  // already handles fallback to install everything non-interactively.
  if (err.status) process.exit(err.status);
}
