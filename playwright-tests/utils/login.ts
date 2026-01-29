import { Page, expect } from "@playwright/test";

export async function login(page: Page, username: string, password: string) {
  await page.goto("/"); 
  
  await page.getByLabel(/username/i).fill(username);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /login/i }).click();

  await expect(page.getByText(new RegExp(username, "i"))).toBeVisible();
}
