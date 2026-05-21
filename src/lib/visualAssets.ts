export type VisualAssetSize = "stage" | "compact";

export type TalismanAssetVariant = "situation" | "prevention";

export type TalismanAssetLayer = "template" | "state" | "text";

export type CenserAssetLayer = "lid" | "mouth" | "ash" | "body" | "feet";

export type IncenseAssetLayer = "stick" | "ash" | "ember" | "smoke";

export type TalismanVisualSlot = `talisman/${TalismanAssetVariant}/${TalismanAssetLayer}`;

export type CenserVisualSlot = `censer/${VisualAssetSize}/${CenserAssetLayer}`;

export type IncenseVisualSlot = `incense/${VisualAssetSize}/${IncenseAssetLayer}`;

export type VisualAssetSlot = TalismanVisualSlot | CenserVisualSlot | IncenseVisualSlot;

export const VISUAL_ASSET_ROOT = "src/assets/visuals";

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
