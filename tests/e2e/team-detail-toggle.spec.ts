import { expect, test } from "@playwright/test";

test("team detail toggle alternates between field and list views", async ({ page }) => {
  await page.goto("/times/p01?round=2&view=field");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("tablist", { name: "Modo de visualização" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Campo/i })).toHaveAttribute(
    "aria-current",
    "page"
  );

  await page.getByRole("link", { name: /Lista/i }).click();
  await page.waitForURL(/view=list/);
  await expect(page.getByRole("heading", { name: "Lista do time principal" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reservas" })).toBeVisible();

  await page.getByRole("link", { name: /Campo/i }).click();
  await page.waitForURL(/view=field/);
  await expect(page.getByRole("heading", { name: "Minha Escalação" })).toBeVisible();
});
