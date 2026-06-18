import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const workspaceRoot = process.cwd();
const browsersPath = path.join(workspaceRoot, ".playwright");

mkdirSync(browsersPath, { recursive: true });

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node scripts/playwright-local.mjs <playwright-args>");
  process.exit(1);
}

const child = spawn(
  process.execPath,
  [path.join("node_modules", "@playwright", "test", "cli.js"), ...args],
  {
    stdio: "inherit",
    cwd: workspaceRoot,
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: browsersPath
    }
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
