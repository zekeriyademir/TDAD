import { Node, Edge } from '../../shared/types';
import { logError } from '../../shared/utils/Logger';
import { FeatureMapStorage } from '../../infrastructure/storage/FeatureMapStorage';

/**
 * Hierarchical workflow loader with folder navigation support
 * Loads nodes from specific folder context
 */
export class SimpleWorkflowLoader {
    constructor(private readonly storage: FeatureMapStorage) {}

    /**
     * Load workflow data from hierarchical feature-map.json
     * @param currentFolderId - ID of current folder, or null for root
     */
    public async loadWorkflowData(currentFolderId: string | null = null): Promise<{ nodes: Node[]; edges: Edge[]; ghostPositions?: Record<string, { x: number; y: number }> }> {
        try {
            // Logging handled in FeatureMapStorage.load() - no duplicate logging here
            return this.storage.load(currentFolderId);
        } catch (error) {
            logError('WORKFLOW', 'Failed to load feature-map.json', error);
            return { nodes: [], edges: [] };
        }
    }

    /**
     * Save workflow data to hierarchical feature-map.json
     * @param nodes - Nodes to save
     * @param edges - Edges to save
     * @param currentFolderId - ID of current folder, or null for root
     */
    public async saveWorkflowData(nodes: Node[], edges: Edge[], currentFolderId: string | null = null): Promise<void> {
        try {
            this.storage.save(nodes, edges, currentFolderId);
        } catch (error) {
            logError('WORKFLOW', 'Failed to save feature-map.json', error);
            throw error;
        }
    }
}
