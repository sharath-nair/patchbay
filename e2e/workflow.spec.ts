import { expect, test, type Page } from "@playwright/test";

const nodes = (page: Page) => page.locator(".react-flow__node");

async function createExample(page: Page) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Create example" }).click();
  await expect(page).toHaveURL(/\/editor\/[a-z0-9-]+$/);
  await expect(nodes(page)).toHaveCount(5);
}

test("create the example, run it, and see the streamed result", async ({ page }) => {
  await createExample(page);

  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run", exact: true })).toBeVisible({ timeout: 20_000 });

  await expect(page.getByText(/key points/).first()).toBeVisible();
  // Trigger->Prompt, Prompt->Condition, Condition->true branch completed; the false branch stayed idle.
  await expect(page.locator(".react-flow__edge.edge-success")).toHaveCount(3);
  await expect(page.locator(".react-flow__edge.edge-running")).toHaveCount(0);
});

test("edits autosave and survive a reload", async ({ page }) => {
  await createExample(page);
  const name = page.getByLabel("Workflow name");
  await name.fill("Quarterly summary");
  await expect(page.getByText("Saved")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Workflow name")).toHaveValue("Quarterly summary");
  await expect(nodes(page)).toHaveCount(5);

  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "Quarterly summary" })).toBeVisible();
});

test("drag a node from the palette, then undo and redo it", async ({ page }) => {
  await createExample(page);
  await page.getByText("Transform", { exact: true }).first().dragTo(page.locator(".react-flow__pane"), { targetPosition: { x: 300, y: 380 } });
  await expect(nodes(page)).toHaveCount(6);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(nodes(page)).toHaveCount(5);
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(nodes(page)).toHaveCount(6);

  await page.locator(".react-flow__pane").click({ position: { x: 20, y: 20 } });
  await page.keyboard.press("ControlOrMeta+z");
  await expect(nodes(page)).toHaveCount(5);
});

test("editing a node in the property panel updates it on the canvas", async ({ page }) => {
  await createExample(page);
  await page.locator(".react-flow__node-prompt").click();
  await page.getByLabel("Label").fill("Brief the team");
  await expect(page.locator(".react-flow__node-prompt")).toContainText("Brief the team");
});

test("command palette adds a node", async ({ page }) => {
  await createExample(page);
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox").fill("add output");
  await page.keyboard.press("Enter");
  await expect(nodes(page)).toHaveCount(6);
});

test("a workflow that does not exist shows a helpful message", async ({ page }) => {
  await page.goto("/editor/nope");
  await expect(page.getByRole("heading", { name: "Workflow not found" })).toBeVisible();
  await page.getByRole("link", { name: "Back to dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("importing an invalid file shows an error and creates nothing", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByLabel("Import workflow file").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"version":1}') });
  // (Next.js also renders its own role=alert route announcer, so match the message text.)
  await expect(page.getByText(/Not a valid Patchbay workflow/)).toBeVisible();
  await expect(page.getByText("No workflows yet")).toBeVisible();
});
