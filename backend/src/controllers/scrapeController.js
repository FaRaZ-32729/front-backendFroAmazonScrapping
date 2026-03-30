const { launchBrowser } = require("../utils/browserManager");
const searchProducts = require("../scrapper/searchScraper");
const scrapeProductSeller = require("../scrapper/productScraper");
const scrapeSellerProfile = require("../scrapper/sellerScraper");
const scrapeCompanyOfficer = require("../scrapper/companiesHouseScraper");
const verifyAddressOnGoogle = require("../scrapper/googleAddressScraper");
const { loadCookies } = require("../utils/cookieManager");
const AmazonLead = require("../models/amazonLeadModel");
const CustomerPush = require("../models/customerPushModel");
const extractSellerId = require("../utils/extractSellerId");
const { pushVerifiedLeads } = require("../service/customerPushService");

// ─── Timing constants (seconds) ───────────────────────────
const EST = {
    PAGE_SCRAPE_SEC: 240,
    PRODUCT_SEC: 12,
    VERIFY_SEC: 20,
    LEADS_PER_PAGE: 8,
};

// ─── Helpers ───────────────────────────────────────────────

function checkIfUKSeller(address, postcode) {
    const ukPostcode = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;
    const upper = (address || "").toUpperCase();
    return (
        ukPostcode.test((postcode || "").trim()) ||
        upper.endsWith(", UK") ||
        upper.endsWith(", GB") ||
        upper.includes("UNITED KINGDOM") ||
        upper.includes(", ENGLAND") ||
        upper.includes(", SCOTLAND") ||
        upper.includes(", WALES")
    );
}

function isVerifiedLead(lead) {
    return (
        lead.googleAddressMatch === "match" ||
        lead.addressMatch === "match"
    );
}

