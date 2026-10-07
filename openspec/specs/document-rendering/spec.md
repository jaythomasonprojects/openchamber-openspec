# document-rendering Specification

## Purpose

Present planning documents as readable Markdown with plain-text code fences while keeping untrusted
content inert and preserving existing document-read behaviour.

## Requirements

### Requirement: Markdown planning documents render as formatted content

The viewer SHALL render documents selected from Markdown artefacts with headings, paragraphs,
emphasis, links, ordered and unordered lists, block quotes, tables, inline code, and fenced code.
Task-list checkboxes in documents SHALL be read-only. Non-Markdown custom documents SHALL remain
plain text. The recorded goal and authoritative CLI Tasks view SHALL retain their existing
plain-text behaviour.

#### Scenario: Read standard and custom Markdown documents

- **WHEN** the user opens Proposal, Specs, Design, or an available custom Markdown document
- **THEN** supported Markdown constructs render as semantic elements rather than raw Markdown in a
  single preformatted block
- **AND** ordinary fenced code retains its source without execution or syntax highlighting

#### Scenario: Keep task data and other formats unchanged

- **WHEN** the user opens Tasks or a non-Markdown custom document
- **THEN** Tasks shows only authoritative CLI records and the custom document shows plain text
- **AND** document task-list checkboxes cannot write files or change CLI completion counts

### Requirement: Fenced code remains plain text

The viewer SHALL display all fenced code, including Mermaid fences, as inert plain-text code. It
SHALL NOT parse diagram syntax, render diagrams, execute code, or apply syntax highlighting. Code
blocks SHALL use the active host theme and fit within a document-local scroll area without causing
horizontal page overflow. Surrounding Markdown SHALL remain visible.

#### Scenario: Read Mermaid source

- **WHEN** a Markdown document contains a Mermaid fence
- **THEN** its source appears in an ordinary preformatted code block, not an SVG diagram
- **AND** no diagram controls or diagram-rendering notices appear

#### Scenario: Preserve code regardless of syntax

- **WHEN** a fenced block contains invalid diagram syntax, a long source, or authored HTML
- **THEN** its source remains readable as inert code without diagram-specific limits or errors
- **AND** surrounding Markdown remains visible

#### Scenario: Read at sidebar width and change themes

- **WHEN** a user reads wide fenced code at 320px width or changes the host theme
- **THEN** the code remains readable through document-local scrolling and reflects the active theme
- **AND** the page does not overflow horizontally or lose tab focus, scroll position, or disclosure
  state

### Requirement: Document rendering does not activate untrusted content

Authored HTML SHALL remain visible, inert text. Generated HTML SHALL be sanitized before insertion.
Content SHALL NOT introduce executable scripts, event handlers, active embeds, arbitrary
stylesheets, or unsafe URL actions. Safe HTTP and HTTPS external links SHALL open only after user
activation through the SDK. Same-document links SHALL stay within the document. Unsupported links
SHALL remain readable without an unsafe action. Images SHALL display a readable label or source
without loading local or remote resources.

#### Scenario: Render hostile content safely

- **WHEN** a document or fenced code block contains scripts, event handlers, active embeds, markup,
  or unsafe URL schemes
- **THEN** no code executes, privileged action occurs, or resource is fetched from that content
- **AND** the rest of the document remains readable without content escaping its presentation area

#### Scenario: Follow an external link

- **WHEN** a user activates a safe HTTP or HTTPS link in a document
- **THEN** the viewer opens the URL through the SDK without navigating its iframe
- **AND** rejected links produce feedback without breaking the document view

#### Scenario: Preserve inert references

- **WHEN** a document contains an image, relative-file link, or unsupported URL scheme
- **THEN** its label remains readable without a new filesystem or network read
- **AND** the viewer does not resolve the reference relative to its own extension assets

### Requirement: Rendering preserves the existing read lifecycle

Rendering SHALL use the content obtained through the existing service bridge and retained document
reads. Tabs SHALL NOT initiate new requests to render content. Unchanged mounted documents SHALL
retain their rendered DOM during routine state updates and theme changes. Loading, read errors,
retry actions, and available content SHALL remain distinguishable. Renderer failures SHALL show the
original source with an explanation rather than blanking the view. All renderer listeners and
mounted content SHALL be disposed with their document view.

#### Scenario: Update unrelated state without replacing a document

- **WHEN** a sibling document read settles, a task read settles, or the host theme changes
- **THEN** an unchanged mounted document is not parsed or laid out again
- **AND** its scroll, selection, disclosure state, and focused controls are preserved
- **AND** no additional document request occurs for rendering

#### Scenario: Retry a failed document read

- **WHEN** a document read fails and the user activates its existing retry action
- **THEN** the existing scoped retry obtains content and displays it through the renderer
- **AND** late results from a replaced context cannot update the current document

#### Scenario: Recover from a renderer failure

- **WHEN** formatting a successfully read document fails
- **THEN** the source remains visible with a rendering explanation distinct from a service read
  error
- **AND** the renderer does not initiate another service request merely to recover presentation
