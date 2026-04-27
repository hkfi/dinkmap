import { expect, test } from "@playwright/test";

test("loads the court map and opens a court detail route", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "DinkMap" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Crotona Park" })).toBeVisible();

  await page.getByRole("link", { name: /Details/i }).first().click();
  await expect(page).toHaveURL(/\/courts\//);
  await expect(page.getByRole("link", { name: /Back to map/i })).toBeVisible();
});

test("opens filters and exposes core controls", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Open filters").click();
  await expect(page.getByRole("heading", { name: "Filters" })).toBeVisible();
  await expect(page.getByText("Accessible courts only")).toBeVisible();
  await expect(page.getByText("Near me")).toBeVisible();
});

test("map supports scroll zoom and court point selection", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => Boolean(window.__pickleballMap?.isStyleLoaded()));

  const beforeZoom = await page.evaluate(() => window.__pickleballMap!.getZoom());
  const mapBox = await page.locator(".maplibregl-canvas").boundingBox();
  expect(mapBox).not.toBeNull();

  await page.mouse.move(mapBox!.x + mapBox!.width / 2, mapBox!.y + 120);
  await page.mouse.wheel(0, -650);
  await expect
    .poll(() => page.evaluate(() => window.__pickleballMap!.getZoom()))
    .toBeGreaterThan(beforeZoom);

  const visibleCourt = await page.evaluate(() => {
    window.__pickleballMap!.jumpTo({ center: [-73.94, 40.8], zoom: 9.45 });
    const canvas = window.__pickleballMap!.getCanvas();
    const feature = window
      .__pickleballMap!.queryRenderedFeatures(
        [
          [24, 80],
          [canvas.clientWidth - 24, Math.min(360, canvas.clientHeight - 260)],
        ],
        { layers: ["court-points"] },
      )
      .find((item) => item.geometry.type === "Point");
    if (!feature || feature.geometry.type !== "Point") return null;
    const point = window.__pickleballMap!.project(feature.geometry.coordinates as [number, number]);
    const rect = window.__pickleballMap!.getCanvas().getBoundingClientRect();
    return {
      name: String(feature.properties?.name),
      x: rect.left + point.x,
      y: rect.top + point.y,
    };
  });

  if (!visibleCourt) throw new Error("No visible court point found in the map viewport");
  await page.mouse.click(visibleCourt.x, visibleCourt.y);
  await expect(page.getByRole("heading", { name: visibleCourt.name }).last()).toBeVisible();
});
