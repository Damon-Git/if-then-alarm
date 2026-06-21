# macOS 自用安装与数据恢复手册

本文记录如何把当前内部 `.app` 作为个人日常自用版本使用，以及数据如何备份、恢复和重置。项目当前采用自用优先的开源路线，不购买 Apple Developer Program 会员；本文不是正式发布说明，不包含签名、公证、DMG、自动更新或面向他人分发。对外开源边界见 `OPEN_SOURCE_STRATEGY.md`。

## 适用范围

- 只用于本人或受信任开发环境的 macOS 自用。
- 产物来自本仓库本地构建。
- 数据保存在 Tauri app data 目录，不保存在 `.app` 包内部。
- 替换 `.app` 不应删除历史、当前轮次或设置。

## 构建前检查

准备生成一个可以继续自用的版本前，先执行：

```bash
npm run check:release-self-use
npm run release:self-use-summary
```

第一个命令会串起单元测试、前端构建、桌面配置检查和自用基线检查；第二个命令会输出可复制到 `docs/SELF_USE_RELEASE_LOG.md` 的发布摘要。

如果本地开发服务和 Playwright 可用，再执行小窗回归：

```bash
npm run dev -- --host 127.0.0.1
npm run check:compact
```

最后生成内部 `.app`：

```bash
npm run tauri:build
```

构建产物位于：

```text
src-tauri/target/release/bundle/macos/急急如律令.app
```

准备把该产物作为新的日常自用版本前，把 `npm run release:self-use-summary` 输出的摘要复制到 `docs/SELF_USE_RELEASE_LOG.md`，并补齐手动验收、完整备份和已知问题。

## 安装方式

当前阶段推荐两种自用方式。

### 方式一：直接打开构建产物

适合开发和验收：

```text
src-tauri/target/release/bundle/macos/急急如律令.app
```

如果 macOS 拦截未签名应用，使用右键打开。

### 方式二：复制到自用应用目录

适合日常使用。先退出正在运行的应用，再把构建产物复制到自用位置：

```text
/Applications/急急如律令.app
```

或：

```text
~/Applications/急急如律令.app
```

注意：

- 替换 `.app` 前先退出旧应用。
- 不要在应用运行中替换 `.app`。
- `.app` 包只是程序本体；历史、设置、当前轮次不在包内。

当前目标不存在时，使用以下最小安装命令。命令会先确认工作区 bundle 存在，并在目标路径已经出现时停止，不会直接覆盖：

```bash
source_app="$PWD/src-tauri/target/release/bundle/macos/急急如律令.app"
target_app="$HOME/Applications/急急如律令.app"

test -d "$source_app" || { printf '工作区 bundle 不存在：%s\n' "$source_app" >&2; exit 1; }
if [ -e "$target_app" ]; then
  printf '目标已存在，停止安装：%s\n' "$target_app" >&2
  exit 1
fi

mkdir -p "$HOME/Applications"
ditto "$source_app" "$target_app"
```

如果执行安装前目标路径已经存在，先退出正在运行的应用，再使用带时间戳的备份方案：

```bash
source_app="$PWD/src-tauri/target/release/bundle/macos/急急如律令.app"
target_app="$HOME/Applications/急急如律令.app"
backup_root="/Users/damon/backups"
backup_app="$backup_root/急急如律令.app.backup-$(date +%Y%m%d-%H%M%S)"

test -d "$source_app" || { printf '工作区 bundle 不存在：%s\n' "$source_app" >&2; exit 1; }
test -e "$target_app" || { printf '目标不存在，不需要覆盖：%s\n' "$target_app" >&2; exit 1; }

mkdir -p "$backup_root"
mv "$target_app" "$backup_app"
ditto "$source_app" "$target_app"
printf '旧 bundle 已备份到：%s\n' "$backup_app"
```

如果需要回滚，把新安装的 bundle 先改名保留，再把时间戳备份移回日常路径：

