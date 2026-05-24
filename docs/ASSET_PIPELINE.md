# 视觉素材接入管线

本文件约定未来真实符箓、香炉、线香素材如何进入项目。当前版本已接入主祭台背景、符箓模板、小窗 Q 版香炉和主祭台香炉的临时测试 PNG，用于验证素材链路；线香仍使用占位元素，不做动画。素材目录内的执行清单见 `src/assets/visuals/README.md`。

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

真实素材进入项目时，应在对应目录更新 README，记录素材来源、用途和替换范围。当前 `censer/compact/` 和 `censer/stage/` 下的 PNG 是临时测试素材，不代表正式视觉风格。

## 素材格式

- 优先使用透明背景 PNG 或 WebP。
- 符箓模板可以是完整背景图，但执行意图文字必须继续作为文本层覆盖，不要烘焙进图片。
- 香炉应拆成独立图层，至少包括主体、盖、炉口、香灰层。
- 线香应拆成独立图层，至少包括香体、香灰、火星、烟雾。
- 素材建议按 2x 导出，CSS 中按目标尺寸缩放，避免小窗下发虚。
- 文件名使用英文小写，可用短横线，不使用中文文件名。

## 小窗 Q 版香炉规格

小窗香炉当前已接入临时 PNG 测试素材，素材规格固定如下：

- 小窗香炉素材必须是透明背景，不允许自带白底、灰底、米色底或面板背景。
- 小窗最多显示 3 个香炉槽位，用户创建几套就显示几套，不补空位。
- 每个小窗香炉渲染框约为 `74px × 84px`，建议源素材画布为 `256px × 256px`。
- 小窗线香渲染框约为 `72px × 50px`，建议源素材画布为 `192px × 192px`。
- 视觉风格为克制可爱，不做夸张表情、强装饰边框或喧宾夺主的背景。
- 香炉主体、盖、炉口、香灰层、底足继续使用独立图层，方便未来做开盖或状态变化。
- 线香继续由 `IncenseVisual` 渲染，用户选择 1 / 2 / 3 炷香时必须分别显示 1 / 2 / 3 根线香。
- 进入计时状态时，从左侧第一炷香开始显示进度；续香后依次推进到第 2、3 炷。
- 小窗素材不包含符箓；小窗点击香炉只负责回到完整窗口，不负责启动套组。
- 小窗素材不应承载文字信息。状态、倒计时、当前香数只保留在按钮可访问性语义中。

代码中的规格锚点见 `VISUAL_ASSET_FAMILY_SPECS` 和 `COMPACT_CENSER_ASSET_REQUIREMENTS`。

## 主祭台香炉规格

主祭台香炉当前已接入临时 PNG 测试素材，素材规格固定如下：

- 主祭台香炉素材必须是透明背景，不允许自带祭台背景、符箓或线香。
- 主祭台香炉使用 `censer/stage` 素材族，不能复用小窗 `compact` Q 版素材。
- 主祭台香炉推荐源素材画布为 `320px × 320px`。
- 香炉主体、盖、炉口、香灰层、底足继续使用独立图层。
- `lid.png` 必须对应香炉上方完整盖子，包括顶部钮和镂空盖面；未来开盖动画只移动这一层。
- `mouth.png` 只负责盖子下沿到炉口过渡区域，不承载完整盖子。
- 线香继续由 `IncenseVisual` 渲染，不烘焙进香炉图片。

## 接入边界

- 业务状态到视觉状态的映射只放在 `src/lib/visualState.ts`。
- 视觉插槽和素材目录约定只放在 `src/lib/visualAssets.ts` 和本文档。
- 真实素材 URL 只通过 `src/lib/visualAssetManifest.ts` 接入。
- 接入真实素材时，优先修改 `TalismanVisual`、`CenserVisual`、`IncenseVisual` 的内部结构和 CSS。
- 不应为了接素材修改计时、复盘、历史、本地存储等业务逻辑。
- 不应在当前占位 CSS 中继续追加复杂假纹样。

## Manifest 接入

当前 `src/lib/visualAssetManifest.ts` 已登记临时测试素材。视觉组件会先查询对应 `data-visual-slot`：

- 如果 manifest 中存在 URL，则在该图层渲染 `<img>`。
- 如果 manifest 中没有 URL，则保留现有 CSS 占位图层。

接入真实素材时，应先把图片放入对应目录，再在 `visualAssetManifest` 中为对应插槽配置 URL。不要在组件里直接硬编码图片路径。

在 Vite 中，建议先在 `visualAssetManifest.ts` 中 import 图片，让构建器生成最终 URL，再把 import 结果填入 manifest。

## 当前阶段不做

- 不导入正式视觉素材。
- 不做符箓燃烧动画。
- 不做香炉开盖动画。
- 不做线香燃烧、香灰掉落、火星闪动或烟雾动画。
- 不生成假的复杂符箓、香炉、线香图案。
