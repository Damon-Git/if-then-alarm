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
- 当前阶段不做烟雾动画；`smoke.png` 只提供极弱静态淡烟。
- 火星和香灰可以随进度显示，但不能改变计时逻辑。

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

- 不做燃烧、香灰掉落、火星闪动或烟雾动画。
- 不修改主祭台 `incense/stage/` 正式素材。
