import { describe, expect, it } from "vitest";
import {
  getCenserAssetUrl,
  getIncenseAssetUrl,
  getTalismanAssetUrl,
  getVisualAssetUrl,
  visualAssetManifest,
  type VisualAssetManifest,
} from "./visualAssetManifest";
import {
  COMPACT_CENSER_ASSET_REQUIREMENTS,
  getCenserVisualSlot,
  getIncenseVisualSlot,
  VISUAL_ASSET_FAMILY_SPECS,
} from "./visualAssets";

describe("visual asset manifest", () => {
  it("keeps non-compact default slots empty when only compact test assets are configured", () => {
    expect(getVisualAssetUrl("censer/stage/body")).toBeUndefined();
    expect(getCenserAssetUrl("stage", "body")).toBeUndefined();
    expect(Object.keys(visualAssetManifest).sort()).toEqual([
      "censer/compact/ash",
      "censer/compact/body",
      "censer/compact/feet",
      "censer/compact/lid",
      "censer/compact/mouth",
    ]);
    expect(getCenserAssetUrl("compact", "body")).toEqual(expect.stringContaining("body"));
  });

  it("returns configured asset URLs by visual slot", () => {
    const manifest: VisualAssetManifest = {
      "censer/stage/body": "/visuals/censer/stage/body.png",
      "incense/compact/stick": "/visuals/incense/compact/stick.png",
      "talisman/situation/template": "/visuals/talisman/situation/template.png",
    };

    expect(getVisualAssetUrl("censer/stage/body", manifest)).toBe("/visuals/censer/stage/body.png");
    expect(getCenserAssetUrl("stage", "body", manifest)).toBe("/visuals/censer/stage/body.png");
    expect(getIncenseAssetUrl("compact", "stick", manifest)).toBe("/visuals/incense/compact/stick.png");
    expect(getTalismanAssetUrl("situation", "template", manifest)).toBe(
      "/visuals/talisman/situation/template.png",
    );
  });

  it("keeps compact censer replacement specs explicit", () => {
    expect(COMPACT_CENSER_ASSET_REQUIREMENTS).toMatchObject({
      background: "transparent",
      maxCenserSlots: 3,
      maxIncenseCount: 3,
      minIncenseCount: 1,
      tone: "restrained-cute",
    });
    expect(VISUAL_ASSET_FAMILY_SPECS.censer.compact.sourceCanvas).toEqual({ height: 256, width: 256 });
    expect(VISUAL_ASSET_FAMILY_SPECS.censer.compact.renderBox).toEqual({ height: 84, width: 74 });
    expect(VISUAL_ASSET_FAMILY_SPECS.incense.compact.sourceCanvas).toEqual({ height: 192, width: 192 });
  });

  it("keeps compact censer and incense slots stable for real assets", () => {
    const censerLayers = ["lid", "mouth", "ash", "body", "feet"] as const;
    const incenseLayers = ["stick", "ash", "ember", "smoke"] as const;

    expect(censerLayers.map((layer) => getCenserVisualSlot("compact", layer))).toEqual([
      "censer/compact/lid",
      "censer/compact/mouth",
      "censer/compact/ash",
      "censer/compact/body",
      "censer/compact/feet",
    ]);
    expect(incenseLayers.map((layer) => getIncenseVisualSlot("compact", layer))).toEqual([
      "incense/compact/stick",
      "incense/compact/ash",
      "incense/compact/ember",
      "incense/compact/smoke",
    ]);
  });
});
