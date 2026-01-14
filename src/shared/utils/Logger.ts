import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class Logger {
    private static instance: Logger;
    private logFile: string;
    private isEnabled = true;
    private lastLoggedMessages: Map<string, number> = new Map();
    private readonly DEDUP_WINDOW_MS = 1000; // Suppress identical messages within 1 second

    private constructor() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const logsDir = path.join(workspaceFolder.uri.fsPath, '.tdad', 'logs');
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
            this.logFile = path.join(logsDir, `tdad-${new Date().toISOString().split('T')[0]}.log`);
        } else {
            this.logFile = path.join(process.cwd(), 'tdad.log');
        }
        
        // Write session start marker
        this.writeToFile(`\n${'='.repeat(80)}\nTDAD Session Started: ${new Date().toISOString()}\n${'='.repeat(80)}\n`);
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public log(category: string, message: string, data?: any): void {
        if (!this.isEnabled) {return;}

        // Deduplication: skip if identical message logged recently
        const dedupKey = `${category}:${message}`;
        const now = Date.now();
        const lastLogged = this.lastLoggedMessages.get(dedupKey);
        if (lastLogged && (now - lastLogged) < this.DEDUP_WINDOW_MS) {
            return; // Skip duplicate
        }
        this.lastLoggedMessages.set(dedupKey, now);

        // Clean old entries periodically (every 100 entries)
        if (this.lastLoggedMessages.size > 100) {
            this.cleanOldDedupEntries(now);
        }

        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${category}] ${message}`;

        let fullEntry = logEntry;
        if (data !== undefined) {
            const dataStr = this.formatDataForLog(data);
            fullEntry += `\nData: ${dataStr}`;
        }
        fullEntry += '\n';

        this.writeToFile(fullEntry);
    }

    private cleanOldDedupEntries(now: number): void {
        for (const [key, timestamp] of this.lastLoggedMessages.entries()) {
            if (now - timestamp > this.DEDUP_WINDOW_MS * 10) {
                this.lastLoggedMessages.delete(key);
            }
        }
    }

    /**
     * Format data for logging with truncation for large objects
     * Prevents massive log entries from large arrays or objects
     */
    private formatDataForLog(data: any, maxLength = 500): string {
        if (typeof data !== 'object' || data === null) {
            return String(data);
        }

        // For arrays, show summary instead of full content
        if (Array.isArray(data)) {
            if (data.length === 0) {
                return '[]';
            }
            return `[Array with ${data.length} items]`;
        }

        // For objects, truncate if JSON is too large
        try {
            const jsonStr = JSON.stringify(data, null, 2);
            if (jsonStr.length <= maxLength) {
                return jsonStr;
            }

            // If too large, show truncated version
            const keys = Object.keys(data);
            const summary = {
                _truncated: true,
                _size: jsonStr.length,
                _keys: keys.length > 10 ? `${keys.slice(0, 10).join(', ')}... (${keys.length} total)` : keys.join(', ')
            };
            return JSON.stringify(summary, null, 2);
        } catch (error) {
            return '[Object - could not stringify]';
        }
    }

    public error(category: string, message: string, error?: any): void {
        const timestamp = new Date().toISOString();
        let logEntry = `[${timestamp}] [${category}] ERROR: ${message}`;
        
        if (error) {
            if (error instanceof Error) {
                logEntry += `\nError: ${error.message}\nStack: ${error.stack}`;
            } else {
                logEntry += `\nError: ${JSON.stringify(error, null, 2)}`;
            }
        }
        logEntry += '\n';

        this.writeToFile(logEntry);
    }

    public debug(category: string, message: string, data?: any): void {
        // Only log debug in development
        if (process.env.NODE_ENV === 'development') {
            this.log(`${category}-DEBUG`, message, data);
        }
    }

    private writeToFile(content: string): void {
        try {
            fs.appendFileSync(this.logFile, content);
        } catch (error) {
            // Can't use our logger here to avoid infinite recursion
            // Only output to console as fallback for critical logging errors
            console.error('Failed to write to log file:', error);
        }
    }

    public getLogFilePath(): string {
        return this.logFile;
    }

    public clearLogs(): void {
        try {
            fs.writeFileSync(this.logFile, '');
            this.writeToFile(`TDAD Logs Cleared: ${new Date().toISOString()}\n`);
        } catch (error) {
            // Can't use our logger here to avoid infinite recursion
            console.error('Failed to clear log file:', error);
        }
    }

    public disable(): void {
        this.isEnabled = false;
    }

    public enable(): void {
        this.isEnabled = true;
    }
}

// Convenience functions for different categories
export const logger = Logger.getInstance();

export function logExtension(message: string, data?: any): void {
    logger.log('EXTENSION', message, data);
}

export function logCanvas(message: string, data?: any): void {
    logger.log('CANVAS', message, data);
}

export function logAI(message: string, data?: any): void {
    logger.log('AI', message, data);
}

export function logTestRunner(message: string, data?: any): void {
    logger.log('TEST-RUNNER', message, data);
}

export function logError(category: string, message: string, error?: any): void {
    logger.error(category, message, error);
}