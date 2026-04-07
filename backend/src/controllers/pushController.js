  const AmazonLead = require("../models/amazonLeadModel");
const PushedCustomer = require("../models/pushedCustomerModel");
const { launchBrowser } = require("../utils/browserManager");
require("dotenv").config();

const WEBSITE_BASE_URL = "https://salesrephub.iotfiysolutions.com";
const CUSTOMERS_ENDPOINT = process.env.SALESREPHUB_CUSTOMERS_ENDPOINT || "/api/customers";

// ─────────────────────────────────────────────────────────
// Map Lead
// ─────────────────────────────────────────────────────────

function mapLeadToCustomer(lead) {

  const city = lead.city || extractCity(lead.address, lead.postcode);

  // ─── Rating Categorization ───────────────────────────
  let categoryEmail = "c@tegory.c"; // default

  const total = parseInt(lead.totalRatings || 0);

  if (total >= 50) {
    categoryEmail = "c@tegory.a";
  } else if (total >= 25 && total <= 49) {
    categoryEmail = "c@tegory.b";
  } else {
    categoryEmail = "c@tegory.c";
  }

  return {
    firstName: lead.ownerName || lead.sellerName || lead.businessName || "",
    company: lead.businessName || "",
    email: categoryEmail, 
    phone: lead.phoneNumber || "",
    address: lead.address || "",
    city: city || "",
    state: "United Kingdom",
    postcode: lead.postcode || "",
  };

}


function extractCity(address) {
  if (!address) return null;

  const cleaned = address
    .replace(/\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/i, "")
    .replace(/,\s*(United Kingdom|UK|GB)\s*$/i, "")
    .trim();

  const parts = cleaned.split(",").map(p => p.trim()).filter(Boolean);

  for (let i = 1; i < parts.length; i++) {
    if (!/shire|county|region/i.test(parts[i])) return parts[i];
  }

  return parts[parts.length - 1] || null;
}
    
// ─────────────────────────────────────────────────────────
// 🔥 LOGIN USING PUPPETEER
// ─────────────────────────────────────────────────────────

async function loginCRM(page) {
  await page.goto(`${WEBSITE_BASE_URL}/login`, { waitUntil: "domcontentloaded" });

  await page.type('input[type="email"]', process.env.CRM_EMAIL, { delay: 50 });
  await page.type('input[type="password"]', process.env.CRM_PASSWORD, { delay: 50 });

  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: "networkidle2" })
  ]);

  console.log("✅ CRM Logged in");
}

// ─────────────────────────────────────────────────────────
// 🔥 PUSH VIA BROWSER CONTEXT
// ─────────────────────────────────────────────────────────

async function pushViaBrowser(page, payload) {

  const result = await page.evaluate(async (payload, endpoint) => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();

    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return {
      ok: res.ok,
      status: res.status,
      data
    };

  }, payload, CUSTOMERS_ENDPOINT);

  if (!result.ok) {
    throw new Error(`CRM error ${result.status}: ${JSON.stringify(result.data)}`);
  }

  return result.data;
}

// ─────────────────────────────────────────────────────────
// SINGLE PUSH
// ─────────────────────────────────────────────────────────

async function pushLead(req, res) {

  const { id } = req.params;

  let browser;

  try {

    const lead = await AmazonLead.findById(id);
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const existing = await PushedCustomer.findOne({ leadId: id });
    if (existing) {
      return res.status(409).json({ error: "Already pushed" });
    }

    browser = await launchBrowser();
    const page = await browser.newPage();

    await loginCRM(page);

    const payload = mapLeadToCustomer(lead);
    const response = await pushViaBrowser(page, payload);

    const record = await PushedCustomer.create({
      leadId: lead._id,
      sellerId: lead.sellerId,
      businessName: lead.businessName,
      email: lead.email,
      sentPayload: payload,
      websiteCustomerId: response?.id || null,
      status: "success"
    });

    return res.json({ success: true, record });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
}

// ─────────────────────────────────────────────────────────
// BATCH PUSH (SSE)
// ─────────────────────────────────────────────────────────

async function pushAllLeads(req, res) {

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const keepAlive = setInterval(() => res.write(": ping\n\n"), 20000);

  function send(event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  let browser;

  try {

    const alreadyPushed = await PushedCustomer.distinct("leadId");

    const leads = await AmazonLead.find({
      _id: { $nin: alreadyPushed },
      $or: [{ businessName: { $ne: null } }, { ownerName: { $ne: null } }]
    }).lean();

    send("total", { count: leads.length });

    if (!leads.length) {
      send("done", { pushed: 0 });
      return;
    }

    browser = await launchBrowser();
    const page = await browser.newPage();

    // 🔥 LOGIN ONCE
    await loginCRM(page);

    let pushed = 0, failed = 0;

    for (let i = 0; i < leads.length; i++) {

      const lead = leads[i];
      const payload = mapLeadToCustomer(lead);

      send("progress", { index: i + 1, total: leads.length });

      try {

        const response = await pushViaBrowser(page, payload);

        await PushedCustomer.create({
          leadId: lead._id,
          sellerId: lead.sellerId,
          businessName: lead.businessName,
          email: lead.email,
          sentPayload: payload,
          websiteCustomerId: response?.id || null,
          status: "success"
        });

        pushed++;

        send("pushed", { name: lead.businessName });

      } catch (err) {

        failed++;

        await PushedCustomer.create({
          leadId: lead._id,
          sellerId: lead.sellerId,
          businessName: lead.businessName,
          email: lead.email,
          sentPayload: payload,
          status: "failed",
          errorMessage: err.message
        }).catch(() => { });

        send("failed", { error: err.message });
      }

      await new Promise(r => setTimeout(r, 800));
    }

    send("done", { pushed, failed });

  } catch (err) {
    send("error", { message: err.message });
  } finally {
    clearInterval(keepAlive);
    if (browser) await browser.close();
    res.end();
  }
}

// ─────────────────────────────────────────────────────────

async function getPushStatus(req, res) {
  try {
    const pushed = await PushedCustomer.find().lean();
    res.json({ total: pushed.length, records: pushed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { pushLead, pushAllLeads, getPushStatus };