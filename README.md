# TDAD: Test-Driven AI Development

<!-- Badges will be added here after marketplace publication -->
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**TDAD** (Test-Driven AI Development) is the "Supervisor" for your AI coding agent.

We all know the feeling: You ask for a feature, the AI generates 5 files, and... nothing works. The imports are wrong, the logic is hallucinated, and you spend the next hour debugging "magic" code.

TDAD solves this by forcing the AI to work like a real engineer: **Test-Driven Development.**
It doesn't just "write code." It enforces a strict cycle:
1.  **Plan:** Visually map features on a dependency canvas.
2.  **Specify:** Define behavior with standard BDD (Gherkin) specs.
3.  **Verify:** Scaffold and run Playwright tests automatically.
4.  **Debug:** Fix issues instantly using "Golden Packet" execution traces.

> 📸 **Note:** Add screenshot/demo GIF here showing the Canvas UI and 4-step workflow in action

**Quick Links:** [Installation](#installation) • [Getting Started](#getting-started) • [Features](#features) • [Contributing](#contributing) • [Community](#community)

---

## The Solution: TDAD (The Guardrails)

TDAD is the **Traffic Controller** that stops the AI from crashing. It solves the "Last Mile" problem by inverting the workflow:

> 📸 **GIF:** Show the "Interactive Workflow" loop: Click BDD -> Paste -> Click Test -> Paste -> Click Fix -> Paste. This demonstrates the core value proposition.

*   **🔐 Privacy First:** No code leaves your machine unless you paste it yourself.
*   **💸 BYO-AI:** Works with the tools you already pay for (Claude Pro, ChatGPT Plus, Cursor).

### 1. Solve Reliability with "Fill-in-the-Blanks" (Don't Guess Structure)
Instead of letting the AI invent a random file structure:
*   **TDAD Scaffolds First:** It creates the empty files (`login.feature`, `login.action.js`, `login.test.js`) in the correct folders.
*   **AI Fills the Blanks:** The AI is given a precise task: "Implement the function in `login.action.js` to match the spec in `login.feature`."
*   **Result:** Zero architectural hallucinations. The code lands exactly where it belongs, every time.

### 2. Solve Context with "Surgical Traces" (Don't Guess Bugs)
When a bug happens, the AI usually guesses why. TDAD provides scientific proof:
*   **Automated Verification:** TDAD runs the Playwright tests automatically in the background.
*   **Line-Level Precision:** It captures the exact execution trace. "The test failed at `login.action.js:42` because `token` was undefined."
*   **The Golden Packet:** It feeds this exact error + the specific code lines back to the AI.
*   **Result:** The AI fixes the *actual* bug, not a hallucinated one.

---

## Core Philosophy: "Scaffold, Don't Guess"

1.  **Architect (TDAD):** Defines the feature, creates the files, writes the Gherkin, tracks status (Red/Green).
2.  **Developer (AI Agent):** Writes the implementation code using the "Golden Packet" provided by TDAD.
3.  **QA (TDAD):** Runs the tests and updates the visual board.

---

## Installation

### Prerequisites
- Node.js 18+ and npm
- VS Code 1.80+
- Playwright (installed automatically during setup)

### Install from VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "TDAD"
4. Click "Install"

### Manual Installation (Development)
```bash
# Clone the repository
git clone https://github.com/[username]/TDAD.git
cd TDAD

# Install dependencies
npm install

# Compile the extension
npm run compile

# Press F5 in VS Code to launch Extension Development Host
```

---

## Getting Started

### Quick Start (New Project)
1. Open VS Code in an empty folder
2. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
3. Run `TDAD: Open Canvas`
4. Click **"Start New Project"** in the Welcome Overlay
5. Follow the 3-step wizard:
   - Define your project idea and tech stack
   - Copy prompts and paste into your AI agent (Claude, Cursor, etc.)
   - Watch as your Canvas populates with feature nodes

### Quick Start (Existing Project)
1. Open your codebase in VS Code
2. Run `TDAD: Open Canvas`
3. Click **"Map Codebase"**
4. Select your source folder (e.g., `src/`)
5. Paste the prompt into your AI agent
6. Your existing features appear as nodes on the Canvas

### Your First Feature
1. Select a feature node on the Canvas
2. Click **"1. BDD"** → Paste into AI agent → Get Gherkin spec
3. Click **"2. Tests"** → Paste into AI agent → Get test implementation
4. Click **"3. Run"** → Tests execute automatically
5. If tests fail, click **"4. Fix"** → Paste Golden Packet into AI agent → Get fixes
6. Repeat until the node turns Green

---

## Features

### 1. The "Canvas" System (Visual Workflow Board)
Instead of generating code blindly, TDAD provides a visual canvas to plan and track your features.

*   **Visual Board:** A React Flow canvas showing features as nodes organized in folders.
*   **Status Visualization:** Nodes are **Grey** (Pending), **Red** (Failing), or **Green** (Passing).
*   **Hierarchical Organization:** Folder nodes contain feature nodes with breadcrumb navigation.
*   **Onboarding Flow:** First-time users see a Welcome Overlay with two options:
    *   **Start New Project:** 3-step wizard (Define & Document → Scaffold Structure → Generate Blueprint)
    *   **Map Codebase:** Reverse engineer existing code into TDAD nodes
*   **Scaffolding Engine:** When you create a "Login" feature, TDAD automatically:
    *   Creates `.tdad/workflows/auth/login/login.feature` (The Spec)
    *   Creates `.tdad/workflows/auth/login/login.action.js` (Empty Action Skeleton)
    *   Creates `.tdad/workflows/auth/login/login.test.js` (Empty Test Skeleton)
*   **Benefit:** Ensures a consistent, clean file structure that the AI can simply "fill in" rather than inventing random paths.

### 2. The "Interactive Workflow" (The Core Experience)
TDAD does not call OpenAI/Claude for code generation. Instead, it serves as a **Prompt Engineering Platform** with a 4-step linear pipeline.

**The Bottom Action Bar** displays when a feature node is selected, showing a strict TDD workflow:

**Step 1: BDD** (Always available - the starting point)
*   Click **"1. BDD"** → Copies BDD generation prompt to clipboard
*   Paste into your AI agent → AI writes the `.feature` file (Gherkin spec)

**Step 2: 🧪 Tests** (Enabled ONLY if BDD exists)
*   Click **"2. Tests"** → Scaffolds `.action.js` + `.test.js` AND copies test generation prompt
*   System injects: Feature Spec, Dependency imports, Documentation Context, File paths
*   Paste into your AI agent → AI implements action logic and test assertions

**Step 3: ▶️ Run** (Enabled ONLY if Tests exist)
*   Click **"3. Run"** → Executes `npx playwright test` for this node
*   **Captures automatically** (via tdad-fixtures.js):
    - API requests/responses
    - Console logs (errors + warnings)
    - Page errors (uncaught exceptions)
    - DOM snapshot (accessibility tree or HTML)
    - Screenshots on failure
    - Coverage data
*   Node turns **Green** (passed) or **Red** (failed)

**Step 4: 🔧 Fix** (Enabled ONLY if Tests exist)
*   Click **"4. Fix"** → Assembles Golden Packet with trace data + copies to clipboard
*   Paste into your AI agent → AI reads exact error context and fixes the issue
*   Return to **Step 3** and repeat until Green

**Key Benefits:**
*   Zero API cost (uses your existing AI subscription)
*   Infinite Context (AI reads the whole repo)
*   Deterministic imports and file structure
*   Surgical precision (AI sees exact trace data, not hallucinated errors)

### 3. The "Project Wizard" (Onboarding & Setup)
We solve the "Blank Page Problem" with two distinct workflows accessible from the Welcome Overlay.

> 📸 **GIF:** Show the Project Wizard: Clicking "Start New Project", selecting options, and seeing the Canvas populate with nodes.

**Option A: Start New Project** (3-step wizard)

1.  **Step 1: Define & Document**
    *   Enter your project idea, tech stack, database preferences
    *   Click "Copy Prompt" → TDAD generates prompt for `PRD.md`, `ARCHITECTURE.md`, `README.md`
    *   Paste into AI agent → AI writes documentation files
    *   Click "Next" to proceed

2.  **Step 2: Scaffold Structure**
    *   Select generated documentation files (PRD, Architecture, README)
    *   Click "Copy Prompt" → TDAD generates scaffold script (npm init, folders, config)
    *   Paste into AI agent → AI runs the script to create physical project skeleton
    *   Click "Next" to proceed

3.  **Step 3: Generate Blueprint**
    *   Select documentation folder (defaults to `docs/`)
    *   Choose test types (UI/API) and framework (Playwright)
    *   Click "Copy Prompt" → TDAD generates blueprint prompt
    *   Paste into AI agent → AI creates `.tdad/workflows/root.workflow.json`
    *   Canvas automatically renders the feature graph

**Option B: Map Existing Codebase** (Reverse engineer mode)

*   Select existing source folder (e.g., `src/`)
*   TDAD generates prompt to analyze codebase and create workflow nodes
*   AI reverse engineers code into `.tdad/workflows/root.workflow.json`
*   Canvas renders existing features as nodes

### 4. The Dependency System (Reusing Actions)
When Feature B depends on Feature A, avoid duplicating logic. Instead, **import and call the action function** from the dependency.

*   **Manual Wiring:** User explicitly connects `Login` -> `Send Money` on the canvas.
*   **How It Works:**
    *   **Producer (Login):** The `login.action.js` returns authentication data:
        ```javascript
        return { success: true, userId: '123', token: 'abc...' };
        ```
    *   **Consumer (Send Money):** Imports and calls the login action to get authenticated:
        ```javascript
        import { performLoginAction } from '../auth/login/login.action.js';

        const loginResult = await performLoginAction(page, { email, password });
        // Now use loginResult.token for authenticated API calls
        ```
*   **Prompt Injection:** When generating the test prompt for "Send Money", TDAD explicitly tells the AI: *"Import and call `performLoginAction()` from the dependency. Do not re-implement login."*
*   **Benefit:** Zero code duplication, tests stay fast, changes to Login automatically propagate to dependent features.

### 5. The "Golden Packet" (Fixing Tests)
When a test fails, TDAD provides the "Golden Packet" to help the AI fix it.

> 📸 **GIF:** Show a Red node -> Click "Fix" -> Paste Golden Packet into Cursor/Claude -> AI fixes code -> Click "Run" -> Node turns Green.

*   **The Problem:** To fix a test, the AI needs: The Test Code + The Error Message + The Gherkin + The Dependent Files + What ACTUALLY happened.
*   **The Solution:** TDAD assembles a "Golden Packet" on the clipboard.
*   **Action:** User clicks **"4. Fix"**, pastes the Golden Packet into their AI agent, and the AI fixes the bug using the trace to pinpoint the exact error.

#### Golden Packet Structure

The Golden Packet contains these sections:

1.  **SYSTEM RULES: FIX MODE** - AI instructions emphasizing:
    - Focus on the Dynamic Trace (execution context)
    - Call dependency actions directly instead of re-implementing
    - Minimal intervention - fix only broken logic

2.  **Scaffolded Files** - Paths to read:
    - Feature Spec (`.feature`)
    - Action File (`.action.js`)
    - Test File (`.test.js`)

4.  **Dependencies (Upstream Features)** - For each dependency:
    - Action file path for imports
    - Import statement template
    - Function signature and return value structure

5.  **Context Files** - Optional documentation to guide AI implementation:
    - User selects relevant files via the UI (API specs, design docs, business rules)
    - These files are injected into the prompt as reference material
    - **Why helpful:** Prevents hallucination of fake error messages or API responses
    - **Example:** If you link `api-spec.yaml`, the AI knows the real status codes (e.g., "API returns 401 for invalid tokens, not 403")
    - **Result:** AI generates tests with accurate assertions that match your actual system behavior

6.  **TEST RESULTS** - Formatted results:
    - ✅ Passed tests (count + names)
    - ❌ Failed tests (count + names + full error messages)
    - **Code Snippet** - Lines around the failing assertion for surgical precision:
      ```
      ❌ Failed at user-registration.test.js:64
         62│   await page.getByRole('radio', { name: 'Female' }).click();
         63│   await page.getByRole('button', { name: 'Register' }).click();
      >> 64│   expect(await page.locator('.success-message').isVisible()).toBe(true);
         65│ });
      ```
    - Summary line

7.  **Dynamic Trace (Execution Context)** - Detailed trace data from test execution:
    - **Trace File Reference** - Complete trace saved to `.tdad/debug/[folder]/[node-name]/trace-files/trace-{test-name}.json`
    - **Trace File Contents** (JSON structure):
      ```json
      {
        "testTitle": "[UI-004] Handle missing manifest file",
        "timestamp": "2026-01-13T08:04:03.358Z",
        "status": "failed",
        "errorMessage": "expect(locator).toBeVisible() failed...",
        "callStack": [{ "file": "...", "line": 117, "column": 40 }],
        "apiRequests": [{ "method": "GET", "url": "/api/...", "status": 200, "request": {...}, "response": {...} }],
        "consoleLogs": [{ "type": "error", "text": "...", "location": "..." }],
        "pageErrors": [{ "message": "...", "stack": "..." }],
        "actionResult": null,
        "domSnapshot": { "type": "html", "url": "...", "content": "..." },
        "screenshotPath": ".tdad/debug/.../screenshots/ui-004-handle-missing-manifest-file.png"
      }
      ```
    - **Frontend Source Files** - Files executed during test (from coverage data)
    - **Backend API Calls** - Method, URL, Status with inline ✅/❌ indicators
    - **Browser Console** - Errors and warnings with source location
    - **Uncaught JavaScript Errors** - Page crash errors with stack traces
    - **Debug Files Location** - All debug artifacts organized per node:
      - `.tdad/debug/generate-bdd.md` - Last BDD generation prompt
      - `.tdad/debug/generate-tests.md` - Last test generation prompt
      - `.tdad/debug/golden-packet.md` - Last fix context
      - `.tdad/debug/[folder]/[node]/screenshots/*.png` - Visual evidence per test
      - `.tdad/debug/[folder]/[node]/trace-files/trace-*.json` - Complete trace per test

8.  **DOM Snapshot ("Crime Scene Photo")** - The rendered page state at failure:
    - **Accessibility Tree** (preferred) - Clean view of interactive elements:
      ```yaml
      - heading "Create Account"
      - textbox "Email" [value: "test@example.com"]
      - textbox "Password"
      - button "Register" (disabled)  ← AI sees: button is disabled!
      - alert "Password is required"  ← AI sees: validation error showing!
      ```
    - **Why This Helps:**
      - Without snapshot: AI guesses "wrong selector?"
      - With snapshot: AI sees the spinner is showing, button doesn't exist yet
    - Maps directly to Playwright's user-facing locators (`getByRole`, `getByLabel`)
    - Falls back to truncated HTML if accessibility API unavailable

### 6. The "Orchestrator" (Test Runner)
TDAD runs the loop.

*   **"Run Test" Button:** Executes the specific Playwright test for that node.
*   **Test Results:** Captures test outcomes, traces, and golden packet data.
*   **Visual Feedback:** Instantly updates the canvas node color based on the test result.

### 7. "Auto-Pilot" (Lazy Mode) [Closed Beta]

Auto-Pilot (aka "Lazy Mode") automates the repetitive loop of BDD → Test → Fix by orchestrating your CLI agents (Claude, Cursor, etc).

**Status:** This feature is currently in **Beta**. Contributors are welcome to help refine the agent protocol. Check the issues tab to help build the "Agent Interface."

**Note:** You can always run these steps manually for free. Auto-Pilot is a premium convenience feature ("Lazy Mode") for power users who want to ship faster without the copy-pasting.

---

## Technical Architecture

### 1. Smart Scaffolding (Filesystem)
*   **Structure:**
    ```text
    .tdad/
       ├── tdad-fixtures.js           # Auto-generated centralized trace capture
       ├── playwright.config.js        # Test configuration with baseURL projects
       ├── NEXT_TASK.md               # Agent task file (for Auto-Pilot)
       ├── workflows/
       │   ├── root.workflow.json     # Main graph data (Canvas nodes/edges)
       │   └── [folder-name]/
       │       └── [node-name]/
       │           ├── [node-name].feature    # Gherkin spec
       │           ├── [node-name].action.js  # Reusable logic
       │           └── [node-name].test.js    # Playwright test
       ├── debug/
       │   ├── generate-bdd.md        # Last BDD generation prompt
       │   ├── generate-tests.md      # Last test generation prompt
       │   ├── golden-packet.md       # Last fix context
       │   └── [folder]/[node-name]/
       │       ├── screenshots/       # .png files per test
       │       └── trace-files/       # trace-{test-name}.json per test
       ├── coverage/
       │   └── coverage-worker-{N}.json  # Per-worker coverage (merged post-run)
       ├── prompts/                   # Template prompts (7 .md files)
       ├── logs/                      # Execution logs
       └── test-results/              # Playwright test results
    ```

### 2. TDAD Fixtures (Centralized Trace Capture)
*   **Purpose:** Eliminates AI dependency for trace capture. **Auto-generated before each test run** (DO NOT EDIT manually).
*   **Location:** `.tdad/tdad-fixtures.js`
*   **Per-Worker Files:** Uses separate coverage files per worker to avoid race conditions:
    - Each worker writes to `coverage-worker-{index}.json`
    - Files are merged after test run completes
*   **What It Captures Automatically:**
    - API requests/responses (method, URL, status, request/response bodies)
    - Console logs (errors and warnings with source location)
    - Page errors (uncaught exceptions with stack traces)
    - DOM Snapshot (accessibility tree preferred, fallback to HTML)
    - Screenshots on test failure
    - JS Coverage data
*   **Test File Usage:**
    ```javascript
    // Before: 120 lines of trace code per test file (AI-generated, error-prone)
    // After: Simple import, no trace code needed
    const { test, expect } = require('../../tdad-fixtures');

    test('should work', async ({ page }) => {
        // Just write test logic - traces captured automatically
    });
    ```
*   **Benefits:**
    - Zero AI dependency for infrastructure
    - Consistent trace capture across all tests
    - Parallel-safe (merges data from all workers)
    - Simplified test files (~20 lines vs ~120 lines)

### 3. The Prompt Library (The Protocol)
*   **Location:** `.tdad/prompts/` - All prompt templates stored as Markdown files (7 total).
*   **Customizable:** You can edit these templates to match your team's style or tech stack. Changes persist across all nodes (one-time customization).
*   **The "System Rules" Header:** Every prompt begins with a strict "Role & Constraints" block to enforce the TDAD Protocol.
*   **Templates:**
    *   `generate-project-docs.md`: **"Idea Mode"** - Converts Idea -> PRD/Architecture.
    *   `generate-project-scaffold.md`: **"Setup Mode"** - Converts Architecture -> Runnable Init Script.
    *   `generate-blueprint.md`: **"Architect Mode"** - Generates the dependency graph JSON.
    *   `generate-bdd.md`: **"Behavioral Mode"** - Defines specs using ONLY upstream specs as context.
    *   `generate-tests.md`: **"Implementation Mode"** - Implements code using scaffolded files and dependency paths.
    *   `golden-packet.md` (fix-test): **"Surgical Mode"** - Fixes bugs using the "Golden Packet" (Error + Trace).
    *   `agent-system-prompt.md`: **"Agent Mode"** - System prompt for Auto-Pilot agents.

### 4. The Cortex (Dynamic Context Engine)
The Cortex is the brain that feeds the "Golden Packet".

*   **Layer 1: Dynamic (The Trace)**
    *   **Source:** Coverage reports from the test run.
    *   **Value:** Tells the AI *exactly* which files were executed/touched during the failure.
    *   **Output:** A list of file paths and line numbers involved in the error.

---

## Contributing

Contributions are welcome! TDAD is open source and community-driven.

### How to Contribute

1. **Fork the repository** and create a new branch for your feature or bugfix
2. **Follow the coding standards** defined in [CLAUDE.md](CLAUDE.md):
   - Use the Logger from `/src/shared/utils/Logger.ts` (no console.log)
   - All CSS files go in `/src/styles/` directory
   - Search for existing files before creating new ones
   - Respect clean architecture layer boundaries
3. **Test your changes** thoroughly
4. **Submit a Pull Request** with a clear description of your changes

### Areas for Contribution

- Documentation improvements
- Bug fixes and performance optimizations
- Improve trace files for different languages
- Integration with additional AI agents
- UI/UX enhancements for the Canvas

### Development Setup

See the [Installation](#installation) section for manual installation steps. After cloning:

```bash
npm install
npm run compile
# Press F5 to launch Extension Development Host
```

---

## License

TDAD is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for full details.

**Note:** TDAD is Open Core. The interactive workflow (Canvas, Scaffolding, Golden Packet) is **free and open source (MIT)**. The Auto-Pilot automation layer will be a paid feature to support development. Currently, it is in **Closed Beta**.

---

## Community

Join the discussion:

-   **Discord:** [Join the TDAD Server](https://discord.gg/tdad) – Discuss agent workflows and TDD patterns.
-   **Reddit:** [r/TDAD](https://reddit.com/r/TDAD) – Share your workflows and "Golden Packet" saves.
-   **GitHub Discussions:** [RFCs and Feature Requests](https://github.com/[username]/TDAD/discussions).

---

## Support

### Commercial Support

For enterprise support, training, or custom integrations, contact us at [support@tdad.ai](mailto:support@tdad.ai)

---

**Built with ❤️ by the TDAD community**