require("dotenv").config();
const puppeteer = require("puppeteer"); // or your launchBrowser
const { saveCookies } = require("./src/utils/cookieManager");

(async () => {
    const browser = await puppeteer.launch({ 
        headless: false, 
        args: ['--start-maximized'] 
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    console.log("→ Go to eBay.co.uk and log in manually...");
    await page.goto("https://www.ebay.co.uk", { waitUntil: "networkidle2" });

    console.log("→ Log in with your account, solve any CAPTCHA if it appears, then browse a bit.");
    console.log("→ When you're fully logged in and on the homepage, press ENTER in this terminal...");

    process.stdin.once('data', async () => {
        await saveCookies(page);
        await browser.close();
        console.log("✅ Cookies saved! You can now delete this temporary script.");
    });
})();