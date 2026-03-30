import { Download } from "lucide-react";

export default function ExportButton({ leads }) {

  function download(filename, type, content) {
    const blob = new Blob([content], { type });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
  }

  function toCSV() {
    if (!leads.length) return;

    const cols = [
      "businessName", "sellerName", "fulfillment",
      "address", "postcode", "phoneNumber", "email",
      "ownerName", "ownerRole", "addressMatch", "googleAddressMatch",
      "ratingPercentage", "totalRatings", "sellerLink", "productUrl"
    ];

    const headers = [
      "Business Name", "Seller Name", "Fulfillment",
      "Address", "Postcode", "Phone", "Email",
      "Owner Name", "Owner Role", "CH Match", "Google Match",
      "Rating %", "Total Ratings", "Seller Link", "Product URL"
    ];

    const rows = leads.map(l =>
      cols.map(k => `"${String(l[k] ?? "").replace(/"/g, '""')}"`)
    );

    const csv = [headers.map(h => `"${h}"`), ...rows]
      .map(r => r.join(","))
      .join("\n");

    download(`leads-${Date.now()}.csv`, "text/csv", csv);
  }

  return (
    <button
      onClick={toCSV}
      disabled={!leads.length}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border
                 text-[11px] font-mono text-dim transition-colors
                 hover:text-green hover:border-green/40 bg-ink
                 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      <Download size={10} />
      Export CSV
    </button>
  );
}