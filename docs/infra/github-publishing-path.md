# GitHub Publishing Path

Status: CP-INFRA operating decision.

## 1. Purpose

This document defines Fetchi's official checkpoint publishing path after the
CP15 and CP-CG1 publishing runs exposed sandbox and connector friction.

Publishing mechanics must not become product work. A checkpoint is not done
because local proof passed, a draft PR exists, or a merge completed. A checkpoint
is done only after:

- `main` is merged.
- `main` is validated after merge.
- Remote branch cleanup is complete.
- The next checkpoint can start from a clean synced `main`.

## 2. Roles

- Codex owns local implementation/proof and publishes draft PRs only after Adam
  approves publishing.
- PM/Adam owns scope approval, publish approval, merge approval, exceptions, and
  any cleanup approval.
- Replit owns final post-merge proof on `main`, including build, route count,
  branch cleanup verification, and final clean-state confirmation.
- GitHub is the source of truth for PR diff, branch, review, merge, and main
  state.

## 3. Required Checkpoint Phases

Every checkpoint follows these phases:

1. Start from synced `main`.
2. Implement and prove locally inside the approved scope.
3. Create the local branch/commit shape needed for reviewable proof.
4. Publish a draft PR only after explicit publish approval.
5. Review the PR diff and validation.
6. Merge only after explicit merge approval.
7. Run Replit final proof on `main`.
8. Clean up the remote branch after final proof.
9. Start the next checkpoint only after cleanup is confirmed.

## 4. Sync Rules

Use the standard sync preflight before checkpoint work:

```bash
git fetch origin
git status -sb
git pull --ff-only origin main
git status -sb
```

Never blind pull or push. Before advising any pull, push, publish, or merge,
identify:

- Current branch.
- Local HEAD.
- Upstream or target HEAD.
- Changed files.
- Whether the worktree is dirty, ahead, behind, or diverged.

If branches diverge, stop and report. Do not rebase, merge, reset, force-push,
or delete anything without explicit approval.

## 5. Local Proof Packet

Every checkpoint should report:

```bash
git status -sb
git branch --show-current
git rev-parse --short HEAD
git log --oneline main..HEAD
git diff --name-status main..HEAD
git diff --stat main..HEAD
<checkpoint-specific smoke command, if any>
npm run type-check
rm -rf .next && npm run build
```

Also report:

- Route count when build emits routes.
- Changed files.
- Protected files touched: yes/no.
- Package files changed: yes/no.
- provider/db/app/routes/UI touched: yes/no.
- runtime/provider/export/CRM/outreach implementation created: yes/no.

## 6. Publishing Path Decision

Use these paths in order.

### Path A - Normal Authenticated Git Push

Path A is allowed only if a pre-approved repo-scoped credential already exists
in the environment.

Rules:

- Do not configure credentials mid-checkpoint.
- Do not paste tokens into chat.
- Do not install `gh` mid-checkpoint.

Flow:

```txt
local branch/commit -> git push -> draft PR
```

### Path B - GitHub Connector Git-Data Single-Commit Publishing

Path B is the preferred fallback when shell `git push` is unavailable,
blocked, or unsafe.

Use GitHub connector git-data operations:

```txt
create blobs -> create tree from approved main -> create commit -> create/update ref -> verify blobs -> draft PR
```

Rules:

- Recreate the approved local file contents exactly.
- Remote SHA may differ from local SHA.
- Publish as one connector-created commit when possible.
- Verify local blob SHA equals remote blob SHA for every changed file.
- Open the draft PR only after all changed-file blob SHAs match.

### Path C - Contents API Per-File Fallback

Path C is disfavored and exception-only.

Rules:

- Requires explicit Adam approval before use.
- Multiple per-file commits are acceptable only as publishing mechanics.
- Verify local blob SHA equals remote blob SHA for every changed file.
- Stop on any mismatch.
- Do not open a PR if any mismatch exists.
- Do not attempt fixes without approval.
- Use only when Path A and Path B are unavailable or unsafe.

## 7. Hard Stops

Stop and report when any of these apply:

- Prompt is vague about scope, publish, or PR permission.
- Merge approval has not been explicitly given.
- Branches are stale or divergent.
- A force-push, rebase, reset, or branch recreation would be needed.
- Credential setup would be required.
- `gh` would need to be installed.
- Large file content would come from terminal-truncated output.
- Publishing would require rewriting product files.
- Protected files are outside scope.
- Repo cleanup is getting mixed with product implementation.
- The next checkpoint is starting before final proof and branch cleanup.

Do not push, open PRs, merge, force-push, configure credentials, install `gh`,
touch protected files, or start the next checkpoint unless the relevant approval
has been given.

## 8. Blob-SHA Verification Standard

Before connector publishing, collect local blob SHAs:

```bash
git ls-tree HEAD -- <files>
```

After connector publishing, verify remote blob SHAs for the same files. A PR may
open only if every local blob SHA exactly matches the corresponding remote blob
SHA.

If any blob SHA mismatches:

- Stop.
- Report the mismatch.
- Do not open a PR.
- Do not attempt a fix without approval.

## 9. Draft PR Requirements

Every draft PR body must include:

- Summary.
- Validation.
- Changed files.
- Protected files touched: yes/no.
- Package files changed: yes/no.
- provider/db/app/routes/UI touched: yes/no.
- runtime/provider/export/CRM/outreach implementation created: yes/no.
- Publishing note if remote SHA differs or a connector fallback was used.

## 10. Merge Requirements

Merge requires explicit PM/Adam approval.

If GitHub requires a draft PR to be marked ready before merge, that
metadata-only transition is allowed only after merge approval.

After merge, report:

- Merge commit SHA.
- Main head SHA.
- PR merged: yes/no.
- Remote branch exists: yes/no.
- Confirmation that no commits or file changes were added before merge.

## 11. Replit Final Proof

Replit final proof runs on `main` after merge:

```bash
git fetch origin
git status -sb
git branch --show-current
git pull --ff-only origin main
git status -sb
git rev-parse --short HEAD
git log --oneline -8
git diff --name-status origin/main..HEAD
<checkpoint smoke command, if any>
npm run type-check
rm -rf .next && npm run build
```

Also report:

- Route count.
- Protected files touched: yes/no.
- Package files changed: yes/no.
- provider/db/app/routes/UI touched: yes/no.
- runtime/provider/export/CRM/outreach implementation created: yes/no.
- Local and remote checkpoint branch existence.

## 12. Branch Cleanup

Delete the remote checkpoint branch only after final proof passes.

Preferred cleanup:

```bash
git push origin --delete <branch>
```

GitHub API deletion fallback is allowed when sandbox restrictions block shell
`git push`.

Verify cleanup with:

```bash
git fetch -p
git ls-remote --heads origin <branch>
```

Confirm `main` remains clean after cleanup.

## 13. Non-Goals

- No GitHub Actions changes.
- No credential setup.
- No code or runtime implementation.
- No package changes.
- No automation.
- No source architecture change.
