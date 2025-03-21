# 🪒 Git Barber CLI

A neat CLI tool for managing structured, nested Git branches.

---

## Installation

Install globally via npm:

```bash
npm install -g git-barber
```

## Usage

### Declare a Base Branch

Creates or declares a base branch with a chosen ancestor (defaulting to your current branch):

```bash
git-barber declare-base <branch>
```

**Example:**

```bash
git-barber declare feature/payment
```

### Create Nested Branches

Interactively creates nested branches based on an existing branch hierarchy. When run without arguments, the CLI will prompt you to select a parent branch and enter a new branch name interactively. Alternatively, you can provide an optional branch name as a positional argument:

```bash
git-barber branch [branchName]
```

- If the given branch name already exists locally, it will be registered as a child of the selected parent branch.
- If it does not exist, the CLI will automatically create the new branch using the chosen parent as its base.

For example:

// Interactively create a new nested branch
git-barber branch

// Create or register branch 'feature/profile-update'
git-barber branch feature/profile-update

After invoking the command, you'll see a visual tree-like structure for choosing the parent branch:

```
baseBranch
  ├── childBranch
  └── anotherChild
      └── grandChild
```

### Sync Branches

Synchronizes changes by merging from a selected ancestor branch down through its descendants:

```bash
git-barber sync
```

Choose your starting branch interactively from an indented tree.

### Delete Branches

Remove selected branch(es) locally. This command presents a multi-select prompt where you can choose the branch(es) to delete.
Only the branch(es) you select will be removed, and the configuration will be updated accordingly.

Usage:

```bash
git-barber delete
```

---

## Example Workflow

1. Declare a base branch:

```bash
git-barber declare feature/user-profile
```

2. Create nested branches interactively:

```bash
git-barber branch
```

3. Sync updates from an ancestor down the hierarchy:

```bash
git-barber sync
```

---

## Configuration

Branch relationships and metadata are stored locally:

- **Windows**: `%APPDATA%\git-barber\config.json`
- **macOS/Linux**: `~/.config/git-barber/config.json`

---

## Handling Merge Conflicts

If conflicts occur during merges, `git-barber` will alert you clearly:

```
Merge conflicts detected. Please resolve manually in your IDE or git client.
```

---

## Dependencies

- [commander.js](https://github.com/tj/commander.js)
- [Inquirer.js](https://github.com/SBoudrias/Inquirer.js)
- [simple-git](https://github.com/steveukx/git-js)
- [chalk](https://github.com/chalk/chalk)

---

Now go manage those branches like a pro, fool! 💪

