# 视觉组件接口契约

本文冻结当前视觉组件的输入边界，供未来接入真实符箓模板、主祭台香炉、小窗 Q 版香炉和线香素材时遵守。

当前已接入小窗 Q 版香炉、主祭台香炉和主祭台线香的临时测试 PNG，不做动画，不改变业务状态机。

## 总原则

- 视觉组件只接收渲染所需的最小语义字段。
- 业务状态先经过 `src/lib/visualState.ts` 映射，再进入视觉组件。
- 素材槽位通过 `src/lib/visualAssets.ts` 生成，组件内部通过 `data-visual-slot` 暴露。
- 素材 URL 通过 `src/lib/visualAssetManifest.ts` 查询；manifest 为空时必须回退到现有 CSS 占位。
- 视觉组件不能直接读取完整 session、history、settings、timer interval、localStorage、Tauri API 或桌面平台 API。
- 接入真实图片、动画或图层时，优先改视觉组件内部结构和 CSS，不改计时、复盘、历史、导入导出、桌面持久化等业务逻辑。

## 共享输入

### size

`size: "stage" | "compact"`

- `stage` 用于主祭台。
- `compact` 用于 macOS 小窗香炉舞台。
- 两种尺寸可以接入不同素材，但业务含义必须一致。
- 完整窗口的主祭台只能传入 `stage`；小窗香炉舞台只能传入 `compact`。不要用窗口宽度、CSS media query 或临时状态隐式切换素材族。

### status

`status: IntentSetStatus`

这是视觉组件允许接收的最小业务状态。组件内部只能用它推导视觉状态，不应依赖完整 `IntentSet` 或 `PersistedSession`。

## 主祭台单槽视觉语义

主祭台的单个 `IntentSlot` 必须先通过 `src/lib/visualState.ts` 中的 `getStageIntentVisualSemantics(status)` 派生 UI 语义，再传给符箓、香炉、线香和计时面板。

| 状态 | 状态标签 | 情境符箓 | 香炉 | 线香 | 计时面板 | 辅助信息 |
| --- | --- | --- | --- | --- | --- | --- |
| `idle` | 未开始 | 可点击启动，若其他套组阻塞则禁用 | 开盖 | 全部完整待燃 | 不渲染 | 默认隐藏，只在香炉命中区 hover 显示 |
| `burning` | 进行中 | 禁用 | 开盖 | 当前线香按进度燃烧 | 渲染 | 默认隐藏，只在香炉命中区 hover 显示 |
| `resting` | 休息中 | 禁用 | 开盖 | 当前线香保持已烧完状态，不表现为继续燃烧 | 渲染 | 默认隐藏，只在香炉命中区 hover 显示 |
| `completed` | 已完成 | 弱化完成态 | 闭盖 | 隐藏，不能穿出盖子 | 不渲染 | 默认隐藏，只在香炉命中区 hover 显示 |

`IntentSlot` 会输出 `data-stage-intent-status`、`data-stage-can-start`、`data-stage-timer-visible` 和 `data-stage-metadata-visibility`。当前 `data-stage-metadata-visibility` 的值为 `censer-hover`，表示辅助信息只由香炉命中区触发。这些属性只表达视觉语义和回归检查锚点，不反推业务流程。

主祭台辅助信息不能由符箓 hover、符箓 focus 或线香区域 hover 触发。符箓 hover 只负责符箓自身放大，线香区域保持低干扰。

## CenserVisual

文件：`src/components/CenserVisual.tsx`

当前 props：

```ts
type CenserVisualProps = {
  currentIncenseIndex: number;
  incenseCount: number;
  incenseProgress: number;
  size: "stage" | "compact";
  status: IntentSetStatus;
};
```

### 字段含义

- `currentIncenseIndex`：当前第几炷香，1-based，由业务状态或恢复逻辑在外部计算。
- `incenseCount`：本套执行意图总香数，产品范围是 1-3。
- `incenseProgress`：当前炷香进度，范围 0-1。
- `size`：选择主祭台或小窗素材族。
- `status`：最小业务状态，用于映射香炉视觉状态。

### DOM 语义

`CenserVisual` 会在根节点暴露：

- `data-censer-size`：`stage` 或 `compact`。
- `data-censer-state`：由 `status` 映射出的视觉状态。
- `data-censer-lid-state`：`open` 或 `closed`。默认和进行中都保持开盖，只有该套全部香完成后才闭盖。
- `data-censer-incense-count`：当前套组总香数。
- `data-censer-current`：当前第几炷香。
- `data-censer-progress`：当前炷香进度百分比。

这些属性用于未来真实素材、截图检查和 CSS 状态选择，不应用来反推业务状态。

主祭台 `CenserVisual` 还会暴露 `.censer-visual__hover-target` 作为香炉专用命中区。这个命中区只覆盖香炉主体和盖子，不覆盖符箓或线香；状态标签、香数、线香进度和计时面板只能由这个命中区 hover 触发。

### 预留图层

- `data-censer-layer="body"`：香炉主体。
- `data-censer-layer="lid"`：香炉盖。
- `data-censer-layer="mouth"`：炉口。
- `data-censer-layer="ash"`：香灰层。
- `data-censer-layer="feet"`：底足。

### 未来素材接入规则

