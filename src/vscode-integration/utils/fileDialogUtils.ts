import * as vscode from 'vscode';

/**
 * Convert an absolute path to a relative path if within workspace
 */
export function toRelativePath(absolutePath: string, workspaceRoot: string): string {
    if (workspaceRoot && absolutePath.startsWith(workspaceRoot)) {
        return absolutePath.substring(workspaceRoot.length + 1).replace(/\\/g, '/');
    }
    return absolutePath;
}

export interface FileSelectOptions {
    title?: string;
    filters?: Record<string, string[]>;
    many?: boolean;
}

/**
 * Show file selection dialog and return relative paths
 * @returns Array of relative file paths, or null if cancelled
 */
export async function selectFilesRelative(
    workspaceRoot: string,
    options: FileSelectOptions = {}
): Promise<string[] | null> {
    const defaultUri = workspaceRoot ? vscode.Uri.file(workspaceRoot) : undefined;

    const fileUris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: options.many ?? true,
        openLabel: options.title ?? 'Select Files',
        defaultUri,
        filters: options.filters
    });

    if (!fileUris || fileUris.length === 0) {
        return null;
    }

    return fileUris.map(uri => toRelativePath(uri.fsPath, workspaceRoot));
}

export interface FolderSelectOptions {
    title?: string;
}

/**
 * Show folder selection dialog and return relative path
 * @returns Relative folder path, or null if cancelled
 */
export async function selectFolderRelative(
    workspaceRoot: string,
    options: FolderSelectOptions = {}
): Promise<string | null> {
    const defaultUri = workspaceRoot ? vscode.Uri.file(workspaceRoot) : undefined;

    const folderUri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: options.title ?? 'Select Folder',
        defaultUri
    });

    if (!folderUri || folderUri.length === 0) {
        return null;
    }

    return toRelativePath(folderUri[0].fsPath, workspaceRoot);
}
