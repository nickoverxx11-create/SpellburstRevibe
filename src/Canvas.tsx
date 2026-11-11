import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type ReactFlowInstance,
} from '@xyflow/react';
import { useEffect, useMemo, useRef } from 'react';
import { layout, structureKey } from './graph/layout';
import { useStore } from './graph/store';
import { BranchEdge } from './nodes/BranchEdge';
import { DiffNodeView, ExtractNodeView, MenuNodeView, MergeNodeView, ModifyNodeView } from './nodes/OpNodes';
import { SketchNodeView } from './nodes/SketchNodeView';

const nodeTypes = {
  sketch: SketchNodeView,
  modify: ModifyNodeView,
  merge: MergeNodeView,
  diff: DiffNodeView,
  extract: ExtractNodeView,
  menu: MenuNodeView,
};
const edgeTypes = { branch: BranchEdge };

/** Imperative handle used by the guided demo (zoom-out etc.). */
export const canvasApi: { rf: ReactFlowInstance | null } = { rf: null };

export function Canvas() {
  const graph = useStore((s) => s.graphs[s.mode]);
  const focusId = useStore((s) => s.focusId);
  const mode = useStore((s) => s.mode);
  const key = structureKey(graph);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { nodes, edges } = useMemo(() => layout(graph), [key]);
  const rfRef = useRef<ReactFlowInstance | null>(null);

  // Pan to the node an operation just created.
  useEffect(() => {
    if (!focusId || !rfRef.current) return;
    const n = nodes.find((x) => x.id === focusId);
    if (!n) return;
    const zoom = Math.max(rfRef.current.getZoom(), 0.75);
    // in demo mode keep the focused node left of the docked demo panel
    const shift = useStore.getState().mode === 'demo' ? 180 / zoom : 0;
    rfRef.current.setCenter(n.position.x + 150 + shift, n.position.y + 200, { zoom, duration: 500 });
    useStore.getState().focus(null);
  }, [focusId, nodes]);

  useEffect(() => {
    const t = setTimeout(() => rfRef.current?.fitView({ duration: 300, maxZoom: 1, padding: 0.25 }), 50);
    return () => clearTimeout(t);
  }, [mode]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      colorMode="dark"
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      onlyRenderVisibleElements
      minZoom={0.1}
      maxZoom={2}
      fitView
      fitViewOptions={{ maxZoom: 1, padding: 0.25 }}
      onInit={(rf) => {
        rfRef.current = rf;
        canvasApi.rf = rf;
      }}
      onNodeClick={(_, n) => {
        if (n.type === 'sketch') useStore.getState().select(n.id);
      }}
      onPaneClick={() => useStore.getState().select(null)}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#3a3a3a" />
      <Controls showInteractive={false} position="bottom-left" />
    </ReactFlow>
  );
}
