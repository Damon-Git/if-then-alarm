# Tauri 迁移计划

当前项目仍以 Web MVP 为主要验证入口，同时已经加入最小 Tauri 外壳。Tauri 迁移的目标不是重做业务流程，而是在保留 React 状态机和视觉组件边界的前提下，把 Web 容器逐步换成 macOS 优先的小窗桌面外壳。

平台 API 使用点的完整清单见 `docs/PLATFORM_BOUNDARY_AUDIT.md`。本文只保留迁移路线和关键决策。

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

## 需要替换或封装的浏览器边界

详细状态以 `docs/PLATFORM_BOUNDARY_AUDIT.md` 为准。

### 本地持久化

当前本地持久化已经通过 `src/lib/persistenceAdapter.ts` 统一访问。Web 版 adapter 仍然使用 `window.localStorage`，调用点集中在：

- `src/lib/storage.ts`：历史记录。
- `src/lib/sessionStorage.ts`：当前未完成轮次。
- `src/lib/settingsStorage.ts`：计时模式设置。

Tauri 阶段应替换 adapter 实现，桌面版可使用：

- Tauri Store 插件；
- app data 目录下 JSON 文件；
- 后续如需要再迁移到 SQLite。

不应把 Tauri API 分散写进业务组件或具体存储模块。

### 关闭保护

当前使用 `beforeunload`：

- `src/App.tsx`：仪式台和复盘页离开保护。
- `src/components/SetupForm.tsx`：填写页草稿离开保护。

Tauri 阶段需要改为窗口关闭事件拦截，判断当前是否存在未保存轮次或填写草稿，再展示应用内确认弹窗。Web 的 `beforeunload` 文案不可控，不适合作为桌面最终体验。

### 确认弹窗

历史记录删除和清空已经使用 `src/components/ConfirmModal.tsx`，不再依赖 `window.confirm`。后续新增危险操作时，应继续复用应用内确认弹窗，避免系统确认框破坏小窗体验。

### 历史导入导出

历史导入导出已经通过 `src/lib/fileTransferAdapter.ts` 收口。Web 版 adapter 仍使用 `Blob`、`window.URL.createObjectURL`、`document.createElement("a")` 和 `File.text()`。

Tauri 阶段应替换 adapter 实现，改为 Tauri 文件对话框和文件系统 API：

- 导出：选择保存路径后写入 JSON 文件。
- 导入：打开文件对话框并读取 JSON。

导入导出的 payload schema 可以沿用 `src/lib/storage.ts`，不要改变历史数据格式。

### 前端计时器

当前 UI 刷新使用 `window.setInterval`，真实剩余时间由 `startedAt` 和 `durationSeconds` 推导。这个逻辑可以迁移，但 Tauri 阶段还需要补：

- macOS 通知；
- 小窗失焦或隐藏后的提醒；
- 应用后台运行策略；
- 电脑睡眠后的恢复确认。

计时真实来源仍应保持时间戳，不应退回纯 interval 递减。

### 开发工具

当前恢复 fixture 只在 `import.meta.env.DEV` 下显示。Tauri 阶段可以继续保留，但必须确认 release 构建不可见。

## macOS 小窗路线

目标窗口形态：macOS 菜单栏弹窗式窄窗口，克制可爱，不常驻全套主祭台。

建议分阶段推进：

1. 保留当前 Web 页面作为主窗口调试入口。
2. 增加窄窗口尺寸适配验收，继续打磨 `compact-stage`。
3. 接入 Tauri 后创建固定宽度小窗，优先验证尺寸、滚动、弹窗遮罩。当前 `src-tauri/tauri.conf.json` 已配置 `390 × 620` 初始窗口。
4. 再评估菜单栏或 tray 入口。
5. 最后再做置顶、隐藏 Dock、全局快捷键、系统通知。

小窗中用户创建几套执行意图，就显示几个 Q 版香炉槽位，最多 3 个。主祭台和小窗共享业务状态，但素材可以分为 `stage` 和 `compact` 两套。

## 数据迁移策略

当前数据 key：

- `jiji-rululing.history`
- `jiji-rululing.current-session`
- `jiji-rululing.settings`

当前 schema：

- 历史记录由 `HistoryRecord` 表示。
- 当前轮次由 `PersistedSession` 表示。
- 设置由 `AppSettings` 表示。

迁移到 Tauri 时应遵守：

- 不直接丢弃 Web MVP 的历史数据。
- 新持久化层要保留 schema version。
- 导入导出 JSON 继续作为备份和跨版本迁移路径。
- 如果未来从 localStorage 迁移到文件存储，应提供一次性读取旧 key 并写入新存储的迁移函数。

## 当前不做

- 不打包 macOS 应用。
- 不接系统通知。
- 不接菜单栏或 tray。
- 不接全局快捷键。
- 不改现有 localStorage 数据格式。
- 不重做 UI。

## 当前 Tauri 外壳

最小桌面外壳文件位于 `src-tauri/`：

- `src-tauri/tauri.conf.json`：配置产品名、应用标识、Vite dev URL、前端构建产物和 `390 × 620` 初始窗口。
- `src-tauri/Cargo.toml`：声明最小 Rust/Tauri 依赖。
- `src-tauri/src/main.rs`：仅启动默认 Tauri 应用，不注册业务命令。
- `src-tauri/capabilities/default.json`：只为主窗口启用默认核心权限，后续文件、通知等权限按能力逐项添加。
- `src-tauri/icons/icon.png`：临时占位应用图标，只用于通过 Tauri 编译；未来需要替换为正式 macOS 应用图标。

运行脚本：

```bash
npm run tauri:dev
```

桌面运行需要本机已安装 Rust 工具链。当前前端仍然不直接调用 Tauri API，历史、session 和设置仍走 Web localStorage adapter。

`npm run tauri:dev` 会先执行 `npm run dev:tauri-frontend`。这个脚本固定使用 `http://127.0.0.1:5173/`，但会先检查该端口是否已经在运行本项目的 Vite 页面：

- 如果已经运行，则复用现有前端服务，避免重复启动导致端口占用报错。
- 如果没有运行，则启动新的 Vite 服务。
- 如果 `5173` 被其他应用占用，仍应先释放端口，避免 Tauri 加载错误页面。

## 建议下一步

先在安装 Rust 的本机环境跑通 `npm run tauri:dev`，确认窗口尺寸、滚动、弹窗遮罩和小窗香炉舞台表现稳定。通过后再考虑系统通知、窗口关闭拦截和持久化 adapter 替换。
