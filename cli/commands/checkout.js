import chalk from "chalk";
import inquirer from "inquirer";
import { getPersonalConfig } from "../utils/config.js";
import { buildBranchChoices } from "../utils/display.js";
import { git } from "../utils/git.js";

export function createCheckoutCommand(program) {
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
} 