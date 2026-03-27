// import { useState, useEffect, useCallback } from "react";
// import {
//     Database, RefreshCw, Search, ChevronLeft,
//     ChevronRight, AlertCircle, Loader
// } from "lucide-react";

// import LeadCard from "../components/LeadCard.jsx";
// import ExportButton from "../components/ExportButton.jsx";

// const PAGE_SIZE = 20;

// const FULFILLMENT_FILTERS = [
//     { key: "", label: "All" },
//     { key: "FBA", label: "FBA" },
//     { key: "FBM", label: "FBM" }
// ];

// export default function LeadsPage() {

//     const [leads, setLeads] = useState([]);
//     const [total, setTotal] = useState(0);
//     const [page, setPage] = useState(1);
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState(null);
//     const [search, setSearch] = useState("");
//     const [searchInput, setSearchInput] = useState("");
//     const [fulfillment, setFulfillment] = useState("");

//     const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

//     const fetchLeads = useCallback(async () => {

//         setLoading(true);
//         setError(null);

//         try {

//             const params = new URLSearchParams({
//                 page,
//                 limit: PAGE_SIZE
//             });

//             if (fulfillment) params.set("fulfillment", fulfillment);
//             if (search) params.set("search", search);

//             const res = await fetch(`/api/scrape/leads?${params}`);

//             if (!res.ok) throw new Error(`Server error ${res.status}`);

//             const data = await res.json();

//             setLeads(data.leads || []);
//             setTotal(data.total || 0);

//         } catch (err) {

//             setError(err.message);

//         } finally {

//             setLoading(false);

//         }

//     }, [page, fulfillment, search]);

//     // fetch on mount and whenever filters / page change
//     useEffect(() => {
//         fetchLeads();
//     }, [fetchLeads]);

//     // reset to page 1 when filters change
//     useEffect(() => {
//         setPage(1);
//     }, [fulfillment, search]);

//     function handleSearchSubmit(e) {
//         e.preventDefault();
//         setSearch(searchInput.trim());
//     }

//     return (
//         <div className="max-w-screen-xl mx-auto px-5 py-6 space-y-5">

//             {/* ── Toolbar ── */}
//             <div className="flex flex-wrap items-center gap-3">

//                 {/* Search */}
//                 <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-48 max-w-72">
//                     <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim pointer-events-none" />
//                     <input
//                         type="text"
//                         value={searchInput}
//                         onChange={e => setSearchInput(e.target.value)}
//                         placeholder="Search by name, postcode..."
//                         className="w-full bg-panel border border-border rounded-lg pl-9 pr-4 py-2
//                        font-mono text-xs text-bright placeholder-muted
//                        hover:border-dim focus:border-green
//                        focus:shadow-[0_0_0_3px_rgba(0,232,122,0.07)]
//                        transition-all duration-200"
//                     />
//                 </form>

//                 {/* Fulfillment filter */}
//                 <div className="flex items-center gap-1">
//                     {FULFILLMENT_FILTERS.map(f => (
//                         <button
//                             key={f.key}
//                             onClick={() => setFulfillment(f.key)}
//                             className={`
//                 px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors
//                 ${fulfillment === f.key
//                                     ? "bg-green/10 text-green border-green/30"
//                                     : "border-border text-dim hover:border-dim hover:text-text"
//                                 }
//               `}
//                         >
//                             {f.label}
//                         </button>
//                     ))}
//                 </div>

//                 {/* Spacer */}
//                 <div className="flex-1" />

//                 {/* Total count */}
//                 <div className="text-xs font-mono text-dim">
//                     <span className="text-bright font-semibold">{total}</span> total leads
//                 </div>

//                 {/* Refresh */}
//                 <button
//                     onClick={fetchLeads}
//                     disabled={loading}
//                     className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border
//                      text-xs font-mono text-dim hover:text-text hover:border-dim
//                      disabled:opacity-40 transition-colors"
//                 >
//                     <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
//                     Refresh
//                 </button>

//                 <ExportButton leads={leads} />

//             </div>

