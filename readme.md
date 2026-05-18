# Custom Package — AI Agent & Skill Installer

Prompt-driven installer that lets each team member choose exactly which AI agents and skills they need.

## Install

```bash
npm install custom-package
```

On install, an interactive wizard will ask:

1. **Structure** — Where to install files:
   - `GitHub Copilot` → `.github/agents/` & `.github/skills/`
   - `Global (Root-level)` → `agents/` & `skills/` at project root (Claude, Cursor, etc.)

2. **Agents** — Multi-select which agents you want:
   - Branch Reviewer
   - Code Review
   - Estimation
   - Pre-Sales Code Audit
   - Security Audit

3. **Skills** — Based on your agent selection, choose which skills to include:
   - React Best Practices (69 rules)
   - Git Worktree

## Re-run Setup

To change your selections later:

```bash
npx custom-package-setup
```

## CI / Non-Interactive

When no TTY is detected (CI pipelines), everything installs automatically to `.github/`.

## Adding New Agents / Skills

Edit `installer.config.js` to register new agents or skills and define their relationships.