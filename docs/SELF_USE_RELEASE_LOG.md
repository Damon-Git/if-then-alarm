# 自用版本发布记录

本文只记录个人长期自用版本，不是公开发布 changelog。每次决定把新的 `.app` 替换到日常使用位置前，先按回归清单验证，再在这里补一条记录。

发布前先执行：

```bash
npm run check:release-self-use
npm run release:self-use-summary
```

第二个命令会打印可复制到本文的版本摘要。

## 记录原则

- 只记录已经准备日常自用的版本。
- 每条记录都要能回答：这个包是什么版本、来自哪个提交、用的什么数据版本、跑过哪些检查、如何回滚。
- 如果只是开发过程中的临时验证，不需要新增记录。
- 如果替换 `.app` 后发现阻断问题，在同一条记录里追加“问题与回滚”。

## 上一基线（回滚保留）

### 2026-05-25 · v0.2.0 · 内部自用版

- 状态：长期自用基线；已完成安装后核心路径验收。
- Git 提交：aa102a2。
- 构建产物：`src-tauri/target/release/bundle/macos/急急如律令.app`。
- Bundle ID：`com.damon.jijirululing`。
- Rust crate：`jiji-rululing v0.2.0`。
- 数据版本：`persistence.v1.json` / `version: 1`。
- 自动检查：`npm run check:release-self-use` 已通过；`npm run tauri:build` 已通过；Info.plist 版本为 `0.2.0`。
- 手动验收：2026-05-26 已按核心路径验收通过；修复并复验 Tauri hover 交互差异。
- 完整备份：`~/Desktop/jiji-rululing-backup-v0.2.0`。
- 已知问题：无阻断问题。
- 回滚方式：退出应用，换回上一版 `.app`；如数据异常，恢复替换前备份的 `persistence.v1.json` 或完整备份 JSON。

## 当前基线

### 2026-06-14 · v0.2.0 · 6c09f11 · 长期自用基线

