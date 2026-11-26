# Spec Delta

## Purpose

Provide native Windows and macOS evidence for the extension and its OpenSpec launcher, with a
repeatable branch-based workflow validation process before development integration.

## ADDED Requirements

### Requirement: Run the suite on native Windows and macOS

CI SHALL run the existing Node and browser test suite on native Windows and macOS runners without
Docker. It SHALL exercise npm-installed OpenSpec and include focused standalone-launch coverage on
both operating systems. Linux verification SHALL remain outside this Actions workflow.

#### Scenario: Native platform verification

- **WHEN** the verification workflow runs for a candidate revision
- **THEN** Windows and macOS each execute the existing suite against npm-installed OpenSpec
- **AND** both platforms verify standalone command execution without falling back to the npm copy
- **AND** neither platform delegates CLI execution to a Linux container

### Requirement: Verify development and mainline changes

The permanent workflow SHALL run on pushes to `dev` and `main` and on pull requests targeting either
branch. Permanent push rules SHALL NOT include the temporary testing branch.

#### Scenario: Push to a maintained branch

- **WHEN** a commit is pushed to `dev` or `main`
- **THEN** both native platform checks are scheduled

#### Scenario: Pull request targets a maintained branch

- **WHEN** a pull request targeting `dev` or `main` is opened or updated
- **THEN** both native platform checks are scheduled

### Requirement: Prove workflow changes before integration

A workflow change SHALL be exercised on a separate testing branch with a temporary explicit push
trigger. Results SHALL be inspected with GitHub CLI and corrected runs repeated until both native
platforms pass the candidate execution configuration. Before merging into `dev`, temporary push
rules SHALL be removed and permanent rules restored.

#### Scenario: Candidate workflow fails

- **WHEN** either platform fails on the testing branch
- **THEN** its job results and failed-step diagnostics are inspected with GitHub CLI
- **AND** the correction is tested again before integration
- **AND** a result from an older revision is not accepted as proof of a changed execution setup

#### Scenario: Candidate workflow is ready to merge

- **WHEN** both platforms pass and the final edit restores only permanent event rules
- **THEN** the execution configuration is compared with the successful candidate
- **AND** the temporary testing-branch trigger is absent from the version merged into `dev`
- **AND** the first resulting `dev` push is checked for both native outcomes

### Requirement: Keep verification reproducible and failures visible

CI SHALL use locked project dependencies and pinned OpenSpec test versions. Both native jobs SHALL
report their outcomes even when one fails. Platform adaptations SHALL retain the existing safety
checks rather than silently excluding them to obtain a passing result.

#### Scenario: One platform fails

- **WHEN** one native job fails while the other is still running
- **THEN** the other job is allowed to finish and expose its result
- **AND** the workflow is not reported as verified until both platforms pass

#### Scenario: Platform-specific fixture behaviour

- **WHEN** a fixture needs different filesystem or process handling on Windows
- **THEN** the adapted fixture still verifies the intended containment or cleanup outcome
- **AND** the difference is not hidden by skipping all Windows coverage for that behaviour
