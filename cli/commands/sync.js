import chalk from "chalk";
import inquirer from "inquirer";
import { getPersonalConfig } from "../utils/config.js";
import { buildBranchChoices } from "../utils/display.js";
import { syncBranches, git } from "../utils/git.js";

export function createSyncCommand(program) {
  program
    .command("sync")
    .description("Sync branches starting from ancestor or base branch")
    .action(async () => {
      const status = await git.status();
      if (status.files.length > 0) {
        console.log(
          chalk.red(
            "You have unstaged changes. Please commit or stash your changes before proceeding."
          )
        );
        process.exit(1);
      }
      const currentBranch = (await git.branch()).current;
      const config = await getPersonalConfig();

      const choices = [];
      for (const base in config.baseBranches) {
        choices.push({
          name: `${config.ancestors[base]} (ancestor of ${base})`,
          value: config.ancestors[base],
        });
        buildBranchChoices(config.branchTree, base, 1, true, choices);
      }

      // disable last choice - can't start syncing from last branch
      choices[choices.length - 1].disabled = true;
      const { startBranch } = await inquirer.prompt([
        {
          type: "list",
          name: "startBranch",
          message: "Select branch to start sync from:",
          choices,
        },
      ]);

      try {
        let syncRoot = null;
        if (config.branchTree.hasOwnProperty(startBranch)) {
          syncRoot = startBranch;
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
            throw new Error(
              `No base branch found corresponding to ancestor ${startBranch}`
            );
          }

          // checkout & pull the start branch
          await git.checkout(startBranch);
          try {
            await git.pull();
            console.log(chalk.green(`🔄 Pulled ${startBranch} from origin`));
          } catch (err) {
            console.log(
              chalk.yellow(
                `[WARNING] Failed to pull branch from remote origin/${startBranch}: ${err}`
              )
            );
          }

          syncRoot = selectedBase;
          await git.checkout(selectedBase);
          await git.merge([
            "--no-ff",
            "-m",
            `Merged ${startBranch} into ${selectedBase}`,
            startBranch,
          ]);
          console.log(
            chalk.green(`✅ Merged ${startBranch} into ${selectedBase}`)
          );
          await syncBranches(config.branchTree, selectedBase);
        }
        console.log(chalk.green("Sync complete!"));

        // re-checkout the current branch
        await git.checkout(currentBranch);
        console.log(
          chalk.green(
            `🔄 Returned to your checked out branch: ${currentBranch}`
          )
        );

        // Prompt to push all synced branches
        const { pushAll } = await inquirer.prompt([
          {
            type: "input",
            name: "pushAll",
            message: `Would you like to push all synced branches to origin? (y/N):`,
            default: "N",
          },
        ]);

        if (pushAll.toLowerCase() === "y") {
          const collectBranches = (branch) => {
            let branches = [];
            if (
              config.branchTree[branch] &&
              config.branchTree[branch].length > 0
            ) {
              for (const child of config.branchTree[branch]) {
                branches = branches.concat(collectBranches(child));
              }
            }
            branches.push(branch);
            return branches;
          };
          const branchesToPush = collectBranches(syncRoot);
          for (const branch of branchesToPush) {
            try {
              await git.push("origin", branch);
              console.log(
                chalk.green(`✅ Pushed branch ${branch} to origin`)
              );
            } catch (err) {
              console.log(
                chalk.red(`Failed to push branch ${branch}: ${err}`)
              );
            }
          }
        }
      } catch (err) {
        console.log(chalk.red(`GitError: ${err.message}`));
        if (err.message.includes("CONFLICTS")) {
          console.log(
            chalk.white(
              "💈 TIP: Solve the conflicts in your IDE, then re-run the sync"
            )
          );
        }
        process.exit(1);
      }
    });
} 