// require("dotenv").config();
// const mongoose = require("mongoose");

// const { launchBrowser } = require("./src/utils/browserManager");
// const ebaySearchScraper = require("./src/scrapper/ebaySearchScraper");
// const ebaySellerScraper = require("./src/scrapper/ebaySellerScraper");
// const EbayLead = require("./src/models/ebayLeadModel");
// const database = require("./src/config/DB_Connection");

// database();

// // ── Config ───────────────────────────────────────────────
// const KEYWORDS = ["cable ties"];
// const PAGES = 1;
// const MAX_LEADS_TO_PROCESS = 5;

// // ── Logging ──────────────────────────────────────────────
// function log(msg, type = "info") {
//     const colors = { info: "\x1b[36m", success: "\x1b[32m", warn: "\x1b[33m", error: "\x1b[31m", dim: "\x1b[90m" };
//     console.log(`${colors[type] || ''}[${type.toUpperCase()}] ${msg}\x1b[0m`);
// }

// async function randomDelay(min, max) {
//     const ms = Math.floor(Math.random() * (max - min)) + min;
//     return new Promise(r => setTimeout(r, ms));
// }

// async function humanBrowsingDelay(index) {
//     if (index !== 0 && index % 15 === 0) await randomDelay(60000, 100000);
//     else if (index !== 0 && index % 5 === 0) await randomDelay(20000, 35000);
//     else await randomDelay(5000, 10000);
// }

// // ── Strong UK Detection ──────────────────────────────────
// function isUKAddress(address = "", postcode = "") {
//     const text = ((address || "") + " " + (postcode || "")).toUpperCase().trim();
//     const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

//     return (
//         UK_POSTCODE.test(postcode) ||
//         text.includes("UNITED KINGDOM") ||
//         text.includes(" UK") ||
//         text.includes(" GB") ||
//         text.includes("ENGLAND") ||
//         text.includes("SCOTLAND") ||
//         text.includes("WALES") ||
//         text.includes("WEST YORKSHIRE") ||
//         text.includes("BRADFORD") ||
//         /\bBD\d|\bLS\d|\bM\d|\bEC\d|\bSW\d/.test(text)
//     );
// }

// function extractBusinessDetails(pageText, sellerId) {
//     const details = {
//         businessName: sellerId,
//         address: null,
//         postcode: null,
//         email: null,
//         phoneNumber: null,
//         vatNumber: null,
//     };

//     if (!pageText) return details;

//     // Split into lines and clean
//     const lines = pageText.split('\n').map(line => line.trim()).filter(Boolean);

//     for (const line of lines) {
//         if (line.includes('Business name:')) {
//             details.businessName = line.split('Business name:')[1]?.trim() || details.businessName;
//         }
//         if (line.includes('Address:')) {
//             details.address = line.split('Address:')[1]?.trim();
//         }
//         if (line.includes('VAT number:')) {
//             details.vatNumber = line.split('VAT number:')[1]?.trim().replace(/\s+/g, '');
//         }
//         if (line.includes('Phone number:')) {
//             details.phoneNumber = line.split('Phone number:')[1]?.trim();
//         }
//         if (line.includes('Email:')) {
//             details.email = line.split('Email:')[1]?.trim().toLowerCase();
//         }
//     }

//     // Fallback: extract postcode from address
//     if (details.address) {
//         const postMatch = details.address.match(/\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/i);
//         if (postMatch) details.postcode = postMatch[0].toUpperCase();
//     }

//     return details;
// }

// // ── FINAL FIXED Phase 2 ─────────────────────────────────────────────
// async function enrichSellerWithAboutPage(lead) {
//     const browser = await launchBrowser();
//     const page = await browser.newPage();
//     await page.setViewport({ width: 1366, height: 768 });

//     try {
//         log(`[Phase 2] Opening About page → ${lead.sellerId}`, "info");

//         await page.goto(lead.aboutUrl, { 
//             waitUntil: "networkidle2", 
//             timeout: 60000 
//         });

//         await randomDelay(4000, 7000);

//         // Accept GDPR if present
//         try {
//             await page.evaluate(() => {
//                 const btn = Array.from(document.querySelectorAll('button')).find(b => 
//                     b.textContent.toLowerCase().includes('accept all') || 
//                     b.textContent.toLowerCase().includes('accept')
//                 );
//                 if (btn) btn.click();
//             });
//             await randomDelay(3000, 5000);
//         } catch (e) {}

//         // Get the exact business details section text
//         const pageText = await page.evaluate(() => {
//             const section = document.querySelector('.str-business-details__seller-info');
//             if (section) {
//                 return section.innerText;
//             }
//             // Fallback to whole body
//             return document.body.innerText || "";
//         });

//         const details = extractBusinessDetails(pageText, lead.sellerId);

//         // ==================== DISPLAY FULL EXTRACTION ====================
//         console.log("\n" + "=".repeat(85));
//         log(`EXTRACTED DATA FOR SELLER: ${lead.sellerId}`, "info");
//         console.log("=".repeat(85));
//         console.log(`Raw Section Text : ${pageText.substring(0, 300)}...`);   // Show raw for debugging
//         console.log(`Business Name    : ${details.businessName || "—"}`);
//         console.log(`Address          : ${details.address || "—"}`);
//         console.log(`Postcode         : ${details.postcode || "—"}`);
//         console.log(`VAT Number       : ${details.vatNumber || "—"}`);
//         console.log(`Email            : ${details.email || "—"}`);
//         console.log(`Phone            : ${details.phoneNumber || "—"}`);
//         console.log(`Is UK?           : ${isUKAddress(details.address, details.postcode) ? "YES ✅" : "NO ❌"}`);
//         console.log("=".repeat(85) + "\n");

//         if (!isUKAddress(details.address, details.postcode)) {
//             log(`[Phase 2] Non-UK → Deleting ${lead.sellerId}`, "warn");
//             await EbayLead.deleteOne({ sellerId: lead.sellerId });
//             return;
//         }

//         await EbayLead.findOneAndUpdate(
//             { sellerId: lead.sellerId },
//             {
//                 businessName: details.businessName,
//                 address: details.address,
//                 postcode: details.postcode,
//                 email: details.email,
//                 phoneNumber: details.phoneNumber,
//                 vatNumber: details.vatNumber,
//                 verifiedAt: new Date(),
//             },
//             { returnDocument: 'after' }
//         );

