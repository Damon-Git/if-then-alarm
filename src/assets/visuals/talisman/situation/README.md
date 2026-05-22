# 情境性符箓素材

本目录用于未来放置情境性执行意图符箓模板。

## 对应插槽

- `talisman/situation/template`
- `talisman/situation/state`
- `talisman/situation/text`

## 未来素材

- `template.png`：真实符箓背景模板。
- `state.png`：未来燃烧、消失或禁用状态层素材。

执行意图文字必须保留为 React 文本层覆盖，不烘焙进图片。

## 接入规则

- 真实符箓必须来自上传好的图片模板，不用 CSS 或 SVG 重画假符箓。
- `template` 和 `state` 可以接入图片，`text` 始终由 React 文本层渲染。
- 情境性符箓是主祭台启动入口；接入图片不能改变点击后打开开始确认的交互。
- 素材 URL 未来统一登记到 `src/lib/visualAssetManifest.ts`，键名必须对应上方插槽。

## 当前不做

- 不放真实符箓图片。
- 不用 CSS 或 SVG 重新画假符箓。
- 不做燃烧动画。
