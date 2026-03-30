const AmazonLead      = require("../models/amazonLeadModel");
const PushedCustomer  = require("../models/pushedCustomerModel");

// ─────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────

const WEBSITE_BASE_URL  = "https://salesrephub.iotfiysolutions.com";

// !! FILL THIS IN once you share the route !!
// e.g. "/api/customers"  or  "/api/v1/customers"
const CUSTOMERS_ENDPOINT = process.env.SALESREPHUB_CUSTOMERS_ENDPOINT || "/api/customers";

// Auth token if the API requires it — set in .env
// e.g. SALESREPHUB_TOKEN=Bearer eyJhbGciOiJIUzI1NiIs...
const AUTH_TOKEN = process.env.SALESREPHUB_TOKEN || null;

// ─────────────────────────────────────────────────────────
// Map a scraped AmazonLead → salesrephub customer payload
// ─────────────────────────────────────────────────────────

function mapLeadToCustomer(lead) {

  // extract city from address if not stored separately
  const city = lead.city || extractCity(lead.address, lead.postcode);

  return {
    firstName:   lead.ownerName    || lead.sellerName || lead.businessName || "",
    company:     lead.businessName || "",
    email:       lead.email        || "",
    phone:       lead.phoneNumber  || "",
    address:     lead.address      || "",
    city:        city              || "",
    state:       "United Kingdom",
    postcode:    lead.postcode     || "",
  };

}

// ─────────────────────────────────────────────────────────
// Extract city from a UK address string
// e.g. "123 High St, Sheffield, South Yorkshire, UK S1 1AA"
//       → "Sheffield"
// ─────────────────────────────────────────────────────────

function extractCity(address, postcode) {

  if (!address) return null;

  // remove postcode from end to make parsing cleaner
  const cleaned = address
    .replace(/\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/i, "")
    .replace(/,\s*United Kingdom\s*$/i, "")
    .replace(/,\s*UK\s*$/i, "")
    .replace(/,\s*GB\s*$/i, "")
    .trim();

  const parts = cleaned.split(",").map(p => p.trim()).filter(Boolean);

  // city is usually the 2nd or 3rd segment
  // skip very short tokens and county-like tokens (contains "shire", "Yorkshire" etc)
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i];
    if (p.length > 2 && !/shire|county|region/i.test(p)) {
      return p;
    }
  }

  return parts[parts.length - 1] || null;

}

// ─────────────────────────────────────────────────────────
// POST a single lead to salesrephub as a customer
// ─────────────────────────────────────────────────────────

async function postToWebsite(payload) {

  const url = `${WEBSITE_BASE_URL}${CUSTOMERS_ENDPOINT}`;

  const headers = {
    "Content-Type": "application/json",
    "Accept":       "application/json"
  };

  if (AUTH_TOKEN) {
    headers["Authorization"] = AUTH_TOKEN.startsWith("Bearer ")
      ? AUTH_TOKEN
      : `Bearer ${AUTH_TOKEN}`;
  }

  const res = await fetch(url, {
    method:  "POST",
    headers,
    body:    JSON.stringify(payload)
  });

  const text = await res.text();

  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    throw new Error(`Website API error ${res.status}: ${JSON.stringify(data)}`);
  }

  return data;

}

// ─────────────────────────────────────────────────────────
// Controller: pushLead
// POST /api/push/:id
// Push a single lead to salesrephub
// ─────────────────────────────────────────────────────────

async function pushLead(req, res) {

  const { id } = req.params;

  try {

    const lead = await AmazonLead.findById(id);

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // ── Duplicate check ────────────────────────────────
    const existing = await PushedCustomer.findOne({ leadId: id });

    if (existing) {
      return res.status(409).json({
        error:             "Already pushed",
        status:            existing.status,
        websiteCustomerId: existing.websiteCustomerId,
        pushedAt:          existing.pushedAt
      });
    }

    const payload = mapLeadToCustomer(lead);

    let websiteResponse;
    let pushRecord;

    try {

      websiteResponse = await postToWebsite(payload);

      pushRecord = await PushedCustomer.create({
        leadId:            lead._id,
        sellerId:          lead.sellerId,
        businessName:      lead.businessName,
        email:             lead.email,
        sentPayload:       payload,
        websiteCustomerId: websiteResponse?.id || websiteResponse?._id || null,
        status:            "success"
      });

      console.log("Pushed to salesrephub:", lead.businessName, "→ ID:", pushRecord.websiteCustomerId);

      return res.json({
        success:           true,
        leadId:            id,
        websiteCustomerId: pushRecord.websiteCustomerId,
        payload
      });

    } catch (pushErr) {

      // save failed attempt so we can see what went wrong
      await PushedCustomer.create({
        leadId:       lead._id,
        sellerId:     lead.sellerId,
        businessName: lead.businessName,
        email:        lead.email,
        sentPayload:  payload,
        status:       "failed",
        errorMessage: pushErr.message
      }).catch(() => {});

      console.log("Push failed:", lead.businessName, pushErr.message);

      return res.status(502).json({
        error:   "Failed to push to website",
        message: pushErr.message
      });

    }

  } catch (err) {
    console.log("pushLead error:", err.message);
    return res.status(500).json({ error: err.message });
  }

}

