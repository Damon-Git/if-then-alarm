# 视觉素材接入管线

本文件约定后续符箓、香炉、线香素材如何进入项目。当前版本已接入主祭台背景 v1、主祭台香炉 v1、小窗 Q 版香炉 v1、情境符箓 v1、预防符箓 v1、主祭台线香 v1 和小窗线香 v1；情境符箓已有约 2 秒分层燃烧退场，其他复杂动画暂不做。素材目录内的执行清单见 `src/assets/visuals/README.md`，正式素材职责边界见 `docs/VISUAL_ASSET_BOUNDARIES.md`，正式替换步骤见 `docs/VISUAL_ASSET_REPLACEMENT_CHECKLIST.md`。

## 目录结构

视觉素材统一放在 `src/assets/visuals/` 下：

```text
src/assets/visuals/
  talisman/
    situation/
    prevention/
  censer/
    stage/
    compact/
  incense/
    stage/
    compact/
```

- `talisman/situation/`：情境性符箓模板。
- `talisman/prevention/`：预防性符箓模板。
- `censer/stage/`：主祭台香炉素材。
- `censer/compact/`：macOS 菜单栏窄窗口的小窗 Q 版香炉素材。
- `incense/stage/`：主祭台线香素材。
- `incense/compact/`：小窗线香素材。

每个叶子目录都保留 `README.md`，用于记录该目录的具体用途、对应插槽和当前不做事项。

## 插槽约定

组件中的每个视觉图层都带有 `data-visual-slot`。这些插槽由 `src/lib/visualAssets.ts` 统一生成。

符箓插槽：

- `talisman/situation/template`
- `talisman/situation/state`
- `talisman/situation/text`
- `talisman/prevention/template`
- `talisman/prevention/state`
- `talisman/prevention/text`

香炉插槽：

- `censer/stage/lid`
- `censer/stage/mouth`
- `censer/stage/ash`
- `censer/stage/body`
- `censer/stage/feet`
- `censer/compact/lid`
- `censer/compact/mouth`
- `censer/compact/ash`
- `censer/compact/body`
- `censer/compact/feet`

线香插槽：

- `incense/stage/stick`
- `incense/stage/ash`
- `incense/stage/ember`
- `incense/stage/smoke`
- `incense/compact/stick`
- `incense/compact/ash`
- `incense/compact/ember`
- `incense/compact/smoke`

## Registry 约定

`src/lib/visualAssets.ts` 现在同时维护三类视觉资产契约：

- `VISUAL_ASSET_FAMILY_SPECS`：香炉和线香的源画布建议、当前渲染盒尺寸。
- `VISUAL_ASSET_REPLACEMENT_REGISTRY`：每组正式素材的目录、插槽、透明背景要求、对齐基准和禁止烘焙内容。
- `VISUAL_ASSET_REPLACEMENT_ORDER`：建议替换顺序。
- `TALISMAN_TEXT_SAFE_ZONES`：符箓左右竖排文字栏的安全区边界。

`CenserVisual` 和 `IncenseVisual` 会从 registry 读取当前渲染盒尺寸，并通过 CSS 变量传给样式层。后续真实素材如果需要微调渲染盒，优先更新 registry，再评估 CSS；不要在组件里直接写某张图片的尺寸。

## 命名建议

未来真实图片可以按插槽层级命名：

```text
src/assets/visuals/censer/stage/body.png
src/assets/visuals/censer/stage/lid.png
src/assets/visuals/censer/compact/body.png
src/assets/visuals/incense/stage/stick.png
src/assets/visuals/talisman/situation/template.png
```

同一类素材优先保持相同文件名，只通过目录区分 `stage` 和 `compact`。

真实素材进入项目时，应在对应目录更新 README，记录素材来源、用途和替换范围。当前 `censer/stage/` 已接入主祭台香炉 v1，`censer/compact/` 已接入小窗 Q 版香炉 v1，`incense/stage/` 已接入主祭台线香 v1，`incense/compact/` 已接入小窗线香 v1。

## 素材格式

- 优先使用透明背景 PNG 或 WebP。
- 符箓模板可以是完整背景图，但执行意图文字必须继续作为文本层覆盖，不要烘焙进图片。
- 符箓正式模板必须按 `TALISMAN_TEXT_SAFE_ZONES` 给左右竖排文字留出清晰安全区，中央符文不能侵入文字区。
- 香炉应拆成独立图层，至少包括主体、盖、炉口、香灰层。
- 线香应拆成独立图层，至少包括香体、香灰、火星、烟雾。
- 素材建议按 2x 导出，CSS 中按目标尺寸缩放，避免小窗下发虚。
- 文件名使用英文小写，可用短横线，不使用中文文件名。

