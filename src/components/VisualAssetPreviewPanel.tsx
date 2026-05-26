import { useMemo, useState, type CSSProperties } from "react";
import { getAltarAssetUrl } from "../lib/visualAssetManifest";
import {
  VISUAL_ASSET_REPLACEMENT_ORDER,
  VISUAL_ASSET_REPLACEMENT_REGISTRY,
  type VisualAssetReplacementTarget,
} from "../lib/visualAssets";
import type { IntentSet, IntentSetStatus } from "../types";
import IntentSlot from "./IntentSlot";

type PreviewStatusOption = {
  label: string;
  value: IntentSetStatus;
};

type RegistryEntry = {
  key: (typeof VISUAL_ASSET_REPLACEMENT_ORDER)[number];
  target: VisualAssetReplacementTarget;
};

const statusOptions = [
  { label: "未开始", value: "idle" },
  { label: "燃烧中", value: "burning" },
  { label: "休息中", value: "resting" },
  { label: "已完成", value: "completed" },
] as const satisfies readonly PreviewStatusOption[];

const sampleSituationIntents = [
  "当我坐到书桌前，就打开今天要完成的那个文档，而不是先刷手机。",
  "当我准备开始写作时，就先写下一句，只追求进入状态。",
  "当我打开电脑时，就先完成第一个最小行动。",
];

const samplePreventionIntents = [
  "如果我想切到短视频，那么我就先闭眼休息五分钟。",
  "如果我开始犹豫，那么我就只做下一步最小动作。",
  "如果我想重新规划，那么我就先完成当前这一炷香。",
];

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatSize = (size: { height: number; width: number } | undefined) =>
  size ? `${size.width} x ${size.height}` : "未固定";

const getPreviewCurrentIncenseIndex = (status: IntentSetStatus, incenseCount: number, currentIncenseIndex: number) => {
  if (status === "idle") {
    return 1;
  }

  if (status === "completed") {
    return incenseCount;
  }

  return clampNumber(currentIncenseIndex, 1, incenseCount);
};

const createPreviewIntentSets = ({
  currentIncenseIndex,
  incenseCount,
  preventionCount,
  status,
}: {
  currentIncenseIndex: number;
  incenseCount: number;
  preventionCount: number;
  status: IntentSetStatus;
}): IntentSet[] =>
  sampleSituationIntents.map((situationIntent, index) => ({
    currentIncenseIndex: getPreviewCurrentIncenseIndex(status, incenseCount, currentIncenseIndex),
    id: `visual-preview-${index + 1}`,
    incenseCount,
    preventionIntents: samplePreventionIntents.slice(0, preventionCount),
    situationIntent,
    status,
  }));

const registryEntries = VISUAL_ASSET_REPLACEMENT_ORDER.map((key) => ({
  key,
  target: VISUAL_ASSET_REPLACEMENT_REGISTRY[key] as VisualAssetReplacementTarget,
})) satisfies RegistryEntry[];

