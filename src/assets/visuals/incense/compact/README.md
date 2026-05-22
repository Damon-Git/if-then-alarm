# 小窗线香素材

本目录用于未来放置 macOS 小窗中的线香图层。

## 对应插槽

- `incense/compact/stick`
- `incense/compact/ash`
- `incense/compact/ember`
- `incense/compact/smoke`

## 未来素材

- `stick.png`：小窗香体。
- `ash.png`：小窗香灰。
- `ember.png`：小窗火星。
- `smoke.png`：小窗烟雾。

小窗线香需要优先保证在窄窗口中清楚可读，不追求复杂细节。

## 静态素材规格

- 推荐源画布：`192px × 192px`。
- 当前 CSS 渲染框参考：约 `72px × 50px`。
- 背景必须透明。
- 1 / 2 / 3 根线香都由同一套素材重复渲染，不为不同香数单独烘焙整张图。
- 线香应能清楚区分 `pending`、`burning`、`burned` 和 `resting` 状态。
- 当前阶段不做烟雾动画；`smoke.png` 只作为未来图层占位。
- 火星和香灰可以随进度显示，但不能改变计时逻辑。

## 接入方式

真实素材进入项目时，先把图片放在本目录，再通过 `src/lib/visualAssetManifest.ts` 配置：

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

- 不放真实线香图片。
- 不做燃烧、香灰掉落、火星闪动或烟雾动画。
