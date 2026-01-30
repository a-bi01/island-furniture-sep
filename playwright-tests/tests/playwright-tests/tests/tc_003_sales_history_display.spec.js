const { test, expect } = require("@playwright/test");

test("TC_003 - Sales History shows multiple orders (regression: previously only 1 order)", async ({ page }) => {
  test.setTimeout(240000);

  const email = "abiiinesh07@gmail.com";
  const passwordCandidates = ["12345678", "NewPass123!", "123456789"];

  const CATEGORY_NAME = "Tables & Desks";
  const PRODUCT_NAME = "LINMON";

async function hardResetStorage() {
  await page.goto("/B/index.html", { waitUntil: "domcontentloaded" });

  await page.context().clearCookies();

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

async function ensureSingaporeSelected() {
  await page.goto("/B/selectCountry.html", { waitUntil: "domcontentloaded" });

  const sg = page.getByRole("link", { name: /^SINGAPORE$/i });

  await expect(sg).toBeVisible({ timeout: 15000 });
  await sg.scrollIntoViewIfNeeded();

  for (let attempt = 1; attempt <= 3; attempt++) {
    const nav = page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {});

    await sg.click({ force: true });
    await nav;

    const ok = await page.waitForFunction(() => {
      return !!localStorage.getItem("countryId") && !!localStorage.getItem("urlPrefix");
    }, null, { timeout: 8000 }).then(() => true).catch(() => false);

    if (ok) break;

    if (attempt < 3) {
      await page.goto("/B/selectCountry.html", { waitUntil: "domcontentloaded" });
      await expect(sg).toBeVisible({ timeout: 15000 });
    } else {
      const state = await page.evaluate(() => ({
        urlPrefix: localStorage.getItem("urlPrefix"),
        countryId: localStorage.getItem("countryId"),
        storeLocation: localStorage.getItem("storeLocation"),
        region: localStorage.getItem("region"),
      }));
      throw new Error(
        "Singapore click did not set localStorage after 3 attempts.\n" +
        JSON.stringify(state, null, 2)
      );
    }
  }

  await page.goto("/B/SG/index.html", { waitUntil: "domcontentloaded" });
}


  async function loginWithOnePassword(userEmail, userPassword) {
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

    await expect(page.getByText(/User Profile/i)).toBeVisible({ timeout: 15000 });
  }

  async function resolveCurrentPassword() {
    for (const pw of passwordCandidates) {
      try {
        await loginWithOnePassword(email, pw);
        return pw;
      } catch {
      }
    }
    throw new Error("Could not login with any passwordCandidates. Update the array.");
  }

  async function gotoCategoryAndAssertProducts(categoryName) {
    const cat = encodeURIComponent(categoryName);

    const respPromise = page.waitForResponse(
      (r) => r.url().includes("/api/getFurnitureByCat") && r.request().method() === "GET",
      { timeout: 20000 }
    );

    await page.goto(`/B/SG/furnitureCategory.html?cat=${cat}`, { waitUntil: "domcontentloaded" });

    const resp = await respPromise;
    let data;
    try {
      data = await resp.json();
    } catch {
      const txt = await resp.text().catch(() => "");
      throw new Error(
        `getFurnitureByCat did not return JSON. status=${resp.status()}\n` +
        `body preview=${txt.slice(0, 200)}`
      );
    }

    if (!Array.isArray(data) || data.length === 0) {
      const ls = await page.evaluate(() => ({
        countryId: localStorage.getItem("countryId"),
        urlPrefix: localStorage.getItem("urlPrefix"),
        storeLocation: localStorage.getItem("storeLocation"),
        region: localStorage.getItem("region"),
      }));
      throw new Error(
        `Products did not render: /api/getFurnitureByCat returned empty.\n` +
        `status=${resp.status()} url=${resp.url()}\n` +
        `localStorage=${JSON.stringify(ls, null, 2)}`
      );
    }

    await expect(page.getByText(categoryName)).toBeVisible({ timeout: 15000 });
  }

  async function addOneItemToCartFromCategory() {
    await gotoCategoryAndAssertProducts(CATEGORY_NAME);

    const addBtn = page.getByRole("button", { name: /add to cart/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 15000 });

    await Promise.all([
      page.waitForURL(/furnitureCategory\.html\?cat=.*(goodMsg|errMsg)=/i, { timeout: 20000 }),
      addBtn.click(),
    ]);

    if (page.url().includes("errMsg=")) {
      const err = decodeURIComponent(page.url().split("errMsg=")[1] || "");
      throw new Error(`Add To Cart failed: ${err}`);
    }
  }

  async function openCart() {
  await page.goto("/B/SG/shoppingCart.html", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: /^Shopping Cart$/i })).toBeVisible({ timeout: 20000 });

  await expect.poll(async () => {
    const hasCheckout = (await page.locator("#btnCheckout").count()) > 0;
    const rowCount = await page.locator("#cartBody tr.cart_table_item").count();
    return hasCheckout || rowCount > 0;
  }, { timeout: 20000 }).toBeTruthy();
}

  async function confirmCheckoutModal() {
    const checkoutBtn = page.locator("#btnCheckout");
    await expect(checkoutBtn).toBeVisible({ timeout: 20000 });
    await checkoutBtn.click();

    const confirmBtn = page.locator('#checkoutModal input[value="Confirm"]').first();
    await expect(confirmBtn).toBeVisible({ timeout: 15000 });
    await confirmBtn.click();
  }

  async function fillDeliveryDetails() {
    await expect(page.locator("#deliveryForm")).toBeVisible({ timeout: 20000 });

    await page.fill("#txtName", "Test User");
    await page.fill("#txtContact", "91234567");
    await page.fill("#txtAddress", "123 Test Street, Singapore");

    const postal = String(100000 + Math.floor(Math.random() * 900000));
    await page.fill("#txtPostalCode", postal);
  }

