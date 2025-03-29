# 💈 Git Barber CLI

A neat CLI tool for managing structured, nested Git branches.

---

## Installation

Install globally via npm:

```bash
npm install -g git-barber
```

## Usage

### Declare a Base Branch

Declares a base branch, e.g. `feature/paymentsBaseBranch`. You may optionally specify the branch name, otherwise the CLI will prompt you to type one.
If the specified branch does not exist, it will be created, so you can use this both with existing branches and new ones.

```bash
git-barber declare-base <branch>
```

**Example:**

```bash
git-barber declare-base feature/paymentsBaseBranch
```

### Status - List all branches

Shows a tree-list of all declared branches, including the estimated PR size for each one.

```bash
git-barber status
```

**Example output:**
```
Current Branch Tree:
feature/analyticsDashboardOverview/baseBranch
  feature/analyticsDashboardOverview/topRoomDetailsBox (+162 -155)
    feature/analyticsDashboardOverview/mostVisitedTabs (+419 -44)
      feature/analyticsDashboardOverview/crmInsights (+290 -78)
        feature/analyticsDashboardOverview/crmInsights-2 (+262 -73)	👈 you're here
          feature/analyticsDashboardOverview/tooltips (+61 -10)
```

### Checkout one of the branches

Though you can just use normal `git checkout`, this command will show you an interactive tree-list of your branches for a better experience.

```bash
git-barber checkout
```

### Create Nested Branches

Interactively creates nested branches based on an existing branch hierarchy. When run without arguments, the CLI will prompt you to select a parent branch and enter a new branch name interactively. Alternatively, you can provide an optional branch name as a positional argument:

```bash
git-barber branch [branchName]
```

- If the given branch name already exists locally, it will be registered as a child of the selected parent branch.
- If it does not exist, the CLI will automatically create the new branch using the chosen parent as its base.

For example:

#### Interactively create a new nested branch (you will be prompted for the input)
```bash
git-barber branch
```

#### Create / register existing branch as a child:
```bash
git-barber branch feature/paymentsPaypal
```

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

**Example output:**
```bash
✔ Select branch to start sync from: 
dev (ancestor of feature/analyticsDashboardOverview/baseBranch)

✅ Merged dev into feature/analyticsDashboardOverview/baseBranch

✅ Merged feature/analyticsDashboardOverview/baseBranch into feature/analyticsDashboardOverview/topRoomDetailsBox

✅ Merged feature/analyticsDashboardOverview/topRoomDetailsBox into feature/analyticsDashboardOverview/mostVisitedTabs

✅ Merged feature/analyticsDashboardOverview/mostVisitedTabs into feature/analyticsDashboardOverview/crmInsights

✅ Merged feature/analyticsDashboardOverview/crmInsights into feature/analyticsDashboardOverview/crmInsights-2

✅ Merged feature/analyticsDashboardOverview/crmInsights-2 into feature/analyticsDashboardOverview/tooltips

Sync complete!
```

Choose your starting branch interactively from an indented tree.

This addresses one of the biggest pain points of "base branches" - merging an ancestor to its descendants.

### Delete Branches

Remove selected branch(es) locally. This command presents a multi-select prompt where you can choose the branch(es) to delete.
Only the branch(es) you select will be removed, and the configuration will be updated accordingly.

Usage:

```bash
git-barber delete
```

Use this to clear up the clutter of branches that you've already merged.

### Config

Shows an interactive configuration menu for the:
- large diff threshold: how many added lines for a single branch warrant a warning?
- ignore patterns: patterns of files to exclude from the diff calculation, e.g. images, videos, etc.

```bash
git-barber config
```

### Reset Bases

Deletes the configuration file that contains data about your branches. 
Use this when you need to start fresh.

```bash
git-barber reset-bases
```

