// const { getRandomAgent } = require("../utils/browserManager");

// module.exports = async function searchEbay(page, keyword, maxPages = 3, skipPages = 0) {

//     const allLinks = new Set();
//     const startPage = skipPages + 1;
//     const endPage = skipPages + maxPages;

//     await page.setUserAgent(getRandomAgent());

//     console.log(`Searching eBay UK — keyword: "${keyword}" | pages: ${startPage}-${endPage}`);

//     for (let pageNum = startPage; pageNum <= endPage; pageNum++) {

//         const url = `https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(keyword)}&_pgn=${pageNum}`;
//         console.log(`Opening eBay search page ${pageNum}:`, url);

//         const loaded = await safeGoto(page, url);

//         if (!loaded) {
//             console.log(`Page ${pageNum} failed to load — skipping`);
//             continue;
//         }

//         await randomDelay(4000, 7000);

//         // ─── CAPTCHA detection ─────────────────────────────
//         const captcha = await page.$('input#captcha, iframe[src*="captcha"]');

//         if (captcha) {
//             console.log("CAPTCHA detected — waiting 60 seconds...");
//             await randomDelay(60000, 65000);
//             pageNum--; // retry same page
//             continue;
//         }

//         await autoScroll(page);

//         // ─── DEBUG: check page content ─────────────────────
//         const debugCount = await page.$$eval("a", els => els.length);
//         console.log("Total <a> tags on page:", debugCount);

//         // ─── Extract links (NEW + OLD layout) ──────────────
//         const links = await page.evaluate(() => {

//             const found = new Set();

//             // NEW eBay layout (your HTML)
//             document.querySelectorAll('a.s-card__link').forEach(el => {
//                 if (!el.href) return;

//                 try {
//                     const url = new URL(el.href);
//                     const clean = url.origin + url.pathname;

//                     if (clean.includes("/itm/")) {
//                         found.add(clean);
//                     }
//                 } catch { }
//             });

//             // OLD fallback layout
//             document.querySelectorAll('a.s-item__link').forEach(el => {
//                 if (!el.href) return;

//                 try {
//                     const url = new URL(el.href);
//                     const clean = url.origin + url.pathname;

//                     if (clean.includes("/itm/")) {
//                         found.add(clean);
//                     }
//                 } catch { }
//             });

//             return [...found];

//         });

//         console.log(`Page ${pageNum}: found ${links.length} products`);

//         links.forEach(link => allLinks.add(link));

//         await randomDelay(2000, 4000);
//     }

//     console.log(`Total unique eBay products collected for "${keyword}":`, allLinks.size);

//     return [...allLinks];
// };

// // ─── Helpers ──────────────────────────────────────────────

// async function safeGoto(page, url, retries = 2) {

//     for (let attempt = 1; attempt <= retries; attempt++) {

//         try {

//             await page.goto(url, {
//                 waitUntil: "domcontentloaded",
//                 timeout: 60000
//             });

//             return true;

//         } catch (err) {

//             console.log(`Navigation failed (attempt ${attempt}):`, err.message);

//             if (attempt < retries) await randomDelay(3000, 6000);
//         }
//     }

//     return false;
// }

// async function autoScroll(page) {

//     await page.evaluate(async () => {

//         await new Promise(resolve => {

//             let total = 0;
//             const distance = 300;

//             const timer = setInterval(() => {

//                 window.scrollBy(0, distance);
//                 total += distance;

//                 if (total >= document.body.scrollHeight) {
//                     clearInterval(timer);
//                     resolve();
//                 }

//             }, 200);

//         });

//     });
// }

// function randomDelay(min, max) {
//     const ms = Math.floor(Math.random() * (max - min)) + min;
//     return new Promise(r => setTimeout(r, ms));
// }


