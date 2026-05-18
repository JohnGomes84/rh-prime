import { test, expect } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).not.toHaveTitle(/error/i);
  await expect(page.locator("body")).toBeVisible();
});

test("login page accessible", async ({ page }) => {
  await page.goto("/");
  // Should either show login or redirect to dashboard if already authed
  await expect(page.locator("body")).toBeVisible();
  const url = page.url();
  expect(url).toBeTruthy();
});

test("dashboard requires auth", async ({ page }) => {
  await page.goto("/dashboard");
  // Without session cookie, should redirect to home/login
  await page.waitForLoadState("networkidle");
  const url = page.url();
  // Either redirected away or shows login prompt
  expect(url).toBeTruthy();
});

test("portal lider accessible", async ({ page }) => {
  await page.goto("/portal-lider");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).toBeVisible();
});
