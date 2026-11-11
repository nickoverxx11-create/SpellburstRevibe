import { Handle, Position, type NodeProps } from '@xyflow/react';
import { diffLines } from 'diff';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { runOp } from '../graph/operations';
import { opChildSketch, sketches, useStore } from '../graph/store';
import type { DiffNode, ExtractNode, MergeNode, ModifyNode, SketchNode } from '../graph/types';
import { fetchAutocomplete } from '../lib/api';
import { IconClose, IconDiff, IconExtract, IconMerge, IconModify, IconSpark } from '../lib/icons';
import { fmt, getParam, setParam } from '../sketch/params';
import { OpMenu } from './OpMenu';

function useNode<T>(id: string) {
  return useStore((s) => s.graphs[s.mode].nodes[id]) as T | undefined;
}

function Shell({
  id,
  kind,
  title,
  icon,
  selected,
  second,
  children,
}: {
  id: string;
  kind: string;
  title: string;
  icon: ReactNode;
  selected: boolean;
  second?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`node op-node op-${kind} ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      {second && <Handle type="target" id="second" position={Position.Top} />}
      <div className="node-header">
        <div className="op-kind">
          {icon}
          <span>{title}</span>
        </div>
        <button className="hdr-btn icon nodrag" title="Delete operator" onClick={() => useStore.getState().remove(id)}>
          <IconClose />
        </button>
      </div>
      <div className="op-body">{children}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function RunButton({ status, label, onClick, hasChild }: { status: string; label: string; onClick: () => void; hasChild?: boolean }) {
  const running = status === 'running';
  return (
    <button className="btn primary block nodrag" disabled={running} onClick={onClick}>
      {running ? (
        <>
          <span className="spinner" /> Generating…
        </>
      ) : hasChild ? (
        `Re-run ${label}`
      ) : (
        label
      )}
    </button>
  );
}

function SketchPicker({ value, exclude, onChange }: { value: string | null; exclude: string; onChange: (id: string) => void }) {
  const graph = useStore((s) => s.graphs[s.mode]);
  const list = sketches(graph).filter((n) => n.id !== exclude && n.code.trim());
  return (
    <select className="select nodrag" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>
        choose sketch…
      </option>
      {list.map((n) => (
        <option key={n.id} value={n.id}>
          Sketch {n.num}
        </option>
      ))}
    </select>
  );
}

const parentLabel = (id: string | null) => {
  const s = useStore.getState();
  const p = id ? (s.graphs[s.mode].nodes[id] as SketchNode | undefined) : undefined;
  return p && p.type === 'sketch' ? `Sketch ${p.num}` : '—';
};

// ---------------------------------------------------------------- Modify ----

function applySuggestion(prompt: string, suggestion: string) {
  const p = prompt.trimEnd();
  if (!p) return suggestion;
  if (/[.!?]$/.test(p)) return `${p} ${suggestion.charAt(0).toUpperCase()}${suggestion.slice(1)}`;
  return `${p} ${suggestion}`;
}

function SemanticSliders({ op }: { op: ModifyNode }) {
  const child = useStore((s) => opChildSketch(s.graphs[s.mode], op.id));
  if (!op.semantic?.length || !child || child.generating) return null;
  const groups = op.semantic
    .map((g) => ({ ...g, vars: g.vars.filter((v) => getParam(child.code, v.name) !== undefined) }))
    .filter((g) => g.vars.length);
  if (!groups.length) return null;
  return (
    <div className="semantic nodrag nowheel">
      {groups.map((g) => (
        <div className="sem-group" key={g.phrase}>
          <div className="sem-phrase">"{g.phrase}"</div>
          {g.vars.map((v) => {
            const val = getParam(child.code, v.name)!;
            const min = Math.min(v.min, val);
            const max = Math.max(v.max, val);
            return (
              <label className="sem-var" key={v.name}>
                <div className="sem-var-row">
                  <span className="mono">{v.name}</span>
                  <span className="sem-val mono">{fmt(val)}</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={v.step}
                  value={val}
                  onChange={(e) => {
                    const st = useStore.getState();
                    const cur = st.graphs[st.mode].nodes[child.id] as SketchNode;
                    st.setCode(child.id, setParam(cur.code, v.name, parseFloat(e.target.value)));
                  }}
                />
              </label>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function ModifyNodeView({ data, selected }: NodeProps) {
  const id = (data as { id: string }).id;
  const op = useNode<ModifyNode>(id);
  const hasChild = useStore((s) => Boolean(opChildSketch(s.graphs[s.mode], id)));
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const typedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (op?.suggestions) setSuggestions(op.suggestions);
  }, [op?.suggestions]);

  useEffect(() => {
    if (op && !op.prompt && op.status === 'idle') ta.current?.focus();
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced, non-deterministic autocomplete (§5.1.2) — only for user typing.
  const prompt = op?.prompt ?? '';
  useEffect(() => {
    if (!typedRef.current || prompt.trim().length < 4) return;
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoadingSugg(true);
      try {
        const st = useStore.getState();
        const parent = op?.parent ? (st.graphs[st.mode].nodes[op.parent] as SketchNode) : undefined;
        const res = await fetchAutocomplete(prompt, parent?.code ?? '', ctrl.signal);
        if (!ctrl.signal.aborted) setSuggestions(res);
      } catch {
        /* ignore */
      } finally {
        if (!ctrl.signal.aborted) setLoadingSugg(false);
      }
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt]);

  if (!op) return null;
  const s = useStore.getState();
  const run = () => {
    setSuggestions([]);
    typedRef.current = false;
    runOp(id);
  };

  return (
    <Shell id={id} kind="modify" title={`Modify · ${parentLabel(op.parent)}`} icon={<IconModify />} selected={selected}>
      <div className="prompt-wrap">
        <textarea
          ref={ta}
          className="prompt nodrag nowheel"
          placeholder="Describe a change… e.g. “Pretend the circles are the orbits of planets. Add a sun.”"
          value={op.prompt}
          onChange={(e) => {
            typedRef.current = true;
            s.update(id, { prompt: e.target.value, suggestions: undefined });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSuggestions([]);
            if (e.key === 'Tab' && suggestions.length) {
              e.preventDefault();
              s.update(id, { prompt: applySuggestion(op.prompt, suggestions[0]) });
              setSuggestions([]);
            }
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run();
          }}
        />
        {(suggestions.length > 0 || loadingSugg) && (
          <div className="suggestions nodrag">
            {loadingSugg && !suggestions.length && <div className="sugg-loading">thinking of directions…</div>}
            {suggestions.map((sg) => (
              <button
                key={sg}
                className="suggestion"
                onClick={() => {
                  s.update(id, { prompt: applySuggestion(op.prompt, sg), suggestions: undefined });
                  setSuggestions([]);
                  typedRef.current = false;
                  ta.current?.focus();
                }}
              >
                <IconSpark /> {sg}
              </button>
            ))}
          </div>
        )}
      </div>
      <SemanticSliders op={op} />
      {op.error && <div className="op-error">{op.error}</div>}
      <RunButton status={op.status} label="Generate" onClick={run} hasChild={hasChild} />
    </Shell>
  );
}

// ----------------------------------------------------------------- Merge ----

export function MergeNodeView({ data, selected }: NodeProps) {
  const id = (data as { id: string }).id;
  const op = useNode<MergeNode>(id);
  const hasChild = useStore((s) => Boolean(opChildSketch(s.graphs[s.mode], id)));
  if (!op) return null;
  const s = useStore.getState();
  return (
    <Shell id={id} kind="merge" title="Merge" icon={<IconMerge />} selected={selected} second>
      <div className="merge-row">
        <span className="chip">{parentLabel(op.parent)}</span>
        <span className="plus">+</span>
        <SketchPicker value={op.otherId} exclude={op.parent ?? ''} onChange={(v) => s.update(id, { otherId: v })} />
      </div>
      <textarea
        className="prompt short nodrag nowheel"
        placeholder="Optional: what to keep from each, e.g. “planets from A, mountain background from B”. Leave empty to let the AI decide."
        value={op.prompt}
        onChange={(e) => s.update(id, { prompt: e.target.value })}
      />
      {op.error && <div className="op-error">{op.error}</div>}
      <RunButton status={op.status} label="Merge" onClick={() => runOp(id)} hasChild={hasChild} />
    </Shell>
  );
}

// ------------------------------------------------------------------ Diff ----

export function DiffNodeView({ data, selected }: NodeProps) {
  const id = (data as { id: string }).id;
  const op = useNode<DiffNode>(id);
  const [showCode, setShowCode] = useState(false);
  const graph = useStore((s) => s.graphs[s.mode]);
  if (!op) return null;
  const s = useStore.getState();
  const a = op.parent ? (graph.nodes[op.parent] as SketchNode) : undefined;
  const b = op.otherId ? (graph.nodes[op.otherId] as SketchNode | undefined) : undefined;
  return (
    <Shell id={id} kind="diff" title="Diff" icon={<IconDiff />} selected={selected} second>
      <div className="merge-row">
        <span className="chip">{parentLabel(op.parent)}</span>
        <span className="plus">vs</span>
        <SketchPicker value={op.otherId} exclude={op.parent ?? ''} onChange={(v) => s.update(id, { otherId: v, summary: undefined, status: 'idle' })} />
      </div>
      {op.summary ? (
        <div className="diff-summary nowheel">{op.summary}</div>
      ) : (
        <div className="hint">Get a plain-language summary of how two sketches differ, plus a line-level code diff.</div>
      )}
      {a && b && op.status === 'done' && (
        <div className="diff-actions nodrag">
          <button className="btn small" onClick={() => setShowCode((v) => !v)}>
            {showCode ? 'Hide' : 'Show'} code diff
          </button>
          <button
            className="btn small"
            title="Use this summary as the prompt for a new modification"
            onClick={() => {
              const nid = s.addOp(op.parent!, 'modify', { prompt: op.summary ?? '' });
              s.focus(nid);
            }}
          >
            Use as prompt
          </button>
        </div>
      )}
      {showCode && a && b && (
        <pre className="code-diff nowheel nodrag">
          {diffLines(a.code, b.code).map((part, i) => (
            <span key={i} className={part.added ? 'add' : part.removed ? 'del' : 'same'}>
              {part.value
                .replace(/\n$/, '')
                .split('\n')
                .map((l) => `${part.added ? '+' : part.removed ? '-' : ' '} ${l}`)
                .join('\n') + '\n'}
            </span>
          ))}
        </pre>
      )}
      {op.error && <div className="op-error">{op.error}</div>}
      <RunButton status={op.status} label="Compare" onClick={() => runOp(id)} />
    </Shell>
  );
}

// --------------------------------------------------------------- Extract ----

export function ExtractNodeView({ data, selected }: NodeProps) {
  const id = (data as { id: string }).id;
  const op = useNode<ExtractNode>(id);
  const hasChild = useStore((s) => Boolean(opChildSketch(s.graphs[s.mode], id)));
  if (!op) return null;
  const s = useStore.getState();
  return (
    <Shell id={id} kind="extract" title={`Extract · ${parentLabel(op.parent)}`} icon={<IconExtract />} selected={selected}>
      <textarea
        className="prompt short nodrag nowheel"
        placeholder="What to isolate, e.g. “the color gradient” or “the orbit motion”"
        value={op.prompt}
        onChange={(e) => s.update(id, { prompt: e.target.value })}
      />
      {op.error && <div className="op-error">{op.error}</div>}
      <RunButton status={op.status} label="Extract" onClick={() => runOp(id)} hasChild={hasChild} />
    </Shell>
  );
}

// ------------------------------------------------------------------ Menu ----

export function MenuNodeView({ data }: NodeProps) {
  const sketchId = (data as { id: string }).id;
  return (
    <div className="menu-node">
      <Handle type="target" position={Position.Left} />
      <OpMenu sketchId={sketchId} />
    </div>
  );
}
