
const CustomerPush = require("../models/customerPushModel");

// ─── Config (from .env) ───────────────────────────────────
const CRM_API_BASE = process.env.CRM_API_BASE || "https://salesrephub.iotfiysolutions.com/api";
const CRM_LOGIN_EMAIL = process.env.CRM_LOGIN_EMAIL || "";
const CRM_LOGIN_PASSWORD = process.env.CRM_LOGIN_PASSWORD || "";

// ─── Auth token cache ─────────────────────────────────────
// Token is reused within a run. Re-login only if it expires (401).
let _cachedToken = null;
let _tokenFetchedAt = 0;
const TOKEN_TTL_MS = 55 * 60 * 1000; // treat token as stale after 55 min

// ─────────────────────────────────────────────────────────
async function pushVerifiedLeads(verifiedLeads) {
    const summary = { pushed: 0, duplicates: 0, failed: 0, skipped: 0 };

    if (!verifiedLeads || verifiedLeads.length === 0) return summary;

    // Ensure we have a valid token
    const token = await getToken();
    if (!token) {
        console.log("[CRM] ✗ Could not obtain auth token — skipping customer push");
        return summary;
    }

    for (const lead of verifiedLeads) {
        const businessName = lead.businessName || lead.sellerName;

        // ── Skip if missing business name (can't dedup without it) ──
        if (!businessName) {
            summary.skipped++;
            await savePushRecord(lead, "skipped", null, "No business name");
            continue;
        }

        // ── Dedup check ──────────────────────────────────────────
        const alreadyPushed = await CustomerPush.findOne({ businessName }).lean();
        if (alreadyPushed) {
            console.log(`[CRM] ↩ Duplicate — "${businessName}" already in CRM`);
            summary.duplicates++;
            continue;
        }

        // ── Build CRM payload ─────────────────────────────────────
        const payload = buildCustomerPayload(lead);

        try {
            const result = await postCustomer(token, payload);

            if (result.success) {
                console.log(`[CRM] ✓ Pushed: "${businessName}" (id: ${result.customerId || "?"})`);
                summary.pushed++;
                await savePushRecord(lead, "pushed", result.customerId, null);
            } else if (result.status === 401) {
                // Token expired mid-run — refresh once and retry
                _cachedToken = null;
                const newToken = await getToken();
                if (!newToken) {
                    summary.failed++;
                    await savePushRecord(lead, "failed", null, "Auth token expired");
                    continue;
                }
                const retry = await postCustomer(newToken, payload);
                if (retry.success) {
                    summary.pushed++;
                    await savePushRecord(lead, "pushed", retry.customerId, null);
                } else {
                    summary.failed++;
                    await savePushRecord(lead, "failed", null, retry.error);
                }
            } else {
                console.log(`[CRM] ✗ Failed: "${businessName}" — ${result.error}`);
                summary.failed++;
                await savePushRecord(lead, "failed", null, result.error);
            }

        } catch (err) {
            console.log(`[CRM] ✗ Error pushing "${businessName}": ${err.message}`);
            summary.failed++;
            await savePushRecord(lead, "failed", null, err.message);
        }
    }

    console.log(`[CRM] Push complete — pushed: ${summary.pushed} | dupes: ${summary.duplicates} | failed: ${summary.failed} | skipped: ${summary.skipped}`);
    return summary;
}

// ─────────────────────────────────────────────────────────
// Get (or refresh) the auth token
// ─────────────────────────────────────────────────────────
async function getToken() {
    // Return cached token if still fresh
    if (_cachedToken && Date.now() - _tokenFetchedAt < TOKEN_TTL_MS) {
        return _cachedToken;
    }

    if (!CRM_LOGIN_EMAIL || !CRM_LOGIN_PASSWORD) {
        console.log("[CRM] CRM_LOGIN_EMAIL / CRM_LOGIN_PASSWORD not set in .env");
        return null;
    }

    // Try common login endpoint patterns
    const loginEndpoints = [
        `${CRM_API_BASE}/auth/login`,
        // `${CRM_API_BASE}/admin/login`,
        // `${CRM_API_BASE}/users/login`,
        // `${CRM_API_BASE}/login`,
    ];

    for (const endpoint of loginEndpoints) {
        try {
            const res = await fetchJSON(endpoint, "POST", null, {
                email: CRM_LOGIN_EMAIL,
                password: CRM_LOGIN_PASSWORD,
            });

            if (res.ok) {
                const token =
                    res.data?.token ||
                    res.data?.accessToken ||
                    res.data?.access_token ||
                    res.data?.data?.token ||
                    res.data?.data?.accessToken;

                if (token) {
                    _cachedToken = token;
                    _tokenFetchedAt = Date.now();
                    console.log(`[CRM] ✓ Logged in via ${endpoint}`);
                    return token;
                }
            }
        } catch {
            // try next endpoint
        }
    }

    console.log("[CRM] ✗ All login endpoints failed — check CRM_API_BASE in .env");
    return null;
}

// ─────────────────────────────────────────────────────────
// POST /customers (or similar)
// ─────────────────────────────────────────────────────────
async function postCustomer(token, payload) {
    const customerEndpoints = [
        `${CRM_API_BASE}/admin/customers`,
        // `${CRM_API_BASE}/customer`,
        // `${CRM_API_BASE}/admin/customers`,
    ];

    for (const endpoint of customerEndpoints) {
        try {
            const res = await fetchJSON(endpoint, "POST", token, payload);

            if (res.ok) {
                const customerId =
                    res.data?._id ||
                    res.data?.id ||
                    res.data?.customer?._id ||
                    res.data?.customer?.id ||
                    null;
                return { success: true, customerId };
            }

            if (res.status === 401) {
                return { success: false, status: 401, error: "Unauthorized" };
            }

            if (res.status === 409 || res.status === 422) {
                // Conflict / duplicate on server side
                return { success: false, status: res.status, error: "Duplicate on server" };
            }

        } catch (err) {
            // try next endpoint
        }
    }

    return { success: false, error: "All customer endpoints failed" };
}

