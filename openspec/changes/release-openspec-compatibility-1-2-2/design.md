# Design

## Context

See `proposal.md` for scope and related GitHub work.

PR #3 is open and mergeable at `c32a6b5`. Remote `main` is at `95aab6f`. The current worktree
contains the PR head. The main checkout is clean on `dev`, which adds only release-setup commit
`b01c67e` to `main`. The unfinished product changes are saved separately on `v2`. Recheck these
facts before implementation; branch names are not fixed commit identities.

The installed OpenSpec CLI is 2.1.0. PR #3 reports tests against 1.13.1 and 2.1.0. Its changes are
in tests, tooling, config and planning documents, not runtime source.

The SDK's `README.md` explains Git-based updates. OpenChamber uses the published package version and
committed bundles. This package is private and has no npm publication step.

## Goals / Non-Goals

**Goals:** Keep integration and release preparation on `dev` until the checks pass. Make the tested
merge, maintainer follow-up, published tag and installed version traceable. Keep contribution
history separate from maintainer fixes.

**Non-Goals:** Add a browser matrix, upgrade the SDK, add a CLI-version gate, rewrite contributed
planning history, or change the planning-storage model as part of this patch release.

## Decisions

### Merge into dev and test before adding maintainer fixes

Use the `dev` branch with a clean working tree; keep the saved `v2` work intact. Check the PR head
against the reviewed SHA, then merge that commit into `dev` while preserving Daniel's original
commit. Resolve integration conflicts without adding the planned maintainer fixes. Leave `main`
unchanged.

Run `npm run check` with OpenSpec 2.1.0 on the merged `dev` result before starting the follow-up
changes. Record the merge SHA, CLI version, command, result and any generated bundle changes. Stop
on failure and resolve the failure on `dev` before proceeding. A check on the unmerged PR head does
not replace this check.

Editing the contributor's branch or squashing their work is unnecessary. The PR commit will reach
`main` through the completed `dev` release. Check GitHub's PR status after publication rather than
merging PR #3 directly into `main` as an early step.

### Use one existing integration seam for task text

In `test/integration.test.mjs`, the existing service runner records calls and invokes the real CLI.
Record the successful `instructions apply` task records from those same calls. Compare the rendered
`.task-title` text exactly with the matching CLI description, both on first open and after the
source edit and explicit Refresh. Check that the task appears once and retain the completion-state
assertions. Use `.task-row` selectors consistently.

This adds no CLI process, test file, helper or runtime parser. The existing test loop already covers
local and shared planning. A prefix-only assertion is simpler but cannot catch lost, duplicated or
stale continuation text, so use the actual CLI record as the expected value. Keep the separate
service tests' version-neutral checks.

OpenSpec 2.x includes continuation text that some 1.x releases omit. That upstream change is the
reason for the version-neutral oracle. `src/service/openspec.ts` already decodes the CLI records,
and `src/panel/tasks-view.ts` already assigns `task.description` to the label. The delta spec
corrects the conflicting first-line-only promise, not the safety rules.

### Fix the ignore rule without changing shared planning

Change the root ignore rule to `/node_modules`. Verify it with Git's ignore diagnostics for both a
directory and a directory symlink in disposable checkouts. No test harness is needed.

Retain PR #3's `SHARED_PATHS` containing only `node_modules`. This repository tracks its OpenSpec
files, so restoring the planning link would trigger the setup script's tracked-path guard. Keeping
contributor planning in Git and automatically linking the same tracked folder require a separate
storage decision.

### Reuse the prepared release process

Use release-setup commit `b01c67e`, already on `dev`. Verify its hooks and release-note
configuration remain present after the merge; no import from another branch is needed. Keep PR #3's
accurate worktree guidance alongside the release section: planning files are tracked here. The
release setup's inherited claim that they are untracked is not correct.

After the merged baseline passes, make the follow-up changes on `dev` and run the full check again
before their commit. Use an isolated OpenSpec 1.13.1 installation for focused existing service and
integration tests, without replacing the user's global CLI or shared dependencies. Report the exact
tested versions and identify the working-tree changes covered by each result.

Any further code or configuration edit, or merge that changes the tested contents, requires another
check on `dev`. Fix failures there. Promote only the verified release to `main`, not an earlier
baseline or an untested merge result.

For versioning, use the prepared npm lifecycle hooks and `npm version patch` from a clean `dev`
checkout at version 1.2.1. This creates the 1.2.2 commit and annotated tag, updates the lockfile and
stages rebuilt bundles. Its `preversion` hook runs the check again. Keep that native safety check;
do not bypass hooks merely to limit the total number of test runs.

### Publish source, then the Release, then update the installed extension

Preview short release highlights in chat for approval. Credit Daniel, describe the maintenance
fixes, link roadmap #5 and identify Windows issue #1 as separate work. Use `.github/release.yml` and
PR labels for generated notes. With no GitHub Releases present, start generated notes at `v1.2.0`;
do not backfill older Releases.

Once all checks pass and the required approvals are given, merge the completed `dev` release into
`main`. Prefer a fast-forward so the tested release commit and tagged commit stay identical. If
remote `main` has advanced, integrate it into `dev` and repeat the checks before promotion. Resolve
any effect on a prepared tag with the user rather than silently moving that tag.

Atomically push `main` and the specific `v1.2.2` tag. Publish the prepared `dev` branch with
approval as well. Verify the release commit is on both branches, and confirm GitHub recognises PR #3
as merged once its original commit reaches the default branch. If it does not, report the state
rather than use a second early merge into `main`.

Create the GitHub Release using the existing `AGENTS.md` procedure. Confirm the remote commit, tag
and Release agree.

For deployment, confirm the intended OpenChamber host and installed extension source first. For the
documented Git install, use Settings > Extensions to update to 1.2.2, then disable and enable the
extension so its service restarts. Confirm the shown version and Enabled state. A folder install
instead needs the approved release checkout; do not treat a folder preview as proof that the
published Git update works. No automatic rollout to other users is implied.

## Risks / Trade-offs

- A changed PR head requires review before merging into `dev`. A later integration or edit that
  changes the tested contents requires another check on `dev` before promotion to `main`.
- Build commands rewrite tracked bundles. Inspect diffs and commit only intended release files; do
  not discard unrelated changes.
- The full suite imports Chromium directly. The config asks for three-browser checks, but this
  runner cannot provide them unchanged. Report Chromium evidence accurately and resolve any
  additional browser gate with the user before publishing; do not silently add test machinery.
- Issue #2's original decoder diagnosis was corrected in its discussion. Report verified
  compatibility rather than claim a reproduced runtime decoder bug was fixed.
- Issue #1 remains unverified on Windows. Leave it and roadmap #5 open. Keep issue #2 open for
  reporter confirmation if no reported board failure has been reproduced.

## Migration Plan

There is no data migration or permission change. Merge the contribution into `dev`, test that merged
baseline, apply the maintainer follow-up, then test and commit it. Prepare the version on `dev`,
promote the verified release to `main`, and publish through the native process. Synchronise the
delta spec before the release commit so published planning matches task behaviour. Keep the release
checklist available until deployment is verified, then archive it separately.

Before updating the installed extension, record its current source and version. If the update fails,
stop and report the failure. Restore the previous known-good installation with approval; leave
published release tags intact and correct published defects with a follow-up version.
