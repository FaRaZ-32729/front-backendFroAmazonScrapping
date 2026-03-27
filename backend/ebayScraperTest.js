const puppeteer = require("puppeteer");
const readline = require("readline");

const searchEbay = require("./src/scrapper/ebaySearchScraper");
const scrapeEbayProduct = require("./src/scrapper/ebayProductScraper");
const scrapeEbaySeller = require("./src/scrapper/ebaySellerScraper"); 

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question("Enter keyword to search on eBay: ", async (keyword) => {
    rl.close();

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    console.log(`\nScraping eBay for keyword: "${keyword}"\n`);

    const productLinks = await searchEbay(page, keyword, 2, 0);

    console.log("\nScraping first 3 products for details...\n");

    for (let i = 0; i < Math.min(productLinks.length, 3); i++) {

        // ── STEP 1: PRODUCT ─────────────────────
        const productData = await scrapeEbayProduct(page, productLinks[i]);

        if (!productData || !productData.sellerLink) {
            console.log("No seller link — skipping");
            continue;
        }

        // ── STEP 2: SELLER (NEW) ────────────────
        const sellerData = await scrapeEbaySeller(page, productData.sellerLink);

        // ── FINAL COMBINED DATA ────────────────
        const finalData = {
            ...productData,
            ...sellerData
        };

        console.log("\n🔥 FINAL RESULT:\n", finalData);
    }

    await browser.close();
});