#!/usr/bin/env bash
set -euo pipefail

# Read-only git status/diff must not take optional locks (sandbox-safe; a no-op
# difference in CI).
export GIT_OPTIONAL_LOCKS=0

# Repo Control — proof packet generator.
# Prints branch/HEAD/status, runs type-check and a clean build, re-prints
# status, lists changed files, and exits non-zero if type-check or build fail.
# Does not mutate git state other than removing .next for build verification.

echo "=== Repo Control proof ==="

echo "--- branch ---"
git rev-parse --abbrev-ref HEAD
echo "--- HEAD ---"
git rev-parse --short HEAD

echo "--- git status -sb (before) ---"
git status -sb

echo "--- npm run type-check ---"
npm run type-check

echo "--- rm -rf .next ---"
rm -rf .next

echo "--- npm run build ---"
npm run build

echo "--- git status -sb (after) ---"
git status -sb

echo "--- changed files ---"
git diff --name-status
echo "--- staged files ---"
git diff --cached --name-status

echo ""
echo "OK: type-check and build passed."
exit 0
