const axios = require("axios");

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxu1HaZPniElTX9DED8Ts-KNYGDITHgCVHwZ_4oLugRGm5Axim4Fgjsj0BXtt5HeKy0lQ/exec";

/**
 * Send batch of leads to Google Sheet
 */
const sendLeadsToSheet = async (leads) => {
    try {
        if (!Array.isArray(leads) || leads.length === 0) return;

        await axios.post(APPS_SCRIPT_URL, { leads });

        console.log(`Sent ${leads.length} leads to Google Sheets`);

    } catch (error) {
        console.error("Failed to send leads:", error.message);
    }
};

module.exports = sendLeadsToSheet;