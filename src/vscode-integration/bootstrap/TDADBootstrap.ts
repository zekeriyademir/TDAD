/**
 * TDAD Bootstrap
 * Initializes .tdad/ directory structure for a workspace
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { logCanvas, logError } from '../../shared/utils/Logger';

export class TDADBootstrap {
    private workspaceFolder: vscode.WorkspaceFolder;
    private extensionPath: string;

    constructor(workspaceFolder: vscode.WorkspaceFolder, extensionPath?: string) {
        this.workspaceFolder = workspaceFolder;
        // Get extension path from context or use workspace folder as fallback
        this.extensionPath = extensionPath || workspaceFolder.uri.fsPath;
    }

    /**
     * Check if TDAD is already initialized in workspace
     */
    async isInitialized(): Promise<boolean> {
        const tdadDir = vscode.Uri.joinPath(this.workspaceFolder.uri, '.tdad');

        try {
            await vscode.workspace.fs.stat(tdadDir);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Initialize TDAD directory structure
     */
    async initialize(): Promise<void> {
        logCanvas('Initializing TDAD structure...');

        try {
            // Create main .tdad directory
            const tdadDir = vscode.Uri.joinPath(this.workspaceFolder.uri, '.tdad');
            await vscode.workspace.fs.createDirectory(tdadDir);

            // Create metadata directory
            const metadataDir = vscode.Uri.joinPath(tdadDir, 'metadata');
            await vscode.workspace.fs.createDirectory(metadataDir);

            // Create logs directory
            const logsDir = vscode.Uri.joinPath(tdadDir, 'logs');
            await vscode.workspace.fs.createDirectory(logsDir);

            // Create workflows directory (feature maps and test files)
            // Feature files and test files are stored in hierarchical structure:
            // .tdad/workflows/[workflow]/[feature]/[feature].feature
            // .tdad/workflows/[workflow]/[feature]/[feature].test.js
            const workflowsDir = vscode.Uri.joinPath(tdadDir, 'workflows');
            await vscode.workspace.fs.createDirectory(workflowsDir);

            // Create README in .tdad directory
            await this.createReadme(tdadDir);

            // Create/update .gitignore
            await this.updateGitignore();

            logCanvas('TDAD structure initialized successfully');

            vscode.window.showInformationMessage(
                'TDAD initialized! The .tdad/metadata/ directory will track your features and tests.'
            );
        } catch (error) {
            logError('BOOTSTRAP', 'Failed to initialize TDAD', error);
            vscode.window.showErrorMessage(`Failed to initialize TDAD: ${error}`);
            throw error;
        }
    }

    /**
     * Create README.md in .tdad directory
     */
    private async createReadme(tdadDir: vscode.Uri): Promise<void> {
        const readmePath = vscode.Uri.joinPath(tdadDir, 'README.md');

        const readme = `# TDAD Directory Structure

This directory contains all data for Test-Driven AI Development (TDAD).

## Directory Layout

\`\`\`
.tdad/
  workflows/         # Workflow definitions, feature files, and test files
    root.workflow.json
    auth/
      auth.workflow.json
      user-login/
        user-login.feature
        user-login.action.js
        user-login.test.js
  logs/              # Test run logs
  metadata/          # User-defined metadata
\`\`\`

## What to Commit

✅ **COMMIT**: \`.tdad/workflows/\` - Your feature definitions and test files
✅ **COMMIT**: \`.tdad/metadata/\` - Source of truth for features
❌ **DON'T COMMIT**: \`.tdad/logs/\` - Runtime data

## More Info

See the TDAD extension documentation for details.
`;

        await vscode.workspace.fs.writeFile(readmePath, Buffer.from(readme, 'utf8'));
        logCanvas('Created .tdad/README.md');
    }

    /**
     * Load TDAD gitignore rules from template file
     */
    private loadGitignoreTemplate(): string {
        // The templates folder is at the extension root (copied during build)
        const templatePath = path.join(this.extensionPath, 'templates', '.gitignore.tdad');

        if (!fs.existsSync(templatePath)) {
            throw new Error(`TDAD gitignore template not found at: ${templatePath}`);
        }

        const fullTemplate = fs.readFileSync(templatePath, 'utf-8');

        // Extract only TDAD-specific rules (lines starting with # TDAD or after)
        // We want the cache, runtime, and source of truth sections
        const lines = fullTemplate.split('\n');
        const tdadSectionStart = lines.findIndex(line => line.includes('# TDAD Cache'));
        const tdadSectionEnd = lines.findIndex((line, idx) =>
            idx > tdadSectionStart && line.includes('# Node.js')
        );

        if (tdadSectionStart === -1) {
            throw new Error('TDAD section not found in template');
        }

        // Extract TDAD-specific sections
        const tdadLines = tdadSectionEnd === -1
            ? lines.slice(tdadSectionStart)
            : lines.slice(tdadSectionStart, tdadSectionEnd);

        return '\n# ====================\n# TDAD (Test-Driven AI Development)\n# ====================\n\n' +
               tdadLines.join('\n').trim();
    }

    /**
     * Update or create .gitignore with TDAD rules from template
     */
    private async updateGitignore(): Promise<void> {
        const gitignorePath = vscode.Uri.joinPath(this.workspaceFolder.uri, '.gitignore');

        let existingContent = '';

        // Read existing .gitignore if it exists
        try {
            const data = await vscode.workspace.fs.readFile(gitignorePath);
            existingContent = data.toString();
        } catch {
            // .gitignore doesn't exist yet
        }

        // Check if TDAD rules already exist
        if (existingContent.includes('# TDAD')) {
            logCanvas('.gitignore already contains TDAD rules');
            return;
        }

        // Load rules from template file
        let tdadRules: string;
        try {
            tdadRules = this.loadGitignoreTemplate();
        } catch (error) {
            logError('BOOTSTRAP', 'Failed to load gitignore template', error);
            throw error;
        }

        const newContent = existingContent + '\n' + tdadRules + '\n';

        await vscode.workspace.fs.writeFile(gitignorePath, Buffer.from(newContent, 'utf8'));
        logCanvas('Updated .gitignore with TDAD rules from template');

        // Show diff to user
        const choice = await vscode.window.showInformationMessage(
            'Added TDAD rules to .gitignore',
            'View Changes'
        );

        if (choice === 'View Changes') {
            const doc = await vscode.workspace.openTextDocument(gitignorePath);
            await vscode.window.showTextDocument(doc);
        }
    }

    /**
     * Initialize with progress indicator
     */
    async initializeWithProgress(): Promise<void> {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Initializing TDAD',
                cancellable: false
            },
            async (progress) => {
                progress.report({ message: 'Creating directories...' });
                await this.initialize();

                progress.report({ message: 'Done!' });
            }
        );
    }

    /**
     * Verify directory structure (for diagnostics)
     */
    async verify(): Promise<{
        valid: boolean;
        missing: string[];
    }> {
        const requiredDirs = [
            '.tdad',
            '.tdad/metadata'
        ];

        const missing: string[] = [];

        for (const dir of requiredDirs) {
            const dirPath = vscode.Uri.joinPath(this.workspaceFolder.uri, dir);

            try {
                await vscode.workspace.fs.stat(dirPath);
            } catch {
                missing.push(dir);
            }
        }

        return {
            valid: missing.length === 0,
            missing
        };
    }
}
