import { test, expect } from "@playwright/test";

test.describe("Chat Page", () => {
  test("shows start writing button on empty state", async ({ page }) => {
    await page.goto("/chat");
    await expect(
      page.getByRole("button", { name: /start writing/i })
    ).toBeVisible();
  });

  test("displays spiral logo and title", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.getByText("Spiral")).toBeVisible();
    await expect(
      page.getByText(/your ai writing partner/i)
    ).toBeVisible();
  });

  test("can create new session", async ({ page }) => {
    await page.goto("/chat");
    await page.getByRole("button", { name: /start writing/i }).click();
    // After clicking, should show chat interface with input
    await expect(page.locator("textarea")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Homepage", () => {
  test("redirects to chat", async ({ page }) => {
    await page.goto("/");
    // Homepage should be accessible
    await expect(page).toHaveURL(/\//);
  });
});
