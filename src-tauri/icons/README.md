# 图标资产说明

当前目录用于存放 Tauri 桌面外壳需要的图标资产。现阶段只整理接入边界，不制作正式图标。

## 目录结构

- `app-icon/`：应用图标。用于 Dock、`.app`、应用包、系统应用列表和默认窗口图标。
- `menubar-icon/`：菜单栏 template icon。用于 macOS 右侧状态区入口。
- `notification-icon/`：通知图标。用于系统通知展示时的图标策略记录和未来素材。

三类图标必须分开设计、分开验收。不要把应用图标、菜单栏图标和通知图标混用为同一个未验证素材。

## 当前资产

- `app-icon/placeholder-icon.png`：临时占位应用图标，只用于让 Tauri dev/build 和内部 `.app` 冒烟流程可以通过。
- `menubar-icon/`：当前没有正式素材；应用仍使用文字“令”和默认应用图标回退作为临时菜单栏入口。
- `notification-icon/`：当前没有正式素材；通知图标不做单独正式验收。

`app-icon/placeholder-icon.png` 不是正式品牌图标，不代表最终视觉方向，也不应作为后续 Dock、打包安装包、菜单栏或通知图标的设计基准。

## 当前菜单栏入口

当前 macOS 菜单栏右侧状态区使用文字“令”作为临时入口。`src-tauri/src/main.rs` 还会读取 `app.default_window_icon()`，把默认应用图标作为 tray icon，并通过 `.icon_as_template(true)` 按 template icon 处理。

这样做是为了先验证窗口显示/隐藏、计时不中断、通知不中断等桌面行为。默认应用图标回退是已知临时耦合，不是正式菜单栏图标方案，也不是未来 template icon 的素材草案。

下一阶段接入正式应用图标前，必须先移除 `default_window_icon()` 到 tray icon 的回退，继续保留文字“令”作为临时菜单栏入口。后续单独准备菜单栏 template icon 时，再从 `menubar-icon/` 接入专用素材。

## 当前不做

- 不制作正式应用图标。
- 不制作正式菜单栏 template icon。
- 不制作通知图标。
- 不生成完整 macOS iconset。
- 不接 DMG、签名、公证和正式发布流程。
