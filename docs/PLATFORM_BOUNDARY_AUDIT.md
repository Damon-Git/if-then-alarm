# 平台边界审计

本文件记录当前 Web MVP 中仍然涉及浏览器或平台 API 的位置，以及它们在 Tauri 迁移中的处理状态。

状态说明：

- 已封装：业务代码不直接依赖具体浏览器 API，未来主要替换 adapter 或组件实现。
- 暂时保留：当前 Web MVP 继续使用，Tauri 阶段再替换。
- 平台无关：虽然使用时间或 DOM 类型，但不构成 Tauri 阻塞。
- 测试专用：只存在于测试环境。

## 已封装

| 能力 | 当前文件 | 当前 API | 状态 | Tauri 处理 |
| --- | --- | --- | --- | --- |
| 历史、session、设置持久化 | `src/lib/persistenceAdapter.ts` | `window.localStorage` | 已封装 | 迁移计划见 `docs/PERSISTENCE_MIGRATION_PLAN.md`；JSON 规格见 `docs/DESKTOP_PERSISTENCE_JSON_SPEC.md` |
| 历史删除/清空确认 | `src/components/ConfirmModal.tsx` | React 应用内弹窗 | 已封装 | 继续复用应用内弹窗 |
| Tauri 窗口关闭拦截 | `src/lib/tauriWindow.ts` | `@tauri-apps/api/window` | 已封装 | 桌面端监听关闭事件，业务层只接收确认请求 |
| Tauri 窗口置顶 | `src/lib/tauriWindow.ts` | `@tauri-apps/api/window` | 已封装 | 桌面端按用户设置调用 `setAlwaysOnTop` |
| 桌面计时通知 | `src/lib/notificationAdapter.ts` | `@tauri-apps/plugin-notification`、`window.setTimeout` | 已封装 | 通过 adapter 延迟发送和取消当前计时段通知 |
| 菜单栏入口 | `src-tauri/src/main.rs` | Tauri `TrayIconBuilder` | 已封装 | Rust 侧创建菜单栏入口并切换主窗口显示/隐藏 |
| 历史导出 | `src/lib/fileTransferAdapter.ts` | Web：`Blob`、临时下载链接；Tauri：系统保存面板和 `write_user_text_file` command | 已封装 | 浏览器保留 Web 下载；桌面端使用原生保存面板 |
| 历史导入读取 | `src/lib/fileTransferAdapter.ts` | Web：`File.text()`；Tauri：系统打开面板和 `read_user_text_file` command | 已封装 | 浏览器保留文件 input；桌面端使用原生打开面板 |

## 暂时保留

| 能力 | 当前文件 | 当前 API | 状态 | Tauri 处理 |
| --- | --- | --- | --- | --- |
| 仪式台/复盘 Web 离开保护 | `src/App.tsx` | `beforeunload` | 暂时保留 | Web 版保留；Tauri 桌面端已走窗口关闭事件拦截 |
| 填写页草稿 Web 离开保护 | `src/components/SetupForm.tsx` | `beforeunload` | 暂时保留 | Web 版保留；Tauri 桌面端已走窗口关闭事件拦截 |
| UI 倒计时刷新 | `src/App.tsx` | `window.setInterval`、`window.clearInterval` | 暂时保留 | 可继续用于 UI 刷新；收起窗口后的提醒由通知 adapter 补足 |
| Toast 自动消失 | `src/App.tsx` | `window.setTimeout` | 暂时保留 | 可保留；不影响桌面核心能力 |
| 开发恢复场景开关 | `src/components/SettingsPanel.tsx`、`src/lib/sessionStorage.ts` | `import.meta.env.DEV` | 暂时保留 | 保留但必须确认 release 构建不可见 |
| Web 文件选择入口 | `src/components/HistoryPanel.tsx` | `<input type="file">`、`File` | 暂时保留 | 仅浏览器环境使用；Tauri 环境由文件 adapter 接管打开文件流程 |

## 平台无关

| 能力 | 当前文件 | 当前 API | 状态 | 说明 |
| --- | --- | --- | --- | --- |
| ID 生成 | `src/App.tsx`、`src/components/SetupForm.tsx` | `crypto.randomUUID`，fallback 到 `Date.now` 和 `Math.random` | 平台无关 | WebView 和现代浏览器可用；Tauri 阶段无需优先替换 |
| 时间戳计时 | `src/lib/timer.ts` | `new Date()` | 平台无关 | 真实计时来源应继续使用时间戳，不回退到纯 interval 递减 |
| 历史时间显示和筛选 | `src/components/HistoryPanel.tsx`、`src/components/RestoreSessionModal.tsx` | `new Date()`、`Date.now()` | 平台无关 | 仅用于展示和筛选 |
| 历史导出时间戳 | `src/lib/storage.ts`、`src/App.tsx` | `new Date()` | 平台无关 | 与数据 schema 相关，应保持稳定 |

## 测试专用

| 能力 | 当前文件 | 当前 API | 状态 | 说明 |
| --- | --- | --- | --- | --- |
| localStorage mock | `src/test/setup.ts` | `Object.defineProperty(window, "localStorage")` | 测试专用 | 只用于 Vitest |
| 存储测试写入 | `src/lib/storage.test.ts`、`src/lib/sessionStorage.test.ts` | `window.localStorage` | 测试专用 | 用于构造 fixture 和清理状态 |
| 文件下载测试 | `src/lib/fileTransferAdapter.test.ts` | `document.createElement`、`window.URL.createObjectURL`、`Blob` | 测试专用 | 只验证 Web adapter 行为 |

## 当前没有使用

当前代码没有直接使用这些桌面相关能力：

- `navigator`
- 全局快捷键
- 原生文件系统 API

## 迁移优先级

1. 按 `docs/DESKTOP_PERSISTENCE_JSON_SPEC.md` 实现 app data JSON 持久化 adapter 和旧 `localStorage` 首次迁移。
2. 继续保留 Web 版 `beforeunload`，桌面端关闭拦截已先接入。
3. 后续继续接 Dock 隐藏和更完整的小窗隐藏策略。

当前不建议继续抽象 `Date`、`crypto.randomUUID` 或 UI 刷新 interval；这些不是迁移阻塞点。