- 状态：长期自用基线；候选验收、安装后核对和真实短核心路径均已通过。
- Git 提交：`6c09f11 fix: prepare long-term self-use candidate`。
- 构建产物：`src-tauri/target/release/bundle/macos/急急如律令.app`。
- Bundle ID：`com.damon.jijirululing`。
- Rust crate：`jiji-rululing v0.2.0`。
- 数据版本：`persistence.v1.json` / `version: 1`。
- 自动检查：`git diff --check` 通过；`npm run check:release-self-use` 通过（14 个测试文件、83 个测试用例，并通过前端构建、声音资源、8 组视觉资源、桌面配置和自用就绪检查）；`npm run check:compact` 通过；`npm run check:tauri-window-roundtrip -- --no-screenshots` 最终连续通过，验证恢复操作已实际写回隔离 JSON、两次 `390x620 -> 960x760` 往返、独立拖拽区与香炉炉身拖拽、位置保持，并确认真实桌面 JSON 逐字节不变；`npm run tauri:build` 通过。
- Web 验收：覆盖首次符箓燃烧早期/中期/结束三阶段、减少动态效果下的静态火焰与烟雾、目标性与预防性符箓 hover/focus 预览、烧香中与休息中的单信息框、完成态进入复盘、保存历史及重载后历史存在；小窗剩余时间同时验证 hover/focus 显示、离开/失焦隐藏、完整位于视口和香炉按钮垂直范围内。
- 打包版验收：使用生成的 `.app` 内部可执行文件和临时 `HOME`，未安装应用；首次燃烧、目标性符箓预览、烧香中单计时卡、小窗烟雾和位置保持均可见；完成态恢复后只有在完整窗口点击“进入复盘”才进入复盘，保存复盘文本后历史写入隔离 JSON，退出并以同一临时 `HOME` 重开后历史仍存在。
- 小窗剩余时间复验：真实 Tauri WKWebView 最初发现时间卡落到可见内容区外；修复为显式 React hover/focus 状态并把时间卡固定在香炉按钮内部区域，补充自动边界断言。2026-06-13 用户已在隔离打包版中人工确认 `MM:SS` 完整显示、没有裁剪。
- 数据安全：所有自动与打包版验收均使用临时 `HOME`；真实桌面 JSON 最终 sha256 为 `64b0ec6e0681031c7e33e4fcac4875a034424208645a94d0830a771bad8f01ba`，955 字节，修改时间未变化。
- 打包范围：bundle 目录只生成 `急急如律令.app`，未生成 DMG/PKG；未做 Developer ID 签名或公证，`codesign` 显示 `Signature=adhoc`、`TeamIdentifier=not set`；未配置自动更新。
- 安装与数据备份：2026-06-13 安装到 `~/Applications/急急如律令.app`；安装前将 app data 目录、单独 `persistence.v1.json` 和标准完整备份 JSON 保存到 `~/Desktop/jiji-rululing-backup-v0.2.0-6c09f11-20260613-203647/`。三份原始 `persistence.v1.json` 的 SHA-256 均为 `0a0a583e7efa74546e8f18f48af395ac537570e565e6c809c32ea519100640ef`。
- 安装后核对：新进程从 `~/Applications/急急如律令.app/Contents/MacOS/jiji-rululing` 启动；版本 `0.2.0`，Bundle ID `com.damon.jijirululing`，数据版本 `1`，历史 1 条，无待恢复轮次。启动后真实 JSON 哈希不变。
- 真实短核心路径：2026-06-14 用户完成并确认通过。真实历史由 1 条增至 2 条，最新记录写入时间为 `2026-06-14T00:17:36.607Z`，`currentSession` 为 `null`；完成后数据 SHA-256 为 `88780daf5592ce8f51df8764fd0437c7cf380d74ebaf1d5beda4ef01f5c84b8c`。
- 已知问题：无阻断问题。macOS“减少动态效果”系统开关未在真实 WKWebView 中单独切换，等价 CSS 媒体查询路径已由 Web 自动检查覆盖；后续安装候选前可作为非阻断视觉抽查。
- 声音复核：2026-06-13 使用临时 `HOME` 启动 `npm run tauri:dev`，确认“声音提醒”默认关闭；在设置中开启后，开发模式倒计时结束可正常听到钟声，无需代码修复，真实桌面 JSON 未接触。
- 是否安装/覆盖 app：已安装到 `~/Applications/急急如律令.app`；原 `aa102a2` 日常包仍保留在 `~/个人应用/bundle/macos/急急如律令.app`，未覆盖。
- 是否生成 DMG：否。
- 是否签名/公证：否。
- 回滚方式：退出新安装应用，移走 `~/Applications/急急如律令.app`，再从 `~/个人应用/bundle/macos/急急如律令.app` 启动 `aa102a2` 旧基线；如数据异常，恢复上述备份目录中的 `persistence.v1.json` 或导入完整备份 JSON。

## 未升基线的内部验收记录

### 2026-06-05 · v0.2.0 · d22ea70 · 长期自用基线候选验收

