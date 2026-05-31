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
  ALTAR_BACKGROUND_ALIGNMENT_GUIDES,
  ALTAR_ASSET_REQUIREMENTS,
  ALTAR_ASSET_LAYERS,
  CENSER_ASSET_LAYERS,
  COMPACT_CENSER_ASSET_REQUIREMENTS,
  INCENSE_ASSET_LAYERS,
  getCenserVisualSlot,
  getIncenseVisualSlot,
  getAltarVisualSlot,
  getTalismanVisualSlot,
  getVisualAssetRenderVars,
  STAGE_CENSER_ASSET_REQUIREMENTS,
  TALISMAN_ASSET_LAYERS,
  TALISMAN_ASSET_REQUIREMENTS,
  TALISMAN_TEXT_SAFE_ZONES,
  VISUAL_ASSET_FAMILY_SPECS,
  VISUAL_ASSET_REPLACEMENT_ORDER,
  VISUAL_ASSET_REPLACEMENT_REGISTRY,
} from "./visualAssets";

describe("visual asset manifest", () => {
  it("configures altar, censer, incense, and talisman assets", () => {
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
      "incense/compact/ash",
      "incense/compact/ember",
      "incense/compact/smoke",
      "incense/compact/stick",
      "incense/stage/ash",
      "incense/stage/ember",
      "incense/stage/smoke",
      "incense/stage/stick",
      "talisman/prevention/template",
      "talisman/situation/template",
    ]);
    expect(getAltarAssetUrl("background")).toEqual(expect.stringContaining("background"));
    expect(getVisualAssetUrl("censer/stage/body")).toEqual(expect.stringContaining("body"));
    expect(getCenserAssetUrl("stage", "body")).toEqual(expect.stringContaining("body"));
    expect(getCenserAssetUrl("compact", "body")).toEqual(expect.stringContaining("body"));
    expect(getIncenseAssetUrl("compact", "stick")).toEqual(expect.stringContaining("stick"));
    expect(getIncenseAssetUrl("compact", "ash")).toEqual(expect.stringContaining("ash"));
    expect(getIncenseAssetUrl("compact", "ember")).toEqual(expect.stringContaining("ember"));
    expect(getIncenseAssetUrl("compact", "smoke")).toEqual(expect.stringContaining("smoke"));
    expect(getIncenseAssetUrl("stage", "stick")).toEqual(expect.stringContaining("stick"));
    expect(getIncenseAssetUrl("stage", "ash")).toEqual(expect.stringContaining("ash"));
    expect(getIncenseAssetUrl("stage", "ember")).toEqual(expect.stringContaining("ember"));
    expect(getIncenseAssetUrl("stage", "smoke")).toEqual(expect.stringContaining("smoke"));
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
    expect(VISUAL_ASSET_FAMILY_SPECS.censer.compact.renderBox).toEqual({ height: 90, width: 82 });
    expect(VISUAL_ASSET_FAMILY_SPECS.incense.compact.sourceCanvas).toEqual({ height: 192, width: 192 });
  });

  it("keeps stage censer replacement specs explicit", () => {
    expect(STAGE_CENSER_ASSET_REQUIREMENTS).toMatchObject({
      background: "transparent",
      family: "stage",
      maxCenserSlots: 3,
      maxIncenseCount: 3,
      minIncenseCount: 1,
      tone: "formal-ritual",
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
    expect(getIncenseAssetUrl("stage", "stick")).toBeDefined();
    expect(getIncenseAssetUrl("compact", "stick")).toBeDefined();
    expect(getIncenseAssetUrl("stage", "stick")).not.toBe(getIncenseAssetUrl("compact", "stick"));
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
    expect(TALISMAN_TEXT_SAFE_ZONES).toEqual({
      leftColumn: {
        bottomPercent: 84,
        innerEdgePercent: 35,
        outerEdgePercent: 12,
        topPercent: 18,
      },
      rightColumn: {
        bottomPercent: 84,
        innerEdgePercent: 65,
        outerEdgePercent: 88,
        topPercent: 18,
      },
    });
  });

  it("keeps altar background slot explicit for the shared stage", () => {
    expect(ALTAR_ASSET_REQUIREMENTS).toMatchObject({
      backgroundRole: "shared-stage-reference",
      maxCenserSlots: 3,
      tableLayout: "single-table-even-slots",
    });
    expect(ALTAR_ASSET_LAYERS.map((layer) => getAltarVisualSlot(layer))).toEqual(["altar/background"]);
    expect(ALTAR_BACKGROUND_ALIGNMENT_GUIDES.map((guide) => guide.key)).toEqual([
      "situation-talisman-top",
      "censer-center-line",
      "prevention-talisman-edge",
      "left-censer-center",
      "middle-censer-center",
      "right-censer-center",
    ]);
    expect(ALTAR_BACKGROUND_ALIGNMENT_GUIDES.find((guide) => guide.key === "censer-center-line")).toMatchObject({
      axis: "horizontal",
      positionPercent: 64,
    });
  });

  it("keeps replacement registry explicit for real asset handoff", () => {
    expect(VISUAL_ASSET_REPLACEMENT_ORDER).toEqual([
      "altarBackground",
      "censerStage",
      "censerCompact",
      "talismanSituation",
      "talismanPrevention",
      "incenseStage",
      "incenseCompact",
    ]);
    expect(VISUAL_ASSET_REPLACEMENT_REGISTRY.altarBackground).toMatchObject({
      dimensionPolicy: "exact-source-canvas",
      directory: "src/assets/visuals/altar",
      manifestSlots: ["altar/background"],
      status: "final",
      transparentBackground: false,
    });
    expect(VISUAL_ASSET_REPLACEMENT_REGISTRY.censerStage).toMatchObject({
      alignmentAnchor: "香炉底部中心点和盖子闭合位置",
      dimensionPolicy: "exact-source-canvas",
      manifestSlots: [
        "censer/stage/lid",
        "censer/stage/mouth",
        "censer/stage/ash",
        "censer/stage/body",
        "censer/stage/feet",
      ],
      status: "final",
      transparentBackground: true,
    });
    expect(VISUAL_ASSET_REPLACEMENT_REGISTRY.censerCompact).toMatchObject({
      dimensionPolicy: "exact-source-canvas",
      status: "final",
      transparentBackground: true,
    });
    expect(VISUAL_ASSET_REPLACEMENT_REGISTRY.talismanSituation).toMatchObject({
      dimensionPolicy: "exact-source-canvas",
      sourceCanvas: { height: 1280, width: 512 },
      status: "final",
      transparentBackground: false,
    });
    expect(VISUAL_ASSET_REPLACEMENT_REGISTRY.talismanSituation.doNotBake).toContain("用户执行意图文本");
    expect(VISUAL_ASSET_REPLACEMENT_REGISTRY.talismanPrevention).toMatchObject({
      dimensionPolicy: "exact-source-canvas",
      sourceCanvas: { height: 1280, width: 512 },
      status: "final",
      transparentBackground: false,
    });
    expect(VISUAL_ASSET_REPLACEMENT_REGISTRY.talismanPrevention.doNotBake).toContain("用户执行意图文本");
    expect(VISUAL_ASSET_REPLACEMENT_REGISTRY.incenseStage).toMatchObject({
      dimensionPolicy: "exact-source-canvas",
      manifestSlots: [
        "incense/stage/stick",
        "incense/stage/ash",
        "incense/stage/ember",
        "incense/stage/smoke",
      ],
      status: "final",
      transparentBackground: true,
    });
    expect(VISUAL_ASSET_REPLACEMENT_REGISTRY.incenseCompact).toMatchObject({
      dimensionPolicy: "exact-source-canvas",
      manifestSlots: [
        "incense/compact/stick",
        "incense/compact/ash",
        "incense/compact/ember",
        "incense/compact/smoke",
      ],
      status: "final",
      transparentBackground: true,
    });
  });

  it("exposes render boxes as CSS custom properties for visual components", () => {
    expect(getVisualAssetRenderVars("censer", "stage")).toEqual({
      "--censer-render-height": "118px",
      "--censer-render-width": "118px",
    });
    expect(getVisualAssetRenderVars("incense", "compact")).toEqual({
      "--incense-render-height": "50px",
      "--incense-render-width": "72px",
    });
  });
});
