import { promises as fs } from 'fs';
import * as path from 'path';
import { logCanvas, logError } from '../../shared/utils/Logger';

/**
 * DocumentationRetriever
 *
 * Simple documentation reader for context-aware test generation
 * Reads full content of documentation files and injects into AI prompts
 * No searching, no scoring - just read and inject!
 */
export class DocumentationRetriever {
    /**
     * Read full content from documentation files
     * Simple approach: No searching, no scoring - just read entire files!
     *
     * @param sourceFiles - Array of relative file paths (e.g., ['docs/API.md', 'docs/FEATURES.md'])
     * @param workspaceRoot - Workspace root path
     * @returns Object with file contents mapped by file path
     */
    public static async readDocumentationFiles(
        sourceFiles: string[],
        workspaceRoot: string
    ): Promise<{ [filePath: string]: string }> {
        try {
            logCanvas('DocumentationRetriever: Reading documentation files', {
                sourceFiles,
                count: sourceFiles.length
            });

            const fileContents: { [filePath: string]: string } = {};

            for (const relativePath of sourceFiles) {
                const fullPath = path.join(workspaceRoot, relativePath);

                try {
                    const content = await fs.readFile(fullPath, 'utf-8');
                    fileContents[relativePath] = content;
                    logCanvas(`DocumentationRetriever: Read ${relativePath} (${content.length} chars)`);
                } catch (error) {
                    logError('AI', `Failed to read documentation file: ${fullPath}`, error);
                    // Continue with other files even if one fails
                }
            }

            logCanvas(`DocumentationRetriever: Successfully read ${Object.keys(fileContents).length} files`);

            return fileContents;
        } catch (error) {
            logError('AI', 'DocumentationRetriever failed to read files', error);
            return {};
        }
    }

    /**
     * Format file paths for prompt injection (paths only, not content)
     * AI agent will read files on-demand for token efficiency
     */
    public static formatFilesForPrompt(fileContents: { [filePath: string]: string }): string {
        const paths = Object.keys(fileContents);
        if (paths.length === 0) {
            return '';
        }

        return paths.map(filePath => `- ${filePath}`).join('\n');
    }

    /**
     * Format documentation context with header for prompt injection
     * SINGLE SOURCE OF TRUTH: Used by both manual and automated modes
     * Any changes here will be reflected in both flows
     */
    public static formatDocumentationContextForPrompt(fileContents: { [filePath: string]: string }): string {
        if (Object.keys(fileContents).length === 0) {
            return '';
        }

        const filesList = this.formatFilesForPrompt(fileContents);
        return `\n**DOCUMENTATION CONTEXT:**\nThe following documentation files are provided for context:\n\n${filesList}\n`;
    }
}
