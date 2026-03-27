

// const puppeteer = require("puppeteer-extra");
// const StealthPlugin = require("puppeteer-extra-plugin-stealth");

// puppeteer.use(StealthPlugin());

// const USER_AGENTS = [
//     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
//     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0",
//     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
//     "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
// ];

// function getRandomAgent() {
//     return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
// }

// async function launchBrowser() {

//     const browser = await puppeteer.launch({
//         headless: false,

//         // Microsoft Edge executable
//         executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",

//         // Real Edge profile — has cookies, localStorage, history
//         userDataDir: `C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\Microsoft\\Edge\\User Data`,

//         args: [
//             "--profile-directory=Default",
//             "--no-sandbox",
//             "--disable-setuid-sandbox",
//             "--disable-blink-features=AutomationControlled",
//             "--disable-infobars",
//             "--window-size=1366,768"
//         ],

//         defaultViewport: null,
//         slowMo: 50
//     });

//     return browser;

// }

// module.exports = { launchBrowser, getRandomAgent };






const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
];

function getRandomAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Free proxy list (we will auto-update it)
let PROXY_LIST = [];

async function fetchFreeUKProxies() {
    try {
        console.log("[Proxy] Fetching fresh free UK proxies...");

        // You can add more sources later
        const sources = [
            "https://proxyscrape.com/free-proxy-list/united-kingdom",
            "https://free-proxy-list.net/en/uk-proxy.html",
            "https://spys.one/free-proxy-list/GB/"
        ];

        // For simplicity, we'll hardcode a few working ones from recent lists (replace with your own fetch logic if needed)
        PROXY_LIST = [
            "http://167.103.144.127:8800",      // from proxyscrape
            "http://152.26.229.52:9443",
            "http://124.83.119.160:8082",
            "http://41.33.173.83:8080",
            "http://192.232.48.19:8181",
            // Add more from spys.one or free-proxy-list.net
        ];

        console.log(`[Proxy] Loaded ${PROXY_LIST.length} free UK proxies`);
    } catch (err) {
        console.log("[Proxy] Failed to fetch proxies:", err.message);
    }
}

function getNextProxy() {
    if (PROXY_LIST.length === 0) return null;
    const proxy = PROXY_LIST[Math.floor(Math.random() * PROXY_LIST.length)];
    return proxy;
}

async function launchBrowser(useProxy = true) {
    const args = [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--window-size=1366,768"
    ];

    let proxyUrl = null;
    if (useProxy) {
        proxyUrl = getNextProxy();
        if (proxyUrl) {
            args.push(`--proxy-server=${proxyUrl}`);
            console.log(`[Browser] Using free proxy: ${proxyUrl}`);
        }
    }

    const browser = await puppeteer.launch({
        // headless: "new",
        headless : false,
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        args,
        defaultViewport: { width: 1366, height: 768 }
    });

    return browser;
}

module.exports = {
    launchBrowser,
    getRandomAgent,
    fetchFreeUKProxies
};