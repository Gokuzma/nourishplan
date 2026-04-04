# Code Style Rules

## Clarity Over Cleverness

- Write code that is easy to read on first pass.
- Prefer explicit logic over implicit or "magic" patterns.
- If a block of code needs a comment to explain what it does, consider rewriting it to be self-explanatory.

## Consistent Naming

- Match the naming conventions already used in the codebase.
- Use descriptive names — avoid single-letter variables outside of short loops.
- Be consistent with casing (camelCase, snake_case, etc.) within each language.

## Minimal Changes

- Only change what is necessary to accomplish the task.
- Do not reformat, rename, or reorganize code that is not related to the current task.
- Keep diffs small and focused so they are easy to review.

## Avoid Premature Abstraction

- Do not create helpers, utilities, or abstractions for one-time operations.
- Three similar lines of code is better than a premature abstraction.
- Only extract shared code when it is used in three or more places.
