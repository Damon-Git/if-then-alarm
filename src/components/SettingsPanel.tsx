import { TIMER_MODE_CONFIG } from "../constants";
import { formatDurationLabel } from "../lib/timer";
import type { TimerMode } from "../types";
import DevSessionFixturesPanel from "./DevSessionFixturesPanel";

type SettingsPanelProps = {
  disabled: boolean;
  onDevSessionFixtureSaved?: (message: string) => void;
  timerMode: TimerMode;
  onTimerModeChange: (timerMode: TimerMode) => void;
};

const timerModes: TimerMode[] = ["dev", "prod"];

const SettingsPanel = ({ disabled, onDevSessionFixtureSaved, timerMode, onTimerModeChange }: SettingsPanelProps) => {
  const currentConfig = TIMER_MODE_CONFIG[timerMode];

  return (
    <section className="panel settings-panel" aria-labelledby="settings-title">
      <div>
        <p className="eyebrow">Settings</p>
        <h2 id="settings-title">计时设置</h2>
      </div>

      <div className="settings-control">
        <span>计时模式</span>
        <div className="segmented-control settings-segmented" aria-label="计时模式">
          {timerModes.map((mode) => (
            <button
              className={timerMode === mode ? "is-selected" : ""}
              disabled={disabled}
              key={mode}
              type="button"
              onClick={() => onTimerModeChange(mode)}
            >
              {TIMER_MODE_CONFIG[mode].label}
            </button>
          ))}
        </div>
      </div>

      <p className="settings-summary">
        当前：专注 {formatDurationLabel(currentConfig.focusSeconds)} / 休息{" "}
        {formatDurationLabel(currentConfig.breakSeconds)}
        {disabled ? "。当前轮次进行中，完成或放弃后可切换。" : ""}
      </p>

      {import.meta.env.DEV && onDevSessionFixtureSaved ? (
        <DevSessionFixturesPanel disabled={disabled} onFixtureSaved={onDevSessionFixtureSaved} />
      ) : null}
    </section>
  );
};

export default SettingsPanel;
