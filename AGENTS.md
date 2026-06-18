# AGENTS.md

## 项目身份

- 项目名：急急如律令 / `jiji-rululing`
- 项目目录：`20260516-IfThenAlarm`
- 初始化日期：2026-06-18
- 当前定位：优先适配 macOS 的自用 MVP 桌面小窗工具，保留 Web App 开发入口。
- 核心目标：用“符箓 + 香 + 香炉”的仪式隐喻帮助用户启动行动，不宣称宗教、玄学或超自然功效。

## 技术栈

- React + TypeScript + Vite
- Tauri 2 桌面外壳
- 普通 CSS
- Vitest 测试
- Web localStorage 与 Tauri app data JSON 持久化

## 常用命令

```bash
npm install
npm run dev
npm run build
npm run test
npm run tauri:dev
npm run tauri:build
```

专项检查：

```bash
npm run check:desktop-config
npm run check:compact
npm run check:self-use
npm run check:release-self-use
npm run check:visual-assets
npm run check:sound-assets
npm run check:tauri-persistence-recovery
npm run check:tauri-window-roundtrip
```

## 工作规则

- 默认使用中文沟通；代码、命令、变量名使用英文。
- 结论先行，说明技术决策时必须解释“为什么”和“对用户的影响”。
- 每次做会改动文件或外部状态的工作前，先读取本文件和 `MEMORY.md`。
- 如果本文件或 `MEMORY.md` 缺失，只允许先补齐这两个文件，再做其他改动。
- 学到新的架构决策、踩坑、用户纠正、外部资源位置时，主动写入 `MEMORY.md`；凭据只记录位置，不记录值。
- 改 `AGENTS.md` / `MEMORY.md` 的结构时，先改文档，再按新规则实践。
- 不自动提交 Git。
- 不覆盖用户已有改动；遇到未提交改动时先识别范围，再在自己的改动内最小化处理。

## 安全约束

- 绝不执行删除多个文件的操作，除非获得用户明确授权。
- 绝不删除任何 Git 仓库。
- Shell 命令中不要插值不可信或含特殊字符的文本。
- 敏感信息放入 `.env.local` 或系统安全位置，不进入 Git，不写入 `MEMORY.md`。

## 产品边界

- 当前优先级：流程完整、状态可靠、桌面持久化、小窗体验、通知时点。
- 视觉和声音是本项目仪式感的一部分，但不应牺牲状态可靠性。
- 历史记录当前用于回看、分析和反思，不提供一键复用。
- 当前阶段不接后端、不做云同步、不做 DMG/签名/公证/Mac App Store、不购买 Apple Developer Program。
- 在许可证、素材授权和敏感信息审计完成前，不把仓库描述为已经完成授权的开源发布。

## 代码协作约定

- 文档使用中文，文件名使用英文。
- 代码文件名使用英文。
- 业务状态流转优先参考 `docs/STATE_MACHINE.md`。
- 当前 MVP 范围优先参考 `docs/MVP_SCOPE.md`。
- 桌面行为和 Tauri 边界优先参考 `docs/TAURI_DESKTOP_CHECKLIST.md`、`docs/TAURI_MIGRATION_PLAN.md` 与相关 runbook。
- 视觉调整优先遵守 `docs/APP_VISUAL_STYLE_GUIDE.md`、`docs/VISUAL_COMPONENT_CONTRACTS.md` 和 `docs/VISUAL_ASSET_BOUNDARIES.md`。
- 不把复杂视觉状态直接烘焙进业务状态；视觉语义应通过 `src/lib/visualState.ts` 等集中映射层表达。
- 涉及持久化、恢复、计时、历史、复盘、通知的改动必须优先考虑回归风险，并尽量补充或运行相关测试。