// claude 









    const { getRandomAgent } = require("../utils/ebayBrowserManager");

    // ─────────────────────────────────────────────────────────
    // ebaySearchScraper
    //
    // Scrapes eBay.co.uk search results for listing URLs.
    // Only collects listings from BUSINESS sellers (not private).
    //
    // Args:
    //   page       — puppeteer page
    //   keyword    — search term
    //   maxPages   — how many pages to scrape
    //   skipPages  — how many pages to skip before starting
    // ─────────────────────────────────────────────────────────

    module.exports = async function ebaySearchScraper(page, keyword, maxPages = 1, skipPages = 0) {

        const allLinks = new Set();
        const startPage = skipPages + 1;
        const endPage = skipPages + maxPages;

        await page.setUserAgent(getRandomAgent());

        console.log(`eBay search — keyword: "${keyword}" | pages: ${startPage}–${endPage}`);

        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {

            // eBay UK search URL — _pgn is the page number
            const url = `https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(keyword)}&_pgn=${pageNum}&_ipg=240`;

            console.log(`eBay page ${pageNum}/${endPage}:`, url);

            const loaded = await safeGoto(page, url);

            if (!loaded) {
                console.log(`eBay page ${pageNum} failed — skipping`);
                continue;
            }

            await randomDelay(3000, 5000);

            // ── CAPTCHA / bot check detection ──────────────────

            const blocked = await detectBlock(page);

            if (blocked === "captcha") {
                console.log("eBay CAPTCHA hit — waiting 60s then retrying");
                await randomDelay(60000, 75000);
                pageNum--;
                continue;
            }

            if (blocked === "robot") {
                console.log("eBay robot check — waiting 45s then retrying");
                await randomDelay(45000, 60000);
                pageNum--;
                continue;
            }

            await autoScroll(page);

            // ── Extract listing links ──────────────────────────

            const links = await page.evaluate(() => {

                const found = new Set();

                // eBay listing links contain /itm/ in the URL
                document.querySelectorAll('a[href*="/itm/"]').forEach(el => {

                    const href = el.href || "";

                    // skip promoted / ad links that redirect through tracking
                    if (!href.includes("ebay.co.uk/itm/")) return;

                    // clean URL — strip query params except item ID
                    try {
                        const u = new URL(href);
                        // eBay item path: /itm/TITLE/ITEMID or /itm/ITEMID
                        const pathParts = u.pathname.split("/").filter(Boolean);
                        if (pathParts.length >= 2 && pathParts[0] === "itm") {
                            found.add(`https://www.ebay.co.uk${u.pathname}`);
                        }
                    } catch { }

                });

                return [...found];

            });

            console.log(`eBay page ${pageNum}: found ${links.length} listings`);

            links.forEach(l => allLinks.add(l));

            await randomDelay(2000, 4000);

        }

        console.log("eBay total unique listings:", allLinks.size);

        return [...allLinks];

    };

    // ─────────────────────────────────────────────────────────
    // Detect if eBay is blocking us
    // ─────────────────────────────────────────────────────────

    async function detectBlock(page) {

        return await page.evaluate(() => {

            const title = document.title.toLowerCase();
            const body = document.body?.innerText?.toLowerCase() || "";

            if (
                title.includes("security measure") ||
                title.includes("verify") ||
                body.includes("please verify you're a human") ||
                body.includes("complete the security check") ||
                document.querySelector('iframe[src*="captcha"]') ||
                document.querySelector('#captcha-container')
            ) return "captcha";

            if (
                title.includes("robot") ||
                body.includes("automated access") ||
                body.includes("unusual traffic") ||
                body.includes("access to this page has been denied")
            ) return "robot";

            return null;

        });

    }

    // ─────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────

    async function safeGoto(page, url, retries = 3) {

        for (let attempt = 1; attempt <= retries; attempt++) {

            try {

                // await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

                await randomDelay(1500, 4000); // before navigation

                await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

                await randomDelay(2000, 5000); // after load
                return true;

            } catch (err) {

                console.log(`eBay navigation failed (attempt ${attempt}):`, err.message);

                if (attempt < retries) await randomDelay(3000, 6000);

            }

        }

        return false;

    }

    async function autoScroll(page) {

        await page.evaluate(async () => {

            await new Promise(resolve => {

                let scrolled = 0;
                const step = 300;
                const maxScroll = document.body.scrollHeight;

                const timer = setInterval(() => {

                    window.scrollBy(0, step);
                    scrolled += step;

                    if (scrolled >= maxScroll) {
                        clearInterval(timer);
                        resolve();
                    }

                }, 120 + Math.floor(Math.random() * 80));

            });

        });

    }

    function randomDelay(min, max) {
        const ms = Math.floor(Math.random() * (max - min)) + min;
        return new Promise(r => setTimeout(r, ms));
    }