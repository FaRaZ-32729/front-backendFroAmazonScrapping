const { getRandomAgent } = require("../utils/browserManager");

// ─────────────────────────────────────────────────────────
// Verify a business address via Google Search
//
// Strategy:
//   1. Search Google: "BUSINESS NAME" + POSTCODE
//   2. Look for the Google Knowledge Panel or local result
//      which shows the address of the business
//   3. Compare the Google address with the stored Amazon address
//
// Returns:
//   {
//     googleAddress:      string | null,
//     googleAddressMatch: "match" | "partial" | "mismatch" | "not_found",
//     googleMatchReason:  string,
//     googleMapsUrl:      string | null
//   }
// ─────────────────────────────────────────────────────────

module.exports = async function verifyAddressOnGoogle(page, businessName, storedAddress, postcode) {

    try {

        console.log("Google address check:", businessName, "|", postcode || storedAddress);

        await page.setUserAgent(getRandomAgent());

        // ── Step 1: build search query ─────────────────────
        // Use business name + postcode for a tight result.
        // Fall back to full address if no postcode.

        const searchQuery = postcode
            ? `"${businessName}" ${postcode}`
            : `"${businessName}" ${storedAddress || ""}`;

        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&hl=en&gl=gb`;

        const loaded = await safeGoto(page, searchUrl);

        if (!loaded) {
            console.log("Google search page failed to load");
            return notFound("Google search page failed to load");
        }

        await randomDelay(2000, 3500);

        // ── Step 2: check for CAPTCHA / consent wall ───────

        const blocked = await page.evaluate(() => {
            const body = document.body.innerText.toLowerCase();
            return (
                body.includes("before you continue") ||
                body.includes("consent.google.com") ||
                body.includes("verify you're a human") ||
                document.querySelector('form[action*="consent"]') !== null
            );
        });

        if (blocked) {
            console.log("Google consent / CAPTCHA wall hit");
            // try to click "Accept all" on consent page
            const accepted = await tryAcceptConsent(page);
            if (!accepted) return notFound("Google consent wall — could not bypass");
            await randomDelay(2000, 3000);
        }

        // ── Step 3: extract address from result page ───────

        const result = await page.evaluate((biz) => {

            // ── A: Knowledge Panel address ─────────────────────
            // Google shows a knowledge panel on the right for
            // well-known businesses: address is in span[data-dtype="d3adr"]
            // or inside .LrzXr elements

            const kpAddress =
                document.querySelector('span[data-dtype="d3adr"]')?.innerText?.trim() ||
                document.querySelector('.LrzXr')?.innerText?.trim() ||
                document.querySelector('[data-attrid="kc:/location/location:address"]')
                    ?.querySelector('.LrzXr, .a61j6')
                    ?.innerText?.trim();

            if (kpAddress) {
                return { address: kpAddress, source: "knowledge_panel", mapsUrl: null };
            }

            // ── B: Local pack result (map pack) ───────────────
            // Google shows local pack results for business queries.
            // Each result has address in .rllt__details or .dbg0pd

            const localResults = document.querySelectorAll('.rllt__details, .VkpGBb');

            for (const result of localResults) {

                const titleEl = result.closest('[data-hveid]')?.querySelector('span.OSrXXb, .dbg0pd span');
                const title = titleEl?.innerText?.trim() || "";

                // only pick a result whose title contains part of our business name
                const bizWords = biz.toLowerCase().split(/\s+/);
                const titleLow = title.toLowerCase();
                const matches = bizWords.filter(w => w.length > 3 && titleLow.includes(w));

                if (matches.length === 0 && title !== "") continue;

                const spans = Array.from(result.querySelectorAll('span'));

                for (const span of spans) {
                    const txt = span.innerText?.trim();
                    // address-like: contains numbers and letters, more than 10 chars
                    if (txt && txt.length > 10 && /\d/.test(txt) && /[A-Z]{1,2}\d/i.test(txt)) {
                        return { address: txt, source: "local_pack", mapsUrl: null };
                    }
                }

            }

            // ── C: Google Maps link with address in href ───────
            // Sometimes address appears as part of a maps link text

            const mapLinks = Array.from(document.querySelectorAll('a[href*="maps.google"], a[href*="google.com/maps"]'));

            for (const link of mapLinks) {
                const nearby = link.closest('div')?.innerText?.trim();
                if (nearby && /\d/.test(nearby) && nearby.length > 10 && nearby.length < 200) {
                    return { address: nearby.split("\n")[0], source: "maps_link", mapsUrl: link.href };
                }
            }

            // ── D: Broader fallback — any address-like text ───
            // Look for UK postcode patterns near the business name

            const allText = document.body.innerText;
            const postcodeRegex = /([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})/gi;
            const postcodeMatches = [...allText.matchAll(postcodeRegex)];

            if (postcodeMatches.length > 0) {
                // return the first postcode found with surrounding context
                const match = postcodeMatches[0];
                const start = Math.max(0, match.index - 80);
                const ctx = allText.slice(start, match.index + match[0].length + 20)
                    .replace(/\n+/g, ", ")
                    .trim();
                return { address: ctx, source: "postcode_fallback", mapsUrl: null };
            }

            return null;

        }, businessName);

        if (!result || !result.address) {
            console.log("No address found on Google for:", businessName);
            return notFound("No address found in Google results");
        }

        console.log(`Google address [${result.source}]:`, result.address);

        // ── Step 4: compare addresses ──────────────────────

        const comparison = compareAddresses(storedAddress, result.address, postcode);

        console.log("Google address match:", comparison.status, "—", comparison.reason);

        return {
            googleAddress: result.address,
            googleAddressMatch: comparison.status,
            googleMatchReason: comparison.reason,
            googleMapsUrl: result.mapsUrl
        };

    } catch (err) {

        console.log("Google address scraper error:", err.message);
        return notFound(`Scraper error: ${err.message}`);

    }

};

// ─────────────────────────────────────────────────────────
// Address comparison (same logic as Companies House)
// ─────────────────────────────────────────────────────────

function compareAddresses(stored, google, postcode) {

    if (!stored || !google) {
        return { status: "not_found", reason: "One or both addresses missing" };
    }

    const norm = str =>
        str.toUpperCase()
            .replace(/[^A-Z0-9\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

    const storedNorm = norm(stored);
    const googleNorm = norm(google);

    if (storedNorm === googleNorm) {
        return { status: "match", reason: "Exact match after normalisation" };
    }

    // Postcode match — most reliable
    const postcodeRegex = /\b([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b/;

    const storedPC = (postcode || storedNorm).match(postcodeRegex)?.[1]?.replace(/\s/g, "");
    const googlePC = googleNorm.match(postcodeRegex)?.[1]?.replace(/\s/g, "");

    if (storedPC && googlePC) {
        if (storedPC === googlePC) {
            return { status: "match", reason: `Postcode match: ${storedPC}` };
        }
        return {
            status: "mismatch",
            reason: `Postcode mismatch — Amazon: ${storedPC} | Google: ${googlePC}`
        };
    }

    // Token overlap
    const STOPWORDS = new Set(["THE", "LTD", "LIMITED", "ROAD", "STREET", "LANE",
        "AVENUE", "CLOSE", "DRIVE", "UNIT", "FLOOR", "UK",
        "GB", "ENGLAND", "AND", "OF"]);

    const tokens = str =>
        str.split(" ").filter(t => t.length > 1 && !STOPWORDS.has(t));

    const storedTokens = tokens(storedNorm);
    const googleTokens = tokens(googleNorm);

    if (storedTokens.length === 0 || googleTokens.length === 0) {
        return { status: "not_found", reason: "Could not extract address tokens" };
    }

    const googleSet = new Set(googleTokens);
    const matchCount = storedTokens.filter(t => googleSet.has(t)).length;
    const score = matchCount / Math.max(storedTokens.length, googleTokens.length);

    if (score >= 0.7) return { status: "match", reason: `Token overlap ${Math.round(score * 100)}%` };
    if (score >= 0.4) return { status: "partial", reason: `Partial overlap ${Math.round(score * 100)}%` };

    return {
        status: "mismatch",
        reason: `Low overlap ${Math.round(score * 100)}% — Amazon: "${stored}" | Google: "${google}"`
    };

}

// ─────────────────────────────────────────────────────────
// Try to accept Google's consent dialog
// ─────────────────────────────────────────────────────────

async function tryAcceptConsent(page) {

    try {

        // common "Accept all" button selectors on Google consent
        const selectors = [
            'button[aria-label="Accept all"]',
            'button[id="L2AGLb"]',       // known Google consent button id
            'form:last-of-type button',  // fallback
        ];

        for (const sel of selectors) {
            const btn = await page.$(sel);
            if (btn) {
                await btn.click();
                await randomDelay(1500, 2500);
                return true;
            }
        }

        return false;

    } catch {
        return false;
    }

}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function notFound(reason) {
    return {
        googleAddress: null,
        googleAddressMatch: "not_found",
        googleMatchReason: reason,
        googleMapsUrl: null
    };
}

async function safeGoto(page, url, retries = 2) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
            return true;
        } catch (err) {
            console.log(`Navigation failed attempt ${attempt}:`, err.message);
            if (attempt < retries) await randomDelay(2000, 4000);
        }
    }
    return false;
}

function randomDelay(min, max) {
    const ms = Math.floor(Math.random() * (max - min)) + min;
    return new Promise(r => setTimeout(r, ms));
}