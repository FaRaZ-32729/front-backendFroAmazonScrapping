import { useState, useEffect, useCallback } from "react";
import {
    Database, RefreshCw, Search, ChevronLeft, ChevronRight,
    AlertCircle, Loader, ShieldCheck, X, CheckCircle, XCircle
} from "lucide-react";

import LeadCard from "../components/LeadCard.jsx";
import ExportButton from "../components/ExportButton.jsx";

const PAGE_SIZE = 20;

export default function LeadsPage() {

    const [leads, setLeads] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [activeFilter, setActiveFilter] = useState("all");   // "all" | "verified" | "unverified"

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    // ── Fetch leads ───────────────────────────────────────
    const fetchLeads = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page,
                limit: PAGE_SIZE,
                filter: activeFilter,
            });

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
    }, [page, activeFilter, search]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    useEffect(() => {
        setPage(1); // Reset to first page when filter or search changes
    }, [activeFilter, search]);

    function handleSearchSubmit(e) {
        e.preventDefault();
        setSearch(searchInput.trim());
    }

    return (
        <div className="max-w-screen-xl mx-auto px-5 py-6 space-y-5">

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">

                {/* Search */}
                <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-48 max-w-72">
                    <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim pointer-events-none" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        placeholder="Search by name, postcode..."
                        className="w-full bg-ink border border-border rounded-lg pl-9 pr-4 py-2
                       font-mono text-xs text-bright placeholder-muted
                       hover:border-dim focus:border-green
                       focus:shadow-[0_0_0_3px_rgba(5,150,105,0.1)]
                       transition-all duration-200"
                    />
                </form>

                {/* Filter Tabs: All | Verified | Unverified */}
                <div className="flex items-center gap-1 bg-ink border border-border rounded-lg p-1">
                    <button
                        onClick={() => setActiveFilter("all")}
                        className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${activeFilter === "all"
                                ? "bg-white text-black shadow-sm"
                                : "text-dim hover:text-text"
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setActiveFilter("verified")}
                        className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${activeFilter === "verified"
                                ? "bg-green-600 text-white"
                                : "text-dim hover:text-text"
                            }`}
                    >
                        <CheckCircle size={12} />
                        Verified
                    </button>
                    <button
                        onClick={() => setActiveFilter("unverified")}
                        className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${activeFilter === "unverified"
                                ? "bg-amber-600 text-white"
                                : "text-dim hover:text-text"
                            }`}
                    >
                        <XCircle size={12} />
                        Unverified
                    </button>
                </div>

                <div className="flex-1" />

                {/* Total Count */}
                <div className="text-xs font-mono text-dim">
                    <span className="text-bright font-semibold">{total}</span> leads
                </div>

                {/* Refresh Button */}
                <button
                    onClick={fetchLeads}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-ink
                     text-xs font-mono text-dim hover:text-text hover:border-dim
                     disabled:opacity-40 transition-colors"
                >
                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>

                <ExportButton leads={leads} />

            </div>

            {/* Content Area */}
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

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4">
                            <PaginationBtn
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                            >
                                <ChevronLeft size={13} /> Prev
                            </PaginationBtn>

                            <div className="flex items-center gap-1">
                                {getPaginationRange(page, totalPages).map((p, i) =>
                                    p === "..." ? (
                                        <span key={`dot-${i}`} className="w-8 text-center text-xs font-mono text-dim">···</span>
                                    ) : (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p)}
                                            className={`w-8 h-8 rounded-lg text-xs font-mono border transition-colors
                        ${p === page
                                                    ? "bg-green/10 text-green border-green/30"
                                                    : "border-border text-dim hover:border-dim hover:text-text bg-ink"
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    )
                                )}
                            </div>

                            <PaginationBtn
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || loading}
                            >
                                Next <ChevronRight size={13} />
                            </PaginationBtn>
                        </div>
                    )}
                </>
            )}

        </div>
    );
}

// ─── Helper Components ─────────────────────────────────────

function PaginationBtn({ onClick, disabled, children }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-ink
                 text-xs font-mono text-dim hover:text-text hover:border-dim
                 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
            {children}
        </button>
    );
}

function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center py-28 gap-3">
            <Loader size={22} className="text-dim animate-spin" />
            <p className="text-xs font-mono text-dim">Loading leads...</p>
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
                <p className="font-display font-semibold text-bright text-base">No leads found</p>
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
                <p className="font-display font-semibold text-bright text-base">Failed to load</p>
                <p className="text-xs font-mono text-dim mt-1">{message}</p>
            </div>
            <button
                onClick={onRetry}
                className="px-4 py-2 rounded-lg border border-border bg-ink text-xs font-mono text-dim hover:text-text hover:border-dim transition-colors"
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