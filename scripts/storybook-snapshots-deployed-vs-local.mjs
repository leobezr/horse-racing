import { spawnSync } from "node:child_process";

const resolveBaseUrl = () => {
  const fromEnv = process.env.BASE_URL;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }

  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) {
    return "";
  }

  const parts = repository.split("/");
  if (parts.length !== 2) {
    return "";
  }

  const owner = parts[0];
  const repo = parts[1];
  return `https://${owner}.github.io/${repo}/`;
};

const run = (command, args, env) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const baseUrl = resolveBaseUrl();
if (baseUrl.length === 0) {
  console.error("Missing BASE_URL or GITHUB_REPOSITORY for deployed snapshot comparison.");
  process.exit(1);
}

const env = {
  ...process.env,
  BASE_URL: baseUrl,
  PLAYWRIGHT_SNAPSHOTS_OUTPUT_DIR: ".local-snapshots",
};

run("yarn", ["test:storybook:snapshots"], env);
