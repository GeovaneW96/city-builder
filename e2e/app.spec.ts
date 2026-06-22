import { expect, test, type Page } from "@playwright/test";

type GridPoint = readonly [number, number];

test("a player grows a brand-new city from zero to 1,000 residents", async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.install({ time: new Date("2024-01-01T00:00:00Z") });
  await page.goto("/?e2e", { waitUntil: "domcontentloaded" });
  await page.clock.runFor(1);

  const canvas = page.locator("canvas[data-engine]");
  const pause = page.getByRole("button", { name: "Pause", exact: true });
  const inspector = page.locator('[data-ui="inspector"]');

  await expect(canvas).toBeVisible();
  await expect(page.locator('[data-ui="population"]')).toHaveText("0");
  await expect(page.locator('[data-ui="date"]')).toHaveText(
    /^[A-Z][a-z]+ \d+, Year \d+ · \d{2}:00$/,
  );

  await pause.click();
  await canvas.click({ position: toScreen([31, 32]) });
  await expect(inspector).toContainText("Empty Tile");

  await buildRoadNetwork(page, canvas);
  await buildLandfill(page, canvas);
  await zoneResidentialCity(page, canvas);

  await setSpeed(page, 3);
  await page.clock.runFor(13_000);
  await setSpeed(page, 0);
  await expect(page.locator('[data-ui="population"]')).toHaveText("72");

  await zoneBusinesses(page, canvas, "Commercial", commercialZones());
  await setSpeed(page, 3);
  await page.clock.runFor(10_000);
  await setSpeed(page, 0);

  await zoneBusinesses(page, canvas, "Industrial", industrialZones());
  await setSpeed(page, 3);
  await page.clock.runFor(50_000);
  await setSpeed(page, 0);
  expect(
    getPopulationValue(await page.locator('[data-ui="population"]').textContent()),
  ).toBeGreaterThan(120);

  await buildUtilities(page, canvas);
  await buildSupplementalHomes(page, canvas);
  await buildBackupPower(page, canvas);
  await setSpeed(page, 3);
  await advanceUntilPopulation(page, 1000);

  expect(
    getPopulationValue(await page.locator('[data-ui="population"]').textContent()),
  ).toBeGreaterThanOrEqual(1000);
  await expect(page.getByRole("status")).toContainText("First City reached!");

  await page.keyboard.press("Escape");
  await canvas.click({ position: toScreen([32, 30]) });
  await expect(inspector).toContainText("Landfill");
  await expect(inspector).toContainText("Jobs provided: 4 / 4");
  await expect(inspector).toContainText("Collection: 500/mo, 20-tile range");
  await expect(inspector).toContainText(/City coverage:/);
});

async function buildRoadNetwork(
  page: Page,
  canvas: ReturnType<Page["locator"]>,
): Promise<void> {
  await selectBottomButton(page, "Dirt Road");
  await placeMany(canvas, roadNetwork());
}

async function buildUtilities(
  page: Page,
  canvas: ReturnType<Page["locator"]>,
): Promise<void> {
  await selectSidebarCatalog(page, "Utilities");
  await placeBuilding(page, canvas, "Power Plant", [
    [28, 40],
    [32, 43],
  ]);
  await placeBuilding(page, canvas, "Water Tower", [
    [32, 39],
    [32, 40],
    [32, 41],
  ]);
}

async function buildLandfill(
  page: Page,
  canvas: ReturnType<Page["locator"]>,
): Promise<void> {
  await selectSidebarCatalog(page, "Utilities");
  await placeBuilding(page, canvas, "Landfill", [[32, 30]]);
}

async function buildSupplementalHomes(
  page: Page,
  canvas: ReturnType<Page["locator"]>,
): Promise<void> {
  const roads = supplementalRoads();
  await selectBottomTab(page, "Roads");
  await selectBottomButton(page, "Dirt Road");
  await placeMany(canvas, roads);
  await selectBottomTab(page, "Zones");
  await selectBottomButton(page, "Residential");
  await placeMany(
    canvas,
    roads.map(([x, y]) => [x, y + 1]),
  );
}

async function buildBackupPower(
  page: Page,
  canvas: ReturnType<Page["locator"]>,
): Promise<void> {
  await selectSidebarCatalog(page, "Utilities");
  await placeBuilding(page, canvas, "Power Plant", [[16, 30]]);
}

async function zoneResidentialCity(
  page: Page,
  canvas: ReturnType<Page["locator"]>,
): Promise<void> {
  await selectBottomTab(page, "Zones");
  await selectBottomButton(page, "Residential");
  await placeMany(canvas, residentialZones());
}

