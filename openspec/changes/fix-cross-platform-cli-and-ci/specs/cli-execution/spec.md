# Spec Delta

## Purpose

Run the installed OpenSpec command across operating systems without confusing command-shim launch
failures with a missing installation or changing the meaning of user-supplied arguments.

## ADDED Requirements

### Requirement: Launch the installed command across platforms

The service SHALL launch OpenSpec from its process environment on Windows, macOS and Linux,
including npm command shims and standalone executables. It SHALL NOT require a particular npm prefix
or installation directory.

#### Scenario: Windows npm installation

- **WHEN** the service environment resolves OpenSpec to an installed npm command shim on Windows
- **THEN** the service executes the requested operation rather than reporting the shim unavailable

#### Scenario: Standalone installation

- **WHEN** the service environment resolves OpenSpec to a standalone executable
- **THEN** the service executes that executable without requiring an npm package layout

#### Scenario: Existing POSIX installation

- **WHEN** a supported OpenSpec command is available on macOS or Linux
- **THEN** the same service operation continues to execute in the selected project

### Requirement: Preserve arguments and project context

The service SHALL preserve each argument's value and boundary and use the requested project
directory as the working directory. Spaces, quotes, Unicode and shell metacharacters in input SHALL
remain data rather than additional commands.

#### Scenario: Goal text contains special characters

- **WHEN** a change is created with a goal containing spaces, quotes, Unicode and an ampersand
- **THEN** OpenSpec receives the complete goal as one argument
- **AND** no additional command is executed from the goal text

#### Scenario: Project path contains spaces

- **WHEN** an operation targets a project directory whose path contains spaces
- **THEN** OpenSpec runs in that project without treating the path as command text

### Requirement: Retain bounded execution and meaningful failures

CLI execution SHALL retain the service's existing deadlines, output limits and structured failure
handling. A missing command SHALL remain distinguishable from a launched command that fails. Timeout
or excessive output SHALL terminate execution and settle the request without leaving test-owned CLI
processes running.

#### Scenario: Command is missing

- **WHEN** the requested OpenSpec command cannot be resolved or launched
- **THEN** the service reports that the CLI is unavailable

#### Scenario: Launched command fails

- **WHEN** OpenSpec starts but exits with a failure diagnostic
- **THEN** the service reports an operation failure rather than a missing installation

#### Scenario: Command exceeds a bound

- **WHEN** a command exceeds its deadline or permitted output
- **THEN** the service returns the corresponding bounded-execution failure
- **AND** the launched CLI is terminated and the service remains responsive
