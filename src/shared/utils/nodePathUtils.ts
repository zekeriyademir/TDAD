/**
 * Node path utilities for consistent file path construction
 * Centralizes all .tdad/workflows path building logic
 */

import * as path from 'path';

/**
 * Build the base path for a node's files
 * @returns Path like `.tdad/workflows/{workflowFolder}/{fileName}`
 */
export function getNodeBasePath(workflowFolder: string, fileName: string): string {
    return `.tdad/workflows/${workflowFolder}/${fileName}`;
}

/**
 * Build the feature file path for a node
 * @returns Path like `.tdad/workflows/{workflowFolder}/{fileName}/{fileName}.feature`
 */
export function getFeatureFilePath(workflowFolder: string, fileName: string): string {
    return `${getNodeBasePath(workflowFolder, fileName)}/${fileName}.feature`;
}

/**
 * Build the action file path for a node
 * @returns Path like `.tdad/workflows/{workflowFolder}/{fileName}/{fileName}.action.js`
 */
export function getActionFilePath(workflowFolder: string, fileName: string): string {
    return `${getNodeBasePath(workflowFolder, fileName)}/${fileName}.action.js`;
}

/**
 * Build the test file path for a node
 * @returns Path like `.tdad/workflows/{workflowFolder}/{fileName}/{fileName}.test.js`
 */
export function getTestFilePath(workflowFolder: string, fileName: string): string {
    return `${getNodeBasePath(workflowFolder, fileName)}/${fileName}.test.js`;
}

/**
 * Build the outputs file path for a node
 * @returns Path like `.tdad/workflows/{workflowFolder}/{fileName}/{fileName}.outputs.json`
 */
export function getOutputsFilePath(workflowFolder: string, fileName: string): string {
    return `${getNodeBasePath(workflowFolder, fileName)}/${fileName}.outputs.json`;
}

/**
 * Build full absolute path by joining workspace root with relative path
 */
export function getAbsolutePath(workspaceRoot: string, relativePath: string): string {
    return path.join(workspaceRoot, relativePath);
}

/**
 * Build the workflow folder path
 * @returns Path like `.tdad/workflows/{workflowFolder}`
 */
export function getWorkflowPath(workflowFolder: string): string {
    return `.tdad/workflows/${workflowFolder}`;
}

/**
 * Compute relative import path between two workflow files
 * @param depFilePath - Full path to dependency file
 * @param depWorkflowFolder - Workflow folder of the dependency
 * @param currentWorkflowFolder - Workflow folder of the current node
 * @param depFileName - File name of the dependency (without extension)
 * @returns Relative import path like `../{fileName}/{fileName}.action.js` or `../../{otherWorkflow}/{fileName}/{fileName}.action.js`
 */
export function computeRelativeImportPath(
    depWorkflowFolder: string,
    currentWorkflowFolder: string,
    depFileName: string
): string {
    if (depWorkflowFolder === currentWorkflowFolder) {
        return `../${depFileName}/${depFileName}.action.js`;
    } else {
        return `../../${depWorkflowFolder}/${depFileName}/${depFileName}.action.js`;
    }
}
