# Tasks

## 1. Merge into dev and test the merged baseline

- [x] 1.1 Refresh the GitHub state of PR #3 and the remote branch SHAs. Use `dev` with a clean
      working tree and preserve the saved `v2` work. Verify the PR head is the reviewed `c32a6b5`,
      or review new commits before proceeding. Confirm the existing release setup is on `dev`.
- [x] 1.2 Obtain merge approval and merge the reviewed PR #3 head into `dev`, preserving Daniel's
      original commit. Resolve integration conflicts without applying the planned follow-up fixes.
      Verify `dev` contains the PR commit and that `main` is unchanged.
- [x] 1.3 With locked dependencies and OpenSpec 2.1.0, run `npm run check` on the merged `dev`
      result before applying any maintainer fixes. Record the merge SHA, versions, result and
      generated bundle diffs. Stop on failure, resolve it on `dev` and rerun the check before
      proceeding. An earlier check of the PR head does not satisfy this task.

## 2. Make the maintainer follow-up

Begin this group only after the merged baseline in task 1.3 passes. Make all changes on `dev`.

- [x] 2.1 Change `.gitignore` to ignore `/node_modules`. At the Git ignore seam, confirm the old
      rule misses a root directory symlink, then verify the new rule ignores both the directory and
      symlink forms in disposable checkouts. Preserve the setup script's tracked-path safeguards.
- [x] 2.2 Extend the existing local/shared tests in `test/integration.test.mjs` to compare initial
      and refreshed `.task-title` text with the corresponding real CLI task description, using the
      existing injected runner to retain results. Assert one row per task and retain completion
      checks. Confirm a temporary task-text regression makes the new assertions fail under OpenSpec
      2.1.0, restore that temporary edit, rebuild, and run `node --test test/integration.test.mjs`
      to green. Add no test file, helper or extra CLI call.
- [x] 2.3 Synchronise this change's `shared-planning` delta into the main spec. Verify the
      first-line promise is removed while all original containment scenarios remain, and run
      `openspec validate release-openspec-compatibility-1-2-2 --strict`.

## 3. Test and commit the completed dev changes

- [x] 3.1 Verify the release setup from `b01c67e` remains on `dev` after the merge: check the npm
      version hooks and `.github/release.yml`. Keep the accurate tracked-planning worktree guidance
      from PR #3 beside the release instructions. Import no `v2` changes.
- [x] 3.2 Run `npm run check` on `dev` with OpenSpec 2.1.0 after all follow-up edits. Run the
      existing service and integration tests with an isolated OpenSpec 1.13.1 installation, leaving
      the global CLI and shared dependencies unchanged. Record commands, versions, tested
      working-tree changes and results. Fix failures on `dev`; any later edit or merge that changes
      the tested contents requires another check before promotion. Resolve the config's
      three-browser gate with the user before publication: the existing suite uses Chromium only,
      and this change does not authorise a new browser harness.
- [ ] 3.3 Commit the verified maintainer follow-up and planning files on `dev`, separately from
      Daniel's contribution. Verify `dev` is clean, includes both generated bundles and excludes PR
      #4, `v2` source changes, the Windows CLI fix and an automatic `openspec/` symlink. Confirm
      `main` is still unchanged.

## 4. Prepare version 1.2.2

- [ ] 4.1 Present rough release highlights in chat for approval. Credit Daniel, summarise PR #3 and
      the follow-up, link roadmap #5 and leave the Windows issue clearly separate. Check that no
      notes claim an unverified runtime decoder fix or untested platform support. Prepare approved
      highlights outside the checkout and label PR #3 as `bug` for generated notes.
- [ ] 4.2 Obtain tag approval, confirm clean `dev` is still at package version 1.2.1, and run
      `npm version patch` there with hooks enabled. Verify the hooks pass, the package and lockfile
      report 1.2.2, both bundles are included as needed, and annotated tag `v1.2.2` points to the
      version commit on `dev`. The native `preversion` check is an additional safety run, not a
      substitute for the post-merge and post-follow-up checks.

