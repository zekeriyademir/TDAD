# SYSTEM RULES: TDAD PROTOCOL
**CRITICAL:** You are building a **TDAD Dependency Graph**, NOT a standard React app.

## Rules
1. **Node = Single Problem:** Each feature node solves ONE specific problem with ONE clear outcome. NOT generic features.
   - ✅ GOOD: "validate-email", "hash-password", "create-user-record", "send-verification-email"
   - ❌ BAD: "authentication", "user-management", "handle-forms"
2. **JSON Only:** Write `.workflow.json` files ONLY. NO `.js` or `.tsx` files. System auto-generates code from JSON.
3. **DAG Dependencies:** Features connect via Artifacts. Node B needs Node A's data → A is dependency of B. NO circular deps.
4. **Failure Mode:** If you generate `src/components/Button.tsx` → you have FAILED. Only generate `.tdad/workflows/` files.
5. **Granularity Test:** If a node description contains "and" or multiple verbs → split into separate nodes.

---

# Project Blueprint Generator

**CRITICAL:** You are an agent with file operations. **EXECUTE** file creation directly - do NOT just output code blocks.

---

## Input
{{#if mode}}
**Mode:** {{mode}}
{{/if}}

{{#if ideaDescription}}
### Idea Description
{{ideaDescription}}
{{/if}}

{{#if documentationContext}}
### Documentation (Read these files)
{{documentationContext}}
{{/if}}

{{#if refactorContext}}
### Existing Codebase
{{refactorContext}}
{{/if}}

---

## Output Structure

Create a **flexible hierarchy** based on project complexity:

**Simple app (1 level):**
```
.tdad/workflows/
└── root.workflow.json        # Features directly in root
```

**Medium app (2 levels):**
```
.tdad/workflows/
├── root.workflow.json        # Folder nodes
├── auth/
│   └── auth.workflow.json    # Feature nodes
└── profile/
    └── profile.workflow.json
```

**Complex app (3+ levels):**
```
.tdad/workflows/
├── root.workflow.json        # Top-level folders
├── backend/
│   ├── backend.workflow.json # Sub-folders
│   ├── auth/
│   │   └── auth.workflow.json
│   └── api/
│       └── api.workflow.json
└── frontend/
    └── frontend.workflow.json
```

**Rule:** Each `workflow.json` can contain:
- `nodeType: "folder"` → navigates to subfolder
- `nodeType: "feature"` → testable feature (leaf node)

---

## JSON Schemas

### Root File: `.tdad/workflows/root.workflow.json`

Contains folder nodes (or feature nodes for simple apps):

```json
{
  "version": "1.0",
  "nodes": [
    {
      "id": "auth",
      "workflowId": "root",
      "title": "Authentication",
      "description": "User registration and login",
      "nodeType": "folder",
      "folderPath": "auth",
      "position": { "x": 100, "y": 100 },
      "dependencies": []
    }
  ],
  "edges": []
}
```

**Folder Node Fields:**
| Field | Required | Description |
|-------|----------|-------------|
| `id` | ✅ | Unique kebab-case (e.g., `auth`, `profile`) |
| `workflowId` | ✅ | Always `"root"` |
| `title` | ✅ | Display name |
| `description` | ✅ | Brief purpose |
| `nodeType` | ✅ | **Must be `"folder"`** |
| `folderPath` | ✅ | Same as `id` |
| `position` | ✅ | `{x, y}` - grid layout (x: 100, 300, 500...) |
| `dependencies` | ✅ | Always `[]` |

---

### Folder Workflow: `.tdad/workflows/{folder}/{folder}.workflow.json`

Contains **ALL feature nodes** for this folder:

```json
{
  "version": "1.0",
  "nodes": [
    {
      "id": "validate-email",
      "workflowId": "auth",
      "title": "Validate Email",
      "description": "Check email format and uniqueness in database",
      "nodeType": "feature",
      "fileName": "validate-email",
      "position": { "x": 100, "y": 100 },
      "dependencies": [],
      "testLayers": ["api"]
    },
    {
      "id": "hash-password",
      "workflowId": "auth",
      "title": "Hash Password",
      "description": "Hash password using bcrypt with salt",
      "nodeType": "feature",
      "fileName": "hash-password",
      "position": { "x": 300, "y": 100 },
      "dependencies": [],
      "testLayers": ["api"]
    },
    {
      "id": "create-user-record",
      "workflowId": "auth",
      "title": "Create User Record",
      "description": "Insert new user into database with validated data",
      "nodeType": "feature",
      "fileName": "create-user-record",
      "position": { "x": 200, "y": 250 },
      "dependencies": ["validate-email", "hash-password"],
      "testLayers": ["api"]
    },
    {
      "id": "show-login-form",
      "workflowId": "auth",
      "title": "Show Login Form",
      "description": "Render login form with email and password fields",
      "nodeType": "feature",
      "fileName": "show-login-form",
      "position": { "x": 400, "y": 100 },
      "dependencies": [],
      "testLayers": ["ui"]
    }
  ],
  "edges": [
    { "id": "email-to-user", "source": "validate-email", "target": "create-user-record" },
    { "id": "hash-to-user", "source": "hash-password", "target": "create-user-record" }
  ]
}
```

---

## Feature Node Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | ✅ | Unique kebab-case verb-noun (e.g., `validate-email`, `create-user`) |
| `workflowId` | ✅ | Folder name (e.g., `"auth"`) |
| `title` | ✅ | Display name (verb + noun) |
| `description` | ✅ | ONE action, ONE outcome. No "and". Max 10 words. |
| `nodeType` | ✅ | **Must be `"feature"`** |
| `fileName` | ✅ | Same as `id` (for file generation) |
| `position` | ✅ | `{x, y}` - vertical flow (y: 100, 250, 400...) |
| `dependencies` | ✅ | Array of node IDs (can be cross-folder) |
| `testLayers` | ⚪ | Optional. `["ui"]`, `["api"]`, or `["ui", "api"]`. Omit to use global settings. |

**testLayers inference:**
- UI components (render, display, show) → `["ui"]`
- API/DB operations (fetch, create, validate, hash) → `["api"]`
- Full features with both UI and backend → `["ui", "api"]` or omit

---

## Edges

Create edges for **same-folder dependencies only**:

```json
"edges": [
  { "id": "source-target", "source": "source-node-id", "target": "target-node-id" }
]
```

**Cross-folder dependencies**: Just add to `dependencies` array - no edge needed.

---

## Execution Steps

1. **Analyze** input → determine appropriate nesting depth
2. **Create** `.tdad/workflows/root.workflow.json`
3. **For each folder node:**
   - Create directory `.tdad/workflows/{path}/`
   - Create `.tdad/workflows/{path}/{name}.workflow.json`
   - Recursively create subfolders if needed

---

**NOW: Create all files directly. Do NOT explain - just execute.**

---

## Checklist
- [ ] All IDs are verb-noun format (e.g., `validate-email`, `create-user`)
- [ ] Each node solves ONE problem only - no "and" in descriptions
- [ ] Descriptions are max 10 words with single clear outcome
- [ ] `nodeType` = `"folder"` in root, `"feature"` in folder workflows
- [ ] `workflowId` = `"root"` for folders, folder name for features
- [ ] `fileName` exists for all feature nodes
- [ ] Dependencies reference valid node IDs
- [ ] Edges only for same-folder dependencies
- [ ] `testLayers` set appropriately: `["ui"]` for UI, `["api"]` for backend, omit for both
- [ ] Valid JSON (no comments, no trailing commas)
- [ ] NO `.js`/`.tsx` files created - only `.workflow.json`
- [ ] NO generic nodes ("authentication", "user-management" = INVALID)