//         log(`[Phase 2] ✅ Updated UK Business: ${details.businessName}`, "success");

//     } catch (err) {
//         log(`[Phase 2] Failed for ${lead.sellerId}: ${err.message}`, "error");
//     } finally {
//         await browser.close();
//     }
// }

// // ── Main Function ────────────────────────────────────────
// async function run() {
//     log("═══════════════════════════════════════════", "info");
//     log(`eBay UK Scraper Test - MAX ${MAX_LEADS_TO_PROCESS} Leads`, "info");
//     log("═══════════════════════════════════════════", "info");

//     const startTime = Date.now();
//     const visitedSellers = new Set();
//     let processed = 0;

//     let browser;
//     try {
//         browser = await launchBrowser();
//         const page = await browser.newPage();
//         await page.setViewport({ width: 1366, height: 768 });

//         for (const keyword of KEYWORDS) {
//             if (processed >= MAX_LEADS_TO_PROCESS) break;

//             log(`\nKeyword: "${keyword}"`, "info");
//             const listings = await ebaySearchScraper(page, keyword, PAGES, 0);

//             for (let i = 0; i < listings.length && processed < MAX_LEADS_TO_PROCESS; i++) {
//                 await humanBrowsingDelay(i);
//                 const url = listings[i];

//                 const data = await ebaySellerScraper(page, url);
//                 if (!data?.sellerId) continue;
//                 if (visitedSellers.has(data.sellerId)) continue;

//                 visitedSellers.add(data.sellerId);
//                 processed++;

//                 const leadData = {
//                     sellerId: data.sellerId,
//                     sellerName: data.sellerName,
//                     businessName: data.businessName,
//                     aboutUrl: data.aboutUrl,
//                     listingUrl: url,
//                     listingTitle: data.listingTitle,
//                     keyword,
//                     fulfillment: "FBM",
//                     country: "UK"
//                 };

//                 await EbayLead.findOneAndUpdate(
//                     { sellerId: data.sellerId },
//                     leadData,
//                     { upsert: true, returnDocument: 'after' }
//                 );

//                 log(`✓ Phase 1 Saved: ${data.sellerName}`, "success");
//             }
//         }

//         log("\n=== Starting Phase 2 (About Pages) ===", "info");

//         const leadsToEnrich = await EbayLead.find({ address: null }).limit(MAX_LEADS_TO_PROCESS);

//         for (const lead of leadsToEnrich) {
//             await randomDelay(25000, 45000);
//             await enrichSellerWithAboutPage(lead);
//         }

//         const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
//         log(`\n✅ Test Complete in ${elapsed}s`, "success");

//     } catch (err) {
//         log(`Fatal Error: ${err.message}`, "error");
//     } finally {
//         if (browser) await browser.close();
//     }
// }

// run().catch(console.error);


//phase2
// require("dotenv").config();
// const mongoose = require("mongoose");

// const { launchBrowser } = require("./src/utils/browserManager");
// const EbayLead = require("./src/models/ebayLeadModel");
// const database = require("./src/config/DB_Connection");
// const { loadCookies } = require("./src/utils/cookieManager");   // ← Make sure this line is here

// const MAX_LEADS_TO_PROCESS = 5;

// // ── Logging ──────────────────────────────────────────────
// function log(msg, type = "info") {
//     const colors = { info: "\x1b[36m", success: "\x1b[32m", warn: "\x1b[33m", error: "\x1b[31m", dim: "\x1b[90m" };
//     console.log(`${colors[type] || ''}[${type.toUpperCase()}] ${msg}\x1b[0m`);
// }

// async function randomDelay(min, max) {
//     const ms = Math.floor(Math.random() * (max - min)) + min;
//     return new Promise(r => setTimeout(r, ms));
// }

// // ── UK Detection ─────────────────────────────────────────
// function isUKAddress(address = "", postcode = "") {
//     const text = ((address || "") + " " + (postcode || "")).toUpperCase().trim();
//     const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

//     return (
//         UK_POSTCODE.test(postcode) ||
//         text.includes("UNITED KINGDOM") ||
//         text.includes(" UK") ||
//         text.includes(" GB") ||
//         text.includes("ENGLAND") ||
//         text.includes("SCOTLAND") ||
//         text.includes("WALES") ||
//         text.includes("WEST YORKSHIRE") ||
//         text.includes("BRADFORD") ||
//         /\bBD\d|\bLS\d|\bM\d|\bEC\d|\bSW\d/.test(text)
//     );
// }

// // ── Extractor ────────────────────────────────────────────
// function extractBusinessDetails(pageText, sellerId) {
//     const details = {
//         businessName: sellerId,
//         address: null,
//         postcode: null,
//         email: null,
//         phoneNumber: null,
//         vatNumber: null,
//     };

//     if (!pageText) return details;

//     const lines = pageText.split('\n').map(line => line.trim()).filter(Boolean);

//     for (const line of lines) {
//         if (line.includes('Business name:')) {
//             details.businessName = line.split('Business name:')[1]?.trim() || details.businessName;
//         }
//         if (line.includes('Address:')) {
//             details.address = line.split('Address:')[1]?.trim();
//         }
//         if (line.includes('VAT number:')) {
//             details.vatNumber = line.split('VAT number:')[1]?.trim().replace(/\s+/g, '');
//         }
//         if (line.includes('Phone number:')) {
//             details.phoneNumber = line.split('Phone number:')[1]?.trim();
//         }
//         if (line.includes('Email:')) {
//             details.email = line.split('Email:')[1]?.trim().toLowerCase();
//         }
//     }

//     if (details.address) {
//         const postMatch = details.address.match(/\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/i);
//         if (postMatch) details.postcode = postMatch[0].toUpperCase();
//     }

//     return details;
// }

// // ── Enrich Function (uses shared page) ──
// async function enrichSellerWithAboutPage(page, lead) {
//     try {
//         log(`[Phase 2] Opening About page → ${lead.sellerId}`, "info");

//         await page.goto(lead.aboutUrl, {
//             waitUntil: "domcontentloaded",
//             timeout: 90000
//         });

//         await randomDelay(4000, 7000);

//         await page.evaluate(() => window.scrollBy(0, 300));
//         await randomDelay(2000, 4000);

