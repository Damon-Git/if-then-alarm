import { describe, expect, it } from "vitest";
import {
  getCenserAssetUrl,
  getIncenseAssetUrl,
  getTalismanAssetUrl,
  getVisualAssetUrl,
  visualAssetManifest,
  type VisualAssetManifest,
} from "./visualAssetManifest";

describe("visual asset manifest", () => {
  it("returns undefined for the default empty manifest", () => {
    expect(getVisualAssetUrl("censer/stage/body")).toBeUndefined();
    expect(getCenserAssetUrl("stage", "body")).toBeUndefined();
    expect(Object.keys(visualAssetManifest)).toHaveLength(0);
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
});
