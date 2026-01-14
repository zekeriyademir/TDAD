import { Node, TestResult } from '../../shared/types';

export interface TestRunOptions {
    timeout?: number; // milliseconds, default 30000 (30 seconds)
    framework?: 'playwright'; // Only Playwright is supported
    silent?: boolean; // Don't show output channel
    dependencyContext?: Record<string, any>; // Runtime context from upstream dependencies
}

export interface ITestRunner {
    runNodeTests(node: Node, generatedCode: string, options?: TestRunOptions): Promise<TestResult[]>;
    cancelCurrentTest(): void;
    isTestRunning(): boolean;
    dispose(): void;
}
