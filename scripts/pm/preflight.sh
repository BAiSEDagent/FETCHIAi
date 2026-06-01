#!/usr/bin/env bash
set -euo pipefail

# Read-only git: never take optional index/ref locks. Harmless in CI; required
# in sandboxes that forbid writes under .git for status/diff.
export GIT_OPTIONAL_LOCKS=0

# Repo Control — preflight gate (read-only).
#
# Reports branch / HEAD / upstream / status / ahead-behind / staged state plus
# untracked prompt, screenshot, memory, zip, and log artifacts. Exits non-zero
# with a clear STOP message on any drift condition; exits 0 only on a clean
# baseline.
#
# Artifact detection is filesystem-based (glob + "is it tracked?") on purpose:
# .gitignore hides these patterns from `git` so they never get committed, but
# preflight must still notice the drift on disk. Already-tracked files (e.g.
# historical attached_assets, zipFile.zip) are NOT flagged.

stop() {
  echo ""
  echo "STOP: $*" >&2
  echo "Do not clean, reset, pull, merge, rebase, or push without PM approval." >&2
  exit 1
}

is_tracked() { git ls-files --error-unmatch -- "$1" >/dev/null 2>&1; }

# Echo untracked (not committed) files among the candidate paths/globs.
collect_untracked() {
  local f
  for f in "$@"; do
    [ -e "$f" ] || continue
    if ! is_tracked "$f"; then
      printf '%s\n' "$f"
    fi
  done
  return 0
}

echo "=== Repo Control preflight ==="

# --- Fetch (best-effort) ---
# Set PREFLIGHT_SKIP_FETCH=1 in restricted environments that block `git fetch`
# (e.g. sandboxes that forbid writes under .git). CI should leave it unset.
echo "--- git fetch origin ---"
if [ "${PREFLIGHT_SKIP_FETCH:-0}" = "1" ]; then
  echo "WARNING: PREFLIGHT_SKIP_FETCH=1 — ahead/behind is compared against LAST-KNOWN"
  echo "         origin refs only. This is NOT an authoritative remote check."
elif git fetch origin >/dev/null 2>&1; then
  echo "fetched origin"
else
  stop "git fetch origin failed and PREFLIGHT_SKIP_FETCH is not set; cannot verify against authoritative upstream. Re-run with PREFLIGHT_SKIP_FETCH=1 only if you accept last-known refs."
fi

# --- Branch / HEAD ---
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
HEAD_SHA="$(git rev-parse --short HEAD)"
echo "--- branch ---"
echo "${BRANCH}"
echo "--- HEAD ---"
echo "${HEAD_SHA}"

# --- Upstream must exist ---
echo "--- upstream ---"
if ! UPSTREAM="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null)"; then
  stop "no upstream tracking branch configured for '${BRANCH}'."
fi
UPSTREAM_SHA="$(git rev-parse --short '@{u}')"
echo "${UPSTREAM} (${UPSTREAM_SHA})"

# --- Status ---
echo "--- git status -sb ---"
git status -sb

# --- Ahead / behind ---
AHEAD="$(git rev-list --count '@{u}..HEAD')"
BEHIND="$(git rev-list --count 'HEAD..@{u}')"
echo "--- local commits ahead of upstream (${AHEAD}) ---"
git log --oneline '@{u}..HEAD' || true
echo "--- commits behind upstream: ${BEHIND} ---"

# --- Changed (unstaged) files ---
echo "--- changed (unstaged) files ---"
git diff --name-status

# --- Staged files ---
echo "--- staged files ---"
git diff --cached --name-status

# --- Untracked artifact scans (filesystem-based) ---
shopt -s nullglob
PROMPT_ARTIFACTS="$(collect_untracked attached_assets/Pasted-*)"
SCREENSHOT_ARTIFACTS="$(collect_untracked attached_assets/Screenshot_*)"
TARGETED_ARTIFACTS="$(collect_untracked attached_assets/targeted_element_*)"
MEMORY_ARTIFACTS="$(collect_untracked .agents/memory/*)"
ZIP_ARTIFACTS="$(collect_untracked zipFile.zip ./*.zip)"
LOG_ARTIFACTS="$(collect_untracked ./*.log)"
shopt -u nullglob

echo "--- untracked attached_assets prompt/screenshot artifacts ---"
printf '%s\n' "${PROMPT_ARTIFACTS}" "${SCREENSHOT_ARTIFACTS}" "${TARGETED_ARTIFACTS}" | grep -v '^$' || echo "(none)"
echo "--- untracked .agents/memory artifacts ---"
printf '%s\n' "${MEMORY_ARTIFACTS}" | grep -v '^$' || echo "(none)"
echo "--- untracked zip/log artifacts ---"
printf '%s\n' "${ZIP_ARTIFACTS}" "${LOG_ARTIFACTS}" | grep -v '^$' || echo "(none)"

# --- STOP conditions ---
[ "${AHEAD}" = "0" ] || stop "branch is ahead of upstream by ${AHEAD} commit(s). No agent may decide an extra local commit is harmless."
[ "${BEHIND}" = "0" ] || stop "branch is behind upstream by ${BEHIND} commit(s)."
[ -z "$(git diff --name-only)" ] || stop "working tree has unstaged changes."
[ -z "$(git diff --cached --name-only)" ] || stop "staged changes exist."
[ -z "${PROMPT_ARTIFACTS}" ] || stop "untracked attached_assets/Pasted-* prompt artifact(s) present."
[ -z "${SCREENSHOT_ARTIFACTS}" ] || stop "untracked attached_assets/Screenshot_* artifact(s) present."
[ -z "${TARGETED_ARTIFACTS}" ] || stop "untracked attached_assets/targeted_element_* artifact(s) present."
[ -z "${MEMORY_ARTIFACTS}" ] || stop "untracked .agents/memory artifact(s) present."
[ -z "${ZIP_ARTIFACTS}" ] || stop "untracked zip artifact(s) present."
[ -z "${LOG_ARTIFACTS}" ] || stop "untracked log artifact(s) present."

echo ""
echo "OK: clean baseline. Branch ${BRANCH} @ ${HEAD_SHA} matches upstream ${UPSTREAM_SHA}."
exit 0
