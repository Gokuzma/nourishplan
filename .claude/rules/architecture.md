# Architecture Rules

## Understand Before Changing

- Read the project's folder layout before proposing structural changes.
- Identify key modules, entry points, and how components connect.
- Check CLAUDE.md for documented architecture notes.

## Respect Existing Structure

- Follow the established directory organization.
- Place new files in the appropriate existing directories.
- Do not create new top-level directories without discussion.

## Avoid Unplanned Refactors

- Do not reorganize code structure as a side effect of other work.
- Large refactors require a plan — use GSD workflow to break them into phases.
- When a refactor is needed, document the reasoning in docs/decisions/ first.

## Identify Dependencies

- Before modifying a module, understand what depends on it.
- Check imports and references to gauge the blast radius of changes.
- Prefer changes with a small, well-understood impact.
