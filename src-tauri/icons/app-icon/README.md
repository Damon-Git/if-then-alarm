# 应用图标

本目录用于应用图标资产。

## 用途

- Dock 图标。
- `.app` 图标。
- 应用包和系统应用列表图标。
- Tauri 默认窗口图标。

## 当前文件

- `placeholder-icon.png`：临时占位图标，只用于内部 `.app` 冒烟和开发构建。

该文件是 `128px × 128px` RGBA PNG，不是正式图标，不代表最终品牌方向。`src-tauri/tauri.conf.json` 当前把它配置到 `bundle.icon`；`src-tauri/src/main.rs` 还会临时把默认应用图标回退给菜单栏 tray icon。

## 下一阶段输入

- 准备一张 `1024px × 1024px` 的 `app-icon-v1.png` 源图，用于下一轮应用图标 v1 接入。
- 接入前先移除 `default_window_icon()` 到 tray icon 的临时回退，避免把正式彩色应用图标当作菜单栏 template icon。
- 内部 `.app` 阶段先把 `bundle.icon` 切到新的源 PNG，并确认构建产物中的 `.icns`、Dock、`.app` 和系统通知识别表现。
- 完整 iconset 和其他平台输出留到正式发布准备阶段生成。

## 未来验收标准

- 至少覆盖 macOS 常用 iconset 尺寸，包含 16、32、64、128、256、512 和 1024 规格。
- Dock 中小尺寸可读，不依赖细小文字。
- 深色和浅色桌面背景下都能识别。
- 与菜单栏 template icon 分开验收。
- 与通知图标分开验收。

## 当前不做

- 不制作正式应用图标。
- 不生成 `.icns` 或完整 iconset。
- 不做签名、公证或正式发布验收。
