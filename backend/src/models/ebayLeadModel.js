// models/ebayLeadModel.js
// UPDATED: Added aboutUrl field so we store the exact About page link
// (no duplication risk because we still upsert on unique sellerId)

const mongoose = require("mongoose");

const ebayLeadSchema = new mongoose.Schema({

  // ── Core identity ──────────────────────────────────────
  sellerId: {
    type:     String,
    required: true,
    unique:   true,
    trim:     true
  },

  sellerName: {
    type:     String,
    required: true,
    trim:     true
  },

  sellerLink: {
    type:   String,
    trim:   true,
    default: null
  },

  aboutUrl: {                    // ← NEW: exact About page link
    type:    String,
    trim:    true,
    default: null
  },

  fulfillment: {
    type:    String,
    enum:    ["FBA", "FBM", "Vendor", "Unknown"],
    default: "Unknown"
  },

  // ── Business info (Phase 1 = displayed name, Phase 2 = full registered name) ──
  businessName: {
    type:    String,
    trim:    true,
    default: null
  },

  registrationNumber: {
    type:    String,
    trim:    true,
    default: null
  },

  vatNumber: {
    type:    String,
    trim:    true,
    default: null
  },

  // ── Contact ────────────────────────────────────────────
  phoneNumber: {
    type:    String,
    trim:    true,
    default: null
  },

  email: {
    type:      String,
    trim:      true,
    lowercase: true,
    default:   null
  },

  // ── Location ───────────────────────────────────────────
  address: {
    type:    String,
    trim:    true,
    default: null
  },

  postcode: {
    type:      String,
    trim:      true,
    uppercase: true,
    default:   null
  },

  country: {
    type:    String,
    default: "UK"
  },

  // ... (all your existing fields remain unchanged: ratings, listingUrl, keyword, Companies House fields, etc.)

}, {
  timestamps: true
});

module.exports = mongoose.model("EbayLead", ebayLeadSchema);