// ─────────────────────────────────────────────────────────
// Build customer payload from lead data
// ─────────────────────────────────────────────────────────
// function buildCustomerPayload(lead) {
//     const city = extractCity(lead.address);

//     return {
//         firstName:              lead.ownerName           || "",
//         contactPerson:          lead.ownerName           || "",
//         company:                lead.businessName        || lead.sellerName || "",
//         email:                  lead.email               || "",
//         phone:                  lead.phoneNumber         || "",
//         address:                lead.address             || "",
//         city:                   city                     || "",
//         state:                  "United Kingdom",
//         postcode:               lead.postcode            || "",
//         latitude:               "",
//         longitude:              "",
//         orderPotential:         "Medium",
//         monthlySpend:           0,
//         status:                 "Not Visited",
//         notes:                  `Auto-imported from Amazon scraper. Seller ID: ${lead.sellerId || "—"}`,
//         competitorInfo:         "",
//         associatedContactName:  "",
//         associatedCompanyName:  "",
//         lastContact:            "",
//         lastEngagement:         "",
//     };
// }

function buildCustomerPayload(lead) {
    const city = extractCity(lead.address);

    // ─── Rating Categorization ───────────────────────────
    let categoryEmail = "c@tegory.c";

    const total = parseInt(lead.totalRatings || 0);

    if (total >= 50) {
        categoryEmail = "c@tegory.a";
    } else if (total >= 25 && total <= 49) {
        categoryEmail = "c@tegory.b";
    } else {
        categoryEmail = "c@tegory.c";
    }

    return {
        firstName: lead.ownerName || "",
        contactPerson: lead.ownerName || "",
        company: lead.businessName || lead.sellerName || "",
        email: categoryEmail,
        phone: lead.phoneNumber || "",
        address: lead.address || "",
        city: city || "",
        state: "United Kingdom",
        postcode: lead.postcode || "",
        latitude: "",
        longitude: "",
        orderPotential: "Medium",
        monthlySpend: 0,
        status: "Not Visited",
        notes: `Auto-imported from Amazon scraper. Seller ID: ${lead.sellerId || "—"}`,
        competitorInfo: "",
        associatedContactName: "",
        associatedCompanyName: "",
        lastContact: "",
        lastEngagement: "",
    };
}

// ─────────────────────────────────────────────────────────
// City extraction from UK addresses
//
// UK format examples:
//   "Unit 71, Hillgrove Business Park, Nazeing, Essex, United Kingdom EN9 2HB"
//   "12 High Street, Manchester, M1 2AB"
//   "Flat 3, 45 Park Road, London, W1A 1AA"
//
// Strategy: strip the postcode, then take the last meaningful
// part before "United Kingdom" / "England" etc.
// ─────────────────────────────────────────────────────────
function extractCity(address) {
    if (!address) return "";

    // Remove postcode
    let cleaned = address
        .replace(/\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi, "")
        .replace(/,\s*United Kingdom\s*$/i, "")
        .replace(/,\s*England\s*$/i, "")
        .replace(/,\s*Scotland\s*$/i, "")
        .replace(/,\s*Wales\s*$/i, "")
        .replace(/,\s*UK\s*$/i, "")
        .replace(/,\s*GB\s*$/i, "")
        .trim();

    // Split by comma and take the last non-empty part — usually the city
    const parts = cleaned.split(",").map(p => p.trim()).filter(Boolean);

    if (parts.length === 0) return "";

    // The last part is typically city or county — use it
    return parts[parts.length - 1] || "";
}

// ─────────────────────────────────────────────────────────
// Save push record to DB
// ─────────────────────────────────────────────────────────
async function savePushRecord(lead, status, crmCustomerId, errorMessage) {
    try {
        await CustomerPush.create({
            amazonLeadId: lead._id || null,
            sellerId: lead.sellerId || null,
            businessName: lead.businessName || lead.sellerName || null,
            ownerName: lead.ownerName || null,
            email: lead.email || null,
            phone: lead.phoneNumber || null,
            postcode: lead.postcode || null,
            status,
            crmCustomerId: crmCustomerId || null,
            errorMessage: errorMessage || null,
            pushedAt: new Date(),
        });
    } catch (err) {
        // Silently swallow unique constraint violations on businessName
        // (means it was already recorded)
        if (err.code !== 11000) {
            console.log("[CRM] savePushRecord error:", err.message);
        }
    }
}

// ─────────────────────────────────────────────────────────
// Generic fetch helper (no external deps)
// ─────────────────────────────────────────────────────────
async function fetchJSON(url, method, token, body) {
    const https = url.startsWith("https") ? require("https") : require("http");

    return new Promise((resolve, reject) => {
        const bodyStr = body ? JSON.stringify(body) : "";
        const parsed = new URL(url);

        const headers = {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(bodyStr),
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const options = {
            hostname: parsed.hostname,
            port: parsed.port || (url.startsWith("https") ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method,
            headers,
        };

        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", chunk => { data += chunk; });
            res.on("end", () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: parsed });
                } catch {
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: {} });
                }
            });
        });

        req.on("error", reject);
        req.setTimeout(15000, () => { req.destroy(new Error("Request timeout")); });

        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

module.exports = { pushVerifiedLeads };