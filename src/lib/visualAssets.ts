export type VisualAssetSize = "stage" | "compact";

export type TalismanAssetVariant = "situation" | "prevention";

export type TalismanAssetLayer = "template" | "state" | "text";

export type CenserAssetLayer = "lid" | "mouth" | "ash" | "body" | "feet";

export type IncenseAssetLayer = "stick" | "ash" | "ember" | "smoke";

export type TalismanVisualSlot = `talisman/${TalismanAssetVariant}/${TalismanAssetLayer}`;

export type CenserVisualSlot = `censer/${VisualAssetSize}/${CenserAssetLayer}`;

export type IncenseVisualSlot = `incense/${VisualAssetSize}/${IncenseAssetLayer}`;

export type VisualAssetSlot = TalismanVisualSlot | CenserVisualSlot | IncenseVisualSlot;

type VisualAssetPixelSize = {
  height: number;
  width: number;
};

type VisualAssetFamilySpec = {
  /**
   * Expected transparent canvas size for exported source assets.
   */
  sourceCanvas: VisualAssetPixelSize;
  /**
   * Approximate CSS render box used by the current placeholder.
   */
  renderBox: VisualAssetPixelSize;
};

export const VISUAL_ASSET_ROOT = "src/assets/visuals";

export const VISUAL_ASSET_FAMILY_SPECS = {
  censer: {
    compact: {
      renderBox: { height: 84, width: 74 },
      sourceCanvas: { height: 256, width: 256 },
    },
    stage: {
      renderBox: { height: 104, width: 96 },
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

export const COMPACT_CENSER_ASSET_REQUIREMENTS = {
  background: "transparent",
  maxCenserSlots: 3,
  maxIncenseCount: 3,
  minIncenseCount: 1,
  tone: "restrained-cute",
} as const;

export const VISUAL_ASSET_DIRECTORIES = {
  censerCompact: `${VISUAL_ASSET_ROOT}/censer/compact`,
  censerStage: `${VISUAL_ASSET_ROOT}/censer/stage`,
  incenseCompact: `${VISUAL_ASSET_ROOT}/incense/compact`,
  incenseStage: `${VISUAL_ASSET_ROOT}/incense/stage`,
  talismanPrevention: `${VISUAL_ASSET_ROOT}/talisman/prevention`,
  talismanSituation: `${VISUAL_ASSET_ROOT}/talisman/situation`,
} as const;

export const getTalismanVisualSlot = (
  variant: TalismanAssetVariant,
  layer: TalismanAssetLayer,
): TalismanVisualSlot =>
  `talisman/${variant}/${layer}`;

export const getCenserVisualSlot = (size: VisualAssetSize, layer: CenserAssetLayer): CenserVisualSlot =>
  `censer/${size}/${layer}`;

export const getIncenseVisualSlot = (size: VisualAssetSize, layer: IncenseAssetLayer): IncenseVisualSlot =>
  `incense/${size}/${layer}`;
