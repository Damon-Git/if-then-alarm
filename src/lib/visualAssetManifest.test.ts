import { describe, expect, it } from "vitest";
import {
  getAltarAssetUrl,
  getCenserAssetUrl,
  getIncenseAssetUrl,
  getTalismanAssetUrl,
  getVisualAssetUrl,
  visualAssetManifest,
  type VisualAssetManifest,
} from "./visualAssetManifest";
import {
  ALTAR_ASSET_REQUIREMENTS,
  ALTAR_ASSET_LAYERS,
  CENSER_ASSET_LAYERS,
  COMPACT_CENSER_ASSET_REQUIREMENTS,
  INCENSE_ASSET_LAYERS,
  getCenserVisualSlot,
  getIncenseVisualSlot,
  getAltarVisualSlot,
  getTalismanVisualSlot,
  STAGE_CENSER_ASSET_REQUIREMENTS,
  TALISMAN_ASSET_LAYERS,
  TALISMAN_ASSET_REQUIREMENTS,
  VISUAL_ASSET_FAMILY_SPECS,
} from "./visualAssets";

describe("visual asset manifest", () => {
  it("configures altar, stage, compact, and talisman test assets", () => {
    expect(Object.keys(visualAssetManifest).sort()).toEqual([
      "altar/background",
      "censer/compact/ash",
      "censer/compact/body",
      "censer/compact/feet",
      "censer/compact/lid",
      "censer/compact/mouth",
      "censer/stage/ash",
      "censer/stage/body",
      "censer/stage/feet",
      "censer/stage/lid",
      "censer/stage/mouth",
      "talisman/prevention/template",
      "talisman/situation/template",
    ]);
    expect(getAltarAssetUrl("background")).toEqual(expect.stringContaining("background"));
    expect(getVisualAssetUrl("censer/stage/body")).toEqual(expect.stringContaining("body"));
    expect(getCenserAssetUrl("stage", "body")).toEqual(expect.stringContaining("body"));
    expect(getCenserAssetUrl("compact", "body")).toEqual(expect.stringContaining("body"));
    expect(getTalismanAssetUrl("situation", "template")).toEqual(expect.stringContaining("template"));
    expect(getTalismanAssetUrl("prevention", "template")).toEqual(expect.stringContaining("template"));
    expect(getTalismanAssetUrl("situation", "text")).toBeUndefined();
    expect(getTalismanAssetUrl("prevention", "text")).toBeUndefined();
  });

  it("returns configured asset URLs by visual slot", () => {
    const manifest: VisualAssetManifest = {
      "altar/background": "/visuals/altar/background.png",
      "censer/stage/body": "/visuals/censer/stage/body.png",
      "incense/compact/stick": "/visuals/incense/compact/stick.png",
      "talisman/situation/template": "/visuals/talisman/situation/template.png",
    };

    expect(getVisualAssetUrl("altar/background", manifest)).toBe("/visuals/altar/background.png");
    expect(getAltarAssetUrl("background", manifest)).toBe("/visuals/altar/background.png");
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

  it("keeps stage censer replacement specs explicit", () => {
    expect(STAGE_CENSER_ASSET_REQUIREMENTS).toMatchObject({
      background: "transparent",
      family: "stage",
      maxCenserSlots: 3,
      maxIncenseCount: 3,
      minIncenseCount: 1,
      tone: "ritual-placeholder",
    });
    expect(VISUAL_ASSET_FAMILY_SPECS.censer.stage.sourceCanvas).toEqual({ height: 320, width: 320 });
    expect(VISUAL_ASSET_FAMILY_SPECS.censer.stage.renderBox).toEqual({ height: 118, width: 118 });
    expect(VISUAL_ASSET_FAMILY_SPECS.incense.stage.sourceCanvas).toEqual({ height: 240, width: 240 });
  });

  it("keeps compact censer and incense slots stable for real assets", () => {
    expect(CENSER_ASSET_LAYERS.map((layer) => getCenserVisualSlot("compact", layer))).toEqual([
      "censer/compact/lid",
      "censer/compact/mouth",
      "censer/compact/ash",
      "censer/compact/body",
      "censer/compact/feet",
    ]);
    expect(INCENSE_ASSET_LAYERS.map((layer) => getIncenseVisualSlot("compact", layer))).toEqual([
      "incense/compact/stick",
      "incense/compact/ash",
      "incense/compact/ember",
      "incense/compact/smoke",
    ]);
  });

  it("keeps stage censer and incense slots separate from compact assets", () => {
    expect(CENSER_ASSET_LAYERS.map((layer) => getCenserVisualSlot("stage", layer))).toEqual([
      "censer/stage/lid",
      "censer/stage/mouth",
      "censer/stage/ash",
      "censer/stage/body",
      "censer/stage/feet",
    ]);
    expect(INCENSE_ASSET_LAYERS.map((layer) => getIncenseVisualSlot("stage", layer))).toEqual([
      "incense/stage/stick",
      "incense/stage/ash",
      "incense/stage/ember",
      "incense/stage/smoke",
    ]);
    expect(getCenserAssetUrl("compact", "body")).toBeDefined();
    expect(getCenserAssetUrl("stage", "body")).toBeDefined();
    expect(getCenserAssetUrl("stage", "body")).not.toBe(getCenserAssetUrl("compact", "body"));
  });

  it("keeps talisman image slots explicit while text stays a React overlay", () => {
    expect(TALISMAN_ASSET_REQUIREMENTS).toMatchObject({
      backgroundSource: "uploaded-template-image",
      maxPreventionCount: 3,
      textLayer: "react-overlay",
    });
    expect(TALISMAN_ASSET_LAYERS.map((layer) => getTalismanVisualSlot("situation", layer))).toEqual([
      "talisman/situation/template",
      "talisman/situation/state",
      "talisman/situation/text",
    ]);
    expect(TALISMAN_ASSET_LAYERS.map((layer) => getTalismanVisualSlot("prevention", layer))).toEqual([
      "talisman/prevention/template",
      "talisman/prevention/state",
      "talisman/prevention/text",
    ]);
  });

  it("keeps altar background slot explicit for the shared stage", () => {
    expect(ALTAR_ASSET_REQUIREMENTS).toMatchObject({
      backgroundRole: "shared-stage-reference",
      maxCenserSlots: 3,
      tableLayout: "single-table-even-slots",
    });
    expect(ALTAR_ASSET_LAYERS.map((layer) => getAltarVisualSlot(layer))).toEqual(["altar/background"]);
  });
});
