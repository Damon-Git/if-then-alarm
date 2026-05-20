# 桌面 JSON 持久化规格

本文定义 Tauri 桌面版使用 app data JSON 文件持久化的第一版规格。当前阶段已实现纯函数 schema 层和 Tauri 桌面文件 adapter。

## 目标

桌面版应把历史记录、当前未完成轮次和设置写入 Tauri app data 目录，避免长期依赖 WebView `localStorage`。

第一版目标：

- 使用单个 JSON manifest 文件。
- 启动时加载到内存缓存 adapter。
- 业务层继续使用同步 `PersistenceAdapter` 接口。
- 写入时由桌面 adapter 异步落盘。
- 首次迁移时读取旧 `localStorage` 数据，但不立即删除旧数据。

## 文件位置

目标目录：Tauri app data dir。

建议文件名：

```text
persistence.v1.json
```

当前 macOS 开发环境可用以下路径查看：

```bash
ls -la ~/Library/Application\ Support/com.damon.jijirululing/
cat ~/Library/Application\ Support/com.damon.jijirululing/persistence.v1.json
```

说明：

- 文件名带 `v1`，便于未来并行保留新旧格式。
- 不把数据写进项目目录。
- 不把数据写进用户可见下载目录。
- 不依赖当前工作目录。

未来代码实现时，路径解析应集中在桌面持久化 adapter 或迁移模块里，不进入 React 组件。

## 文件结构

