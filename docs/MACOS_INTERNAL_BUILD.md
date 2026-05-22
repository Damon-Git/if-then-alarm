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
- 双击或右键打开后能启动窗口。
- 初始窗口接近 `960px × 760px`。
- 菜单栏右侧能看到临时“令”入口。
- 历史记录、设置、桌面 JSON、系统通知仍按桌面验收清单工作。

完整桌面手动验收见：

- `docs/TAURI_DESKTOP_CHECKLIST.md`
- `docs/DESKTOP_BEHAVIOR_REGRESSION.md`

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
