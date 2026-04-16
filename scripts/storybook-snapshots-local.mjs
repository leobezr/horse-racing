import { spawnSync } from "node:child_process";

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

const env = {
  ...process.env,
  PLAYWRIGHT_SNAPSHOTS_OUTPUT_DIR: ".local-snapshots",
};

run("yarn", ["test:storybook:snapshots:update"], env);
