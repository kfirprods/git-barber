import fs from "fs-extra";
import path from "path";
import simpleGit from "simple-git";

const git = simpleGit();

export async function getSharedConfigPath() {
  let repoRoot;
  try {
    repoRoot = await git.revparse(["--show-toplevel"]);
    repoRoot = repoRoot.trim();
  } catch (err) {
    console.error(
      "Error: Unable to determine repository root. Please run inside a git repository."
    );
    process.exit(1);
  }
  return {
    teamConfigPath: path.join(repoRoot, ".git-barber", "team-config.json"),
  };
}

export async function getPersonalConfigPath() {
  let repoRoot;
  try {
    repoRoot = await git.revparse(["--show-toplevel"]);
    repoRoot = repoRoot.trim();
  } catch (err) {
    console.error(
      "Error: Unable to determine repository root. Please run inside a git repository."
    );
    process.exit(1);
  }
  return {
    personalConfigPath: path.join(
      repoRoot,
      ".git-barber",
      "my-basebranches.json"
    ),
  };
}

export async function ensureSharedConfig() {
  const { teamConfigPath } = await getSharedConfigPath();
  // Ensure the directory exists
  await fs.ensureDir(path.dirname(teamConfigPath));
  if (!(await fs.pathExists(teamConfigPath))) {
    await fs.writeJson(
      teamConfigPath,
      {
        ignorePatterns: [
          "package.json",
          "package-lock.json",
          "*.svg",
          "*.png",
          "*.jpg",
          "*.mp4",
        ],
        largeDiffThreshold: 600,
      },
      { spaces: 2 }
    );
  }
}

export async function ensurePersonalConfig() {
  const { personalConfigPath } = await getPersonalConfigPath();
  // Ensure the directory exists before trying to write the file
  await fs.ensureDir(path.dirname(personalConfigPath));
  if (!(await fs.pathExists(personalConfigPath))) {
    await fs.writeJson(
      personalConfigPath,
      {
        baseBranches: {},
        branchTree: {},
        ancestors: {},
      },
      { spaces: 2 }
    );
  }
}

export async function getSharedConfig() {
  await ensureSharedConfig();
  const { teamConfigPath } = await getSharedConfigPath();
  return fs.readJson(teamConfigPath);
}

export async function getPersonalConfig() {
  const { personalConfigPath } = await getPersonalConfigPath();
  return fs.readJson(personalConfigPath);
}

export async function saveSharedConfig(config) {
  const { teamConfigPath } = await getSharedConfigPath();
  await fs.writeJson(teamConfigPath, config, { spaces: 2 });
}

export async function savePersonalConfig(config) {
  const { personalConfigPath } = await getPersonalConfigPath();
  await fs.writeJson(personalConfigPath, config, { spaces: 2 });
} 