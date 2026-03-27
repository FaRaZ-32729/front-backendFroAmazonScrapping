// const { launchBrowser } = require("../utils/browserManager");
// const scrapeCompanyOfficer = require("../scrapper/companiesHouseScraper");
// const AmazonLead = require("../models/amazonLeadModel");

// // ─────────────────────────────────────────────────────────
// // Controller: verifyLead
// // POST /api/verify/:id
// //
// // Looks up a single lead by ID, searches Companies House
// // for the business owner, and saves the result back to DB.
// // ─────────────────────────────────────────────────────────

// async function verifyLead(req, res) {

//   const { id } = req.params;

//   try {

//     const lead = await AmazonLead.findById(id);

//     if (!lead) {
//       return res.status(404).json({ error: "Lead not found" });
//     }

//     const searchName = lead.businessName || lead.sellerName;

//     if (!searchName) {
//       return res.status(400).json({ error: "Lead has no business name to look up" });
//     }

//     console.log("Verifying lead:", searchName);

//     const browser = await launchBrowser();
//     const page = await browser.newPage();

//     let result = null;

//     try {

//       result = await scrapeCompanyOfficer(page, searchName, lead.address);

//     } finally {

//       await browser.close();

//     }

//     if (!result) {
//       return res.status(404).json({ error: "No Companies House record found", searchName });
//     }

//     // save back to the lead document
//     lead.ownerName = result.ownerName;
//     lead.ownerRole = result.ownerRole;
//     lead.companyNumber = result.companyNumber;
//     lead.companiesHouseUrl = result.companiesHouseUrl;
//     lead.registeredAddress = result.registeredAddress;
//     lead.addressMatch = result.addressMatch;
//     lead.addressMatchReason = result.addressMatchReason;
//     lead.verifiedAt = new Date();

//     await lead.save();

//     console.log("Lead verified:", lead.businessName, "→", result.ownerName);

//     return res.json({
//       success: true,
//       leadId: id,
//       ownerName: result.ownerName,
//       ownerRole: result.ownerRole,
//       companyNumber: result.companyNumber,
//       companiesHouseUrl: result.companiesHouseUrl
//     });

//   } catch (err) {

//     console.log("verifyLead error:", err.message);
//     return res.status(500).json({ error: err.message });

//   }

// }

// // ─────────────────────────────────────────────────────────
// // Controller: verifyAllLeads
// // POST /api/verify/batch
// //
// // SSE stream — verifies all unverified leads one by one
// // and pushes progress events to the frontend.
// // ─────────────────────────────────────────────────────────

// async function verifyAllLeads(req, res) {

//   // SSE headers
//   res.setHeader("Content-Type", "text/event-stream");
//   res.setHeader("Cache-Control", "no-cache");
//   res.setHeader("Connection", "keep-alive");
//   res.setHeader("X-Accel-Buffering", "no");
//   res.flushHeaders();

//   const keepAlive = setInterval(() => res.write(": ping\n\n"), 20000);

//   function send(event, data) {
//     res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
//   }

//   let browser;

//   try {

//     // only process leads that haven't been verified yet
//     const unverified = await AmazonLead.find({
//       $or: [
//         { ownerName: null },
//         { ownerName: { $exists: false } }
//       ]
//     }).select("_id businessName sellerName address").lean();

//     send("total", { count: unverified.length });

//     if (unverified.length === 0) {
//       send("done", { message: "All leads already verified" });
//       clearInterval(keepAlive);
//       res.end();
//       return;
//     }

//     send("log", { message: `Verifying ${unverified.length} leads...`, type: "info" });

//     browser = await launchBrowser();
//     const page = await browser.newPage();

//     let verified = 0;
//     let failed = 0;

//     for (let i = 0; i < unverified.length; i++) {

//       const lead = unverified[i];
//       const searchName = lead.businessName || lead.sellerName;

//       send("progress", { index: i + 1, total: unverified.length, name: searchName });

//       try {

//         const result = await scrapeCompanyOfficer(page, searchName, lead.address);

//         if (result) {

//           await AmazonLead.findByIdAndUpdate(lead._id, {
//             ownerName: result.ownerName,
//             ownerRole: result.ownerRole,
//             companyNumber: result.companyNumber,
//             companiesHouseUrl: result.companiesHouseUrl,
//             registeredAddress: result.registeredAddress,
//             addressMatch: result.addressMatch,
//             addressMatchReason: result.addressMatchReason,
//             verifiedAt: new Date()
//           });

//           verified++;

//           send("verified", {
//             leadId: lead._id,
//             name: searchName,
//             ownerName: result.ownerName,
//             ownerRole: result.ownerRole
//           });

//         } else {

//           failed++;
//           send("not_found", { leadId: lead._id, name: searchName });

//         }

//       } catch (err) {

//         failed++;
//         send("log", { message: `Error on ${searchName}: ${err.message}`, type: "error" });

//       }

//     }

//     send("done", { verified, failed, total: unverified.length });

//   } catch (err) {

//     send("error", { message: err.message });

//   } finally {

//     clearInterval(keepAlive);
//     if (browser) await browser.close();
//     res.end();

//   }

// }

// module.exports = { verifyLead, verifyAllLeads };


const { launchBrowser } = require("../utils/browserManager");
const scrapeCompanyOfficer = require("../scrapper/companiesHouseScraper");
const verifyAddressOnGoogle = require("../scrapper/googleAddressScraper");
const AmazonLead = require("../models/amazonLeadModel");

// ─────────────────────────────────────────────────────────
// Controller: verifyLead
// POST /api/verify/:id
//
// Looks up a single lead by ID, searches Companies House
// for the business owner, and saves the result back to DB.
// ─────────────────────────────────────────────────────────

