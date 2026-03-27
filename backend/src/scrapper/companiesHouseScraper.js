// const { getRandomAgent } = require("../utils/browserManager");

// // ─────────────────────────────────────────────────────────
// // Scrape Companies House for the first listed officer
// // of a given business name.
// //
// // Flow:
// //   1. Search Companies House directly (no Google needed —
// //      the official search is reliable and avoids bot blocks)
// //   2. Click the first matching company result
// //   3. Navigate to the /officers tab
// //   4. Return the name + role of the first active officer
// // ─────────────────────────────────────────────────────────

// const BASE_URL = "https://find-and-update.company-information.service.gov.uk";

// module.exports = async function scrapeCompanyOfficer(page, businessName) {

//     try {

//         console.log("Companies House lookup:", businessName);

//         await page.setUserAgent(getRandomAgent());

//         // ── Step 1: search ──────────────────────────────────

//         const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(businessName)}`;

//         const loaded = await safeGoto(page, searchUrl);

//         if (!loaded) {
//             console.log("Companies House search page failed to load");
//             return null;
//         }

//         await randomDelay(2000, 3500);

//         // ── Step 2: grab first company result link ──────────

//         const companyPath = await page.evaluate(() => {

//             // Results are listed as <a> tags inside .govuk-list
//             // Each result has a link like /company/XXXXXXXX
//             const links = Array.from(
//                 document.querySelectorAll('a[href*="/company/"]')
//             );

//             for (const a of links) {

//                 const href = a.getAttribute("href") || "";

//                 // only match direct company profile links (not sub-pages)
//                 if (/^\/company\/[A-Z0-9]{8}$/.test(href)) {
//                     return href;
//                 }

//             }

//             return null;

//         });

//         if (!companyPath) {
//             console.log("No company result found for:", businessName);
//             return null;
//         }

//         const companyNumber = companyPath.split("/company/")[1];
//         console.log("Company number found:", companyNumber);

//         // ── Step 3: go directly to officers page ───────────

//         const officersUrl = `${BASE_URL}/company/${companyNumber}/officers`;

//         const officersLoaded = await safeGoto(page, officersUrl);

//         if (!officersLoaded) {
//             console.log("Officers page failed to load for:", companyNumber);
//             return null;
//         }

//         await randomDelay(1500, 3000);

//         // ── Step 4: extract first active officer ───────────

//         const officer = await page.evaluate(() => {

//             // ── Helper: get elements by class safely ──────────
//             // .govuk-!-font-weight-bold is invalid in querySelector
//             // because ! is not a valid CSS selector character.
//             // Use getElementsByClassName instead.

//             function getByClass(parent, cls) {
//                 const els = parent.getElementsByClassName(cls);
//                 return els.length > 0 ? els[0] : null;
//             }

//             function getAllByClass(cls) {
//                 return Array.from(document.getElementsByClassName(cls));
//             }

//             // ── Try appointment blocks first ──────────────────
//             // Companies House renders each officer in a block like:
//             // <div class="appointment-1">, <div class="appointment-2"> etc.

//             const appointmentEls = Array.from(document.querySelectorAll(
//                 '[class^="appointment-"], [class*=" appointment-"]'
//             ));

//             // also try id-based officer blocks
//             const officerEls = Array.from(document.querySelectorAll('[id^="officer-"]'));

//             const items = appointmentEls.length > 0 ? appointmentEls : officerEls;

//             for (const item of items) {

//                 const text = item.innerText || "";

//                 // skip resigned officers
//                 if (text.toLowerCase().includes("resigned on")) continue;

//                 // try link to officer profile first — most reliable
//                 const officerLink = item.querySelector("a[href*='/officers/']");

//                 // try the bold class via getElementsByClassName (! class)
//                 const boldEl = getByClass(item, "govuk-!-font-weight-bold");

//                 const nameEl = officerLink || boldEl || item.querySelector("strong");

//                 if (!nameEl) continue;

//                 const name = nameEl.innerText.trim();
//                 if (!name) continue;

//                 const roleMatch = text.match(
//                     /\b(Director|Secretary|LLP Designated Member|LLP Member|Member|Manager)\b/i
//                 );

//                 return {
//                     name,
//                     role: roleMatch ? roleMatch[1] : "Officer"
//                 };

//             }

//             // ── Fallback: scan all bold elements on page ──────

//             const boldEls = getAllByClass("govuk-!-font-weight-bold");

//             for (const el of boldEls) {

//                 const txt = el.innerText.trim();

//                 // Companies House shows person names in ALL CAPS
//                 if (/^[A-Z][A-Z\s\-']+$/.test(txt) && txt.length > 3 && txt.length < 80) {

//                     // check parent for role info
//                     const parent = el.closest("li, div, section") || el.parentElement;
//                     const parentText = parent ? parent.innerText : "";

//                     const roleMatch = parentText.match(
//                         /\b(Director|Secretary|LLP Designated Member|LLP Member|Member|Manager)\b/i
//                     );

//                     return {
//                         name: txt,
//                         role: roleMatch ? roleMatch[1] : "Officer"
//                     };

