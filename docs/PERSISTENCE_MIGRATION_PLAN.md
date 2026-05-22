# 持久化迁移计划

本文记录从当前 Web `localStorage` 持久化迁移到 Tauri 桌面持久化的目标、数据边界和迁移原则。当前阶段已经补充内存缓存 adapter、桌面 JSON 纯函数 schema 层和 Tauri 桌面文件 adapter。浏览器环境仍使用 `localStorage`；Tauri 环境会优先使用 app data 目录下的桌面 JSON。

桌面 JSON 文件的详细规格见 `docs/DESKTOP_PERSISTENCE_JSON_SPEC.md`。

## 当前状态

当前所有业务持久化都通过 `src/lib/persistenceAdapter.ts` 进入：

- `src/lib/storage.ts`：历史记录。
- `src/lib/sessionStorage.ts`：当前未完成轮次。
- `src/lib/settingsStorage.ts`：应用设置。

当前 adapter 是同步接口：

```ts
type PersistenceAdapter = {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
};
```

当前实现是 `window.localStorage`。业务组件不应该直接读写 `localStorage`。

当前已提供的迁移准备工具：

- `createMemoryPersistenceAdapter`：创建同步内存缓存 adapter。
- `createPersistenceSnapshot`：从指定 adapter 导出已知持久化 key 的快照。
- `initializePersistenceCacheFromAdapter`：从源 adapter 初始化缓存 adapter。
- `PERSISTENCE_STORAGE_KEYS`：集中记录当前需要迁移的 key。
- `createDefaultDesktopPersistenceJson`：创建桌面 JSON 默认 manifest。
- `createDesktopPersistenceJsonFromSnapshot`：把现有 key snapshot normalize 成桌面 JSON。
- `normalizeDesktopPersistenceJson`：读取桌面 JSON 后做 schema 过滤、去重和默认值补齐。
- `createSnapshotFromDesktopPersistenceJson`：把桌面 JSON 转回现有同步 adapter 能消费的 key snapshot。
- `createDesktopPersistenceAdapter`：以同步内存 cache 承接业务读写，并把更新异步排队写回桌面 JSON 文件。
- `initializeDesktopPersistence`：Tauri 启动时加载桌面 JSON；文件不存在时从旧 `localStorage` 生成第一份 manifest。
- `getDesktopPersistenceInitializationResult` / `consumeDesktopPersistenceInitializationResult`：把启动阶段的迁移、恢复或回退状态交给应用层显示一次性提示。
- `DESKTOP_PERSISTENCE_WRITE_ERROR_EVENT`：桌面 JSON 写入失败时通知应用层显示 toast。

这些工具只在 Tauri 环境启动时切换默认 `persistenceAdapter`；非 Tauri 环境仍然指向 `webPersistenceAdapter`。

## 当前 key

| 数据 | key | 当前 schema |
| --- | --- | --- |
| 历史记录 | `jiji-rululing.history` | `HistoryRecord[]`，数组本身没有外层 version |
| 当前轮次 | `jiji-rululing.current-session` | `PersistedSession`，内部 `version: 1` |
| 设置 | `jiji-rululing.settings` | `AppSettings`，当前包含 `timerMode`、`isAlwaysOnTop`、`isDockVisible` 和 `isSoundReminderEnabled` |

历史导入导出 payload 另有 `HistoryExportPayload.version = 1`，这是备份和跨版本迁移路径，不等同于内部存储 schema。

## 迁移目标

桌面版最终应把数据写入 Tauri app data 目录，而不是依赖 WebView 的 `localStorage`。

优先目标：

1. 历史记录稳定保存。
2. 当前未完成轮次稳定保存，支持关闭、收起、重启后的恢复/丢弃。
3. 设置稳定保存。
4. 导入/导出继续作为用户可见的备份路径。

当前推荐优先级：

1. app data JSON 文件，规格见 `docs/DESKTOP_PERSISTENCE_JSON_SPEC.md`。
2. Tauri Store 插件。
3. 如果后续历史分析变重，再评估 SQLite。

当前不建议立刻上 SQLite。当前数据量小，schema 简单，先把迁移路径和备份恢复做扎实更重要。

## 迁移原则

- 不丢旧数据：首次迁移时必须读取旧 `localStorage` key。
- 不静默覆盖：如果新存储已有数据，合并历史记录时应按 `id` 去重。
- 保留回滚路径：迁移初期不要立即删除旧 `localStorage` 数据。
- 保持 schema version：新桌面存储需要外层 manifest 或每类数据明确版本。
- 保持导入/导出：JSON 导入导出继续作为用户备份、跨设备迁移和故障恢复路径。
- 不把 Tauri API 分散进业务组件：Tauri API 只进入 adapter 或迁移模块。

## 建议桌面存储形态

