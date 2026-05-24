# 视觉素材清单

本目录用于未来接入真实符箓、香炉、线香和主祭台背景素材。当前阶段接入了五类测试素材：一组小窗 Q 版香炉测试 PNG、一组主祭台香炉测试 PNG、一组主祭台线香测试 PNG、两张主祭台符箓模板测试 PNG，以及一张主祭台背景测试 PNG。它们只用于验证素材管线和排版方向，不代表最终视觉设计。

## 目录与用途

| 目录 | 用途 | 对应组件 |
| --- | --- | --- |
| `altar/` | 主祭台背景 | `RitualStage` |
| `talisman/situation/` | 情境性符箓模板 | `TalismanVisual` |
| `talisman/prevention/` | 预防性符箓模板 | `TalismanVisual` |
| `censer/stage/` | 主祭台香炉图层 | `CenserVisual` |
| `censer/compact/` | 小窗 Q 版香炉图层 | `CenserVisual` |
| `incense/stage/` | 主祭台线香图层 | `IncenseVisual` |
| `incense/compact/` | 小窗线香图层 | `IncenseVisual` |

## data-visual-slot 对应关系

真实素材 URL 通过 `src/lib/visualAssetManifest.ts` 与下列插槽对应。manifest 为空时，组件继续使用现有 CSS 占位图层。

主祭台：

- `altar/background`

符箓：

- `talisman/situation/template`
- `talisman/situation/state`
- `talisman/situation/text`
- `talisman/prevention/template`
- `talisman/prevention/state`
- `talisman/prevention/text`

香炉：

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

线香：

- `incense/stage/stick`
- `incense/stage/ash`
- `incense/stage/ember`
- `incense/stage/smoke`
- `incense/compact/stick`
- `incense/compact/ash`
- `incense/compact/ember`
- `incense/compact/smoke`

## 命名规则

- 文件名使用英文小写。
- 多词使用短横线。
- 不使用中文文件名。
- 同一图层优先使用相同文件名，通过目录区分 `stage` 和 `compact`。
- 推荐透明背景 PNG 或 WebP。

当前建议命名：

- `template.png`
- `state.png`
- `body.png`
- `lid.png`
- `mouth.png`
- `ash.png`
- `feet.png`
- `stick.png`
- `ember.png`
- `smoke.png`

## 小窗 Q 版香炉规格

小窗真实素材接入优先从 `censer/compact/` 和 `incense/compact/` 开始：

- 小窗香炉推荐源画布为 `256px × 256px`，透明背景。
- 小窗线香推荐源画布为 `192px × 192px`，透明背景。
- 小窗最终只显示用户创建的 1-3 个香炉，单行并排。
- 香炉和线香必须保持分层，不把 1 / 2 / 3 炷香烘焙成整张香炉图。
- 视觉风格为克制可爱，避免加入背景板、说明文字或符箓元素。

代码层规格见 `src/lib/visualAssets.ts` 的 `VISUAL_ASSET_FAMILY_SPECS` 和 `COMPACT_CENSER_ASSET_REQUIREMENTS`。

## 主祭台素材规格

主祭台真实素材从 `censer/stage/`、`incense/stage/`、`talisman/situation/` 和 `talisman/prevention/` 接入：

- 主祭台背景推荐源画布为横向构图，当前参考尺寸为 `1672px × 941px`。
- 主祭台背景需要提供明确桌面边缘，方便 1-3 个香炉在同一张桌子上均匀排列。
- 背景不应包含已烘焙的符箓、线香或交互状态。
- 背景不应包含已烘焙的香炉。带固定香炉的图片只能作为构图参考，不能直接作为最终背景。
- 主祭台香炉推荐源画布为 `320px × 320px`，透明背景。
- 主祭台线香推荐源画布为 `240px × 240px`，透明背景。
- 主祭台香炉使用 `stage` 素材族，不能复用小窗 `compact` Q 版素材。
- 情境性和预防性符箓使用上传好的图片模板作为背景，文本必须保留为 React 覆盖层。
- 情境性符箓在主祭台上应比香炉更瘦，当前布局目标接近香炉视觉宽度的三分之一。
- 符箓模板需要为左右竖排文字保留干净空白栏，中央符文不得压到文字区。
- 主祭台上的状态、香数和线香进度是辅助信息，默认不呈现，可在悬停或聚焦时浮出。
- 同一套执行意图有 2-3 张预防性符箓时，预防性符箓在桌面前沿水平排列，不上下堆叠。
- 主祭台素材可以比小窗更正式，但仍保持图层拆分，方便后续开盖、燃烧和状态变化。

代码层规格见 `src/lib/visualAssets.ts` 的 `STAGE_CENSER_ASSET_REQUIREMENTS` 和 `TALISMAN_ASSET_REQUIREMENTS`。

## 当前测试素材

`censer/compact/` 中的 `body.png`、`lid.png`、`mouth.png`、`ash.png`、`feet.png` 是 AI 生成的临时测试素材，使用绿色背景生成后本地移除背景并裁切为透明 PNG。它们只用于验证真实图片接入、manifest 引用和小窗渲染链路，不代表最终 Q 版香炉设计。

`censer/stage/` 中的 `body.png`、`lid.png`、`mouth.png`、`ash.png`、`feet.png` 是 AI 生成的临时主祭台香炉测试素材，使用 `scripts/extract-stage-censer-layers.mjs` 从绿色背景源图本地移除背景并切分到透明 PNG。`lid.png` 对应香炉上方完整盖子，包括顶部钮和镂空盖面；未来开盖动画应移动这一层。

`incense/stage/` 中的 `stick.png`、`ash.png`、`ember.png`、`smoke.png` 是确定性脚本生成的临时主祭台线香测试素材，使用 `scripts/generate-stage-incense-assets.mjs` 生成。它们用于验证主祭台线香图片图层、香数重复渲染和当前炷香进度驱动，不代表最终线香设计。

`talisman/situation/template.png` 和 `talisman/prevention/template.png` 是 AI 生成的临时符箓模板测试素材。它们用于验证主祭台符箓图片模板、左右竖排文本覆盖层和 manifest 引用链路，不代表最终符箓设计，也不宣称宗教、玄学或超自然功效。

`altar/background.png` 是 AI 生成的临时空桌主祭台背景测试素材。它用于验证共享桌面、三香炉并排和预防性符箓水平贴边布局，不代表最终主祭台设计。背景图不能自带固定香炉；香炉必须继续由组件独立渲染。

## 当前不做

- 不导入正式视觉素材。
- 不导入正式符箓、香炉或线香素材；当前 PNG 仍是测试资产。
- 不做燃烧、开盖、烟雾或香灰动画。
- 不把桌面应用图标放进本目录。
