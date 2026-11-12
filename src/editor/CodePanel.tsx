import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import CodeMirror from '@uiw/react-codemirror';
import { useRef, useState } from 'react';
import { useStore } from '../graph/store';
import type { GNode, SketchNode } from '../graph/types';
import { IconClose, IconPause, IconPlay, IconReset } from '../lib/icons';
import { STARTERS } from '../sketch/examples';
import { findParams, fmt, guessRange, setParam } from '../sketch/params';
import { RangeSlider } from '../sketch/RangeSlider';
import { SketchFrame, type SketchFrameHandle } from '../sketch/SketchFrame';

const extensions = [javascript()];

function originOf(nodes: Record<string, GNode>, n: SketchNode): string | null {
  if (n.origin === 'root') return 'Root sketch';
  if (n.origin === 'duplicate') return `Duplicate of Sketch ${(nodes[n.parent!] as SketchNode | undefined)?.num ?? '?'}`;
  const op = n.parent ? nodes[n.parent] : undefined;
  if (!op || op.type === 'sketch') return null;
  if (op.type === 'merge') return `Merge${op.prompt ? `: “${op.prompt}”` : ' (AI-chosen)'}`;
  if (op.type === 'modify' || op.type === 'extract') return `${op.type === 'modify' ? 'Modify' : 'Extract'}: “${op.prompt}”`;
  return null;
}

/** Fine-grained "magic constant" sliders (§3.2.1, D1–D2), no LLM call. */
export function ParamSliders({ sketch }: { sketch: SketchNode }) {
  const ranges = useRef(new Map<string, { min: number; max: number; step: number }>());
  const params = findParams(sketch.code);
  if (!params.length) return <div className="hint">No top-level numeric variables to tune.</div>;
  return (
    <div className="params">
      {params.map((p) => {
        const key = `${sketch.id}:${p.name}`;
        if (!ranges.current.has(key)) ranges.current.set(key, guessRange(p.value));
        const r = ranges.current.get(key)!;
        return (
          <label key={p.name} className="param">
            <span className="mono name">{p.name}</span>
            <RangeSlider
              min={Math.min(r.min, p.value)}
              max={Math.max(r.max, p.value)}
              step={r.step}
              value={p.value}
              onChange={(e) => {
                const st = useStore.getState();
                const cur = st.graphs[st.mode].nodes[sketch.id] as SketchNode;
                st.setCode(sketch.id, setParam(cur.code, p.name, parseFloat(e.target.value)));
              }}
            />
            <span className="mono val">{fmt(p.value)}</span>
          </label>
        );
      })}
    </div>
  );
}

export function CodePanel() {
  const { selectedId, codeOpen } = useStore();
  const nodes = useStore((s) => s.graphs[s.mode].nodes);
  const node = selectedId ? nodes[selectedId] : undefined;
  const [examples, setExamples] = useState(false);
  const [tab, setTab] = useState<'code' | 'params'>('code');
  if (!codeOpen || !node || node.type !== 'sketch') return null;
  const s = useStore.getState();
  const origin = originOf(nodes, node);
  return (
    <aside className="code-panel">
      <div className="panel-header">
        <div className="examples-wrap">
          <button className="hdr-btn" onClick={() => setExamples((v) => !v)}>
            ≡ Examples
          </button>
          {examples && (
            <div className="dropdown" onMouseLeave={() => setExamples(false)}>
              {STARTERS.map((st) => (
                <button
                  key={st.name}
                  onClick={() => {
                    s.setCode(node.id, st.code);
                    setExamples(false);
                  }}
                >
                  {st.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="node-title">Sketch {node.num}</div>
        <button className="btn small" onClick={() => s.closeCode()}>
          Close Editor
        </button>
      </div>
      {origin && <div className="origin">{origin}</div>}
      <div className="tabs">
        <button className={tab === 'code' ? 'active' : ''} onClick={() => setTab('code')}>
          Code
        </button>
        <button className={tab === 'params' ? 'active' : ''} onClick={() => setTab('params')}>
          Parameters
        </button>
      </div>
      {tab === 'code' ? (
        <div className="editor-wrap">
          {node.generating ? (
            <div className="hint pad">Generating…</div>
          ) : (
            <CodeMirror
              value={node.code}
              height="100%"
              theme={oneDark}
              extensions={extensions}
              onChange={(v) => s.setCode(node.id, v)}
              basicSetup={{ foldGutter: false }}
            />
          )}
        </div>
      ) : (
        <div className="params-wrap">
          <ParamSliders sketch={node} />
        </div>
      )}
    </aside>
  );
}

/** Fig. 1c: focus on one node with a large preview and the code side by side. */
export function MaximizedView() {
  const id = useStore((s) => s.maximizedId);
  const node = useStore((s) => (id ? s.graphs[s.mode].nodes[id] : undefined)) as SketchNode | undefined;
  const [paused, setPaused] = useState(false);
  const [err, setErr] = useState<{ message: string; line: number | null } | null>(null);
  const frame = useRef<SketchFrameHandle>(null);
  if (!node || node.type !== 'sketch') return null;
  const s = useStore.getState();
  return (
    <div className="maximized">
      <div className="max-header">
        <div className="node-title">Sketch {node.num}</div>
        <div className="max-actions">
          <button className="ftr-btn" onClick={() => setPaused((p) => !p)}>
            {paused ? <IconPlay /> : <IconPause />}
          </button>
          <button className="ftr-btn" onClick={() => frame.current?.reset()}>
            <IconReset />
          </button>
          <button className="btn small" onClick={() => s.maximize(null)}>
            <IconClose /> Close
          </button>
        </div>
      </div>
      <div className="max-body">
        <div className="max-code">
          <CodeMirror
            value={node.code}
            height="100%"
            theme={oneDark}
            extensions={extensions}
            onChange={(v) => s.setCode(node.id, v)}
            basicSetup={{ foldGutter: false }}
          />
        </div>
        <div className="max-preview">
          <div className="max-frame">
            <SketchFrame ref={frame} code={node.code} frameId={`max-${node.id}`} paused={paused} onError={setErr} />
          </div>
          {err && (
            <div className="runtime-error static">
              {err.message}
              {err.line ? ` (line ${err.line})` : ''}
            </div>
          )}
          <div className="max-params">
            <div className="section-label">Parameters</div>
            <ParamSliders sketch={node} />
          </div>
        </div>
      </div>
    </div>
  );
}
