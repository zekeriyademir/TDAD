# CLAUDE.md

TDAD (Test-Driven AI Development) - VS Code extension for workflow-based app building with multi-model AI code generation.

## Core Rules

**8 NEVER:**
1- NEVER Create files without searching for existing ones first (use Glob/Grep)
2- NEVER Create README/docs unless explicitly requested
3- NEVER Use console.log (use Logger from /src/shared/utils/Logger.ts)
4- NEVER Put CSS files (.css) in /src/styles/ (CSS ONLY goes in /src/styles/)
5- NEVER Create duplicate code. Check existing code before adding new.
6- NEVER Compile if it is not being asked.
7- NEVER Add fallback if it is not being asked to reduce complexity.
8- NEVER Add documentetation except the ones stated below.

**7 ALWAYS:**
1- ALWAYS Remove and prevent duplicate code
2- ALWAYS Search before creating files
3- ALWAYS Use correct folder (see structure below)
4- ALWAYS Put all CSS files (.css) in /src/styles/ directory
5- ALWAYS Refactor files >1000 lines to ~500 lines
6- ALWAYS Remove old code when refactoring (no backward compatibility)
7- ALWAYS Respect layer boundaries


## Folder Structure

**Clean architecture with layer separation:**

- **/src/core/** - Business logic (ai, nodes, templates, testing, workflows)
- **/src/infrastructure/** - Technical implementations (database, parsing, storage, navigation)
- **/src/presentation/webview/** - React UI components (.tsx files, handlers, hooks, utils)
  - /styles/ - TypeScript style objects ONLY (NOT .css files)
- **/src/vscode-integration/** - VSCode APIs (bootstrap, controllers, providers)
- **/src/shared/** - Cross-layer code (config, types, utils)
- **/src/styles/** - All CSS files (.css) go here ✅
- **/src/extension.ts** - Entry point

## Layer Boundaries
- Core NEVER imports from infrastructure/presentation/vscode-integration
- Infrastructure MAY import from core
- Presentation MAY import from core and infrastructure
- Shared imported by all layers
- VSCode integration coordinates all layers

# Planning and documentation
 - Use Implementation_plan_and_status.md file to follow up where we are. Just add usefull information conciesly.
 - Project specifications are explained in MVP.md make sure to follow MVP strictly
