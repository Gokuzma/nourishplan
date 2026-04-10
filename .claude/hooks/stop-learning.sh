#!/bin/bash
# Stop hook: force recursive learning update once per session.
# Blocks the first Stop event of a session so Claude is prompted to review
# the session and append any new learnings to lessons.md (L-code format).
# Subsequent stops in the same session pass through without interruption.
# Per-session flag files live in .claude/.stop-hook-state/ (gitignored).

set -euo pipefail

INPUT=$(cat)
SESSION_ID=$(printf '%s' "$INPUT" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{process.stdout.write(String(JSON.parse(d).session_id||""))}catch{}})')

if [ -z "$SESSION_ID" ]; then
  exit 0
fi

# Resolve project root from script location (.claude/hooks/*.sh -> root).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
STATE_DIR="$PROJECT_ROOT/.claude/.stop-hook-state"
FLAG="$STATE_DIR/$SESSION_ID"

mkdir -p "$STATE_DIR"

# Drop flag files older than 7 days so state does not accumulate forever.
find "$STATE_DIR" -type f -mtime +7 -delete 2>/dev/null || true

if [ -f "$FLAG" ]; then
  exit 0
fi

touch "$FLAG"

REASON='RECURSIVE LEARNING CHECKPOINT — before stopping, capture any non-obvious learnings from this session into lessons.md:

1. Did any bugs, unexpected failures, incorrect assumptions, merge issues, or environmental gotchas occur that could recur in a future session? Triage honestly — one-off user errors and trivial typos do NOT count.

2. For each qualifying learning, append a new entry to lessons.md at the repo root. Find the next available L-code by scanning the existing L-xxx numbers, then use this exact format:

   ### L-xxx: Short descriptive title
   **Bug:** What went wrong in concrete terms
   **Root cause:** Why it happened (not just the symptom)
   **Rule:** The permanent rule or check that prevents recurrence
   **Applies to:** Files, patterns, commands, or workflow situations

3. Do NOT add lessons inline to CLAUDE.md. CLAUDE.md is for architecture and process only — all learnings live in lessons.md. If you believe a lesson is so critical it must be promoted to CLAUDE.md, stop and ask the user first.

4. Verify CLAUDE.md is still under 200 lines with: wc -l CLAUDE.md. If it is over 200, something has drifted — investigate and consolidate before stopping.

5. If no learnings apply to this session, state that explicitly in one line and stop.

This hook fires once per session. Perform the protocol above, then stop normally — the next stop will proceed without interruption.'

REASON="$REASON" node -e 'process.stdout.write(JSON.stringify({decision:"block",reason:process.env.REASON}))'
echo
