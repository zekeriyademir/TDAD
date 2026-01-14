import { Edge } from 'reactflow';

export const hasCircularDependency = (
  sourceId: string,
  targetId: string,
  edges: Edge[]
): boolean => {
  const visited = new Set<string>();
  
  const dfs = (nodeId: string): boolean => {
    if (nodeId === sourceId) {
      return true;
    }
    if (visited.has(nodeId)) {
      return false;
    }
    visited.add(nodeId);
    
    const outgoingEdges = edges.filter(e => e.source === nodeId);
    for (const edge of outgoingEdges) {
      if (dfs(edge.target)) {
        return true;
      }
    }
    return false;
  };
  
  return dfs(targetId);
};

export const isDuplicateConnection = (
  sourceId: string,
  targetId: string,
  edges: Edge[]
): boolean => {
  return edges.some(e => e.source === sourceId && e.target === targetId);
};


