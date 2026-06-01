# 菜单栏图标

本目录用于 macOS 菜单栏 template icon。

## 用途

- macOS 右侧状态区入口。
- 用于显示或隐藏主窗口。

## 当前状态

正式 menubar icon v1 已补齐并接入 Rust tray：

- `menubar-icon-v1.png`：`16px × 16px` 透明 PNG，用于 1x 验收。
- `menubar-icon-v1@2x.png`：`32px × 32px` 透明 PNG，用于 Retina 菜单栏和 Rust 接入。

两份图片使用相同的简化香炉加单炷线香轮廓，只包含黑色不透明像素和透明区域。素材不包含彩色背景、阴影、渐变或小字。

2026-05-31 接入审计结论：

- macOS 菜单栏应使用专用 template icon，由系统适配深色和浅色菜单栏。
- `app-icon/app-icon-v1.png` 是彩色应用图标，不适合作为 template icon。
- `src/assets/visuals/` 下的香炉、线香和符箓 PNG 是仪式台分层素材，不适合作为状态栏小图。
- 正式 menubar icon v1 使用独立的透明单色小图，不复用其他资产。

## 当前接入

`src-tauri/src/main.rs` 中：

1. 使用 `tauri::include_image!("./icons/menubar-icon/menubar-icon-v1@2x.png")` 把小图嵌入二进制。
2. 在 `TrayIconBuilder` 上调用 `.icon(...)` 和 `.icon_as_template(true)`。
3. 不再设置临时 `.title("令")`。
4. 保持 tooltip、左键点击、窗口隐藏/显示和聚焦逻辑不变。

2026-06-01 已完成 release bundle 人工验收：

- 菜单栏不再显示文字“令”。
- 深色和浅色菜单栏下，简化香炉 template icon 均清晰可读。
- 点击图标可以隐藏窗口，再次点击可以恢复窗口并聚焦。
- 菜单栏点击不会改变小窗或完整窗口尺寸模式。

## 验收标准

- 使用单色 template icon，适配 macOS 深色和浅色菜单栏。
- 小尺寸下可读，不使用复杂符箓纹样或小字。
- 使用 `16px × 16px` 和 `32px × 32px` 两档透明 PNG，用黑色和透明区域定义形状；代码接入使用 `32px × 32px` 的 2x 素材。
- 不复用应用图标。
- 不复用通知图标。

## 当前不做

- 不回退到文字“令”方案。
- 不接真正贴附菜单栏图标的 popover 窗口。
