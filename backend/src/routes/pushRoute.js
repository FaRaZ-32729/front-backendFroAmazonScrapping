const express = require("express");
const router  = express.Router();

const { pushLead, pushAllLeads, getPushStatus } = require("../controllers/pushController");

router.post("/push/:id",   pushLead);       
router.get("/push/batch",  pushAllLeads);
router.get("/push/status", getPushStatus);

module.exports = router;