//             {/* ── Content ── */}
//             {error ? (
//                 <ErrorState message={error} onRetry={fetchLeads} />
//             ) : loading && leads.length === 0 ? (
//                 <LoadingState />
//             ) : leads.length === 0 ? (
//                 <EmptyState />
//             ) : (
//                 <>
//                     {/* Leads list */}
//                     <div className="flex flex-col gap-3">
//                         {leads.map((lead, i) => (
//                             <LeadCard
//                                 key={lead.sellerId || `${lead._id}-${i}`}
//                                 lead={lead}
//                                 index={(page - 1) * PAGE_SIZE + i}
//                             />
//                         ))}
//                     </div>

//                     {/* ── Pagination ── */}
//                     {totalPages > 1 && (
//                         <div className="flex items-center justify-center gap-2 pt-2">

//                             <button
//                                 onClick={() => setPage(p => Math.max(1, p - 1))}
//                                 disabled={page === 1 || loading}
//                                 className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border
//                            text-xs font-mono text-dim hover:text-text hover:border-dim
//                            disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
//                             >
//                                 <ChevronLeft size={13} />
//                                 Prev
//                             </button>

//                             <div className="flex items-center gap-1">
//                                 {getPaginationRange(page, totalPages).map((p, i) =>
//                                     p === "..." ? (
//                                         <span key={`dot-${i}`} className="w-8 text-center text-xs font-mono text-dim">
//                                             ···
//                                         </span>
//                                     ) : (
//                                         <button
//                                             key={p}
//                                             onClick={() => setPage(p)}
//                                             className={`
//                         w-8 h-8 rounded-lg text-xs font-mono border transition-colors
//                         ${p === page
//                                                     ? "bg-green/10 text-green border-green/30"
//                                                     : "border-border text-dim hover:border-dim hover:text-text"
//                                                 }
//                       `}
//                                         >
//                                             {p}
//                                         </button>
//                                     )
//                                 )}
//                             </div>

//                             <button
//                                 onClick={() => setPage(p => Math.min(totalPages, p + 1))}
//                                 disabled={page === totalPages || loading}
//                                 className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border
//                            text-xs font-mono text-dim hover:text-text hover:border-dim
//                            disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
//                             >
//                                 Next
//                                 <ChevronRight size={13} />
//                             </button>

//                         </div>
//                     )}
//                 </>
//             )}

//         </div>
//     );
// }

// // ─── Sub-components ───────────────────────────────────────

// function LoadingState() {
//     return (
//         <div className="flex flex-col items-center justify-center py-28 gap-3">
//             <Loader size={22} className="text-dim animate-spin" />
//             <p className="text-xs font-mono text-dim">Loading leads from database...</p>
//         </div>
//     );
// }

// function EmptyState() {
//     return (
//         <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
//             <div className="w-14 h-14 rounded-2xl bg-panel border border-border flex items-center justify-center">
//                 <Database size={22} className="text-dim" />
//             </div>
//             <div>
//                 <p className="font-display font-semibold text-text text-base">No leads found</p>
//                 <p className="text-xs font-mono text-dim mt-1 max-w-xs mx-auto">
//                     Run a scrape first or adjust your filters
//                 </p>
//             </div>
//         </div>
//     );
// }

// function ErrorState({ message, onRetry }) {
//     return (
//         <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
//             <div className="w-14 h-14 rounded-2xl bg-red/5 border border-red/20 flex items-center justify-center">
//                 <AlertCircle size={22} className="text-red" />
//             </div>
//             <div>
//                 <p className="font-display font-semibold text-text text-base">Failed to load</p>
//                 <p className="text-xs font-mono text-dim mt-1">{message}</p>
//             </div>
//             <button
//                 onClick={onRetry}
//                 className="px-4 py-2 rounded-lg border border-border text-xs font-mono text-dim
//                    hover:text-text hover:border-dim transition-colors"
//             >
//                 Try again
//             </button>
//         </div>
//     );
// }

// // ─── Pagination helper ────────────────────────────────────

// function getPaginationRange(current, total) {
//     if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

//     if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
//     if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];

