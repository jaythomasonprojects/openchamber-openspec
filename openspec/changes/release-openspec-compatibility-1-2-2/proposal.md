# Proposal

## Why

The current extension needs a small maintenance release while extension v2 remains separate. Daniel
Einspanjer's PR #3 supplies OpenSpec 1.x and 2.x test compatibility and developer-tooling fixes.
Release 1.2.2 should include that work, the agreed review follow-ups, and tested bundles.

## What Changes

- Merge the reviewed PR #3 head into `dev`, then test the merged result before applying maintainer
  fixes. Preserve Daniel's commit, authorship, archived OpenSpec change and removal of the `tdd` and
  `simple` config references. Leave `main` unchanged until the completed release passes its checks.
- Make a separate maintainer commit that ignores a root `node_modules` directory or symlink and
  restores task-text assertions in the existing integration tests without assuming one OpenSpec
  version's continuation format.
- Correct the shared-planning specification's first-line-only task description promise. The
  extension already displays the descriptions supplied by the CLI.
- Use the release process already on `dev` in commit `b01c67e`, without importing the separate `v2`
  branch. Retain PR #3's safe setup for tracked planning files.
- Test all follow-up changes on `dev` and prepare version 1.2.2 there. Merge the tested release into
  `main` only when ready, publish the release commits and `v1.2.2` tag, create the GitHub Release
  with contributor credit, then update and check the installed extension.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `shared-planning`: task descriptions remain authoritative CLI output, including continuation text
  when the CLI supplies it. They are not restricted to the first source line.

## Impact

- Related work: [PR #3](https://github.com/jaythomasonprojects/openchamber-openspec/pull/3),
  [compatibility report #2](https://github.com/jaythomasonprojects/openchamber-openspec/issues/2)
  and [roadmap #5](https://github.com/jaythomasonprojects/openchamber-openspec/issues/5).
- Follow-up files: `.gitignore`, `test/integration.test.mjs` and the shared-planning spec. Release
  setup and versioning affect `.github/release.yml`, `AGENTS.md`, `package.json`,
  `package-lock.json` and the two tracked bundles.
- No new SDK dependency, permission, CLI command, service protocol or runtime parser is needed.
  Existing integration tests cover both local and shared planning. No test file or helper is added.
- PR #4, extension v2 features, the Windows CLI launch fix in issue #1, and automatic sharing of
  this repository's tracked `openspec/` folder are outside this release.
- Git installs obtain the update from the published repository version and built files, not from an
  npm package. Tags, pushes, the GitHub Release and the installed-extension update require approval
  at their execution boundaries.
