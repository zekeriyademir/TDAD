/**
 * Utility for generating valid file names from titles
 * Extracted to avoid duplication across NodeForm and canvas-app
 */
export class FileNameGenerator {
    /**
     * Generate a valid filename from a title
     * Converts to lowercase, removes special chars, replaces spaces with hyphens
     *
     * @param title - The title to convert
     * @returns A valid filename
     */
    static generate(title: string): string {
        if (!title || typeof title !== 'string') {
            return 'untitled-node';
        }

        return title
            .toLowerCase()
            .replace(/[\s/\\]+/g, '-')      // Replace spaces and slashes with hyphens
            .replace(/[^a-z0-9-]/g, '')     // Remove special characters (after handling slashes)
            .replace(/-+/g, '-')            // Replace multiple hyphens with single
            .replace(/^-|-$/g, '')          // Trim leading/trailing hyphens
            .trim();                        // Trim whitespace
    }

    /**
     * Sanitize a filename (similar to generate but preserves more characters)
     */
    static sanitize(fileName: string): string {
        if (!fileName) {
            return 'untitled';
        }

        return fileName
            // eslint-disable-next-line no-control-regex
            .replace(/[<>:"|?*\x00-\x1f]/g, '')  // Remove invalid chars
            .replace(/[\s/\\]+/g, '-')            // Replace spaces and slashes
            .replace(/-+/g, '-')                  // Collapse hyphens
            .replace(/^-|-$/g, '')                // Trim leading/trailing hyphens
            .trim();
    }

    /**
     * Get the fileName for a node, handling slashes and special characters
     * This is the canonical way to get a safe fileName from a node
     *
     * @param node - Node with optional fileName and title properties
     * @returns A safe fileName for file system operations
     */
    static getNodeFileName(node: { fileName?: string; title?: string }): string {
        // If node has a fileName, sanitize it (in case it was set with slashes)
        if (node.fileName && node.fileName.trim()) {
            return FileNameGenerator.sanitize(node.fileName.toLowerCase());
        }
        // Otherwise generate from title
        if (node.title && node.title.trim()) {
            return FileNameGenerator.generate(node.title);
        }
        return 'untitled';
    }
}
