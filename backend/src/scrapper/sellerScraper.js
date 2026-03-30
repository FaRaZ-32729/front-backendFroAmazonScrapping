const { getRandomAgent } = require("../utils/browserManager");


module.exports = async function scrapeSellerProfile(page, sellerUrl) {

  try {

    console.log("Opening seller profile:", sellerUrl);

    await page.setUserAgent(getRandomAgent());

    const loaded = await safeGoto(page, sellerUrl);

    if (!loaded) {
      console.log("Failed to load seller profile page");
      return null;
    }

    await randomDelay(2000, 4000);

    const hasCaptcha = await page.$('form[action="/errors/validateCaptcha"]');

    if (hasCaptcha) {
      console.log("CAPTCHA on seller page — waiting");
      await randomDelay(30000, 35000);
      return null;
    }

    const data = await page.evaluate(() => {

      const result = {
        businessName: "",
        address: "",
        postcode: "",
        phoneNumber: null,
        email: null,
        sellerRating: "",
        ratingPercentage: "",
        totalRatings: "",
        pageUrl: window.location.href
      };

      // ─── Business Info Section ────────────────────────────

      const infoSection = document.querySelector("#page-section-detail-seller-info");

      if (infoSection) {

        const text = infoSection.innerText;

        // Business name
        const nameMatch = text.match(/Business Name:\s*(.+)/i);
        if (nameMatch) result.businessName = nameMatch[1].trim();

        // Address block — grab everything between "Business Address:" and the next blank line
        const addressMatch = text.match(/Business Address:\s*([\s\S]+?)(?:\n{2,}|$)/i);

        if (addressMatch) {
          const raw = addressMatch[1].trim();
          result.address = raw.replace(/\n+/g, ", ").replace(/,\s*,/g, ",").trim();

          // UK postcode inside address
          const pcMatch = raw.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b/i);
          if (pcMatch) result.postcode = pcMatch[1].toUpperCase();
        }

        // Phone number — Amazon labels it as "Phone number:" in seller info
        const phonePatterns = [
          /Phone(?:\s*number)?[:\s]+([+\d][\d\s\-().]{6,20})/i,
          /Tel(?:ephone)?[:\s]+([+\d][\d\s\-().]{6,20})/i,
          /Contact(?:\s*number)?[:\s]+([+\d][\d\s\-().]{6,20})/i
        ];

        for (const pattern of phonePatterns) {
          const match = text.match(pattern);
          if (match) {
            result.phoneNumber = match[1].trim();
            break;
          }
        }

        // Email — Amazon sometimes shows it in the info block
        const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) result.email = emailMatch[0].toLowerCase();

      }

      // ─── Fallback — scan full page body ──────────────────
      // Some sellers have contact info outside the info block

      const bodyText = document.body.innerText;

      // Postcode fallback
      if (!result.postcode) {
        const fallbackPc = bodyText.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b/i);
        if (fallbackPc) result.postcode = fallbackPc[1].toUpperCase();
      }

      // Phone fallback — only if not already found
      if (!result.phoneNumber) {

        const phoneFallback = bodyText.match(
          /(?:Phone|Tel|Telephone|Contact)(?:\s*number)?[:\s]+([+\d][\d\s\-().]{6,20})/i
        );

        if (phoneFallback) result.phoneNumber = phoneFallback[1].trim();

      }

      // Email fallback — only if not already found
      if (!result.email) {

        // exclude amazon's own domain to avoid false positives
        const emailFallback = bodyText.match(
          /[a-zA-Z0-9._%+\-]+@(?!amazon\.|sellercentral\.)([a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/
        );

        if (emailFallback) result.email = emailFallback[0].toLowerCase();

      }

      // ─── Ratings ─────────────────────────────────────────

      const percentMatch = bodyText.match(/(\d+)%\s+positive/i);
      if (percentMatch) {
        result.ratingPercentage = percentMatch[1] + "%";
        result.sellerRating = percentMatch[1];
      }

      const totalMatch = bodyText.match(/\(([\d,]+)\s+ratings?\)/i);
      if (totalMatch) {
        result.totalRatings = totalMatch[1].replace(/,/g, "");
      }

      return result;

    });

    console.log(
      "Seller scraped:",
      data.businessName || "(no name)",
      "| Postcode:", data.postcode || "—",
      "| Phone:", data.phoneNumber || "—",
      "| Email:", data.email || "—"
    );

    return data;

  } catch (err) {

    console.log("Seller scraper error:", err.message);
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

      console.log(`Seller page load failed attempt ${attempt}:`, err.message);
      if (attempt < retries) await randomDelay(3000, 5000);

    }

  }

  return false;

}

function randomDelay(min, max) {
  const ms = Math.floor(Math.random() * (max - min)) + min;
  return new Promise(r => setTimeout(r, ms));
}