```bash
target_app="$HOME/Applications/急急如律令.app"
backup_root="/Users/damon/backups"
rollback_app="$backup_root/急急如律令.app.rollback-$(date +%Y%m%d-%H%M%S)"
backup_app="$backup_root/急急如律令.app.backup-YYYYMMDD-HHMMSS"

mkdir -p "$backup_root"
mv "$target_app" "$rollback_app"
mv "$backup_app" "$target_app"
```

如果此前没有旧 bundle，只执行第一条 `mv` 即可撤下新安装版本。上述操作只影响 `.app` 程序包，不改动 `~/Library/Application Support/com.damon.jijirululing/` 下的数据。

## 什么时候需要重新构建

以下情况需要重新执行 `npm run tauri:build` 并替换自用 `.app`：

- 修改了 React/TypeScript/CSS 代码。
- 修改了符箓、香炉、线香、祭台等视觉素材。
- 修改了 `src-tauri/` 中的 Rust、权限、窗口或菜单栏逻辑。
- 修改了 `package.json`、Tauri 配置或依赖版本。
- 修复了会影响日常使用的数据、通知、声音、窗口或小窗问题。

只修改纯文档时，不需要重新构建 `.app`。

## 数据位置

桌面版数据文件位于 Tauri app data 目录。当前 macOS 路径为：

```text
~/Library/Application Support/com.damon.jijirululing/persistence.v1.json
```

可用以下命令查看：

```bash
ls -la ~/Library/Application\ Support/com.damon.jijirululing/
cat ~/Library/Application\ Support/com.damon.jijirululing/persistence.v1.json
```

这个 JSON 文件至少包含：

- 历史记录 `history`
- 当前未完成轮次 `currentSession`
- 应用设置 `settings`
- 数据版本 `version`
- 创建和更新时间

如果文件损坏，应用会尝试保留备份，备份文件形如：

```text
persistence.v1.corrupt-<timestamp>.json
```

## 备份数据

推荐备份整个目录：

```text
~/Library/Application Support/com.damon.jijirululing/
```

最低限度也要备份：

```text
persistence.v1.json
```

备份前建议先退出应用，避免刚好遇到写入中的状态。

设置页的“导出完整备份”适合做完整运行状态备份，包含历史、当前未完成轮次和设置。

历史记录的“导出历史”功能适合做可读历史备份；它只包含历史记录，不包含当前未完成轮次和全部设置。

## 恢复数据

恢复前先退出应用。

如果要恢复完整桌面数据：

1. 在设置页点击“导入完整备份”。
2. 选择之前由本应用导出的完整备份 JSON。
3. 在确认弹窗中确认覆盖。
4. 检查历史、设置和未完成轮次是否符合预期。

如果应用无法正常打开，也可以手动恢复：

1. 退出应用。
2. 备份当前 `~/Library/Application Support/com.damon.jijirululing/`。
3. 把之前备份的 `persistence.v1.json` 放回该目录。
4. 重新打开应用。
5. 检查历史、设置和未完成轮次是否符合预期。

如果恢复后应用提示数据异常，不要立刻删除备份。先保留当前目录和异常文件，再排查 JSON 内容。

## 重置数据

如果想从空状态重新开始，不要直接删除数据。推荐先把目录改名备份：

```text
~/Library/Application Support/com.damon.jijirululing.backup
```

再重新打开应用。应用会创建新的空数据文件。

确认新状态可用后，再决定是否删除旧备份。

## 安装后冒烟检查

每次替换自用 `.app` 后，至少检查：

- 应用能启动，初始窗口尺寸接近 `960 × 760`。
- 菜单栏右侧有简化香炉 template icon。
- 创建 1-3 项任务后进入完整主祭台。
- 点击目标性符箓后，先确认，再播放燃烧动画，再开始倒计时。
- 进行中选择“保留并收起”后，小窗只显示香炉。
- 小窗点击香炉能回到完整窗口，且不改变业务状态。
- 单炷结束时系统通知和钟声在正确时间触发。
- 全部香完成后停留完成态，用户主动进入复盘。
- 保存复盘后历史记录存在。
- 设置页“版本信息”与本次 `SELF_USE_RELEASE_LOG.md` 记录一致。
- 设置页能导出完整备份 JSON。
- 设置页导入完整备份前会先确认，确认后历史、未完成轮次和设置被替换。
- 退出并重新打开后，历史、设置和未完成轮次能恢复。

