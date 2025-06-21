import chalk from "chalk";
import inquirer from "inquirer";
import { getSharedConfig, saveSharedConfig, getSharedConfigPath } from "../utils/config.js";

export function createConfigCommand(program) {
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
} 