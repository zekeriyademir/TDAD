import * as fs from 'fs';
import * as path from 'path';
import { Test, Feature, Node } from '../../shared/types';
import { FileNameGenerator } from '../../shared/utils/fileNameGenerator';
import { getWorkflowFolderName } from '../../shared/utils/stringUtils';
import { getTestFilePath, getAbsolutePath } from '../../shared/utils/nodePathUtils';
import { generateFeatureId, generateTestId } from '../../shared/utils/idGenerator';
import { logCanvas, logError } from '../../shared/utils/Logger';


/**
 * Parses Jest test files to extract test definitions
 * This makes the test file the single source of truth for test definitions
 */
export class TestFileParser {
    /**
     * Get the test file path for a node
     * Uses FileNameGenerator to ensure filenames match what NodeManager creates
     */
    static getTestFilePath(node: Node, workspacePath: string): string {
        const fileName = FileNameGenerator.getNodeFileName(node as any);
        const workflowFolderName = getWorkflowFolderName(node.workflowId);
        return getAbsolutePath(workspacePath, getTestFilePath(workflowFolderName, fileName));
    }

    /**
     * Extract generated code from a test file
     * Extracts the function implementation code (everything before the first describe block)
     */
    static extractGeneratedCode(testFilePath: string): string | null {
        if (!fs.existsSync(testFilePath)) {
            return null;
        }

        const content = fs.readFileSync(testFilePath, 'utf-8');

        // Find the first describe block
        const describeMatch = content.match(/describe\s*\(/);
        if (!describeMatch || !describeMatch.index) {
            return null;
        }

        // Extract everything before the first describe block
        const codeSection = content.substring(0, describeMatch.index).trim();

        // Remove comments at the start
        const lines = codeSection.split('\n');
        const codeLines: string[] = [];
        let inCodeSection = false;

        for (const line of lines) {
            const trimmed = line.trim();
            // Skip comment lines at the beginning
            if (!inCodeSection && (trimmed.startsWith('//') || trimmed === '')) {
                continue;
            }
            inCodeSection = true;
            codeLines.push(line);
        }

        const code = codeLines.join('\n').trim();
        return code || null;
    }
    /**
     * Parse a test file and extract test definitions
     */
    static parseTestFile(testFilePath: string, nodeId?: string): { features: Feature[] } {
        if (!fs.existsSync(testFilePath)) {
            // File doesn't exist - this is normal for nodes that haven't had test files created yet
            logCanvas(`[TestFileParser] Test file not found: ${testFilePath}`);
            return { features: [] };
        }

        logCanvas(`[TestFileParser] Parsing test file: ${testFilePath}`);
        const content = fs.readFileSync(testFilePath, 'utf-8');
        const features: Feature[] = [];

        // Extract all describe blocks (features)
        const featureMatches = this.extractDescribeBlocks(content);
        logCanvas(`[TestFileParser] Extracted ${featureMatches.length} feature(s) from describes`);

        for (const featureMatch of featureMatches) {
            const feature: Feature = {
                id: generateFeatureId(),
                nodeId: nodeId || 'unknown',
                description: featureMatch.description,
                sortOrder: features.length,
                tests: []
            };

            // Extract all test blocks within this feature
            const testMatches = this.extractTestBlocks(featureMatch.content);
            logCanvas(`[TestFileParser] Feature "${featureMatch.description}" has ${testMatches.length} test(s)`);

            for (const testMatch of testMatches) {
                const input = this.extractVariable(testMatch.content, 'input');
                const expectedResult = this.extractVariable(testMatch.content, 'expectedResult');

                logCanvas(`[TestFileParser]   - Test: "${testMatch.title}"`);
                logCanvas(`[TestFileParser]     Input: ${JSON.stringify(input)}`);
                logCanvas(`[TestFileParser]     Expected: ${JSON.stringify(expectedResult)}`);

                const test: Test = {
                    id: generateTestId(),
                    featureId: feature.id,
                    title: testMatch.title,
                    description: testMatch.comment || '',
                    input,
                    expectedResult,
                    sortOrder: feature.tests!.length,
                    createdAt: new Date().toISOString()
                };

                feature.tests!.push(test);
            }

            features.push(feature);
        }

        logCanvas(`[TestFileParser] ✓ Parsing complete: ${features.length} feature(s), ${features.reduce((sum, f) => sum + (f.tests?.length || 0), 0)} total test(s)`);
        return { features };
    }

    /**
     * Extract describe blocks (features) from test content
     * Uses two-pass approach with brace-counting to handle nested structures
     */
    private static extractDescribeBlocks(content: string): Array<{ description: string, content: string }> {
        const results: Array<{ description: string, content: string }> = [];

        // PASS 1: Extract the outer node-level describe block
        // Support both Jest describe() and Playwright test.describe()
        const outerRegex = /(?:test\.)?describe\(['"](.*?)['"],\s*\(\)\s*=>\s*\{/;
        const outerMatch = content.match(outerRegex);

        if (!outerMatch) {
            logCanvas(`[TestFileParser] No outer describe block found`);
            return results;
        }

        const outerDescription = outerMatch[1];
        logCanvas(`[TestFileParser] Found outer describe: "${outerDescription}"`);

        // Find the content of the outer describe by counting braces
        const startIdx = outerMatch.index! + outerMatch[0].length;
        const outerContent = this.extractBlockContent(content, startIdx);

        // PASS 2: Extract inner describe blocks (features) from outer content
        // Support both Jest describe() and Playwright test.describe()
        const describePattern = /(?:test\.)?describe\(['"](.*?)['"],\s*\(\)\s*=>\s*\{/g;
        let match;
        let featureCount = 0;

        while ((match = describePattern.exec(outerContent)) !== null) {
            featureCount++;
            const description = match[1];
            const contentStartIdx = match.index + match[0].length;
            const blockContent = this.extractBlockContent(outerContent, contentStartIdx);

            logCanvas(`[TestFileParser] Found inner describe (feature) #${featureCount}: "${description}"`);
            logCanvas(`[TestFileParser]   - Has test(): ${blockContent.includes('test(')}`);

            // Inner describes should have test() calls
            if (blockContent.includes('test(')) {
                logCanvas(`[TestFileParser]   - ✓ KEEPING as feature`);
                results.push({
                    description,
                    content: blockContent
                });
            } else {
                logCanvas(`[TestFileParser]   - ✗ SKIPPING (no tests)`);
            }
        }

        logCanvas(`[TestFileParser] Total features extracted: ${results.length}`);
        return results;
    }

    /**
     * Extract content of a block by counting braces
     * Returns everything until the matching closing brace
     */
    private static extractBlockContent(content: string, startIdx: number): string {
        let braceCount = 1; // We start after the opening brace
        let endIdx = startIdx;

        for (let i = startIdx; i < content.length && braceCount > 0; i++) {
            if (content[i] === '{') {
                braceCount++;
            } else if (content[i] === '}') {
                braceCount--;
            }
            endIdx = i;
        }

        return content.substring(startIdx, endIdx);
    }

    /**
     * Extract test blocks from feature content
     * Supports both Jest and Playwright test formats
     */
    private static extractTestBlocks(content: string): Array<{ title: string, content: string, comment: string }> {
        const results: Array<{ title: string, content: string, comment: string }> = [];

        // Match Jest test blocks: test('title', () => { ... });
        const jestRegex = /(?:\/\/\s*(.*?)\n\s*)?test\(['"](.*?)['"],\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\}\);/g;
        let match;

        while ((match = jestRegex.exec(content)) !== null) {
            results.push({
                comment: match[1] || '',
                title: match[2],
                content: match[3]
            });
        }

        // Match Playwright test blocks: test('title', async ({ page }) => { ... });
        const playwrightRegex = /(?:\/\/\s*(.*?)\n\s*)?test\s*\(\s*['"`](.*?)['"`]\s*,\s*async\s*\(\s*{[^}]*}\s*\)\s*=>\s*{([\s\S]*?)}\s*\)\s*;/g;

        while ((match = playwrightRegex.exec(content)) !== null) {
            results.push({
                comment: match[1] || '',
                title: match[2],
                content: match[3]
            });
        }

        return results;
    }

    /**
     * Extract a variable value from test content (input or expectedResult)
     */
    private static extractVariable(content: string, variableName: string): any {
        try {
            // Match: const variableName = {...};
            const regex = new RegExp(`const\\s+${variableName}\\s*=\\s*({[^;]*});`, 's');
            const match = content.match(regex);

            if (match && match[1]) {
                // Parse the JSON object
                return JSON.parse(match[1]);
            }
        } catch (error) {
            logError('TEST_PARSER', `Failed to parse ${variableName}`, error);
        }

        return undefined;
    }

    /**
     * Check if a test file has valid test definitions
     */
    static hasValidTests(testFilePath: string): boolean {
        try {
            const result = this.parseTestFile(testFilePath);
            return result.features.length > 0 &&
                   result.features.some(f => f.tests && f.tests.length > 0);
        } catch {
            return false;
        }
    }

    /**
     * Get generated code for a node from its test file
     */
    static getGeneratedCodeFromNode(node: Node, workspacePath: string): string | null {
        const testFilePath = this.getTestFilePath(node, workspacePath);
        return this.extractGeneratedCode(testFilePath);
    }

    /**
     * Parse Playwright test file to extract simplified test details
     * Used for displaying test information in the UI
     */
    static parsePlaywrightTestDetails(testCode: string): Array<{ title: string; input: string; expectedResult: string; status: string }> {
        const testDetails: Array<{ title: string; input: string; expectedResult: string; status: string }> = [];

        try {
            // Match test blocks - supports both formats:
            // 1. test('title', async ({ page }) => { ... });
            // 2. test('title', async () => { ... });

            // First try to match tests with destructured params like { page }
            const playwrightRegex = /test\s*\(\s*['"`](.*?)['"`]\s*,\s*async\s*\(\s*{[^}]*}\s*\)\s*=>\s*{([\s\S]*?)}\s*\)\s*;/g;
            let match;

            while ((match = playwrightRegex.exec(testCode)) !== null) {
                const title = match[1];
                const testBody = match[2];

                // Extract input from comments or code (Given/When)
                let input = '';
                const inputMatches = testBody.match(/\/\/.*(?:Given|When).*$/gm);
                if (inputMatches && inputMatches.length > 0) {
                    input = inputMatches.join('\n').replace(/\/\/\s*/g, '').trim();
                }

                // Extract expected result from assertions (Then)
                let expectedResult = '';
                const expectMatches = testBody.match(/\/\/.*Then.*$|await\s+expect\([^)]+\)\..*?;/gm);
                if (expectMatches && expectMatches.length > 0) {
                    expectedResult = expectMatches.join('\n').replace(/\/\/\s*/g, '').trim();
                }

                testDetails.push({
                    title,
                    input: input || 'No input details extracted',
                    expectedResult: expectedResult || 'No expected result extracted',
                    status: 'pending'
                });
            }

            // Now match action-based tests: test('title', async () => { ... });
            const actionRegex = /test\s*\(\s*['"`](.*?)['"`]\s*,\s*async\s*\(\s*\)\s*=>\s*\{/g;
            const testTitles = new Set(testDetails.map(t => t.title)); // Avoid duplicates

            while ((match = actionRegex.exec(testCode)) !== null) {
                const title = match[1];
                if (testTitles.has(title)) {continue;} // Skip if already found

                // Extract test body by finding matching braces
                const startIdx = match.index + match[0].length;
                const testBody = this.extractTestBody(testCode, startIdx);

                // For action-based tests, extract from const result = await performAction(...)
                let input = 'No input details extracted';
                const actionCallMatch = testBody.match(/await\s+performAction\s*\(\s*\{([^}]*)\}/s);
                if (actionCallMatch) {
                    const params = actionCallMatch[1].trim();
                    input = params.replace(/,\s*/g, ', ').trim();
                }

                // Extract expectations
                let expectedResult = 'No expected result extracted';
                const expectMatches = testBody.match(/expect\([^)]+\)\.[^;]+;/g);
                if (expectMatches && expectMatches.length > 0) {
                    expectedResult = expectMatches.slice(0, 3).join('\n'); // Show first 3 expectations
                }

                testDetails.push({
                    title,
                    input,
                    expectedResult,
                    status: 'pending'
                });
            }
        } catch (error) {
            logCanvas('[TestFileParser] Failed to parse Playwright tests:', error);
        }

        return testDetails;
    }

    /**
     * Extract test body by counting braces
     */
    private static extractTestBody(code: string, startIdx: number): string {
        let braceCount = 1;
        let endIdx = startIdx;

        for (let i = startIdx; i < code.length && braceCount > 0; i++) {
            if (code[i] === '{') {braceCount++;}
            else if (code[i] === '}') {braceCount--;}
            endIdx = i;
        }

        return code.substring(startIdx, endIdx);
    }
}