## 当前仍不覆盖

- 正式通知图标。
- DMG。
- 代码签名。
- notarization 公证。
- 自动更新。
- 面向他人的安装引导。

## 2026-06-21 当前自用安装状态

- 当前安装于 `~/Applications/急急如律令.app` 的版本为 `2640e47`，版本号 `0.2.0`，Bundle ID `com.damon.jijirululing`。
- 本轮内容是允许用户在第一张符箓开始燃烧前继续调整计时设置；符箓燃烧开始后，本轮计时模式仍锁定。
- `npm run check:release-self-use`、`npm run check:compact` 和 `npm run tauri:build` 均通过；安装 bundle 二进制 SHA-256 与工作区构建产物一致，均为 `a5a36eab92fe2f5206d135bf4c236628cde7270c35288fd81a576806e17348b2`。
- 本次安装前 `/Users/damon/Applications/急急如律令.app` 不存在，因此没有旧 `.app` 需要备份；真实 app data 已只读备份到 `/Users/damon/backups/jiji-rululing-backup-v0.2.0-2640e47-20260621-150057/`。
- 安装后未启动 `.app` 走真实业务闭环；真实 `persistence.v1.json` 只读核对显示数据版本 `1`，历史 24 条，无待恢复轮次。
- 回滚时先退出应用，再移走当前 `~/Applications/急急如律令.app`；如数据异常，恢复上述 `/Users/damon/backups` 备份目录中的 `app-data/` 或 `persistence.v1.json`。如需回到旧程序版本，需要从对应旧提交重新构建，或使用另行保存的旧 bundle。

## 2026-06-16 当前自用安装状态

- 当前长期自用基线为 `b97c1da`，安装于 `~/Applications/急急如律令.app`。
- 本轮更新填写页和复盘页体验：填写页会在用户修正执行意图后清理旧错误；复盘页主路径前置“本次完成度 / 一句复盘 / 保存复盘”，空复盘错误绑定到主 textarea；“创建任务”和“放弃本轮”降为次要操作。
- `npm run check:release-self-use`、`npm run check:compact`、`npm run tauri:build` 和 `git diff --check` 均通过；`artifacts/frontend-review-after/` 保留了本轮前端整改复查截图，`artifacts/compact-window.png` 为小窗回归截图。
- 安装后实际进程从 `~/Applications/急急如律令.app/Contents/MacOS/jiji-rululing` 启动；版本 `0.2.0`，Bundle ID `com.damon.jijirululing`，数据版本 `1`。
- 新安装二进制 SHA-256 为 `06814023f218b47501afc17e8e7010b88f284cf7904ac5bed273f0c2b26ab50a`，与工作区构建产物一致。
- bundle 仍为 linker-signed ad-hoc 内部包；严格资源封印校验仍报告 `code has no resources but signature indicates they must be present`，与上一版内部包状态一致，不视为 Developer ID 签名或公证通过。
- 安装前、安装后及启动后真实 `persistence.v1.json` SHA-256 均为 `be8a5f5b2e261a9322631ab713a8f1241f022ebeae3bdd293fdc41b9d1283a24`；历史 5 条，无待恢复轮次。
- 安装前备份位于 `/Users/damon/backups/jiji-rululing-backup-v0.2.0-b97c1da-20260616-205933/`；旧 bundle 另保留为 `/Users/damon/backups/急急如律令.app.backup-20260616-205933`。
- 回滚时先退出当前应用，移走新 bundle，再把上述时间戳旧 bundle 移回 `~/Applications/急急如律令.app`；数据异常时恢复 `/Users/damon/backups` 中对应备份的 `app-data/` 或 `persistence.v1.json`。

## 2026-06-15 自用安装状态（历史记录）

