# 正式视觉素材替换清单

本文用于把临时测试素材替换为正式素材。替换素材时按本清单逐项检查，避免把业务交互、计时状态或布局规则混进图片文件。

替换前先阅读 `docs/VISUAL_ASSET_BOUNDARIES.md`，确认这组图片应该负责什么、不应该负责什么。本文只记录执行步骤和验收项。

代码层单一入口：

- 插槽与目录：`src/lib/visualAssets.ts`
- 图片 URL：`src/lib/visualAssetManifest.ts`
- 组件边界：`TalismanVisual`、`CenserVisual`、`IncenseVisual`
- 视觉状态：`src/lib/visualState.ts`

## 一、替换顺序

建议按下面顺序替换，不要一次把所有图片都换掉：

1. 主祭台背景：`altar/background`
2. 主祭台香炉：`censer/stage/*`
3. 小窗 Q 版香炉：`censer/compact/*`
4. 情境性符箓：`talisman/situation/template`
5. 预防性符箓：`talisman/prevention/template`
6. 主祭台线香：`incense/stage/*`
7. 小窗线香：`incense/compact/*`

每替换一组，先跑一次视觉状态路径，不要等全部替换后再排查。

替换任意图片后，先运行：

```bash
npm run check:visual-assets
```

该命令会检查 registry、manifest、本地 PNG 文件、固定画布尺寸和透明素材边角 alpha。通过后再进入界面验收。

开发环境可通过顶部“素材”入口打开 `VisualAssetPreviewPanel`。替换真实素材时，先在该面板切换香炉状态、香数、当前香、线香进度和预防符箓数量，并打开背景参考线确认情境符箓上沿、三香炉中心线、预防符箓贴边和槽位中心，确认对齐后再跑完整业务流程。

## 二、通用准入规则

- 文件名使用英文小写，不使用中文文件名。
- 优先使用 PNG 或 WebP。
- 香炉、线香必须透明背景。
- 符箓模板可以有黄纸背景，但用户填写的执行意图文字不能烘焙进图片。
- 主祭台背景不能烘焙香炉、符箓、线香、状态文字或交互提示。
- 不为 1 / 2 / 3 炷香分别烘焙整张香炉图；线香数量由组件重复渲染。
- 不在组件里直接硬编码图片路径，只改 `visualAssetManifest.ts`。
- 如果素材尺寸变化，优先更新 `visualAssets.ts` 的 registry 和 render box，再调整 CSS。

## 三、当前 registry

当前正式替换锚点在 `VISUAL_ASSET_REPLACEMENT_REGISTRY` 中维护：

| 目标 | 当前状态 | 目录 | 关键锚点 |
| --- | --- | --- | --- |
| `altarBackground` | 主祭台背景 v1 | `src/assets/visuals/altar` | 桌面前沿和三香炉水平摆放基准 |
| `censerStage` | 主祭台香炉 v1 | `src/assets/visuals/censer/stage` | 香炉底部中心点和盖子闭合位置 |
| `censerCompact` | 临时测试素材 | `src/assets/visuals/censer/compact` | 小窗香炉底部中心点和并排槽位中心 |
| `talismanSituation` | 临时测试素材 | `src/assets/visuals/talisman/situation` | 左右竖排文字栏和中央符文分区 |
| `talismanPrevention` | 临时测试素材 | `src/assets/visuals/talisman/prevention` | 左右竖排文字栏和中央符文分区 |
| `incenseStage` | 临时测试素材 | `src/assets/visuals/incense/stage` | 香炉炉口中心线和左到右燃烧顺序 |
| `incenseCompact` | 临时测试素材 | `src/assets/visuals/incense/compact` | 小窗香炉炉口中心线和左到右燃烧顺序 |

## 四、主祭台背景

替换文件：

- `src/assets/visuals/altar/background.png`
- manifest 插槽：`altar/background`

准入检查：

- [ ] 横向构图，建议接近当前 `1672px × 941px`。
- [ ] 有明确桌面前沿，方便香炉落在同一条水平线上。
- [ ] 不含固定香炉。
- [ ] 不含符箓、线香、状态文字、光效按钮或其他交互提示。
- [ ] 允许作为氛围背景，但香炉必须仍由组件独立渲染。

验收重点：

- [ ] 创建 1 / 2 / 3 套时，香炉仍在一张桌子上均匀排列。
- [ ] 三个香炉仍保持同一水平线。
- [ ] 预防性符箓仍能贴近桌面前沿水平排列。

## 五、主祭台香炉

替换文件：

- `src/assets/visuals/censer/stage/lid.png`
- `src/assets/visuals/censer/stage/mouth.png`
- `src/assets/visuals/censer/stage/ash.png`
- `src/assets/visuals/censer/stage/body.png`
- `src/assets/visuals/censer/stage/feet.png`

