import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useEffect, useRef, useState } from 'react';
import { runOp } from '../graph/operations';
import { useStore } from '../graph/store';
import type { SketchNode } from '../graph/types';
import { previewStream } from '../lib/api';
import { IconClose, IconCode, IconExpand, IconMenu, IconPause, IconPlay, IconReset, IconSpark, IconWarn } from '../lib/icons';
import { STARTERS } from '../sketch/examples';
import { SketchFrame, type SketchFrameHandle } from '../sketch/SketchFrame';

export function sketchLabel(n: SketchNode) {
  return `Sketch ${n.num}`;
}

export function fixWithAI(sketchId: string, message: string, line: number | null) {
  const s = useStore.getState();
  const id = s.addOp(sketchId, 'modify', {
    prompt: `Fix this runtime error: "${message}"${line ? ` (around line ${line})` : ''}. Keep the visual idea the same.`,
  });
  runOp(id);
}

export function StreamingCode({ text }: { text: string }) {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [text]);
  return (
    <div className="streaming">
      <div className="streaming-label">
        <span className="spinner" /> Generating…
      </div>
      <pre ref={ref} className="streaming-code nowheel">{previewStream(text)}</pre>
    </div>
  );
}

export function SketchNodeView({ data, selected }: NodeProps) {
  const id = (data as { id: string }).id;
  const node = useStore((s) => s.graphs[s.mode].nodes[id]) as SketchNode | undefined;
  const isCodeOpen = useStore((s) => s.codeOpen && s.selectedId === id);
  const [paused, setPaused] = useState(false);
  const [err, setErr] = useState<{ message: string; line: number | null } | null>(null);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const frame = useRef<SketchFrameHandle>(null);
  if (!node) return null;
  const s = useStore.getState();

  return (
    <div className={`node sketch-node ${selected ? 'selected' : ''} ${node.stale ? 'stale' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="node-header">
        <div className="examples-wrap nodrag">
          <button className="hdr-btn" onClick={() => setExamplesOpen((o) => !o)} title="Load a starter sketch">
            <IconMenu /> Examples
          </button>
          {examplesOpen && (
            <div className="dropdown" onMouseLeave={() => setExamplesOpen(false)}>
              {STARTERS.map((st) => (
                <button
                  key={st.name}
                  onClick={() => {
                    s.setCode(id, st.code);
                    setExamplesOpen(false);
                  }}
                >
                  {st.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="node-title">{sketchLabel(node)}</div>
        <button className="hdr-btn icon nodrag" title="Delete (children re-attach to parent)" onClick={() => s.remove(id)}>
          <IconClose />
        </button>
      </div>

      <div className="preview">
        {node.generating ? (
          <StreamingCode text={node.stream ?? ''} />
        ) : node.genError ? (
          <div className="gen-error">
            <IconWarn /> <div>{node.genError}</div>
            {node.parent && (
              <button className="btn small" onClick={() => runOp(node.parent!)}>
                Regenerate
              </button>
            )}
          </div>
        ) : node.code.trim() ? (
          <SketchFrame ref={frame} code={node.code} frameId={id} paused={paused} onError={setErr} />
        ) : (
          <div className="empty-preview">Empty sketch: open the code editor or pick an example.</div>
        )}
        {err && !node.generating && (
          <div className="runtime-error nodrag">
            <span title={err.message}>
              <IconWarn /> {err.message}
              {err.line ? ` (line ${err.line})` : ''}
            </span>
            <button className="btn tiny" onClick={() => fixWithAI(id, err.message, err.line)}>
              <IconSpark /> Fix with AI
            </button>
          </div>
        )}
        {node.stale && <div className="stale-badge" title="An ancestor operator was re-run after this sketch was made">out of date</div>}
      </div>

      <div className="node-footer nodrag">
        <div className="footer-left">
          <button className="ftr-btn" title={paused ? 'Play' : 'Pause'} onClick={() => setPaused((p) => !p)}>
            {paused ? <IconPlay /> : <IconPause />}
          </button>
          <button className="ftr-btn" title="Reset sketch" onClick={() => frame.current?.reset()}>
            <IconReset />
          </button>
        </div>
        <div className="footer-right">
          <button
            className="ftr-btn text"
            onClick={() => (isCodeOpen ? s.closeCode() : s.select(id, true))}
          >
            <IconCode /> {isCodeOpen ? 'Hide Code' : 'Show Code'}
          </button>
          <button className="ftr-btn" title="Maximize" onClick={() => s.maximize(id)}>
            <IconExpand />
          </button>
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
