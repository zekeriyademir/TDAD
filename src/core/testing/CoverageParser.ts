import * as fs from 'fs';
import * as path from 'path';
import { logError, logger } from '../../shared/utils/Logger';
import { ApiRequest, CoverageData } from '../../shared/types';

/**
 * CoverageParser - Parses Jest/Playwright coverage reports to extract execution trace
 *
 * Phase 4: Two-Layer Context Engine - Dynamic "Blast Radius" (Layer 1)
 * - Parses coverage-summary.json (Jest/c8) or coverage.json (Playwright) to get files executed during test
 * - Provides the "WHERE" context for failed tests
 * - Used in Golden Packet to show execution trace
 *
 * Sprint X: Supports per-worker files (coverage-worker-*.json) for parallel test execution
 * - Each parallel worker writes to its own file to avoid race conditions
 * - CoverageParser merges them automatically when reading
 */
export class CoverageParser {
    /**
     * Merge testTraces from per-worker coverage files (lightweight - no jsCoverage)
     * jsCoverage can be 80MB+ per worker, causing "Invalid string length" errors
     * We only need testTraces for the Golden Packet display
     *
     * @param coverageDir - Path to coverage directory
     * @returns Merged testTraces data or null if no coverage found
     */
    private static mergePerWorkerCoverageFiles(coverageDir: string): any | null {
        try {
            // Look for per-worker files (coverage-worker-*.json)
            const files = fs.readdirSync(coverageDir)
                .filter(f => f.startsWith('coverage-worker-') && f.endsWith('.json'));

            if (files.length > 0) {
                logger.log('COVERAGE', `Found ${files.length} per-worker coverage files, merging testTraces only...`);

                // Only merge testTraces - NOT jsCoverage (too large, causes string length errors)
                const merged = {
                    testTraces: {} as { [key: string]: any },
                    workerFiles: files,
                    // jsCoverage is NOT merged here - use extractSourceFilesFromWorkerFiles() instead
                    jsCoverage: [] as any[]
                };

                for (const file of files) {
                    const filePath = path.join(coverageDir, file);
                    try {
                        const content = fs.readFileSync(filePath, 'utf-8');
                        const data = JSON.parse(content);

                        // Only merge testTraces (small) - NOT jsCoverage (80MB+ per file)
                        if (data.testTraces && typeof data.testTraces === 'object') {
                            for (const [testTitle, trace] of Object.entries(data.testTraces)) {
                                merged.testTraces[testTitle] = trace;
                            }
                        }
                    } catch (e) {
                        logger.log('COVERAGE', `Failed to parse worker file: ${file}`);
                    }
                }

                logger.log('COVERAGE', `Merged ${Object.keys(merged.testTraces).length} test traces from ${files.length} workers`);
                return merged;
            }

            // Fallback to single coverage.json
            const singlePath = path.join(coverageDir, 'coverage.json');
            if (fs.existsSync(singlePath)) {
                const content = fs.readFileSync(singlePath, 'utf-8');
                return JSON.parse(content);
            }

            return null;
        } catch (error) {
            logError('COVERAGE', 'Failed to merge per-worker coverage files', error);
            return null;
        }
    }

