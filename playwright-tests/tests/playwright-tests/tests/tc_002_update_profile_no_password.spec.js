const { test, expect } = require("@playwright/test");

test("TC_002 - Update profile without password, then change password", async ({ page }) => {
  test.setTimeout(120000);

  const email = "abiiinesh07@gmail.com";
  const oldPassword = "12345678";
  const newPassword = "NewPass123!";
  const newAddress = "123 New Street, Singapore";
  const altPassword = "123456789"; 


  async function forceSingapore() {
    await page.addInitScript(() => {
      localStorage.setItem("urlPrefix", "SG");
      localStorage.setItem("countryPrefix", "SG");
      localStorage.setItem("country", "SG");
      localStorage.setItem("selectedCountry", "SG");
      localStorage.setItem("storeLocation", "SG");
      localStorage.setItem("region", "SG");
      localStorage.setItem("isCountrySelected", "true");
      localStorage.setItem("countrySelected", "true");

      const originalAssign = window.location.assign.bind(window.location);
      const originalReplace = window.location.replace.bind(window.location);

      window.location.assign = (url) => {
        if (String(url).includes("selectCountry.html")) return;
        return originalAssign(url);
      };

      window.location.replace = (url) => {
        if (String(url).includes("selectCountry.html")) return;
        return originalReplace(url);
      };
    });

    await page.goto("/B/SG/index.html", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/B\/SG\/(index\.html)?$/, { timeout: 15000 });
  }

  async function login(userEmail, userPassword) {
    await forceSingapore();
    await page.goto("/B/SG/memberLogin.html", { waitUntil: "domcontentloaded" });

    await page.locator("#emailLogin").waitFor({ state: "visible", timeout: 15000 });
    await page.fill("#emailLogin", userEmail);
    await page.fill("#passwordLogin", userPassword);

    await Promise.all([
      page.waitForURL(/\/B\/SG\/(memberProfile\.html|memberLogin\.html\?errMsg=)/, { timeout: 15000 }),
      page.locator('input[value="Login"]').click(),
    ]);

    if (page.url().includes("memberLogin.html?errMsg=")) {
      const err = decodeURIComponent(page.url().split("errMsg=")[1] || "");
      throw new Error(`LOGIN FAILED with password "${userPassword}": ${err}`);
    }
  }

async function logout() {
  await page.context().clearCookies();
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
}

  async function clickSubmitAndDismissDialog(expectedRegex) {
    const submitBtn = page.locator('input[value="Submit"]');

    let msg = "";
    page.once("dialog", async (dialog) => {
      msg = dialog.message();
      await dialog.dismiss();
    });

    await submitBtn.click({ noWaitAfter: true });

    await expect.poll(() => msg, { timeout: 5000 }).not.toBe("");
    expect(msg).toMatch(expectedRegex);
  }

async function resolveCurrentPassword() {
  const candidates = [oldPassword, newPassword, altPassword];
  for (const pw of candidates) {
    try {
      await login(email, pw);
      return pw; 
    } catch (e) {
    }
  }
  throw new Error("Could not login with old/new/alt passwords. Password is something else now.");
}

let currentPassword = await resolveCurrentPassword();
const targetPassword = currentPassword === newPassword ? altPassword : newPassword;
  await expect(page.locator("#profileForm")).toBeVisible();

  await page.fill("#address", newAddress);
  await page.fill("#oldPassword", "");
  await page.fill("#password", "");
  await page.fill("#repassword", "");
  await page.locator('input[value="Submit"]').click();
  await page.waitForURL(/goodMsg=Successfully%20Updated!/i, { timeout: 15000 });

  await logout();
  await login(email, currentPassword);
  await expect(page.locator("#address")).toHaveValue(newAddress);

  await page.fill("#oldPassword", currentPassword);
  await page.fill("#password", "");
  await page.fill("#repassword", "");
  await clickSubmitAndDismissDialog(/To change password/i);

  await page.fill("#oldPassword", "wrongpass");
await page.fill("#password", targetPassword);
await page.fill("#repassword", targetPassword);
  await clickSubmitAndDismissDialog(/incorrect|Old Password|fail|error/i);

const previousPassword = currentPassword;

await page.fill("#oldPassword", currentPassword);
await page.fill("#password", targetPassword);
await page.fill("#repassword", targetPassword);
await page.locator('input[value="Submit"]').click();
await page.waitForURL(/goodMsg=Successfully%20Updated!/i, { timeout: 15000 });

currentPassword = targetPassword; 

  await logout();
  await login(email, currentPassword);

  await logout();
  await page.goto("/B/SG/memberLogin.html", { waitUntil: "domcontentloaded" });
  await page.fill("#emailLogin", email);
  await page.fill("#passwordLogin", previousPassword);
  await page.locator('input[value="Login"]').click();
  await page.waitForURL(/memberLogin\.html\?errMsg=/, { timeout: 15000 });
});
