# 图标资产说明

当前目录用于存放 Tauri 桌面外壳需要的图标资产。应用图标 v1 已接入内部 `.app`；菜单栏和通知图标仍按独立边界推进。

## 目录结构

- `app-icon/`：应用图标。用于 Dock、`.app`、应用包、系统应用列表和默认窗口图标。
- `menubar-icon/`：菜单栏 template icon。用于 macOS 右侧状态区入口。
- `notification-icon/`：通知图标。用于系统通知展示时的图标策略记录和未来素材。

三类图标必须分开设计、分开验收。不要把应用图标、菜单栏图标和通知图标混用为同一个未验证素材。

## 当前资产

- `app-icon/app-icon-v1.png`：当前应用图标 v1 源图，用于 Dock、`.app` 和默认应用识别。
- `app-icon/app-icon-v1@2x.png`：与源图内容一致的 Retina 打包副本，用于让 Tauri bundler 把 `1024px × 1024px` 图像映射到 ICNS。
- `app-icon/placeholder-icon.png`：旧临时占位应用图标，保留用于历史追溯，不再接入 bundle。
- `menubar-icon/`：当前没有正式素材；应用仍只使用文字“令”作为临时菜单栏入口。
- `notification-icon/`：当前没有单独素材；通知中的应用识别表现随应用图标 v1 单独验收。

`app-icon/placeholder-icon.png` 不是正式品牌图标，不代表最终视觉方向，也不应作为后续 Dock、打包安装包、菜单栏或通知图标的设计基准。

## 当前菜单栏入口

当前 macOS 菜单栏右侧状态区只使用文字“令”作为临时入口。菜单栏入口不再回退到默认应用图标，也不再在没有菜单栏素材时调用 `.icon_as_template(true)`。

文字“令”继续用于验证窗口显示/隐藏、计时不中断、通知不中断等桌面行为。后续单独准备菜单栏 template icon 时，再从 `menubar-icon/` 接入专用素材。

2026-05-31 已审计正式 menubar icon v1 接入条件：仓库内没有可以直接复用的透明单色小图。彩色应用图标和仪式台分层 PNG 都不适合作为 macOS 状态栏 template icon，因此本轮不修改 Rust 接入，不擅自生成视觉资产。建议规格和后续最小接入方式见 `menubar-icon/README.md`。

## 当前不做

- 不制作正式菜单栏 template icon。
- 不制作通知图标。
- 不生成完整 macOS iconset。
- 不接 DMG、签名、公证和正式发布流程。
