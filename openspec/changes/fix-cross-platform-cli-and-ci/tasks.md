# Tasks

## 1. Bootstrap native workflow validation

- [x] 1.1 Add `.github/workflows/verify.yml` on the separate `fix/1-cross-platform-tests` branch
      with native Windows/macOS jobs, Node 24, locked dependencies, OpenSpec 2.1.0, Chromium and
      `npm test`. Temporarily include this branch in push triggers; retain final `dev`/`main` push
      and pull-request targets, read-only contents permission and `fail-fast: false`. Verify the
      workflow definition and document the temporary validation process beside the existing
      developer guidance without adding a preparation script.
- [x] 1.2 Obtain scoped approval for testing-branch pushes and repeated Actions runs. Push the
      initial workflow and use `gh run list`, `gh run watch` and `gh run view --log-failed` to
      record baseline results by head SHA and platform. Completion requires actual native
      diagnostics, including the Windows command-shim failure; unavailable approval or access leaves
      this task open.

## 2. Fix the launcher and consolidate fixture execution

- [ ] 2.1 At the existing `test/service.test.mjs` launcher seam, add installed-CLI and argument/cwd
      regressions using the existing shebang fake CLI and a disposable project independent of the
      fixture command launcher. Confirm the expected Windows failure before the production change,
      then declare `cross-spawn` and development typings, replace the service launcher and add
      `windowsHide`. Rebuild with `npm run build:service`; run the focused service tests locally and
      on the testing branch to prove npm launch, intact special-character arguments and unchanged
      failure/output/deadline behaviour.
- [ ] 2.2 At the existing helper/harness seam, adapt `runFixtureCommand` to asynchronous
      `cross-spawn` with bounded collection, captured stdout/stderr, failure diagnostics and timeout
      termination. Extend `test/harness.test.mjs` only as needed to pin captured output, failed
      exits and timeout/removal; show each regression failing for its intended reason before the
      fix. Replace the store test's private launcher with this helper and remove its redundant
      imports. Verify focused harness and registered-store service tests, including environment
      isolation. Keep the harness's known-Node `execFile` call and project-lifetime helpers.

## 3. Preserve filesystem and cleanup coverage natively

- [ ] 3.1 At the existing service/integration filesystem seams, make file and directory symlink
      types explicit for shared roots, aliases, escapes and dangling/cyclic directory cases. Use
      native Windows runner privileges rather than skips or copied directories. Retain canonical
      temporary paths and Unix fake-script executable permissions. Verify the previously failing
      native cases pass and still reject unsafe roots and escaped targets.
- [ ] 3.2 At the existing service/harness process seams, adapt OS-specific signal assertions while
      retaining timeout/output errors, PID disappearance, removable roots and missing-browser server
      teardown. Verify focused service and harness checks after their prerequisite builds on both
      native jobs. If evidence requires new process-tree machinery, pause for approval rather than
      expanding the helper or deleting coverage.

## 4. Complete installation coverage and the native acceptance loop

- [ ] 4.1 Add ordinary workflow steps that select and checksum the pinned standalone release for
      each runner architecture, place it first on PATH and run the focused installed-CLI regression
      from `test/service.test.mjs`. Verify the resolved command and reported install type prove that
      npm cannot mask standalone failure; require success on Windows and macOS. Keep the full suite
      on npm and avoid another installer/browser matrix. Document the tested CLI and the two
      verification paths in existing developer guidance.
- [ ] 4.2 Push scoped corrections to the testing branch and inspect each failing run with GitHub
      CLI. Repeat until the candidate revision passes the full npm suite and standalone smoke on
      both platforms. Record run URLs, head SHAs, job conclusions and any transient reruns in this
      change's verification notes. Recheck focused local tests between attempts; do not treat older
      green results or silently skipped coverage as acceptance.
- [ ] 4.3 Follow the existing local live-host activation procedure for the rebuilt extension and
      verify board loading and opening an existing change without creating real sessions/worktrees.
      Record the host, operating system and result, including unavailable Windows desktop evidence.
      This is broader integration evidence, not a replacement for native Actions.

## 5. Restore final triggers and integrate into dev

- [ ] 5.1 Once both platform jobs pass, remove only the temporary testing-branch push trigger.
      Compare the final diff with the passing candidate and verify the execution configuration is
      unchanged and permanent triggers target only `dev`/`main` pushes and pull requests. If
      execution logic changed, restore the temporary trigger and repeat task 4.2 before proceeding.
- [ ] 5.2 Obtain approval for the merge and `dev` push, then merge the tested change into `dev` with
      the final running rules. Respect the existing `dev` worktree and preserve unrelated changes.
      Inspect the resulting `dev` Actions run with GitHub CLI and record both successful native
      outcomes before marking rollout complete. Verify no Linux CI job, Docker changes, unrelated V2
      features, tags or release actions entered the diff.

## Workflow follow-up

- Ask for review before archiving the completed change.
- A later release retains the existing `npm run check` and Chromium/Firefox/WebKit verification
  requirements; this change neither performs a release nor replaces that gate.
