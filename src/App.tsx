import { ReactFlowProvider } from '@xyflow/react';
import { useEffect, useRef, useState } from 'react';
import { Canvas } from './Canvas';
import { DemoPanel } from './demo/DemoPanel';
import { CodePanel, MaximizedView } from './editor/CodePanel';
import { sketches, useStore } from './graph/store';
import type { Graph } from './graph/types';
import { IconPlus } from './lib/icons';
import { BLANK, CONCENTRIC } from './sketch/examples';

function useHealth() {
  const [health, setHealth] = useState<{ ok: boolean; model?: string; hasKey?: boolean } | null>(null);
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ ok: false }));
  }, []);
  return health;
}

function TopBar() {
  const mode = useStore((s) => s.mode);
  const health = useHealth();
  const fileRef = useRef<HTMLInputElement>(null);
  const s = useStore.getState();

  const exportGraph = () => {
    const st = useStore.getState();
    const blob = new Blob([JSON.stringify(st.graphs[st.mode], null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `spellburst-${st.mode}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importGraph = async (file: File) => {
    try {
      const g = JSON.parse(await file.text()) as Graph;
      if (!g.nodes || typeof g.nextNum !== 'number') throw new Error('not a Spellburst graph');
      s.replaceGraph(g);
    } catch (e) {
      alert(`Could not import: ${(e as Error).message}`);
    }
  };

  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo" />
        Spellburst <span className="brand-sub">revibe</span>
      </div>
      <div className="mode-switch" role="tablist">
        <button className={mode === 'demo' ? 'active' : ''} onClick={() => s.setMode('demo')}>
          Guided demo
        </button>
        <button className={mode === 'explore' ? 'active' : ''} onClick={() => s.setMode('explore')}>
          Explore
        </button>
      </div>
      <div className="topbar-right">
        <button className="btn small ghost" onClick={exportGraph}>
          Export
        </button>
        <button className="btn small ghost" onClick={() => fileRef.current?.click()}>
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importGraph(f);
            e.target.value = '';
          }}
        />
        <span
          className={`health ${health?.ok && health.hasKey ? 'ok' : health ? 'bad' : ''}`}
          title={health?.ok ? `Model: ${health.model}${health.hasKey ? '' : ' (no API key!)'}` : 'Backend unreachable'}
        >
          {health === null ? '…' : health.ok && health.hasKey ? health.model : 'AI offline'}
        </span>
      </div>
    </header>
  );
}

function BottomBar() {
  const mode = useStore((s) => s.mode);
  const count = useStore((s) => sketches(s.graphs[s.mode]).length);
  const s = useStore.getState();
  return (
    <div className="bottom-bar">
      <button
        className="pill"
        onClick={() => {
          const id = s.addRoot(count === 0 && mode === 'explore' ? CONCENTRIC : BLANK);
          s.select(id, true);
          s.focus(id);
        }}
      >
        <IconPlus /> New Sketch
      </button>
      <button
        className="pill"
        onClick={() => {
          if (count === 0 || confirm('Clear the whole canvas?')) s.resetCanvas();
        }}
      >
        Reset Canvas
      </button>
    </div>
  );
}

function EmptyHint() {
  const mode = useStore((s) => s.mode);
  const empty = useStore((s) => Object.keys(s.graphs[s.mode].nodes).length === 0);
  if (!empty) return null;
  return (
    <div className="empty-hint">
      {mode === 'explore' ? (
        <>
          <h2>Explore</h2>
          <p>
            Start with <b>+ New Sketch</b>. Every sketch ends in a menu: <i>Modify</i> with a prompt, <i>Duplicate</i>,{' '}
            <i>Merge</i> two sketches, <i>Diff</i> them, or <i>Extract</i> a feature. Branch from any edge.
          </p>
        </>
      ) : (
        <>
          <h2>Spellburst, revived</h2>
          <p>A node-based interface for exploratory creative coding with natural-language prompts (Angert et al., UIST ’23).</p>
          <p>Use the guided demo panel to walk through the paper’s user journey.</p>
        </>
      )}
    </div>
  );
}

export default function App() {
  const mode = useStore((s) => s.mode);
  const codeOpen = useStore((s) => s.codeOpen);
  return (
    <ReactFlowProvider>
      <div className={`app ${codeOpen ? 'with-code' : ''}`}>
        <TopBar />
        <main className="workspace">
          <CodePanel />
          <div className="canvas-wrap">
            <Canvas />
            <EmptyHint />
            <BottomBar />
            {/* kept mounted so the step position survives switching modes */}
            <div style={{ display: mode === 'demo' ? 'contents' : 'none' }}>
              <DemoPanel />
            </div>
          </div>
        </main>
        <MaximizedView />
      </div>
    </ReactFlowProvider>
  );
}
