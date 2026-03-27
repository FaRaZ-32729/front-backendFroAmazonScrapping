
const fs = require('fs').promises;
const path = require('path');

const COOKIES_PATH = path.join(__dirname, '../../ebay-cookies.json'); // adjust path if needed

// Save cookies after manual login (run this once)
async function saveCookies(page) {
    const cookies = await page.cookies();
    await fs.writeFile(COOKIES_PATH, JSON.stringify(cookies, null, 2));
    console.log(`[CookieManager] Saved ${cookies.length} eBay cookies to ${COOKIES_PATH}`);
}

// Load cookies into a fresh page
async function loadCookies(page) {
    try {
        const data = await fs.readFile(COOKIES_PATH, 'utf8');
        const cookies = JSON.parse(data);
        await page.setCookie(...cookies);
        console.log(`[CookieManager] Loaded ${cookies.length} eBay cookies`);
    } catch (err) {
        console.log(`[CookieManager] No cookies found or error: ${err.message}. Will run without session.`);
    }
}

module.exports = { saveCookies, loadCookies };