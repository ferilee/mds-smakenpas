import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const mode = process.argv[2] || "all";
const dirsByMode = {
  build: [".next"],
  dev: [".next-dev", ".next"],
  all: [".next", ".next-dev"],
};

const dirs = dirsByMode[mode] || dirsByMode.all;
let removed = 0;

for (const dir of dirs) {
  const fullPath = join(process.cwd(), dir);
  if (existsSync(fullPath)) {
    rmSync(fullPath, { recursive: true, force: true });
    console.log(`[clean-next] Removed ${dir} cache`);
    removed += 1;
  }
}

if (!removed) {
  console.log("[clean-next] No Next cache directories found");
}