- 状态：长期自用基线候选验收通过但尚未安装/覆盖；未改“当前基线”，后续是否替换日常 `.app` 仍需单独决策。
- Git 提交：`d22ea70 docs(scope): reorder post-baseline development plan`。
- 构建产物：`src-tauri/target/release/bundle/macos/急急如律令.app`。
- Bundle ID：`com.damon.jijirululing`。
- Rust crate：`jiji-rululing v0.2.0`。
- 数据版本：`persistence.v1.json` / `version: 1`。
- 自动检查：`git diff --check` 通过；`npm run check:release-self-use` 通过（14 个测试文件、81 个测试用例，并通过前端构建、声音/视觉资源、桌面配置和自用就绪检查）；`npm run check:tauri-window-roundtrip -- --no-screenshots` 通过，且脚本确认真实桌面 JSON 在隔离 debug smoke 前后逐字节不变；`npm run tauri:build` 通过。
- 打包产物检查：Info.plist 中 Bundle ID 为 `com.damon.jijirululing`，版本为 `0.2.0`；bundle 目录只生成 `急急如律令.app`，未生成 DMG/PKG；未做开发者签名或公证，`codesign` 仅显示 ad-hoc/linker-signed。
- 打包版验收：使用生成的 `.app` 经 LaunchServices `open` 启动；临时备份真实 `persistence.v1.json` 后写入完成态 `currentSession` fixture；关闭恢复提示窗口后，再次打开同一 `.app` 可稳定重新看到恢复提示（本机表现为原 PID 退出并由新 PID 启动）；点击“恢复本轮”后进入完成态完整窗口；关闭完成态窗口并选择“保留并收起”后进入约 `390x620` 小窗；点击小窗香炉后恢复约 `960x760` 完整窗口；点击“进入复盘”后进入“本次复盘”；粘贴 `Packaged LaunchServices acceptance saved d22ea70` 并点击“保存复盘”后，临时历史从 24 条增至 25 条且 `currentSession` 清为 `null`；关闭并重新打开 `.app` 后，新历史仍存在。
- 数据清理：验收结束已杀掉本轮启动的打包进程，恢复原始真实 `persistence.v1.json` 内容；恢复后真实数据 sha256 为 `dcf46a62fe93ba9f54a5c9bb8b1f7e91426e9d118692bea1eec2ec68261cabc0`，历史 24 条，`currentSession: null`；本轮测试未留下真实桌面数据污染。
- 是否安装/覆盖 app：否。
- 是否生成 DMG：否。
- 是否签名/公证：否。
- 已知问题：本轮未发现阻断问题；本机通过 LaunchServices 关闭恢复提示后重新打开表现为新 PID 启动而非同 PID 重建窗口，但用户路径上恢复提示可稳定重新出现。
- 当时的回滚方式：继续使用 2026-05-25 基线；如误开该轮包后出现待恢复测试会话，退出应用并确认 `persistence.v1.json` 中 `currentSession` 状态。

### 2026-06-05 · v0.2.0 · 1a08a27 · 内部 `.app` 完成态恢复复验

- 状态：未升为新的长期自用基线；本轮针对完成态恢复窗口稳定性复验通过。
- Git 提交：`1a08a27 fix(tauri): recreate main window on reopen`。
- 构建产物：`src-tauri/target/release/bundle/macos/急急如律令.app`。
- Bundle ID：`com.damon.jijirululing`。
- Rust crate：`jiji-rululing v0.2.0`。
- 数据版本：`persistence.v1.json` / `version: 1`。
- 修复内容：Rust 侧 `show_main_window` / 托盘切换入口改为先获取或重建 `main` WebView 窗口；当恢复提示窗口被关闭导致进程仍在但主窗口不存在时，后续 reopen / 托盘入口不再只对空窗口引用静默失败。
- 自动检查：`cargo fmt --manifest-path src-tauri/Cargo.toml --check` 通过；`cargo check --manifest-path src-tauri/Cargo.toml` 通过；`npm run check:release-self-use` 通过；`npm run check:tauri-window-roundtrip -- --no-screenshots` 通过；`npm run tauri:build` 通过。
- 问题复现：使用旧打包产物和临时 HOME 写入“完成态待恢复”fixture 后，关闭恢复窗口可复现“进程仍在但 on-screen layer-0 窗口为 0”；再次 `open` 未能让原进程窗口恢复。
- 打包版复验：使用新构建 `.app`，临时备份并替换真实路径 `persistence.v1.json` 为含 24 条历史 + 完成态 `currentSession` 的 fixture；启动后关闭恢复窗口，再次打开 `.app` 可稳定看到恢复提示；恢复本轮后进入“本次复盘”；输入 `Packaged smoke review saved` 并点击“保存复盘”后，历史临时增至 25 条且 `currentSession` 清为 `null`；关闭并重新打开 `.app` 后最新历史仍存在。
- 数据清理：复验结束已杀掉测试进程并恢复原始 `persistence.v1.json`；真实数据回到 `currentSession: null`、历史 24 条。
- 是否安装/覆盖 app：否。
- 是否生成 DMG：否。
- 是否签名/公证：否。
- 已知问题：本轮未发现新的阻断问题；未做正式发布，仍未升为长期自用基线。
- 当时的回滚方式：继续使用 2026-05-25 基线；如误开该轮包后出现待恢复测试会话，退出应用并确认 `persistence.v1.json` 中 `currentSession` 状态。

