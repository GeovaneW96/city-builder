import { expect, test, type Page } from "@playwright/test";

test("the player can place a road through the build toolbar", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/");
  await pauseSimulation(page);

  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByText("Money")).toContainText("$50,000");
  await expect(page.getByText("Population")).toContainText("0 / 1000");
  await page.getByRole("button", { name: "Road", exact: true }).click();
  await page.locator("canvas").click({ position: { x: 640, y: 360 } });

  await expect(page.getByText("Built.")).toBeVisible();
  await expect(page.getByText("Money")).toContainText("$49,950");
  await expect(page.getByText(/^Road at /)).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("the player can drag-paint an adjacent residential zone", async ({ page }) => {
  await page.goto("/");
  await pauseSimulation(page);
  const canvas = page.locator("canvas");

  await page.getByRole("button", { name: "Road", exact: true }).click();
  await canvas.click({ position: { x: 640, y: 360 } });
  await page.getByRole("button", { name: "Residential", exact: true }).click();
  await page.mouse.move(648, 370);
  await page.mouse.down();
  await page.mouse.move(678, 370, { steps: 2 });
  await page.mouse.up();

  await expect(page.locator('[data-ui="selection"]')).toHaveText(/^Residential zone at /);
  await expect(page.getByText("Built.")).toBeVisible();
});

test("the population HUD updates as a zoned home grows", async ({ page }) => {
  await page.goto("/");
  await pauseSimulation(page);
  const canvas = page.locator("canvas");

  await page.getByRole("button", { name: "Road", exact: true }).click();
  await canvas.click({ position: { x: 640, y: 360 } });
  await page.getByRole("button", { name: "Residential", exact: true }).click();
  await canvas.click({ position: { x: 648, y: 370 } });
  await page.getByRole("button", { name: "3", exact: true }).click();

  await expect(page.locator('[data-ui="population"]')).toHaveText("8 / 1000");
});

test("a saved road persists through a reload and load", async ({ page }) => {
  await page.goto("/");
  await pauseSimulation(page);
  const canvas = page.locator("canvas");

  await page.getByRole("button", { name: "Road", exact: true }).click();
  await canvas.click({ position: { x: 640, y: 360 } });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved to manual_0.")).toBeVisible();

  await page.reload();
  await pauseSimulation(page);
  await expect(page.locator('[data-ui="money"]')).toHaveText("$50,000");
  await page.getByRole("button", { name: "Load", exact: true }).click();

  await expect(page.getByText("Loaded.")).toBeVisible();
  await expect(page.locator('[data-ui="money"]')).toHaveText("$49,950");
  await canvas.click({ position: { x: 640, y: 360 } });
  await expect(page.locator('[data-ui="selection"]')).toHaveText(/^Road at /);
});

test("sound and overlays can be toggled without conflicting states", async ({ page }) => {
  await page.goto("/");
  await pauseSimulation(page);
  const sound = page.getByRole("button", { name: "Sound: On", exact: true });
  const zoning = page.getByRole("button", { name: "Zoning", exact: true });
  const pollution = page.getByRole("button", { name: "Pollution", exact: true });

  await sound.click();
  await expect(
    page.getByRole("button", { name: "Sound: Off", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await zoning.click();
  await expect(zoning).toHaveClass(/active/);
  await pollution.click();
  await expect(zoning).not.toHaveClass(/active/);
  await expect(pollution).toHaveClass(/active/);
});

test("the debug overlay displays performance metrics when toggled", async ({ page }) => {
  await page.goto("/");
  await pauseSimulation(page);
  const debug = page.getByRole("button", { name: "Debug", exact: true });
  const overlay = page.locator('[data-ui="debug"]');

  await debug.click();

  await expect(debug).toHaveClass(/active/);
  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText("FPS");
  await expect(overlay).toContainText("Draw calls");
  await expect(overlay).toContainText("Tick");
});

test("the rating control reveals strengths, weaknesses, and immigration impact", async ({
  page,
}) => {
  await page.goto("/");
  await pauseSimulation(page);
  const rating = page.locator('[data-ui="rating"]');
  const breakdown = page.locator('[data-ui="rating-breakdown"]');

  await rating.click();

  await expect(rating).toHaveAttribute("aria-expanded", "true");
  await expect(breakdown).toBeVisible();
  await expect(breakdown).toContainText("Strengths:");
  await expect(breakdown).toContainText("Improve:");
  await expect(breakdown).toContainText("Immigration");
});

async function pauseSimulation(page: Page): Promise<void> {
  await page.getByRole("button", { name: "0", exact: true }).click();
}
