# macOS 内部打包冒烟

本文记录当前阶段如何生成内部测试用 macOS `.app`。这不是正式发布流程，不包含签名、公证、DMG、安装器或完整发布图标验收。

## 目标

- 验证前端构建、Rust release 构建和 Tauri `.app` bundle 能完整跑通。
- 提前暴露图标、权限、路径、前端产物或 Rust 配置问题。
- 只生成内部测试包，供本机或受信任开发环境手动打开验证。

## 前置条件

- 已安装 Node 依赖。
- 已安装 Rust 工具链。
- 当前工作区没有未保存的重要改动。
- 如需先做静态检查，执行 `npm run check:desktop-config`。

## 打包命令

建议先执行：

```bash
npm run check:release-self-use
```

确认基础检查通过后，再执行：

```bash
npm run tauri:build
```

该命令会先执行：

```bash
npm run build
```

然后执行 Tauri release 构建，并生成 macOS `.app` bundle。

## 产物位置

内部测试 `.app` 产物位于：

```text
src-tauri/target/release/bundle/macos/急急如律令.app
```

如果只看到 `src-tauri/target/release/jiji-rululing` 可执行文件，而没有 `.app`，说明 bundle 没有启用或 bundle target 不正确。

当前一次已验证的内部构建：

- 构建日期：2026-06-01
- Git 提交：`3a0df1c`
- 自动检查：`npm run check:release-self-use` 已通过
- 构建命令：`npm run tauri:build`
- 构建产物：`src-tauri/target/release/bundle/macos/急急如律令.app`
- 包内可执行文件：`Contents/MacOS/jiji-rululing`
- 包内图标文件：`Contents/Resources/急急如律令.icns`
- Bundle identifier：`com.damon.jijirululing`
- Bundle version：`0.2.0`
- Bundle short version：`0.2.0`
- Bundle icon：`1024px × 1024px`，SHA-256 为 `1732212ad209c6ec761ab0a46ff965480e713e5be7a4102f232b8e81ef14ee9c`

## 当前 bundle 配置

当前 `src-tauri/tauri.conf.json` 中的 bundle 配置只面向内部 `.app` 冒烟：

```json
{
  "bundle": {
    "active": true,
    "targets": ["app"],
    "icon": ["icons/app-icon/app-icon-v1@2x.png"]
  }
}
```

这里刻意不生成 `dmg` 或其他安装包，避免把内部冒烟误认为发布准备。

`app-icon-v1.png` 仍是 `1024px × 1024px` RGBA 源图。`app-icon-v1@2x.png` 是同内容的 Retina 打包副本，用于让 Tauri bundler 正确生成 ICNS。

## 手动冒烟检查

生成 `.app` 后，至少检查：

- `.app` 文件存在。
- 双击或右键打开后能启动窗口；如果 macOS 拦截未签名应用，使用右键打开。
- 初始窗口接近 `960px × 760px`。
- Dock 和 `.app` 显示应用图标 v1。
- 菜单栏右侧能看到简化香炉 template icon。
- 菜单栏 template icon 没有复用彩色应用图标。
- 点击“开始创造”后先展示完整主祭台，不直接进入小窗。
- 进行中关闭确认里点击“保留并收起”后，切换到只显示香炉的小窗。
- 小窗点击香炉后能展开完整窗口，标题栏和窗口阴影恢复。
- 小窗点击香炉展开后，完整窗口外框重新接近 `960px × 760px`，不会累计标题栏高度。
- 系统通知和声音提醒在倒计时结束时触发，不在倒计时开始时触发。
- 系统通知中的应用识别表现单独验收。
- 历史记录、设置、桌面 JSON、系统通知仍按桌面验收清单工作。
- 保存复盘后重新打开 `.app`，历史记录仍在。

当前 `.app` 不应被视为可分发安装包。它只用于内部手动打开和冒烟验证。

完整桌面手动验收见：

- `docs/TAURI_DESKTOP_CHECKLIST.md`
- `docs/DESKTOP_BEHAVIOR_REGRESSION.md`

准备用作日常自用版本时，在 `docs/SELF_USE_RELEASE_LOG.md` 记录版本、数据版本、检查结果和回滚方式。

