import chalk from "chalk";
import inquirer from "inquirer";
import { getPersonalConfig, savePersonalConfig } from "../utils/config.js";
import { git } from "../utils/git.js";

export function createDeclareBaseCommand(program) {
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
} 