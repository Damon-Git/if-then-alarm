# 主祭台香炉素材

本目录用于放置主祭台香炉图层。当前已有主祭台香炉 v1 PNG，用于正式主祭台场景的分层渲染。

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

当前五层由 AI 生成的绿幕青铜香炉源图经本地去底、归一化和分层后得到，并作为主祭台香炉 v1 使用。

`lid.png` 对应香炉上方完整盖子，包括顶部钮和镂空拱形盖面。香炉开盖动画未来应移动已有 `lid` 素材，不重新画临时盖子，也不要把盖子误放到 `mouth` 或 `body` 图层。

`mouth.png` 只保留炉口、灰床边缘和盖下过渡区域；默认开盖时不会显示完整盖子。

香炉默认开盖，只有该香炉对应的全部线香烧完并进入完成态时才闭盖。闭盖时不显示线香穿出盖子。

## 接入规则

- 主祭台香炉只使用 `stage` 素材族，不复用 `censer/compact/` 的 Q 版素材。
- 推荐源画布为 `320px × 320px`，透明背景。
- 当前渲染盒以 `src/lib/visualAssets.ts` 中的 `VISUAL_ASSET_FAMILY_SPECS.censer.stage` 为准。
- 素材 URL 统一登记到 `src/lib/visualAssetManifest.ts`，键名必须对应上方插槽。
- 线香仍由 `IncenseVisual` 和 `incense/stage/` 图层渲染，不烘焙进香炉图片。

## 当前不做

- 不做开盖动画。
