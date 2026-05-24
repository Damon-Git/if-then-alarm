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
