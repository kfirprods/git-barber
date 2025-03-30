#!/usr/bin/env node

import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import fs from "fs-extra";
import os from "os";
import path from "path";
import simpleGit from "simple-git";

const git = simpleGit();

// Custom prompt wrapper for graceful ctrl+c handling
const originalPrompt = inquirer.prompt;
inquirer.prompt = async (...args) => {
  try {
    return await originalPrompt(...args);
  } catch (error) {
    if (error && error.message && error.message.includes("force closed")) {
      console.log("💈 no problem, see you soon!");
      process.exit(0);
    }
    throw error;
  }
};

async function getSharedConfigPath() {
  let repoRoot;
  try {
    repoRoot = await git.revparse(["--show-toplevel"]);
    repoRoot = repoRoot.trim();
  } catch (err) {
    console.error(
      "Error: Unable to determine repository root. Please run inside a git repository."
    );
    process.exit(1);
  }
  return {
    teamConfigPath: path.join(repoRoot, ".git-barber", "team-config.json"),
  };
}

async function getPersonalConfigPath() {
  let repoRoot;
  try {
    repoRoot = await git.revparse(["--show-toplevel"]);
    repoRoot = repoRoot.trim();
  } catch (err) {
    console.error(
      "Error: Unable to determine repository root. Please run inside a git repository."
    );
    process.exit(1);
  }
  return {
    personalConfigPath: path.join(
      repoRoot,
      ".git-barber",
      "my-basebranches.json"
    ),
  };
}

async function ensureSharedConfig() {
  const { teamConfigPath } = await getSharedConfigPath();
  // Ensure the directory exists
  await fs.ensureDir(path.dirname(teamConfigPath));
  if (!(await fs.pathExists(teamConfigPath))) {
    await fs.writeJson(
      teamConfigPath,
      {
        ignorePatterns: [
          "package.json",
          "package-lock.json",
          "*.svg",
          "*.png",
          "*.jpg",
          "*.mp4",
        ],
        largeDiffThreshold: 600,
      },
      { spaces: 2 }
    );
  }
}

async function ensurePersonalConfig() {
  const { personalConfigPath } = await getPersonalConfigPath();
  if (!(await fs.pathExists(personalConfigPath))) {
    await fs.writeJson(
      personalConfigPath,
      {
        baseBranches: {},
        branchTree: {},
        ancestors: {},
      },
      { spaces: 2 }
    );
  }
}

async function getSharedConfig() {
  await ensureSharedConfig();
  const { teamConfigPath } = await getSharedConfigPath();
  return fs.readJson(teamConfigPath);
}

async function getPersonalConfig() {
  const { personalConfigPath } = await getPersonalConfigPath();
  return fs.readJson(personalConfigPath);
}

async function saveSharedConfig(config) {
  const { teamConfigPath } = await getSharedConfigPath();
  await fs.writeJson(teamConfigPath, config, { spaces: 2 });
}

async function savePersonalConfig(config) {
  const { personalConfigPath } = await getPersonalConfigPath();
  await fs.writeJson(personalConfigPath, config, { spaces: 2 });
}

function buildBranchChoices(tree, branch, depth = 0, choices = []) {
  choices.push({ name: `${"  ".repeat(depth)}${branch}`, value: branch });
  if (tree[branch]) {
    tree[branch].forEach((child) =>
      buildBranchChoices(tree, child, depth + 1, choices)
    );
  }
  return choices;
}

async function syncBranches(branchTree, branch) {
  await git.checkout(branch);
  try {
    await git.pull("origin", branch);
  } catch (err) {
    console.log(
      chalk.yellow(
        `[WARNING] Failed to pull branch from remote origin/${branch}: ${err}`
      )
    );
  }

  if (branchTree[branch]) {
    for (const child of branchTree[branch]) {
      await git.checkout(child);
      await git.merge([
        "--no-ff",
        "-m",
        `Merged ${branch} into ${child}`,
        branch,
      ]);
      console.log(chalk.green(`✅ Merged ${branch} into ${child}`));
      await syncBranches(branchTree, child);
    }
  }
}

