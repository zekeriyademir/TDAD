/**
 * Assigns unique IDs to test names in .test.js files
 * Run: node scripts/assign-test-ids.js
 *
 * Transforms:
 *   test('[BE] Login API Success', ...)  ->  test('[BE-001] Login API Success', ...)
 *   test('[FE] Login form test', ...)    ->  test('[FE-001] Login form test', ...)
 *
 * IDs appear in Playwright output, screenshots, and trace files for easy tracking.
 */

const fs = require('fs');
const path = require('path');

// Use CWD (set by extension) or fallback to script location
const workspaceRoot = process.cwd();
const WORKFLOWS_DIR = path.join(workspaceRoot, '.tdad', 'workflows');

// Regex to match test names: test('[TYPE] name' or test('[TYPE-###] name'
// Captures: 1=prefix (BE/FE), 2=existing ID or empty, 3=test name
const TEST_PATTERN = /test\(\s*['"`]\[([A-Z]+)(?:-(\d+))?\]\s*([^'"`]+)['"`]/g;

function findTestFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            findTestFiles(fullPath, files);
        } else if (entry.name.endsWith('.test.js')) {
            files.push(fullPath);
        }
    }
    return files;
}

function assignIdsToFile(filePath, globalCounters) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;
    const relativePath = path.relative(WORKFLOWS_DIR, filePath);

    // Track IDs used in this file to avoid duplicates
    const usedInFile = new Set();

    // First pass: collect existing IDs
    let match;
    const tempPattern = /test\(\s*['"`]\[([A-Z]+)-(\d+)\]/g;
    while ((match = tempPattern.exec(content)) !== null) {
        const prefix = match[1];
        const id = parseInt(match[2], 10);
        if (!globalCounters[prefix]) globalCounters[prefix] = 0;
        globalCounters[prefix] = Math.max(globalCounters[prefix], id);
        usedInFile.add(`${prefix}-${id}`);
    }

    // Second pass: assign IDs to tests without them
    content = content.replace(TEST_PATTERN, (fullMatch, prefix, existingId, testName) => {
        if (existingId) {
            // Already has an ID, keep it
            return fullMatch;
        }

        // Assign new ID
        if (!globalCounters[prefix]) globalCounters[prefix] = 0;
        globalCounters[prefix]++;
        const newId = String(globalCounters[prefix]).padStart(3, '0');

        modified = true;
        console.log(`  ${prefix}-${newId}: ${testName.trim()}`);

        // Reconstruct the test declaration
        const quote = fullMatch.includes("'") ? "'" : fullMatch.includes('"') ? '"' : '`';
        return `test(${quote}[${prefix}-${newId}] ${testName}${quote}`;
    });

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf-8');
        return true;
    }
    return false;
}

function main() {
    console.log('Scanning for test files in .tdad/workflows/...\n');

    const testFiles = findTestFiles(WORKFLOWS_DIR);

    if (testFiles.length === 0) {
        console.log('No .test.js files found');
        return;
    }

    // Global counters per prefix (BE, FE, etc.) - shared across all files
    const globalCounters = {};
    let modifiedCount = 0;

    // First pass: collect all existing IDs to set counters
    for (const file of testFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const pattern = /test\(\s*['"`]\[([A-Z]+)-(\d+)\]/g;
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const prefix = match[1];
            const id = parseInt(match[2], 10);
            if (!globalCounters[prefix]) globalCounters[prefix] = 0;
            globalCounters[prefix] = Math.max(globalCounters[prefix], id);
        }
    }

    // Second pass: assign new IDs
    for (const file of testFiles) {
        const relativePath = path.relative(WORKFLOWS_DIR, file);
        const wasModified = assignIdsToFile(file, globalCounters);
        if (wasModified) {
            console.log(`\nUpdated: ${relativePath}`);
            modifiedCount++;
        }
    }

    if (modifiedCount > 0) {
        console.log(`\n✓ Updated ${modifiedCount} file(s)`);
    } else {
        console.log('✓ All tests already have IDs');
    }

    // Summary
    console.log('\nID counters:');
    for (const [prefix, count] of Object.entries(globalCounters)) {
        console.log(`  ${prefix}: ${count} tests`);
    }
}

main();
