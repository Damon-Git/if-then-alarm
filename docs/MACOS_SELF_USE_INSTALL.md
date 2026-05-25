# macOS 自用安装与数据恢复手册

本文记录如何把当前内部 `.app` 作为个人日常自用版本使用，以及数据如何备份、恢复和重置。它不是正式发布说明，不包含签名、公证、DMG、自动更新或面向他人分发。

## 适用范围

- 只用于本人或受信任开发环境的 macOS 自用。
- 产物来自本仓库本地构建。
- 数据保存在 Tauri app data 目录，不保存在 `.app` 包内部。
- 替换 `.app` 不应删除历史、当前轮次或设置。

## 构建前检查

准备生成一个可以继续自用的版本前，先执行：

```bash
npm run test
npm run build
npm run check:desktop-config
npm run check:self-use
```

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
- 菜单栏右侧有临时“令”入口。
- 创建 1-3 套执行意图后进入完整主祭台。
- 点击情境符箓后，先确认，再播放燃烧动画，再开始倒计时。
- 进行中选择“保留并收起”后，小窗只显示香炉。
- 小窗点击香炉能回到完整窗口，且不改变业务状态。
- 单炷结束时系统通知和钟声在正确时间触发。
- 全部香完成后停留完成态，用户主动进入复盘。
- 保存复盘后历史记录存在。
- 设置页能导出完整备份 JSON。
- 设置页导入完整备份前会先确认，确认后历史、未完成轮次和设置被替换。
- 退出并重新打开后，历史、设置和未完成轮次能恢复。

## 当前仍不覆盖

- 正式应用图标。
- 正式菜单栏 template icon。
- 正式通知图标。
- DMG。
- 代码签名。
- notarization 公证。
- 自动更新。
- 面向他人的安装引导。
