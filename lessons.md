# Lessons Learned

### L-001: Worktree agents created from stale branch base
**Bug:** Worktree executor agents were based on `main` (or an older commit) instead of the current HEAD, causing them to delete files from prior phases (phase 19 DnD code, planning artifacts) when their changes were merged back.
**Root cause:** On Windows, `EnterWorktree` / `isolation="worktree"` sometimes creates branches from `main` instead of the current feature branch HEAD. The worktree_branch_check step in the executor prompt was insufficient to catch this when the agent's base was far behind.
**Rule:** After merging any worktree branch, immediately diff against the pre-merge HEAD to check for unexpected deletions. Restore any incorrectly deleted files with `git checkout <pre-merge-sha> -- <files>` before proceeding. Always verify file count after worktree merges.
**Applies to:** All GSD parallel execution with worktrees on Windows.

### L-002: Worktree agents delete unrelated planning artifacts
**Bug:** Worktree agents deleted PLAN.md, CONTEXT.md, RESEARCH.md, and other planning files from the phase directory, plus artifacts from prior completed phases.
**Root cause:** Same stale-base issue as L-001. The agent's branch didn't have these files, so merging effectively deleted them.
**Rule:** After worktree merges, always check that `.planning/phases/` directories still contain all expected files. Restore from the pre-merge commit if needed.
**Applies to:** `.planning/phases/` directory contents after any worktree merge.

### L-003: useMemo imported from wrong package
**Bug:** `usePlanViolations.ts` imported `useMemo` from `@tanstack/react-query` instead of `react`, causing a build failure (`MISSING_EXPORT` error).
**Root cause:** Agent code generation mixed up the import source — `useQuery` comes from `@tanstack/react-query` but `useMemo` is a React hook.
**Rule:** React hooks (`useState`, `useMemo`, `useCallback`, `useEffect`, etc.) must always be imported from `'react'`. TanStack Query exports only query-specific hooks (`useQuery`, `useMutation`, `useQueryClient`, etc.).
**Applies to:** All hook files that use both React and TanStack Query.

### L-004: Prompt to push DB migrations after execution
**Bug:** Migration 024 was committed but not pushed to Supabase production during execution because the worktree agent lacked `SUPABASE_ACCESS_TOKEN`.
**Root cause:** Worktree environments don't inherit `.env.local` variables. The token wasn't available.
**Rule:** After any phase that creates a new migration file, ask the user if they want to push the migration to production. Don't rely on the executor agent to do it, and don't push without asking.
**Applies to:** Any phase with files in `supabase/migrations/`.
