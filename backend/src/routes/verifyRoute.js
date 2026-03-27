const express = require("express");
const router  = express.Router();

const { verifyLead, verifyAllLeads } = require("../controllers/verifyController");

// verify a single lead by its MongoDB _id
router.post("/verify/:id",    verifyLead);

// verify all unverified leads via SSE stream
router.get("/verify/batch",   verifyAllLeads);

module.exports = router;