//         const pageText = await page.evaluate(() => {
//             const section = document.querySelector('.str-business-details__seller-info');
//             return section ? section.innerText : document.body.innerText || "";
//         });

//         const details = extractBusinessDetails(pageText, lead.sellerId);

//         // Display extracted data
//         console.log("\n" + "=".repeat(90));
//         log(`EXTRACTED DATA FOR: ${lead.sellerId}`, "info");
//         console.log("=".repeat(90));
//         console.log(`Business Name    : ${details.businessName || "—"}`);
//         console.log(`Address          : ${details.address || "—"}`);
//         console.log(`Postcode         : ${details.postcode || "—"}`);
//         console.log(`VAT Number       : ${details.vatNumber || "—"}`);
//         console.log(`Email            : ${details.email || "—"}`);
//         console.log(`Phone            : ${details.phoneNumber || "—"}`);
//         console.log(`Is UK?           : ${isUKAddress(details.address, details.postcode) ? "YES ✅" : "NO ❌"}`);
//         console.log("=".repeat(90) + "\n");

//         if (!isUKAddress(details.address, details.postcode)) {
//             log(`[Phase 2] Non-UK → Skipping ${lead.sellerId}`, "warn");
//             return;
//         }

//         await EbayLead.findOneAndUpdate(
//             { sellerId: lead.sellerId },
//             {
//                 businessName: details.businessName,
//                 address: details.address,
//                 postcode: details.postcode,
//                 email: details.email,
//                 phoneNumber: details.phoneNumber,
//                 vatNumber: details.vatNumber,
//                 verifiedAt: new Date(),
//             }
//         );

//         log(`[Phase 2] ✅ Updated UK Business: ${details.businessName}`, "success");

//         await randomDelay(6000, 10000);

//     } catch (err) {
//         log(`[Phase 2] Failed for ${lead.sellerId}: ${err.message}`, "error");
//     }
// }

// // ── MAIN RUN FUNCTION ──
// async function run() {
//     log("═══════════════════════════════════════════", "info");
//     log("eBay Phase 2 — Visible Browser + Real Cookies", "info");
//     log(`Processing up to ${MAX_LEADS_TO_PROCESS} leads`, "info");
//     log("═══════════════════════════════════════════", "info");

//     let browser;
//     let page;

//     try {
//         // Wait for database connection first
//         log("Waiting for MongoDB connection...", "info");
//         await database();                    // ← Make sure this returns a Promise
//         log("✅ MongoDB connected successfully", "success");

//         browser = await launchBrowser();
//         page = await browser.newPage();
//         await page.setViewport({ width: 1366, height: 768 });

//         // === WARM UP SESSION ===
//         log("Loading cookies...", "info");
//         await loadCookies(page);

//         log("Warming up on eBay homepage...", "info");
//         await page.goto("https://www.ebay.co.uk", {
//             waitUntil: "domcontentloaded",
//             timeout: 60000
//         });

//         await randomDelay(5000, 8000);
//         log("✅ Session warmed up successfully", "success");

//         await page.setExtraHTTPHeaders({
//             "Accept-Language": "en-GB,en;q=0.9",
//             "sec-ch-ua": '"Chromium";v="124", "Not(A:Brand";v="24", "Google Chrome";v="124"',
//             "sec-ch-ua-mobile": "?0",
//             "sec-ch-ua-platform": '"Windows"'
//         });

//         // Now safely query the database
//         const leadsToEnrich = await EbayLead.find({ address: null })
//             .limit(MAX_LEADS_TO_PROCESS)
//             .lean();

//         console.log(leadsToEnrich, "leads from backend");

//         if (leadsToEnrich.length === 0) {
//             log("No leads with null address found.", "warn");
//             return;
//         }

//         log(`Starting Phase 2 on ${leadsToEnrich.length} leads...`, "info");

//         for (const lead of leadsToEnrich) {
//             await randomDelay(25000, 45000);
//             await enrichSellerWithAboutPage(page, lead);
//         }

//         log("\n✅ Phase 2 Finished Successfully", "success");

//     } catch (err) {
//         log(`Fatal Error: ${err.message}`, "error");
//     } finally {
//         if (browser) {
//             log("Browser kept open for inspection. Close it manually when done.", "dim");
//             // await browser.close();
//         }
//     }
// }

// run().catch(console.error);



// running code


// require("dotenv").config();
// const mongoose = require("mongoose");

// const { launchBrowser } = require("./src/utils/browserManager");
// const ebaySearchScraper = require("./src/scrapper/ebaySearchScraper");
// const ebaySellerScraper = require("./src/scrapper/ebaySellerScraper");
// const EbayLead = require("./src/models/ebayLeadModel");
// const database = require("./src/config/DB_Connection");
// const { loadCookies } = require("./src/utils/cookieManager");

// const KEYWORDS = ["cable ties"];
// const PAGES = 1;
// const MAX_LEADS_TO_PROCESS = 5;

// // ── Logging ──────────────────────────────────────────────
// function log(msg, type = "info") {
//     const colors = { info: "\x1b[36m", success: "\x1b[32m", warn: "\x1b[33m", error: "\x1b[31m", dim: "\x1b[90m" };
//     console.log(`${colors[type] || ''}[${type.toUpperCase()}] ${msg}\x1b[0m`);
// }

// async function randomDelay(min, max) {
//     const ms = Math.floor(Math.random() * (max - min)) + min;
//     return new Promise(r => setTimeout(r, ms));
// }

// async function humanBrowsingDelay(index) {
//     if (index !== 0 && index % 15 === 0) await randomDelay(60000, 100000);
//     else if (index !== 0 && index % 5 === 0) await randomDelay(20000, 35000);
//     else await randomDelay(5000, 10000);
// }

// // ── UK Detection & Extractor ──
// function isUKAddress(address = "", postcode = "") {
//     const text = ((address || "") + " " + (postcode || "")).toUpperCase().trim();
//     const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

//     return (
//         UK_POSTCODE.test(postcode) ||
//         text.includes("UNITED KINGDOM") ||
//         text.includes(" UK") ||
//         text.includes(" GB") ||
//         text.includes("ENGLAND") ||
//         text.includes("SCOTLAND") ||
//         text.includes("WALES") ||
//         text.includes("WEST YORKSHIRE") ||
//         text.includes("BRADFORD") ||
//         /\bBD\d|\bLS\d|\bM\d|\bEC\d|\bSW\d/.test(text)
//     );
// }

