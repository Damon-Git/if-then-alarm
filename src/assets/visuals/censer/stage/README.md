# 主祭台香炉素材

本目录用于未来放置主祭台香炉图层。

## 对应插槽

- `censer/stage/lid`
- `censer/stage/mouth`
- `censer/stage/ash`
- `censer/stage/body`
- `censer/stage/feet`

## 未来素材

- `body.png`：香炉主体。
- `lid.png`：香炉盖。
- `mouth.png`：炉口。
- `ash.png`：香灰层。
- `feet.png`：底足。

香炉开盖动画未来应移动已有 `lid` 素材，不重新画临时盖子。

## 接入规则

- 主祭台香炉只使用 `stage` 素材族，不复用 `censer/compact/` 的 Q 版素材。
- 推荐源画布为 `320px × 320px`，透明背景。
- 当前渲染盒以 `src/lib/visualAssets.ts` 中的 `VISUAL_ASSET_FAMILY_SPECS.censer.stage` 为准。
- 素材 URL 未来统一登记到 `src/lib/visualAssetManifest.ts`，键名必须对应上方插槽。
- 线香仍由 `IncenseVisual` 和 `incense/stage/` 图层渲染，不烘焙进香炉图片。

## 当前不做

- 不放真实香炉图片。
- 不生成假香炉图案。
- 不做开盖动画。