async function upsertLead(data) {
    try {
        return await AmazonLead.findOneAndUpdate(
            { sellerId: data.sellerId },
            data,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    } catch (err) {
        if (err.code === 11000) return null;
        console.log("DB error:", err.message);
        return null;
    }
}

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


async function streamScrape(req, res) {

    const rawKeywords = req.query.keywords || req.query.keyword || "";
    const keywords = rawKeywords
        .split(/[\n,]+/)
        .map(k => k.trim())
        .filter(Boolean);

    const maxPages = Math.min(parseInt(req.query.pages) || 1, 10);
    const skipPages = Math.max(parseInt(req.query.skipPages) || 0, 0);
    const startTime = Date.now();

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const keepAlive = setInterval(() => res.write(": ping\n\n"), 20000);

    if (keywords.length === 0) {
        send(res, "error_event", { message: "At least one keyword is required" });
        clearInterval(keepAlive);
        res.end();
        return;
    }

    // ── Upfront estimate ──────────────────────────────────
    const estLeadsTotal = keywords.length * maxPages * EST.LEADS_PER_PAGE;
    const estScrapeTotal = keywords.length * maxPages * EST.PAGE_SCRAPE_SEC;
    const estVerifyTotal = estLeadsTotal * EST.VERIFY_SEC;
    const estGrandTotal = estScrapeTotal + estVerifyTotal;

    send(res, "estimate", {
        keywords: keywords.length,
        pages: maxPages,
        skipPages,
        estLeads: estLeadsTotal,
        estScrapeTime: fmtTime(estScrapeTotal),
        estVerifyTime: fmtTime(estVerifyTotal),
        estTotalTime: fmtTime(estGrandTotal),
        estScrapesSec: estScrapeTotal,
        estVerifySec: estVerifyTotal,
    });

    send(res, "log", {
        message: `Keywords: ${keywords.length} | Pages: ${maxPages} per keyword | Skip: ${skipPages}`,
        type: "info"
    });
    send(res, "log", {
        message: `Estimated — Scrape: ${fmtTime(estScrapeTotal)} · Verify: ${fmtTime(estVerifyTotal)} · Total: ${fmtTime(estGrandTotal)}`,
        type: "info"
    });

    let browser;

    try {

        send(res, "log", { message: "Launching browser...", type: "dim" });

        browser = await launchBrowser();
        const page = await browser.newPage();

        await loadCookies(page);
        await page.goto("https://www.amazon.co.uk", {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });

        send(res, "log", { message: "Amazon session ready", type: "success" });

        let totalLeadsFound = 0;

        // ── Loop keywords ─────────────────────────────────────
        for (let ki = 0; ki < keywords.length; ki++) {

            const keyword = keywords[ki];
            const startPage = skipPages + 1;
            const endPage = skipPages + maxPages;
            const kwStart = Date.now();

            send(res, "keyword_start", {
                keyword,
                index: ki + 1,
                total: keywords.length,
                pageRange: `${startPage}–${endPage}`
            });

            send(res, "log", {
                message: `━━ Keyword ${ki + 1}/${keywords.length}: "${keyword}" (pages ${startPage}–${endPage}) ━━`,
                type: "info"
            });

            const productLinks = await searchProducts(page, keyword, maxPages, skipPages);

            send(res, "product_count", {
                keyword,
                keywordIndex: ki + 1,
                total: productLinks.length
            });

            let kwLeads = 0;

            for (let i = 0; i < productLinks.length; i++) {

                const link = productLinks[i];

                send(res, "scanning", { index: i + 1, total: productLinks.length, keyword });
                send(res, "log", { message: `[${i + 1}/${productLinks.length}] ${link}`, type: "dim" });

                try {

                    const sellerInfo = await scrapeProductSeller(page, link);

                    if (!sellerInfo?.sellerLink) {
                        send(res, "skip", { reason: "No seller link — skipping" });
                        continue;
                    }

                    const sellerProfile = await scrapeSellerProfile(page, sellerInfo.sellerLink);

                    if (!sellerProfile?.address) {
                        send(res, "skip", { reason: "No address — skipping" });
                        continue;
                    }

                    if (!checkIfUKSeller(sellerProfile.address, sellerProfile.postcode)) {
                        send(res, "skip", { reason: `Non-UK seller: ${sellerProfile.address}` });
                        continue;
                    }

                    const sellerId = extractSellerId(sellerProfile.pageUrl);

                    if (!sellerId) {
                        send(res, "skip", { reason: "Could not extract sellerId — skipping" });
                        continue;
                    }

                    const leadData = {
                        sellerId,
                        sellerName: sellerInfo.sellerName,
                        sellerLink: sellerProfile.pageUrl,
                        fulfillment: sellerInfo.fulfillment,
                        businessName: sellerProfile.businessName || null,
                        address: sellerProfile.address || null,
                        postcode: sellerProfile.postcode || null,
                        phoneNumber: sellerProfile.phoneNumber || null,
                        email: sellerProfile.email || null,
                        sellerRating: sellerProfile.sellerRating || null,
                        ratingPercentage: sellerProfile.ratingPercentage || null,
                        totalRatings: sellerProfile.totalRatings || null,
                        productUrl: link
                    };

                    await upsertLead(leadData);
                    kwLeads++;
                    totalLeadsFound++;

                    send(res, "lead", leadData);

                } catch (err) {
                    send(res, "log", { message: `Error on product ${i + 1}: ${err.message}`, type: "error" });
                }

            }

            const kwElapsed = ((Date.now() - kwStart) / 1000).toFixed(1);

            send(res, "keyword_done", {
                keyword,
                index: ki + 1,
                total: keywords.length,
                leads: kwLeads,
                timeTaken: kwElapsed + "s",
                remaining: keywords.length - ki - 1
            });

            send(res, "log", {
                message: `"${keyword}" done — ${kwLeads} leads in ${kwElapsed}s`,
                type: "success"
            });
        }

        // ── Scrape phase complete ─────────────────────────────
        const scrapeElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const actualElapsed = parseFloat(scrapeElapsed);

        const unverifiedCount = await AmazonLead.countDocuments({
            $or: [{ ownerName: null }, { ownerName: { $exists: false } }]
        });

        const actualVerifyEst = unverifiedCount * EST.VERIFY_SEC;

        send(res, "scrape_done", {
            totalLeads: totalLeadsFound,
            timeTaken: scrapeElapsed + "s",
            estVerifyTime: fmtTime(actualVerifyEst),
            estTotalTime: fmtTime(actualElapsed + actualVerifyEst),
            toVerify: unverifiedCount
        });

        // ── Verification phase ────────────────────────────────
        send(res, "log", { message: "─────────────────────────────────────", type: "dim" });
        send(res, "log", { message: `Starting verification of ${unverifiedCount} leads...`, type: "info" });

        const unverified = await AmazonLead.find({
            $or: [{ ownerName: null }, { ownerName: { $exists: false } }]
        }).select("_id businessName sellerName address postcode").lean();

        send(res, "verify_total", { count: unverified.length });

        let verified = 0;
        let failed = 0;
        const verifyStart = Date.now();
        // Collect fully-updated verified leads for CRM push
        const verifiedLeadIds = [];

        for (let i = 0; i < unverified.length; i++) {

            const lead = unverified[i];
            const searchName = lead.businessName || lead.sellerName;

            let eta = "";
            if (i > 0) {
                const avgSec = ((Date.now() - verifyStart) / 1000) / i;
                const remSec = avgSec * (unverified.length - i);
                eta = ` · ETA ${fmtTime(remSec)}`;
            }

            send(res, "verify_progress", {
                index: i + 1,
                total: unverified.length,
                name: searchName,
                eta
            });

            try {

                const chResult = await scrapeCompanyOfficer(page, searchName, lead.address);
                const googleResult = await verifyAddressOnGoogle(page, searchName, lead.address, lead.postcode);

                const updateData = { verifiedAt: new Date() };

                if (chResult) {
                    updateData.ownerName = chResult.ownerName;
                    updateData.ownerRole = chResult.ownerRole;
                    updateData.companyNumber = chResult.companyNumber;
                    updateData.companiesHouseUrl = chResult.companiesHouseUrl;
                    updateData.registeredAddress = chResult.registeredAddress;
                    updateData.addressMatch = chResult.addressMatch;
                    updateData.addressMatchReason = chResult.addressMatchReason;
                }

                if (googleResult) {
                    updateData.googleAddress = googleResult.googleAddress;
                    updateData.googleAddressMatch = googleResult.googleAddressMatch;
                    updateData.googleMatchReason = googleResult.googleMatchReason;
                    updateData.googleMapsUrl = googleResult.googleMapsUrl;
                }

                await AmazonLead.findByIdAndUpdate(lead._id, updateData);

                const isVerified =
                    updateData.googleAddressMatch === "match" ||
                    updateData.addressMatch === "match";

                if (isVerified) {
                    verified++;
                    verifiedLeadIds.push(lead._id); // collect for CRM push

                    send(res, "verify_done_lead", {
                        leadId: lead._id,
                        name: searchName,
                        ownerName: chResult?.ownerName,
                        ownerRole: chResult?.ownerRole,
                        addressMatch: chResult?.addressMatch,
                        googleAddressMatch: googleResult?.googleAddressMatch
                    });

                } else {
                    failed++;
                    send(res, "verify_not_found", { leadId: lead._id, name: searchName });
                }

            } catch (err) {
                failed++;
                send(res, "log", { message: `Verify error: ${searchName}: ${err.message}`, type: "error" });
            }
        }

        const verifyElapsed = ((Date.now() - verifyStart) / 1000).toFixed(1);
        const grandElapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        // ── CRM Auto-Push phase ───────────────────────────────
        send(res, "log", { message: "─────────────────────────────────────", type: "dim" });
        send(res, "log", {
            message: `Pushing ${verifiedLeadIds.length} verified leads to CRM...`,
            type: "info"
        });
        send(res, "crm_push_start", { count: verifiedLeadIds.length });

        let crmSummary = { pushed: 0, duplicates: 0, failed: 0, skipped: 0 };

        if (verifiedLeadIds.length > 0) {
            // Fetch full lead documents (we need all fields for the payload)
            const verifiedLeadDocs = await AmazonLead
                .find({ _id: { $in: verifiedLeadIds } })
                .lean();

            crmSummary = await pushVerifiedLeads(verifiedLeadDocs);
        }

        send(res, "crm_push_done", crmSummary);

        send(res, "log", {
            message: `CRM push — ✓ ${crmSummary.pushed} pushed | ↩ ${crmSummary.duplicates} duplicates | ✗ ${crmSummary.failed} failed`,
            type: crmSummary.failed > 0 ? "warn" : "success"
        });

        // ── Final done event ──────────────────────────────────
        send(res, "done", {
            keywords: keywords.length,
            totalLeads: totalLeadsFound,
            scrapeTime: scrapeElapsed + "s",
            verifyTime: verifyElapsed + "s",
            totalTime: grandElapsed + "s",
            verified,
            failed,
            crmPushed: crmSummary.pushed,
            crmDuplicates: crmSummary.duplicates,
            crmFailed: crmSummary.failed,
        });

    } catch (err) {
        send(res, "error_event", { message: err.message });
    } finally {
        clearInterval(keepAlive);
        if (browser) await browser.close();
        res.end();
    }
}

// ─────────────────────────────────────────────────────────
// Controller: getLeads
// ─────────────────────────────────────────────────────────
async function getLeads(req, res) {
    try {
        const {
            page = 1,
            limit = 20,
            filter = "all",   // "all" | "verified" | "unverified"
            search
        } = req.query;

        const queryFilter = {};

        if (search) {
            const regex = new RegExp(search, "i");
            queryFilter.$or = [
                { sellerName: regex },
                { businessName: regex },
                { address: regex },
                { email: regex },
                { postcode: regex }
            ];
        }

        if (filter === "verified") {
            const verifiedOr = [
                { googleAddressMatch: "match" },
                { addressMatch: "match" }
            ];
            if (queryFilter.$or) {
                queryFilter.$and = [{ $or: queryFilter.$or }, { $or: verifiedOr }];
                delete queryFilter.$or;
            } else {
                queryFilter.$or = verifiedOr;
            }
        } else if (filter === "unverified") {
            const unverifiedAnd = [
                { googleAddressMatch: { $ne: "match" } },
                { addressMatch: { $ne: "match" } }
            ];
            if (queryFilter.$or) {
                queryFilter.$and = [{ $or: queryFilter.$or }, ...unverifiedAnd];
            } else {
                queryFilter.$and = unverifiedAnd;
            }
        }

        const skip = (Number(page) - 1) * Number(limit);
        const total = await AmazonLead.countDocuments(queryFilter);
        const leads = await AmazonLead
            .find(queryFilter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        // Enrich each lead with its CRM push status
        const pushedRecords = await CustomerPush
            .find({ sellerId: { $in: leads.map(l => l.sellerId).filter(Boolean) } })
            .select("sellerId status crmCustomerId pushedAt")
            .lean();

        const pushMap = {};
        for (const r of pushedRecords) {
            if (r.sellerId) pushMap[r.sellerId] = r;
        }

        const enriched = leads.map(l => ({
            ...l,
            crmStatus: pushMap[l.sellerId]?.status || null,
            crmCustomerId: pushMap[l.sellerId]?.crmCustomerId || null,
            crmPushedAt: pushMap[l.sellerId]?.pushedAt || null,
        }));

        res.json({ total, page: Number(page), limit: Number(limit), leads: enriched });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ─────────────────────────────────────────────────────────
// Controller: getCrmPushLog
// GET /api/scrape/crm-log?page=1&limit=20&status=pushed
// ─────────────────────────────────────────────────────────
async function getCrmPushLog(req, res) {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const total = await CustomerPush.countDocuments(filter);
        const logs = await CustomerPush
            .find(filter)
            .sort({ pushedAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        res.json({ total, page: Number(page), limit: Number(limit), logs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = { streamScrape, getLeads, getCrmPushLog };