// function extractBusinessDetails(pageText, sellerId) {
//     const details = {
//         businessName: sellerId,
//         address: null,
//         postcode: null,
//         email: null,
//         phoneNumber: null,
//         vatNumber: null,
//     };

//     if (!pageText) return details;

//     const lines = pageText.split('\n').map(line => line.trim()).filter(Boolean);

//     for (const line of lines) {
//         if (line.includes('Business name:')) {
//             details.businessName = line.split('Business name:')[1]?.trim() || details.businessName;
//         }
//         if (line.includes('Address:')) {
//             details.address = line.split('Address:')[1]?.trim();
//         }
//         if (line.includes('VAT number:')) {
//             details.vatNumber = line.split('VAT number:')[1]?.trim().replace(/\s+/g, '');
//         }
//         if (line.includes('Phone number:')) {
//             details.phoneNumber = line.split('Phone number:')[1]?.trim();
//         }
//         if (line.includes('Email:')) {
//             details.email = line.split('Email:')[1]?.trim().toLowerCase();
//         }
//     }

//     if (details.address) {
//         const postMatch = details.address.match(/\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/i);
//         if (postMatch) details.postcode = postMatch[0].toUpperCase();
//     }

//     return details;
// }

// // ── Phase 2: Enrich with About Page (NEW BROWSER + Cookies) ──
// async function enrichSellerWithAboutPage(lead) {
//     let browser;
//     try {
//         log(`[Phase 2] Opening About page → ${lead.sellerId} (New Browser + Cookies)`, "info");

//         browser = await launchBrowser();
//         const page = await browser.newPage();
//         await page.setViewport({ width: 1366, height: 768 });

//         // Load cookies and warm up session
//         await loadCookies(page);

//         await page.goto("https://www.ebay.co.uk", {
//             waitUntil: "domcontentloaded",
//             timeout: 60000
//         });

//         await randomDelay(4000, 7000);

//         // ==================== MOST IMPORTANT LINE ====================
//         log(`Navigating to About URL: ${lead.aboutUrl}`, "info");

//         await page.goto(lead.aboutUrl, {
//             waitUntil: "networkidle2",     // Best for eBay seller pages
//             timeout: 90000
//         });
//         // ============================================================

//         await randomDelay(6000, 9000);   // Extra time for About page to load fully

//         await page.evaluate(() => window.scrollBy(0, 600));
//         await randomDelay(2000, 4000);

//         // Extract text
//         const pageText = await page.evaluate(() => {
//             const section = document.querySelector('.str-business-details__seller-info');
//             if (section) return section.innerText;
//             return document.body.innerText || "";
//         });

//         const details = extractBusinessDetails(pageText, lead.sellerId);

//         console.log("\n" + "=".repeat(90));
//         log(`EXTRACTED DATA FOR: ${lead.sellerId}`, "info");
//         console.log("=".repeat(90));
//         console.log(`Raw Text Snippet : ${pageText.substring(0, 400)}...`);
//         console.log(`Business Name    : ${details.businessName || "—"}`);
//         console.log(`Address          : ${details.address || "—"}`);
//         console.log(`Postcode         : ${details.postcode || "—"}`);
//         console.log(`VAT Number       : ${details.vatNumber || "—"}`);
//         console.log(`Email            : ${details.email || "—"}`);
//         console.log(`Phone            : ${details.phoneNumber || "—"}`);
//         console.log(`Is UK?           : ${isUKAddress(details.address, details.postcode) ? "YES ✅" : "NO ❌"}`);
//         console.log("=".repeat(90) + "\n");

//         if (!isUKAddress(details.address, details.postcode)) {
//             log(`[Phase 2] Non-UK → Skipping ${lead.sellerId}`, "warn");
//             return;
//         }

//         await EbayLead.findOneAndUpdate(
//             { sellerId: lead.sellerId },
//             {
//                 businessName: details.businessName,
//                 address: details.address,
//                 postcode: details.postcode,
//                 email: details.email,
//                 phoneNumber: details.phoneNumber,
//                 vatNumber: details.vatNumber,
//                 verifiedAt: new Date(),
//             }
//         );

//         log(`[Phase 2] ✅ Updated UK Business: ${details.businessName}`, "success");

//         await randomDelay(6000, 10000);

//     } catch (err) {
//         log(`[Phase 2] Failed for ${lead.sellerId}: ${err.message}`, "error");
//     } finally {
//         if (browser) await browser.close();
//     }
// }

// // ── MAIN FUNCTION ──
// async function run() {
//     log("═══════════════════════════════════════════", "info");
//     log(`eBay UK Scraper - Phase 1 + Phase 2`, "info");
//     log(`Max Leads: ${MAX_LEADS_TO_PROCESS}`, "info");
//     log("═══════════════════════════════════════════", "info");

//     const startTime = Date.now();
//     const visitedSellers = new Set();
//     let processed = 0;

//     let browser;
//     let page;

//     try {
//         await database();
//         log("✅ MongoDB connected", "success");

//         // ===================== PHASE 1 =====================
//         log("\n=== Starting Phase 1: Search & Seller Scraping ===", "info");

//         browser = await launchBrowser();
//         page = await browser.newPage();
//         await page.setViewport({ width: 1366, height: 768 });

//         // Warm-up with cookies (only for Phase 1)
//         await loadCookies(page);
//         await page.goto("https://www.ebay.co.uk", { waitUntil: "domcontentloaded" });
//         await randomDelay(5000, 8000);
//         log("✅ Session warmed up for Phase 1", "success");

//         await page.setExtraHTTPHeaders({
//             "Accept-Language": "en-GB,en;q=0.9",
//             "sec-ch-ua": '"Chromium";v="124", "Not(A:Brand";v="24", "Google Chrome";v="124"',
//             "sec-ch-ua-mobile": "?0",
//             "sec-ch-ua-platform": '"Windows"'
//         });

//         for (const keyword of KEYWORDS) {
//             if (processed >= MAX_LEADS_TO_PROCESS) break;

//             log(`Keyword: "${keyword}"`, "info");
//             const listings = await ebaySearchScraper(page, keyword, PAGES, 0);