//                 }

//             }

//             return null;

//         });

//         if (!officer) {
//             console.log("No active officers found for company:", companyNumber);
//             return null;
//         }

//         console.log("Officer found:", officer.name, "|", officer.role);

//         return {
//             ownerName: officer.name,
//             ownerRole: officer.role,
//             companyNumber: companyNumber,
//             companiesHouseUrl: officersUrl
//         };

//     } catch (err) {

//         console.log("Companies House scraper error:", err.message);
//         return null;

//     }

// };

// // ─── Helpers ──────────────────────────────────────────────

// async function safeGoto(page, url, retries = 2) {

//     for (let attempt = 1; attempt <= retries; attempt++) {

//         try {

//             await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
//             return true;

//         } catch (err) {

//             console.log(`Navigation failed attempt ${attempt}:`, err.message);
//             if (attempt < retries) await randomDelay(2000, 4000);

//         }

//     }

//     return false;

// }

// function randomDelay(min, max) {
//     const ms = Math.floor(Math.random() * (max - min)) + min;
//     return new Promise(r => setTimeout(r, ms));
// }


const { getRandomAgent } = require("../utils/browserManager");

const BASE_URL = "https://find-and-update.company-information.service.gov.uk";

// ─────────────────────────────────────────────────────────
// Main export
// businessName — name to search
// storedAddress — address from your DB to compare against
// ─────────────────────────────────────────────────────────

