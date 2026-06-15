# 小窗线香素材

本目录用于放置 macOS 小窗中的线香图层。当前已接入小窗线香 v1 正式透明 PNG，用于配合 Q 版香炉渲染低干扰的小窗计时状态。

## 对应插槽

- `incense/compact/stick`
- `incense/compact/ash`
- `incense/compact/ember`
- `incense/compact/smoke`

## 当前素材

- `stick.png`：小窗香体。
- `ash.png`：小窗香灰。
- `ember.png`：小窗火星。
- `smoke.png`：小窗烟雾。

当前四层使用 AI 生成的绿幕源图经本地去底、边缘清理和 `192px × 192px` 画布归一化后得到。香体使用低饱和朱褐色，香灰使用暖浅灰，火星保持小而克制，烟雾只提供极弱静态淡烟图层。

小窗线香优先保证在窄窗口中清楚可读，不追求复杂细节。线香数量由用户选择的香数决定，素材不能改变业务数量。

## 静态素材规格

- 推荐源画布：`192px × 192px`。
- 当前 CSS 渲染框参考：约 `72px × 50px`。
- 背景必须透明。
- 1 / 2 / 3 根线香都由同一套素材重复渲染，不为不同香数单独烘焙整张图。
- 线香应能清楚区分 `pending`、`burning`、`burned` 和 `resting` 状态。
- `smoke.png` 提供核心淡烟图层；烧香中允许由 CSS 添加低频、克制的漂移动画，休息和完成状态必须收束或隐藏。
- 火星和香灰可以随进度显示，但不能改变计时逻辑。

## 香体与香脚

- `stick.png` 只表示参与燃烧裁切的涂香香体，不包含底部不燃烧的细香脚。
- 香脚由 `IncenseVisual` 的 `.incense-visual__support` 生成，不是新的 manifest 素材插槽，也不要烘焙进 `stick.png`。
- `stick/ash/ember/smoke` 位于 `.incense-visual__burnable` 可燃区；香脚固定显示，不随进度 `clip-path` 消失。
- 小窗香脚保持短而细，底端落在香炉白色香灰区域内；香体下端与香脚上端齐平或只轻微重叠，不能与香脚下端齐平。
- 已烧完香体不可见时，短香脚仍保留在原香位。1 / 2 / 3 炷香以及续到第 2、3 炷时都必须保持整组居中。

## 接入方式

素材通过 `src/lib/visualAssetManifest.ts` 配置：

```ts
{
  "incense/compact/stick": stickUrl,
  "incense/compact/ash": ashUrl,
  "incense/compact/ember": emberUrl,
  "incense/compact/smoke": smokeUrl,
}
```

不要在 `IncenseVisual` 中硬编码图片路径。

## 当前不做

- 不做香灰掉落、高频火星闪动或高负载烟雾动画。
- 不修改主祭台 `incense/stage/` 正式素材。