//             for (let i = 0; i < listings.length && processed < MAX_LEADS_TO_PROCESS; i++) {
//                 await humanBrowsingDelay(i);
//                 const url = listings[i];

//                 const data = await ebaySellerScraper(page, url);
//                 if (!data?.sellerId || visitedSellers.has(data.sellerId)) continue;

//                 visitedSellers.add(data.sellerId);
//                 processed++;

//                 const leadData = {
//                     sellerId: data.sellerId,
//                     sellerName: data.sellerName,
//                     aboutUrl: data.aboutUrl,
//                     listingUrl: url,
//                     listingTitle: data.listingTitle,
//                     keyword,
//                     fulfillment: "FBM",
//                     country: "UK"
//                 };

//                 await EbayLead.findOneAndUpdate({ sellerId: data.sellerId }, leadData, { upsert: true });

//                 log(`✓ Phase 1 Saved: ${data.sellerName}`, "success");
//             }
//         }

//         // Close Phase 1 browser
//         log("Closing Phase 1 browser...", "dim");
//         await browser.close();
//         log("Phase 1 browser closed.", "success");

//         // ===================== PHASE 2 =====================
//         log("\n=== Starting Phase 2: Enrich About Pages (New Browser) ===", "info");

//         const leadsToEnrich = await EbayLead.find({ address: null })
//             .limit(MAX_LEADS_TO_PROCESS)
//             .lean();

//         if (leadsToEnrich.length === 0) {
//             log("No leads need enrichment.", "warn");
//         } else {
//             for (const lead of leadsToEnrich) {
//                 await randomDelay(25000, 45000);
//                 await enrichSellerWithAboutPage(lead);     // ← No page passed, new browser each time
//             }
//         }

//         const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
//         log(`\n✅ Full Run Completed in ${elapsed}s`, "success");

//     } catch (err) {
//         log(`Fatal Error: ${err.message}`, "error");
//     }
// }

// run().catch(console.error);



























































// require("dotenv").config();

// const { launchBrowser } = require("./src/utils/browserManager");
// const { loadCookies } = require("./src/utils/cookieManager");
// const ebaySearchScraper = require("./src/scrapper/ebaySearchScraper");
// const EbayLead = require("./src/models/ebayLeadModel");
// const database = require("./src/config/DB_Connection");
// const fs = require("fs");

// // ── Config ────────────────────────────────────────────────
// const KEYWORDS = ["cable ties"];
// const PAGES = 1;
// const SKIP_PAGES = 0;
// const MAX_LEADS = 50;
// // ─────────────────────────────────────────────────────────

// function log(msg, type = "info") {
//     const colors = {
//         info: "\x1b[36m",
//         success: "\x1b[32m",
//         warn: "\x1b[33m",
//         error: "\x1b[31m",
//         dim: "\x1b[90m"
//     };
//     console.log(`${colors[type] || ""}[${type.toUpperCase()}] ${msg}\x1b[0m`);
// }

// function randomDelay(min, max) {
//     const ms = Math.floor(Math.random() * (max - min)) + min;
//     return new Promise(r => setTimeout(r, ms));
// }

// // ── UK check ──────────────────────────────────────────────
// function isUK(address = "", postcode = "") {
//     const text = `${address} ${postcode}`.toUpperCase();
//     return (
//         /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(postcode) ||
//         text.includes("UNITED KINGDOM") ||
//         text.includes(" UK") ||
//         text.includes("ENGLAND") ||
//         text.includes("SCOTLAND") ||
//         text.includes("WALES")
//     );
// }

// // ── Extract business details from About page text ─────────
// function extractBusinessDetails(pageText, sellerId) {

//     const details = {
//         businessName: sellerId,
//         address: null,
//         postcode: null,
//         email: null,
//         phoneNumber: null,
//         faxNumber: null,
//         vatNumber: null,
//         registrationNumber: null,
//         ownerName: null,
//     };

//     if (!pageText) return details;

//     const lines = pageText.split("\n").map(l => l.trim()).filter(Boolean);

//     // label-based extraction — handles "Label: Value" on one line
//     // and "Label\nValue" on consecutive lines
//     function extract(labels) {
//         for (const label of labels) {
//             // same line
//             const re = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[:\\s]+(.+)", "i");
//             const m = pageText.match(re);
//             if (m) return m[1].trim();

//             // two lines
//             const idx = lines.findIndex(
//                 l => l.toLowerCase().replace(/:$/, "").trim() === label.toLowerCase()
//             );
//             if (idx !== -1 && lines[idx + 1]) return lines[idx + 1].trim();
//         }
//         return null;
//     }

//     details.businessName = extract(["Business name", "Registered business name"]) || sellerId;
//     details.address = extract(["Address"]);
//     details.email = extract(["Email"]) || pageText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)?.[0] || null;
//     details.phoneNumber = extract(["Phone number", "Phone", "Tel"]);
//     details.faxNumber = extract(["Fax number", "Fax"]);
//     details.vatNumber = extract(["VAT number", "VAT no", "VAT"]);
//     details.registrationNumber = extract(["CRN", "Company registration number", "Company reg"]);

//     const firstName = extract(["First name"]);
//     const surname = extract(["Surname", "Last name"]);
//     if (firstName && surname) details.ownerName = `${firstName} ${surname}`;

//     // extract postcode from address
//     if (details.address) {
//         const pm = details.address.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b/i);
//         if (pm) details.postcode = pm[1].toUpperCase();
//     }

//     return details;

// }

// // ── Phase 2: open about page in fresh browser ─────────────
// // Loads cookies first, goes DIRECTLY to the about URL —
// // no ebay.co.uk warmup needed since cookies already establish session.

// async function scrapeAboutPage(aboutUrl, sellerId) {

//     let browser;

//     try {

//         log(`Phase 2 → ${sellerId} : ${aboutUrl}`, "info");

//         browser = await launchBrowser();
//         const page = await browser.newPage();
//         await page.setViewport({ width: 1366, height: 768 });

//         // ── Load cookies BEFORE any navigation ──────────────
//         // Cookies establish the eBay session so the first request
//         // is already authenticated — no warmup page needed.
//         await loadCookies(page);