//     return [1, "...", current - 1, current, current + 1, "...", total];
// }



import { useState, useEffect, useCallback, useRef } from "react";
import {
    Database, RefreshCw, Search, ChevronLeft,
    ChevronRight, AlertCircle, Loader, ShieldCheck, X
} from "lucide-react";

import LeadCard from "../components/LeadCard.jsx";
import ExportButton from "../components/ExportButton.jsx";

const PAGE_SIZE = 20;

const FULFILLMENT_FILTERS = [
    { key: "", label: "All" },
    { key: "FBA", label: "FBA" },
    { key: "FBM", label: "FBM" }
];

export default function LeadsPage() {

    const [leads, setLeads] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [fulfillment, setFulfillment] = useState("");

    // ── Verify state ──────────────────────────────────────
    const [verifying, setVerifying] = useState(false);
    const [verifyStats, setVerifyStats] = useState(null);   // { verified, failed, total }
    const [verifyProgress, setVerifyProgress] = useState(null);   // { index, total, name }
    const [verifyLogs, setVerifyLogs] = useState([]);
    const [verifyDone, setVerifyDone] = useState(false);
    const verifyEsRef = useRef(null);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    // ── Fetch leads ───────────────────────────────────────

    const fetchLeads = useCallback(async () => {

        setLoading(true);
        setError(null);

        try {

            const params = new URLSearchParams({ page, limit: PAGE_SIZE });
            if (fulfillment) params.set("fulfillment", fulfillment);
            if (search) params.set("search", search);

            const res = await fetch(`/api/scrape/leads?${params}`);
            if (!res.ok) throw new Error(`Server error ${res.status}`);

            const data = await res.json();
            setLeads(data.leads || []);
            setTotal(data.total || 0);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }

    }, [page, fulfillment, search]);

    useEffect(() => { fetchLeads(); }, [fetchLeads]);
    useEffect(() => { setPage(1); }, [fulfillment, search]);

    // cleanup SSE on unmount
    useEffect(() => () => verifyEsRef.current?.close(), []);

    function handleSearchSubmit(e) {
        e.preventDefault();
        setSearch(searchInput.trim());
    }

    // ── Start batch verify ────────────────────────────────

    function handleVerifyAll() {

        setVerifying(true);
        setVerifyDone(false);
        setVerifyStats(null);
        setVerifyProgress(null);
        setVerifyLogs([]);

        const es = new EventSource("/api/verify/batch");
        verifyEsRef.current = es;

        const addLog = (msg, type = "info") =>
            setVerifyLogs(p => [...p, { msg, type, time: new Date().toLocaleTimeString("en-GB", { hour12: false }) }]);

        es.addEventListener("total", e => {
            const { count } = JSON.parse(e.data);
            addLog(`Found ${count} unverified leads`, "info");
            setVerifyProgress({ index: 0, total: count, name: "" });
        });

        es.addEventListener("progress", e => {
            const d = JSON.parse(e.data);
            setVerifyProgress(d);
            addLog(`[${d.index}/${d.total}] ${d.name}`, "dim");
        });

        es.addEventListener("verified", e => {
            const d = JSON.parse(e.data);
            addLog(`✓ ${d.name} → ${d.ownerName} (${d.ownerRole})`, "success");
            // update the lead in local state so the card reflects the new owner instantly
            setLeads(prev => prev.map(l =>
                l._id === d.leadId
                    ? { ...l, ownerName: d.ownerName, ownerRole: d.ownerRole }
                    : l
            ));
        });

        es.addEventListener("not_found", e => {
            const d = JSON.parse(e.data);
            addLog(`— ${d.name}: no Companies House record`, "warn");
        });

        es.addEventListener("log", e => {
            const d = JSON.parse(e.data);
            addLog(d.message, d.type || "info");
        });

        es.addEventListener("done", e => {
            const d = JSON.parse(e.data);
            setVerifyStats(d);
            setVerifyDone(true);
            setVerifying(false);
            es.close();
            fetchLeads(); // refresh list to show updated owner names
        });

        es.addEventListener("error", e => {
            try {
                const d = JSON.parse(e.data);
                addLog(`Error: ${d.message}`, "error");
            } catch { }
            setVerifying(false);
            es.close();
        });

        es.onerror = () => {
            addLog("Connection lost", "error");
            setVerifying(false);
            es.close();
        };

    }

    function handleStopVerify() {
        verifyEsRef.current?.close();
        setVerifying(false);
        setVerifyLogs(p => [...p, { msg: "Stopped by user", type: "warn", time: new Date().toLocaleTimeString("en-GB", { hour12: false }) }]);
    }

    const verifyPct = verifyProgress?.total > 0
        ? Math.round((verifyProgress.index / verifyProgress.total) * 100)
        : 0;

    return (
        <div className="max-w-screen-xl mx-auto px-5 py-6 space-y-5">

            {/* ── Toolbar ── */}
            <div className="flex flex-wrap items-center gap-3">

                {/* Search */}
                <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-48 max-w-72">
                    <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim pointer-events-none" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        placeholder="Search by name, postcode..."
                        className="w-full bg-panel border border-border rounded-lg pl-9 pr-4 py-2
                       font-mono text-xs text-bright placeholder-muted
                       hover:border-dim focus:border-green
                       focus:shadow-[0_0_0_3px_rgba(0,232,122,0.07)]
                       transition-all duration-200"
                    />
                </form>

                {/* Fulfillment filter */}
                <div className="flex items-center gap-1">
                    {FULFILLMENT_FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFulfillment(f.key)}
                            className={`
                px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors
                ${fulfillment === f.key
                                    ? "bg-green/10 text-green border-green/30"
                                    : "border-border text-dim hover:border-dim hover:text-text"
                                }
              `}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1" />

                {/* Total count */}
                <div className="text-xs font-mono text-dim">
                    <span className="text-bright font-semibold">{total}</span> total leads
                </div>

                {/* Refresh */}
                <button
                    onClick={fetchLeads}
                    disabled={loading || verifying}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border
                     text-xs font-mono text-dim hover:text-text hover:border-dim
                     disabled:opacity-40 transition-colors"
                >
                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>

                {/* ── Verify All button ── */}
                {verifying ? (
                    <button
                        onClick={handleStopVerify}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber/30
                       text-xs font-mono text-amber hover:bg-amber/5 transition-colors"
                    >
                        <X size={12} />
                        Stop Verify
                    </button>
                ) : (
                    <button
                        onClick={handleVerifyAll}
                        disabled={loading || total === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue/30
                       text-xs font-mono text-blue hover:bg-blue/5
                       disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        <ShieldCheck size={12} />
                        Verify All
                    </button>
                )}

                <ExportButton leads={leads} />

            </div>

            {/* ── Verify progress panel ── */}
            {(verifying || verifyDone) && (
                <div className="bg-panel border border-border rounded-xl overflow-hidden animate-fade-in">

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-ink">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={12} className="text-blue" />
                            <span className="text-[10px] font-mono text-dim uppercase tracking-widest">
                                Companies House Verification
                            </span>
                            {verifying && (
                                <div className="flex items-center gap-1.5 ml-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue animate-pulse-dot" />
                                    <span className="text-[10px] font-mono text-blue">running</span>
                                </div>
                            )}
                            {verifyDone && verifyStats && (
                                <span className="text-[10px] font-mono text-green ml-2">
                                    ✓ {verifyStats.verified} verified · {verifyStats.failed} not found
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => { setVerifyDone(false); setVerifyStats(null); setVerifyLogs([]); }}
                            className="text-dim hover:text-text transition-colors"
                        >
                            <X size={12} />
                        </button>
                    </div>

                    {/* Progress bar */}
                    {verifyProgress && (
                        <div className="px-4 pt-3 pb-1 space-y-1.5">
                            <div className="flex justify-between text-[10px] font-mono text-dim">
                                <span className="truncate max-w-xs">
                                    {verifying ? verifyProgress.name || "Starting..." : "Complete"}
                                </span>
                                <span className="tabular-nums shrink-0 ml-4">
                                    {verifyProgress.index} / {verifyProgress.total}
                                </span>
                            </div>
                            <div className="h-1 rounded-full bg-muted overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${verifying ? "bg-blue" : "bg-green"}`}
                                    style={{ width: `${verifyPct}%` }}
                                />
                            </div>
                            <div className="text-right text-[10px] font-mono text-dim">{verifyPct}%</div>
                        </div>
                    )}

                    {/* Log feed */}
                    <VerifyLog logs={verifyLogs} />

                </div>
            )}

            {/* ── Content ── */}
            {error ? (
                <ErrorState message={error} onRetry={fetchLeads} />
            ) : loading && leads.length === 0 ? (
                <LoadingState />
            ) : leads.length === 0 ? (
                <EmptyState />
            ) : (
                <>
                    <div className="flex flex-col gap-3">
                        {leads.map((lead, i) => (
                            <LeadCard
                                key={lead.sellerId || `${lead._id}-${i}`}
                                lead={lead}
                                index={(page - 1) * PAGE_SIZE + i}
                            />
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-2">

                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border
                           text-xs font-mono text-dim hover:text-text hover:border-dim
                           disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={13} />
                                Prev
                            </button>

                            <div className="flex items-center gap-1">
                                {getPaginationRange(page, totalPages).map((p, i) =>
                                    p === "..." ? (
                                        <span key={`dot-${i}`} className="w-8 text-center text-xs font-mono text-dim">···</span>
                                    ) : (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p)}
                                            className={`
                        w-8 h-8 rounded-lg text-xs font-mono border transition-colors
                        ${p === page
                                                    ? "bg-green/10 text-green border-green/30"
                                                    : "border-border text-dim hover:border-dim hover:text-text"
                                                }
                      `}
                                        >
                                            {p}
                                        </button>
                                    )
                                )}
                            </div>

                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || loading}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border
                           text-xs font-mono text-dim hover:text-text hover:border-dim
                           disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                                <ChevronRight size={13} />
                            </button>

                        </div>
                    )}
                </>
            )}

        </div>
    );
}

