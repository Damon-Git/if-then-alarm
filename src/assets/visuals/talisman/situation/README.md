# 情境性符箓素材

本目录放置目标性执行意图符箓模板。当前 `template.png` 是情境性符箓 v1 正式模板，目录名继续沿用内部 `situation` 变体。

## 对应插槽

- `talisman/situation/template`
- `talisman/situation/state`
- `talisman/situation/text`
- `talisman/situation/burn/flames`

## 当前素材

- `template.png`：512×1280 RGB PNG，黄纸朱砂模板，包含固定边框、纸张质感和中央抽象符纹。
- `state.png`：未来燃烧、消失或禁用状态层素材。
- `burn/flame-sprite.png`：2880×420 RGBA PNG，6 帧横向透明火焰精灵图，只包含火焰和少量火星。

执行意图文字必须保留为 React 文本层覆盖，不烘焙进图片。

## 接入规则

- 真实符箓必须使用图片模板，不用 CSS 或 SVG 重画假符箓。
- `template` 和 `state` 可以接入图片，`text` 始终由 React 文本层渲染。
- 情境性符箓是主祭台启动入口；接入图片不能改变点击后打开开始确认的交互。
- 第一次确认开始后，情境性符箓会播放约 2 秒分层燃烧退场；透明 PNG 精灵图负责自然火舌，`state` 层负责局部起燃、焦化覆盖、推进亮边和少量火星，模板和文字共同裁切灰化。素材失败时回退到 CSS 火焰，且不能改变“动画结束后才开始第一炷香倒计时”的时序。
- 模板需要为左右竖排文字保留清晰空白栏，中央符文不得压到文字区。
- 主祭台中可按比例缩小展示，悬停或键盘聚焦时可放大查看。
- 当前模板 URL 已登记到 `src/lib/visualAssetManifest.ts`；后续新增状态层时，键名必须对应上方插槽。

## 当前不做

- 不宣称宗教、玄学或超自然功效。
- 不用 CSS 或 SVG 重新画假符箓。
- 不做高密度燃烧粒子或独立碎纸物理系统。
