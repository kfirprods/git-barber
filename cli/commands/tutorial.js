import chalk from "chalk";
import inquirer from "inquirer";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import simpleGit from "simple-git";

export function createTutorialCommand(program) {
  program
    .command("tutorial")
    .description("Interactive tutorial to learn git-barber commands")
    .action(async () => {
      console.log(chalk.blueBright("💈 Welcome to the Git Barber Tutorial!"));
      console.log(chalk.white("This tutorial will walk you through the basic workflow.\n"));

      // Create temporary directory
      const tempDir = path.join(os.tmpdir(), `git-barber-tutorial-${Date.now()}`);
      
      try {
        // Step 1: Setup temp repo
        console.log(chalk.yellow("📁 Setting up temporary git repository..."));
        await fs.ensureDir(tempDir);
        
        const git = simpleGit(tempDir);
        await git.init();
        
        // Create initial files
        const file1Content = `# Shopping List

- Apples
- Bananas
- Milk
`;

        const file2Content = `# Todo List

- Learn git-barber
- Practice branching
- Become a branching expert
`;

        await fs.writeFile(path.join(tempDir, "shopping.md"), file1Content);
        await fs.writeFile(path.join(tempDir, "todo.md"), file2Content);
        
        await git.add(["."])
        await git.commit("Initial commit with shopping and todo lists");
        
        console.log(chalk.green("✅ Temporary repository created with sample files!\n"));
        console.log(chalk.white(`Repository location: ${tempDir}\n`));

        // Step 2: Declare base branch
        console.log(chalk.blueBright("🌟 Step 1: Creating a Base Branch"));
        console.log(chalk.white("Base branches are the foundation of your branch tree."));
        console.log(chalk.white("Let's declare 'feature' as a base branch.\n"));
        
        const declareBaseCommand = await getUserCommand("Please type: git-barber declare-base feature");
        await executeCommand(tempDir, declareBaseCommand);
        
        console.log(chalk.green("✅ Base branch 'feature' declared!\n"));

        // Step 3: Create nested branch
        console.log(chalk.blueBright("🌟 Step 2: Creating a Nested Branch"));
        console.log(chalk.white("Now let's create a branch under our base branch."));
        console.log(chalk.white("We'll create 'shopping-updates' under 'feature'.\n"));
        
        const branchCommand = await getUserCommand("Please type: git-barber branch shopping-updates");
        await executeCommand(tempDir, branchCommand);
        
        console.log(chalk.green("✅ Nested branch 'shopping-updates' created!\n"));

        // Step 4: Make changes and commit
        console.log(chalk.blueBright("🌟 Step 3: Making Changes"));
        console.log(chalk.white("Let's add an item to our shopping list and commit the change.\n"));
        
        await waitForUserInput("Press ENTER to continue...");
        
        const updatedShoppingContent = `# Shopping List

- Apples
- Bananas
- Milk
- Bread
- Eggs
`;
        
        await fs.writeFile(path.join(tempDir, "shopping.md"), updatedShoppingContent);
        await git.add(["shopping.md"]);
        await git.commit("Add bread and eggs to shopping list");
        
        console.log(chalk.green("✅ Changes committed to shopping-updates branch!\n"));

        // Step 5: Switch to main and make different changes
        console.log(chalk.blueBright("🌟 Step 4: Working on Main Branch"));
        console.log(chalk.white("Now let's checkout main and make changes to the todo list.\n"));
        
        await waitForUserInput("Press ENTER to continue...");
        
        await git.checkout("main");
        console.log(chalk.yellow("Switched to main branch"));
        
        const updatedTodoContent = `# Todo List

- Learn git-barber ✅
- Practice branching
- Become a branching expert
- Write better commit messages
`;
        
        await fs.writeFile(path.join(tempDir, "todo.md"), updatedTodoContent);
        await git.add(["todo.md"]);
        await git.commit("Mark git-barber learning as complete and add new todo");
        
        console.log(chalk.green("✅ Changes committed to main branch!\n"));

        // Step 6: Use sync command
        console.log(chalk.blueBright("🌟 Step 5: Syncing Branches"));
        console.log(chalk.white("The sync command merges changes from ancestor branches down"));
        console.log(chalk.white("through your branch tree. Let's sync our changes!\n"));
        
        const syncCommand = await getUserCommand("Please type: git-barber sync");
        await executeCommand(tempDir, syncCommand);
        
        console.log(chalk.green("✅ Branches synced!\n"));

        // Step 7: Check status
        console.log(chalk.blueBright("🌟 Step 6: Viewing Branch Status"));
        console.log(chalk.white("Let's see our current branch tree structure.\n"));
        
        const statusCommand = await getUserCommand("Please type: git-barber status");
        await executeCommand(tempDir, statusCommand);
        
        console.log(chalk.green("\n✅ Tutorial completed!\n"));

        // Summary
        console.log(chalk.blueBright("🎉 Congratulations!"));
        console.log(chalk.white("You've learned the core git-barber workflow:"));
        console.log(chalk.white("• declare-base: Create foundation branches"));
        console.log(chalk.white("• branch: Create nested branches"));
        console.log(chalk.white("• sync: Merge changes through your branch tree"));
        console.log(chalk.white("• status: View your branch tree structure\n"));
        
        console.log(chalk.white("The temporary repository will be cleaned up automatically."));
        console.log(chalk.white("You can now use git-barber in your own repositories!"));

      } catch (error) {
        console.error(chalk.red(`Tutorial error: ${error.message}`));
      } finally {
        // Cleanup
        try {
          await fs.remove(tempDir);
          console.log(chalk.gray("🧹 Temporary repository cleaned up"));
        } catch (cleanupError) {
          console.log(chalk.yellow(`Warning: Could not clean up temp directory: ${tempDir}`));
        }
      }
    });
}

async function getUserCommand(message) {
  const { command } = await inquirer.prompt([
    {
      type: "input",
      name: "command",
      message: message,
      validate: (input) => {
        if (!input.trim()) {
          return "Please enter a command";
        }
        if (!input.startsWith("git-barber")) {
          return "Please enter a git-barber command";
        }
        return true;
      }
    },
  ]);
  return command.trim();
}

async function executeCommand(cwd, commandString) {
  return new Promise((resolve, reject) => {
    // Parse the command string to extract arguments
    const args = commandString.split(" ").slice(1); // Remove 'git-barber' part
    
    // Get the path to the current git-barber executable
    const gitBarberPath = process.argv[1]; // This should be the index.js path
    
    console.log(chalk.yellow(`Running: ${commandString}`));
    
    const childProcess = spawn("node", [gitBarberPath, ...args], {
      cwd: cwd,
      stdio: "inherit",
    });

    childProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.log(chalk.red(`Command failed with exit code ${code}`));
        reject(new Error(`git-barber command failed with code ${code}`));
      }
    });

    childProcess.on("error", (error) => {
      console.log(chalk.red(`Command error: ${error.message}`));
      reject(error);
    });
  });
} 