// ─── Verify log feed ──────────────────────────────────────

const LOG_COLOR = {
    info: "text-text",
    success: "text-green",
    warn: "text-amber",
    error: "text-red",
    dim: "text-dim"
};

function VerifyLog({ logs }) {

    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    return (
        <div className="px-4 py-3 max-h-40 overflow-y-auto space-y-0.5">
            {logs.length === 0 ? (
                <p className="text-[10px] font-mono text-dim">Waiting...</p>
            ) : logs.map((l, i) => (
                <div key={i} className="flex gap-2 text-[10px] font-mono leading-5">
                    <span className="text-dim shrink-0 tabular-nums">{l.time}</span>
                    <span className={LOG_COLOR[l.type] || "text-text"}>{l.msg}</span>
                </div>
            ))}
            <div ref={endRef} />
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────

function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center py-28 gap-3">
            <Loader size={22} className="text-dim animate-spin" />
            <p className="text-xs font-mono text-dim">Loading leads from database...</p>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-panel border border-border flex items-center justify-center">
                <Database size={22} className="text-dim" />
            </div>
            <div>
                <p className="font-display font-semibold text-text text-base">No leads found</p>
                <p className="text-xs font-mono text-dim mt-1 max-w-xs mx-auto">
                    Run a scrape first or adjust your filters
                </p>
            </div>
        </div>
    );
}

function ErrorState({ message, onRetry }) {
    return (
        <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red/5 border border-red/20 flex items-center justify-center">
                <AlertCircle size={22} className="text-red" />
            </div>
            <div>
                <p className="font-display font-semibold text-text text-base">Failed to load</p>
                <p className="text-xs font-mono text-dim mt-1">{message}</p>
            </div>
            <button
                onClick={onRetry}
                className="px-4 py-2 rounded-lg border border-border text-xs font-mono text-dim
                   hover:text-text hover:border-dim transition-colors"
            >
                Try again
            </button>
        </div>
    );
}

function getPaginationRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
    if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    return [1, "...", current - 1, current, current + 1, "...", total];
}