准入检查：

- [ ] 透明背景。
- [ ] 推荐源画布 `320px × 320px`。
- [ ] 五个图层能在同一坐标系中原位叠放。
- [ ] `lid.png` 是完整盖子，包括顶部钮和镂空盖面。
- [ ] `mouth.png` 只负责炉口或盖下过渡区域，不承载完整盖子。
- [ ] 不包含线香、符箓、桌面背景或状态文字。

验收重点：

- [ ] 未开始、烧香中、休息中保持开盖。
- [ ] 全部线香烧完后才闭盖。
- [ ] 闭盖后不显示线香穿出盖子。
- [ ] 完成态弱化但不改变香炉水平位置。

## 六、小窗 Q 版香炉

替换文件：

- `src/assets/visuals/censer/compact/lid.png`
- `src/assets/visuals/censer/compact/mouth.png`
- `src/assets/visuals/censer/compact/ash.png`
- `src/assets/visuals/censer/compact/body.png`
- `src/assets/visuals/censer/compact/feet.png`

准入检查：

- [ ] 透明背景。
- [ ] 推荐源画布 `256px × 256px`。
- [ ] 当前渲染盒由 registry 控制，约为 `82px × 90px`。
- [ ] 视觉风格克制可爱，不加入表情化大装饰。
- [ ] 不包含白色、灰色或米色窗口底板。
- [ ] 不包含符箓、执行意图文字或状态说明。

验收重点：

- [ ] 用户创建几套就显示几个香炉，最多 3 个。
- [ ] 小窗香炉始终单行并排。
- [ ] 小窗只承担计时器职责，点击香炉只回到完整窗口。

## 七、符箓模板

替换文件：

- `src/assets/visuals/talisman/situation/template.png`
- `src/assets/visuals/talisman/prevention/template.png`

准入检查：

- [ ] 符箓模板为上传或正式设计好的图片，不用 CSS 或 SVG 临时画假符箓。
- [ ] 推荐源画布接近 `512px × 1280px`。
- [ ] 情境性和预防性使用两套固定模板。
- [ ] 左右两侧保留清晰竖排文字栏。
- [ ] 左右文字栏符合 `TALISMAN_TEXT_SAFE_ZONES`，不贴近中央符文边界。
- [ ] 中央符文不压住左右文字栏。
- [ ] 用户执行意图文字继续由 React 文本层覆盖。

验收重点：

- [ ] 主祭台默认小尺寸下仍不显得比香炉更抢眼。
- [ ] hover 放大后，文字不贴中间边框，不压住中央符文。
- [ ] 情境符箓放大后不被香炉、线香或其他符箓遮挡。
- [ ] 预防符箓放大后不被香炉、线香、桌面边界或其他符箓遮挡。

## 八、线香

替换文件：

- `src/assets/visuals/incense/stage/stick.png`
- `src/assets/visuals/incense/stage/ash.png`
- `src/assets/visuals/incense/stage/ember.png`
- `src/assets/visuals/incense/stage/smoke.png`
- `src/assets/visuals/incense/compact/stick.png`
- `src/assets/visuals/incense/compact/ash.png`
- `src/assets/visuals/incense/compact/ember.png`
- `src/assets/visuals/incense/compact/smoke.png`

准入检查：

- [ ] 透明背景。
- [ ] 主祭台推荐源画布 `240px × 240px`。
- [ ] 小窗推荐源画布 `192px × 192px`。
- [ ] 不包含香炉、背景或状态文字。
- [ ] `stick`、`ash`、`ember`、`smoke` 保持独立图层。

验收重点：

- [ ] 选择 1 / 2 / 3 炷香时显示 1 / 2 / 3 根线香。
- [ ] 从左侧第一炷开始燃烧，续香后依次推进。
- [ ] 当前线香进度由倒计时驱动，不另起计时器。
- [ ] 休息中当前线香保持已烧完状态，不继续表现为燃烧。
- [ ] 完成闭盖后隐藏线香。

## 九、替换后的最小检查

每替换一组正式素材后至少检查：

- [ ] `npm run test -- src/lib/visualAssetManifest.test.ts`
- [ ] `npm run check:visual-assets`
- [ ] `npm run build`
- [ ] 开发环境“素材”面板中，打开背景参考线后，主祭台三香炉位、符箓位、线香位对齐。
- [ ] Web 版主祭台 1 / 2 / 3 套布局。
- [ ] Tauri 小窗 1 / 2 / 3 个香炉并排。
- [ ] 情境符箓 hover 放大。
- [ ] 预防符箓 hover 放大。
- [ ] 香炉 hover 信息卡只在香炉命中区出现。
- [ ] 完成态香炉闭盖并隐藏线香。
