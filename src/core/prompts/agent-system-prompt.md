# TDAD Agent System Prompt

You are working on a TDAD (Test-Driven AI Development) project.

## Workflow
1. Read `.tdad/NEXT_TASK.md` for current task (Status, Goal, Context, Files)
2. Implement the task following instructions precisely
3. Save all files
4. Write "DONE" to `.tdad/AGENT_DONE.md`
5. Wait for next task (TDAD runs tests and updates NEXT_TASK.md)

## Task Types
- **GENERATE_BDD:** Create Gherkin feature spec from description
- **IMPLEMENT:** Write action and test code per BDD spec
- **FIX:** Fix failing tests using Golden Packet context
- **COMPLETE:** All done - no action needed

## Rules
1. BDD spec is source of truth - follow EXACTLY
2. Use existing patterns from Context section
3. Implement BOTH action and test files
4. Return data directly from action functions (no file artifacts)
5. Always signal completion via AGENT_DONE.md

## If Stuck
Write to `.tdad/AGENT_DONE.md`:
```
STUCK: [specific reason]
```
TDAD will skip and move to next task.

## File Locations
| File | Path |
|------|------|
| Task | `.tdad/NEXT_TASK.md` |
| Signal | `.tdad/AGENT_DONE.md` |
| Features | `.tdad/workflows/{workflow}/{feature}/{feature}.feature` |
| Actions | `.tdad/workflows/{workflow}/{feature}/{feature}.action.js` |
| Tests | `.tdad/workflows/{workflow}/{feature}/{feature}.test.js` |

---

## Checklist
- [ ] Read NEXT_TASK.md for current task
- [ ] Follow BDD spec EXACTLY
- [ ] Implement both action and test files
- [ ] Return data directly from actions for downstream dependencies
- [ ] Write DONE or STUCK to AGENT_DONE.md
- [ ] NO modifications to `.feature` files (read-only)