## 小窗 Q 版香炉规格

小窗香炉当前已接入小窗 Q 版香炉 v1 PNG 素材，素材规格固定如下：

- 小窗香炉素材必须是透明背景，不允许自带白底、灰底、米色底或面板背景。
- 小窗最多显示 3 个香炉槽位，用户创建几套就显示几套，不补空位。
- 每个小窗香炉渲染框约为 `82px × 90px`，建议源素材画布为 `256px × 256px`。
- 小窗线香渲染框约为 `72px × 50px`，建议源素材画布为 `192px × 192px`。
- 视觉风格为克制可爱，不做夸张表情、强装饰边框或喧宾夺主的背景。
- 香炉主体、盖、炉口、香灰层、底足继续使用独立图层，方便未来做开盖或状态变化。
- 线香继续由 `IncenseVisual` 渲染，用户选择 1 / 2 / 3 炷香时必须分别显示 1 / 2 / 3 根线香。
- 进入计时状态时，从左侧第一炷香开始显示进度；续香后依次推进到第 2、3 炷。
- 小窗素材不包含符箓；小窗点击香炉只负责回到完整窗口，不负责启动套组。
- 小窗素材不应承载文字信息。状态、倒计时、当前香数只保留在按钮可访问性语义中。

代码中的规格锚点见 `VISUAL_ASSET_FAMILY_SPECS` 和 `COMPACT_CENSER_ASSET_REQUIREMENTS`。

## 主祭台香炉规格

主祭台香炉当前已接入主祭台香炉 v1 PNG 素材，素材规格固定如下：

- 主祭台香炉素材必须是透明背景，不允许自带祭台背景、符箓或线香。
- 主祭台香炉使用 `censer/stage` 素材族，不能复用小窗 `compact` Q 版素材。
- 主祭台香炉推荐源素材画布为 `320px × 320px`。
- 香炉主体、盖、炉口、香灰层、底足继续使用独立图层。
- `lid.png` 必须对应香炉上方完整盖子，包括顶部钮和镂空盖面；未来开盖动画只移动这一层。
- `mouth.png` 只负责盖子下沿到炉口过渡区域，不承载完整盖子。
- 线香继续由 `IncenseVisual` 渲染，不烘焙进香炉图片。
- 香炉默认开盖；只有对应执行意图的所有线香都烧完并进入 `completed` 后才闭盖。
- 闭盖状态必须隐藏线香视觉层，避免线香穿出已闭合的盖子。
- 完成态香炉必须有弱化视觉，表示该套已经收束，但不能改变香炉在桌面上的水平位置。

## 主祭台符箓退场规则

- 情境性符箓只在 `idle` 状态承担启动入口。
- 第一次确认开始后，情境性符箓播放约 2 秒分层燃烧退场：局部起燃、焦边推进、模板和文字共同灰化，最后收束消失。
- 燃烧动画结束后才正式启动第一炷香倒计时；同一套执行意图续香时，不重新显示情境性符箓，不重复播放燃烧动画。
- 当前复用模板层、文字层和状态层完成局部起燃、焦边推进和灰化收束；不新增独立业务状态，不引入高密度粒子或持续掉落碎纸。真实燃烧观感仍需通过 Web 截图和 Tauri 开发版人工验收。
- 预防性符箓在 `idle`、`burning` 和 `resting` 中可见；当该套全部线香烧完并进入 `completed` 后退场。

## 主祭台线香规格

主祭台线香当前已接入主祭台线香 v1 PNG 素材，素材规格固定如下：

- 主祭台线香素材必须是透明背景，不允许自带香炉、祭台背景或符箓。
- 主祭台线香使用 `incense/stage` 素材族，小窗线香使用 `incense/compact` 素材族。
- 主祭台线香推荐源素材画布为 `240px × 240px`。
- `stick.png`、`ash.png`、`ember.png`、`smoke.png` 继续保持独立图层。
- 线香数量由 `IncenseVisual` 按用户选择重复渲染，不为 1 / 2 / 3 炷香分别烘焙整图。
- 当前香灰高度和火星位置由倒计时进度驱动；主祭台 CSS 已接入低频火星呼吸、可辨认但克制的缓慢烟雾漂移和休息余烟，不修改素材图层边界。
- 主祭台线香 v1 由正式透明 PNG 图层组成。`smoke.png` 继续作为核心烟雾图层，CSS 只叠加 `near` / `far` 两个轻量错峰烟缕，不新增素材插槽或高负载粒子系统。
- 真实烟雾观感仍需通过 Web 截图和 Tauri 开发版人工验收。
- 2026-06-02 已完成一次动态验收：Web 开发版覆盖 1-3 套布局、`resting`、`completed` 和 `prefers-reduced-motion`；Tauri 开发版确认原生 WebView 内烟雾可辨认，完成闭盖后无持续烟雾残留。
- `scripts/generate-stage-incense-assets.mjs` 仍可按目标目录和画布尺寸生成 `stage` 或 `compact` 临时测试素材，但不代表正式视觉风格。

