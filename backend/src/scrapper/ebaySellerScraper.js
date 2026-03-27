// src/scrapper/ebaySellerScraper.js
const { getRandomAgent } = require("../utils/ebayBrowserManager");

module.exports = async function ebaySellerScraper(page, listingUrl) {
    try {
        await page.setUserAgent(getRandomAgent());

        const loaded = await safeGoto(page, listingUrl);
        if (!loaded) return null;

        await humanPause(page, 2500, 5000);

        const data = await page.evaluate(() => {
            const title =
                document.querySelector('h1.x-item-title__mainTitle span')?.innerText?.trim() ||
                document.querySelector('h1[itemprop="name"]')?.innerText?.trim() || null;

            // Robust seller link extraction
            const sellerLinkEl = document.querySelector('a[href*="/str/"], a[href*="/usr/"], .ux-seller-section__item--seller a, [data-testid="str-title"] a');

            let username = null;
            let sellerHref = null;
            let businessName = null;

            if (sellerLinkEl) {
                // Extract clean username (e.g., "marcosenterprise")
                const match = sellerLinkEl.href.match(/\/(?:str|usr)\/([^/?#]+)/);
                if (match) {
                    username = match[1].toLowerCase().trim();
                }

                // Get displayed business name
                businessName = sellerLinkEl.innerText ? sellerLinkEl.innerText.trim() : (username || null);

                // Build clean seller base URL (without any tracking params)
                sellerHref = `https://www.ebay.co.uk/str/${username}`;
            }

            return { title, username, sellerHref, businessName };
        });

        if (!data.username) {
            console.log("→ Could not extract seller username from listing");
            return null;
        }

        console.log(`Extracted seller: ${data.username} | Display name: ${data.businessName || '—'}`);

        // ── CLEAN About URL (exactly what you want) ─────────────────────
        const aboutUrl = `https://www.ebay.co.uk/str/${data.username}?_tab=about`;

        return {
            sellerId: data.username,
            sellerName: data.businessName || data.username,
            sellerLink: data.sellerHref || `https://www.ebay.co.uk/str/${data.username}`,
            aboutUrl,                                      // ← Clean URL
            listingUrl: listingUrl,
            listingTitle: data.title,
            businessName: data.businessName || null,
            // Phase 2 fields
            address: null,
            postcode: null,
            email: null,
            phoneNumber: null,
            vatNumber: null,
            registrationNumber: null,
            fulfillment: "FBM"
        };

    } catch (err) {
        console.log("ebaySellerScraper (Phase 1) error:", err.message);
        return null;
    }
};

// ── Helpers (unchanged) ─────────────────────────────────────────────
async function safeGoto(page, url, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await randomDelay(1500, 4000);
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
            await randomDelay(2000, 5000);
            return true;
        } catch (err) {
            console.log(`safeGoto failed (attempt ${attempt}):`, err.message);
            if (attempt < retries) await randomDelay(3000, 6000);
        }
    }
    return false;
}

async function humanPause(page, min, max) {
    await randomDelay(min, max);
    try {
        const x = 300 + Math.floor(Math.random() * 400);
        const y = 200 + Math.floor(Math.random() * 300);
        await page.mouse.move(x, y, { steps: 5 });
    } catch { }
}

async function randomDelay(min, max) {
    const ms = Math.floor(Math.random() * (max - min)) + min;
    return new Promise(r => setTimeout(r, ms));
}