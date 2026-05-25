import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

const readText = (relativePath) => readFile(path.join(projectRoot, relativePath), "utf8");
const readJson = async (relativePath) => JSON.parse(await readText(relativePath));

const runGit = (args) => {
  try {
    return execFileSync("git", args, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
};

const getConstant = (source, name) => {
  const stringMatch = new RegExp(`export const ${name} = "([^"]+)"`).exec(source);
  if (stringMatch) {
    return stringMatch[1];
  }

  const numberMatch = new RegExp(`export const ${name} = (\\d+)`).exec(source);
  return numberMatch?.[1] ?? "unknown";
};

const formatLocalDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).format(new Date());

const packageJson = await readJson("package.json");
const tauriConfig = await readJson("src-tauri/tauri.conf.json");
const cargoToml = await readText("src-tauri/Cargo.toml");
const persistenceSchema = await readText("src/lib/desktopPersistenceSchema.ts");

const dataFilename = getConstant(persistenceSchema, "DESKTOP_PERSISTENCE_FILENAME");
const dataVersion = getConstant(persistenceSchema, "DESKTOP_PERSISTENCE_VERSION");
const cargoVersion = /^version = "([^"]+)"/m.exec(cargoToml)?.[1] ?? "unknown";
const shortCommit = runGit(["rev-parse", "--short", "HEAD"]) || "unknown";
const status = runGit(["status", "--short"]);
const workingTreeState = status ? "有未提交改动" : "干净";
const buildPath = "src-tauri/target/release/bundle/macos/急急如律令.app";
const today = formatLocalDate();

const releaseEntry = `### ${today} · v${packageJson.version} · 内部自用版

- 状态：准备日常自用。
- Git 提交：${shortCommit}（工作区：${workingTreeState}）。
- 构建产物：\`${buildPath}\`。
- Bundle ID：\`${tauriConfig.identifier}\`。
- Rust crate：\`jiji-rululing v${cargoVersion}\`。
- 数据版本：\`${dataFilename}\` / \`version: ${dataVersion}\`。
- 自动检查：\`npm run check:release-self-use\`。
- 手动验收：按 \`SELF_USE_REGRESSION_RUNBOOK.md\` 填写。
- 完整备份：填写备份文件位置。
- 已知问题：填写或写“无阻断问题”。
- 回滚方式：退出应用，换回上一版 \`.app\`；如数据异常，恢复替换前备份的 \`${dataFilename}\` 或完整备份 JSON。`;

console.log("Self-use release summary");
console.log(`- App: ${tauriConfig.productName}`);
console.log(`- Version: v${packageJson.version}`);
console.log(`- Bundle ID: ${tauriConfig.identifier}`);
console.log(`- Rust crate: jiji-rululing v${cargoVersion}`);
console.log(`- Git commit: ${shortCommit}`);
console.log(`- Working tree: ${workingTreeState}`);
console.log(`- Data: ${dataFilename} / version ${dataVersion}`);
console.log(`- Build output: ${buildPath}`);
console.log("\nCopy into docs/SELF_USE_RELEASE_LOG.md:\n");
console.log(releaseEntry);