把内部 `.app` 放进日常自用位置、替换旧版本、备份和恢复数据时，见：

- `docs/MACOS_SELF_USE_INSTALL.md`

## 当前图标边界

- `src-tauri/icons/app-icon/app-icon-v1.png` 已接入 Dock、`.app` 和默认应用识别。
- `src-tauri/icons/app-icon/app-icon-v1@2x.png` 是与源图内容一致的 Retina 打包副本。
- `src-tauri/icons/app-icon/placeholder-icon.png` 仍保留，但不再接入 bundle。
- `src-tauri/icons/menubar-icon/menubar-icon-v1.png` 和 `menubar-icon-v1@2x.png` 已接入菜单栏 template icon，不复用应用图标。
- `src-tauri/icons/notification-icon/` 只保留接入边界，不放单独素材。

## 正式 menubar icon v1 接入

2026-05-31 已补齐专用透明单色素材并修改 Rust 壳层：

- macOS 菜单栏需要专用 template icon，由系统适配深色和浅色菜单栏。
- `menubar-icon-v1.png` 是 `16px × 16px` 透明单色简化香炉剪影。
- `menubar-icon-v1@2x.png` 是同轮廓的 `32px × 32px` Retina 素材。
- Rust 使用 `tauri::include_image!` 嵌入 `menubar-icon-v1@2x.png`，调用 `.icon(...)` 和 `.icon_as_template(true)`，并移除 `.title("令")`。
- 原有 tooltip、点击行为和窗口恢复逻辑保持不变。

素材规格和命名见 `src-tauri/icons/menubar-icon/README.md`。

2026-06-01 已完成 release bundle 手动验收：

- 菜单栏不再显示文字“令”。
- 深色和浅色菜单栏下，简化香炉 template icon 均清晰可读。
- 点击图标可以隐藏窗口，再次点击可以恢复窗口并聚焦。
- 菜单栏点击不会改变小窗或完整窗口尺寸模式。

## 通知应用识别图标验收阻塞

2026-05-31 手动验收仍未通过：把工作区新 bundle 复制到 `/Users/damon/Applications/急急如律令.app`，并从该明确路径启动后，10 秒开发模式通知仍显示旧红色圆形占位图。

- 日常安装路径和工作区 bundle 的 `CFBundleIdentifier` 均为 `com.damon.jijirululing`。
- 两者的 `CFBundleIconFile` 均为 `急急如律令.icns`，ICNS 均为 `1024px × 1024px` 应用图标 v1。
- LaunchServices 仍索引 `/Users/damon/Desktop/急急如律令.app`；该旧副本仍包含 `128px × 128px` 红色圆形占位 ICNS。
- 当前阻塞记为 LaunchServices 或通知中心缓存问题。未重置通知权限，未修改系统设置，未清理系统数据库，未强杀系统进程。

### 2026-06-01 只读复查

本轮只做文件和 LaunchServices 索引检查，没有删除、移动、覆盖或重新注册任何 `.app`，也没有重置通知权限、修改系统设置、清理系统数据库或强杀系统进程。

- `/Users/damon/Desktop/急急如律令.app` 仍存在。包内 `急急如律令.icns` 为 `128px × 128px`、`17,900` bytes，SHA-256 为 `f3005664f4da601c6e7e0bde915053ee8c877b899a17df4ff610c7048b9107c0`，可视化检查仍是旧红色圆形占位图。
- 工作区 `src-tauri/target/release/bundle/macos/急急如律令.app` 仍存在。包内 `急急如律令.icns` 为 `1024px × 1024px`、`2,047,977` bytes，SHA-256 为 `1732212ad209c6ec761ab0a46ff965480e713e5be7a4102f232b8e81ef14ee9c`，是正式应用图标 v1。
- `/Users/damon/Applications/急急如律令.app` 和 `/Applications/急急如律令.app` 当前均不存在。
- LaunchServices 当前同时索引 Desktop 旧副本、工作区 release bundle 和 `/Users/damon/.Trash/急急如律令.app`。废纸篓副本仍实际存在，其 ICNS 与工作区 release bundle 的 SHA-256 一致，是正式应用图标 v1，不是旧占位图。
- `src/lib/notificationAdapter.ts` 发送通知时仍只传入 `id`、`title` 和 `body`，没有单独通知图标配置。

