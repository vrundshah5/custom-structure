---
name: git-worktree
description: Use git worktrees to check out branches in isolated directories without switching. Ideal for code review, parallel development, and PR analysis without disrupting current work.
license: MIT
metadata:
  author: vrund shah
  version: "1.0.0"
  project: "{PROJECT_NAME}"
---

# Git Worktree Skill

Use this skill when you need to inspect, review, or compare a branch without leaving your current working directory. Git worktrees let you check out any branch into a separate folder alongside your main workspace.

## When to Use

- Reviewing a PR branch without stashing or switching branches
- Running parallel builds/tests on different branches simultaneously
- Comparing two branches side-by-side on the file system
- Code review workflows that need isolated branch checkouts

---

## Core Commands

### List all existing worktrees
```bash
git worktree list
```
Output shows: path, commit hash, and branch name for every worktree.

---

### Add a worktree for a branch (already exists locally)
```bash
git worktree add ../<branch-name> <branch-name>
```
Example — check out `feature/clinic-form` next to your current repo:
```bash
git worktree add ../clinic-form-review feature/clinic-form
```

---

### Add a worktree for a remote branch (not yet local)
```bash
git fetch origin <branch-name>
git worktree add ../<branch-name> origin/<branch-name>
```

---

### Remove a worktree when done
```bash
git worktree remove ../<branch-name>
```
Force-remove if the worktree has uncommitted changes:
```bash
git worktree remove --force ../<branch-name>
```
Then prune stale references:
```bash
git worktree prune
```

---

## Code Review Workflow with Worktrees

Use this sequence when reviewing a PR branch:

```bash
# 1. Fetch latest remote state
git fetch origin

# 2. Create a worktree for the PR branch
git worktree add ../review-<branch-name> origin/<branch-name>

# 3. Open the worktree folder and inspect files
cd ../review-<branch-name>

# 4. View commits on this branch vs base (e.g., main)
git log origin/main..<branch-name> --oneline --no-merges

# 5. See the full diff vs base
git diff origin/main...<branch-name>

# 6. When review is done, go back and clean up
cd -
git worktree remove --force ../review-<branch-name>
git worktree prune
```

---

## Viewing Branch Commits

Get all commits on the current branch that are not in `main`:
```bash
git log origin/main..HEAD --oneline --no-merges
```

Get full commit details (author, date, message):
```bash
git log origin/main..HEAD --no-merges --pretty=format:"%h %an %ad %s" --date=short
```

Get files changed in each commit:
```bash
git log origin/main..HEAD --no-merges --name-only --oneline
```

---

## Diff Commands for PR Review

Full diff of all changes vs base branch:
```bash
git diff origin/main...HEAD
```

Diff only for a specific file:
```bash
git diff origin/main...HEAD -- src/app/components/pages/SomePage.tsx
```

Summary of changed files and lines:
```bash
git diff origin/main...HEAD --stat
```

List only the changed file paths:
```bash
git diff origin/main...HEAD --name-only
```

---

## Important Notes

- Each worktree shares the same `.git` directory — branches already checked out in another worktree **cannot** be checked out in a second worktree simultaneously.
- Always run `git worktree prune` after removing worktrees to clean up stale metadata.
- Use `--force` on `git worktree remove` only when you are certain there are no changes worth keeping.
- Worktree paths should be **outside** the current repo directory to avoid confusion (use `../` prefix).
