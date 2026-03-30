const mongoose = require("mongoose");

/**
 * CustomerPush — tracks every Amazon lead that was auto-pushed
 * to the salesrephub CRM as a customer.
 *
 * Used to:
 *  1. Prevent duplicate pushes (dedup on businessName)
 *  2. Audit what was sent and when
 *  3. Surface push errors for manual review
 */
const customerPushSchema = new mongoose.Schema(
    {
        // ── Link back to the source lead ──────────────────────
        amazonLeadId: {
            type:    mongoose.Schema.Types.ObjectId,
            ref:     "AmazonLead",
            default: null,
        },

        sellerId: {
            type:    String,
            trim:    true,
            default: null,
        },

        // ── What we pushed ────────────────────────────────────
        businessName: {
            type:  String,
            trim:  true,
            index: true,   // fast dedup lookups
        },

        ownerName: {
            type:    String,
            trim:    true,
            default: null,
        },

        email: {
            type:      String,
            trim:      true,
            lowercase: true,
            default:   null,
        },

        phone: {
            type:    String,
            trim:    true,
            default: null,
        },

        postcode: {
            type:    String,
            trim:    true,
            default: null,
        },

        // ── Push outcome ──────────────────────────────────────
        status: {
            type:    String,
            enum:    ["pushed", "duplicate", "failed", "skipped"],
            default: "pushed",
        },

        // CRM-assigned ID returned after successful POST
        crmCustomerId: {
            type:    String,
            trim:    true,
            default: null,
        },

        errorMessage: {
            type:    String,
            trim:    true,
            default: null,
        },

        pushedAt: {
            type:    Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// Unique index on businessName so duplicates are caught at DB level too
customerPushSchema.index({ businessName: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("CustomerPush", customerPushSchema);