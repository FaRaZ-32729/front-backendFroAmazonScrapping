// const mongoose = require("mongoose");

// const EbaySellerSchema = new mongoose.Schema({
//     sellerName: {
//         type: String,
//         required: true,
//         trim: true,
//     },
//     address: {
//         type: String,
//         trim: true,
//         default: ""
//     },
//     postcode: {
//         type: String,
//         trim: true,
//         uppercase: true,
//         default: ""
//     },
//     phoneNumber: {
//         type: String,
//         trim: true,
//         default: null
//     },
//     email: {
//         type: String,
//         trim: true,
//         lowercase: true,
//         default: null
//     },
//     sellerRating: {
//         type: String,
//         trim: true,
//         default: ""
//     },
//     totalFeedback: {
//         type: Number,
//         default: 0
//     },
//     pageUrl: {
//         type: String,
//         required: true,
//         unique: true,  // ensures no duplicate scraping of same seller
//         trim: true
//     },
//     createdAt: {
//         type: Date,
//         default: Date.now
//     }
// });

// // Prevent duplicate entries by sellerName + pageUrl combination
// EbaySellerSchema.index({ pageUrl: 1 }, { unique: true });

// module.exports = mongoose.model("EbaySeller", EbaySellerSchema);