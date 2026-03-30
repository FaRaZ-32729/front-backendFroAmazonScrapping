const express = require("express");
const router  = express.Router();

const { pushLead, pushAllLeads, getPushStatus } = require("../controllers/pushController");

router.post("/push/:id",   pushLead);       // push single lead
router.get("/push/batch",  pushAllLeads);   // SSE — push all unpushed
router.get("/push/status", getPushStatus);  // which leads are already pushed

module.exports = router;