async function verifyLead(req, res) {

  const { id } = req.params;

  try {

    const lead = await AmazonLead.findById(id);

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const searchName = lead.businessName || lead.sellerName;

    if (!searchName) {
      return res.status(400).json({ error: "Lead has no business name to look up" });
    }

    console.log("Verifying lead:", searchName);

    const browser = await launchBrowser();
    const page = await browser.newPage();

    let chResult = null;
    let googleResult = null;

    try {

      // ── Companies House ──────────────────────────────
      chResult = await scrapeCompanyOfficer(page, searchName, lead.address);

      // ── Google address check ─────────────────────────
      googleResult = await verifyAddressOnGoogle(page, searchName, lead.address, lead.postcode);

    } finally {
      await browser.close();
    }

    if (!chResult && !googleResult) {
      return res.status(404).json({ error: "No Companies House record found", searchName });
    }

    // save all fields back to lead
    if (chResult) {
      lead.ownerName = chResult.ownerName;
      lead.ownerRole = chResult.ownerRole;
      lead.companyNumber = chResult.companyNumber;
      lead.companiesHouseUrl = chResult.companiesHouseUrl;
      lead.registeredAddress = chResult.registeredAddress;
      lead.addressMatch = chResult.addressMatch;
      lead.addressMatchReason = chResult.addressMatchReason;
    }

    if (googleResult) {
      lead.googleAddress = googleResult.googleAddress;
      lead.googleAddressMatch = googleResult.googleAddressMatch;
      lead.googleMatchReason = googleResult.googleMatchReason;
      lead.googleMapsUrl = googleResult.googleMapsUrl;
    }

    lead.verifiedAt = new Date();

    await lead.save();

    console.log("Lead verified:", lead.businessName, "→", chResult?.ownerName, "| Google:", googleResult?.googleAddressMatch);

    return res.json({
      success: true,
      leadId: id,
      ownerName: chResult?.ownerName,
      ownerRole: chResult?.ownerRole,
      companyNumber: chResult?.companyNumber,
      companiesHouseUrl: chResult?.companiesHouseUrl,
      googleAddressMatch: googleResult?.googleAddressMatch,
      googleMatchReason: googleResult?.googleMatchReason
    });

  } catch (err) {

    console.log("verifyLead error:", err.message);
    return res.status(500).json({ error: err.message });

  }

}

// ─────────────────────────────────────────────────────────
// Controller: verifyAllLeads
// POST /api/verify/batch
//
// SSE stream — verifies all unverified leads one by one
// and pushes progress events to the frontend.
// ─────────────────────────────────────────────────────────

async function verifyAllLeads(req, res) {

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const keepAlive = setInterval(() => res.write(": ping\n\n"), 20000);

  function send(event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  let browser;

  try {

    // only process leads that haven't been verified yet
    const unverified = await AmazonLead.find({
      $or: [
        { ownerName: null },
        { ownerName: { $exists: false } }
      ]
    }).select("_id businessName sellerName address postcode").lean();

    send("total", { count: unverified.length });

    if (unverified.length === 0) {
      send("done", { message: "All leads already verified" });
      clearInterval(keepAlive);
      res.end();
      return;
    }

    send("log", { message: `Verifying ${unverified.length} leads (Companies House + Google)...`, type: "info" });

    browser = await launchBrowser();
    const page = await browser.newPage();

    let verified = 0;
    let failed = 0;

    for (let i = 0; i < unverified.length; i++) {

      const lead = unverified[i];
      const searchName = lead.businessName || lead.sellerName;

      send("progress", { index: i + 1, total: unverified.length, name: searchName });

      try {

        // ── Companies House ────────────────────────────
        const chResult = await scrapeCompanyOfficer(page, searchName, lead.address);

        // ── Google address ─────────────────────────────
        const googleResult = await verifyAddressOnGoogle(page, searchName, lead.address, lead.postcode);

        const updateData = { verifiedAt: new Date() };

        if (chResult) {
          updateData.ownerName = chResult.ownerName;
          updateData.ownerRole = chResult.ownerRole;
          updateData.companyNumber = chResult.companyNumber;
          updateData.companiesHouseUrl = chResult.companiesHouseUrl;
          updateData.registeredAddress = chResult.registeredAddress;
          updateData.addressMatch = chResult.addressMatch;
          updateData.addressMatchReason = chResult.addressMatchReason;
        }

        if (googleResult) {
          updateData.googleAddress = googleResult.googleAddress;
          updateData.googleAddressMatch = googleResult.googleAddressMatch;
          updateData.googleMatchReason = googleResult.googleMatchReason;
          updateData.googleMapsUrl = googleResult.googleMapsUrl;
        }

        await AmazonLead.findByIdAndUpdate(lead._id, updateData);

        if (chResult || googleResult?.googleAddressMatch === "match") {
          verified++;
          send("verified", {
            leadId: lead._id,
            name: searchName,
            ownerName: chResult?.ownerName,
            ownerRole: chResult?.ownerRole,
            googleAddressMatch: googleResult?.googleAddressMatch
          });
        } else {
          failed++;
          send("not_found", { leadId: lead._id, name: searchName });
        }

      } catch (err) {

        failed++;
        send("log", { message: `Error on ${searchName}: ${err.message}`, type: "error" });

      }

    }

    send("done", { verified, failed, total: unverified.length });

  } catch (err) {

    send("error", { message: err.message });

  } finally {

    clearInterval(keepAlive);
    if (browser) await browser.close();
    res.end();

  }

}

module.exports = { verifyLead, verifyAllLeads };