    /**
     * Extract source files from per-worker coverage files (streams to avoid memory issues)
     * Processes each file individually to extract unique URLs without loading all jsCoverage into memory
     *
     * @param coverageDir - Path to coverage directory
     * @returns Array of unique source file paths
     */
    private static extractSourceFilesFromWorkerFiles(coverageDir: string): string[] {
        const filePathSet = new Set<string>();

        try {
            const files = fs.readdirSync(coverageDir)
                .filter(f => f.startsWith('coverage-worker-') && f.endsWith('.json'));

            if (files.length === 0) {return [];}

            logger.log('COVERAGE', `Extracting source files from ${files.length} worker files...`);

            for (const file of files) {
                const filePath = path.join(coverageDir, file);
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const data = JSON.parse(content);

                    // Extract URLs from jsCoverage entries
                    if (data.jsCoverage && Array.isArray(data.jsCoverage)) {
                        for (const entry of data.jsCoverage) {
                            if (!entry.url) {continue;}

                            // Skip non-user code
                            const url = entry.url;
                            if (url.includes('node_modules') ||
                                url.startsWith('chrome-extension://') ||
                                url.includes('webpack://')) {
                                continue;
                            }

                            // Check if this entry has executed code
                            let hasExecutedCode = false;
                            if (entry.functions && Array.isArray(entry.functions)) {
                                for (const func of entry.functions) {
                                    if (func.ranges?.some((r: any) => r.count > 0)) {
                                        hasExecutedCode = true;
                                        break;
                                    }
                                }
                            }

                            if (!hasExecutedCode) {continue;}

                            // Extract file path from URL and decode bundler chunk names
                            const sourcePath = this.extractSourcePath(url);
                            if (sourcePath) {
                                filePathSet.add(sourcePath);
                            }
                        }
                    }
                } catch (e) {
                    // Skip files that fail to parse
                }
            }

            const files_result = Array.from(filePathSet);
            logger.log('COVERAGE', `Extracted ${files_result.length} unique source files from worker coverage`);
            return files_result;
        } catch (error) {
            logError('COVERAGE', 'Failed to extract source files from worker files', error);
            return [];
        }
    }

    /**
     * Extract source file path from coverage URL
     * Decodes Next.js/Turbopack chunk names back to source paths
     *
     * Examples:
     * - `_next/static/chunks/frontend_app_page_tsx_de7bfa9c._.js` → `frontend/app/page.tsx`
     * - `http://localhost:3003/src/app.tsx` → `src/app.tsx`
     */
    private static extractSourcePath(url: string): string | null {
        // Decode URL-encoded characters first (e.g., %5B = [, %5C = \)
        let decodedUrl = url;
        try {
            decodedUrl = decodeURIComponent(url);
        } catch (e) {
            // Keep original if decode fails
        }

        // Skip non-user code (check both encoded and decoded)
        if (decodedUrl.includes('node_modules') ||
            decodedUrl.startsWith('chrome-extension://') ||
            decodedUrl.includes('[turbopack]') ||
            decodedUrl.includes('hmr-client') ||
            decodedUrl.includes('__webpack') ||
            decodedUrl.includes('webpack-internal') ||
            decodedUrl.includes('favicon')) {
            return null;
        }

        // Try to decode Next.js/Turbopack chunk names
        // Pattern: frontend_app_page_tsx_de7bfa9c._.js → frontend/app/page.tsx
        // Supports: underscores, dashes, dots in path, variable-length hash
        const chunkMatch = decodedUrl.match(/chunks\/([a-zA-Z0-9_\-.]+)_(tsx|jsx|ts|js)_[a-f0-9]+\._\.js/i);
        if (chunkMatch) {
            const pathPart = chunkMatch[1]; // e.g., "frontend_app_page" or "my-component"
            const ext = chunkMatch[2]; // e.g., "tsx"
            // Convert underscores to slashes (Turbopack uses _ for path separators)
            // But preserve dashes and dots in filenames
            const sourcePath = pathPart.replace(/_/g, '/') + '.' + ext;
            return sourcePath;
        }

        // Alternative Turbopack pattern: chunks/[name].[hash].js with embedded source info
        // Pattern: chunks/app_page_tsx.[hash].js
        const altChunkMatch = decodedUrl.match(/chunks\/([a-zA-Z0-9_\-.]+)\.[a-f0-9]+\.js/i);
        if (altChunkMatch) {
            const pathPart = altChunkMatch[1];
            // Check if it has extension marker (tsx, jsx, etc.)
            const extMatch = pathPart.match(/(.+)_(tsx|jsx|ts|js)$/i);
            if (extMatch) {
                const sourcePath = extMatch[1].replace(/_/g, '/') + '.' + extMatch[2];
                return sourcePath;
            }
        }

        // Try to decode Server chunk names (SSR)
        // Pattern: Server/C:\Users\...\frontend\app\page.tsx (already decoded above)
        if (decodedUrl.includes('Server/') || decodedUrl.includes('\\')) {
            // Extract path after common roots
            const rootMatch = decodedUrl.match(/(?:frontend|src|app|lib|components|pages)[/\\](.+)$/i);
            if (rootMatch) {
                const relativePath = rootMatch[0].replace(/\\/g, '/');
                // Remove hash suffix if present, also filter out [root-of-the-server]
                if (relativePath.includes('[root-of-the-server]')) {
                    return null;
                }
                return relativePath.replace(/_[a-f0-9]+\._\.js$/, '');
            }
        }

        // Standard URL extraction
        try {
            const urlObj = new URL(decodedUrl);
            let fp = urlObj.pathname;
            if (fp.startsWith('/')) {fp = fp.substring(1);}

            // Skip _next internal files that aren't decodable source files
            // Chunks without _tsx/_jsx markers are bundled code, not single source files
            if (fp.startsWith('_next/')) {
                return null;
            }

            return fp || null;
        } catch {
            // Fallback regex extraction
            const match = decodedUrl.match(/\/([^/]+\.(tsx?|jsx?))(\?|$)/i);
            return match ? match[1] : null;
        }
    }

    /**
     * Parse coverage summary and extract file paths
     * Supports per-worker files, Jest/c8 (coverage-summary.json) and Playwright (coverage.json) formats
     *
     * @param coveragePath - Path to coverage directory (e.g., "coverage")
     * @returns Array of file paths that were executed during test
     */
    public static parseCoverageSummary(coveragePath: string): string[] {
        try {
            // Try per-worker files first - extract source files directly (avoids memory issues)
            const workerSourceFiles = this.extractSourceFilesFromWorkerFiles(coveragePath);
            if (workerSourceFiles.length > 0) {
                return workerSourceFiles;
            }

            // Try Playwright format (coverage.json)
            const playwrightPath = path.join(coveragePath, 'coverage.json');
            if (fs.existsSync(playwrightPath)) {
                return this.parsePlaywrightCoverage(playwrightPath);
            }

            // Fallback to Jest/c8 format (coverage-summary.json)
            const summaryPath = path.join(coveragePath, 'coverage-summary.json');
            if (!fs.existsSync(summaryPath)) {
                logger.log('COVERAGE', `Coverage data not found in: ${coveragePath}`);
                return [];
            }

            return this.parseJestCoverage(summaryPath);
        } catch (error) {
            logError('COVERAGE', 'Failed to parse coverage summary', error);
            return [];
        }
    }

    /**
     * Parse Jest/c8 coverage format (coverage-summary.json)
     */
    private static parseJestCoverage(summaryPath: string): string[] {
        const summaryContent = fs.readFileSync(summaryPath, 'utf8');
        const summary = JSON.parse(summaryContent);

        const filePaths: string[] = [];

        for (const [filePath, coverage] of Object.entries(summary)) {
            // Skip the 'total' entry
            if (filePath === 'total') {
                continue;
            }

            // Check if file was executed (has any statement coverage)
            const coverageData = coverage as any;
            if (coverageData.statements && coverageData.statements.total > 0) {
                filePaths.push(filePath);
            }
        }

        logger.log('COVERAGE', `Parsed ${filePaths.length} files from Jest/c8 coverage report`);
        return filePaths;
    }

    /**
     * Parse Playwright coverage format (coverage.json from page.coverage API)
     * Format: Array of { url: string, scriptId: string, source: string, functions: Array<{ ranges: Array }> }
     */
    private static parsePlaywrightCoverage(coveragePath: string): string[] {
        const coverageContent = fs.readFileSync(coveragePath, 'utf8');
        const coverageData = JSON.parse(coverageContent);

        // Sprint 5: Handle both old and new coverage formats
        // Old format: Array of coverage entries
        // New format: { jsCoverage: [...], apiRequests: [...] }
        let coverage: any[];

        if (Array.isArray(coverageData)) {
            // Old format (plain array)
            coverage = coverageData;
        } else if (coverageData.jsCoverage && Array.isArray(coverageData.jsCoverage)) {
            // New format (object with jsCoverage property)
            coverage = coverageData.jsCoverage;
        } else {
            logger.log('COVERAGE', `Invalid Playwright coverage format at: ${coveragePath}`);
            return [];
        }

        const filePathSet = new Set<string>(); // Use Set to avoid duplicates

        for (const entry of coverage) {
            if (entry.url) {
                // Check if this entry has actual coverage data (functions with ranges)
                let hasExecutedCode = false;
                if (entry.functions && Array.isArray(entry.functions)) {
                    for (const func of entry.functions) {
                        if (func.ranges && func.ranges.length > 0) {
                            // Check if any range was actually executed (count > 0)
                            if (func.ranges.some((range: any) => range.count > 0)) {
                                hasExecutedCode = true;
                                break;
                            }
                        }
                    }
                }

                if (!hasExecutedCode) {
                    continue; // Skip files with no executed code
                }

                // Sprint 5: Extract source paths from coverage data
                // Generic extraction that works with any project structure
                let foundUserSourcePath = false;

                if (entry.source && typeof entry.source === 'string') {
                    // Pattern 1: "[project]/path/to/file.ext [context]" - Turbopack/Webpack format
                    const projectMatches = entry.source.matchAll(/\[project\]\/([^"\s\]]+)/g);
                    for (const match of projectMatches) {
                        if (match[1] && this.isUserSourceFile(match[1])) {
                            filePathSet.add(match[1]);
                            foundUserSourcePath = true;
                        }
                    }

                    // Pattern 2: "pagePath":"/path/to/file.ext" - React Server Components format
                    const pagePathMatches = entry.source.matchAll(/"pagePath":"\/([^"]+\.[a-z]{2,4})"/gi);
                    for (const match of pagePathMatches) {
                        if (match[1] && this.isUserSourceFile(match[1])) {
                            filePathSet.add(match[1]);
                            foundUserSourcePath = true;
                        }
                    }

                    // Pattern 3: Absolute paths in stack traces "C:\...\file.ext" or "/home/.../file.ext"
                    const absolutePathMatches = entry.source.matchAll(/(?:"|\\")([A-Z]:\\\\[^"\\]+\\\\[^"\\]+\.[a-z]{2,4}|\/[^"]+\/[^"]+\.[a-z]{2,4})(?:"|\\"|,)/gi);
                    for (const match of absolutePathMatches) {
                        const filePath = match[1].replace(/\\\\/g, '/');
                        // Extract relative path from absolute
                        const relativeMatch = filePath.match(/(?:src|app|lib|components|pages|routes|controllers|services|utils|hooks|stores)\/[^"]+/i);
                        if (relativeMatch && this.isUserSourceFile(relativeMatch[0])) {
                            filePathSet.add(relativeMatch[0]);
                            foundUserSourcePath = true;
                        }
                    }
                }

                // If we found user source paths, skip URL fallback
                if (foundUserSourcePath) {
                    continue;
                }

                // Fallback: Use extractSourcePath to decode chunk names and filter framework files
                // This handles Turbopack chunks like frontend_app_page_tsx_hash._.js → frontend/app/page.tsx
                const sourcePath = this.extractSourcePath(entry.url);
                if (sourcePath && this.isUserSourceFile(sourcePath)) {
                    filePathSet.add(sourcePath);
                }
            }
        }

        const filePaths = Array.from(filePathSet);
        logger.log('COVERAGE', `Parsed ${filePaths.length} files from Playwright coverage report`);
        return filePaths;
    }

    /**
     * Check if a file path is user source code (not framework/internal)
     * Generic filter that works with any project structure
     */
    private static isUserSourceFile(filePath: string): boolean {
        if (!filePath || filePath.length === 0) {
            return false;
        }

        // Must have a valid source file extension
        const sourceExtensions = /\.(tsx?|jsx?|vue|svelte|py|rb|go|rs|java|kt|cs|php|swift)$/i;
        if (!sourceExtensions.test(filePath)) {
            return false;
        }

        // Exclude framework/build artifacts (blacklist approach)
        const excludePatterns = [
            'node_modules',
            '.next/',
            '_next/',
            '__next',
            '__turbopack',
            '[root-of-the-server]',
            '.nuxt/',
            '.svelte-kit/',
            'dist/',
            'build/',
            '.cache/',
            'vendor/',
            '__pycache__',
            '.gradle/',
            'target/',
            '__generated__',
            '.angular/',
            '/chunks/',         // Bundler chunk directories (more specific than 'chunk')
            'webpack:',
            'turbopack'
        ];

        const lowerPath = filePath.toLowerCase();
        for (const pattern of excludePatterns) {
            if (lowerPath.includes(pattern.toLowerCase())) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get detailed coverage information for specific files
     *
     * @param coveragePath - Path to coverage directory
     * @param filePaths - Array of file paths to get details for
     * @returns Map of file path to coverage percentage
     */
    public static getDetailedCoverage(coveragePath: string, filePaths: string[]): Map<string, number> {
        const coverageMap = new Map<string, number>();

        try {
            const summaryPath = path.join(coveragePath, 'coverage-summary.json');

            if (!fs.existsSync(summaryPath)) {
                return coverageMap;
            }

            const summaryContent = fs.readFileSync(summaryPath, 'utf8');
            const summary = JSON.parse(summaryContent);

            for (const filePath of filePaths) {
                const coverageData = summary[filePath];
                if (coverageData && coverageData.statements) {
                    const percentage = coverageData.statements.pct || 0;
                    coverageMap.set(filePath, percentage);
                }
            }

            return coverageMap;
        } catch (error) {
            logError('COVERAGE', 'Failed to get detailed coverage', error);
            return coverageMap;
        }
    }

    /**
     * Format coverage files for display
     *
     * @param filePaths - Array of file paths
     * @param workspacePath - Workspace root path for relative paths
     * @returns Formatted string for display
     */
    public static formatCoverageFiles(filePaths: string[], workspacePath: string): string {
        if (filePaths.length === 0) {
            return 'No files were executed during test';
        }

        const formattedFiles = filePaths
            .map(filePath => {
                // Make path relative to workspace
                const relativePath = path.relative(workspacePath, filePath);
                return `- ${relativePath}`;
            })
            .join('\n');

        return `Files executed during test:\n${formattedFiles}`;
    }

    /**
     * Check if coverage report exists
     * Checks for per-worker files, single Playwright (coverage.json), and Jest/c8 formats
     *
     * @param coveragePath - Path to coverage directory
     * @returns True if any coverage data exists
     */
    public static hasCoverage(coveragePath: string): boolean {
        // Check for per-worker files first
        if (fs.existsSync(coveragePath)) {
            try {
                const files = fs.readdirSync(coveragePath);
                const hasWorkerFiles = files.some(f => f.startsWith('coverage-worker-') && f.endsWith('.json'));
                if (hasWorkerFiles) {
                    return true;
                }
            } catch (e) {
                // Ignore directory read errors
            }
        }

        // Check for single coverage files
        const playwrightPath = path.join(coveragePath, 'coverage.json');
        const summaryPath = path.join(coveragePath, 'coverage-summary.json');
        return fs.existsSync(playwrightPath) || fs.existsSync(summaryPath);
    }

    // =========================================================================
    // Sprint 5: Enhanced Coverage Parsing
    // =========================================================================

    /**
     * Parse coverage summary with enhanced data (source files + per-test traces)
     * OPTIMIZED: Single-pass parsing to avoid reading files twice
     *
     * @param coveragePath - Path to coverage directory (e.g., "coverage")
     * @returns Enhanced coverage data with per-test traces
     */
    public static parseCoverageSummaryEnhanced(coveragePath: string): CoverageData {
        try {
            // Single-pass extraction of both sourceFiles and testTraces
            const { sourceFiles, testTraces } = this.parseWorkerFilesSinglePass(coveragePath);

            // Collect all API requests across tests for inferring backend files
            const allApiRequests: ApiRequest[] = [];
            for (const trace of Object.values(testTraces)) {
                if (trace.apiRequests) {
                    allApiRequests.push(...trace.apiRequests);
                }
            }

            // Infer backend files from API requests
            const inferredBackendFiles = this.inferBackendFiles(allApiRequests);

            const testCount = Object.keys(testTraces).length;
            logger.log('COVERAGE', `Enhanced coverage: ${sourceFiles.length} source files, ${testCount} test traces`);

            return {
                sourceFiles,
                inferredBackendFiles,
                testTraces
            };
        } catch (error) {
            logError('COVERAGE', 'Failed to parse enhanced coverage summary', error);
            return {
                sourceFiles: [],
                inferredBackendFiles: [],
                testTraces: {}
            };
        }
    }

    /**
     * Single-pass parsing of worker files to extract both sourceFiles and testTraces
     * OPTIMIZATION: Reads each file only ONCE instead of twice (was causing 2x memory/CPU usage)
     *
     * @param coverageDir - Path to coverage directory
     * @returns Object with sourceFiles array and testTraces object
     */
    private static parseWorkerFilesSinglePass(coverageDir: string): {
        sourceFiles: string[];
        testTraces: { [testTitle: string]: any };
    } {
        const filePathSet = new Set<string>();
        const testTraces: { [testTitle: string]: any } = {};

        try {
            const files = fs.readdirSync(coverageDir)
                .filter(f => f.startsWith('coverage-worker-') && f.endsWith('.json'));

            if (files.length === 0) {
                // Fallback to non-worker formats
                return {
                    sourceFiles: this.parseCoverageSummary(coverageDir),
                    testTraces: {}
                };
            }

            logger.log('COVERAGE', `Single-pass parsing ${files.length} worker files...`);

            for (const file of files) {
                const filePath = path.join(coverageDir, file);
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const data = JSON.parse(content);

                    // Extract testTraces (small data)
                    if (data.testTraces && typeof data.testTraces === 'object') {
                        for (const [testTitle, trace] of Object.entries(data.testTraces)) {
                            testTraces[testTitle] = trace;
                        }
                    }

                    // Extract source files from jsCoverage URLs
                    if (data.jsCoverage && Array.isArray(data.jsCoverage)) {
                        for (const entry of data.jsCoverage) {
                            if (!entry.url) {continue;}

                            const url = entry.url;
                            if (url.includes('node_modules') ||
                                url.startsWith('chrome-extension://') ||
                                url.includes('webpack://')) {
                                continue;
                            }

                            // Check if entry has executed code
                            let hasExecutedCode = false;
                            if (entry.functions && Array.isArray(entry.functions)) {
                                for (const func of entry.functions) {
                                    if (func.ranges?.some((r: any) => r.count > 0)) {
                                        hasExecutedCode = true;
                                        break;
                                    }
                                }
                            }

                            if (!hasExecutedCode) {continue;}

                            const sourcePath = this.extractSourcePath(url);
                            if (sourcePath) {
                                filePathSet.add(sourcePath);
                            }
                        }
                    }
                } catch (e) {
                    logger.log('COVERAGE', `Failed to parse worker file: ${file}`);
                }
            }

            const sourceFiles = Array.from(filePathSet);
            logger.log('COVERAGE', `Extracted ${sourceFiles.length} source files, ${Object.keys(testTraces).length} test traces`);

            return { sourceFiles, testTraces };
        } catch (error) {
            logError('COVERAGE', 'Failed single-pass parsing', error);
            return { sourceFiles: [], testTraces: {} };
        }
    }

    /**
     * Infer backend files from API requests
     * Maps API endpoints to likely backend file paths
     *
     * Example: POST /api/auth/login → backend/src/routes/auth.routes.ts, backend/src/controllers/auth.controller.ts
     *
     * @param apiRequests - Array of API requests
     * @returns Array of inferred backend file paths
     */
    private static inferBackendFiles(apiRequests: ApiRequest[]): string[] {
        const fileSet = new Set<string>();

        for (const req of apiRequests) {
            try {
                // Extract endpoint path from URL
                // Example: "http://localhost:5000/api/auth/login" → "auth/login"
                const match = req.url.match(/\/api\/([^?#]+)/);

                if (match && match[1]) {
                    const endpoint = match[1]; // "auth/login" or "auth/login/"
                    const parts = endpoint.split('/').filter(p => p.length > 0);

                    if (parts.length > 0) {
                        const resource = parts[0]; // "auth"

                        // Infer likely backend files
                        fileSet.add(`backend/src/routes/${resource}.routes.ts`);
                        fileSet.add(`backend/src/controllers/${resource}.controller.ts`);

                        // Also try .js extension (for JavaScript projects)
                        fileSet.add(`backend/src/routes/${resource}.routes.js`);
                        fileSet.add(`backend/src/controllers/${resource}.controller.js`);
                    }
                }
            } catch (e) {
                // Skip invalid URLs
                continue;
            }
        }

        const files = Array.from(fileSet);
        logger.log('COVERAGE', `Inferred ${files.length} backend files from ${apiRequests.length} API requests`);
        return files;
    }
}
