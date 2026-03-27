// const puppeteer = require("puppeteer");
// const { saveCookies } = require("./cookieManager");

// (async () => {

//     const browser = await puppeteer.launch({
//         headless: false,
//         executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
//         args: [
//             "--start-maximized",
//             "--no-sandbox",
//             "--disable-setuid-sandbox"
//         ],
//         defaultViewport: null
//     });

//     const page = await browser.newPage();

//     await page.setUserAgent(
//         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
//     );

//     await page.goto("https://www.amazon.com", {
//         waitUntil: "domcontentloaded",
//         timeout: 120000
//     });

//     console.log("🔐 Please login manually in the opened browser.");
//     console.log("After login press ENTER in this terminal.");

//     // Wait for user input instead of waiting for selector
//     await new Promise(resolve => {
//         process.stdin.once("data", resolve);
//     });

//     await saveCookies(page);

//     console.log("✅ Cookies saved successfully");

//     await browser.close();

// })();


// const puppeteer = require("puppeteer-extra");
// const StealthPlugin = require("puppeteer-extra-plugin-stealth");

// puppeteer.use(StealthPlugin());

// (async () => {

//     // Close ALL Chrome windows before running this
//     // Otherwise Chrome will block Puppeteer from using the profile

//     const browser = await puppeteer.launch({
//         headless: false,
//         executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",

//         // Point to your real Chrome profile — already logged into Amazon UK
//         userDataDir: "C:\\Users\\YourName\\AppData\\Local\\Google\\Chrome\\User Data",

//         args: [
//             "--start-maximized",
//             "--no-sandbox",
//             "--disable-setuid-sandbox",
//             "--profile-directory=Default"   // use Default profile, change if yours is Profile 1 etc
//         ],
//         defaultViewport: null
//     });

//     const page = await browser.newPage();

//     // Go straight to Amazon UK — should already be logged in
//     await page.goto("https://www.amazon.co.uk", {
//         waitUntil: "domcontentloaded",
//         timeout: 60000
//     });

//     // Check if we are actually logged in
//     const loggedIn = await page.evaluate(() => {
//         const accountText = document.querySelector("#nav-link-accountList-nav-line-1");
//         return accountText ? accountText.innerText : null;
//     });

//     console.log("Account status:", loggedIn);

//     if (loggedIn && loggedIn.toLowerCase().includes("hello")) {
//         console.log("Already logged in — ready to scrape");
//     } else {
//         console.log("Not logged in — please log in manually in the browser then press ENTER");
//         await new Promise(resolve => process.stdin.once("data", resolve));
//     }

//     await browser.close();

//     console.log("Done — you can now run the scraper");

// })();