```ts
type DesktopPersistenceJson = {
  version: 1;
  createdAt: string;
  updatedAt: string;
  migratedAt?: string;
  migrationSource?: "localStorage" | "empty" | "desktop-json";
  history: HistoryRecord[];
  currentSession: PersistedSession | null;
  settings: AppSettings;
};
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `version` | 桌面持久化文件版本，第一版固定为 `1` |
| `createdAt` | 文件首次创建时间 |
| `updatedAt` | 最近一次写入时间 |
| `migratedAt` | 如果由旧 `localStorage` 迁移而来，记录迁移时间 |
| `migrationSource` | 文件来源，用于排查数据问题 |
| `history` | 历史记录数组 |
| `currentSession` | 当前未完成轮次，没有则为 `null` |
| `settings` | 应用设置 |

## 默认值

当桌面 JSON 文件不存在，且旧 `localStorage` 中没有有效数据时，创建默认文件：

```ts
const defaultDesktopPersistenceJson: DesktopPersistenceJson = {
  version: 1,
  createdAt: now,
  updatedAt: now,
  migrationSource: "empty",
  history: [],
  currentSession: null,
  settings: {
    timerMode: DEFAULT_TIMER_MODE,
  },
};
```

## 和现有 key 的映射

现有 `PersistenceAdapter` 使用三个 key：

| key | JSON 字段 |
| --- | --- |
| `jiji-rululing.history` | `history` |
| `jiji-rululing.current-session` | `currentSession` |
| `jiji-rululing.settings` | `settings` |

桌面 adapter 对外仍应支持 `getItem` / `setItem` / `removeItem`：

- `getItem("jiji-rululing.history")` 返回 `JSON.stringify(file.history)`。
- `getItem("jiji-rululing.current-session")` 返回 `JSON.stringify(file.currentSession)`，如果为 `null` 则返回 `null`。
- `getItem("jiji-rululing.settings")` 返回 `JSON.stringify(file.settings)`。

这样现有 `storage.ts`、`sessionStorage.ts`、`settingsStorage.ts` 可以先不改成异步 API。

## 启动加载流程

建议启动流程：

1. Tauri app 启动。
2. 解析 app data 目录下的 `persistence.v1.json`。
3. 如果文件存在且有效：
   - normalize 数据；
   - 写入内存缓存 adapter；
   - 后续业务从内存缓存读取。
4. 如果文件不存在：
   - 读取旧 `localStorage` 三个 key；
   - normalize 成 `DesktopPersistenceJson`；
   - 写入 app data JSON 文件；
   - 同时写入内存缓存 adapter。
5. 如果文件存在但损坏：
   - 不覆盖损坏文件；
   - 备份损坏文件；
   - 尝试从旧 `localStorage` 恢复；
   - 如果旧数据也无效，则创建空默认文件。

## 写入流程

任何业务写入仍先进入同步 `PersistenceAdapter`：

1. `setItem` 或 `removeItem` 更新内存缓存。
2. 将内存缓存转换成 `DesktopPersistenceJson`。
3. 更新 `updatedAt`。
4. 异步写入临时文件。
5. 临时文件写入成功后，替换 `persistence.v1.json`。

建议采用原子写入策略：

```text
persistence.v1.json.tmp -> persistence.v1.json
```

如果写入失败：

- 内存缓存暂时保留最新状态。
- 显示 toast 并记录日志。
- 下一次写入可以重试。

## Normalize 规则

读取桌面 JSON 或旧 `localStorage` 时，都必须 normalize。

历史记录：

- 只保留通过 `isHistoryRecord` 校验的记录。
- 按 `id` 去重。
- 按 `createdAt` 倒序排序。
- 保留 `timerMode`、`obstacleText`、`nextAdjustmentText`。

当前轮次：

- 必须符合 `PersistedSession.version = 1`。
- 无效则置为 `null`。
- 缺失 `activeTimerSegment` 时按现有兼容逻辑补为 `null`。
- 缺失 `timerMode` 时回退到 `DEFAULT_TIMER_MODE`。

设置：

- 无效则回退到 `{ timerMode: DEFAULT_TIMER_MODE }`。
- 不把开发 fixture 状态写入设置。

## localStorage 首次迁移

首次迁移只读旧数据，不清理旧数据。

建议记录：

```ts
{
  migratedAt: now,
  migrationSource: "localStorage"
}
```

如果桌面 JSON 已存在，则默认不再读取旧 `localStorage`，避免重复导入。只有未来提供显式“从旧 Web 数据重新导入”工具时，才允许再次读取旧数据。

## 损坏文件恢复

如果 `persistence.v1.json` 无法解析或 schema 无效：

1. 将原文件重命名为带时间戳的备份：

```text
persistence.v1.corrupt-YYYYMMDD-HHmmss.json
```

2. 尝试从旧 `localStorage` 生成新文件。
3. 如果旧数据无效，生成空默认文件。
4. 启动后给用户一个明确 toast：

```text
本地数据文件异常，已保留备份并尝试恢复。
```

当前阶段已接入 toast。首次从旧 `localStorage` 迁移成功、损坏文件恢复、初始化失败回退、写入失败都会给出轻量提示。

## 用户提示

当前阶段只做轻量 toast，不做独立状态面板：

| 场景 | 提示 |
| --- | --- |
| 从旧 `localStorage` 迁移成功 | `已迁移到桌面本地数据文件。` |
| 桌面 JSON 损坏并已备份恢复 | `本地数据文件异常，已保留备份并尝试恢复。` |
| 桌面持久化初始化失败 | `桌面数据文件暂不可用，本次将临时使用浏览器存储。` |
| 写入桌面 JSON 失败 | `本地数据文件写入失败，本次更改可能暂未落盘。` |

## 导入导出关系

历史导入导出仍使用 `HistoryExportPayload`，不直接导出整个 `DesktopPersistenceJson`。

原因：

- 用户可理解的备份对象是历史记录。
- 当前 session 和设置属于运行状态，不适合作为普通历史备份。
- 未来如果需要完整备份，可以另做“完整数据备份”功能。

## 代码切分状态

建议分三步实现。当前状态如下：

1. **纯函数层**
   - `desktopPersistenceSchema.ts`
   - 负责 `DesktopPersistenceJson` 类型、默认值、normalize、key 映射。
   - 不引入 Tauri API。
   - 已实现，并由 `desktopPersistenceSchema.test.ts` 覆盖默认值、旧 snapshot 迁移、坏数据降级、反向生成 snapshot。

2. **桌面文件 adapter**
   - `desktopPersistenceAdapter.ts`
   - 负责 app data 路径、读文件、写临时文件、替换文件。
   - 只在 Tauri 环境启用。
   - 已实现。前端 adapter 负责内存缓存、manifest 转换和写入排队；Rust command 负责 app data 目录读写、临时文件替换和坏文件备份。

3. **启动接线**
   - 应用启动时加载桌面 JSON 到 memory adapter。
   - Web 环境继续使用 `webPersistenceAdapter`。
   - 保持现有业务模块同步调用形态。
   - 已实现。Tauri 环境启动时优先读取 `persistence.v1.json`，文件不存在时从旧 `localStorage` 生成；浏览器环境仍使用 Web `localStorage`。

## 当前不做

- 不清理旧 `localStorage`。
- 不导出完整桌面 manifest。
- 不引入 SQLite。
- 不做用户可见的迁移状态面板。
- 不主动清理坏文件备份。
