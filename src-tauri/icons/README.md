# 图标资产说明

当前目录用于存放 Tauri 桌面外壳需要的图标资产。应用图标 v1 已接入内部 `.app`，菜单栏 template icon v1 已接入 Rust tray；通知图标仍按独立边界推进。

## 目录结构

- `app-icon/`：应用图标。用于 Dock、`.app`、应用包、系统应用列表和默认窗口图标。
- `menubar-icon/`：菜单栏 template icon。用于 macOS 右侧状态区入口。
- `notification-icon/`：通知图标。用于系统通知展示时的图标策略记录和未来素材。

三类图标必须分开设计、分开验收。不要把应用图标、菜单栏图标和通知图标混用为同一个未验证素材。

## 当前资产

- `app-icon/app-icon-v1.png`：当前应用图标 v1 源图，用于 Dock、`.app` 和默认应用识别。
- `app-icon/app-icon-v1@2x.png`：与源图内容一致的 Retina 打包副本，用于让 Tauri bundler 把 `1024px × 1024px` 图像映射到 ICNS。
- `app-icon/placeholder-icon.png`：旧临时占位应用图标，保留用于历史追溯，不再接入 bundle。
- `menubar-icon/menubar-icon-v1.png`：`16px × 16px` 透明单色简化香炉剪影，用于 1x 菜单栏验收。
- `menubar-icon/menubar-icon-v1@2x.png`：与 1x 轮廓一致的 `32px × 32px` Retina 菜单栏素材，用于 Rust tray 接入。
- `notification-icon/`：当前没有单独素材；通知中的应用识别表现随应用图标 v1 单独验收。

`app-icon/placeholder-icon.png` 不是正式品牌图标，不代表最终视觉方向，也不应作为后续 Dock、打包安装包、菜单栏或通知图标的设计基准。

## 应用图标视觉基准

当前应用图标的视觉基准为米纸底、淡墨山水、月形和亮金聚焦符箓线稿。符箓是小尺寸下的主识别点，山水、月形、香和印章只承担清幽氛围。后续应用图标迭代应继续保持大块留白、低饱和背景和高对比中心符号，避免回到大红底、高光香炉、火焰闪光、厚重拟物或复杂庙宇装饰。

这个视觉基准只约束彩色应用图标。菜单栏仍使用独立透明单色 template icon，由 macOS 根据深浅菜单栏着色；通知图标如未来单独制作，也必须另行验收，不能直接复用未验证的应用图标或菜单栏图标。

## 当前菜单栏入口

当前 macOS 菜单栏右侧状态区使用专用透明单色简化香炉剪影。Rust 侧通过 `tauri::include_image!` 嵌入 `menubar-icon-v1@2x.png`，并调用 `.icon(...)` 和 `.icon_as_template(true)`，由 macOS 适配深色和浅色菜单栏。

菜单栏入口不再回退到默认应用图标，也不复用彩色应用图标、通知图标或仪式台分层 PNG。原有窗口显示/隐藏、计时不中断和通知不中断行为保持不变。

2026-05-31 已补齐正式 menubar icon v1 素材并接入 Rust tray。设计和验收约束见 `menubar-icon/README.md`。

## 当前不做

- 不制作通知图标。
- 不生成完整 macOS iconset。
- 不接 DMG、签名、公证和正式发布流程。
