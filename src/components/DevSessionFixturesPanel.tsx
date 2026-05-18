import { DEV_SESSION_FIXTURES, saveDevSessionFixture, type DevSessionFixtureId } from "../lib/devSessionFixtures";

type DevSessionFixturesPanelProps = {
  disabled: boolean;
  onFixtureSaved: (message: string) => void;
};

const DevSessionFixturesPanel = ({ disabled, onFixtureSaved }: DevSessionFixturesPanelProps) => {
  const saveFixture = (fixtureId: DevSessionFixtureId, title: string) => {
    saveDevSessionFixture(fixtureId);
    onFixtureSaved(`已写入模拟 session：${title}。请刷新页面验证恢复流程。`);
  };

  return (
    <div className="dev-fixtures" aria-label="开发恢复场景">
      <div className="dev-fixtures__heading">
        <span>开发恢复场景</span>
        <small>写入后刷新页面验证</small>
      </div>

      <div className="dev-fixtures__grid">
        {DEV_SESSION_FIXTURES.map((fixture) => (
          <button
            className="ghost-button dev-fixtures__button"
            disabled={disabled}
            key={fixture.id}
            type="button"
            onClick={() => saveFixture(fixture.id, fixture.title)}
          >
            <strong>{fixture.title}</strong>
            <span>{fixture.description}</span>
          </button>
        ))}
      </div>

      {disabled ? <p className="dev-fixtures__note">当前有未完成轮次或待恢复轮次，不能覆盖模拟 session。</p> : null}
    </div>
  );
};

export default DevSessionFixturesPanel;
