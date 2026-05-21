import {
  getCenserVisualSlot,
  getIncenseVisualSlot,
  getTalismanVisualSlot,
  type CenserAssetLayer,
  type IncenseAssetLayer,
  type TalismanAssetLayer,
  type TalismanAssetVariant,
  type VisualAssetSlot,
  type VisualAssetSize,
} from "./visualAssets";

export type VisualAssetManifest = Partial<Record<VisualAssetSlot, string>>;

export const visualAssetManifest = {} satisfies VisualAssetManifest;

export const getVisualAssetUrl = (
  visualSlot: VisualAssetSlot,
  manifest: VisualAssetManifest = visualAssetManifest,
) => manifest[visualSlot];

export const getTalismanAssetUrl = (
  variant: TalismanAssetVariant,
  layer: TalismanAssetLayer,
  manifest?: VisualAssetManifest,
) => getVisualAssetUrl(getTalismanVisualSlot(variant, layer), manifest);

export const getCenserAssetUrl = (
  size: VisualAssetSize,
  layer: CenserAssetLayer,
  manifest?: VisualAssetManifest,
) => getVisualAssetUrl(getCenserVisualSlot(size, layer), manifest);

export const getIncenseAssetUrl = (
  size: VisualAssetSize,
  layer: IncenseAssetLayer,
  manifest?: VisualAssetManifest,
) => getVisualAssetUrl(getIncenseVisualSlot(size, layer), manifest);
