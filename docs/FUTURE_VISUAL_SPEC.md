# 未来视觉迭代原则

当前阶段使用临时测试素材和必要占位元素，不制作复杂视觉和动画。后续视觉迭代必须围绕真实素材替换，而不是用 CSS 或 SVG 临时重画复杂对象。

素材目录、命名、插槽、manifest 和接入边界见 `docs/ASSET_PIPELINE.md`。视觉组件 props 契约见 `docs/VISUAL_COMPONENT_CONTRACTS.md`。

桌面小窗和 Tauri 外壳迁移见 `docs/TAURI_MIGRATION_PLAN.md`。视觉组件应继续保持平台无关，避免直接依赖 Tauri API。

桌面应用图标、菜单栏图标和通知图标的资产边界见 `src-tauri/icons/README.md`。这些图标属于桌面外壳资产，不应混入符箓、香炉、线香等仪式台视觉组件。

## 视觉状态中间层

业务状态不直接等同于素材状态。当前通过 `src/lib/visualState.ts` 把业务状态映射为视觉状态，再交给 `TalismanVisual`、`CenserVisual`、`IncenseVisual` 使用。

- 香炉视觉状态：`idle` / `active` / `resting` / `completed`
- 线香视觉状态：`pending` / `burning` / `burned` / `resting`
- 符箓视觉状态：`ready` / `disabled` / `completed`

未来替换真实素材、添加燃烧或开盖动画时，应优先扩展这个视觉状态中间层，而不是让素材组件直接读取完整业务流程。

## 符箓

1. 未来真实符箓必须使用上传好的图片模板作为背景。
2. 不允许用 CSS 或 SVG 随便重新画一个假的符箓。
3. 符箓文字应该是覆盖在图片上的文本层。
4. 情境性符箓和预防性符箓可以使用不同模板，但文本层结构应保持一致，便于组件复用。

情境性符箓和预防性符箓统一从 `src/components/TalismanVisual.tsx` 接入视觉层。未来替换真实符箓模板时，优先替换 `TalismanVisual` 内部结构和样式，不改开始确认、计时、休息、续香、复盘等业务逻辑。

`TalismanVisual` 当前预留这些图层钩子：

- `data-talisman-layer="template"`：符箓背景模板层
- `data-talisman-layer="text"`：文字覆盖层
- `data-talisman-layer="state"`：状态层，未来可用于燃烧、消失或禁用等视觉状态

## 香炉

香炉未来要拆成图层：

- 香炉主体
- 香炉盖
- 炉口
- 香灰层
- 底足

香炉开盖动画未来应该移动已有盖子素材，而不是重新画一个盖子。`lid` 必须对应香炉上方完整盖子，包括顶部钮和镂空盖面；`mouth` 只负责盖子下沿和炉口过渡区域。炉口和香灰层需要预留给线香组件定位。

小窗模式未来使用克制可爱的 Q 版香炉素材。小窗 ritual 阶段只显示用户创建的 1-3 个小香炉，并且始终单行并排；不显示主祭台、符箓、历史、设置、标题、意图摘要、说明性状态文案或灰色背景面板。小窗香炉与主祭台香炉一一对应；点击任意小窗香炉只用于展开完整窗口查看或处理完整流程，不直接开始或续香。当前实现中的小窗香炉是临时测试素材，不代表最终素材风格。

主祭台香炉和小窗香炉统一从 `src/components/CenserVisual.tsx` 接入视觉层。未来替换真实素材时，优先替换 `CenserVisual` 内部结构和样式，不改计时、开始确认、休息、续香、复盘等业务逻辑。

主祭台香炉使用 `stage` 素材族，小窗 Q 版香炉使用 `compact` 素材族。两套素材可以共享图层命名，但不能混用图片文件；主祭台不复用小窗 Q 版测试素材，小窗也不显示主祭台素材。

`CenserVisual` 当前预留这些图层钩子：

- `data-censer-layer="lid"`：香炉盖
- `data-censer-layer="mouth"`：炉口
- `data-censer-layer="ash"`：香灰层
- `data-censer-layer="body"`：香炉主体
- `data-censer-layer="feet"`：底足

## 线香

线香未来要做成独立组件，包含：

- 香体
- 香灰
- 火星
- 烟雾

线香燃烧进度应由倒计时状态驱动。当前 MVP 只保留香数和倒计时字段，为未来的视觉进度提供数据来源。

线香统一从 `src/components/IncenseVisual.tsx` 接入视觉层。当前只显示静态占位和进度数据，不做燃烧动画、香灰掉落、火星闪动或烟雾。未来要做线香燃烧、香灰、火星、烟雾时，优先替换 `IncenseVisual` 内部结构和样式，不改计时、休息、续香、复盘等业务逻辑。

线香数量必须与用户选择的香数一致。选择 1 / 2 / 3 炷香时，香炉内分别显示 1 / 2 / 3 根线香。进入计时后，从左侧第一根开始显示当前炷香进度；续香后依次推进到第二根、第三根。

`IncenseVisual` 当前预留这些图层钩子：

- `data-incense-layer="stick"`：香体
- `data-incense-layer="ash"`：香灰
- `data-incense-layer="ember"`：火星
- `data-incense-layer="smoke"`：烟雾

## 动画边界

未来动画只用于增强行动仪式感，不应干扰计时、休息、续香、复盘等核心流程。任何动画都应支持关闭或降级，保证桌面小窗长期运行时稳定、安静、低占用。

## 当前占位原则

当前临时测试素材只表达结构关系和接入链路：上方符箓、中间香炉、下方预防性符箓。占位元素不模拟复杂纹样，不制造假的符箓、香炉、线香细节。

当前 `src-tauri/icons/app-icon/placeholder-icon.png` 也是占位资产，不代表正式应用图标。macOS 菜单栏右侧的“令”字入口只用于桌面交互验证，不代表正式菜单栏 template icon。
