// const { getRandomAgent } = require("../utils/browserManager");

// module.exports = async function scrapeEbayProduct(page, productUrl) {

//     try {

//         console.log("Opening eBay product page:", productUrl);

//         await page.setUserAgent(getRandomAgent());

//         const loaded = await safeGoto(page, productUrl);

//         if (!loaded) {
//             console.log("Failed to load product page");
//             return null;
//         }

//         await randomDelay(3000, 5000);

//         // CAPTCHA
//         const captcha = await page.$('input#captcha, iframe[src*="captcha"]');
//         if (captcha) {
//             console.log("CAPTCHA detected — waiting...");
//             await randomDelay(40000, 50000);
//             return null;
//         }

//         const data = await page.evaluate(() => {

//             const result = {
//                 title: "",
//                 price: "",
//                 sellerName: "",
//                 sellerLink: "",
//                 sellerRating: "",
//                 totalFeedback: ""
//             };

//             // ─── TITLE ─────────────────────────────
//             const titleEl =
//                 document.querySelector('h1 span') ||
//                 document.querySelector('[data-testid="x-item-title"] span');

//             if (titleEl) result.title = titleEl.innerText.trim();

//             // ─── PRICE ─────────────────────────────
//             const priceEl =
//                 document.querySelector('[data-testid="x-price-primary"] span') ||
//                 document.querySelector('.x-price-primary span') ||
//                 document.querySelector('.notranslate');

//             if (priceEl) result.price = priceEl.innerText.trim();

//             // ─── SELLER (NEW LAYOUT - YOUR HTML) ───
//             const sellerBlock = document.querySelector('.x-sellercard-atf');

//             if (sellerBlock) {

//                 const nameEl = sellerBlock.querySelector('.ux-textspans--BOLD');
//                 if (nameEl) result.sellerName = nameEl.innerText.trim();

//                 const linkEl = sellerBlock.querySelector('a[href*="/str/"]');
//                 if (linkEl) result.sellerLink = linkEl.href;

//                 const ratingEl = sellerBlock.querySelector('.ux-textspans--PSEUDOLINK');
//                 if (ratingEl) result.sellerRating = ratingEl.innerText.trim();

//                 const feedbackEl = sellerBlock.querySelector('.ux-textspans--SECONDARY');
//                 if (feedbackEl) result.totalFeedback = feedbackEl.innerText.replace(/[()]/g, "").trim();
//             }

//             return result;

//         });

//         console.log(
//             "Product scraped:",
//             data.title || "(no title)",
//             "| Seller:", data.sellerName || "—"
//         );

//         return data;

//     } catch (err) {

//         console.log("eBay product scraper error:", err.message);
//         return null;

//     }

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

//             console.log(`Goto failed attempt ${attempt}:`, err.message);

//             if (attempt < retries) await randomDelay(3000, 6000);
//         }
//     }

//     return false;
// }

// function randomDelay(min, max) {
//     const ms = Math.floor(Math.random() * (max - min)) + min;
//     return new Promise(r => setTimeout(r, ms));
// }



const { getRandomAgent } = require("../utils/ebayBrowserManager");

