#!/usr/bin/env node

// npm suppresses interactive stdin during postinstall, so we just show
// a message telling the user to run the setup wizard manually.

try {
  const parentDir = require("path").basename(require("path").resolve(__dirname, "../"));

  // Only show the message when installed inside a real project's node_modules
  if (parentDir === "node_modules") {
    console.log("");
    console.log("  \x1B[1m╭──────────────────────────────────────────────────────╮\x1B[0m");
    console.log("  \x1B[1m│  📦  Custom Package installed successfully!          │\x1B[0m");
    console.log("  \x1B[1m├──────────────────────────────────────────────────────┤\x1B[0m");
    console.log("  \x1B[1m│                                                      │\x1B[0m");
    console.log("  \x1B[1m│  Run the setup wizard to choose agents & skills:     │\x1B[0m");
    console.log("  \x1B[1m│                                                      │\x1B[0m");
    console.log("  \x1B[1m│    \x1B[36mnpx custom-package-setup\x1B[0m\x1B[1m                          │\x1B[0m");
    console.log("  \x1B[1m│                                                      │\x1B[0m");
    console.log("  \x1B[1m╰──────────────────────────────────────────────────────╯\x1B[0m");
    console.log("");
  }
} catch (e) {
  // Never let postinstall fail — it would prevent package installation
}
