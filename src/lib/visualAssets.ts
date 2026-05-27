export type VisualAssetSize = "stage" | "compact";

export type TalismanAssetVariant = "situation" | "prevention";

export type TalismanAssetLayer = "template" | "state" | "text";

export type CenserAssetLayer = "lid" | "mouth" | "ash" | "body" | "feet";

export type IncenseAssetLayer = "stick" | "ash" | "ember" | "smoke";

export type AltarAssetLayer = "background";

export type TalismanVisualSlot = `talisman/${TalismanAssetVariant}/${TalismanAssetLayer}`;

export type CenserVisualSlot = `censer/${VisualAssetSize}/${CenserAssetLayer}`;

export type IncenseVisualSlot = `incense/${VisualAssetSize}/${IncenseAssetLayer}`;

export type AltarVisualSlot = `altar/${AltarAssetLayer}`;

export type VisualAssetSlot = AltarVisualSlot | TalismanVisualSlot | CenserVisualSlot | IncenseVisualSlot;

export const TALISMAN_ASSET_LAYERS = ["template", "state", "text"] as const satisfies readonly TalismanAssetLayer[];

export const TALISMAN_TEMPLATE_ASSET_LAYERS = ["template", "state"] as const satisfies readonly TalismanAssetLayer[];

export const CENSER_ASSET_LAYERS = ["lid", "mouth", "ash", "body", "feet"] as const satisfies readonly CenserAssetLayer[];

export const INCENSE_ASSET_LAYERS = ["stick", "ash", "ember", "smoke"] as const satisfies readonly IncenseAssetLayer[];

export const ALTAR_ASSET_LAYERS = ["background"] as const satisfies readonly AltarAssetLayer[];

export type VisualAssetPixelSize = {
  height: number;
  width: number;
};

export type VisualAssetFamilySpec = {
  /**
   * Expected transparent canvas size for exported source assets.
   */
  sourceCanvas: VisualAssetPixelSize;
  /**
   * Approximate CSS render box used by the current placeholder.
   */
  renderBox: VisualAssetPixelSize;
};

export type AltarBackgroundAlignmentGuide = {
  axis: "horizontal" | "vertical";
  description: string;
  key: string;
  label: string;
  positionPercent: number;
};

export const VISUAL_ASSET_ROOT = "src/assets/visuals";

export const ALTAR_BACKGROUND_ALIGNMENT_GUIDES = [
  {
    axis: "horizontal",
    description: "情境性符箓的默认悬挂上沿，背景主体不要压到这里。",
    key: "situation-talisman-top",
    label: "情境符箓上沿",
    positionPercent: 17,
  },
  {
    axis: "horizontal",
    description: "三个主祭台香炉的中心水平线，香炉不应因状态变化上下跳动。",
    key: "censer-center-line",
    label: "香炉中心线",
    positionPercent: 64,
  },
  {
    axis: "horizontal",
    description: "预防性符箓贴近桌子前沿水平排列的基准。",
    key: "prevention-talisman-edge",
    label: "预防符箓贴边",
    positionPercent: 81,
  },
  {
    axis: "vertical",
    description: "左侧香炉槽位中心。",
    key: "left-censer-center",
    label: "左香炉",
    positionPercent: 31.33,
  },
  {
    axis: "vertical",
    description: "中间香炉槽位中心。",
    key: "middle-censer-center",
    label: "中香炉",
    positionPercent: 50,
  },
  {
    axis: "vertical",
    description: "右侧香炉槽位中心。",
    key: "right-censer-center",
    label: "右香炉",
    positionPercent: 68.67,
  },
] as const satisfies readonly AltarBackgroundAlignmentGuide[];

export const VISUAL_ASSET_FAMILY_SPECS = {
  censer: {
    compact: {
      renderBox: { height: 90, width: 82 },
      sourceCanvas: { height: 256, width: 256 },
    },
    stage: {
      renderBox: { height: 118, width: 118 },
      sourceCanvas: { height: 320, width: 320 },
    },
  },
  incense: {
    compact: {
      renderBox: { height: 50, width: 72 },
      sourceCanvas: { height: 192, width: 192 },
    },
    stage: {
      renderBox: { height: 62, width: 92 },
      sourceCanvas: { height: 240, width: 240 },
    },
  },
} as const satisfies Record<"censer" | "incense", Record<VisualAssetSize, VisualAssetFamilySpec>>;

export type VisualAssetRegistryStatus = "temporary-test" | "ready-for-replacement" | "final";

export type VisualAssetDimensionPolicy = "exact-source-canvas" | "cropped-layer";

