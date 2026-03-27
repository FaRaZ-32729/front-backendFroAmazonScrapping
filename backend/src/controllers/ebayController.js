// controllers/ebayController.js
// FULLY UPDATED with your exact request:
// 1. Phase 1 now saves: listingUrl (page link), businessName (from listing), aboutUrl
// 2. Deduplication still happens via visitedSellers + Mongo upsert on sellerId
// 3. Phase 2 opens the saved aboutUrl, extracts details, checks UK address,
//    updates schema ONLY if UK, otherwise ignores (deletes the lead so you only keep real UK businesses)

const { launchBrowser } = require("../utils/ebayBrowserManager");
const ebaySearchScraper = require("../scrapper/ebaySearchScraper");
const ebaySellerScraper = require("../scrapper/ebaySellerScraper");
const EbayLead = require("../models/ebayLeadModel");

const EST = {
    PAGE_SCRAPE_SEC: 180,
    LISTING_SEC: 8,
    LEADS_PER_PAGE: 10,
};

function send(res, event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function fmtTime(seconds) {
    const s = Math.round(seconds);
    if (s < 60) return `~${s}s`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r > 0 ? `~${m}m ${r}s` : `~${m}m`;
}

// ── UK address helper (moved here so Phase 2 can use it) ─────────────────────
function isUK(address, postcode) {
    const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;
    const upper = (address || "").toUpperCase();
    return (
        UK_POSTCODE.test((postcode || "").trim()) ||
        upper.endsWith(", UK") ||
        upper.endsWith(", GB") ||
        upper.includes("UNITED KINGDOM") ||
        upper.includes(", ENGLAND") ||
        upper.includes(", SCOTLAND") ||
        upper.includes(", WALES")
    );
}

// Helper to update full business details (Phase 2) — NOW WITH UK FILTER
async function enrichSellerWithAboutPage(lead) {
    const browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    try {
        console.log(`[Phase 2] Checking About page for ${lead.sellerId}...`);

        await page.goto(lead.aboutUrl, { waitUntil: "domcontentloaded" }); // use saved aboutUrl
        await randomDelay(8000, 15000);   // Long human delay

        const pageText = await page.evaluate(() => document.body.innerText);

        const details = extractBusinessDetails(pageText, lead.sellerId);

        if (details) {
            // ── CRITICAL: Only keep UK businesses ─────────────────────
            if (!isUK(details.address, details.postcode)) {
                console.log(`[Phase 2] Non-UK address detected → ignoring & deleting ${lead.sellerId}`);
                await EbayLead.deleteOne({ sellerId: lead.sellerId });
                return;
            }

            // UK → update schema with full details
            await EbayLead.findOneAndUpdate(
                { sellerId: lead.sellerId },
                {
                    businessName: details.businessName,
                    address: details.address,
                    postcode: details.postcode,
                    email: details.email,
                    phoneNumber: details.phoneNumber,
                    vatNumber: details.vatNumber,
                    registrationNumber: details.registrationNumber,
                    // you can add more fields here if extractBusinessDetails returns them
                    verifiedAt: new Date(),
                },
                { new: true }
            );
            console.log(`[Phase 2] Updated UK business: ${lead.sellerId}`);
        }
    } catch (err) {
        console.log(`[Phase 2] Failed for ${lead.sellerId}:`, err.message);
    } finally {
        await browser.close();
    }
}

async function streamEbayScrape(req, res) {
    // ... your existing code for parsing keywords, SSE headers, estimate, etc. ...

    let browser;
    try {
        browser = await launchBrowser();
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });

        const visitedSellers = new Set();

        for (const keyword of keywords) {
            const listingUrls = await ebaySearchScraper(page, keyword, maxPages, skipPages);

            for (const url of listingUrls) {
                const sellerData = await ebaySellerScraper(page, url);   // Phase 1 (now returns businessName + aboutUrl)

                if (!sellerData || !sellerData.sellerId) continue;
                if (visitedSellers.has(sellerData.sellerId)) continue;

                visitedSellers.add(sellerData.sellerId);

                const leadData = {
                    sellerId: sellerData.sellerId,
                    sellerName: sellerData.sellerName,
                    sellerLink: sellerData.sellerLink,
                    aboutUrl: sellerData.aboutUrl,                    // ← NEW
                    listingUrl: url,
                    listingTitle: sellerData.listingTitle,
                    keyword,
                    fulfillment: "FBM",
                    country: "UK",                                    // temporary (Phase 2 may delete)
                    businessName: sellerData.businessName,            // ← from listing page
                };

                await EbayLead.findOneAndUpdate(
                    { sellerId: sellerData.sellerId },
                    leadData,
                    { upsert: true, new: true }
                );
            }
        }

        // === PHASE 2: Enrich one by one slowly (only UK addresses) ===
        send(res, "log", { message: "Phase 1 completed. Starting slow Phase 2 (About pages + UK filter)...", type: "info" });

        // Only leads that still need enrichment (address is still null)
        const allLeads = await EbayLead.find({ address: null });

        for (let i = 0; i < allLeads.length; i++) {
            await randomDelay(25000, 45000);   // 25-45 seconds gap between each About page
            await enrichSellerWithAboutPage(allLeads[i]);
        }

        send(res, "done", { message: "Scraping + Enrichment (UK only) completed" });

    } catch (err) {
        send(res, "error_event", { message: err.message });
    } finally {
        if (browser) await browser.close();
        res.end();
    }
}

// Move this function to a utility file if you want, or keep it here
function extractBusinessDetails(text, username) {
    // ← Your existing improved extractBusinessDetails function goes here
    // (the one you already have from previous messages)
    // ...
}

module.exports = { streamEbayScrape, getEbayLeads };