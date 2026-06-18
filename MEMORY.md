# MEMORY.md

## 项目记忆

- 初始化日期：2026-06-18。
- 项目是《急急如律令》：一个优先适配 macOS 的自用 MVP 桌面小窗工具，保留 Web App 开发入口。
- 技术栈为 React、TypeScript、Vite、Tauri 2、普通 CSS、Vitest；Web 使用 localStorage，桌面使用 Tauri app data JSON。
- 产品用“符箓 + 香 + 香炉”的中国文化视觉隐喻承载执行意图和番茄钟流程；不宣称宗教、玄学或超自然功效。
- 当前核心闭环包括：创建 1-3 项任务、目标性/预防性执行意图、点击目标性符箓确认开始、专注/休息/续香、全部完成后复盘、历史记录、导入导出、设置、桌面小窗。

## 长期产品决策

- 自用优先；当前可以生成内部测试 `.app`，但不做 DMG、签名、公证、Mac App Store 上架，也不购买 Apple Developer Program。
- 开源许可证尚未确定；完成许可证、素材授权和敏感信息审计前，不应对外宣称已经完成授权的开源发布。
- 历史记录当前只服务于回看、分析和反思，不提供一键复用，以保留重新书写执行意图的行动承诺感。
- 当前阶段完整业务流程和状态可靠性高于新视觉、新声音或桌面便利能力。

## 架构与状态

- 页面阶段主要为 `setup`、`ritual`、`review`。
- 执行意图套组状态主要为 `idle`、`burning`、`resting`、`completed`。
- 当前 MVP 一次只允许一个套组处于 `burning` 或 `resting`。
- 计时模式允许在进入仪式台后继续修改，直到用户确认开始、第一张符箓进入燃烧动画；从燃烧动画开始，本轮计时模式锁定。
- 倒计时以时间戳为真实来源；运行中保存 `startedAt` 和 `durationSeconds`，恢复时根据真实经过时间计算剩余秒数。
- 视觉组件应通过语义化视觉状态接收业务状态，不要让素材逻辑直接绑定业务分支。
- 主祭台、小窗香炉、符箓、线香已有正式 v1 素材族；后续替换素材应遵守现有 manifest、插槽和组件边界。

## 开发与验证

- 常规验证优先运行 `npm run build` 和相关 Vitest。
- 涉及桌面配置时运行 `npm run check:desktop-config`。
- 涉及小窗时运行 `npm run check:compact`。
- 涉及视觉素材时运行 `npm run check:visual-assets`。
- 涉及声音资源时运行 `npm run check:sound-assets`。
- 涉及 Tauri 持久化恢复时运行 `npm run check:tauri-persistence-recovery`。
- 涉及窗口尺寸、收起、展开和位置往返时运行 `npm run check:tauri-window-roundtrip`。

## 已知工作区状态

- 2026-06-18 初始化本文件时，项目已有未提交文档改动，主要位于 `docs/` 下；后续改动不要覆盖这些用户既有改动。
- `~/.codex/templates/` 在本机当前不存在，因此本次 `AGENTS.md` / `MEMORY.md` 是根据项目扫描结果直接生成，不是从模板复制。
