import { Node as ReactFlowNode } from 'reactflow';
import { Node } from '../../../shared/types';
import { convertTDADNodeToReactFlow } from '../utils/nodeConverters';

export const createNodeHandlers = (
  postMessage: (msg: any) => void,
  setSelectedNodeId: (id: string | null) => void
) => {
  const handleNodeUpdate = (updatedNode: Node) => {
    postMessage({ command: 'updateNode', node: updatedNode });
  };

  const handleNodeDelete = (nodeId: string) => {
    postMessage({ command: 'deleteNode', nodeId });
  };

  const handleNodeSelect = (nodeId: string) => {
    setSelectedNodeId(nodeId);
  };

  return {
    handleNodeUpdate,
    handleNodeDelete,
    handleNodeSelect
  };
};

export const loadNodesFromExtension = (
  tdadNodes: Node[],
  nodeCounter: number,
  setNodes: (nodes: ReactFlowNode[]) => void,
  setIsLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  handlers?: any,
  setAllNodes?: (nodes: Node[]) => void,
  filterVisibleNodes?: (nodes: Node[]) => Node[]
) => {
  if (!tdadNodes || !Array.isArray(tdadNodes)) {
    setIsLoading(false);
    return;
  }

  try {
    // Store all TDAD nodes for navigation
    if (setAllNodes) {
      setAllNodes(tdadNodes);
    }

    // Filter visible nodes based on current navigation state
    const visibleTDADNodes = filterVisibleNodes ? filterVisibleNodes(tdadNodes) : tdadNodes;

    // Convert visible nodes to ReactFlow nodes
    const reactFlowNodes = visibleTDADNodes.map((node, index) =>
      convertTDADNodeToReactFlow(node, nodeCounter + index, handlers)
    );

    setNodes(reactFlowNodes);
    setIsLoading(false);
    setError(null);
  } catch (error) {
    setError('Failed to load nodes');
    setIsLoading(false);
  }
};


