import { test, expect, type BrowserContext, type Page } from "@playwright/test";

const adminEmail = process.env.ADMIN_EMAIL ?? "admin@local.test";
const adminPassword = process.env.ADMIN_PASSWORD ?? "change-this-local-admin";

test("admin auth flow and panel navigation", async ({ page }) => {
  await loginAsAdmin(page);

  await expect(
    page.getByRole("heading", { name: "Painel de sincronizacao" })
  ).toBeVisible();
  await expect(page.getByText("Snapshot persistido")).toBeVisible();
  await expect(page.getByText("Historico recente")).toBeVisible();

  await page.getByRole("link", { name: "configuracoes" }).click();
  await page.waitForURL("**/admin/configuracoes");
  await expect(
    page.locator(".card").getByText("Configuracoes de sincronizacao").first()
  ).toBeVisible();
  await expect(page.getByText("Intervalo em minutos")).toBeVisible();

  await page.getByRole("link", { name: "dashboard" }).click();
  await page.waitForURL("**/admin/dashboard");

  await logout(page);
  await expect(page.getByRole("heading", { name: "Entrar no painel" })).toBeVisible();
});

test("admin can update sync configuration", async ({ page }) => {
  const adminCookie = await loginAsAdmin(page);

  await page.goto("/admin/configuracoes");
  await expect(page.getByText("Intervalo em minutos")).toBeVisible();

  const updateResponse = await page.request.patch("/api/admin/settings", {
    headers: {
      Cookie: `admin_session=${adminCookie}`
    },
    data: {
      isEnabled: false,
      intervalMinutes: 22
    }
  });

  expect(updateResponse.ok()).toBeTruthy();
  await page.reload();
  await expect(page.getByLabel("Sincronizacao automatica")).toHaveValue("disabled");
  await expect(page.getByLabel("Intervalo em minutos")).toHaveValue("22");

  const restoreResponse = await page.request.patch("/api/admin/settings", {
    headers: {
      Cookie: `admin_session=${adminCookie}`
    },
    data: {
      isEnabled: true,
      intervalMinutes: 15
    }
  });

  expect(restoreResponse.ok()).toBeTruthy();
  await page.reload();
  await expect(page.getByLabel("Sincronizacao automatica")).toHaveValue("enabled");
  await expect(page.getByLabel("Intervalo em minutos")).toHaveValue("15");
});

test("admin can trigger sync now from dashboard", async ({ page }) => {
  const adminCookie = await loginAsAdmin(page);

  await page.goto("/admin/dashboard");
  await expect(page.getByRole("button", { name: "sync now" })).toBeVisible();

  const syncResponse = await page.request.post("/api/admin/sync", {
    headers: {
      Cookie: `admin_session=${adminCookie}`
    }
  });

  expect(syncResponse.ok()).toBeTruthy();
  const body = await syncResponse.json();
  expect(body.execution?.status).toBe("success");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Ultima execucao" })).toBeVisible();
  await expect(page.getByText("Historico recente")).toBeVisible();
});

async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: "Entrar no painel" })).toBeVisible();

  const loginResponse = await page.request.post("/api/admin/auth", {
    data: {
      email: adminEmail,
      password: adminPassword
    }
  });
  expect(loginResponse.ok()).toBeTruthy();

  const setCookie = loginResponse.headers()["set-cookie"];
  expect(setCookie).toContain("admin_session=");
  const cookieValue = /admin_session=([^;]+)/.exec(setCookie)?.[1];
  expect(cookieValue).toBeTruthy();

  await addAdminCookie(page.context(), cookieValue!);
  await page.goto("/admin/dashboard");

  return cookieValue!;
}

async function logout(page: Page) {
  const logoutResponse = await page.request.delete("/api/admin/auth");
  expect(logoutResponse.ok()).toBeTruthy();

  await page.context().clearCookies();
  await page.goto("/admin/dashboard");
  await page.waitForURL("**/admin/login");
}

async function addAdminCookie(context: BrowserContext, value: string) {
  await context.addCookies([
    {
      name: "admin_session",
      value,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax"
    }
  ]);
}
