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

## 当前基线

### 2026-05-25 · v0.2.0 · 内部自用版

- 状态：长期自用候选基线；自动检查和 `.app` 构建已通过，待手动验收和备份。
- Git 提交：aa102a2。
- 构建产物：`src-tauri/target/release/bundle/macos/急急如律令.app`。
- Bundle ID：`com.damon.jijirululing`。
- Rust crate：`jiji-rululing v0.2.0`。
- 数据版本：`persistence.v1.json` / `version: 1`。
- 自动检查：`npm run check:release-self-use` 已通过；`npm run tauri:build` 已通过；Info.plist 版本为 `0.2.0`。
- 手动验收：发布前按 `SELF_USE_REGRESSION_RUNBOOK.md` 填写。
- 完整备份：替换自用 `.app` 前填写备份文件位置。
- 已知问题：发布前填写或写“无阻断问题”。
- 回滚方式：退出应用，换回上一版 `.app`；如数据异常，恢复替换前备份的 `persistence.v1.json` 或完整备份 JSON。

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
