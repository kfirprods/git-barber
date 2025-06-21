import chalk from "chalk";
import inquirer from "inquirer";
import { getPersonalConfig, savePersonalConfig } from "../utils/config.js";
import { buildBranchChoices, printTree } from "../utils/display.js";
import { git } from "../utils/git.js";

export function createDeleteCommand(program) {
  program
    .command("delete")
    .description("Delete selected branch(es) locally")
    .action(async () => {
      const config = await getPersonalConfig();

      // Build choices from each base branch using buildBranchChoices
      let choices = [];
      for (const base of Object.keys(config.baseBranches)) {
        choices = choices.concat(
          buildBranchChoices(config.branchTree, base, 0, true, [])
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
} 