import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Node, Edge, FolderNode } from '../../shared/types';
import { logCanvas, logError } from '../../shared/utils/Logger';
import { getWorkflowFolderName } from '../../shared/utils/stringUtils';
import { FeatureMapStorage } from './FeatureMapStorage';

/**
 * Migration utility to convert flat feature-map.json to hierarchical folder structure
 * Groups nodes by workflowId and creates folder hierarchy
 */
export class FeatureMapMigration {
    private readonly storage: FeatureMapStorage;
    private readonly workspaceRoot: string;
    private readonly featureMapDir: string;

    constructor() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder found');
        }

        this.workspaceRoot = workspaceFolders[0].uri.fsPath;
        this.featureMapDir = path.join(this.workspaceRoot, '.tdad', 'workflows');
        this.storage = new FeatureMapStorage();
    }

    /**
     * Check if migration is needed (flat structure exists)
     */
    public isMigrationNeeded(): boolean {
        const flatFile = path.join(this.featureMapDir, 'feature-map.json');
        if (!fs.existsSync(flatFile)) {
            return false;
        }

        try {
            const content = fs.readFileSync(flatFile, 'utf-8');
            const data = JSON.parse(content);

            // Check if any nodes have workflowId but no parentId (flat structure indicator)
            const hasWorkflowIds = data.nodes?.some((n: any) => n.workflowId && !n.parentId);
            return hasWorkflowIds;
        } catch (error) {
            logError('MIGRATION', 'Failed to check migration status', error);
            return false;
        }
    }

    /**
     * Migrate flat feature-map.json to hierarchical structure
     */
    public async migrate(): Promise<void> {
        try {
            logCanvas('Starting migration to hierarchical folder structure...');

            // Step 1: Load existing flat data
            const flatData = this.loadFlatData();
            if (!flatData) {
                logCanvas('No flat data found to migrate');
                return;
            }

            const { nodes, edges } = flatData;
            logCanvas(`Found ${nodes.length} nodes and ${edges.length} edges to migrate`);

            // Step 2: Group nodes by workflowId
            const workflowGroups = this.groupByWorkflow(nodes);
            logCanvas(`Grouped into ${workflowGroups.size} workflows`);

            // Step 3: Create folder nodes
            const folderNodes = this.createFolderNodes(workflowGroups);
            logCanvas(`Created ${folderNodes.length} folder nodes`);

            // Step 4: Update parentId on feature nodes
            const updatedNodes = this.updateParentIds(nodes, folderNodes);

            // Step 5: Distribute edges across folders
            const edgeDistribution = this.distributeEdges(edges, updatedNodes, folderNodes);

            // Step 6: Backup original file
            this.backupOriginalFile();

            // Step 7: Save hierarchical structure
            await this.saveHierarchicalStructure(folderNodes, updatedNodes, edgeDistribution);

            logCanvas('Migration completed successfully!');
            vscode.window.showInformationMessage('TDAD: Feature map migrated to hierarchical structure');
        } catch (error) {
            logError('MIGRATION', 'Migration failed', error);
            vscode.window.showErrorMessage(`TDAD: Migration failed - ${error}`);
            throw error;
        }
    }

    /**
     * Load flat feature-map.json data
     */
    private loadFlatData(): { nodes: Node[]; edges: Edge[] } | null {
        try {
            const flatFile = path.join(this.featureMapDir, 'feature-map.json');
            const content = fs.readFileSync(flatFile, 'utf-8');
            const data = JSON.parse(content);
            return {
                nodes: data.nodes || [],
                edges: data.edges || []
            };
        } catch (error) {
            logError('MIGRATION', 'Failed to load flat data', error);
            return null;
        }
    }

    /**
     * Group nodes by workflowId
     */
    private groupByWorkflow(nodes: Node[]): Map<string, Node[]> {
        const groups = new Map<string, Node[]>();

        for (const node of nodes) {
            const workflowId = (node as any).workflowId || 'default';
            if (!groups.has(workflowId)) {
                groups.set(workflowId, []);
            }
            groups.get(workflowId)!.push(node);
        }

        return groups;
    }

    /**
     * Create folder nodes from workflow groups
     */
    private createFolderNodes(workflowGroups: Map<string, Node[]>): FolderNode[] {
        const folderNodes: FolderNode[] = [];
        let xPos = 100;
        const yPos = 100;
        const xSpacing = 300;

        for (const [workflowId, nodes] of workflowGroups) {
            // Extract workflow name from workflowId (e.g., "auth-workflow" -> "auth")
            const folderName = getWorkflowFolderName(workflowId);
            const folderTitle = this.capitalizeWords(folderName);

            const folderNode: FolderNode = {
                id: `folder-${folderName}`,
                workflowId: workflowId,
                nodeType: 'folder',
                title: `${folderTitle} Workflow`,
                description: `Contains ${nodes.length} feature${nodes.length === 1 ? '' : 's'}`,
                folderPath: folderName,
                children: nodes.map(n => n.id),
                position: { x: xPos, y: yPos },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            folderNodes.push(folderNode);
            xPos += xSpacing;
        }

        return folderNodes;
    }

    /**
     * Update parentId on all feature nodes
     */
    private updateParentIds(nodes: Node[], folderNodes: FolderNode[]): Node[] {
        return nodes.map(node => {
            const workflowId = (node as any).workflowId || 'default';
            const folderName = getWorkflowFolderName(workflowId);
            const folder = folderNodes.find(f => f.folderPath === folderName);

            return {
                ...node,
                parentId: folder?.id
            };
        });
    }

    /**
     * Distribute edges across folders (edges stored in folder containing source node)
     */
    private distributeEdges(
        edges: Edge[],
        updatedNodes: Node[],
        folderNodes: FolderNode[]
    ): Map<string, Edge[]> {
        const distribution = new Map<string, Edge[]>();

        // Initialize with empty arrays for root and each folder
        distribution.set('root', []);
        for (const folder of folderNodes) {
            distribution.set(folder.id, []);
        }

        for (const edge of edges) {
            const sourceNode = updatedNodes.find(n => n.id === edge.source);
            const targetNode = updatedNodes.find(n => n.id === edge.target);

            if (!sourceNode || !targetNode) {
                continue;
            }

            // If both nodes in same folder, store edge in that folder
            if (sourceNode.parentId === targetNode.parentId && sourceNode.parentId) {
                const folderEdges = distribution.get(sourceNode.parentId) || [];
                folderEdges.push(edge);
                distribution.set(sourceNode.parentId, folderEdges);
            } else {
                // Cross-folder edge - store in root
                const rootEdges = distribution.get('root') || [];
                rootEdges.push(edge);
                distribution.set('root', rootEdges);
            }
        }

        return distribution;
    }

    /**
     * Backup original file before migration
     */
    private backupOriginalFile(): void {
        const flatFile = path.join(this.featureMapDir, 'feature-map.json');
        const backupFile = path.join(this.featureMapDir, `feature-map.backup.${Date.now()}.json`);

        if (fs.existsSync(flatFile)) {
            fs.copyFileSync(flatFile, backupFile);
            logCanvas(`Backed up original file to: ${backupFile}`);
        }
    }

    /**
     * Save hierarchical structure to disk
     */
    private async saveHierarchicalStructure(
        folderNodes: FolderNode[],
        updatedNodes: Node[],
        edgeDistribution: Map<string, Edge[]>
    ): Promise<void> {
        // Save root folder nodes
        const rootEdges = edgeDistribution.get('root') || [];
        this.storage.save(folderNodes, rootEdges, null);

        // Save each folder's feature nodes
        for (const folder of folderNodes) {
            const folderFeatures = updatedNodes.filter(n => n.parentId === folder.id);
            const folderEdges = edgeDistribution.get(folder.id) || [];
            this.storage.save(folderFeatures, folderEdges, folder.id);
        }
    }

    /**
     * Capitalize words for display (e.g., "auth" -> "Auth", "user-profile" -> "User Profile")
     */
    private capitalizeWords(str: string): string {
        return str
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
}
