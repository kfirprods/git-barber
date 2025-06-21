import chalk from "chalk";

export function buildBranchChoices(
  tree,
  branch,
  depth = 0,
  isLast = false,
  choices = []
) {
  const prefix =
    depth === 0 ? "" : "  ".repeat(depth - 1) + (isLast ? "└─ " : "├─ ");

  choices.push({ name: `${prefix}${branch}`, value: branch });

  if (tree[branch]) {
    tree[branch].forEach((child, index) => {
      const isLastChild = index === tree[branch].length - 1;
      buildBranchChoices(tree, child, depth + 1, isLastChild, choices);
    });
  }
  return choices;
}

export function printTree(
  tree,
  baseBranches,
  currentBranch,
  diffMapping = {},
  threshold,
  deletedBranches = []
) {
  function printBranch(branch, depth, isLast = true, prefix = "") {
    let branchName = branch;
    if (deletedBranches.includes(branch)) {
      branchName = chalk.strikethrough(chalk.red(branch));
    } else if (branch === currentBranch) {
      branchName = chalk.bgBlue(branch);
    }

    // add (+300 -100) diff
    if (!baseBranches[branch] && diffMapping[branch]) {
      const diff = diffMapping[branch];
      if (diff) {
        const warning = diff.addedLines > threshold ? "⚠️ " : "";
        const diffStr = `(${warning}${chalk.green(
          "+" + diff.addedLines
        )} ${chalk.red("-" + diff.removedLines)})`;
        branchName = branchName + " " + diffStr;
      }
    }

    if (branch === currentBranch) {
      branchName = branchName + "\t" + chalk.white("👈 you're here");
    }

    // Print the branch with proper tree characters
    console.log(prefix + (isLast ? "└─ " : "├─ ") + branchName);

    if (tree[branch]) {
      const children = tree[branch];
      const childPrefix = prefix + (isLast ? "  " : "│ ");
      children.forEach((child, index) => {
        const isLastChild = index === children.length - 1;
        printBranch(child, depth + 1, isLastChild, childPrefix);
      });
    }
  }

  for (const base in baseBranches) {
    printBranch(base, 0, true, "");
  }
} 