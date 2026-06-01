import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

const readJson = async (relativePath) =>
  JSON.parse(await readFile(path.join(projectRoot, relativePath), "utf8"));
const readText = (relativePath) => readFile(path.join(projectRoot, relativePath), "utf8");

const fail = (message) => {
  console.error(`Self-use release check failed: ${message}`);
  process.exit(1);
};

const runStep = ({ args, label }) => {
  console.log(`\n== ${label} ==`);
  const result = spawnSync("npm", args, {
    cwd: projectRoot,
    stdio: "inherit",
  });

  if (result.error) {
    fail(`${label} could not start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`${label} exited with ${result.status ?? "unknown status"}`);
  }
};

const packageJson = await readJson("package.json");
const tauriConfig = await readJson("src-tauri/tauri.conf.json");
const cargoToml = await readText("src-tauri/Cargo.toml");
const cargoVersion = /^version = "([^"]+)"/m.exec(cargoToml)?.[1];

if (packageJson.version !== tauriConfig.version) {
  fail(`package.json version ${packageJson.version} does not match Tauri version ${tauriConfig.version}`);
}

if (cargoVersion !== packageJson.version) {
  fail(`Cargo package version ${cargoVersion ?? "unknown"} does not match package.json version ${packageJson.version}`);
}

if (tauriConfig.identifier !== "com.damon.jijirululing") {
  fail(`unexpected Tauri identifier ${tauriConfig.identifier}`);
}

if (!tauriConfig.bundle?.active || !tauriConfig.bundle?.targets?.includes("app")) {
  fail("Tauri bundle must remain active for the internal macOS app target");
}

[
  { args: ["run", "test"], label: "Unit tests" },
  { args: ["run", "build"], label: "Frontend build" },
  { args: ["run", "check:sound-assets"], label: "Sound asset check" },
  { args: ["run", "check:visual-assets"], label: "Visual asset check" },
  { args: ["run", "check:desktop-config"], label: "Desktop config check" },
  { args: ["run", "check:self-use"], label: "Self-use readiness check" },
].forEach(runStep);

console.log("\nSelf-use release check passed.");
console.log("Next: run `npm run release:self-use-summary` and copy the result into docs/SELF_USE_RELEASE_LOG.md.");
