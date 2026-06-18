import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const workspaceRoot = process.cwd();
const homeDir = workspaceRoot;
const configDir = path.join(homeDir, ".config");
const dataDir = path.join(homeDir, ".local-share");

mkdirSync(configDir, { recursive: true });
mkdirSync(dataDir, { recursive: true });

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node scripts/supabase-local.mjs <supabase-args>");
  process.exit(1);
}

const child = spawn(
  process.execPath,
  [path.join("node_modules", "supabase", "dist", "supabase.js"), ...args],
  {
    stdio: "inherit",
    cwd: workspaceRoot,
    env: {
      ...process.env,
      HOME: homeDir,
      USERPROFILE: homeDir,
      XDG_CONFIG_HOME: configDir,
      XDG_DATA_HOME: dataDir
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