- 当前长期自用基线为 `60f41ad`，安装于 `~/Applications/急急如律令.app`。
- 本轮更新小窗线香香脚、可燃区与炉口前后遮挡关系；`npm run check:release-self-use`、`npm run check:compact`、`npm run tauri:build` 和 `git diff --check` 均通过。
- 安装后实际进程从 `~/Applications/急急如律令.app/Contents/MacOS/jiji-rululing` 启动；版本 `0.2.0`，Bundle ID `com.damon.jijirululing`，数据版本 `1`。
- 新安装二进制 SHA-256 为 `188f604d3e066f8832a40ad44f445147261657114fe81d252abf9681bd174e3e`，与工作区构建产物一致。
- bundle 仍为 linker-signed ad-hoc 内部包；工作区、新安装包和上一版备份包执行严格资源封印校验时都会得到相同提示，不影响当前本机启动，但不能视为 Developer ID 签名或公证通过。
- 安装前后及启动后真实 `persistence.v1.json` SHA-256 均为 `53eed70ff790eb950948daa639d812b2ff42d2948a7859d5b6f29c27e4212b93`；历史 2 条，无待恢复轮次。
- 安装前备份位于 `/Users/damon/backups/jiji-rululing-backup-v0.2.0-60f41ad-20260615-153456/`；旧 bundle 另保留为 `/Users/damon/backups/急急如律令.app.backup-20260615-153456`。
- 回滚时先退出当前应用，移走新 bundle，再把上述时间戳旧 bundle 移回 `~/Applications/急急如律令.app`；数据异常时恢复 `/Users/damon/backups` 中对应备份的 `app-data/` 或 `persistence.v1.json`。
- 2026-06-16 已将现有备份集中迁移到 `/Users/damon/backups`；Desktop 和 `~/Applications/*.backup-*` 下不再保留本应用备份。此前记录的 `~/个人应用/bundle/macos/急急如律令.app` 旧包路径已不存在，当前程序回滚以 `/Users/damon/backups/急急如律令.app.backup-20260615-153456` 为准。

## 2026-06-14 自用安装状态（历史记录）

- 当前长期自用基线为 `6c09f11`，安装于 `~/Applications/急急如律令.app`。
- 安装后已核对版本 `0.2.0`、Bundle ID `com.damon.jijirululing`、桌面数据版本 `1`、历史数量和待恢复轮次。
- 2026-06-14 已完成真实短核心路径：历史由 1 条增至 2 条，复盘成功落盘，`currentSession` 为 `null`。
- 安装前备份位于 `/Users/damon/backups/jiji-rululing-backup-v0.2.0-6c09f11-20260613-203647/`，包含原始 app data 目录、单独 `persistence.v1.json` 和完整备份 JSON。
- 2026-06-14 当时曾记录 `aa102a2` 旧包位于 `~/个人应用/bundle/macos/急急如律令.app`；2026-06-16 盘点时该路径已不存在。当前程序回滚以 `/Users/damon/backups/急急如律令.app.backup-20260615-153456` 为准，完整证据和数据回滚步骤见 `SELF_USE_RELEASE_LOG.md`。

## 2026-06-01 自用安装恢复准备（历史记录）

- `npm run check:release-self-use` 已通过。
- `npm run release:self-use-summary` 已输出当前 `3a0df1c` 摘要。
- 已重新执行 `npm run tauri:build`，工作区 bundle 为 `src-tauri/target/release/bundle/macos/急急如律令.app`。
- 工作区 bundle 的 `CFBundleIdentifier` 为 `com.damon.jijirululing`，`CFBundleVersion` 和 `CFBundleShortVersionString` 均为 `0.2.0`，`CFBundleIconFile` 为 `急急如律令.icns`。
- 包内 ICNS 为 `1024px × 1024px`，SHA-256 为 `1732212ad209c6ec761ab0a46ff965480e713e5be7a4102f232b8e81ef14ee9c`；包内 `Contents/MacOS/jiji-rululing` 存在且可执行。
- 截至 2026-06-01，`/Users/damon/Applications/急急如律令.app` 当时不存在。
- 该轮当时未复制、覆盖、移动或删除任何日常自用 `.app`，安装仍需用户明确授权。
- 通知横幅仍可能显示旧红色圆形占位图。本问题没有标记为解决，当前仅按最低优先级已知问题保留。