export type VisualAssetReplacementTarget = {
  alignmentAnchor: string;
  dimensionPolicy: VisualAssetDimensionPolicy;
  directory: string;
  doNotBake: readonly string[];
  manifestSlots: readonly VisualAssetSlot[];
  notes: string;
  renderBox?: VisualAssetPixelSize;
  sourceCanvas?: VisualAssetPixelSize;
  status: VisualAssetRegistryStatus;
  transparentBackground: boolean;
};

export type TalismanTextSafeZone = {
  bottomPercent: number;
  innerEdgePercent: number;
  outerEdgePercent: number;
  topPercent: number;
};

export const TALISMAN_TEXT_SAFE_ZONES = {
  leftColumn: {
    bottomPercent: 84,
    innerEdgePercent: 35,
    outerEdgePercent: 18,
    topPercent: 18,
  },
  rightColumn: {
    bottomPercent: 84,
    innerEdgePercent: 65,
    outerEdgePercent: 82,
    topPercent: 18,
  },
} as const satisfies Record<"leftColumn" | "rightColumn", TalismanTextSafeZone>;

export const COMPACT_CENSER_ASSET_REQUIREMENTS = {
  background: "transparent",
  maxCenserSlots: 3,
  maxIncenseCount: 3,
  minIncenseCount: 1,
  tone: "restrained-cute",
} as const;

export const STAGE_CENSER_ASSET_REQUIREMENTS = {
  background: "transparent",
  family: "stage",
  maxCenserSlots: 3,
  maxIncenseCount: 3,
  minIncenseCount: 1,
  tone: "ritual-placeholder",
} as const;

export const TALISMAN_ASSET_REQUIREMENTS = {
  backgroundSource: "uploaded-template-image",
  maxPreventionCount: 3,
  textLayer: "react-overlay",
} as const;

export const ALTAR_ASSET_REQUIREMENTS = {
  backgroundRole: "shared-stage-reference",
  maxCenserSlots: 3,
  tableLayout: "single-table-even-slots",
} as const;

export const VISUAL_ASSET_DIRECTORIES = {
  altar: `${VISUAL_ASSET_ROOT}/altar`,
  censerCompact: `${VISUAL_ASSET_ROOT}/censer/compact`,
  censerStage: `${VISUAL_ASSET_ROOT}/censer/stage`,
  incenseCompact: `${VISUAL_ASSET_ROOT}/incense/compact`,
  incenseStage: `${VISUAL_ASSET_ROOT}/incense/stage`,
  talismanPrevention: `${VISUAL_ASSET_ROOT}/talisman/prevention`,
  talismanSituation: `${VISUAL_ASSET_ROOT}/talisman/situation`,
} as const;

