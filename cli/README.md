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
git-barber declare <branch>
```

**Example:**

```bash
git-barber declare feature/payment
```

### Create Nested Branches

Interactively creates nested branches based on an existing branch hierarchy:

```bash
git-barber branch
```

You'll see a visual tree-like structure:

```
baseBranch
  ├── childBranch
  └── anotherChild
      └── grandChild
```

Choose the ancestor branch and provide a name for your new branch.

### Sync Branches

Synchronizes changes by merging from a selected ancestor branch down through its descendants:

```bash
git-barber sync
```

Choose your starting branch interactively from an indented tree.

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