## 小窗线香规格

小窗线香当前已接入小窗线香 v1 PNG 素材，素材规格固定如下：

- 小窗线香素材必须是透明背景，不允许自带香炉、窗口背景或符箓。
- 小窗线香使用 `incense/compact` 素材族，不能复用主祭台 `incense/stage` 素材。
- 小窗线香推荐源素材画布为 `192px × 192px`。
- `stick.png`、`ash.png`、`ember.png`、`smoke.png` 继续保持独立图层。
- 线香数量由 `IncenseVisual` 按用户选择重复渲染，不为 1 / 2 / 3 炷香分别烘焙整图。
- 当前香灰高度和火星位置由倒计时进度驱动；烟雾只允许极弱静态显隐，不做动画。
- 休息中保留上一炷烧完状态；完成闭盖后隐藏线香。

## 接入边界

- 业务状态到视觉状态的映射只放在 `src/lib/visualState.ts`。
- 视觉插槽和素材目录约定只放在 `src/lib/visualAssets.ts` 和本文档。
- 正式素材替换范围、对齐基准和禁止烘焙内容记录在 `VISUAL_ASSET_REPLACEMENT_REGISTRY` 和 `docs/VISUAL_ASSET_REPLACEMENT_CHECKLIST.md`。
- 真实素材 URL 只通过 `src/lib/visualAssetManifest.ts` 接入。
- 接入真实素材时，优先修改 `TalismanVisual`、`CenserVisual`、`IncenseVisual` 的内部结构和 CSS。
- 不应为了接素材修改计时、复盘、历史、本地存储等业务逻辑。
- 不应在当前占位 CSS 中继续追加复杂假纹样。

## Manifest 接入

当前 `src/lib/visualAssetManifest.ts` 已登记七组正式 v1 素材。视觉组件会先查询对应 `data-visual-slot`：

- 如果 manifest 中存在 URL，则在该图层渲染 `<img>`。
- 如果 manifest 中没有 URL，则保留现有 CSS 占位图层。

接入真实素材时，应先把图片放入对应目录，再在 `visualAssetManifest` 中为对应插槽配置 URL。不要在组件里直接硬编码图片路径。

在 Vite 中，建议先在 `visualAssetManifest.ts` 中 import 图片，让构建器生成最终 URL，再把 import 结果填入 manifest。

替换或新增素材后，先执行：

```bash
npm run check:visual-assets
```

该检查会校验 `VISUAL_ASSET_REPLACEMENT_REGISTRY`、`visualAssetManifest`、本地 PNG 文件、固定画布尺寸，以及要求透明背景素材的四角 alpha。它不会判断美术风格，只负责发现漏配、尺寸不符和带底色这类低级错误。

## 开发预览面板

开发环境顶部会出现“素材”入口，打开后进入 `VisualAssetPreviewPanel`。这个面板复用正式的 `IntentSlot`、`TalismanVisual`、`CenserVisual` 和 `IncenseVisual`，用于在不跑完整业务流程的情况下检查主祭台背景、三香炉位、情境符箓、预防符箓、线香状态和素材 registry。

面板可以切换香炉状态、香数、当前香、线香进度和预防符箓数量；也可以打开背景参考线，检查情境符箓上沿、三香炉中心线、预防符箓贴边和三个香炉槽位中心。下方同步列出每个素材目标的 slot、源画布、渲染盒、尺寸策略、透明边界要求和当前状态。替换真实素材后，应先通过 `npm run check:visual-assets`，再打开该面板检查对齐。

背景参考线的规格统一维护在 `src/lib/visualAssets.ts` 的 `ALTAR_BACKGROUND_ALIGNMENT_GUIDES`。如果未来调整桌子前沿、香炉中心线或三香炉横向间距，应先更新这个常量，再调整 CSS 中对应的主祭台布局变量。

## 当前阶段不做

- 不导入本轮范围外的正式视觉素材。
- 不做高密度符箓燃烧粒子、持续掉落碎纸或正式燃烧素材系统。
- 不做香炉开盖动画。
- 不做高负载线香烟雾粒子、香灰掉落或高频火星闪动。
- 不生成假的复杂符箓、香炉、线香图案。
