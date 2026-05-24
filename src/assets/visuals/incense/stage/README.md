# 主祭台线香素材

本目录用于放置主祭台线香图层。当前已有一组临时测试 PNG，用于验证主祭台线香从 CSS 占位切换为图片分层渲染。

## 对应插槽

- `incense/stage/stick`
- `incense/stage/ash`
- `incense/stage/ember`
- `incense/stage/smoke`

## 当前素材

- `stick.png`：香体。
- `ash.png`：香灰。
- `ember.png`：火星。
- `smoke.png`：烟雾。

当前四层由 `scripts/generate-stage-incense-assets.mjs` 确定性生成，只用于验证素材链路和进度驱动，不代表最终线香设计。

线香数量由用户选择的香数决定，素材不能改变业务数量。

## 当前不做

- 不导入最终正式线香素材。
- 不做燃烧、香灰掉落、火星闪动或烟雾动画。
