/**
 * Installer Configuration
 * Defines available agents, skills, and their relationships.
 */

module.exports = {
  // Structure options for where to install files
  structures: [
    {
      name: "GitHub Copilot",
      value: "copilot",
      description: ".github/agents/ & .github/skills/",
      agentsDir: ".github/agents",
      skillsDir: ".github/skills",
    },
    {
      name: "Global (Root-level)",
      value: "global",
      description: "agents/ & skills/ at project root — works with Claude, Cursor, etc.",
      agentsDir: "agents",
      skillsDir: "skills",
    },
  ],

  // Available agents with metadata
  agents: [
    {
      name: "Branch Reviewer",
      value: "branch-reviewer",
      file: "branch-reviewer.agent.md",
      description: "Full branch code review with React best-practice rules & HTML report",
      skills: ["react-best-practices", "git-worktree"],
    },
    {
      name: "Code Review",
      value: "codeReview",
      file: "codeReview.agent.md",
      description: "Senior frontend code review agent — React, Next.js, TypeScript",
      skills: ["react-best-practices"],
    },
    {
      name: "Estimation",
      value: "estimation",
      file: "estimation.agent.md",
      description: "Frontend development hour estimation for React/Next.js projects",
      skills: [],
    },
    {
      name: "Pre-Sales Code Audit",
      value: "preSalesCodeAudit",
      file: "preSalesCodeAudit.agent.md",
      description: "Comprehensive code audit with HTML & DOCX report generation",
      skills: ["react-best-practices"],
    },
    {
      name: "Security Audit",
      value: "security",
      file: "security.agent.md",
      description: "React & Next.js security vulnerability scanner",
      skills: ["react-best-practices"],
    },
  ],

  // Available skills with metadata
  skills: [
    {
      name: "React Best Practices",
      value: "react-best-practices",
      folder: "react-best-practices",
      description: "69 React/Next.js performance & quality rules",
    },
    {
      name: "Git Worktree",
      value: "git-worktree",
      folder: "git-worktree",
      description: "Git worktree management skill",
    },
  ],
};
