# 菜单栏图标

本目录用于未来 macOS 菜单栏 template icon。

## 用途

- macOS 右侧状态区入口。
- 用于显示或隐藏主窗口。

## 当前状态

当前没有正式菜单栏图标素材。应用仍只使用文字“令”作为临时入口。

应用图标 v1 接入时，`default_window_icon()` 到 tray icon 的临时回退和无素材可处理的 `.icon_as_template(true)` 已移除。后续再从本目录接入专用菜单栏素材，并在接入 template icon 时恢复对应设置。

2026-05-31 接入审计结论：

- macOS 菜单栏应使用专用 template icon，由系统适配深色和浅色菜单栏。
- `app-icon/app-icon-v1.png` 是彩色应用图标，不适合作为 template icon。
- `src/assets/visuals/` 下的香炉、线香和符箓 PNG 是仪式台分层素材，不适合作为状态栏小图。
- 仓库内没有可以直接复用的透明单色小图，因此正式 menubar icon v1 暂未接入。

## v1 素材缺口

接入前至少补充：

- `menubar-icon-v1.png`：`16px × 16px` 透明 PNG，用于 1x 验收。
- `menubar-icon-v1@2x.png`：`32px × 32px` 透明 PNG，用于 Retina 菜单栏和 Rust 接入。

两份图片应使用相同轮廓，以黑色不透明像素和透明区域定义形状，不包含彩色背景、阴影、渐变或小字。建议优先验证简化香炉剪影或线香形态；如果使用“令”字，需要单独确认 `16px × 16px` 下仍然清晰。

## 后续最小接入

素材补齐后，在 `src-tauri/src/main.rs` 中：

1. 使用 `tauri::include_image!("./icons/menubar-icon/menubar-icon-v1@2x.png")` 把小图嵌入二进制。
2. 在 `TrayIconBuilder` 上调用 `.icon(...)` 和 `.icon_as_template(true)`。
3. 移除临时 `.title("令")`。
4. 保持 tooltip、左键点击、窗口隐藏/显示和聚焦逻辑不变。

## 未来验收标准

- 使用单色 template icon，适配 macOS 深色和浅色菜单栏。
- 小尺寸下可读，不使用复杂符箓纹样或小字。
- 优先从“令”字、香炉剪影或线香形态中提炼，但必须经过状态栏小尺寸验收。
- 推荐准备 `16px × 16px` 和 `32px × 32px` 两档透明 PNG，用黑色和透明区域定义形状；代码接入时优先使用 `32px × 32px` 的 2x 素材。
- 不复用应用图标。
- 不复用通知图标。

## 当前不做

- 不在缺少已确认素材时擅自制作或接入正式菜单栏 template icon。
- 不把当前文字“令”视为正式图标方案。
- 不接真正贴附菜单栏图标的 popover 窗口。