function printTree(
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

// Insert helper functions for computing diff summaries
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shouldIgnoreFile(fileName, ignorePatterns) {
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

async function computeDiffSummary(parent, child, ignorePatterns) {
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

async function getDiffMapping(tree, parent, ignorePatterns, mapping = {}) {
  if (!tree[parent]) return mapping;
  for (const child of tree[parent]) {
    const diff = await computeDiffSummary(parent, child, ignorePatterns);
    mapping[child] = diff;
    await getDiffMapping(tree, child, ignorePatterns, mapping);
  }
  return mapping;
}

async function calculateDiffMapping(tree, baseBranches, ignorePatterns) {
  let mapping = {};
  for (const base in baseBranches) {
    if (tree[base]) {
      mapping = await getDiffMapping(tree, base, ignorePatterns, mapping);
    }
  }
  return mapping;
}

const program = new Command();

// Initialize the program
async function initialize() {
  try {
    await ensurePersonalConfig();
  } catch (err) {
    console.error(chalk.red("Failed to initialize personal config:", err));
    process.exit(1);
  }
}

// Initialize before parsing commands
initialize()
  .then(() => {
    program
      .name("git-barber")
      .description(
        chalk.blueBright("💈 CLI tool to neatly manage base branches")
      )
      .version("1.0.0");

    program
      .command("declare-base <branch>")
      .description("Declare a new base branch (creates if not exists)")
      .action(async (branch) => {
        const config = await getPersonalConfig();

        if (!config.baseBranches[branch]) {
          const currentBranch = (await git.branch()).current;

          const { ancestor } = await inquirer.prompt([
            {
              type: "input",
              name: "ancestor",
              message: `Enter ancestor branch for ${branch}:`,
              default: currentBranch,
            },
          ]);

          config.baseBranches[branch] = true;
          config.branchTree[branch] = [];
          config.ancestors[branch] = ancestor;
          await savePersonalConfig(config);

          console.log(
            chalk.green(
              `Declared base branch: ${branch} with ancestor: ${ancestor}`
            )
          );

          const branches = await git.branchLocal();
          if (!branches.all.includes(branch)) {
            await git.checkoutBranch(branch, ancestor);
            console.log(
              chalk.green(`Created new branch: ${branch} from ${ancestor}`)
            );
          }
        } else {
          console.log(
            chalk.yellow(`Branch already declared as base: ${branch}`)
          );
        }
      });

    program
      .command("branch [branchName]")
      .description("Interactively create a nested branch from base branches")
      .action(async (providedBranch) => {
        const status = await git.status();
        if (status.files.length > 0) {
          console.log(
            chalk.red(
              "⛔️ You have unstaged changes. Please commit or stash your changes before proceeding."
            )
          );
          process.exit(1);
        }
        const config = await getPersonalConfig();

        const baseBranchNames = Object.keys(config.baseBranches);
        if (!baseBranchNames.length) {
          console.log(chalk.red("No base branches declared yet."));
          return;
        }

        let selectedBase;
        if (baseBranchNames.length === 1) {
          selectedBase = baseBranchNames[0];
          console.log(
            chalk.green(
              `Only one base branch found: ${selectedBase}. Automatically selecting it.`
            )
          );
        } else {
          const answer = await inquirer.prompt([
            {
              type: "list",
              name: "selectedBase",
              message: "Select base branch:",
              choices: baseBranchNames,
            },
          ]);
          selectedBase = answer.selectedBase;
        }

        const treeChoices = buildBranchChoices(config.branchTree, selectedBase);
        const questions = [
          {
            type: "list",
            name: "parentBranch",
            message: "Select ancestor branch:",
            choices: treeChoices,
            default: treeChoices[treeChoices.length - 1].value,
          },
        ];

        if (!providedBranch) {
          questions.push({
            type: "input",
            name: "newBranch",
            message: "Enter new branch name:",
          });
        }

        const answers = await inquirer.prompt(questions);
        const branchName = providedBranch || answers.newBranch;

        if (providedBranch) {
          const localBranches = (await git.branchLocal()).all;
          if (localBranches.includes(branchName)) {
            console.log(
              chalk.green(
                `Registering existing branch ${branchName} as a nested branch of ${answers.parentBranch}`
              )
            );
          } else {
            await git.checkout(answers.parentBranch);
            await git.checkoutBranch(branchName, answers.parentBranch);
            console.log(
              chalk.green(
                `Created new branch ${branchName} from ${answers.parentBranch}`
              )
            );
          }
        } else {
          await git.checkout(answers.parentBranch);
          await git.checkoutBranch(branchName, answers.parentBranch);
          console.log(
            chalk.green(
              `Created nested branch ${branchName} from ${answers.parentBranch}`
            )
          );
        }

        if (!config.branchTree[answers.parentBranch])
          config.branchTree[answers.parentBranch] = [];
        if (!config.branchTree[answers.parentBranch].includes(branchName))
          config.branchTree[answers.parentBranch].push(branchName);
        await savePersonalConfig(config);

        // Print the updated branch tree with the new branch highlighted
        console.log(chalk.blueBright("\nUpdated Branch Tree:"));
        printTree(
          config.branchTree,
          config.baseBranches,
          branchName, // Highlight the new branch
          {}, // No diff mapping needed for new branch
          600, // Default threshold
          [] // No deleted branches
        );
      });

    program
      .command("sync")
      .description("Sync branches starting from ancestor or base branch")
      .action(async () => {
        const status = await git.status();
        if (status.files.length > 0) {
          console.log(
            chalk.red(
              "You have unstaged changes. Please commit or stash your changes before proceeding."
            )
          );
          process.exit(1);
        }
        const config = await getPersonalConfig();

        const choices = [];
        for (const base in config.baseBranches) {
          choices.push({
            name: `${config.ancestors[base]} (ancestor of ${base})`,
            value: config.ancestors[base],
          });
          buildBranchChoices(config.branchTree, base, 1, choices);
        }

        // disable last choice - can't start syncing from last branch
        choices[choices.length - 1].disabled = true;
        const { startBranch } = await inquirer.prompt([
          {
            type: "list",
            name: "startBranch",
            message: "Select branch to start sync from:",
            choices,
          },
        ]);

        try {
          let syncRoot = null;
          if (config.branchTree.hasOwnProperty(startBranch)) {
            syncRoot = startBranch;
            await syncBranches(config.branchTree, startBranch);
          } else {
            let selectedBase = null;
            for (const base in config.baseBranches) {
              if (config.ancestors[base] === startBranch) {
                selectedBase = base;
                break;
              }
            }
            if (!selectedBase) {
              throw new Error(
                `No base branch found corresponding to ancestor ${startBranch}`
              );
            }

            // checkout & pull the start branch
            await git.checkout(startBranch);
            await git.pull();
            console.log(chalk.green(`🔄 Pulled ${startBranch} from origin`));

            syncRoot = selectedBase;
            await git.checkout(selectedBase);
            await git.merge([
              "--no-ff",
              "-m",
              `Merged ${startBranch} into ${selectedBase}`,
              startBranch,
            ]);
            console.log(
              chalk.green(`✅ Merged ${startBranch} into ${selectedBase}`)
            );
            await syncBranches(config.branchTree, selectedBase);
          }
          console.log(chalk.green("Sync complete!"));

          // Prompt to push all synced branches
          const { pushAll } = await inquirer.prompt([
            {
              type: "input",
              name: "pushAll",
              message: `Would you like to push all synced branches to origin? (y/N):`,
              default: "N",
            },
          ]);

          if (pushAll.toLowerCase() === "y") {
            const collectBranches = (branch) => {
              let branches = [];
              if (
                config.branchTree[branch] &&
                config.branchTree[branch].length > 0
              ) {
                for (const child of config.branchTree[branch]) {
                  branches = branches.concat(collectBranches(child));
                }
              }
              branches.push(branch);
              return branches;
            };
            const branchesToPush = collectBranches(syncRoot);
            for (const branch of branchesToPush) {
              try {
                await git.push("origin", branch);
                console.log(
                  chalk.green(`✅ Pushed branch ${branch} to origin`)
                );
              } catch (err) {
                console.log(
                  chalk.red(`Failed to push branch ${branch}: ${err}`)
                );
              }
            }
          }
        } catch (err) {
          console.log(chalk.red(`GitError: ${err.message}`));
          if (err.message.includes("CONFLICTS")) {
            console.log(
              chalk.white(
                "💈 TIP: Solve the conflicts in your IDE, then re-run the sync"
              )
            );
          }
          process.exit(1);
        }
      });

    program
      .command("reset-bases")
      .description("Reset your personal git-barber base branches configuration")
      .action(async () => {
        const { confirm } = await inquirer.prompt([
          {
            type: "input",
            name: "confirm",
            message:
              "Are you sure you want to reset your git-barber base branches configuration? y/N",
            default: "N",
          },
        ]);

        if (confirm.toLowerCase() === "y") {
          const { personalConfigPath } = await getPersonalConfigPath();
          await fs.remove(personalConfigPath);
          console.log(
            chalk.green(
              "Your git-barber base branches configuration has been reset."
            )
          );
        } else {
          console.log(chalk.yellow("Reset operation cancelled."));
        }
      });

    program
      .command("status")
      .description(
        "Show current branch tree with current branch highlighted and PR diff summaries"
      )
      .action(async () => {
        const personalConfig = await getPersonalConfig();
        const sharedConfig = await getSharedConfig();
        const current = (await git.branch()).current;
        console.log(chalk.blueBright("Current Branch Tree:"));
        const diffMapping = await calculateDiffMapping(
          personalConfig.branchTree,
          personalConfig.baseBranches,
          sharedConfig.ignorePatterns
        );
        printTree(
          personalConfig.branchTree,
          personalConfig.baseBranches,
          current,
          diffMapping,
          sharedConfig.largeDiffThreshold
        );
      });

    program
      .command("delete")
      .description("Delete selected branch(es) locally")
      .action(async () => {
        const config = await getPersonalConfig();

        // Build choices from each base branch using buildBranchChoices
        let choices = [];
        for (const base of Object.keys(config.baseBranches)) {
          choices = choices.concat(
            buildBranchChoices(config.branchTree, base, 0, [])
          );
        }

        const { branchesToDelete } = await inquirer.prompt([
          {
            type: "checkbox",
            name: "branchesToDelete",
            message: "Select branch(es) to delete:",
            choices: choices,
          },
        ]);
        if (branchesToDelete.length === 0) {
          console.log(
            chalk.yellow("No branches selected. Deletion cancelled.")
          );
          return;
        }

        const { confirmDelete } = await inquirer.prompt([
          {
            type: "input",
            name: "confirmDelete",
            message: `Are you sure you want to delete the selected branch(es): ${branchesToDelete.join(
              ", "
            )} ? y/N`,
            default: "N",
          },
        ]);

        if (confirmDelete.toLowerCase() !== "y") {
          console.log(chalk.yellow("Deletion cancelled."));
          return;
        }

        const current = (await git.branch()).current;

        if (branchesToDelete.includes(current)) {
          console.log(
            chalk.red(
              `Cannot delete the branch you are currently on (${current}). Please checkout a different branch and try again.`
            )
          );
          return;
        }

        // Delete selected branches locally
        for (const branch of branchesToDelete) {
          try {
            await git.deleteLocalBranch(branch, true);
            console.log(chalk.green(`✅ Deleted branch ${branch}`));
          } catch (err) {
            console.log(chalk.red(`Failed to delete branch ${branch}: ${err}`));
          }
        }

        // Build parent mapping from the branch tree
        const parentMapping = {};
        Object.keys(config.branchTree).forEach((parent) => {
          config.branchTree[parent].forEach((child) => {
            parentMapping[child] = parent;
          });
        });

        // Reassign children of deleted branches to the nearest non-deleted ancestor
        for (const deletedBranch of branchesToDelete) {
          const children = config.branchTree[deletedBranch] || [];
          let parent = parentMapping[deletedBranch];
          while (parent && branchesToDelete.includes(parent)) {
            parent = parentMapping[parent];
          }
          if (parent) {
            config.branchTree[parent] = config.branchTree[parent] || [];
            children.forEach((child) => {
              if (!config.branchTree[parent].includes(child)) {
                config.branchTree[parent].push(child);
              }
              parentMapping[child] = parent;
            });
          } else {
            // No valid parent found (deleted branch was a base branch); children become new base branches
            children.forEach((child) => {
              config.baseBranches[child] = true;
              if (config.ancestors[deletedBranch]) {
                config.ancestors[child] = config.ancestors[deletedBranch];
              }
            });
          }
        }

        // Remove deleted branches from any parent's children arrays
        Object.keys(config.branchTree).forEach((parent) => {
          config.branchTree[parent] = config.branchTree[parent].filter(
            (child) => !branchesToDelete.includes(child)
          );
        });

        // Finally, delete config entries for the deleted branches
        branchesToDelete.forEach((branch) => {
          delete config.baseBranches[branch];
          delete config.ancestors[branch];
          delete config.branchTree[branch];
        });

        await savePersonalConfig(config);

        console.log(chalk.blueBright("Updated Branch Tree:"));
        printTree(config.branchTree, config.baseBranches, current, {}, 600);

        console.log(
          chalk.green("Deleted branches: " + branchesToDelete.join(", "))
        );
      });

    program
      .command("checkout")
      .description("Checkout a branch from the branch tree")
      .action(async () => {
        const status = await git.status();
        if (status.files.length > 0) {
          console.log(
            chalk.red(
              "⛔️ You have unstaged changes. Please commit or stash your changes before proceeding."
            )
          );
          process.exit(1);
        }
        const config = await getPersonalConfig();

        const baseBranchNames = Object.keys(config.baseBranches);
        if (!baseBranchNames.length) {
          console.log(chalk.red("⛔️ No base branches declared yet."));
          return;
        }

        let selectedBase;
        if (baseBranchNames.length === 1) {
          selectedBase = baseBranchNames[0];
          console.log(
            chalk.green(
              `Only one base branch found: ${selectedBase}. Automatically selecting it.`
            )
          );
        } else {
          const answer = await inquirer.prompt([
            {
              type: "list",
              name: "selectedBase",
              message: "Select base branch:",
              choices: baseBranchNames,
            },
          ]);
          selectedBase = answer.selectedBase;
        }

        const treeChoices = buildBranchChoices(config.branchTree, selectedBase);
        const currentBranch = (await git.branch()).current;
        const { branchToCheckout } = await inquirer.prompt([
          {
            type: "list",
            name: "branchToCheckout",
            message: "Select branch to checkout:",
            choices: treeChoices,
            default: currentBranch,
          },
        ]);

        try {
          await git.checkout(branchToCheckout);
          console.log(chalk.green(`Checked out branch ${branchToCheckout}`));
        } catch (err) {
          console.log(
            chalk.red(
              `‼️ Failed to checkout branch ${branchToCheckout}: ${err}`
            )
          );
        }
      });

    program
      .command("config")
      .description(
        "Edit git-barber configuration values (ignorePatterns, largeDiffThreshold)"
      )
      .action(async () => {
        const { teamConfigPath } = await getSharedConfigPath();
        console.log(
          chalk.blueBright(
            `💈 git-barber configuration (path: ${teamConfigPath})`
          )
        );

        const config = await getSharedConfig();
        const { option } = await inquirer.prompt([
          {
            type: "list",
            name: "option",
            message: "Which configuration option do you want to edit?",
            choices: [
              { name: "Diff Ignore Patterns", value: "ignorePatterns" },
              { name: "Large Diff Threshold", value: "largeDiffThreshold" },
            ],
          },
        ]);

        if (option === "ignorePatterns") {
          const { patterns } = await inquirer.prompt([
            {
              type: "input",
              name: "patterns",
              message: "Enter new ignore patterns as comma-separated values:",
              default: config.ignorePatterns.join(", "),
            },
          ]);
          config.ignorePatterns = patterns
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          console.log(chalk.green("Ignore patterns replaced successfully!"));
        } else if (option === "largeDiffThreshold") {
          const { threshold } = await inquirer.prompt([
            {
              type: "input",
              name: "threshold",
              message: "Enter new value for large diff threshold:",
              default: config.largeDiffThreshold.toString(),
              validate: (input) => {
                return isNaN(Number(input))
                  ? "Please enter a numeric value"
                  : true;
              },
            },
          ]);
          config.largeDiffThreshold = Number(threshold);
          console.log(chalk.green("Large diff threshold updated!"));
        }
        await saveSharedConfig(config);
      });

    program.parse();
  })
  .catch((err) => {
    console.error(chalk.red("Failed to initialize:", err));
    process.exit(1);
  });
