# 小窗香炉素材

本目录用于未来放置 macOS 小窗中的 Q 版香炉图层。

小窗香炉只承担低干扰计时器职责：用户创建几套执行意图就显示几个香炉，最多 3 个，始终单行并排。小窗不显示符箓、标题、状态文案、倒计时文本或背景面板。

## 对应插槽

- `censer/compact/lid`
- `censer/compact/mouth`
- `censer/compact/ash`
- `censer/compact/body`
- `censer/compact/feet`

## 未来素材

- `body.png`：Q 版香炉主体。
- `lid.png`：Q 版香炉盖。
- `mouth.png`：炉口。
- `ash.png`：香灰层。
- `feet.png`：底足。

小窗素材可以比主祭台更克制可爱，但必须保持与主祭台状态一一对应。

当前目录中的上述 PNG 是临时测试素材，用于验证 manifest 和小窗渲染链路。它们不是最终 Q 版香炉设计稿。

## 静态素材规格

- 推荐源画布：`256px × 256px`。
- 当前 registry 渲染框参考：约 `82px × 90px`。
- 背景必须透明，不能包含白色、灰色或米色窗口底板。
- 图层之间应能在同一坐标系中原位叠放。
- 香炉整体应在 1 / 2 / 3 根线香时都保持居中稳定，不因为线香数量变化而横向跳动。
- 香炉默认开盖；只有该香炉对应的全部线香烧完并进入完成态时才闭盖。
- 风格为克制可爱，避免夸张表情、大面积装饰、强阴影或类似营销插画的背景。
- 小窗香炉素材不包含执行意图文字，也不包含符箓元素。

## 与线香的关系

香炉图层只负责香炉本体。线香仍由 `src/components/IncenseVisual.tsx` 和 `incense/compact/` 素材渲染。

- 选择 1 炷香时显示 1 根线香。
- 选择 2 炷香时显示 2 根线香。
- 选择 3 炷香时显示 3 根线香。
- 计时从左侧第一根线香开始，烧完后依次推进。
- 完成态闭盖后隐藏线香，避免线香穿出已闭合的盖子。

## 接入方式

真实素材进入项目时，先把图片放在本目录，再通过 `src/lib/visualAssetManifest.ts` 配置：

```ts
{
  "censer/compact/body": bodyUrl,
  "censer/compact/lid": lidUrl,
  "censer/compact/mouth": mouthUrl,
  "censer/compact/ash": ashUrl,
  "censer/compact/feet": feetUrl,
}
```

不要在 `CenserVisual` 中硬编码图片路径。

## 当前不做

- 不放正式 Q 版香炉图片。
- 不生成假香炉图案。
- 不做开盖动画。
