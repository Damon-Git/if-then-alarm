import { useRef, type ChangeEvent } from "react";
import { TIMER_MODE_CONFIG } from "../constants";
import { APP_METADATA } from "../lib/appMetadata";
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
  onExportFullBackup: () => void;
  onImportFullBackup: (file?: File) => void;
  onSoundReminderChange: (isSoundReminderEnabled: boolean) => void;
  timerMode: TimerMode;
  onTimerModeChange: (timerMode: TimerMode) => void;
  supportsWindowAlwaysOnTop: boolean;
  useNativeFileDialog: boolean;
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
  onExportFullBackup,
  onImportFullBackup,
  onSoundReminderChange,
  onTimerModeChange,
  supportsWindowAlwaysOnTop,
  timerMode,
  useNativeFileDialog,
}: SettingsPanelProps) => {
  const currentConfig = TIMER_MODE_CONFIG[timerMode];
  const fullBackupInputRef = useRef<HTMLInputElement>(null);

  const selectFullBackupFile = () => {
    if (disabled) {
      return;
    }

    if (useNativeFileDialog) {
      onImportFullBackup();
      return;
    }

    fullBackupInputRef.current?.click();
  };

  const importFullBackupFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      onImportFullBackup(file);
    }

    event.target.value = "";
  };

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
            <small>开启后，专注、休息或整轮结束时播放一次克制钟声。</small>
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

      <div className="settings-action-list" aria-label="完整备份">
        <div className="settings-action">
          <span>
            <strong>完整备份</strong>
            <small>导出或导入历史记录、未完成轮次和设置。导入会先确认，适合迁移或恢复自用数据。</small>
          </span>
          <div className="settings-action-buttons">
            <button className="ghost-button" type="button" onClick={onExportFullBackup}>
              导出完整备份
            </button>
            <button className="ghost-button" disabled={disabled} type="button" onClick={selectFullBackupFile}>
              导入完整备份
            </button>
          </div>
          {useNativeFileDialog ? null : (
            <input
              accept="application/json,.json"
              className="hidden-file-input"
              onChange={importFullBackupFile}
              ref={fullBackupInputRef}
              type="file"
            />
          )}
        </div>
      </div>

      <div className="settings-metadata-list" aria-label="版本信息">
        <span>
          <strong>版本信息</strong>
          <small>用于确认当前自用包、数据版本和 bundle 标识。</small>
        </span>
        <dl className="settings-metadata">
          <div>
            <dt>应用版本</dt>
            <dd>v{APP_METADATA.version}</dd>
          </div>
          <div>
            <dt>构建类型</dt>
            <dd>{APP_METADATA.buildLabel}</dd>
          </div>
          <div>
            <dt>Bundle ID</dt>
            <dd>{APP_METADATA.identifier}</dd>
          </div>
          <div>
            <dt>数据版本</dt>
            <dd>
              {APP_METADATA.dataFilename} / v{APP_METADATA.dataSchemaVersion}
            </dd>
          </div>
        </dl>
      </div>

      {import.meta.env.DEV && onDevSessionFixtureSaved ? (
        <DevSessionFixturesPanel disabled={disabled} onFixtureSaved={onDevSessionFixtureSaved} />
      ) : null}
    </section>
  );
};

export default SettingsPanel;
