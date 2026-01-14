/**
 * String utility functions
 */

export function toPascalCase(str: string): string {
    return str
        .split(/[-\s_]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}

export function toTitleCase(str: string): string {
    return str
        .split(/[-\s_]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Extract workflow folder name from workflowId
 * Removes the '-workflow' suffix from workflowId to get the folder name
 * @example getWorkflowFolderName('auth-workflow') returns 'auth'
 * @example getWorkflowFolderName('auth/login-workflow') returns 'auth/login'
 */
export function getWorkflowFolderName(workflowId: string): string {
    return workflowId.replace(/-workflow$/, '');
}