const VisualAssetPreviewPanel = () => {
  const [status, setStatus] = useState<IntentSetStatus>("idle");
  const [incenseCount, setIncenseCount] = useState(3);
  const [currentIncenseIndex, setCurrentIncenseIndex] = useState(1);
  const [incenseProgress, setIncenseProgress] = useState(45);
  const [preventionCount, setPreventionCount] = useState(3);

  const normalizedCurrentIncenseIndex = getPreviewCurrentIncenseIndex(status, incenseCount, currentIncenseIndex);
  const previewIntentSets = useMemo(
    () =>
      createPreviewIntentSets({
        currentIncenseIndex: normalizedCurrentIncenseIndex,
        incenseCount,
        preventionCount,
        status,
      }),
    [incenseCount, normalizedCurrentIncenseIndex, preventionCount, status],
  );
  const altarBackgroundUrl = getAltarAssetUrl("background");
  const timerRemaining = status === "burning" ? Math.round(100 - incenseProgress) : status === "resting" ? 35 : 0;
  const previewProgress = status === "burning" ? incenseProgress / 100 : status === "idle" ? 0 : 1;

  const updateIncenseCount = (nextIncenseCount: number) => {
    setIncenseCount(nextIncenseCount);
    setCurrentIncenseIndex((currentIndex) => clampNumber(currentIndex, 1, nextIncenseCount));
  };

  return (
    <section className="panel visual-asset-preview" aria-labelledby="visual-asset-preview-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Visual Assets</p>
          <h2 id="visual-asset-preview-title">视觉素材预览</h2>
        </div>
        <span className="visual-asset-preview__badge">Dev</span>
      </div>

      <div className="visual-asset-preview__controls" aria-label="预览控制">
        <div className="visual-asset-preview__control">
          <span>香炉状态</span>
          <div className="segmented-control visual-asset-preview__status-control" aria-label="香炉状态">
            {statusOptions.map((option) => (
              <button
                className={status === option.value ? "is-selected" : ""}
                key={option.value}
                type="button"
                onClick={() => setStatus(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="visual-asset-preview__control">
          <span>香数</span>
          <div className="segmented-control" aria-label="香数">
            {[1, 2, 3].map((count) => (
              <button
                className={incenseCount === count ? "is-selected" : ""}
                key={count}
                type="button"
                onClick={() => updateIncenseCount(count)}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <label className="visual-asset-preview__control">
          <span>当前香</span>
          <select
            disabled={status === "idle" || status === "completed"}
            onChange={(event) => setCurrentIncenseIndex(Number(event.target.value))}
            value={normalizedCurrentIncenseIndex}
          >
            {Array.from({ length: incenseCount }, (_, index) => index + 1).map((index) => (
              <option key={index} value={index}>
                第 {index} 炷
              </option>
            ))}
          </select>
        </label>

        <label className="visual-asset-preview__control">
          <span>线香进度</span>
          <input
            disabled={status !== "burning"}
            max="100"
            min="0"
            onChange={(event) => setIncenseProgress(Number(event.target.value))}
            step="5"
            type="range"
            value={incenseProgress}
          />
          <strong>{status === "burning" ? `${incenseProgress}%` : status === "idle" ? "0%" : "100%"}</strong>
        </label>

        <div className="visual-asset-preview__control">
          <span>预防符箓</span>
          <div className="segmented-control visual-asset-preview__prevention-control" aria-label="预防符箓数量">
            {[0, 1, 2, 3].map((count) => (
              <button
                className={preventionCount === count ? "is-selected" : ""}
                key={count}
                type="button"
                onClick={() => setPreventionCount(count)}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="altar-scene altar-scene--slots-3 visual-asset-preview__scene"
        style={{ "--altar-background-image": `url(${altarBackgroundUrl})` } as CSSProperties}
      >
        <div className="altar-scene__slots">
          {previewIntentSets.map((intentSet) => (
            <IntentSlot
              actionDisabled={false}
              incenseProgress={previewProgress}
              intentSet={intentSet}
              isStartAnimationActive={false}
              key={intentSet.id}
              onStart={() => undefined}
              timerRemaining={timerRemaining}
            />
          ))}
        </div>
      </div>

      <div className="visual-asset-preview__registry" aria-label="素材插槽清单">
        {registryEntries.map(({ key, target }) => (
          <article className="visual-asset-preview__registry-card" key={key}>
            <div>
              <h3>{key}</h3>
              <p>{target.alignmentAnchor}</p>
            </div>
            <dl>
              <div>
                <dt>插槽</dt>
                <dd>{target.manifestSlots.join(" / ")}</dd>
              </div>
              <div>
                <dt>源画布</dt>
                <dd>{formatSize(target.sourceCanvas)}</dd>
              </div>
              <div>
                <dt>渲染盒</dt>
                <dd>{formatSize(target.renderBox)}</dd>
              </div>
              <div>
                <dt>尺寸策略</dt>
                <dd>{target.dimensionPolicy}</dd>
              </div>
              <div>
                <dt>透明边界</dt>
                <dd>{target.transparentBackground ? "四角必须透明" : "允许不透明背景"}</dd>
              </div>
              <div>
                <dt>状态</dt>
                <dd>{target.status}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
};

export default VisualAssetPreviewPanel;
