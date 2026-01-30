const { test, expect } = require("@playwright/test");

test("TC_001 - Verify Login Redirection and Profile data display", async ({ page }) => {
  test.setTimeout(60000);

  const email = "abineshakilan@gmail.com";
  const password = "password123";

  async function forceSingapore() {
    await page.addInitScript(() => {
      localStorage.setItem("urlPrefix", "SG");
      localStorage.setItem("countryPrefix", "SG");
      localStorage.setItem("country", "SG");
      localStorage.setItem("selectedCountry", "SG");
      localStorage.setItem("countrySelected", "true");
      localStorage.setItem("isCountrySelected", "true");

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
    await expect(page).toHaveURL(/\/B\/SG\/index\.html/);
  }

  async function loginToProfile(userEmail, userPassword) {
    await forceSingapore();

    await page.goto("/B/SG/memberLogin.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#emailLogin")).toBeVisible();

    await page.fill("#emailLogin", userEmail);
    await page.fill("#passwordLogin", userPassword);

    await Promise.all([
      page.waitForURL(/\/B\/SG\/(memberProfile\.html|memberLogin\.html\?errMsg=)/, { timeout: 15000 }),
      page.locator('input[value="Login"]').click(),
    ]);

    if (page.url().includes("memberLogin.html?errMsg=")) {
      const err = decodeURIComponent(page.url().split("errMsg=")[1] || "");
      throw new Error(`LOGIN FAILED: ${err}`);
    }

    await expect(page).toHaveURL(/\/B\/SG\/memberProfile\.html/);
    await expect(page.locator("#profileForm")).toBeVisible();
  }

  async function getMemberFromSession() {
    // wait until sessionStorage.member exists (your page reads it on DOMContentLoaded)
    await expect.poll(async () => {
      return await page.evaluate(() => sessionStorage.getItem("member"));
    }, { timeout: 10000 }).not.toBeNull();

    return await page.evaluate(() => JSON.parse(sessionStorage.getItem("member")));
  }

  async function expectHeaderShowsUser(memberName) {
    // CSS-only candidates
    const cssCandidates = [
      "#welcomeMsg",
      "#welcomeUser",
      ".header-top-right",
      ".header-nav-top",
      "header",
    ];

    // 1) Try “Welcome” anywhere (Playwright text selector)
    const welcomeText = page.getByText(/welcome/i);
    if (await welcomeText.first().isVisible().catch(() => false)) return;

    // 2) Try username text anywhere
    const nameText = page.getByText(new RegExp(memberName, "i"));
    if (await nameText.first().isVisible().catch(() => false)) return;

    // 3) Try common header containers and check their innerText
    for (const sel of cssCandidates) {
      const loc = page.locator(sel).first();
      if (!(await loc.count())) continue;

      const visible = await loc.isVisible().catch(() => false);
      if (!visible) continue;

      const txt = (await loc.innerText().catch(() => "")) || "";
      if (/welcome/i.test(txt) || new RegExp(memberName, "i").test(txt)) return;
    }

    throw new Error(`Could not find welcome/name text in header. Need the exact selector from header.js output.`);
  }

  await loginToProfile(email, password);

  const member = await getMemberFromSession();


  if (member?.name) {
    await expectHeaderShowsUser(member.name);
  }

  await expect(page.locator("#email")).toHaveValue(member.email);
  await expect(page.locator("#name")).toHaveValue(member.name || "");
  await expect(page.locator("#phone")).toHaveValue(member.phone || "");
  await expect(page.locator("#address")).toHaveValue(member.address || "");

  await expect(page.locator("#phone")).not.toHaveValue("");
  await expect(page.locator("#address")).not.toHaveValue("");

  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("token"))).not.toBeNull();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("urlPrefix"))).toBe("SG");
});
