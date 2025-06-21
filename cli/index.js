#!/usr/bin/env node

import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import { ensurePersonalConfig } from "./utils/config.js";
import { checkForUpdates } from "./utils/update.js";

// Import all command modules
import { createVersionCommand } from "./commands/version.js";
import { createDeclareBaseCommand } from "./commands/declare-base.js";
import { createBranchCommand } from "./commands/branch.js";
import { createSyncCommand } from "./commands/sync.js";
import { createResetBasesCommand } from "./commands/reset-bases.js";
import { createStatusCommand } from "./commands/status.js";
import { createDeleteCommand } from "./commands/delete.js";
import { createCheckoutCommand } from "./commands/checkout.js";
import { createConfigCommand } from "./commands/config.js";

// Custom prompt wrapper for graceful ctrl+c handling
const originalPrompt = inquirer.prompt;
inquirer.prompt = async (...args) => {
  try {
    return await originalPrompt(...args);
  } catch (error) {
    if (error && error.message && error.message.includes("force closed")) {
      console.log("💈 no problem, see you soon!");
      process.exit(0);
    }
    throw error;
  }
};

// Initialize the program
async function initialize() {
  try {
    await ensurePersonalConfig();
    await checkForUpdates();
  } catch (err) {
    console.error(chalk.red("Failed to initialize personal config:", err));
    process.exit(1);
  }
}

// Initialize before parsing commands
initialize()
  .then(() => {
    const program = new Command();
    
    program
      .name("git-barber")
      .description(
        chalk.blueBright("💈 CLI tool to neatly manage base branches")
      )
      .version("1.0.0");

    // Register all commands
    createVersionCommand(program);
    createDeclareBaseCommand(program);
    createBranchCommand(program);
    createSyncCommand(program);
    createResetBasesCommand(program);
    createStatusCommand(program);
    createDeleteCommand(program);
    createCheckoutCommand(program);
    createConfigCommand(program);

    program.parse();
  })
  .catch((err) => {
    console.error(chalk.red("Failed to initialize:", err));
    process.exit(1);
  });
