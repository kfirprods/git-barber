import chalk from "chalk";
import inquirer from "inquirer";
import { getPersonalConfig, savePersonalConfig } from "../utils/config.js";
import { buildBranchChoices, printTree } from "../utils/display.js";
import { git } from "../utils/git.js";

export function createBranchCommand(program) {
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
} 