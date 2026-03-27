// import { Search, Layers, Zap } from "lucide-react";

// export default function SearchForm({ keyword, setKeyword, pages, setPages, onStart, isRunning }) {

//     function handleSubmit(e) {
//         e.preventDefault();
//         if (!keyword.trim() || isRunning) return;
//         onStart();
//     }

//     const inputBase = `
//     w-full bg-ink border rounded-lg font-mono text-sm text-bright placeholder-muted
//     transition-all duration-200
//   `;

//     const inputActive = `
//     border-border hover:border-dim
//     focus:border-green focus:shadow-[0_0_0_3px_rgba(0,232,122,0.07)]
//   `;

//     const inputDisabled = "border-border opacity-40 cursor-not-allowed";

//     return (
//         <form onSubmit={handleSubmit} className="space-y-4">

//             {/* Keyword */}
//             <div className="space-y-1.5">
//                 <label className="block text-[10px] font-mono text-dim uppercase tracking-widest">
//                     Keyword
//                 </label>
//                 <div className="relative">
//                     <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim pointer-events-none" />
//                     <input
//                         type="text"
//                         value={keyword}
//                         onChange={e => setKeyword(e.target.value)}
//                         placeholder="e.g. wireless headphones"
//                         disabled={isRunning}
//                         className={`${inputBase} pl-9 pr-4 py-2.5 ${isRunning ? inputDisabled : inputActive}`}
//                     />
//                 </div>
//             </div>

//             {/* Pages */}
//             <div className="space-y-1.5">
//                 <div className="flex items-center justify-between">
//                     <label className="block text-[10px] font-mono text-dim uppercase tracking-widest">
//                         Pages to scrape
//                     </label>
//                     {pages > 0 && (
//                         <span className="text-[10px] font-mono text-dim">
//                             ~{pages * 15}–{pages * 20} products
//                         </span>
//                     )}
//                 </div>
//                 <div className="relative">
//                     <Layers size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim pointer-events-none" />
//                     <input
//                         type="number"
//                         min={1}
//                         max={20}
//                         value={pages}
//                         onChange={e => {
//                             const val = parseInt(e.target.value);
//                             if (!isNaN(val) && val >= 1 && val <= 20) setPages(val);
//                         }}
//                         disabled={isRunning}
//                         className={`${inputBase} pl-9 pr-4 py-2.5 ${isRunning ? inputDisabled : inputActive}`}
//                     />
//                 </div>
//                 <p className="text-[10px] font-mono text-dim">Max 20 pages</p>
//             </div>

//             {/* Submit */}
//             <button
//                 type="submit"
//                 disabled={!keyword.trim() || isRunning}
//                 className={`
//           w-full flex items-center justify-center gap-2 py-2.5 rounded-lg
//           font-mono text-xs font-semibold uppercase tracking-widest
//           transition-all duration-200 active:scale-[0.98]
//           ${!keyword.trim() || isRunning
//                         ? "bg-muted text-dim cursor-not-allowed"
//                         : "bg-green text-ink hover:brightness-110 shadow-[0_0_20px_rgba(0,232,122,0.18)]"
//                     }
//         `}
//             >
//                 <Zap size={13} />
//                 {isRunning ? "Running..." : "Start Scraping"}
//             </button>

//         </form>
//     );
// }


import { Search, Layers, SkipForward, Zap, Clock, Tag } from "lucide-react";

// ── Rough time estimates (must match backend EST constants) ──
const EST_PAGE_SEC = 240;   // per page scraping
const EST_VERIFY_SEC = 20;   // per lead verification
const EST_LEADS_PAGE = 8;   // estimated leads per page

function fmtTime(seconds) {
    const s = Math.round(seconds);
    if (s < 60) return `~${s}s`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r > 0 ? `~${m}m ${r}s` : `~${m}m`;
}