module.exports = async function scrapeCompanyOfficer(page, businessName, storedAddress = null) {

    try {

        console.log("Companies House lookup:", businessName);

        await page.setUserAgent(getRandomAgent());

        // ── Step 1: search ────────────────────────────────────

        const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(businessName)}`;
        const loaded = await safeGoto(page, searchUrl);

        if (!loaded) {
            console.log("Search page failed to load");
            return null;
        }

        await randomDelay(2000, 3500);

        // ── Step 2: grab first company result ─────────────────

        const companyPath = await page.evaluate(() => {

            const links = Array.from(document.querySelectorAll('a[href*="/company/"]'));

            for (const a of links) {
                const href = a.getAttribute("href") || "";
                if (/^\/company\/[A-Z0-9]{8}$/.test(href)) return href;
            }

            return null;

        });

        if (!companyPath) {
            console.log("No company result found for:", businessName);
            return null;
        }

        const companyNumber = companyPath.split("/company/")[1];
        console.log("Company number found:", companyNumber);

        // ── Step 3: scrape overview page for registered address

        const overviewUrl = `${BASE_URL}/company/${companyNumber}`;
        const overviewLoaded = await safeGoto(page, overviewUrl);

        if (!overviewLoaded) {
            console.log("Overview page failed to load");
            return null;
        }

        await randomDelay(1500, 2500);

        const registeredAddress = await page.evaluate(() => {

            // Registered office is inside a <dd> following a <dt> that says
            // "Registered office address"
            const dts = Array.from(document.querySelectorAll("dt"));

            for (const dt of dts) {

                if (dt.innerText.toLowerCase().includes("registered office")) {

                    const dd = dt.nextElementSibling;

                    if (dd) {
                        // collapse whitespace/newlines into a single comma-separated string
                        return dd.innerText.trim().replace(/\n+/g, ", ").replace(/,\s*,/g, ",");
                    }

                }

            }

            // fallback — look for the address section directly
            const addressEl =
                document.querySelector(".registered-office-address") ||
                document.querySelector("[data-id='registered-office-address'] dd");

            return addressEl
                ? addressEl.innerText.trim().replace(/\n+/g, ", ")
                : null;

        });

        console.log("Registered address:", registeredAddress || "not found");

        // ── Step 4: go to officers page ───────────────────────

        const officersUrl = `${BASE_URL}/company/${companyNumber}/officers`;
        const officersLoaded = await safeGoto(page, officersUrl);

        if (!officersLoaded) {
            console.log("Officers page failed to load");
            return null;
        }

        await randomDelay(1500, 3000);

        // ── Step 5: extract first active officer ──────────────

        const officer = await page.evaluate(() => {

            function getByClass(parent, cls) {
                const els = parent.getElementsByClassName(cls);
                return els.length > 0 ? els[0] : null;
            }

            function getAllByClass(cls) {
                return Array.from(document.getElementsByClassName(cls));
            }

            const appointmentEls = Array.from(document.querySelectorAll(
                '[class^="appointment-"], [class*=" appointment-"]'
            ));

            const officerEls = Array.from(document.querySelectorAll('[id^="officer-"]'));
            const items = appointmentEls.length > 0 ? appointmentEls : officerEls;

            for (const item of items) {

                const text = item.innerText || "";

                if (text.toLowerCase().includes("resigned on")) continue;

                const officerLink = item.querySelector("a[href*='/officers/']");
                const boldEl = getByClass(item, "govuk-!-font-weight-bold");
                const nameEl = officerLink || boldEl || item.querySelector("strong");

                if (!nameEl) continue;

                const name = nameEl.innerText.trim();
                if (!name) continue;

                const roleMatch = text.match(
                    /\b(Director|Secretary|LLP Designated Member|LLP Member|Member|Manager)\b/i
                );

                return { name, role: roleMatch ? roleMatch[1] : "Officer" };

            }

            // fallback — bold ALL CAPS names
            const boldEls = getAllByClass("govuk-!-font-weight-bold");

            for (const el of boldEls) {

                const txt = el.innerText.trim();

                if (/^[A-Z][A-Z\s\-']+$/.test(txt) && txt.length > 3 && txt.length < 80) {

                    const parent = el.closest("li, div, section") || el.parentElement;
                    const parentText = parent ? parent.innerText : "";

                    const roleMatch = parentText.match(
                        /\b(Director|Secretary|LLP Designated Member|LLP Member|Member|Manager)\b/i
                    );

                    return { name: txt, role: roleMatch ? roleMatch[1] : "Officer" };

                }

            }

            return null;

        });

        if (!officer) {
            console.log("No active officers found for:", companyNumber);
            return null;
        }

        console.log("Officer found:", officer.name, "|", officer.role);

        // ── Step 6: address verification ──────────────────────

        const addressMatch = compareAddresses(storedAddress, registeredAddress);

        console.log("Address match:", addressMatch.status, "—", addressMatch.reason);

        return {
            ownerName: officer.name,
            ownerRole: officer.role,
            companyNumber: companyNumber,
            companiesHouseUrl: officersUrl,
            registeredAddress: registeredAddress,
            addressMatch: addressMatch.status,   // "match" | "partial" | "mismatch" | "unverified"
            addressMatchReason: addressMatch.reason
        };

    } catch (err) {

        console.log("Companies House scraper error:", err.message);
        return null;

    }

};

// ─────────────────────────────────────────────────────────
// Address comparison
// Normalises both addresses then checks token overlap
// ─────────────────────────────────────────────────────────

function compareAddresses(stored, govuk) {

    if (!stored || !govuk) {
        return { status: "unverified", reason: "One or both addresses missing" };
    }

    const norm = str =>
        str
            .toUpperCase()
            .replace(/[^A-Z0-9\s]/g, " ")  // strip punctuation
            .replace(/\s+/g, " ")
            .trim();

    const storedNorm = norm(stored);
    const govukNorm = norm(govuk);

    // exact match after normalisation
    if (storedNorm === govukNorm) {
        return { status: "match", reason: "Exact match after normalisation" };
    }

    // extract meaningful tokens (skip short filler words)
    const STOPWORDS = new Set(["THE", "LTD", "LIMITED", "ROAD", "STREET", "LANE",
        "AVENUE", "CLOSE", "DRIVE", "UNIT", "FLOOR", "UK",
        "GB", "ENGLAND", "AND", "OF"]);

    const tokens = str =>
        str.split(" ")
            .filter(t => t.length > 1 && !STOPWORDS.has(t));

    const storedTokens = tokens(storedNorm);
    const govukTokens = tokens(govukNorm);

    if (storedTokens.length === 0 || govukTokens.length === 0) {
        return { status: "unverified", reason: "Could not extract address tokens" };
    }

    // UK postcode check — if both have a postcode, compare them directly
    const postcodeRegex = /\b([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b/;

    const storedPostcode = storedNorm.match(postcodeRegex)?.[1]?.replace(/\s/g, "");
    const govukPostcode = govukNorm.match(postcodeRegex)?.[1]?.replace(/\s/g, "");

    if (storedPostcode && govukPostcode) {

        if (storedPostcode === govukPostcode) {
            return { status: "match", reason: `Postcode match: ${storedPostcode}` };
        }

        return {
            status: "mismatch",
            reason: `Postcode mismatch: DB has ${storedPostcode}, Gov.uk has ${govukPostcode}`
        };

    }

    // token overlap score
    const govukSet = new Set(govukTokens);
    const matchCount = storedTokens.filter(t => govukSet.has(t)).length;
    const score = matchCount / Math.max(storedTokens.length, govukTokens.length);

    if (score >= 0.7) {
        return { status: "match", reason: `Token overlap ${Math.round(score * 100)}%` };
    }

    if (score >= 0.4) {
        return { status: "partial", reason: `Partial overlap ${Math.round(score * 100)}%` };
    }

    return {
        status: "mismatch",
        reason: `Low overlap ${Math.round(score * 100)}% — DB: "${stored}" | Gov.uk: "${govuk}"`
    };

}

// ─── Helpers ──────────────────────────────────────────────

async function safeGoto(page, url, retries = 2) {

    for (let attempt = 1; attempt <= retries; attempt++) {

        try {
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
            return true;
        } catch (err) {
            console.log(`Navigation failed attempt ${attempt}:`, err.message);
            if (attempt < retries) await randomDelay(2000, 4000);
        }

    }

    return false;

}

function randomDelay(min, max) {
    const ms = Math.floor(Math.random() * (max - min)) + min;
    return new Promise(r => setTimeout(r, ms));
}