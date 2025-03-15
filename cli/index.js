#!/usr/bin/env node

import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import fs from "fs-extra";
import os from "os";
import path from "path";
import simpleGit from "simple-git";

const git = simpleGit();

const CONFIG_DIR = path.join(
  os.homedir(),
  process.platform === "win32"
    ? "AppData/Roaming/git-barber"
    : ".config/git-barber"
);
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

async function ensureConfig() {
  if (!(await fs.pathExists(CONFIG_PATH))) {
    await fs.ensureDir(CONFIG_DIR);
    await fs.writeJson(CONFIG_PATH, {
      baseBranches: {},
      branchTree: {},
      ancestors: {},
    });
  }
}

async function getConfig() {
  await ensureConfig();
  return fs.readJson(CONFIG_PATH);
}

async function saveConfig(config) {
  await fs.writeJson(CONFIG_PATH, config, { spaces: 2 });
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
  await git.pull("origin", branch);
  if (branchTree[branch]) {
    for (const child of branchTree[branch]) {
      await git.checkout(child);
      await git.merge(["--no-ff", "-m", `Merged ${branch} into ${child}`, branch]);
      console.log(chalk.green(`Merged ${branch} into ${child}`));
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
      branchName = chalk.bgBlue(branch);
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
  .command("declare <branch>")
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
  .command("branch")
  .description("Interactively create a nested branch from base branches")
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
      console.log(chalk.green(`Only one base branch found: ${selectedBase}. Automatically selecting it.`));
    } else {
      const answer = await inquirer.prompt([{ 
        type: 'list',
        name: 'selectedBase',
        message: 'Select base branch:',
        choices: baseBranchNames,
      }]);
      selectedBase = answer.selectedBase;
    }

    const treeChoices = buildBranchChoices(config.branchTree, selectedBase);

    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "parentBranch",
        message: "Select ancestor branch:",
        choices: treeChoices,
        default: treeChoices[treeChoices.length - 1].value,
      },
      {
        type: "input",
        name: "newBranch",
        message: "Enter new branch name:",
      },
    ]);

    await git.checkout(answers.parentBranch);
    await git.checkoutBranch(answers.newBranch, answers.parentBranch);

    if (!config.branchTree[answers.parentBranch])
      config.branchTree[answers.parentBranch] = [];
    config.branchTree[answers.parentBranch].push(answers.newBranch);
    await saveConfig(config);

    console.log(
      chalk.green(
        `Created nested branch ${answers.newBranch} from ${answers.parentBranch}`
      )
    );
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
      if (config.branchTree.hasOwnProperty(startBranch)) {
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
          throw new Error(`No base branch found corresponding to ancestor ${startBranch}`);
        }
        await git.checkout(selectedBase);
        await git.merge(["--no-ff", "-m", `Merged ${startBranch} into ${selectedBase}`, startBranch]);
        console.log(chalk.green(`Merged ${startBranch} into ${selectedBase}`));
        await syncBranches(config.branchTree, selectedBase);
      }
      console.log(chalk.green("Sync complete!"));
    } catch (err) {
      console.log(chalk.red(`GitError: ${err.message}`));
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
      await fs.remove(CONFIG_PATH);
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
  .description("Delete a branch and its descendants locally")
  .action(async () => {
    const config = await getConfig();

    // Build choices from each base branch using buildBranchChoices
    let choices = [];
    for (const base of Object.keys(config.baseBranches)) {
      choices = choices.concat(
        buildBranchChoices(config.branchTree, base, 0, [])
      );
    }

    const { branchToDelete } = await inquirer.prompt([
      {
        type: "list",
        name: "branchToDelete",
        message: "Select branch to delete:",
        choices: choices,
      },
    ]);

    const { confirmDelete } = await inquirer.prompt([
      {
        type: "input",
        name: "confirmDelete",
        message: `Are you sure you want to remove (locally) branch '${branchToDelete}' and all of its descendants? y/N`,
        default: "N",
      },
    ]);

    if (confirmDelete.toLowerCase() !== "y") {
      console.log(chalk.yellow("Deletion cancelled."));
      return;
    }

    const current = (await git.branch()).current;

    // Function to recursively collect branches (children first)
    const collectBranches = (branch) => {
      let branches = [];
      if (config.branchTree[branch] && config.branchTree[branch].length > 0) {
        for (const child of config.branchTree[branch]) {
          branches = branches.concat(collectBranches(child));
        }
      }
      branches.push(branch);
      return branches;
    };

    const branchesToDelete = collectBranches(branchToDelete);

    if (branchesToDelete.includes(current)) {
      console.log(
        chalk.red(
          "Cannot delete the branch you are currently on. Please checkout a different branch and try again."
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
      config.branchTree[parent] = config.branchTree[parent].filter(child => !branchesToDelete.includes(child));
    }
    await saveConfig(config);

    console.log(chalk.blueBright('Updated Branch Tree:'));
    printTree(config.branchTree, config.baseBranches, current, deletedBranches);

    console.log(chalk.green("Deleted branches: " + deletedBranches.join(", ")));
  });

program
  .command('checkout')
  .description('Checkout a branch from the branch tree')
  .action(async () => {
    const config = await getConfig();

    const baseBranchNames = Object.keys(config.baseBranches);
    if (!baseBranchNames.length) {
      console.log(chalk.red('No base branches declared yet.'));
      return;
    }

    let selectedBase;
    if (baseBranchNames.length === 1) {
      selectedBase = baseBranchNames[0];
      console.log(chalk.green(`Only one base branch found: ${selectedBase}. Automatically selecting it.`));
    } else {
      const answer = await inquirer.prompt([{ 
        type: 'list',
        name: 'selectedBase',
        message: 'Select base branch:',
        choices: baseBranchNames,
      }]);
      selectedBase = answer.selectedBase;
    }

    const treeChoices = buildBranchChoices(config.branchTree, selectedBase);

    const { branchToCheckout } = await inquirer.prompt([{ 
      type: 'list',
      name: 'branchToCheckout',
      message: 'Select branch to checkout:',
      choices: treeChoices,
      default: treeChoices[treeChoices.length - 1].value,
    }]);

    try {
      await git.checkout(branchToCheckout);
      console.log(chalk.green(`Checked out branch ${branchToCheckout}`));
    } catch (err) {
      console.log(chalk.red(`Failed to checkout branch ${branchToCheckout}: ${err}`));
    }
  });

program.parse();