export default function SearchForm({
    keywords, setKeywords,
    pages, setPages,
    skipPages, setSkipPages,
    onStart, isRunning
}) {

    // parse keywords from textarea
    const parsedKeywords = keywords
        .split(/[\n,]+/)
        .map(k => k.trim())
        .filter(Boolean);

    const kwCount = parsedKeywords.length;

    // time estimates
    const estLeads = kwCount * pages * EST_LEADS_PAGE;
    const estScrape = kwCount * pages * EST_PAGE_SEC;
    const estVerify = estLeads * EST_VERIFY_SEC;
    const estTotal = estScrape + estVerify;

    const startPage = skipPages + 1;
    const endPage = skipPages + pages;

    function handleSubmit(e) {
        e.preventDefault();
        if (kwCount === 0 || isRunning) return;
        onStart();
    }

    const inputBase = `
    w-full bg-ink border rounded-lg font-mono text-sm text-bright placeholder-muted
    transition-all duration-200
  `;
    const inputActive = `border-border hover:border-dim focus:border-green focus:shadow-[0_0_0_3px_rgba(0,232,122,0.07)]`;
    const inputDisabled = "border-border opacity-40 cursor-not-allowed";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">

            {/* Keywords textarea */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-mono text-dim uppercase tracking-widest">
                        Keywords
                    </label>
                    {kwCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-green">
                            <Tag size={9} />
                            {kwCount} keyword{kwCount > 1 ? "s" : ""}
                        </span>
                    )}
                </div>
                <div className="relative">
                    <Search size={13} className="absolute left-3.5 top-3 text-dim pointer-events-none" />
                    <textarea
                        rows={3}
                        value={keywords}
                        onChange={e => setKeywords(e.target.value)}
                        placeholder={"wireless headphones\nbluetooth speaker\nkitchen tools"}
                        disabled={isRunning}
                        className={`${inputBase} pl-9 pr-4 py-2.5 resize-none ${isRunning ? inputDisabled : inputActive}`}
                    />
                </div>
                <p className="text-[10px] font-mono text-dim">
                    One per line or comma-separated
                </p>
            </div>

            {/* Skip + Pages side by side */}
            <div className="grid grid-cols-2 gap-3">

                <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-dim uppercase tracking-widest">
                        Skip pages
                    </label>
                    <div className="relative">
                        <SkipForward size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim pointer-events-none" />
                        <input
                            type="number"
                            min={0}
                            max={100}
                            value={skipPages}
                            onChange={e => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val >= 0 && val <= 100) setSkipPages(val);
                            }}
                            disabled={isRunning}
                            className={`${inputBase} pl-8 pr-2 py-2.5 ${isRunning ? inputDisabled : inputActive}`}
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-dim uppercase tracking-widest">
                        Pages
                    </label>
                    <div className="relative">
                        <Layers size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim pointer-events-none" />
                        <input
                            type="number"
                            min={1}
                            max={10}
                            value={pages}
                            onChange={e => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val >= 1 && val <= 10) setPages(val);
                            }}
                            disabled={isRunning}
                            className={`${inputBase} pl-8 pr-2 py-2.5 ${isRunning ? inputDisabled : inputActive}`}
                        />
                    </div>
                </div>

            </div>

            {/* Page range hint */}
            <p className="text-[10px] font-mono text-dim -mt-2">
                Pages{" "}
                <span className="text-green font-semibold">{startPage}</span>
                {" "}–{" "}
                <span className="text-green font-semibold">{endPage}</span>
                <span className="ml-1.5">per keyword · max 10</span>
            </p>

            {/* ── Time estimate panel ── */}
            {kwCount > 0 && (
                <div className="rounded-lg border border-border bg-ink p-3 space-y-2">

                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-dim uppercase tracking-widest">
                        <Clock size={10} />
                        Time estimate
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <EstCell label="Scraping" value={fmtTime(estScrape)} color="text-green" />
                        <EstCell label="Verification" value={fmtTime(estVerify)} color="text-blue" />
                        <EstCell label="Total" value={fmtTime(estTotal)} color="text-text" />
                    </div>

                    <p className="text-[10px] font-mono text-dim">
                        ~{estLeads} leads across {kwCount} keyword{kwCount > 1 ? "s" : ""}
                    </p>

                </div>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={kwCount === 0 || isRunning}
                className={`
          w-full flex items-center justify-center gap-2 py-2.5 rounded-lg
          font-mono text-xs font-semibold uppercase tracking-widest
          transition-all duration-200 active:scale-[0.98]
          ${kwCount === 0 || isRunning
                        ? "bg-muted text-dim cursor-not-allowed"
                        : "bg-green text-ink hover:brightness-110 shadow-[0_0_20px_rgba(0,232,122,0.18)]"
                    }
        `}
            >
                <Zap size={13} />
                {isRunning
                    ? "Running..."
                    : kwCount > 1
                        ? `Start Scraping (${kwCount} keywords)`
                        : "Start Scraping"
                }
            </button>

        </form>
    );
}

function EstCell({ label, value, color }) {
    return (
        <div className="text-center space-y-0.5">
            <p className={`text-xs font-mono font-semibold ${color}`}>{value}</p>
            <p className="text-[10px] font-mono text-dim">{label}</p>
        </div>
    );
}