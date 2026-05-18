export type VisualAssetSize = "stage" | "compact";

export type TalismanAssetVariant = "situation" | "prevention";

export type TalismanAssetLayer = "template" | "state" | "text";

export type CenserAssetLayer = "lid" | "mouth" | "ash" | "body" | "feet";

export type IncenseAssetLayer = "stick" | "ash" | "ember" | "smoke";

export const VISUAL_ASSET_ROOT = "src/assets/visuals";

export const VISUAL_ASSET_DIRECTORIES = {
  censerCompact: `${VISUAL_ASSET_ROOT}/censer/compact`,
  censerStage: `${VISUAL_ASSET_ROOT}/censer/stage`,
  incenseCompact: `${VISUAL_ASSET_ROOT}/incense/compact`,
  incenseStage: `${VISUAL_ASSET_ROOT}/incense/stage`,
  talismanPrevention: `${VISUAL_ASSET_ROOT}/talisman/prevention`,
  talismanSituation: `${VISUAL_ASSET_ROOT}/talisman/situation`,
} as const;

export const getTalismanVisualSlot = (variant: TalismanAssetVariant, layer: TalismanAssetLayer) =>
  `talisman/${variant}/${layer}`;

export const getCenserVisualSlot = (size: VisualAssetSize, layer: CenserAssetLayer) => `censer/${size}/${layer}`;

export const getIncenseVisualSlot = (size: VisualAssetSize, layer: IncenseAssetLayer) => `incense/${size}/${layer}`;
