# Tauri 迁移计划

当前项目同时保留 Web MVP 开发入口和 Tauri 桌面入口。Tauri 迁移的目标不是重做业务流程，而是在保留 React 状态机和视觉组件边界的前提下，把 Web 容器逐步换成 macOS 优先的小窗桌面外壳。

平台 API 使用点的完整清单见 `docs/PLATFORM_BOUNDARY_AUDIT.md`。Tauri 桌面小窗的手动验收路径见 `docs/TAURI_DESKTOP_CHECKLIST.md`。关闭与恢复语义见 `docs/TAURI_CLOSE_RESTORE_NOTES.md`。持久化迁移计划见 `docs/PERSISTENCE_MIGRATION_PLAN.md`，桌面 JSON 文件规格见 `docs/DESKTOP_PERSISTENCE_JSON_SPEC.md`。本文只保留迁移路线和关键决策。

## 当前可直接迁移的部分

- React + TypeScript + Vite 前端结构。
- 执行意图填写、校验、开始确认、计时、休息、续香、复盘状态机。
- `TalismanVisual`、`CenserVisual`、`IncenseVisual` 视觉组件边界。
- `src/lib/visualState.ts` 视觉状态中间层。
- `src/lib/visualAssets.ts` 素材插槽约定。
- `src/lib/timer.ts` 基于时间戳的计时推导逻辑。
- `src/lib/validation.ts` 表单校验逻辑。
- 当前 Vitest 单元测试。

这些部分应尽量保持平台无关，不直接调用 Tauri API。

## 已封装或已替换的浏览器边界

详细状态以 `docs/PLATFORM_BOUNDARY_AUDIT.md` 为准。

### 本地持久化

当前本地持久化已经通过 `src/lib/persistenceAdapter.ts` 统一访问。Web 版 adapter 仍然使用 `window.localStorage`，调用点集中在：

- `src/lib/storage.ts`：历史记录。
- `src/lib/sessionStorage.ts`：当前未完成轮次。
- `src/lib/settingsStorage.ts`：计时模式设置。

Tauri 桌面版已替换 adapter 实现，使用 app data 目录下的 `persistence.v1.json`。当前 `PersistenceAdapter` 仍保持同步接口；Tauri 桌面版采用“启动时异步加载到内存 cache，业务层继续同步读写 adapter，再异步落盘”的过渡方案，避免一次性把所有 storage 调用改成异步。浏览器环境仍使用 Web `localStorage`。

Tauri API 不应分散写进业务组件或具体存储模块。后续如果历史分析或查询能力明显变重，再评估 SQLite。

设置数据当前包含计时模式、窗口置顶开关和 Dock 显示开关。旧设置如果没有窗口置顶字段，会自动补为 `false`；如果没有 Dock 显示字段，会自动补为 `true`。

### 关闭保护与恢复

Web 环境仍使用 `beforeunload`：

- `src/App.tsx`：仪式台和复盘页离开保护。
- `src/components/SetupForm.tsx`：填写页草稿离开保护。

关闭与恢复的当前产品语义见 `docs/TAURI_CLOSE_RESTORE_NOTES.md`。Tauri 桌面端已经接入窗口关闭事件拦截：存在填写草稿、未保存轮次或复盘轮次时，先展示应用内确认弹窗，再决定关闭弹窗维持原样、放弃并退出，或保留并收起。Web 的 `beforeunload` 文案不可控，只作为 Web 开发入口的保护。

### 确认弹窗

历史记录删除和清空已经使用 `src/components/ConfirmModal.tsx`，不再依赖 `window.confirm`。后续新增危险操作时，应继续复用应用内确认弹窗，避免系统确认框破坏小窗体验。

### 历史导入导出

历史导入导出已经通过 `src/lib/fileTransferAdapter.ts` 收口。Web 版 adapter 仍使用 `Blob`、`window.URL.createObjectURL`、`document.createElement("a")` 和 `File.text()`。

Tauri 桌面版已替换 adapter 实现，使用系统文件对话框和受控文件 command：

- 导出：通过 `@tauri-apps/plugin-dialog` 选择保存路径，再调用 `write_user_text_file` 写入 JSON 文件。
- 导入：通过 `@tauri-apps/plugin-dialog` 打开 JSON 文件，再调用 `read_user_text_file` 读取内容。

导入导出的 payload schema 可以沿用 `src/lib/storage.ts`，不要改变历史数据格式。

### 前端计时器

当前 UI 刷新使用 `window.setInterval`，真实剩余时间由 `startedAt` 和 `durationSeconds` 推导。系统通知已经通过 `src/lib/notificationAdapter.ts` 接入，并在每段专注/休息开始时设置延迟提醒。Tauri 桌面端隐藏或收起窗口后，仍依赖时间戳推导和系统通知提醒。

后续还需要继续观察：

- 应用后台运行策略；
- 电脑睡眠后的恢复确认。

计时真实来源仍应保持时间戳，不应退回纯 interval 递减。

### 开发工具

当前恢复 fixture 只在 `import.meta.env.DEV` 下显示。Tauri 阶段可以继续保留，但必须确认 release 构建不可见。

## macOS 小窗路线