async function zoneBusinesses(
  page: Page,
  canvas: ReturnType<Page["locator"]>,
  zone: "Commercial" | "Industrial",
  cells: GridPoint[],
): Promise<void> {
  await selectBottomTab(page, "Zones");
  await selectBottomButton(page, zone);
  await placeMany(canvas, cells);
}

async function placeBuilding(
  page: Page,
  canvas: ReturnType<Page["locator"]>,
  name: string,
  cells: GridPoint[],
): Promise<void> {
  await selectBottomButton(page, name);
  await placeMany(canvas, cells);
}

async function selectSidebarCatalog(page: Page, name: string): Promise<void> {
  await page.locator("nav.sidebar").getByRole("button", { name, exact: true }).click();
}

async function selectBottomTab(page: Page, name: string): Promise<void> {
  await page.locator(".bottom-panel").getByRole("button", { name, exact: true }).click();
}

async function selectBottomButton(page: Page, name: string): Promise<void> {
  const item = page.locator(".bottom-panel .item-card").filter({ hasText: name });
  await expect(item).toBeEnabled();
  await item.click();
}

async function setSpeed(page: Page, speed: 0 | 3): Promise<void> {
  const name = speed === 0 ? "Pause" : "3x speed";
  await page.getByRole("button", { name, exact: true }).click();
}

async function placeMany(
  canvas: ReturnType<Page["locator"]>,
  cells: GridPoint[],
): Promise<void> {
  for (const cell of cells) await canvas.click({ position: toScreen(cell) });
}

async function advanceUntilPopulation(page: Page, target: number): Promise<void> {
  for (let tick = 0; tick < 30; tick += 1) {
    await page.clock.runFor(2_500);
    const population = getPopulationValue(
      await page.locator('[data-ui="population"]').textContent(),
    );
    if (population >= target) return;
  }
  throw new Error(`Population did not reach ${target}.`);
}

function getPopulationValue(value: string | null): number {
  return Number((value ?? "0").replaceAll(",", ""));
}

function roadNetwork(): GridPoint[] {
  const horizontal = [25, 29, 33, 37].flatMap((y) => row(22, 36, y));
  const vertical = column(31, 23, 42);
  const serviceRoad = row(31, 40, 42);
  return uniquePoints([...horizontal, ...vertical, ...serviceRoad]);
}

function residentialZones(): GridPoint[] {
  const zoneRows = [24, 26, 27, 28, 30, 31, 32, 34, 35, 36, 38, 39];
  const landfillFootprint = new Set(
    row(32, 34, 30)
      .concat(row(32, 34, 31), row(32, 34, 32))
      .map(key),
  );
  const zoneColumns = [...row(24, 30, 0), ...row(32, 35, 0)].map(([x]) => x);
  const neighborhood = zoneRows
    .flatMap((y) => zoneColumns.map((x) => [x, y] as GridPoint))
    .filter((cell) => !landfillFootprint.has(key(cell)));
  return [...neighborhood, [36, 24], [36, 26]];
}

function commercialZones(): GridPoint[] {
  return row(35, 40, 42);
}

function industrialZones(): GridPoint[] {
  return row(35, 40, 44);
}

function supplementalRoads(): GridPoint[] {
  return [
    ...[15, 18, 21].flatMap((y) => row(21, 34, y)),
    ...[18, 21].flatMap((y) => row(36, 42, y)),
    ...[18, 21, 24, 27, 30].flatMap((y) => row(15, 20, y)),
    ...[25, 28, 31].flatMap((y) => row(44, 50, y)),
  ];
}

function row(start: number, end: number, y: number): GridPoint[] {
  return Array.from({ length: end - start + 1 }, (_, offset) => [start + offset, y]);
}

function column(x: number, start: number, end: number): GridPoint[] {
  return Array.from({ length: end - start + 1 }, (_, offset) => [x, start + offset]);
}

function uniquePoints(points: GridPoint[]): GridPoint[] {
  return points.filter(
    (point, index) => points.findIndex((other) => key(other) === key(point)) === index,
  );
}

function key([x, y]: GridPoint): string {
  return `${x},${y}`;
}

function toScreen([x, y]: GridPoint): { x: number; y: number } {
  const deltaX = x - 31;
  const deltaY = y - 32;
  return {
    x: Math.round(640 + deltaX * 15.625 + deltaY * 12.5),
    y: Math.round(360 - deltaX * 9.375 + deltaY * 12.5),
  };
}