//         await page.setExtraHTTPHeaders({
//             "Accept-Language": "en-GB,en;q=0.9",
//             "sec-ch-ua": '"Chromium";v="124", "Not(A:Brand";v="24", "Google Chrome";v="124"',
//             "sec-ch-ua-mobile": "?0",
//             "sec-ch-ua-platform": '"Windows"'
//         });

//         // ── Go directly to about URL ─────────────────────────
//         await page.goto(aboutUrl, {
//             waitUntil: "networkidle2",
//             timeout: 90000
//         });

//         await randomDelay(4000, 7000);

//         // gentle scroll — looks human, also triggers lazy-loaded content
//         await page.evaluate(() => window.scrollBy(0, 500));
//         await randomDelay(2000, 3500);

//         // ── Check for CAPTCHA ────────────────────────────────
//         const captcha = await page.evaluate(() => {
//             const body = document.body?.innerText?.toLowerCase() || "";
//             return (
//                 !!document.querySelector('iframe[src*="captcha"]') ||
//                 !!document.querySelector('#captcha-container') ||
//                 body.includes("verify you") ||
//                 body.includes("security check")
//             );
//         });

//         if (captcha) {
//             log(`CAPTCHA on ${sellerId} — skipping`, "warn");
//             return null;
//         }

//         // ── Extract text ─────────────────────────────────────
//         const pageText = await page.evaluate(() => {
//             // try the specific business section first
//             const section = document.querySelector(
//                 '.str-business-details__seller-info, ' +
//                 '[data-testid="SELLER_LEGAL_INFO"], ' +
//                 '.legal-info'
//             );
//             return section ? section.innerText : document.body.innerText || "";
//         });

//         const details = extractBusinessDetails(pageText, sellerId);

//         // ── Print result ─────────────────────────────────────
//         console.log("\n" + "═".repeat(80));
//         log(`RESULT: ${sellerId}`, "info");
//         console.log("═".repeat(80));
//         console.log("  Business  :", details.businessName);
//         console.log("  Owner     :", details.ownerName || "—");
//         console.log("  Address   :", details.address || "—");
//         console.log("  Postcode  :", details.postcode || "—");
//         console.log("  Phone     :", details.phoneNumber || "—");
//         console.log("  Fax       :", details.faxNumber || "—");
//         console.log("  Email     :", details.email || "—");
//         console.log("  VAT       :", details.vatNumber || "—");
//         console.log("  CRN       :", details.registrationNumber || "—");
//         console.log("  Is UK?    :", isUK(details.address, details.postcode) ? "YES ✅" : "NO ❌");
//         console.log("  Raw snip  :", pageText.slice(0, 300).replace(/\n/g, " "));
//         console.log("═".repeat(80) + "\n");

//         if (!isUK(details.address, details.postcode)) {
//             log(`Non-UK — skipping ${sellerId}`, "warn");
//             return null;
//         }

//         return details;

//     } catch (err) {
//         log(`Phase 2 error for ${sellerId}: ${err.message}`, "error");
//         return null;
//     } finally {
//         if (browser) await browser.close();
//     }

// }

// // ── Main ──────────────────────────────────────────────────

// async function run() {

//     log("═══════════════════════════════════════════", "info");
//     log("eBay Test — Phase 1 + Phase 2", "info");
//     log(`Keywords : ${KEYWORDS.join(", ")}`, "info");
//     log(`Pages    : ${PAGES} | Skip: ${SKIP_PAGES} | Max: ${MAX_LEADS}`, "info");
//     log("═══════════════════════════════════════════", "info");

//     await database();
//     log("MongoDB connected", "success");

//     const startTime = Date.now();
//     const allLeads = [];
//     const visitedSellers = new Set();
//     let processed = 0;

//     // ── PHASE 1: search + collect seller IDs + about URLs ───

//     log("\n── Phase 1: Search & collect seller info ──", "info");

//     let browser;

//     try {

//         browser = await launchBrowser();
//         const page = await browser.newPage();
//         await page.setViewport({ width: 1366, height: 768 });

//         await loadCookies(page);

//         // warm up on homepage for Phase 1 search session
//         await page.goto("https://www.ebay.co.uk", { waitUntil: "domcontentloaded" });
//         await randomDelay(4000, 7000);
//         log("Phase 1 session ready", "success");

//         for (const keyword of KEYWORDS) {

//             if (processed >= MAX_LEADS) break;

//             log(`Searching: "${keyword}"`, "info");

//             const listings = await ebaySearchScraper(page, keyword, PAGES, SKIP_PAGES);

//             log(`Found ${listings.length} listings`, "info");

//             for (let i = 0; i < listings.length && processed < MAX_LEADS; i++) {

//                 await randomDelay(4000, 9000);

//                 const url = listings[i];

//                 log(`[${i + 1}/${listings.length}] ${url}`, "dim");

//                 try {

//                     // extract seller username + build about URL from listing page only
//                     const sellerInfo = await page.evaluate(async (listingUrl) => {

//                         // we're already on the search results page, need to navigate
//                         return null; // handled below

//                     }, url);

//                     // navigate to listing to get seller username
//                     await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
//                     await randomDelay(2000, 4000);

//                     const info = await page.evaluate(() => {

//                         const candidates = [
//                             document.querySelector('.ux-seller-section__item--seller a'),
//                             document.querySelector('[data-testid="str-title"] a'),
//                             document.querySelector('.mbg-nw a'),
//                             ...Array.from(document.querySelectorAll('a[href*="/str/"]')),
//                             ...Array.from(document.querySelectorAll('a[href*="/usr/"]')),
//                         ].filter(Boolean);

//                         for (const el of candidates) {
//                             const href = el.href || "";
//                             const match = href.match(/\/(?:str|usr)\/([^/?#\s]+)/);
//                             if (match?.[1]) {
//                                 return {
//                                     username: match[1],
//                                     aboutUrl: `https://www.ebay.co.uk/str/${match[1]}?_tab=about`
//                                 };
//                             }
//                         }

//                         return null;

//                     });

//                     if (!info?.username) {
//                         log("No username found — skip", "warn");
//                         continue;
//                     }

//                     if (visitedSellers.has(info.username)) {
//                         log(`Duplicate seller ${info.username} — skip`, "dim");
//                         continue;
//                     }

//                     visitedSellers.add(info.username);
//                     processed++;

