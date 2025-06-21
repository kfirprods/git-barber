import chalk from "chalk";
import inquirer from "inquirer";
import fs from "fs-extra";
import { getPersonalConfigPath } from "../utils/config.js";

export function createResetBasesCommand(program) {
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
} 