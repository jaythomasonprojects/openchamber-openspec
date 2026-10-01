import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";

const diagrams = [
  "flowchart TD\n A --> B",
  "stateDiagram-v2\n [*] --> Active\n Active --> [*]",
  "sequenceDiagram\n Alice->>Bob: Hello",
  "classDiagram\n Animal <|-- Dog",
  "erDiagram\n CUSTOMER ||--o{ ORDER : places",
  'xychart-beta\n x-axis [a, b]\n y-axis "Count" 0 --> 10\n bar [3, 7]\n line [8, 4]',
];

test("Mermaid fences remain inert ordinary code without diagram rendering", async () => {
  await withDocument(async (page) => {
    const sources = [
      ...diagrams,
      'flowchart TD\n A["<img src=x onerror=alert(1)>"] --> B',
      "pie\n title Unsupported",
      "flowchart TD\n" + "x".repeat(8001),
    ];
    await page.evaluate(
      (sources) =>
        update(
          "# Before\n\n" +
            sources.map((source) => `\`\`\`mermaid\n${source}\n\`\`\``).join("\n\n") +
            "\n\nAfter",
        ),
      sources,
    );
    assert.equal(
      await page.locator(".document-content svg, .document-diagram, .diagram-issue").count(),
      0,
    );
    assert.deepEqual(await page.locator("pre code").allTextContents(), sources);
    assert.equal(
      await page.locator(".document-content img, .document-content [onerror]").count(),
      0,
    );
    assert.equal(await page.getByRole("heading", { name: "Before" }).count(), 1);
    assert.ok((await page.locator(".document-content").textContent()).endsWith("After\n"));
  });
});

test("multiple long documents dispose their rendered content", async () => {
  await withDocument(async (page) => {
    const source =
      "## Long section\n\n" +
      ("A retained planning paragraph with **emphasis**. ".repeat(100) + "\n\n").repeat(45);
    assert.ok(Buffer.byteLength(source) < 240000);
    const result = await page.evaluate((source) => {
      const views = Array.from({ length: 3 }, () => {
        const root = document.createElement("section");
        document.body.append(root);
        const mounted = viewer.mountDocumentView(root);
        mounted.update({
          text: source,
          format: "markdown",
          hasContent: true,
          status: null,
          error: null,
          retry() {},
          canRetry: true,
        });
        return { root, mounted };
      });
      const rendered = views.every(
        ({ root }) => root.querySelector("h2") && root.querySelectorAll("strong").length === 4500,
      );
      views.forEach(({ mounted }) => mounted.dispose());
      return { rendered, disposed: views.every(({ root }) => root.childNodes.length === 0) };
    }, source);
    assert.deepEqual(result, { rendered: true, disposed: true });
  });
});

async function withDocument(run) {
  const bundle = await build({
    stdin: {
      contents: 'export { mountDocumentView } from "./src/panel/document-view.ts";',
      resolveDir: process.cwd(),
    },
    bundle: true,
    format: "iife",
    globalName: "viewer",
    platform: "browser",
    target: "es2022",
    write: false,
  });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><div id="root" style="visibility:visible"></div>');
    const html = await readFile(new URL("../panel/index.html", import.meta.url), "utf8");
    await page.addStyleTag({ content: html.match(/<style>([\s\S]*?)<\/style>/)[1] });
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.evaluate(() => {
      const root = document.documentElement;
      root.classList.add("oc-themed");
      for (const [name, value] of Object.entries({
        bg: "#15191c",
        fg: "#e3e7ea",
        border: "#30363c",
        muted: "#a0a9b1",
        elevated: "#1d2226",
      }))
        root.style.setProperty(`--oc-${name}`, value);
      window.links = [];
      window.Worker = class {
        constructor() {
          throw new Error("Viewer must not start a worker");
        }
      };
      window.view = viewer.mountDocumentView(document.querySelector("#root"), {
        openUrl: (url) => links.push(url),
      });
      window.update = (text, format = "markdown") =>
        view.update({
          text,
          format,
          hasContent: true,
          status: null,
          error: null,
          retry() {},
          canRetry: true,
        });
    });
    await run(page);
  } finally {
    await browser.close();
  }
}

test("Markdown semantics, empty first mount and plain formats", async () => {
  await withDocument(async (page) => {
    await page.evaluate(() => update(""));
    assert.equal(await page.locator(".document-content").count(), 1);
    await page.evaluate(() =>
      update(
        "# Heading\n\nA **bold** and *italic* `code`.\n\n> Quote\n\n1. Ordered\n\n- Unordered\n- [x] Done\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```js\nalert(1)\n```",
      ),
    );
    for (const tag of ["h1", "strong", "em", "blockquote", "ol", "ul", "table", "pre code"])
      assert.ok(await page.locator(`#root ${tag}`).count(), tag);
    assert.equal(await page.locator('input[type="checkbox"]:disabled').count(), 1);
    await page.evaluate(() => update("# Plain", "text"));
    assert.equal(await page.locator("#root pre").textContent(), "# Plain");
    assert.equal(await page.locator("#root h1").count(), 0);
  });
});