//                     const lead = {
//                         sellerId: info.username,
//                         sellerName: info.username,
//                         aboutUrl: info.aboutUrl,
//                         listingUrl: url,
//                         keyword,
//                         fulfillment: "FBM",
//                         country: "UK"
//                     };

//                     // save Phase 1 data (no address yet)
//                     await EbayLead.findOneAndUpdate(
//                         { sellerId: info.username },
//                         lead,
//                         { upsert: true, new: true, setDefaultsOnInsert: true }
//                     );

//                     log(`Phase 1 saved: ${info.username} → ${info.aboutUrl}`, "success");

//                 } catch (err) {
//                     log(`Error on listing ${i + 1}: ${err.message}`, "error");
//                 }

//             }

//         }

//     } finally {
//         if (browser) await browser.close();
//         log("Phase 1 browser closed", "dim");
//     }

//     // ── PHASE 2: fresh browser per seller, load cookies, go direct to about URL ─

//     log("\n── Phase 2: Scrape about pages ──", "info");

//     const leadsToEnrich = await EbayLead.find({ address: null })
//         .limit(MAX_LEADS)
//         .lean();

//     log(`${leadsToEnrich.length} leads to enrich`, "info");

//     for (let i = 0; i < leadsToEnrich.length; i++) {

//         const lead = leadsToEnrich[i];

//         // staggered delay between sellers
//         if (i > 0) await randomDelay(20000, 40000);

//         const details = await scrapeAboutPage(lead.aboutUrl, lead.sellerId);

//         if (!details) continue;

//         await EbayLead.findOneAndUpdate(
//             { sellerId: lead.sellerId },
//             {
//                 businessName: details.businessName,
//                 ownerName: details.ownerName,
//                 address: details.address,
//                 postcode: details.postcode,
//                 email: details.email,
//                 phoneNumber: details.phoneNumber,
//                 vatNumber: details.vatNumber,
//                 registrationNumber: details.registrationNumber,
//                 verifiedAt: new Date()
//             }
//         );

//         allLeads.push({ ...lead, ...details });
//         log(`Saved: ${details.businessName}`, "success");

//     }

//     // ── Summary ───────────────────────────────────────────

//     const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

//     log("═══════════════════════════════════════════", "info");
//     log(`DONE in ${elapsed}s — ${allLeads.length} leads enriched`, "success");
//     log("═══════════════════════════════════════════", "info");

//     fs.writeFileSync(
//         "./ebay-test-results.json",
//         JSON.stringify({ total: allLeads.length, elapsed: elapsed + "s", leads: allLeads }, null, 2)
//     );

//     log("Results saved to ebay-test-results.json", "success");

//     process.exit(0);

// }

// run().catch(err => {
//     console.error("Fatal:", err.message);
//     process.exit(1);
// });























require("dotenv").config();

// Force reload browserManager (fixes "is not a function" error)
delete require.cache[require.resolve("./src/utils/browserManager")];

const { launchBrowser, fetchFreeUKProxies } = require("./src/utils/ebayBrowserManager");
const { loadCookies } = require("./src/utils/ebayCookiesManager");
const ebaySearchScraper = require("./src/scrapper/ebaySearchScraper");
const EbayLead = require("./src/models/ebayLeadModel");
const database = require("./src/config/DB_Connection");
const fs = require("fs");

// ── Config ────────────────────────────────────────────────
const KEYWORDS = ["cable ties"];
const PAGES = 1;
const SKIP_PAGES = 0;
const MAX_LEADS = 20;
// ─────────────────────────────────────────────────────────

function log(msg, type = "info") {
    const colors = {
        info: "\x1b[36m",
        success: "\x1b[32m",
        warn: "\x1b[33m",
        error: "\x1b[31m",
        dim: "\x1b[90m"
    };
    console.log(`${colors[type] || ""}[${type.toUpperCase()}] ${msg}\x1b[0m`);
}

function randomDelay(min, max) {
    const ms = Math.floor(Math.random() * (max - min)) + min;
    return new Promise(r => setTimeout(r, ms));
}

// ── UK check ──────────────────────────────────────────────
function isUK(address = "", postcode = "") {
    const text = `${address} ${postcode}`.toUpperCase();
    return (
        /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(postcode) ||
        text.includes("UNITED KINGDOM") ||
        text.includes(" UK") ||
        text.includes("ENGLAND") ||
        text.includes("SCOTLAND") ||
        text.includes("WALES")
    );
}

// ── Extract business details ─────────
function extractBusinessDetails(pageText, sellerId) {
    const details = {
        businessName: sellerId,
        address: null,
        postcode: null,
        email: null,
        phoneNumber: null,
        faxNumber: null,
        vatNumber: null,
        registrationNumber: null,
        ownerName: null,
    };

    if (!pageText) return details;

    const lines = pageText.split("\n").map(l => l.trim()).filter(Boolean);

    function extract(labels) {
        for (const label of labels) {
            const re = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[:\\s]+(.+)", "i");
            const m = pageText.match(re);
            if (m) return m[1].trim();

            const idx = lines.findIndex(l => l.toLowerCase().replace(/:$/, "").trim() === label.toLowerCase());
            if (idx !== -1 && lines[idx + 1]) return lines[idx + 1].trim();
        }
        return null;
    }

    details.businessName = extract(["Business name", "Registered business name"]) || sellerId;
    details.address = extract(["Address"]);
    details.email = extract(["Email"]) || pageText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)?.[0] || null;
    details.phoneNumber = extract(["Phone number", "Phone", "Tel"]);
    details.faxNumber = extract(["Fax number", "Fax"]);
    details.vatNumber = extract(["VAT number", "VAT no", "VAT"]);
    details.registrationNumber = extract(["CRN", "Company registration number", "Company reg"]);

    const firstName = extract(["First name"]);
    const surname = extract(["Surname", "Last name"]);
    if (firstName && surname) details.ownerName = `${firstName} ${surname}`;

    if (details.address) {
        const pm = details.address.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b/i);
        if (pm) details.postcode = pm[1].toUpperCase();
    }

    return details;
}