async function fillStripeCard() {
  await page.locator('input[type="radio"][value="add"]').check({ force: true }).catch(() => {});
  await expect(page.locator("#newCardDiv")).toBeVisible({ timeout: 20000 });

  const saveCard = page.locator("#saveCard");
  if (await saveCard.count()) {
    await saveCard.uncheck({ force: true }).catch(() => {});
  }

  const cardFrame = page.frameLocator('iframe[title="Secure card payment input frame"]');

  await cardFrame.locator('input[name="cardnumber"], input[autocomplete="cc-number"]').fill("4242424242424242");
  await cardFrame.locator('input[name="exp-date"], input[autocomplete="cc-exp"]').fill("12/30");
  await cardFrame.locator('input[name="cvc"], input[autocomplete="cc-csc"]').fill("123");
}


async function makePaymentAndAssertSuccess() {
  const payBtn = page.locator("#makePayment");
  await expect(payBtn).toBeVisible({ timeout: 20000 });
  await payBtn.scrollIntoViewIfNeeded();

  await expect(page.locator("#card-errors")).toHaveText("", { timeout: 20000 });

  await payBtn.click();

  await expect(page).toHaveURL(/shoppingCart\.html\?goodMsg=Successfully(%20|\s)Paid/i, { timeout: 60000 });
  await expect(page.getByText(/Successfully Paid/i)).toBeVisible({ timeout: 60000 });
}

  async function placeOneOrder() {
    await addOneItemToCartFromCategory();
    await openCart();
    await confirmCheckoutModal();
    await fillDeliveryDetails();
    await fillStripeCard();
    await makePaymentAndAssertSuccess();
  }

  async function openSalesHistoryTab() {
    await page.goto("/B/SG/memberProfile.html", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/User Profile/i)).toBeVisible({ timeout: 15000 });

    const salesTab = page.locator('a[href="#salesHistory"], a:has-text("Sales History")').first();
    await salesTab.click();

    await expect(page.locator("#salesHistoryTab")).toBeVisible({ timeout: 15000 });

    await expect.poll(async () => {
      const txt = await page.locator("#salesHistoryTab").innerText();
      return (txt || "").trim().length;
    }, { timeout: 20000 }).toBeGreaterThan(0);
  }

  async function getOrderCount() {
    await openSalesHistoryTab();
    return await page.locator('#salesHistoryTab h5:has-text("Order #")').count();
  }

  await hardResetStorage();
  await ensureSingaporeSelected();

  await resolveCurrentPassword();

  const before = await getOrderCount();

  await placeOneOrder();
  const after1 = await getOrderCount();
  expect(after1).toBeGreaterThanOrEqual(before + 1);

  await placeOneOrder();
  const after2 = await getOrderCount();
  expect(after2).toBeGreaterThanOrEqual(after1 + 1);

  await expect(page.locator("#salesHistoryTab")).toContainText(new RegExp(PRODUCT_NAME, "i"));
  await expect(page.locator("#salesHistoryTab")).toContainText(/Image|Product|Price|Quantity|Subtotal/i);
});
