import { useCallback, useRef } from 'react';
import { Node as ReactFlowNode, Edge } from 'reactflow';

interface UseAutoLayoutOptions {
    nodes: ReactFlowNode[];
    edges: Edge[];
    setNodes: (fn: (nodes: ReactFlowNode[]) => ReactFlowNode[]) => void;
    setAllNodes: (fn: (nodes: any[]) => any[]) => void;
    postMessage: (message: any) => void;
    takeSnapshot: () => void;
}

interface UseAutoLayoutReturn {
    handleAutoLayout: () => void;
    isAutoLayoutingRef: React.MutableRefObject<boolean>;
}

/**
 * Custom hook that provides auto-layout functionality for arranging nodes
 * in a left-to-right dependency-based layout with barycenter ordering
 * to minimize edge crossings.
 */
export function useAutoLayout({
    nodes,
    edges,
    setNodes,
    setAllNodes,
    postMessage,
    takeSnapshot
}: UseAutoLayoutOptions): UseAutoLayoutReturn {
    // Ref to track if we're currently doing auto-layout (to prevent position update callback interference)
    const isAutoLayoutingRef = useRef<boolean>(false);

    const handleAutoLayout = useCallback(() => {
        postMessage({ command: 'canvasLog', message: `[AutoLayout] START - ${nodes.length} nodes to arrange` });

        // Take snapshot before auto-layout for undo support
        takeSnapshot();

        // Set flag to prevent position update callback from interfering
        isAutoLayoutingRef.current = true;

        const horizontalSpacing = 280; // Space between columns (node width 200 + 80 gap)
        const verticalSpacing = 140;   // Space between nodes in same column

        // Build dependency graph: which nodes does each node depend on?
        const dependsOn = new Map<string, Set<string>>();
        const dependedBy = new Map<string, Set<string>>();

        nodes.forEach(node => {
            dependsOn.set(node.id, new Set());
            dependedBy.set(node.id, new Set());
        });

        // Include ALL edges (including ghost edges) for layout calculation
        // Ghost edges represent real dependencies - ghost nodes should be placed LEFT of dependents
        edges.forEach(edge => {
            // edge.source -> edge.target means target depends on source
            if (dependsOn.has(edge.target) && dependsOn.has(edge.source)) {
                dependsOn.get(edge.target)!.add(edge.source);
                dependedBy.get(edge.source)!.add(edge.target);
            }
        });

        // PHASE 1: Layer Assignment (BFS from root nodes)
        const levels = new Map<string, number>();
        const visited = new Set<string>();
        const queue: string[] = [];

        // Nodes with no dependencies start at level 0
        nodes.forEach(node => {
            const deps = dependsOn.get(node.id);
            if (!deps || deps.size === 0) {
                levels.set(node.id, 0);
                queue.push(node.id);
                visited.add(node.id);
            }
        });

        // Process remaining nodes - level = max(dependency levels) + 1
        while (queue.length > 0) {
            const nodeId = queue.shift()!;
            const dependents = dependedBy.get(nodeId) || new Set();

            dependents.forEach(depId => {
                const deps = dependsOn.get(depId);
                if (deps) {
                    const allDepsHaveLevel = Array.from(deps).every(d => levels.has(d));
                    if (allDepsHaveLevel) {
                        const maxDepLevel = Math.max(...Array.from(deps).map(d => levels.get(d) || 0));
                        const newLevel = maxDepLevel + 1;
                        if (!levels.has(depId) || newLevel > levels.get(depId)!) {
                            levels.set(depId, newLevel);
                        }
                        if (!visited.has(depId)) {
                            visited.add(depId);
                            queue.push(depId);
                        }
                    }
                }
            });
        }

        // Handle unvisited nodes (circular deps or disconnected) - put at level 0
        nodes.forEach(node => {
            if (!levels.has(node.id)) {
                levels.set(node.id, 0);
            }
        });

        // Group nodes by level
        const nodesByLevel = new Map<number, string[]>();
        nodes.forEach(node => {
            const level = levels.get(node.id) || 0;
            if (!nodesByLevel.has(level)) {
                nodesByLevel.set(level, []);
            }
            nodesByLevel.get(level)!.push(node.id);
        });

        // PHASE 2: Barycenter Ordering (minimize edge crossings)
        const nodeYIndex = new Map<string, number>();

        // Initialize Y indices for level 0
        const level0Nodes = nodesByLevel.get(0) || [];
        level0Nodes.forEach((nodeId, idx) => nodeYIndex.set(nodeId, idx));

        // Get sorted level numbers
        const levelNumbers = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);

        // Forward pass: order each level based on average position of upstream dependencies
        for (let i = 1; i < levelNumbers.length; i++) {
            const levelNum = levelNumbers[i];
            const nodesAtLevel = nodesByLevel.get(levelNum) || [];

            // Calculate barycenter for each node (average Y index of dependencies)
            const barycenters = nodesAtLevel.map(nodeId => {
                const deps = dependsOn.get(nodeId) || new Set();
                if (deps.size === 0) {return { nodeId, barycenter: 0 };}

                const depIndices = Array.from(deps).map(depId => nodeYIndex.get(depId) ?? 0);
                const avg = depIndices.reduce((sum, idx) => sum + idx, 0) / depIndices.length;
                return { nodeId, barycenter: avg };
            });

            // Sort by barycenter
            barycenters.sort((a, b) => a.barycenter - b.barycenter);

            // Update nodesByLevel with sorted order and assign Y indices
            const sortedNodes = barycenters.map(b => b.nodeId);
            nodesByLevel.set(levelNum, sortedNodes);
            sortedNodes.forEach((nodeId, idx) => nodeYIndex.set(nodeId, idx));
        }

        // Backward pass: refine ordering based on downstream connections
        for (let i = levelNumbers.length - 2; i >= 0; i--) {
            const levelNum = levelNumbers[i];
            const nodesAtLevel = nodesByLevel.get(levelNum) || [];

            const barycenters = nodesAtLevel.map(nodeId => {
                const deps = dependedBy.get(nodeId) || new Set();
                if (deps.size === 0) {return { nodeId, barycenter: nodeYIndex.get(nodeId) ?? 0 };}

                const depIndices = Array.from(deps).map(depId => nodeYIndex.get(depId) ?? 0);
                const avg = depIndices.reduce((sum, idx) => sum + idx, 0) / depIndices.length;
                return { nodeId, barycenter: avg };
            });

            barycenters.sort((a, b) => a.barycenter - b.barycenter);

            const sortedNodes = barycenters.map(b => b.nodeId);
            nodesByLevel.set(levelNum, sortedNodes);
            sortedNodes.forEach((nodeId, idx) => nodeYIndex.set(nodeId, idx));
        }

        // PHASE 3: Position Assignment - align children with their parents
        const startX = 100;
        const startY = 100;

        // First, position level 0 nodes (no dependencies) - stack them vertically
        const rootNodes = nodesByLevel.get(0) || [];
        const nodePositions = new Map<string, { x: number; y: number }>();

        rootNodes.forEach((nodeId, index) => {
            nodePositions.set(nodeId, {
                x: startX,
                y: startY + (index * verticalSpacing)
            });
        });

        // Then position subsequent levels - each node aligns with avg Y of its parents
        for (let levelNum = 1; levelNum < levelNumbers.length; levelNum++) {
            const level = levelNumbers[levelNum];
            const nodesAtLevel = nodesByLevel.get(level) || [];

            // Calculate target Y for each node based on parent positions
            const nodesWithTargetY = nodesAtLevel.map(nodeId => {
                const deps = dependsOn.get(nodeId) || new Set();
                if (deps.size === 0) {
                    // No parents - use barycenter index
                    return { nodeId, targetY: startY + (nodeYIndex.get(nodeId) || 0) * verticalSpacing };
                }

                // Average Y position of all parent nodes
                const parentYs = Array.from(deps)
                    .map(depId => nodePositions.get(depId)?.y)
                    .filter((y): y is number => y !== undefined);

                if (parentYs.length === 0) {
                    return { nodeId, targetY: startY + (nodeYIndex.get(nodeId) || 0) * verticalSpacing };
                }

                const avgY = parentYs.reduce((sum, y) => sum + y, 0) / parentYs.length;
                return { nodeId, targetY: avgY };
            });

            // Sort by target Y to maintain relative ordering
            nodesWithTargetY.sort((a, b) => a.targetY - b.targetY);

            // Assign positions ensuring minimum spacing between nodes in same column
            let lastY = -Infinity;
            nodesWithTargetY.forEach(({ nodeId, targetY }) => {
                // Ensure minimum spacing from previous node in this column
                const y = Math.max(targetY, lastY + verticalSpacing);
                nodePositions.set(nodeId, {
                    x: startX + (level * horizontalSpacing),
                    y
                });
                lastY = y;
            });
        }

        // Calculate positions from the map
        const updates = nodes.map(node => {
            const pos = nodePositions.get(node.id) || { x: startX, y: startY };
            return { nodeId: node.id, position: pos };
        });

        postMessage({ command: 'canvasLog', message: `[AutoLayout] Calculated ${updates.length} positions` });

        // Apply positions to ReactFlow nodes immediately (look up by nodeId for safety)
        setNodes(nds => nds.map(node => {
            const update = updates.find(u => u.nodeId === node.id);
            return update ? { ...node, position: update.position } : node;
        }));

        postMessage({ command: 'canvasLog', message: '[AutoLayout] ReactFlow nodes updated, updating allNodes state' });

        // Update allNodes state for persistence across navigation
        setAllNodes(prevAllNodes =>
            prevAllNodes.map(tdadNode => {
                const update = updates.find(u => u.nodeId === tdadNode.id);
                if (update) {
                    postMessage({ command: 'canvasLog', message: `[AutoLayout] allNodes updated for ${tdadNode.id}` });
                    return { ...tdadNode, position: update.position };
                }
                return tdadNode;
            })
        );

        postMessage({ command: 'canvasLog', message: '[AutoLayout] Sending updates to backend' });

        // Send to backend for persistence
        postMessage({
            command: 'updateNodePositions',
            updates
        });

        postMessage({ command: 'canvasLog', message: '[AutoLayout] Waiting 1000ms before resetting flag' });

        // Reset flag after positions are applied (give ReactFlow time to process)
        setTimeout(() => {
            isAutoLayoutingRef.current = false;
            postMessage({ command: 'canvasLog', message: '[AutoLayout] COMPLETE - Flag reset, isAutoLayoutingRef = false' });
        }, 1000);
    }, [nodes, edges, setNodes, setAllNodes, postMessage, takeSnapshot]);

    return { handleAutoLayout, isAutoLayoutingRef };
}
