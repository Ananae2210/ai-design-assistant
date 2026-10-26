import AxeBuilder from "@axe-core/playwright";
import { type Page, expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const fixture = (name: string) => path.join(process.cwd(), "e2e", "fixtures", name);
const critiqueResponse = fs.readFileSync(fixture("critique-response.json"), "utf8");

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    // The two-colour preview shows whatever colours the user picks, failing ones included, on purpose.
    .exclude("[data-contrast-sample]")
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
}

async function upload(page: Page) {
  await page.locator('input[type="file"]').setInputFiles(fixture("checkout-screen.png"));
  await expect(page.getByRole("heading", { name: "Automated colour checks" })).toBeVisible();
}

test("home page has no accessibility violations in light and dark mode", async ({ page }) => {
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoA11yViolations(page);
  }
});

test("uploading a screenshot finds failing colour pairs", async ({ page }) => {
  await page.goto("/");
  await upload(page);
  await expect(page.getByText(/not safe for body text/)).toBeVisible();
  await expect(page.getByText("Fails").first()).toBeVisible();
  await expectNoA11yViolations(page);
});

test("colours can be sampled with the keyboard", async ({ page }) => {
  await page.goto("/");
  await upload(page);
  const sampler = page.getByRole("group", { name: /Move the picker with the arrow keys/ });
  await sampler.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/:1 (passes|fails)/)).toBeVisible();
});

test("AI review shows issues, filters by severity, and exports a report", async ({ page }) => {
  await page.route("/api/critique", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: critiqueResponse }),
  );
  await page.goto("/");
  await upload(page);
  await page.getByLabel(/What is this screen/).fill("Checkout for a food delivery app");
  await page.getByRole("button", { name: "Run AI review" }).click();

  await expect(page.getByRole("heading", { name: "Button label is hard to read" })).toBeVisible();
  await page.getByRole("button", { name: "minor (1)" }).click();
  await expect(page.getByRole("heading", { name: "Edit link looks disabled" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Button label is hard to read" })).toBeHidden();
  await expectNoA11yViolations(page);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download report (.md)" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("checkout-screen-design-review.md");
  const report = fs.readFileSync((await download.path())!, "utf8");
  expect(report).toContain("### 1. Button label is hard to read");
});

test("explains clearly when AI review isn't configured", async ({ page }) => {
  await page.goto("/");
  await upload(page);
  await page.getByRole("button", { name: "Run AI review" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "AI review isn't set up" })).toBeVisible();
});