### 2026-06-05 · v0.2.0 · 0971659 · 内部 `.app` 人工冒烟

- 状态：未升为新的长期自用基线；本轮打包版人工冒烟未完全通过。
- Git 提交：`0971659 copy(setup): update task creation wording`。
- 构建产物：`src-tauri/target/release/bundle/macos/急急如律令.app`。
- Bundle ID：`com.damon.jijirululing`。
- Rust crate：`jiji-rululing v0.2.0`。
- 数据版本：`persistence.v1.json` / `version: 1`。
- 自动检查：本轮执行 `npm run check:release-self-use` 通过；最终 `git diff --check` 通过；启动前工作区干净。上一轮已完成自动检查并生成上述内部 `.app`。
- 人工验收：`.app`、`Contents/MacOS/jiji-rululing`、`Contents/Info.plist` 均存在；Info.plist 中 Bundle ID 为 `com.damon.jijirululing`，版本为 `0.2.0`；首页文案确认包含“积土成山，积水成渊”“创建任务”“第 1/2/3 项任务”“目标性执行意图”“开始创造”；创建 3 项任务后进入完整仪式台，未自动进入小窗；点击目标性符箓先出现“确认开始这一套？”；点击“开始这一套”后进入开发模式计时；进行中关闭窗口出现“保留并收起”，确认后窗口切到约 `390x620` 小窗；点击小窗香炉后恢复约 `960x760` 完整窗口；三项任务可烧完并出现“本轮香尽 / 进入复盘”。
- 未完成验收：进入复盘保存历史未完成；在完成态重启并恢复会话后，曾出现打包进程存在但主窗口短时间内不可见或窗口计数为 0 的情况，导致无法稳定继续保存复盘并验证“重开后历史仍在”。
- 数据清理：本轮测试生成的未保存 `currentSession` 已确认只包含“打包验收任务”文本，并已清回 `null`；既有历史记录数量保持 24 条。
- 是否安装/覆盖 app：否。
- 是否生成 DMG：否。
- 是否签名/公证：否。
- 已知问题：完成态恢复后的窗口稳定性需要后续复查；本轮不建议把 `0971659` 打包产物替换为新的长期自用基线。
- 当时的回滚方式：继续使用 2026-05-25 基线；如误开该轮包后出现待恢复测试会话，退出应用并确认 `persistence.v1.json` 中 `currentSession` 状态。

### 2026-05-25 · v0.1.0 · 内部自用版

- 状态：开发中自用基线。
- Git 提交：发布时填写。
- 构建产物：`src-tauri/target/release/bundle/macos/急急如律令.app`。
- Bundle ID：`com.damon.jijirululing`。
- Rust crate：`jiji-rululing v0.1.0`。
- 数据版本：`persistence.v1.json` / `version: 1`。
- 自动检查：发布时填写 `npm run check:release-self-use`，必要时补充 `npm run check:compact`。
- 手动验收：发布时填写是否按 `SELF_USE_REGRESSION_RUNBOOK.md` 走完。
- 完整备份：发布时填写备份文件位置。
- 回滚方式：退出应用，换回上一版 `.app`；如数据异常，恢复替换前备份的 `persistence.v1.json` 或完整备份 JSON。

## 记录模板

```text
### YYYY-MM-DD · vX.Y.Z · 内部自用版

- 状态：
- Git 提交：
- 构建产物：
- Bundle ID：
- Rust crate：
- 数据版本：
- 自动检查：
- 手动验收：
- 完整备份：
- 已知问题：
- 回滚方式：
```
