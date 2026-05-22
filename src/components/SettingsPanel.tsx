import { TIMER_MODE_CONFIG } from "../constants";
import { formatDurationLabel } from "../lib/timer";
import type { TimerMode } from "../types";
import DevSessionFixturesPanel from "./DevSessionFixturesPanel";

type SettingsPanelProps = {
  disabled: boolean;
  isAlwaysOnTop: boolean;
  isDockVisible: boolean;
  isSoundReminderEnabled: boolean;
  onAlwaysOnTopChange: (isAlwaysOnTop: boolean) => void;
  onDockVisibleChange: (isDockVisible: boolean) => void;
  onDevSessionFixtureSaved?: (message: string) => void;
  onSoundReminderChange: (isSoundReminderEnabled: boolean) => void;
  timerMode: TimerMode;
  onTimerModeChange: (timerMode: TimerMode) => void;
  supportsWindowAlwaysOnTop: boolean;
};

const timerModes: TimerMode[] = ["dev", "prod"];

const SettingsPanel = ({
  disabled,
  isAlwaysOnTop,
  isDockVisible,
  isSoundReminderEnabled,
  onAlwaysOnTopChange,
  onDockVisibleChange,
  onDevSessionFixtureSaved,
  onSoundReminderChange,
  onTimerModeChange,
  supportsWindowAlwaysOnTop,
  timerMode,
}: SettingsPanelProps) => {
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

      <div className="settings-toggle-list" aria-label="提醒设置">
        <label className="settings-toggle">
          <span>
            <strong>声音提醒</strong>
            <small>预留给下一版钟声提醒；当前只保存设置，不播放声音。</small>
          </span>
          <input
            checked={isSoundReminderEnabled}
            onChange={(event) => onSoundReminderChange(event.target.checked)}
            type="checkbox"
          />
        </label>
      </div>

      {supportsWindowAlwaysOnTop ? (
        <div className="settings-toggle-list" aria-label="桌面窗口设置">
          <label className="settings-toggle">
            <span>
              <strong>窗口置顶</strong>
              <small>开启后，小窗会保持在其他窗口上方。</small>
            </span>
            <input
              checked={isAlwaysOnTop}
              onChange={(event) => onAlwaysOnTopChange(event.target.checked)}
              type="checkbox"
            />
          </label>

          <label className="settings-toggle">
            <span>
              <strong>在 Dock 中显示</strong>
              <small>关闭后仍可通过菜单栏“令”入口唤回窗口。</small>
            </span>
            <input
              checked={isDockVisible}
              onChange={(event) => onDockVisibleChange(event.target.checked)}
              type="checkbox"
            />
          </label>
        </div>
      ) : null}

      {import.meta.env.DEV && onDevSessionFixtureSaved ? (
        <DevSessionFixturesPanel disabled={disabled} onFixtureSaved={onDevSessionFixtureSaved} />
      ) : null}
    </section>
  );
};

export default SettingsPanel;