桌面 JSON 文件的正式第一版规格见 `docs/DESKTOP_PERSISTENCE_JSON_SPEC.md`。核心形态是 app data 目录下的单文件 manifest：

```ts
type DesktopPersistenceFile = {
  version: 1;
  migratedAt?: string;
  history: HistoryRecord[];
  currentSession: PersistedSession | null;
  settings: AppSettings;
};
```

也可以拆分为多个文件：

- `history.json`
- `current-session.json`
- `settings.json`
- `migration.json`

当前更推荐单文件 manifest，理由是数据量小、备份简单、一次性读取即可恢复应用初始状态。

## Adapter 过渡方案

当前 `PersistenceAdapter` 是同步接口，而 Tauri 文件/Store API 通常是异步接口。迁移时有两种路径：

1. 保持同步业务接口，应用启动时先异步加载桌面存储到内存 cache，再让现有模块同步读写 cache，并由 adapter 异步落盘。
2. 把 `storage.ts`、`sessionStorage.ts`、`settingsStorage.ts` 全部改成异步 API。

当前更推荐第 1 条。内存缓存 adapter 已经为这条路径做了第一步准备。理由：

- 对现有业务调用点影响小。
- `App.tsx` 初始 state 仍可保持清晰。
- 后续真正需要复杂数据查询时，再改异步或 SQLite。

## 首次迁移流程

建议流程：

1. 启动桌面应用。
2. 读取桌面 app data 文件。
3. 如果桌面文件不存在，则读取旧 `localStorage` 三个 key。
4. 将旧数据 normalize 成 `DesktopPersistenceFile.version = 1`。
5. 写入桌面 app data 文件。
6. 保留旧 `localStorage` 数据，记录 `migration.completedAt`。
7. 后续启动优先读取桌面 app data 文件。

只有在用户明确确认或多个版本稳定后，才考虑清理旧 `localStorage` 数据。

## 历史记录迁移

当前 `jiji-rululing.history` 是 `HistoryRecord[]`，没有外层 version。

迁移时应：

- 用现有 `isHistoryRecord` 规则过滤无效记录。
- 按 `id` 去重。
- 按 `createdAt` 倒序排序。
- 保留 `timerMode`、`obstacleText`、`nextAdjustmentText` 等可选字段。

未来可以考虑给内部历史存储增加外层结构：

```ts
type PersistedHistory = {
  version: 1;
  records: HistoryRecord[];
};
```

但这不应破坏现有导入/导出 payload。

## 当前轮次迁移

当前 `jiji-rululing.current-session` 已有 `version: 1`。

迁移时应继续复用：

- `loadPersistedSession`
- `resolvePersistedSession`
- `isTimerRestorable`

如果旧 session 已超时，仍由现有恢复逻辑决定显示烧完提醒、休息结束提醒或进入复盘。

## 设置迁移

当前 `jiji-rululing.settings` 包含：

```ts
type AppSettings = {
  isAlwaysOnTop: boolean;
  isDockVisible: boolean;
  isSoundReminderEnabled: boolean;
  timerMode: "dev" | "prod";
};
```

迁移时应：

- 无有效设置时回退到 `DEFAULT_TIMER_MODE`。
- 旧设置缺失 `isAlwaysOnTop` 时补为 `false`。
- 旧设置缺失 `isDockVisible` 时补为 `true`。
- 旧设置缺失 `isSoundReminderEnabled` 时补为 `false`，避免升级后默认发声。
- 不把开发 fixture 开关写进正式设置。
- 后续如果继续加入更复杂的通知策略，需要评估给设置加 version 或外层 persisted settings。

## 手动验收清单

真正实现桌面持久化 adapter 时，至少验收：

- 旧 Web/localStorage 历史能迁移到桌面存储。
- 旧 Web/localStorage 当前轮次能迁移并恢复。
- 旧 Web/localStorage 设置能迁移。
- 桌面存储已有数据时，不重复导入旧历史。
- 保存复盘后重启，历史仍存在。
- 进行中轮次收起/退出后重启，恢复提示仍正确。
- 计时模式切换后重启仍保留。
- 导出 JSON 后能重新导入。
- 首次迁移成功时出现一次 toast。
- 损坏文件恢复时出现一次 toast。
- 写入失败时出现错误 toast。

macOS 开发环境可用以下命令定位桌面 JSON 文件：

```bash
ls -la ~/Library/Application\ Support/com.damon.jijirululing/
cat ~/Library/Application\ Support/com.damon.jijirululing/persistence.v1.json
```

## 当前不做

- 不引入 Tauri Store 插件。
- 不引入 SQLite。
- 不清理旧 `localStorage` 数据。
- 不提供用户可见的“重新从旧 Web 数据导入”按钮。
- 不提供完整 manifest 导入导出。