async function loginToAmazon(page, email, password) {

    try {

        console.log("Opening Amazon UK login...");

        await page.goto(
            "https://www.amazon.co.uk/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.co.uk%2F&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=gbflex&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0",
            { waitUntil: "domcontentloaded", timeout: 60000 }
        );

        await randomDelay(2000, 3000);

        // ─── Debug: log every input field on the page ─────────
        // this tells us exactly what fields Amazon is rendering

        const inputFields = await page.evaluate(() => {
            return Array.from(document.querySelectorAll("input")).map(el => ({
                id: el.id,
                name: el.name,
                type: el.type,
                placeholder: el.placeholder,
                visible: el.getBoundingClientRect().width > 0
            }));
        });

        console.log("Input fields found on login page:");
        console.log(JSON.stringify(inputFields, null, 2));

        // ─── Email ────────────────────────────────────────────

        console.log("Entering email...");

        // find first visible text/email/tel input and fill it
        const emailTyped = await page.evaluate((emailValue) => {

            const inputs = Array.from(document.querySelectorAll("input"));

            for (const input of inputs) {

                const type = input.type.toLowerCase();
                const rect = input.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0;

                if (
                    isVisible &&
                    (type === "text" || type === "email" || type === "tel" || type === "")
                ) {
                    input.focus();
                    input.value = emailValue;
                    input.dispatchEvent(new Event("input", { bubbles: true }));
                    input.dispatchEvent(new Event("change", { bubbles: true }));
                    return { success: true, id: input.id, name: input.name };
                }

            }

            return { success: false };

        }, email);

        console.log("Email type result:", emailTyped);

        if (!emailTyped.success) {
            await page.screenshot({ path: "debug_email_fail.png", fullPage: true });
            console.log("Could not fill email — screenshot saved as debug_email_fail.png");
            return false;
        }

        await randomDelay(800, 1500);

        // click Continue — find by text content if selector fails
        const continueClicked = await page.evaluate(() => {

            // try by id first
            const byId = document.querySelector("#continue");
            if (byId) { byId.click(); return "clicked #continue"; }

            // try by type submit
            const bySubmit = document.querySelector("input[type='submit'], button[type='submit']");
            if (bySubmit) { bySubmit.click(); return "clicked submit button"; }

            // try by text content
            const allButtons = Array.from(document.querySelectorAll("button, input[type='submit'], .a-button-input"));
            for (const btn of allButtons) {
                const text = (btn.innerText || btn.value || "").toLowerCase();
                if (text.includes("continue")) {
                    btn.click();
                    return "clicked continue by text";
                }
            }

            return "no continue button found";

        });

        console.log("Continue button:", continueClicked);

        await randomDelay(3000, 4000);

        // ─── Password ─────────────────────────────────────────

        console.log("Entering password...");

        // log inputs again after clicking continue
        const inputsAfterContinue = await page.evaluate(() => {
            return Array.from(document.querySelectorAll("input")).map(el => ({
                id: el.id,
                name: el.name,
                type: el.type,
                visible: el.getBoundingClientRect().width > 0
            }));
        });

        console.log("Input fields after continue:");
        console.log(JSON.stringify(inputsAfterContinue, null, 2));

        const passwordTyped = await page.evaluate((passwordValue) => {

            const inputs = Array.from(document.querySelectorAll("input"));

            for (const input of inputs) {

                const type = input.type.toLowerCase();
                const rect = input.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0;

                if (isVisible && type === "password") {
                    input.focus();
                    input.value = passwordValue;
                    input.dispatchEvent(new Event("input", { bubbles: true }));
                    input.dispatchEvent(new Event("change", { bubbles: true }));
                    return { success: true, id: input.id, name: input.name };
                }

            }

            return { success: false };

        }, password);

        console.log("Password type result:", passwordTyped);

        if (!passwordTyped.success) {
            await page.screenshot({ path: "debug_password_fail.png", fullPage: true });
            console.log("Could not fill password — screenshot saved as debug_password_fail.png");
            return false;
        }

        await randomDelay(800, 1500);

        // click Sign In
        const signInClicked = await page.evaluate(() => {

            const byId = document.querySelector("#signInSubmit");
            if (byId) { byId.click(); return "clicked #signInSubmit"; }

            const bySubmit = document.querySelector("input[type='submit'], button[type='submit']");
            if (bySubmit) { bySubmit.click(); return "clicked submit"; }

            const allButtons = Array.from(document.querySelectorAll("button, input[type='submit'], .a-button-input"));
            for (const btn of allButtons) {
                const text = (btn.innerText || btn.value || "").toLowerCase();
                if (text.includes("sign in") || text.includes("signin")) {
                    btn.click();
                    return "clicked sign in by text";
                }
            }

            return "no sign in button found";

        });

        console.log("Sign in button:", signInClicked);

        await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => { });

        await randomDelay(2000, 3000);

        // ─── OTP check ────────────────────────────────────────

        const urlAfterLogin = page.url();
        const textAfterLogin = await page.evaluate(() => document.body.innerText.toLowerCase());

        console.log("URL after login:", urlAfterLogin);

        const otpRequired =
            urlAfterLogin.includes("/ap/mfa") ||
            urlAfterLogin.includes("/ap/cvf") ||
            urlAfterLogin.includes("auth-select-device") ||
            textAfterLogin.includes("verification code") ||
            textAfterLogin.includes("one time password") ||
            textAfterLogin.includes("verify your identity") ||
            textAfterLogin.includes("authentication required");

        if (otpRequired) {

            console.log("==================================================");
            console.log("OTP required — check your email or phone");
            console.log("Type the code and press ENTER:");
            console.log("==================================================");

            const otp = await readOtpFromTerminal();
            console.log("OTP received:", otp);

            await page.screenshot({ path: "debug_otp_page.png", fullPage: true });
            await randomDelay(1000, 2000);

            // fill OTP using evaluate
            const otpTyped = await page.evaluate((otpValue) => {

                const inputs = Array.from(document.querySelectorAll("input"));

                for (const input of inputs) {
                    const type = input.type.toLowerCase();
                    const rect = input.getBoundingClientRect();
                    const isVisible = rect.width > 0 && rect.height > 0;

                    if (
                        isVisible &&
                        type !== "hidden" &&
                        type !== "submit" &&
                        type !== "checkbox"
                    ) {
                        input.focus();
                        input.value = otpValue;
                        input.dispatchEvent(new Event("input", { bubbles: true }));
                        input.dispatchEvent(new Event("change", { bubbles: true }));
                        return { success: true, id: input.id };
                    }

                }

                return { success: false };

            }, otp.trim());

            console.log("OTP type result:", otpTyped);

            if (!otpTyped.success) {
                console.log("Could not enter OTP");
                return false;
            }

            await randomDelay(500, 1000);

            // submit OTP
            await page.evaluate(() => {
                const btns = document.querySelectorAll("input[type='submit'], button[type='submit'], .a-button-input");
                if (btns.length > 0) btns[0].click();
            });

            await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => { });
            await randomDelay(2000, 3000);

        }

        // ─── Final check ──────────────────────────────────────

        const finalText = await page.evaluate(() => document.body.innerText.toLowerCase());

        if (finalText.includes("your password is incorrect") || finalText.includes("there was a problem")) {
            console.log("Wrong email or password");
            return false;
        }

        if (finalText.includes("enter the characters") || finalText.includes("type the characters")) {
            console.log("CAPTCHA during login — try again in a few minutes");
            return false;
        }

        console.log("Saving session cookies...");
        await saveCookies(page);
        console.log("Login successful — cookies saved for future runs");

        return true;

    } catch (err) {
        console.log("Login error:", err.message);
        await page.screenshot({ path: "debug_login_error.png", fullPage: true }).catch(() => { });
        return false;
    }

}