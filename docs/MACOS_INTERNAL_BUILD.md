# macOS 内部打包冒烟

本文记录当前阶段如何生成内部测试用 macOS `.app`。这不是正式发布流程，不包含签名、公证、DMG、安装器或正式图标验收。

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

- 构建日期：2026-05-25
- 构建命令：`npm run tauri:build`
- 构建产物：`src-tauri/target/release/bundle/macos/急急如律令.app`
- 包内可执行文件：`Contents/MacOS/jiji-rululing`
- 包内图标文件：`Contents/Resources/急急如律令.icns`
- Bundle identifier：`com.damon.jijirululing`
- Bundle version：`0.2.0`

## 当前 bundle 配置

当前 `src-tauri/tauri.conf.json` 中的 bundle 配置只面向内部 `.app` 冒烟：

```json
{
  "bundle": {
    "active": true,
    "targets": ["app"],
    "icon": ["icons/app-icon/placeholder-icon.png"]
  }
}
```

这里刻意不生成 `dmg` 或其他安装包，避免把内部冒烟误认为发布准备。

## 手动冒烟检查

生成 `.app` 后，至少检查：

- `.app` 文件存在。
- 双击或右键打开后能启动窗口；如果 macOS 拦截未签名应用，使用右键打开。
- 初始窗口接近 `960px × 760px`。
- 菜单栏右侧能看到临时“令”入口。
- 点击“进入仪式台”后先展示完整主祭台，不直接进入小窗。
- 进行中关闭确认里点击“保留并收起”后，切换到只显示香炉的小窗。
- 小窗点击香炉后能展开完整窗口，标题栏和窗口阴影恢复。
- 系统通知和声音提醒在倒计时结束时触发，不在倒计时开始时触发。
- 历史记录、设置、桌面 JSON、系统通知仍按桌面验收清单工作。
- 保存复盘后重新打开 `.app`，历史记录仍在。

当前 `.app` 不应被视为可分发安装包。它只用于内部手动打开和冒烟验证。

完整桌面手动验收见：

- `docs/TAURI_DESKTOP_CHECKLIST.md`
- `docs/DESKTOP_BEHAVIOR_REGRESSION.md`

准备用作日常自用版本时，在 `docs/SELF_USE_RELEASE_LOG.md` 记录版本、数据版本、检查结果和回滚方式。

把内部 `.app` 放进日常自用位置、替换旧版本、备份和恢复数据时，见：

- `docs/MACOS_SELF_USE_INSTALL.md`

## 当前仍是占位

- `src-tauri/icons/app-icon/placeholder-icon.png` 仍是临时占位应用图标。
- 菜单栏入口仍使用文字“令”，不是正式 template icon。
- `src-tauri/icons/menubar-icon/` 和 `src-tauri/icons/notification-icon/` 只保留接入边界，不放正式素材。

## 当前不做

- 不做正式应用图标。
- 不生成正式 macOS iconset。
- 不生成 DMG。
- 不做代码签名。
- 不做 notarization 公证。
- 不做发布渠道和自动更新。
