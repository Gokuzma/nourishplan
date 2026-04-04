---
name: add-feature-task
description: Guide implementation of a new feature with planning, task breakdown, and incremental delivery.
---

# Add Feature Task

Use this skill when adding a new feature to the project.

## Steps

### 1. Inspect Repository Structure

- Read CLAUDE.md for project context and conventions.
- Review the directory layout to understand where code lives.
- Identify relevant existing modules and patterns.

### 2. Identify Relevant Modules

- Determine which files and directories the feature will touch.
- Check for existing patterns that the new feature should follow.
- Note any risky areas documented in CLAUDE.md.

### 3. Draft a Feature Plan

Produce a brief plan covering:
- **Goal**: What the feature does in one sentence.
- **Affected files**: Which files will be created or modified.
- **Approach**: How the feature will be implemented.
- **Risks**: Anything that could go wrong or needs careful handling.

Present the plan to the user for approval before proceeding.

### 4. Create Tasks

Break the feature into small, independently verifiable tasks.
Write each task as a file under `gsd/tasks/` with:
- Task description
- Acceptance criteria
- Files involved

### 5. Implement Incrementally

- Work through tasks one at a time.
- Make one logical change per step.
- Verify each step works before moving to the next.
- Commit after each completed task.

### 6. Verify Changes

- Run the project's test suite if one exists.
- Manually verify the feature works as expected.
- Check that no existing functionality was broken.
- Confirm all tasks from step 4 are complete.

## Output

When finished, provide:
- **Plan summary**: What was built and why.
- **Task breakdown**: List of tasks completed.
- **Verification steps**: What was tested and how.
