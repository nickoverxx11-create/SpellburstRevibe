import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import { useState } from 'react';
import { IconBranch } from '../lib/icons';
import { OpMenu } from './OpMenu';

// Fig. 4d: the button on an edge starts a new branch from the source sketch.
export function BranchEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd, style } = props;
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const [open, setOpen] = useState(false);
  const sketchId = (data as { sketchId: string }).sketchId;
  return (
    <>
      <BaseEdge path={path} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          className="edge-btn-wrap nodrag nopan"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          onMouseLeave={() => setOpen(false)}
        >
          <button className="edge-btn" title="Branch from this sketch" onClick={() => setOpen((o) => !o)}>
            <IconBranch />
          </button>
          {open && (
            <div className="edge-menu-pop">
              <div className="edge-menu-title">New branch</div>
              <OpMenu sketchId={sketchId} onPick={() => setOpen(false)} />
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
