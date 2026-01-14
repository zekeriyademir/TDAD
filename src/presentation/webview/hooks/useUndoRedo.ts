import { useCallback, useRef } from 'react';
import { Node as ReactFlowNode, Edge } from 'reactflow';

interface HistoryState {
  nodes: ReactFlowNode[];
  edges: Edge[];
}

interface UseUndoRedoOptions {
  maxHistorySize?: number;
}

interface UseUndoRedoReturn {
  takeSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const useUndoRedo = (
  nodes: ReactFlowNode[],
  edges: Edge[],
  setNodes: React.Dispatch<React.SetStateAction<ReactFlowNode[]>>,
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  options: UseUndoRedoOptions = {}
): UseUndoRedoReturn => {
  const { maxHistorySize = 50 } = options;

  // Use refs to avoid re-renders when history changes
  const pastRef = useRef<HistoryState[]>([]);
  const futureRef = useRef<HistoryState[]>([]);

  // Force re-render to update canUndo/canRedo
  const forceUpdateRef = useRef(0);

  // Deep clone to avoid reference issues
  const cloneState = useCallback((state: HistoryState): HistoryState => {
    return {
      nodes: state.nodes.map(node => ({
        ...node,
        position: { ...node.position },
        data: { ...node.data }
      })),
      edges: state.edges.map(edge => ({
        ...edge,
        data: edge.data ? { ...edge.data } : undefined
      }))
    };
  }, []);

  // Take a snapshot of current state before making changes
  const takeSnapshot = useCallback(() => {
    const currentState: HistoryState = { nodes, edges };

    // Add to history
    pastRef.current = [
      ...pastRef.current.slice(-(maxHistorySize - 1)),
      cloneState(currentState)
    ];

    // Clear future when new action is taken
    futureRef.current = [];

    // Force re-render
    forceUpdateRef.current += 1;
  }, [nodes, edges, maxHistorySize, cloneState]);

  // Undo: restore previous state
  const undo = useCallback(() => {
    if (pastRef.current.length === 0) {return;}

    // Save current state to future
    const currentState: HistoryState = { nodes, edges };
    futureRef.current = [cloneState(currentState), ...futureRef.current];

    // Get previous state
    const previousState = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);

    // Restore previous state - clear selection to prevent bottom action bar from appearing
    setNodes(previousState.nodes.map(node => ({ ...node, selected: false })));
    setEdges(previousState.edges);

    // Force re-render
    forceUpdateRef.current += 1;
  }, [nodes, edges, setNodes, setEdges, cloneState]);

  // Redo: restore next state
  const redo = useCallback(() => {
    if (futureRef.current.length === 0) {return;}

    // Save current state to past
    const currentState: HistoryState = { nodes, edges };
    pastRef.current = [...pastRef.current, cloneState(currentState)];

    // Get next state
    const nextState = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);

    // Restore next state - clear selection to prevent bottom action bar from appearing
    setNodes(nextState.nodes.map(node => ({ ...node, selected: false })));
    setEdges(nextState.edges);

    // Force re-render
    forceUpdateRef.current += 1;
  }, [nodes, edges, setNodes, setEdges, cloneState]);

  return {
    takeSnapshot,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0
  };
};
