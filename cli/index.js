#!/usr/bin/env node

import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import fs from "fs-extra";
import os from "os";
import path from "path";
import simpleGit from "simple-git";

const git = simpleGit();

async function getConfigPath() {
  let repoRoot;
  try {
    repoRoot = await git.revparse(["--show-toplevel"]);
    repoRoot = repoRoot.trim();
  } catch (err) {
    repoRoot = null;
  }
  if (repoRoot) {
    const configDir = path.join(repoRoot, ".git-barber");
    return { configDir, configPath: path.join(configDir, "config.json") };
  } else {
    const configDir = path.join(
      os.homedir(),
      process.platform === "win32"
        ? "AppData/Roaming/git-barber"
        : ".config/git-barber"
    );
    return { configDir, configPath: path.join(configDir, "config.json") };
  }
}

async function ensureConfig() {
  const { configDir, configPath } = await getConfigPath();
  if (!(await fs.pathExists(configPath))) {
    await fs.ensureDir(configDir);
    await fs.writeJson(configPath, {
      baseBranches: {},
      branchTree: {},
      ancestors: {},
    });
  }
}

async function getConfig() {
  await ensureConfig();
  const { configPath } = await getConfigPath();
  return fs.readJson(configPath);
}

async function saveConfig(config) {
  const { configPath } = await getConfigPath();
  await fs.writeJson(configPath, config, { spaces: 2 });
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

function printTree(tree, baseBranches, currentBranch, deletedBranches = []) {
  function printBranch(branch, depth) {
    const indent = "  ".repeat(depth);
    let branchName = branch;
    if (deletedBranches.includes(branch)) {
      branchName = chalk.strikethrough(chalk.red(branch));
    } else if (branch === currentBranch) {
      branchName = chalk.bgBlue(branch) + "\t" + chalk.white("👈 you're here");
    }
    console.log(indent + branchName);
    if (tree[branch]) {
      for (const child of tree[branch]) {
        printBranch(child, depth + 1);
      }
    }
  }
  for (const base in baseBranches) {
    printBranch(base, 0);
  }
}

const program = new Command();

program
  .name("git-barber")
  .description(chalk.blueBright("CLI tool to neatly manage base branches"))
  .version("1.0.0");

program
  .command("declare-base <branch>")
  .description("Declare a new base branch (creates if not exists)")
  .action(async (branch) => {
    const config = await getConfig();

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
      await saveConfig(config);

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
      console.log(chalk.yellow(`Branch already declared as base: ${branch}`));
    }
  });

program
  .command("branch [branchName]")
  .description("Interactively create a nested branch from base branches")
  .action(async (providedBranch) => {
    const config = await getConfig();

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
    await saveConfig(config);

    if (!providedBranch) {
      const { pushBranch } = await inquirer.prompt([
        {
          type: "input",
          name: "pushBranch",
          message: `Would you like to push ${branchName} to origin? (y/N):`,
          default: "N",
        },
      ]);
      if (pushBranch.toLowerCase() === "y") {
        try {
          await git.push("origin", branchName);
          console.log(chalk.green(`Pushed branch ${branchName} to origin`));
        } catch (err) {
          console.log(chalk.red(`Failed to push branch ${branchName}: ${err}`));
        }
      }
    }
  });

program
  .command("sync")
  .description("Sync branches starting from ancestor or base branch")
  .action(async () => {
    const config = await getConfig();

    const choices = [];
    for (const base in config.baseBranches) {
      choices.push({
        name: `${config.ancestors[base]} (ancestor of ${base})`,
        value: config.ancestors[base],
      });
      buildBranchChoices(config.branchTree, base, 1, choices);
    }

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
        syncRoot = selectedBase;
        await git.checkout(selectedBase);
        await git.merge([
          "--no-ff",
          "-m",
          `Merged ${startBranch} into ${selectedBase}`,
          startBranch,
        ]);
        console.log(chalk.green(`Merged ${startBranch} into ${selectedBase}`));
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
            console.log(chalk.green(`✅ Pushed branch ${branch} to origin`));
          } catch (err) {
            console.log(chalk.red(`Failed to push branch ${branch}: ${err}`));
          }
        }
      }
    } catch (err) {
      console.log(chalk.red(`GitError: ${err.message}`));
      if (err.message.includes("CONFLICTS")) {
        console.log(
          chalk.white(
            "🗯️ TIP: Solve the conflicts in your IDE, then re-run the sync"
          )
        );
      }
      process.exit(1);
    }
  });

program
  .command("reset-config")
  .description("Reset git-barber configuration")
  .action(async () => {
    const { confirm } = await inquirer.prompt([
      {
        type: "input",
        name: "confirm",
        message: "Are you sure you want to delete your git-barber config? y/N",
        default: "N",
      },
    ]);

    if (confirm.toLowerCase() === "y") {
      const { configPath } = await getConfigPath();
      await fs.remove(configPath);
      console.log(chalk.green("git-barber configuration has been reset."));
    } else {
      console.log(chalk.yellow("Reset operation cancelled."));
    }
  });

program
  .command("status")
  .description("Show current branch tree with current branch highlighted")
  .action(async () => {
    const config = await getConfig();
    const current = (await git.branch()).current;
    console.log(chalk.blueBright("Current Branch Tree:"));
    printTree(config.branchTree, config.baseBranches, current);
  });

program
  .command("delete")
  .description("Delete selected branch(es) locally")
  .action(async () => {
    const config = await getConfig();

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
      console.log(chalk.yellow("No branches selected. Deletion cancelled."));
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

    const deletedBranches = [];
    for (const branch of branchesToDelete) {
      try {
        await git.deleteLocalBranch(branch, true);
        deletedBranches.push(branch);
        console.log(chalk.green(`Deleted branch ${branch}`));
      } catch (err) {
        console.log(chalk.red(`Failed to delete branch ${branch}: ${err}`));
      }
    }

    // Update configuration to reflect deleted branches
    for (const branch of branchesToDelete) {
      delete config.baseBranches[branch];
      delete config.ancestors[branch];
      delete config.branchTree[branch];
    }
    for (const parent in config.branchTree) {
      config.branchTree[parent] = config.branchTree[parent].filter(
        (child) => !branchesToDelete.includes(child)
      );
    }
    await saveConfig(config);

    console.log(chalk.blueBright("Updated Branch Tree:"));
    printTree(config.branchTree, config.baseBranches, current, deletedBranches);

    console.log(chalk.green("Deleted branches: " + deletedBranches.join(", ")));
  });

program
  .command("checkout")
  .description("Checkout a branch from the branch tree")
  .action(async () => {
    const config = await getConfig();

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
        chalk.red(`Failed to checkout branch ${branchToCheckout}: ${err}`)
      );
    }
  });

program.parse();