目标窗口形态：macOS 菜单栏弹窗式窄窗口，克制可爱，不常驻全套主祭台。

当前推进状态：

- 已保留当前 Web 页面作为快速调试入口。
- 已增加窄窗口尺寸适配验收，`compact-stage` 作为小窗仪式台。
- 已接入 Tauri 固定小窗基线，`src-tauri/tauri.conf.json` 配置 `390 × 620` 初始窗口。
- 已接入菜单栏“令”入口，用于显示或隐藏主窗口。
- 已接入可选窗口置顶设置。
- 已接入可选 Dock 显示设置，默认仍显示 Dock 图标。
- 已接入系统通知和系统文件对话框。
- 后续再做全局快捷键、更完整后台策略、DMG、签名、公证和正式发布。

小窗中用户创建几套执行意图，就显示几个 Q 版香炉槽位，最多 3 个。主祭台和小窗共享业务状态，但素材可以分为 `stage` 和 `compact` 两套。

## 图标资产边界

当前图标资产说明见 `src-tauri/icons/README.md`。

- `src-tauri/icons/app-icon/placeholder-icon.png` 仍是临时占位应用图标，只用于通过 Tauri 编译、开发验证和内部 `.app` 冒烟。
- `src-tauri/icons/menubar-icon/` 和 `src-tauri/icons/notification-icon/` 只保留接入边界，不放正式素材。
- macOS 菜单栏右侧状态区当前使用文字“令”作为临时入口，只用于验证窗口显示/隐藏。
- 应用图标、菜单栏 template icon 和通知图标未来应分开设计、分开验收。
- 当前阶段不制作正式图标，不生成 macOS iconset，不接 DMG、签名、公证和正式发布流程。

## 数据迁移策略

详细计划见 `docs/PERSISTENCE_MIGRATION_PLAN.md`。

当前数据 key：

- `jiji-rululing.history`
- `jiji-rululing.current-session`
- `jiji-rululing.settings`

当前 schema：

- 历史记录由 `HistoryRecord` 表示。
- 当前轮次由 `PersistedSession` 表示。
- 设置由 `AppSettings` 表示。

当前 Tauri 桌面持久化应遵守：

- 不直接丢弃 Web MVP 的历史数据。
- 桌面 JSON 持久化层保留 schema version。
- 导入导出 JSON 继续作为备份和跨版本迁移路径。
- 首次运行 Tauri 桌面环境时，可以从旧 `localStorage` 生成桌面 JSON。
- 迁移后不立即删除旧 `localStorage` 数据，保留回滚路径。

## 当前不做

- 不生成 DMG 或正式发布包。
- 不做签名、公证和发布流程。
- 不接全局快捷键。
- 不改现有 localStorage 数据格式。
- 不重做 UI。

## 当前 Tauri 外壳

桌面外壳文件位于 `src-tauri/`：

- `src-tauri/tauri.conf.json`：配置产品名、应用标识、Vite dev URL、前端构建产物和 `390 × 620` 初始窗口。
- `src-tauri/Cargo.toml`：声明 Rust/Tauri 依赖，并启用 `tray-icon` feature。
- `src-tauri/src/main.rs`：启动默认 Tauri 应用，注册 notification 和 dialog plugin，暴露桌面持久化与用户文件读写 command，并创建菜单栏入口。
- `src-tauri/capabilities/default.json`：为主窗口启用默认核心权限、Dock 显示权限、窗口关闭/收起权限、窗口置顶权限、通知权限和文件对话框权限，后续能力按功能逐项添加。
- `src-tauri/icons/app-icon/placeholder-icon.png`：临时占位应用图标，只用于通过 Tauri 编译和内部 `.app` 冒烟；未来需要替换为正式 macOS 应用图标。
- `src-tauri/icons/README.md`：记录应用图标、菜单栏图标和通知图标的资产边界。
- `src-tauri/icons/app-icon/`、`src-tauri/icons/menubar-icon/`、`src-tauri/icons/notification-icon/`：分别记录三类桌面图标的用途和验收标准。

运行脚本：

```bash
npm run tauri:dev
```

桌面运行需要本机已安装 Rust 工具链。当前前端已调用窗口、通知、文件对话框和桌面持久化相关 Tauri API。浏览器环境仍走 Web `localStorage` adapter；Tauri 环境会使用桌面 JSON adapter。

`npm run tauri:dev` 会先执行 `npm run dev:tauri-frontend`。这个脚本固定使用 `http://127.0.0.1:5173/`，但会先检查该端口是否已经在运行本项目的 Vite 页面：

- 如果已经运行，则复用现有前端服务，避免重复启动导致端口占用报错。
- 如果没有运行，则启动新的 Vite 服务。
- 如果 `5173` 被其他应用占用，仍应先释放端口，避免 Tauri 加载错误页面。

## 建议下一步

先按 `docs/DESKTOP_BEHAVIOR_REGRESSION.md` 和 `docs/TAURI_DESKTOP_CHECKLIST.md` 做桌面组合回归，确认窗口尺寸、滚动、弹窗遮罩、小窗香炉舞台、窗口收起、菜单栏入口、系统通知、桌面 JSON 和导入导出表现稳定。通过后再进入正式打包发布准备，或开始接入真实视觉素材。
