import fs from "fs-extra";
import chalk from "chalk";
import { checkForUpdates } from "../utils/update.js";

export function createVersionCommand(program) {
  program
    .command("version")
    .description("Show detailed version information")
    .action(async () => {
      const packageJson = JSON.parse(
        fs.readFileSync(new URL("../package.json", import.meta.url))
      );
      console.log(chalk.blueBright("\n💈 Git Barber"));
      console.log(chalk.white(`Version: ${packageJson.version}`));

      // Check for updates
      const isUpdateAvailable = await checkForUpdates();
      if (!isUpdateAvailable) {
        console.log(
          chalk.green(
            "💈 You're using the latest version of git-barber. Keep up the good work!"
          )
        );
      }
    });
} 