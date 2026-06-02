# 主祭台线香素材

本目录用于放置主祭台线香图层。当前已接入主祭台线香 v1 正式透明 PNG，用于配合正式青铜香炉渲染主祭台线香。

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

当前四层使用 AI 生成的绿幕源图经本地去底、边缘清理和 `240px × 240px` 画布归一化后得到。香体使用低饱和朱褐色，香灰使用偏暖浅灰，火星保持小而克制，`smoke.png` 作为核心淡烟图层。

线香数量由用户选择的香数决定，素材不能改变业务数量。

主祭台 CSS 会在核心淡烟上叠加 `data-incense-smoke-layer="near"` / `"far"` 两个轻量烟缕锚点，提供低频错峰漂移和休息余烟收束。两个锚点不新增素材插槽，不改变小窗 `compact` 静态基线。

2026-06-02 已完成 Web 1-3 套布局、休息余烟、完成闭盖无残烟、`prefers-reduced-motion` 和 Tauri 开发版原生 WebView 截图验收。后续替换 `smoke.png` 时仍需复跑这些动态场景，不能只依赖静态素材检查。

## 当前不做

- 不做复杂燃烧、香灰掉落、高频火星闪动或高负载烟雾粒子系统。
