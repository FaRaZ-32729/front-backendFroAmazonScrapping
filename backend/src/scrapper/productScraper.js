const { getRandomAgent } = require("../utils/browserManager");

module.exports = async function scrapeProductSeller(page, productUrl) {

  try {

    console.log("Opening product page:", productUrl);

    await page.setUserAgent(getRandomAgent());

    const loaded = await safeGoto(page, productUrl);

    if (!loaded) {
      console.log("Failed to load product page");
      return null;
    }

    await randomDelay(2500, 5000);

    const hasCaptcha = await page.$('form[action="/errors/validateCaptcha"]');

    if (hasCaptcha) {
      console.log("CAPTCHA on product page — waiting");
      await randomDelay(30000, 35000);
      return null;
    }

    const sellerData = await page.evaluate(() => {

      let sellerName = null;
      let sellerLink = null;
      let shipsFrom = "";
      let soldBy = "";

      // Layout 1 — standard merchantInfo block
      const merchantBlock = document.querySelector("#merchantInfo");

      if (merchantBlock) {

        const anchor = merchantBlock.querySelector("a");

        if (anchor) {
          sellerName = anchor.innerText.trim();
          sellerLink = anchor.href;
          soldBy = sellerName;
        }

      }

      // Layout 2 — tabular buybox (common on UK listings)
      if (!sellerLink) {

        const rows = document.querySelectorAll("#tabular-buybox tr");

        rows.forEach(row => {

          const label = row.querySelector(".a-text-bold");
          if (!label) return;

          const labelText = label.innerText.trim().toLowerCase();

          if (labelText.includes("sold by")) {
            const a = row.querySelector("a");
            if (a) {
              sellerName = a.innerText.trim();
              sellerLink = a.href;
              soldBy = sellerName;
            }
          }

          if (labelText.includes("ships from")) {
            const valueSpan = row.querySelector("span:not(.a-text-bold)");
            if (valueSpan) shipsFrom = valueSpan.innerText.trim();
          }

        });

      }

      // Layout 3 — older style seller trigger
      if (!sellerLink) {

        const trigger = document.querySelector("#sellerProfileTriggerId");

        if (trigger) {
          sellerName = trigger.innerText.trim();
          sellerLink = trigger.href;
          soldBy = sellerName;
        }

      }

      // Layout 4 — newer offer display
      if (!sellerLink) {

        const soldByEl = document.querySelector(
          "#corePriceDisplay_desktop_feature_div a, #apex_desktop a[href*='/sp']"
        );

        if (soldByEl) {
          sellerName = soldByEl.innerText.trim();
          sellerLink = soldByEl.href;
          soldBy = sellerName;
        }

      }

      // Ships from fallback
      if (!shipsFrom) {

        const shipsFromEl = document.querySelector(
          "#fulfillerInfoFeature_feature_div .offer-display-feature-text-message"
        );

        if (shipsFromEl) {
          shipsFrom = shipsFromEl.innerText.trim();
        }

      }

      // Determine fulfillment type
      const ships = shipsFrom.toLowerCase();
      const sold = soldBy.toLowerCase();

      let fulfillment = "Unknown";

      if (ships.includes("amazon") && sold.includes("amazon")) {
        fulfillment = "Vendor";
      } else if (ships.includes("amazon")) {
        fulfillment = "FBA";
      } else if (sold && sold !== "amazon") {
        fulfillment = "FBM";
      }

      return { sellerName, sellerLink, shipsFrom, soldBy, fulfillment };

    });

    console.log("Seller extracted:", sellerData.sellerName, "|", sellerData.fulfillment);

    if (!sellerData.sellerLink) {
      console.log("No seller link — unsupported layout");
      return null;
    }

    // skip brand stores — they don't have a seller profile page
    if (sellerData.sellerLink.includes("/stores/")) {
      console.log("Brand store detected — skipping");
      return null;
    }

    return sellerData;

  } catch (err) {

    console.log("Product scraper error:", err.message);
    return null;

  }

};

// ─── Helpers ──────────────────────────────────────────────

async function safeGoto(page, url, retries = 2) {

  for (let attempt = 1; attempt <= retries; attempt++) {

    try {

      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000
      });

      return true;

    } catch (err) {

      console.log(`Goto failed attempt ${attempt}:`, err.message);

      if (attempt < retries) await randomDelay(3000, 5000);

    }

  }

  return false;

}

function randomDelay(min, max) {
  const ms = Math.floor(Math.random() * (max - min)) + min;
  return new Promise(r => setTimeout(r, ms));
}