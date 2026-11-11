import { useState } from 'react';
import { useStore } from '../graph/store';
import { STEPS } from './script';

export function DemoPanel() {
  const liveAI = useStore((s) => s.liveAI);
  const [next, setNext] = useState(0); // index of the next step to run
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [showList, setShowList] = useState(false);

  const current = STEPS[Math.max(0, Math.min(next - 1, STEPS.length - 1))];
  const upcoming = STEPS[next];
  const done = next >= STEPS.length;

  const runNext = async () => {
    if (running || done) return;
    setRunning(true);
    setError(null);
    try {
      await STEPS[next].run();
      setNext((n) => n + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const restart = () => {
    useStore.getState().resetCanvas();
    setNext(0);
    setError(null);
  };

  if (collapsed) {
    return (
      <button className="demo-collapsed" onClick={() => setCollapsed(false)}>
        Guided demo · step {Math.min(next + 1, STEPS.length)}/{STEPS.length}
      </button>
    );
  }

  return (
    <div className="demo-panel">
      <div className="demo-head">
        <div>
          <div className="demo-kicker">Guided demo · Ash’s journey (paper §4)</div>
          <div className="demo-progress">
            {STEPS.map((_, i) => (
              <span key={i} className={`dot ${i < next ? 'done' : i === next ? 'next' : ''}`} />
            ))}
          </div>
        </div>
        <button className="hdr-btn" onClick={() => setCollapsed(true)} title="Minimize">
          –
        </button>
      </div>

      {next > 0 && (
        <div className="demo-current">
          <div className="demo-step-title">
            {next}. {current.title} <span className="paper-ref">{current.paper}</span>
          </div>
          <p className="demo-say">{current.say}</p>
        </div>
      )}
      {next === 0 && (
        <p className="demo-say">
          A 10-step walkthrough of the paper’s scenario. Click <b>Run</b> to perform each step live. Afterwards everything stays
          interactive, so you can drag sliders, edit code or branch anywhere.
        </p>
      )}
      {error && <div className="op-error">{error}</div>}

      <div className="demo-actions">
        {!done ? (
          <button className="btn primary" disabled={running} onClick={runNext}>
            {running ? (
              <>
                <span className="spinner" /> Running…
              </>
            ) : (
              <>
                ▶ {next + 1}. {upcoming.title}
              </>
            )}
          </button>
        ) : (
          <button className="btn primary" onClick={() => useStore.getState().setMode('explore')}>
            Try it yourself → Explore mode
          </button>
        )}
        <button className="btn" onClick={restart} disabled={running}>
          Restart
        </button>
      </div>

      <div className="demo-foot">
        <label className="toggle" title="Off: use pre-baked results (instant, works offline). On: real LLM calls, with cached fallback on failure.">
          <input type="checkbox" checked={liveAI} onChange={(e) => useStore.getState().setLiveAI(e.target.checked)} />
          <span>Live AI</span>
        </label>
        <button className="link" onClick={() => setShowList((v) => !v)}>
          {showList ? 'hide steps' : 'all steps'}
        </button>
      </div>
      {showList && (
        <ol className="demo-list">
          {STEPS.map((s, i) => (
            <li key={s.title} className={i < next ? 'done' : i === next ? 'next' : ''}>
              {s.title}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