module.exports = async function scrapeEbayProduct(page, productUrl) {
    try {
        console.log("Opening eBay product page:", productUrl);

        await page.setUserAgent(getRandomAgent());

        const loaded = await safeGoto(page, productUrl);
        if (!loaded) {
            console.log("Failed to load product page");
            return null;
        }

        await randomDelay(3000, 6000);

        // ─────────────────────────────────────────
        // 🚨 CAPTCHA / HUMAN CHECK
        // ─────────────────────────────────────────
        const blocked = await page.evaluate(() => {
            const text = document.body.innerText.toLowerCase();
            return (
                text.includes("verify yourself") ||
                text.includes("are you human") ||
                text.includes("robot check") ||
                text.includes("security check")
            );
        });

        if (blocked) {
            console.log("🚨 CAPTCHA detected — waiting...");
            await randomDelay(30000, 40000);
            return null;
        }

        // ─────────────────────────────────────────
        // 🧠 EXTRACT DATA
        // ─────────────────────────────────────────
        const data = await page.evaluate(() => {
            const result = {
                title: "",
                price: "",
                sellerName: "",
                sellerLink: "",
                sellerRating: "",
                totalFeedback: ""
            };

            // ─── TITLE ──────────────────────────────
            const titleEl =
                document.querySelector("#itemTitle") ||
                document.querySelector(".x-item-title__mainTitle");

            if (titleEl) {
                result.title = titleEl.innerText
                    .replace("Details about  \xa0", "")
                    .trim();
            }

            // ─── PRICE ──────────────────────────────
            const priceEl =
                document.querySelector(".x-price-primary span") ||
                document.querySelector("#prcIsum") ||
                document.querySelector(".notranslate");

            if (priceEl) {
                result.price = priceEl.innerText.trim();
            }

            // ─────────────────────────────────────────
            // 🔥 NEW EBAY SELLER CARD (MAIN FIX)
            // ─────────────────────────────────────────
            const sellerCard = document.querySelector(".x-sellercard-atf");

            if (sellerCard) {
                const linkEl = sellerCard.querySelector(
                    ".x-sellercard-atf__info__about-seller a"
                );

                if (linkEl) {
                    result.sellerName = linkEl.innerText.trim();
                    result.sellerLink = linkEl.href;
                }

                // Rating
                const ratingEl = sellerCard.querySelector(
                    ".ux-textspans--PSEUDOLINK"
                );
                if (ratingEl) {
                    result.sellerRating = ratingEl.innerText.trim();
                }

                // Feedback count (e.g. "(198301)")
                const feedbackEl = sellerCard.querySelector(
                    ".ux-textspans--SECONDARY"
                );
                if (feedbackEl && feedbackEl.innerText.includes("(")) {
                    result.totalFeedback = feedbackEl.innerText.replace(/[()]/g, "");
                }
            }

            // ─────────────────────────────────────────
            // 🔁 FALLBACK (OLD EBAY LAYOUT)
            // ─────────────────────────────────────────
            if (!result.sellerName) {
                const sellerEl =
                    document.querySelector(".mbg-nw") ||
                    document.querySelector('[data-testid="ux-seller-section"] a');

                if (sellerEl) {
                    result.sellerName = sellerEl.innerText.trim();
                    result.sellerLink = sellerEl.href;
                }

                const ratingEl = document.querySelector(".mbg-l span");
                if (ratingEl) result.sellerRating = ratingEl.innerText.trim();

                const feedbackEl = document.querySelector(".mbg-l a");
                if (feedbackEl) {
                    result.totalFeedback = feedbackEl.innerText.replace(/[()]/g, "");
                }
            }

            return result;
        });

        // ─────────────────────────────────────────
        // 🔥 FINAL FIX: HANDLE MISSING SELLER LINK
        // ─────────────────────────────────────────

        if (data.sellerName && !data.sellerLink) {
            data.sellerLink = `https://www.ebay.co.uk/str/${data.sellerName}?_tab=about`;
            console.log("Generated seller URL:", data.sellerLink);
        }

        // Clean tracking params
        if (data.sellerLink) {
            data.sellerLink = data.sellerLink.split("?")[0];
        }

        // ─────────────────────────────────────────
        // ❌ NO SELLER CASE
        // ─────────────────────────────────────────
        if (!data.sellerName) {
            console.log("❌ No seller found — skipping");
            return null;
        }

        console.log(
            "Product scraped:",
            data.title || "(no title)",
            "| Seller:",
            data.sellerName
        );

        return data;

    } catch (err) {
        console.log("❌ eBay product scraper error:", err.message);
        return null;
    }
};



// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

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
    return new Promise(resolve => setTimeout(resolve, ms));
}