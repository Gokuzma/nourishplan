#!/bin/bash
# SessionStart hook: auto-inject lessons.md into the session context so
# every session starts with every learned rule loaded — no reliance on
# Claude remembering to Read the file.
#
# Outputs hookSpecificOutput.additionalContext with the full lessons.md
# contents wrapped in a short header. Exits silently if lessons.md is
# missing (e.g., fresh repo before migration).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LESSONS_FILE="$PROJECT_ROOT/lessons.md"

if [ ! -f "$LESSONS_FILE" ]; then
  exit 0
fi

LESSONS_CONTENT=$(cat "$LESSONS_FILE")

LESSONS_CONTENT="$LESSONS_CONTENT" node -e '
const content = process.env.LESSONS_CONTENT || "";
const header = "LESSONS LEARNED (auto-loaded from lessons.md at session start — every Rule below is a hard constraint, apply them all before writing code):\n\n";
const output = {
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: header + content
  }
};
process.stdout.write(JSON.stringify(output));
'
echo
