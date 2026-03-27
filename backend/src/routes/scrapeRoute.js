const express = require("express");
const router = express.Router();

const { streamScrape, getLeads } = require("../controllers/scrapeController");

router.get("/scrape/stream", streamScrape);
router.get("/scrape/leads", getLeads);

module.exports = router;