// ── Improved Phase 2 with Free Proxy Rotation ─────────────
async function scrapeAboutPage(aboutUrl, sellerId) {
    let browser;

    for (let attempt = 0; attempt < 6; attempt++) {
        try {
            log(`Phase 2 → ${sellerId} | Free Proxy Attempt ${attempt + 1}`, "info");

            browser = await launchBrowser(true);
            const page = await browser.newPage();
            await page.setViewport({ width: 1366, height: 768 });

            await loadCookies(page);

            await page.setExtraHTTPHeaders({
                "Accept-Language": "en-GB,en;q=0.9",
            });

            // Use lighter wait condition for slow proxies
            await page.goto(aboutUrl, {
                waitUntil: "domcontentloaded",
                timeout: 120000
            });

            // Wait longer for slow free proxies + human behavior
            await randomDelay(8000, 16000);

            // Scroll to trigger lazy loading
            await page.evaluate(() => {
                window.scrollBy(0, 800);
            });
            await randomDelay(3000, 6000);

            await page.evaluate(() => {
                window.scrollBy(0, 600);
            });
            await randomDelay(2000, 4000);

            // Strong CAPTCHA detection
            const captcha = await page.evaluate(() => {
                const body = document.body?.innerText?.toLowerCase() || "";
                return (
                    !!document.querySelector('iframe[src*="arkoselabs"], iframe[src*="funcaptcha"], iframe[src*="captcha"]') ||
                    !!document.querySelector('#captcha-container') ||
                    body.includes("please verify yourself") ||
                    body.includes("verify yourself to continue") ||
                    body.includes("security check")
                );
            });

            if (captcha) {
                log(`CAPTCHA detected on ${sellerId} — switching proxy...`, "warn");
                await browser.close();
                await randomDelay(20000, 40000);
                continue;
            }

            // Extract text with longer wait if needed
            const pageText = await page.evaluate(() => document.body.innerText);

            if (pageText.length < 500) {
                log(`Page content too short for ${sellerId} — retrying`, "warn");
                await browser.close();
                await randomDelay(10000, 20000);
                continue;
            }

            const details = extractBusinessDetails(pageText, sellerId);

            console.log("\n" + "═".repeat(80));
            log(`SUCCESS: ${sellerId}`, "success");
            console.log("═".repeat(80));
            console.log("  Business :", details.businessName);
            console.log("  Address  :", details.address || "—");
            console.log("  Postcode :", details.postcode || "—");
            console.log("  Email    :", details.email || "—");
            console.log("  Phone    :", details.phoneNumber || "—");
            console.log("  VAT      :", details.vatNumber || "—");
            console.log("  CRN      :", details.registrationNumber || "—");
            console.log("═".repeat(80) + "\n");

            await browser.close();
            return details;

        } catch (err) {
            log(`Attempt ${attempt + 1} failed: ${err.message}`, "error");
        } finally {
            if (browser) await browser.close().catch(() => { });
        }
    }

    log(`All proxy attempts failed for ${sellerId}`, "error");
    return null;
}

// ── Main ──────────────────────────────────────────────────
async function run() {

    log("═══════════════════════════════════════════", "info");
    log("eBay Test — Phase 1 + Phase 2 (Free Proxy Rotation)", "info");
    log(`Keywords : ${KEYWORDS.join(", ")}`, "info");
    log(`Pages    : ${PAGES} | Max Leads: ${MAX_LEADS}`, "info");
    log("═══════════════════════════════════════════", "info");

    await database();
    log("MongoDB connected", "success");

    // Fetch free proxies
    await fetchFreeUKProxies();

    const startTime = Date.now();
    const allLeads = [];
    const visitedSellers = new Set();
    let processed = 0;

    // PHASE 1
    log("\n── Phase 1: Collecting sellers ──", "info");

    let browser;
    try {
        browser = await launchBrowser(false);
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });

        await loadCookies(page);
        await page.goto("https://www.ebay.co.uk", { waitUntil: "domcontentloaded" });
        await randomDelay(4000, 7000);

        for (const keyword of KEYWORDS) {
            if (processed >= MAX_LEADS) break;

            const listings = await ebaySearchScraper(page, keyword, PAGES, SKIP_PAGES);

            for (let i = 0; i < listings.length && processed < MAX_LEADS; i++) {
                await randomDelay(4000, 9000);
                const url = listings[i];

                try {
                    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
                    await randomDelay(2000, 4000);

                    const info = await page.evaluate(() => {
                        const candidates = [
                            document.querySelector('.ux-seller-section__item--seller a'),
                            document.querySelector('[data-testid="str-title"] a'),
                            ...Array.from(document.querySelectorAll('a[href*="/str/"]')),
                        ].filter(Boolean);

                        for (const el of candidates) {
                            const match = el.href.match(/\/(?:str|usr)\/([^/?#\s]+)/);
                            if (match?.[1]) {
                                return {
                                    username: match[1],
                                    aboutUrl: `https://www.ebay.co.uk/str/${match[1]}?_tab=about`
                                };
                            }
                        }
                        return null;
                    });

                    if (!info?.username || visitedSellers.has(info.username)) continue;

                    visitedSellers.add(info.username);
                    processed++;

                    const lead = {
                        sellerId: info.username,
                        sellerName: info.username,
                        aboutUrl: info.aboutUrl,
                        listingUrl: url,
                        keyword,
                        fulfillment: "FBM",
                        country: "UK"
                    };

                    await EbayLead.findOneAndUpdate(
                        { sellerId: info.username },
                        lead,
                        { upsert: true, new: true }
                    );

                    log(`Phase 1 saved: ${info.username}`, "success");

                } catch (err) {
                    log(`Error on listing: ${err.message}`, "error");
                }
            }
        }
    } finally {
        if (browser) await browser.close();
    }

    // PHASE 2
    log("\n── Phase 2: Enriching with Free Proxies ──", "info");

    const leadsToEnrich = await EbayLead.find({ address: null }).limit(MAX_LEADS).lean();

    for (let i = 0; i < leadsToEnrich.length; i++) {
        if (i > 0) await randomDelay(25000, 45000);

        const lead = leadsToEnrich[i];
        const details = await scrapeAboutPage(lead.aboutUrl, lead.sellerId);

        if (details) {
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
                    verifiedAt: new Date()
                }
            );
            log(`Updated: ${lead.sellerId}`, "success");
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`DONE in ${elapsed}s`, "success");

    process.exit(0);
}

run().catch(err => {
    console.error("Fatal:", err.message);
    process.exit(1);
});