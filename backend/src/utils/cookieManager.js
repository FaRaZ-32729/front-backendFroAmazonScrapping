const fs = require("fs");
const path = require("path");

const COOKIE_FILE = path.join(__dirname, "../cookies.json");

async function saveCookies(page) {
    const cookies = await page.cookies();
    fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
    console.log("Cookies saved:", cookies.length, "entries");
}

async function loadCookies(page) {
    if (!fs.existsSync(COOKIE_FILE)) {
        console.log("No cookie file found — skipping");
        return;
    }
    const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, "utf-8"));
    await page.setCookie(...cookies);
    console.log("Cookies loaded:", cookies.length, "entries");
}

// checks if cookies file exists from a previous login
function cookiesExist() {
    return fs.existsSync(COOKIE_FILE);
}

module.exports = { saveCookies, loadCookies, cookiesExist };



