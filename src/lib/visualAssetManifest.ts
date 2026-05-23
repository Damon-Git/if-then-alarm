import {
  getAltarVisualSlot,
  getCenserVisualSlot,
  getIncenseVisualSlot,
  getTalismanVisualSlot,
  type AltarAssetLayer,
  type CenserAssetLayer,
  type IncenseAssetLayer,
  type TalismanAssetLayer,
  type TalismanAssetVariant,
  type VisualAssetSlot,
  type VisualAssetSize,
} from "./visualAssets";
import altarBackgroundUrl from "../assets/visuals/altar/background.png";
import compactCenserAshUrl from "../assets/visuals/censer/compact/ash.png";
import compactCenserBodyUrl from "../assets/visuals/censer/compact/body.png";
import compactCenserFeetUrl from "../assets/visuals/censer/compact/feet.png";
import compactCenserLidUrl from "../assets/visuals/censer/compact/lid.png";
import compactCenserMouthUrl from "../assets/visuals/censer/compact/mouth.png";
import preventionTalismanTemplateUrl from "../assets/visuals/talisman/prevention/template.png";
import situationTalismanTemplateUrl from "../assets/visuals/talisman/situation/template.png";

export type VisualAssetManifest = Partial<Record<VisualAssetSlot, string>>;

export const visualAssetManifest = {
  "altar/background": altarBackgroundUrl,
  "censer/compact/ash": compactCenserAshUrl,
  "censer/compact/body": compactCenserBodyUrl,
  "censer/compact/feet": compactCenserFeetUrl,
  "censer/compact/lid": compactCenserLidUrl,
  "censer/compact/mouth": compactCenserMouthUrl,
  "talisman/prevention/template": preventionTalismanTemplateUrl,
  "talisman/situation/template": situationTalismanTemplateUrl,
} satisfies VisualAssetManifest;

export const getVisualAssetUrl = (
  visualSlot: VisualAssetSlot,
  manifest: VisualAssetManifest = visualAssetManifest,
) => manifest[visualSlot];

export const getAltarAssetUrl = (layer: AltarAssetLayer, manifest?: VisualAssetManifest) =>
  getVisualAssetUrl(getAltarVisualSlot(layer), manifest);

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
