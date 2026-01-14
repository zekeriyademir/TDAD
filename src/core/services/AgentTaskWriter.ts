/**
 * AgentTaskWriter - Handles task writing logic for AgentOrchestrator
 *
 * Extracted from AgentOrchestrator to comply with CLAUDE.md file size limits
 * Manages: Task writing, BDD spec reading, context generation
 */

import * as path from 'path';
import * as fs from 'fs';
import { Node } from '../../shared/types';
import { toPascalCase, getWorkflowFolderName } from '../../shared/utils/stringUtils';
import { FileNameGenerator } from '../../shared/utils/fileNameGenerator';
import { getNodeBasePath, getFeatureFilePath, getTestFilePath } from '../../shared/utils/nodePathUtils';
import { TaskFileManager, TaskContext, TaskStatus } from './TaskFileManager';
import { PromptService } from './PromptService';
import { PromptGenerationService } from './PromptGenerationService';
import { GoldenPacketAssembler } from './GoldenPacketAssembler';
import { ScaffoldingService, DependencyWiring } from '../workflows/ScaffoldingService';
import { logger } from '../../shared/utils/Logger';
import { OrchestratorCallbacks, FixAttempt } from './AgentOrchestrator';

export interface TaskWriterDeps {
    workspacePath: string;
    extensionPath: string;
    taskFileManager: TaskFileManager;
    promptService: PromptService;
    promptGenService: PromptGenerationService;
    scaffoldingService: ScaffoldingService;
    callbacks: OrchestratorCallbacks;
    maxRetries: number;
}

export class AgentTaskWriter {
    constructor(private deps: TaskWriterDeps) {}

    /**
     * Read BDD spec for a node
     */
    readBddSpec(node: Node): string | null {
        try {
            const fileName = FileNameGenerator.getNodeFileName(node as any);
            const workflowFolderName = getWorkflowFolderName(node.workflowId);
            const featurePath = path.join(this.deps.workspacePath, getFeatureFilePath(workflowFolderName, fileName));

            if (fs.existsSync(featurePath)) {
                return fs.readFileSync(featurePath, 'utf8');
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Write task file for a node
     */
    async writeTaskForNode(
        node: Node,
        status: TaskStatus,
        allNodes: Node[],
        allEdges: any[],
        currentRetry: number,
        fixAttempts: FixAttempt[],
        buildDependencyWirings: (node: Node, allNodes: Node[], allEdges: any[]) => DependencyWiring[],
        buildDependencyContextForBdd: (node: Node, allNodes: Node[], allEdges: any[]) => Array<{ name: string; description: string; bddSpecFile?: string }>,
        scaffoldFilesIfNeeded: (node: Node, fileName: string, basePath: string, wirings: DependencyWiring[], bddSpec?: string) => Promise<void>
    ): Promise<void> {
        const fileName = FileNameGenerator.getNodeFileName(node as any);
        const workflowFolderName = getWorkflowFolderName(node.workflowId);
        const basePath = getNodeBasePath(workflowFolderName, fileName);

        let goal: string;
        let context: string;
        let errorContext: string | undefined;
        const bddSpec = this.readBddSpec(node) || undefined;

        const dependencyWirings = buildDependencyWirings(node, allNodes, allEdges);

        switch (status) {
            case 'GENERATE_BDD': {
                goal = `Generate BDD (Gherkin) specification for the "${node.title}" feature.`;

                const featureFilePath = `${basePath}/${fileName}.feature`;
                const createdFeaturePath = this.deps.scaffoldingService.scaffoldFeatureFileIfNeeded(
                    this.deps.workspacePath,
                    basePath,
                    fileName,
                    node.title || fileName,
                    node.description || ''
                );
                if (createdFeaturePath) {
                    logger.log('AGENT-ORCHESTRATOR', `Created feature file scaffold: ${featureFilePath}`);
                    (node as any).bddSpecFile = featureFilePath;
                }

                const dependencyContext = buildDependencyContextForBdd(node, allNodes, allEdges);
                context = await this.deps.promptService.generateBddPrompt(
                    node.title,
                    node.description || node.title,
                    dependencyContext
                );
                break;
            }
            case 'FIX':
                goal = `Fix the failing tests for "${node.title}". Use the error context below to identify and fix the issue.`;
                context = '';
                if ((node as any).lastTestResults) {
                    errorContext = await GoldenPacketAssembler.assembleAndSave(
                        node,
                        (node as any).lastTestResults,
                        this.deps.workspacePath,
                        allNodes,
                        allEdges,
                        fixAttempts,
                        true
                    );
                }
                break;

            case 'GENERATE_TESTS':
            default:
                goal = `Generate test code for the "${node.title}" feature according to the BDD specification.`;
                context = await this.getTestGenerationContext(node, allNodes, allEdges);
                await scaffoldFilesIfNeeded(node, fileName, basePath, dependencyWirings, bddSpec);
                break;
        }

        const taskContext: TaskContext = {
            status,
            node,
            workflowName: workflowFolderName,
            retryCount: currentRetry,
            maxRetries: this.deps.maxRetries,
            goal,
            context,
            bddSpec,
            errorContext
        };

        this.deps.taskFileManager.writeNextTask(taskContext);

        this.deps.callbacks.onTaskWritten?.('.tdad/NEXT_TASK.md', `${status}: ${node.title}`);
    }

    /**
     * Get test generation context using PromptGenerationService
     */
    private async getTestGenerationContext(
        node: Node,
        allNodes: Node[],
        allEdges: any[]
    ): Promise<string> {
        const bddSpec = this.readBddSpec(node) || 'No BDD spec yet - generate one first.';

        const dependencies = this.getNodeDependencies(node, allEdges).map(depId => {
            const depNode = allNodes.find(n => n.id === depId);
            if (!depNode) {return null;}

            const depFileName = FileNameGenerator.getNodeFileName(depNode as any);
            const depWorkflowFolder = getWorkflowFolderName(depNode.workflowId);
            const depTestFile = getTestFilePath(depWorkflowFolder, depFileName);

            return {
                nodeId: depNode.id,
                filePath: depTestFile,
                functionName: `perform${toPascalCase(depFileName)}Action`
            };
        }).filter(Boolean) as any[];

        const { prompt } = await this.deps.promptGenService.generateImplementPrompt({
            node,
            gherkinSpec: bddSpec,
            allNodes,
            dependencies
        });

        return prompt;
    }

    /**
     * Get dependency node IDs for a node
     */
    private getNodeDependencies(node: Node, allEdges: any[]): string[] {
        return allEdges
            .filter(e => e.target === node.id)
            .map(e => e.source);
    }

    /**
     * Write blueprint task
     */
    async writeBlueprintTask(mode: string, projectContext: string): Promise<void> {
        const blueprintPrompt = await this.deps.promptService.generateBlueprintPrompt(
            mode as 'idea' | 'architecture' | 'refactor',
            projectContext
        );
        this.deps.taskFileManager.writeBlueprintTaskWithPrompt(blueprintPrompt);
        this.deps.callbacks.onTaskWritten?.('.tdad/NEXT_TASK.md', 'Generate project blueprint');
    }

    /**
     * Write completion message
     */
    writeComplete(summary: string): void {
        this.deps.taskFileManager.writeComplete(summary);
    }
}
