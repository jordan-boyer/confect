import { execFileSync } from "node:child_process";

export default function globalSetup() {
  if (process.env.CI === "true" || process.env.CI === "1") {
    return;
  }
  const originalCwd = process.cwd();
  const testDir = import.meta.dirname;
  try {
    process.chdir(testDir);
    execFileSync("pnpm", ["confect", "codegen"], { stdio: "inherit" });
  } finally {
    process.chdir(originalCwd);
  }
}