- 主祭台香炉和小窗 Q 版香炉可以使用两套素材。
- 主祭台香炉必须使用 `censer/stage/*` 插槽；小窗 Q 版香炉必须使用 `censer/compact/*` 插槽。两套素材不能混用。
- `lid` 图层必须对应香炉上方完整盖子，包括顶部钮和镂空盖面；`mouth` 只表示盖子下沿和炉口过渡区域。
- 香炉开盖动画未来只能移动已有 `lid` 素材，不重新画一个临时盖子，也不移动 `mouth/body` 代替盖子。
- 香炉默认开盖，包括 `idle`、`burning` 和 `resting`。只有该香炉对应的执行意图进入 `completed`，也就是该套所有线香都烧完时，盖子才闭合。
- 盖子闭合后，线香视觉层应隐藏，避免线香穿出已闭合的香炉。
- 香炉组件可以组合 `IncenseVisual`，但不负责计算倒计时。
- 不在 `CenserVisual` 内判断“是否所有套组完成”“是否进入复盘”等业务流程。
- 小窗 Q 版香炉素材必须透明，不包含背景面板、符箓或文字。
- 小窗 Q 版香炉素材以 `src/lib/visualAssets.ts` 中的 `VISUAL_ASSET_FAMILY_SPECS.censer.compact` 为尺寸锚点。
- 主祭台香炉素材以 `src/lib/visualAssets.ts` 中的 `VISUAL_ASSET_FAMILY_SPECS.censer.stage` 为尺寸锚点。

## IncenseVisual

文件：`src/components/IncenseVisual.tsx`

当前 props：

```ts
type IncenseVisualProps = {
  currentIncenseIndex: number;
  incenseCount: number;
  progress: number;
  size: "stage" | "compact";
  status: IntentSetStatus;
};
```

### 字段含义

- `currentIncenseIndex`：当前由计时器驱动的线香编号，1-based。
- `incenseCount`：需要渲染的线香数量，必须与用户选择的香数一致。
- `progress`：当前线香进度，范围 0-1；组件可以 clamp，但不能计算时间。
- `size`：选择主祭台或小窗素材族。
- `status`：用于把每根线香映射为 `pending`、`burning`、`burned` 或 `resting`。

### 预留图层

- `data-incense-layer="stick"`：香体。
- `data-incense-layer="ash"`：香灰。
- `data-incense-layer="ember"`：火星。
- `data-incense-layer="smoke"`：烟雾。

### 未来素材接入规则

- 用户选择 1 / 2 / 3 炷香时，必须分别渲染 1 / 2 / 3 根线香。
- 进入计时后，从左侧第一根开始显示当前进度；续香后依次推进。
- 火星、烟雾和香灰可以由视觉状态和 `progress` 驱动，但不能改变计时结果。
- 不在 `IncenseVisual` 内启动、暂停或清理 timer。
- 小窗线香素材以 `src/lib/visualAssets.ts` 中的 `VISUAL_ASSET_FAMILY_SPECS.incense.compact` 为尺寸锚点。
- 主祭台线香素材以 `src/lib/visualAssets.ts` 中的 `VISUAL_ASSET_FAMILY_SPECS.incense.stage` 为尺寸锚点。
- 当前主祭台线香已配置 `incense/stage/*` 临时 PNG；小窗线香暂时可以继续使用 CSS 占位。
- 小窗不同香数不能烘焙成 1 / 2 / 3 张整图，必须由组件重复渲染同一套线香图层。

## TalismanVisual

文件：`src/components/TalismanVisual.tsx`

当前 props：

```ts
type TalismanVisualProps = {
  disabled?: boolean;
  interactive?: boolean;
  intentStatus?: IntentSetStatus;
  label: string;
  onClick?: () => void;
  text: string;
  variant: "situation" | "prevention";
};
```

### 字段含义

- `variant`：选择情境性符箓或预防性符箓模板。
- `text`：用户输入的执行意图文本，作为图片模板上的覆盖文本层。
- `label`：短标签，不替代用户意图文本。
- `interactive`：为 `true` 时渲染为按钮；当前主要用于情境性符箓启动入口。
- `disabled`：禁用交互并映射为禁用视觉状态。
- `intentStatus`：用于映射完成状态。
- `onClick`：只负责把点击交给外层流程，例如打开开始确认弹窗。

### 预留图层

- `data-talisman-layer="template"`：符箓背景模板层。
- `data-talisman-layer="text"`：文字覆盖层。
- `data-talisman-layer="state"`：状态层，未来可用于燃烧、消失或禁用效果。

### 未来素材接入规则

- 真实符箓必须使用上传好的图片模板作为背景。
- 不允许用 CSS 或 SVG 随便重新画一个假的符箓。
- 用户文本必须保持为覆盖在模板上的文本层。
- 符箓燃烧或消失动画只能改变视觉状态，不应直接推进计时状态。

## 不允许的耦合

视觉组件内不要引入或调用：

- `src/lib/storage.ts`
- `src/lib/sessionStorage.ts`
- `src/lib/settingsStorage.ts`
- `src/lib/timer.ts`
- `src/lib/desktopPersistenceAdapter.ts`
- `src/lib/notificationAdapter.ts`
- Tauri API
- `localStorage`
- `window.setInterval`

这些逻辑属于应用状态、平台适配或副作用层，不属于视觉组件。

视觉组件也不应直接硬编码真实素材路径。真实图片路径统一从 `src/lib/visualAssetManifest.ts` 读取；manifest key 受 `VisualAssetSlot` 限制，应与 `data-visual-slot` 保持一致。

## 修改接口的规则

如果未来确实需要新增视觉 props，必须满足：

- 字段是视觉语义，不是完整业务对象。
- 字段能同时解释主祭台和小窗场景，或明确只属于某个 `size`。
- 字段不会让组件承担计时、历史、复盘、持久化或桌面平台职责。
- 同步更新 `docs/FUTURE_VISUAL_SPEC.md` 和本文件。
