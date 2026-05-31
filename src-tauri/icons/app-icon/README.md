# 应用图标

本目录用于应用图标资产。

## 用途

- Dock 图标。
- `.app` 图标。
- 应用包和系统应用列表图标。
- Tauri 默认窗口图标。

## 当前文件

- `app-icon-v1.png`：当前应用图标 v1 源图，用于 Dock、`.app`、应用包和默认应用识别。
- `app-icon-v1@2x.png`：与源图内容一致的 Retina 打包副本。
- `placeholder-icon.png`：旧临时占位图标，保留用于历史追溯，不再接入 bundle。

`app-icon-v1.png` 是 `1024px × 1024px` RGBA PNG。Tauri bundler 通过文件名中的 `@2x` 判断 Retina 密度，因此 `src-tauri/tauri.conf.json` 把同内容的 `app-icon-v1@2x.png` 配置到 `bundle.icon`。菜单栏 tray 只保留文字“令”，不复用该应用图标。

## 当前接入

- `bundle.icon` 已切换到 `icons/app-icon/app-icon-v1@2x.png`。
- `default_window_icon()` 到 tray icon 的临时回退已移除，避免把彩色应用图标当作菜单栏 template icon。
- 内部 `.app` 阶段需要确认构建产物中的 `.icns`、Dock、`.app` 和系统通知识别表现。
- 完整 iconset 和其他平台输出留到正式发布准备阶段生成。

## 验收标准

- 至少覆盖 macOS 常用 iconset 尺寸，包含 16、32、64、128、256、512 和 1024 规格。
- Dock 中小尺寸可读，不依赖细小文字。
- 深色和浅色桌面背景下都能识别。
- 与菜单栏 template icon 分开验收。
- 与通知图标分开验收。

## 当前不做

- 不手工生成完整 iconset。
- 不做签名、公证或正式发布验收。
