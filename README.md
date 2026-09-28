# OpenSpec for OpenChamber

An OpenChamber panel and full-page board for the OpenSpec changes in your selected project or
worktree. Browse planning artefacts and CLI-reported tasks, create a change, or confirm deletion of
an active change folder. Workflow buttons prepare editable prompts in your chat; they do not send
them or run the workflow for you.

## Before you start

- Use OpenChamber on the web or desktop with an OpenCode chat. Extensions do not load in its VS Code
  or mobile apps.
- Install the [OpenSpec CLI](https://openspec.dev/docs/installation) on the machine running your
  OpenChamber server. Its `openspec` command must be on that server's `PATH`, even when you open
  OpenChamber from another device.
- Have a project you can select in OpenChamber. Set up OpenSpec **in that project**, not in this
  extension's repository.

## Get your project ready

1. Install and check the CLI on the OpenChamber server if it is not already installed:

   ```sh
   npm install -g @fission-ai/openspec@latest
   openspec --version
   ```

2. Run `openspec config profile` and include the **verify** workflow alongside the default core
   workflows. Verify is optional in OpenSpec, but this board offers a Verify button. Choose skills
   delivery (or both skills and commands), since the board's prompts use skill names. This profile
   setting applies to your machine's OpenSpec projects.
3. In the project you want to see on the board, initialise OpenSpec for OpenCode:

   ```sh
   cd /path/to/your-project
   openspec init --tools opencode
   openspec list --json
   ```

   Init creates `openspec/` and the OpenSpec workflows in `.opencode/skills/`. The listing should
   report this project's root, even if it has no changes yet. If you changed the profile **after**
   initialising a project, run `openspec update` there to install the newly selected skills. Restart
   OpenCode if its new skills are not visible.

The board prepares `/openspec-explore`, `/openspec-propose`, `/openspec-apply-change`,
`/openspec-verify-change` and `/openspec-archive-change` prompts. Without these skills the board can
still show changes, but its workflow prompts will not have the intended instructions. See
[OpenSpec's profiles](https://openspec.dev/docs/profiles) if you need to change the installed set.

## Install the extension

1. In OpenChamber, open **Settings → Extensions**. Paste
   `https://github.com/jaythomasonprojects/openchamber-openspec.git` into **Folder, ZIP, or URL**
   and select **Add**.
2. Review its permissions and choose **Allow and enable** if you trust it. The extension runs a
   local service with your user access to call `openspec`; its workflow prompts remain unsent.
3. Select the OpenSpec-enabled project in OpenChamber, then open the **OpenSpec** rail panel or find
   it under **Extension pages**. An empty board is expected until you have an active change. Use
   **new change** to create one, or open an existing change to read its artefacts and tasks.

For Git URL installations, OpenChamber checks for updates in **Settings → Extensions**. An update
must include both built bundles, `panel/main.js` and `service/main.js`; changing the manifest
version in `package.json` makes a new version available to installed users.

## Develop locally

Use Node 22.13+, npm and the OpenSpec CLI. After `npm ci`, install Chromium for the browser tests
with `npx playwright install chromium`, then run `npm run check`. This lints, checks formatting and
types, runs disposable-project tests, and builds both installable bundles. OpenChamber does not
build extensions when it installs them.

To try local changes, add this repository's absolute folder path in **Settings → Extensions**.
Rebuild and reinstall the folder after updates; disable and re-enable the extension to restart its
host-managed service. Reloading its panel alone does not restart that service.