// ─────────────────────────────────────────────────────────
// Controller: pushAllLeads
// GET /api/push/batch  (SSE stream)
// Push all unpushed verified leads
// ─────────────────────────────────────────────────────────

async function pushAllLeads(req, res) {

  res.setHeader("Content-Type",      "text/event-stream");
  res.setHeader("Cache-Control",     "no-cache");
  res.setHeader("Connection",        "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const keepAlive = setInterval(() => res.write(": ping\n\n"), 20000);

  function send(event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  try {

    // get all leads that have NOT been pushed yet
    const alreadyPushed = await PushedCustomer.distinct("leadId");

    const leads = await AmazonLead.find({
      _id: { $nin: alreadyPushed },
      // only push leads that have at least a business name or owner name
      $or: [
        { businessName: { $ne: null } },
        { ownerName:    { $ne: null } }
      ]
    }).lean();

    send("total", { count: leads.length });

    if (leads.length === 0) {
      send("done", { pushed: 0, failed: 0, skipped: 0, message: "All leads already pushed" });
      clearInterval(keepAlive);
      res.end();
      return;
    }

    send("log", { message: `Pushing ${leads.length} leads to salesrephub...`, type: "info" });

    let pushed  = 0;
    let failed  = 0;
    let skipped = 0;

    for (let i = 0; i < leads.length; i++) {

      const lead    = leads[i];
      const name    = lead.businessName || lead.ownerName || lead.sellerName;

      send("progress", { index: i + 1, total: leads.length, name });

      const payload = mapLeadToCustomer(lead);

      // skip if no meaningful data to push
      if (!payload.firstName && !payload.company) {
        skipped++;
        send("skipped", { leadId: lead._id, name, reason: "No name data" });
        continue;
      }

      try {

        const websiteResponse = await postToWebsite(payload);

        await PushedCustomer.create({
          leadId:            lead._id,
          sellerId:          lead.sellerId,
          businessName:      lead.businessName,
          email:             lead.email,
          sentPayload:       payload,
          websiteCustomerId: websiteResponse?.id || websiteResponse?._id || null,
          status:            "success"
        });

        pushed++;

        send("pushed", {
          leadId:            lead._id,
          name,
          websiteCustomerId: websiteResponse?.id || websiteResponse?._id || null
        });

      } catch (err) {

        failed++;

        await PushedCustomer.create({
          leadId:       lead._id,
          sellerId:     lead.sellerId,
          businessName: lead.businessName,
          email:        lead.email,
          sentPayload:  payload,
          status:       "failed",
          errorMessage: err.message
        }).catch(() => {});

        send("failed", { leadId: lead._id, name, error: err.message });

      }

      // small delay between requests to not hammer the website API
      await new Promise(r => setTimeout(r, 500));

    }

    send("done", { pushed, failed, skipped, total: leads.length });

  } catch (err) {
    send("error", { message: err.message });
  } finally {
    clearInterval(keepAlive);
    res.end();
  }

}

// ─────────────────────────────────────────────────────────
// Controller: getPushStatus
// GET /api/push/status
// Returns which leads have been pushed
// ─────────────────────────────────────────────────────────

async function getPushStatus(req, res) {

  try {

    const pushed = await PushedCustomer.find()
      .select("leadId sellerId businessName status websiteCustomerId pushedAt errorMessage")
      .sort({ pushedAt: -1 })
      .lean();

    const pushedIds = new Set(pushed.map(p => p.leadId.toString()));

    res.json({
      total:    pushed.length,
      pushedIds: [...pushedIds],
      records:  pushed
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }

}

module.exports = { pushLead, pushAllLeads, getPushStatus };