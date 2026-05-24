# 主祭台香炉素材

本目录用于放置主祭台香炉图层。当前已有一组临时测试 PNG，用于验证主祭台香炉从 CSS 占位切换为图片分层渲染。

## 对应插槽

- `censer/stage/lid`
- `censer/stage/mouth`
- `censer/stage/ash`
- `censer/stage/body`
- `censer/stage/feet`

## 当前素材

- `body.png`：香炉主体。
- `lid.png`：香炉盖。
- `mouth.png`：炉口。
- `ash.png`：香灰层。
- `feet.png`：底足。

当前五层由 `scripts/extract-stage-censer-layers.mjs` 从绿色背景源图本地抠图并按高度切分生成，只用于验证接入链路，不代表最终主祭台香炉设计。

`lid.png` 对应香炉上方完整盖子，包括顶部钮和镂空拱形盖面。香炉开盖动画未来应移动已有 `lid` 素材，不重新画临时盖子，也不要把盖子误放到 `mouth` 或 `body` 图层。

## 接入规则

- 主祭台香炉只使用 `stage` 素材族，不复用 `censer/compact/` 的 Q 版素材。
- 推荐源画布为 `320px × 320px`，透明背景。
- 当前渲染盒以 `src/lib/visualAssets.ts` 中的 `VISUAL_ASSET_FAMILY_SPECS.censer.stage` 为准。
- 素材 URL 统一登记到 `src/lib/visualAssetManifest.ts`，键名必须对应上方插槽。
- 线香仍由 `IncenseVisual` 和 `incense/stage/` 图层渲染，不烘焙进香炉图片。

## 当前不做

- 不导入最终正式香炉素材。
- 不做开盖动画。