## 5. Merge the ready release into main and publish

- [ ] 5.1 Confirm all release checks passed on `dev`, then obtain approval to merge into `main` and
      push. Confirm the release descends from current remote `main` and fast-forward `main` to the
      tested `dev` release commit. If `main` advanced, integrate it into `dev` and repeat the checks
      before promotion; ask about any effect on the prepared tag rather than move it silently.
      Atomically push `dev`, `main` and the specific `v1.2.2` tag. Verify both remote branches and
      the tag identify the release commit. Use no force-push.
- [ ] 5.2 Obtain GitHub Release approval and use the release command in `AGENTS.md` with
      `--verify-tag`, generated notes, the approved highlights and `--notes-start-tag v1.2.0` if
      this is still the first Release. Verify the published title, tag, contributor credit, PR list
      and roadmap link. Publish no npm package and backfill no older Releases.
- [ ] 5.3 Add a factual release update to PR #3 and issue #2 with the release link and tested CLI
      versions. Verify PR #3's original commit is on remote `main` and check GitHub marks the PR
      merged; report any status mismatch rather than perform an early direct merge into `main`.
      Verify the posted text asks for confirmation of any remaining board failure rather than
      automatically closing an unverified report. Leave Windows issue #1 and roadmap #5 open.

## 6. Deploy and verify the installed extension

- [ ] 6.1 Confirm the intended OpenChamber host, extension source and current installed version,
      then obtain update approval. Update the Git-installed extension to published 1.2.2, or use the
      agreed release checkout for a folder installation. Disable and enable it to restart the
      service. Verify Settings > Extensions shows version 1.2.2 and Enabled.
- [ ] 6.2 Follow `AGENTS.md` for the live iframe check. Confirm the board loads, detail opens, task
      text matches CLI output and explicit Refresh updates an edited task in a disposable project.
      Create no real session or worktree without approval. Record the installed version, source,
      observed results and anything not verified before declaring deployment complete.

## Workflow follow-up

- After deployment and review, archive this change and verify the archived spec and checklist.
- Keep the saved `v2` work intact; its eventual OpenSpec 1.x support and merge conflicts are not
  part of 1.2.2.

## Verification

- Merged baseline: `b67cddd`, Node 22.22.1, npm 9.2.0, OpenSpec 2.1.0. `npm run check` passed all
  170 tests with Chromium before maintainer fixes. Dependencies came from `npm ci` against the
  lockfile, including SDK 1.24.2. The v2 dependency directory was preserved at
  `/tmp/opencode/openspec-preserved-v2-node_modules`. The locked release dependencies were placed at
  the checkout's normal `node_modules` path; rebuilding then produced no bundle diff.
- The autonomous release instruction authorises the planned merge, commits, tag, pushes, GitHub
  Release and installed-extension update. The existing Chromium suite is the release test coverage;
  no browser harness or claim of Firefox/WebKit verification is added.
- Integration assertions: temporarily removing initial continuation text caused both local/shared
  tests to fail at the new initial assertion. Removing refreshed continuation text caused both tests
  to fail at the refreshed assertion. After restoring the unchanged runtime source and rebuilding,
  `node --test test/integration.test.mjs` passed 2/2 on OpenSpec 2.1.0. Runtime source and generated
  bundles have no diff.
- Follow-up checks: `npm run check` passed 170/170 with OpenSpec 2.1.0.
  `PATH=/tmp/opencode/release122-cli1/node_modules/.bin:$PATH node --test test/service.test.mjs test/integration.test.mjs`
  passed 49/49 with isolated OpenSpec 1.13.1. The global CLI remains 2.1.0.
  `openspec validate --specs` passed all eight specs with existing long-requirement warnings; strict
  validation of this change passed. No runtime, SDK or bundle changes were needed.