export const VISUAL_ASSET_REPLACEMENT_REGISTRY = {
  altarBackground: {
    alignmentAnchor: "桌面前沿和三香炉水平摆放基准",
    dimensionPolicy: "exact-source-canvas",
    directory: VISUAL_ASSET_DIRECTORIES.altar,
    doNotBake: ["香炉", "符箓", "线香", "状态文字", "交互提示"],
    manifestSlots: ["altar/background"],
    notes: "当前背景是主祭台背景 v1，保留山水与桌面氛围，但不自带固定香炉、符箓或线香。",
    sourceCanvas: { height: 941, width: 1672 },
    status: "final",
    transparentBackground: false,
  },
  talismanSituation: {
    alignmentAnchor: "左右竖排文字栏和中央符文分区",
    dimensionPolicy: "exact-source-canvas",
    directory: VISUAL_ASSET_DIRECTORIES.talismanSituation,
    doNotBake: ["用户执行意图文本", "燃烧状态", "完成状态"],
    manifestSlots: ["talisman/situation/template", "talisman/situation/state", "talisman/situation/text"],
    notes: "正式情境符箓只替换模板图；执行意图继续由 React 文本层覆盖。",
    sourceCanvas: { height: 1280, width: 512 },
    status: "temporary-test",
    transparentBackground: false,
  },
  talismanPrevention: {
    alignmentAnchor: "左右竖排文字栏和中央符文分区",
    dimensionPolicy: "exact-source-canvas",
    directory: VISUAL_ASSET_DIRECTORIES.talismanPrevention,
    doNotBake: ["用户执行意图文本", "退场状态", "完成状态"],
    manifestSlots: ["talisman/prevention/template", "talisman/prevention/state", "talisman/prevention/text"],
    notes: "正式预防符箓只替换模板图；2-3 张时仍由布局水平排列在桌面前沿。",
    sourceCanvas: { height: 1280, width: 512 },
    status: "temporary-test",
    transparentBackground: false,
  },
  censerStage: {
    alignmentAnchor: "香炉底部中心点和盖子闭合位置",
    dimensionPolicy: "exact-source-canvas",
    directory: VISUAL_ASSET_DIRECTORIES.censerStage,
    doNotBake: ["线香", "符箓", "桌面背景", "状态文字"],
    manifestSlots: [
      "censer/stage/lid",
      "censer/stage/mouth",
      "censer/stage/ash",
      "censer/stage/body",
      "censer/stage/feet",
    ],
    notes: "主祭台香炉使用正式感素材；lid 必须是完整盖子，包括顶部钮和镂空盖面。",
    renderBox: VISUAL_ASSET_FAMILY_SPECS.censer.stage.renderBox,
    sourceCanvas: VISUAL_ASSET_FAMILY_SPECS.censer.stage.sourceCanvas,
    status: "temporary-test",
    transparentBackground: true,
  },
  censerCompact: {
    alignmentAnchor: "小窗香炉底部中心点和并排槽位中心",
    dimensionPolicy: "cropped-layer",
    directory: VISUAL_ASSET_DIRECTORIES.censerCompact,
    doNotBake: ["线香", "符箓", "窗口背景", "状态文字"],
    manifestSlots: [
      "censer/compact/lid",
      "censer/compact/mouth",
      "censer/compact/ash",
      "censer/compact/body",
      "censer/compact/feet",
    ],
    notes: "小窗香炉使用克制可爱的 Q 版素材；不携带任何背景面板。",
    renderBox: VISUAL_ASSET_FAMILY_SPECS.censer.compact.renderBox,
    sourceCanvas: VISUAL_ASSET_FAMILY_SPECS.censer.compact.sourceCanvas,
    status: "temporary-test",
    transparentBackground: true,
  },
  incenseStage: {
    alignmentAnchor: "香炉炉口中心线和左到右燃烧顺序",
    dimensionPolicy: "exact-source-canvas",
    directory: VISUAL_ASSET_DIRECTORIES.incenseStage,
    doNotBake: ["香炉", "桌面背景", "香数状态"],
    manifestSlots: [
      "incense/stage/stick",
      "incense/stage/ash",
      "incense/stage/ember",
      "incense/stage/smoke",
    ],
    notes: "主祭台线香图层由进度驱动；不得为 1/2/3 炷香分别烘焙整图。",
    renderBox: VISUAL_ASSET_FAMILY_SPECS.incense.stage.renderBox,
    sourceCanvas: VISUAL_ASSET_FAMILY_SPECS.incense.stage.sourceCanvas,
    status: "temporary-test",
    transparentBackground: true,
  },
  incenseCompact: {
    alignmentAnchor: "小窗香炉炉口中心线和左到右燃烧顺序",
    dimensionPolicy: "exact-source-canvas",
    directory: VISUAL_ASSET_DIRECTORIES.incenseCompact,
    doNotBake: ["香炉", "窗口背景", "香数状态"],
    manifestSlots: [
      "incense/compact/stick",
      "incense/compact/ash",
      "incense/compact/ember",
      "incense/compact/smoke",
    ],
    notes: "小窗线香已接入临时 PNG，用于验证 compact 线香素材链路；正式线香仍可按同一插槽替换。",
    renderBox: VISUAL_ASSET_FAMILY_SPECS.incense.compact.renderBox,
    sourceCanvas: VISUAL_ASSET_FAMILY_SPECS.incense.compact.sourceCanvas,
    status: "temporary-test",
    transparentBackground: true,
  },
} as const satisfies Record<string, VisualAssetReplacementTarget>;

export const VISUAL_ASSET_REPLACEMENT_ORDER = [
  "altarBackground",
  "censerStage",
  "censerCompact",
  "talismanSituation",
  "talismanPrevention",
  "incenseStage",
  "incenseCompact",
] as const satisfies readonly (keyof typeof VISUAL_ASSET_REPLACEMENT_REGISTRY)[];

export const getVisualAssetRenderVars = (
  family: "censer" | "incense",
  size: VisualAssetSize,
) => {
  const { renderBox } = VISUAL_ASSET_FAMILY_SPECS[family][size];

  return {
    [`--${family}-render-height`]: `${renderBox.height}px`,
    [`--${family}-render-width`]: `${renderBox.width}px`,
  } as const;
};

export const getAltarVisualSlot = (layer: AltarAssetLayer): AltarVisualSlot => `altar/${layer}`;

export const getTalismanVisualSlot = (
  variant: TalismanAssetVariant,
  layer: TalismanAssetLayer,
): TalismanVisualSlot =>
  `talisman/${variant}/${layer}`;

export const getCenserVisualSlot = (size: VisualAssetSize, layer: CenserAssetLayer): CenserVisualSlot =>
  `censer/${size}/${layer}`;

export const getIncenseVisualSlot = (size: VisualAssetSize, layer: IncenseAssetLayer): IncenseVisualSlot =>
  `incense/${size}/${layer}`;
