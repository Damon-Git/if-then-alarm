# 视觉素材接入管线

本文件约定未来真实符箓、香炉、线香素材如何进入项目。当前版本仍使用占位元素，不引入真实图片、不做动画。

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

## 素材格式

- 优先使用透明背景 PNG 或 WebP。
- 符箓模板可以是完整背景图，但执行意图文字必须继续作为文本层覆盖，不要烘焙进图片。
- 香炉应拆成独立图层，至少包括主体、盖、炉口、香灰层。
- 线香应拆成独立图层，至少包括香体、香灰、火星、烟雾。
- 素材建议按 2x 导出，CSS 中按目标尺寸缩放，避免小窗下发虚。
- 文件名使用英文小写，可用短横线，不使用中文文件名。

## 接入边界

- 业务状态到视觉状态的映射只放在 `src/lib/visualState.ts`。
- 视觉插槽和素材目录约定只放在 `src/lib/visualAssets.ts` 和本文档。
- 接入真实素材时，优先修改 `TalismanVisual`、`CenserVisual`、`IncenseVisual` 的内部结构和 CSS。
- 不应为了接素材修改计时、复盘、历史、本地存储等业务逻辑。
- 不应在当前占位 CSS 中继续追加复杂假纹样。

## 当前阶段不做

- 不导入真实图片。
- 不做符箓燃烧动画。
- 不做香炉开盖动画。
- 不做线香燃烧、香灰掉落、火星闪动或烟雾动画。
- 不生成假的复杂符箓、香炉、线香图案。
