import simpleGit from "simple-git";
import chalk from "chalk";
import inquirer from "inquirer";

const git = simpleGit();

export function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function shouldIgnoreFile(fileName, ignorePatterns) {
  return ignorePatterns.some((pattern) => {
    if (pattern.includes("*")) {
      const regex = new RegExp(
        "^" + pattern.split("*").map(escapeRegExp).join(".*") + "$"
      );
      return regex.test(fileName);
    } else {
      return fileName === pattern;
    }
  });
}

export async function computeDiffSummary(parent, child, ignorePatterns) {
  try {
    // Get the diff summary between parent and child
    const summary = await git.diffSummary([parent, child]);
    let addedLines = 0;
    let removedLines = 0;
    summary.files.forEach((file) => {
      if (!shouldIgnoreFile(file.file, ignorePatterns)) {
        addedLines += file.insertions;
        removedLines += file.deletions;
      }
    });
    if (addedLines === 0 && removedLines === 0) return null;
    return { addedLines, removedLines };
  } catch (err) {
    return null;
  }
}

export async function getDiffMapping(tree, parent, ignorePatterns, mapping = {}) {
  if (!tree[parent]) return mapping;
  for (const child of tree[parent]) {
    const diff = await computeDiffSummary(parent, child, ignorePatterns);
    mapping[child] = diff;
    await getDiffMapping(tree, child, ignorePatterns, mapping);
  }
  return mapping;
}

export async function calculateDiffMapping(tree, baseBranches, ignorePatterns) {
  let mapping = {};
  for (const base in baseBranches) {
    if (tree[base]) {
      mapping = await getDiffMapping(tree, base, ignorePatterns, mapping);
    }
  }
  return mapping;
}

export async function syncBranches(branchTree, branch) {
  await git.checkout(branch);
  try {
    await git.pull("origin", branch);
  } catch (err) {
    if (err.toString().includes("no tracking information")) {
      console.log(
        chalk.yellow(
          `[WARNING] No tracking information for branch ${branch}. Skipping pull.`
        )
      );
    } else {
      console.log(
        chalk.yellow(
          `[WARNING] Failed to pull branch from remote origin/${branch}: ${err}`
        )
      );
    }
  }

  if (branchTree[branch]) {
    for (const child of branchTree[branch]) {
      await git.checkout(child);
      try {
        await git.merge([
          "--no-ff",
          "-m",
          `Merged ${branch} into ${child}`,
          branch,
        ]);
        console.log(chalk.green(`✅ Merged ${branch} into ${child}`));
        await syncBranches(branchTree, child);
      } catch (err) {
        if (err.message.includes("CONFLICTS")) {
          console.log(chalk.red(`Merge conflicts detected in branch ${child}`));
          console.log(
            chalk.white(
              "💈 ACTION REQUIRED: Please solve the conflicts and commit your changes."
            )
          );

          // Wait for user to hit enter
          await inquirer.prompt([
            {
              type: "input",
              name: "continue",
              message:
                "Press ENTER once you've committed the merge to resume the sync",
            },
          ]);

          // Check if there are still uncommitted changes
          let status = await git.status();
          while (status.files.length > 0) {
            console.log(
              chalk.red(
                "You still have uncommitted changes. Please solve conflicts and commit first."
              )
            );

            // Wait for user to hit enter again
            await inquirer.prompt([
              {
                type: "input",
                name: "continue",
                message:
                  "Press ENTER once you've committed the merge to resume the sync",
              },
            ]);

            status = await git.status();
          }

          // Continue with the sync
          console.log(chalk.green("Continuing sync..."));
          await syncBranches(branchTree, child);
        } else {
          throw err;
        }
      }
    }
  }
}

export { git }; 