当前仍不能把通知应用识别图标标记为通过。日常安装路径仍是旧 bundle 已可排除；最强的本地证据是 Desktop 旧副本仍存在且仍被 LaunchServices 索引。通知中心缓存仍是次要可能，需在用户明确授权后按最小影响顺序处理并重新实测。

### 2026-06-01 局部 LaunchServices 处理

用户删除 Desktop 旧副本后，本轮按最小影响范围执行局部处理，没有重建或清理 LaunchServices 数据库，没有重置通知权限、修改系统设置或重启系统进程。

- `/Users/damon/Desktop/急急如律令.app` 已不存在。对该已删除路径执行 `lsregister -u` 返回 `-10814`，没有产生额外处理。
- LaunchServices 一度索引 `/Users/damon/.Trash/急急如律令 08.42.32.app`。精确检查确认该副本仍是旧红色圆形占位 ICNS：`128px × 128px`、`17,900` bytes，SHA-256 为 `f3005664f4da601c6e7e0bde915053ee8c877b899a17df4ff610c7048b9107c0`。
- 已对上述废纸篓旧占位副本执行局部 `lsregister -u`，并对工作区 release bundle 执行 `lsregister -f`。
- 等待复查后，LaunchServices 中 `com.damon.jijirululing` 只剩工作区 release bundle：`src-tauri/target/release/bundle/macos/急急如律令.app`。
- 已从工作区 release bundle 的精确路径启动应用，运行进程路径确认来自该 bundle。

这一步只完成 LaunchServices 旧占位候选移除。通知中心是否仍保留旧图标缓存尚未人工验证；触发下一条通知并确认系统展示正式图标 v1 后，才能把通知应用识别图标标记为通过。

### 2026-06-01 通知中心缓存确认

从工作区 release bundle 的精确路径启动应用后，已通过 10 秒开发模式触发一条新的完成通知。通知横幅仍显示旧红色圆形占位图。

- 触发通知前后复查 LaunchServices，`com.damon.jijirululing` 均只剩工作区 release bundle。
- 工作区 release bundle 的 ICNS 已确认是正式应用图标 v1。
- 因此，旧红色圆形图标不再能由 LaunchServices 中的旧 bundle 路径解释；当前最可能根因已收敛为通知中心侧缓存。
- 本轮没有重启通知中心进程，没有重置通知权限，没有修改系统设置，也没有重建或清理 LaunchServices 数据库。

通知应用识别图标 v1 仍不标记为通过。下一步如需继续，应在用户明确授权后单独重启通知中心进程，再从工作区 release bundle 精确路径重新触发通知验收。

### 2026-06-01 通知中心 UI 重启后仍复现

用户明确授权后，已尝试只重启当前用户的通知中心 UI agent：

- `launchctl kickstart -k "gui/$(id -u)/com.apple.notificationcenterui.agent"` 被 SIP 拒绝，没有重启进程。
- `launchctl kill SIGTERM "gui/$(id -u)/com.apple.notificationcenterui.agent"` 被权限检查拒绝，没有重启进程。
- 对当前用户的通知中心 UI 进程发送正常 `SIGTERM` 后，进程由 PID `716` 重新拉起为 PID `78034`。没有使用 `SIGKILL`，没有重置通知权限，没有修改系统设置，也没有重建或清理 LaunchServices 数据库。
- 从工作区 release bundle 精确路径重新触发 10 秒开发模式通知后，通知横幅仍显示旧红色圆形占位图。

LaunchServices 旧路径索引和通知中心 UI 进程内缓存均已不足以完整解释该问题。由于当前版本仅用于个人自用，通知正文和触发时机均正常，旧图标不影响核心流程，本问题自 2026-06-01 起降为最低优先级并暂缓处理。后续只有在正式发布准备或用户主动重新提升优先级时再继续排查。

## 当前不做

- 不手工生成完整 macOS iconset。
- 不生成 DMG。
- 不做代码签名。
- 不做 notarization 公证。
- 不做发布渠道和自动更新。