test("retained DOM, source-change updates, presentation failures and disposal", async () => {
  await withDocument(async (page) => {
    await page.evaluate(() => {
      update("# Retained\n\n```mermaid\nflowchart TD\n A --> B\n```");
      window.oldCode = document.querySelector("pre code");
      window.oldHeading = document.querySelector("h1");
      update("# Retained\n\n```mermaid\nflowchart TD\n A --> B\n```");
    });
    assert.ok(
      await page.evaluate(
        () =>
          oldCode === document.querySelector("pre code") &&
          oldHeading === document.querySelector("h1"),
      ),
    );
    await page.evaluate(() => {
      const content = document.querySelector(".document-content");
      const replace = content.replaceChildren.bind(content);
      content.replaceChildren = (...nodes) => {
        content.replaceChildren = replace;
        throw new Error("Presentation failure");
      };
      update("# Failed source");
    });
    assert.equal(await page.locator("pre").textContent(), "# Failed source");
    assert.equal(
      await page.getByText("Document rendering failed. Original source is shown.").isVisible(),
      true,
    );
    assert.equal(await page.getByRole("button", { name: "Retry document" }).isVisible(), false);
    await page.evaluate(() =>
      view.update({
        text: "",
        format: "markdown",
        hasContent: false,
        status: "Loading document…",
        error: null,
        retry() {},
        canRetry: true,
      }),
    );
    assert.equal(
      await page.getByText("Document rendering failed. Original source is shown.").isVisible(),
      false,
    );
    await page.evaluate(() => update("[Detached](https://example.com/)"));
    await page.evaluate(() => {
      window.detached = document.querySelector("a");
      view.dispose();
      detached.addEventListener("click", (event) => event.preventDefault(), { once: true });
      detached.click();
    });
    assert.deepEqual(await page.evaluate(() => links), []);
    assert.equal(await page.locator("#root > *").count(), 0);
  });
});

test("scoped readable layout and theme changes at sidebar and page widths", async () => {
  await withDocument(async (page) => {
    await page.evaluate(() =>
      update(
        "# Heading\n\n- [ ] Read only\n\n| Wide |\n| - |\n| " +
          "x".repeat(300) +
          " |\n\n```\n" +
          "x".repeat(300) +
          "\n```",
      ),
    );
    for (const width of [320, 1076]) {
      await page.setViewportSize({ width, height: 700 });
      for (const [background, foreground] of [
        ["#ffffff", "#161616"],
        ["#15191c", "#e3e7ea"],
      ]) {
        await page.evaluate(
          ({ background, foreground }) => {
            document.documentElement.style.setProperty("--oc-bg", background);
            document.documentElement.style.setProperty("--oc-fg", foreground);
            document.documentElement.style.setProperty("--oc-border", foreground);
            document.documentElement.style.setProperty("--oc-elevated", background);
            document.documentElement.style.setProperty("--oc-muted", foreground);
            document.documentElement.classList.add("oc-themed");
          },
          { background, foreground },
        );
        assert.ok(
          await page.locator("body").evaluate((node) => node.scrollWidth <= innerWidth),
          "no page overflow",
        );
        assert.equal(
          await page
            .locator(".document-content pre")
            .evaluate((node) => getComputedStyle(node).whiteSpace),
          "pre",
        );
        assert.ok(
          await page
            .locator(".document-table")
            .evaluate((node) => node.scrollWidth > node.clientWidth),
        );
        assert.equal(await page.getByRole("checkbox", { name: "Read only" }).isDisabled(), true);
        assert.equal(
          await page.locator("td").evaluate((node) => getComputedStyle(node).color),
          foreground === "#161616" ? "rgb(22, 22, 22)" : "rgb(227, 231, 234)",
        );
        await mkdir("build", { recursive: true });
        await page.screenshot({
          path: `build/document-${width}-${background === "#ffffff" ? "light" : "dark"}.png`,
          fullPage: true,
        });
      }
    }
  });
});

test("HTML stays inert, references do not load, and links are document-local or SDK-only", async () => {
  await withDocument(async (page) => {
    const requests = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.evaluate(() =>
      update(
        '# Target\n\n<script>window.pwned=1</script>\n\n<img src="https://evil.test/a" onerror="window.pwned=1">\n\n[Web](https://example.com/) [HTTP](http://example.com/) [Local](#target) [Relative](file.md) [Bad](javascript:alert%281%29) ![Picture](https://evil.test/image)',
      ),
    );
    assert.equal(
      await page.locator("#root script, #root img, #root iframe, #root [onerror]").count(),
      0,
    );
    assert.ok((await page.locator("#root").textContent()).includes("<script>"));
    assert.equal(await page.locator("#root a").count(), 3);
    await page.getByRole("link", { name: "Web", exact: true }).click();
    await page.getByRole("link", { name: "HTTP", exact: true }).click();
    await page.getByRole("link", { name: "Web", exact: true }).click({ button: "middle" });
    await page.evaluate(() => {
      window.fragmentTarget = null;
      document.querySelector("h1").scrollIntoView = function () {
        fragmentTarget = this;
      };
      const other = document.createElement("h1");
      other.id = "document-target";
      other.textContent = "Unrelated target";
      document.body.prepend(other);
      other.scrollIntoView = () => {
        throw new Error("Fragment escaped its document");
      };
    });
    await page.getByRole("link", { name: "Local", exact: true }).click();
    assert.ok(await page.evaluate(() => fragmentTarget === document.querySelector("#root h1")));
    assert.deepEqual(await page.evaluate(() => links), [
      "https://example.com/",
      "http://example.com/",
      "https://example.com/",
    ]);
    assert.deepEqual(requests, []);
    assert.equal(page.context().pages().length, 1);
    assert.equal(await page.evaluate(() => window.pwned), undefined);
    assert.equal(page.url(), "about:blank");
  });
});
