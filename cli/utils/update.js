import fs from "fs-extra";
import { exec } from "child_process";
import { promisify } from "util";
import chalk from "chalk";

const execPromise = promisify(exec);

// Function to check for updates
export async function checkForUpdates() {
  try {
    const currentVersion = JSON.parse(
      fs.readFileSync(new URL("../package.json", import.meta.url))
    ).version;
    const { stdout } = await execPromise("npm view git-barber version", {
      timeout: 600,
    });
    const latestVersion = stdout.toString().trim();

    if (currentVersion !== latestVersion) {
      console.log(
        chalk.blue(
          `\n💈 A new version of git-barber is available! (${currentVersion} → ${latestVersion})`
        )
      );
      console.log(chalk.blue("Run `npm install -g git-barber` to update.\n"));
      return true;
    } else {
      return false;
    }
  } catch (err) {
    // Silently fail if update check fails
    return false;
  }
} 