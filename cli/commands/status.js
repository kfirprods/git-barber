import chalk from "chalk";
import { getPersonalConfig, getSharedConfig } from "../utils/config.js";
import { calculateDiffMapping } from "../utils/git.js";
import { printTree } from "../utils/display.js";
import { git } from "../utils/git.js";

export function createStatusCommand(program) {
  program
    .command("status")
    .description(
      "Show current branch tree with current branch highlighted and PR diff summaries"
    )
    .action(async () => {
      const personalConfig = await getPersonalConfig();
      const sharedConfig = await getSharedConfig();
      const current = (await git.branch()).current;
      console.log(chalk.blueBright("Current Branch Tree:"));
      const diffMapping = await calculateDiffMapping(
        personalConfig.branchTree,
        personalConfig.baseBranches,
        sharedConfig.ignorePatterns
      );
      printTree(
        personalConfig.branchTree,
        personalConfig.baseBranches,
        current,
        diffMapping,
        sharedConfig.largeDiffThreshold
      );
    });
} 