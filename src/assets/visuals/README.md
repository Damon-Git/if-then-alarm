# 视觉素材清单

本目录用于未来接入真实符箓、香炉和线香素材。当前阶段只保留目录、README 和 `.gitkeep`，不放真实图片，不生成假素材。

## 目录与用途

| 目录 | 用途 | 对应组件 |
| --- | --- | --- |
| `talisman/situation/` | 情境性符箓模板 | `TalismanVisual` |
| `talisman/prevention/` | 预防性符箓模板 | `TalismanVisual` |
| `censer/stage/` | 主祭台香炉图层 | `CenserVisual` |
| `censer/compact/` | 小窗 Q 版香炉图层 | `CenserVisual` |
| `incense/stage/` | 主祭台线香图层 | `IncenseVisual` |
| `incense/compact/` | 小窗线香图层 | `IncenseVisual` |

## data-visual-slot 对应关系

真实素材 URL 通过 `src/lib/visualAssetManifest.ts` 与下列插槽对应。manifest 为空时，组件继续使用现有 CSS 占位图层。

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

## 当前不做

- 不导入真实图片。
- 不生成复杂假符箓、假香炉或假线香。
- 不做燃烧、开盖、烟雾或香灰动画。
- 不把桌面应用图标放进本目录。
