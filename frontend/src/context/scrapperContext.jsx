import { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";

const ScraperContext = createContext(null);

const STORAGE_KEY = "scraper_state";

function saveToStorage(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}
function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

export function ScraperProvider({ children }) {

    // ── Form config ───────────────────────────────────────
    const [keywords,  setKeywords]  = useState("");
    const [pages,     setPages]     = useState(1);
    const [skipPages, setSkipPages] = useState(0);

    // ── Run state ─────────────────────────────────────────
    const [isRunning, setIsRunning] = useState(false);
    const [phase,     setPhase]     = useState("idle");

    // Leads are ONLY shown after the run completes.
    // During the run they accumulate in pendingLeadsRef.
    const [leads,     setLeads]     = useState([]);
    const pendingLeadsRef = useRef([]);   // buffer — never triggers re-renders

    const [stats, setStats] = useState({ scanned: 0, leads: 0, skipped: 0, elapsed: "—" });

    // ── Progress ──────────────────────────────────────────
    const [kwProgress,     setKwProgress]     = useState({ current: 0, total: 0, keyword: "" });
    const [scanProgress,   setScanProgress]   = useState({ current: 0, total: 0 });
    const [verifyProgress, setVerifyProgress] = useState({ current: 0, total: 0, eta: "" });
    const [estimate,       setEstimate]       = useState(null);
    const [summary,        setSummary]        = useState(null);
    const [phaseMsg,       setPhaseMsg]       = useState("");

    // ── Refs ──────────────────────────────────────────────
    const esRef    = useRef(null);
    const startRef = useRef(null);
    const timerRef = useRef(null);

    // ── Restore persisted state on first mount ─────────────
    useEffect(() => {
        const saved = loadFromStorage();
        if (saved) {
            if (saved.leads?.length)  setLeads(saved.leads);
            if (saved.stats)          setStats(saved.stats);
            if (saved.summary)        setSummary(saved.summary);
            if (saved.estimate)       setEstimate(saved.estimate);
            if (saved.keywords)       setKeywords(saved.keywords);
        }
    }, []);

    // ── Persist when meaningful state changes ──────────────
    useEffect(() => {
        if (leads.length > 0 || summary) {
            saveToStorage({ leads, stats, summary, estimate, keywords });
        }
    }, [leads, stats, summary, estimate, keywords]);

    // ── Timer ─────────────────────────────────────────────
    function startTimer() {
        startRef.current = Date.now();
        timerRef.current = setInterval(() => {
            const s = ((Date.now() - startRef.current) / 1000).toFixed(0);
            setStats(p => ({ ...p, elapsed: `${s}s` }));
        }, 1000);
    }
    function stopTimer() {
        clearInterval(timerRef.current);
        const s = ((Date.now() - (startRef.current || Date.now())) / 1000).toFixed(1);
        setStats(p => ({ ...p, elapsed: `${s}s` }));
    }

    // ── Start scrape ──────────────────────────────────────
    const handleStart = useCallback(() => {
        const kwList = keywords.split(/[\n,]+/).map(k => k.trim()).filter(Boolean);
        if (kwList.length === 0) return;

        // Reset everything
        pendingLeadsRef.current = [];
        setLeads([]);
        setSummary(null);
        setEstimate(null);
        setStats({ scanned: 0, leads: 0, skipped: 0, elapsed: "0s" });
        setKwProgress({ current: 0, total: kwList.length, keyword: "" });
        setScanProgress({ current: 0, total: 0 });
        setVerifyProgress({ current: 0, total: 0, eta: "" });
        setPhase("scraping");
        setPhaseMsg("Searching Amazon...");
        setIsRunning(true);
        saveToStorage({ leads: [], stats: {}, summary: null, estimate: null, keywords });

        startTimer();

        const encoded = encodeURIComponent(kwList.join(","));
        const url = `/api/scrape/stream?keywords=${encoded}&pages=${pages}&skipPages=${skipPages}`;

        // Close any old connection
        esRef.current?.close();
        const es = new EventSource(url);
        esRef.current = es;

        // ── Event handlers ────────────────────────────────

        es.addEventListener("estimate", e => {
            setEstimate(JSON.parse(e.data));
        });

        es.addEventListener("keyword_start", e => {
            const d = JSON.parse(e.data);
            setKwProgress({ current: d.index, total: d.total, keyword: d.keyword });
            setScanProgress({ current: 0, total: 0 });
            setPhaseMsg(`Keyword ${d.index}/${d.total}: "${d.keyword}"`);
        });

        es.addEventListener("keyword_done", e => {
            const d = JSON.parse(e.data);
            setPhaseMsg(`"${d.keyword}" done — ${d.leads} leads`);
        });

        es.addEventListener("product_count", e => {
            const { total } = JSON.parse(e.data);
            setScanProgress(p => ({ ...p, total }));
        });

        es.addEventListener("scanning", e => {
            const { index, total } = JSON.parse(e.data);
            setScanProgress({ current: index, total });
            setStats(p => ({ ...p, scanned: p.scanned + 1 }));
        });

        es.addEventListener("lead", e => {
            // Buffer the lead — do NOT set state here.
            const lead = JSON.parse(e.data);
            pendingLeadsRef.current.push(lead);
            // Only update the count so the stats bar shows progress.
            setStats(p => ({ ...p, leads: p.leads + 1 }));
        });

        es.addEventListener("skip", () => {
            setStats(p => ({ ...p, skipped: p.skipped + 1 }));
        });

        es.addEventListener("scrape_done", e => {
            const d = JSON.parse(e.data);
            setPhase("verifying");
            setPhaseMsg(`Verifying ${d.toVerify} leads via Companies House...`);
            setScanProgress({ current: 0, total: 0 });
        });

        es.addEventListener("verify_total", e => {
            const { count } = JSON.parse(e.data);
            setVerifyProgress({ current: 0, total: count, eta: "" });
        });

        es.addEventListener("verify_progress", e => {
            const { index, total, eta, name } = JSON.parse(e.data);
            setVerifyProgress({ current: index, total, eta: eta || "" });
            setPhaseMsg(`Verifying: ${name || ""}`);
        });

        es.addEventListener("verify_done_lead", e => {
            // Update the buffered lead so the final flush has verified data.
            const d = JSON.parse(e.data);
            pendingLeadsRef.current = pendingLeadsRef.current.map(l =>
                (l._id === d.leadId || l.sellerId === d.leadId)
                    ? { ...l, ownerName: d.ownerName, ownerRole: d.ownerRole }
                    : l
            );
        });

        const finish = (summaryData) => {
            // Flush all buffered leads to state at once — this is the first
            // time the user sees any leads.
            setLeads([...pendingLeadsRef.current]);
            pendingLeadsRef.current = [];

            setSummary(summaryData);
            setIsRunning(false);
            setPhase("idle");
            setPhaseMsg("");
            stopTimer();
            es.close();
        };

        es.addEventListener("done", e => {
            finish(JSON.parse(e.data));
        });

        es.addEventListener("error_event", e => {
            finish(null);
        });

        es.onerror = () => {
            finish(null);
        };

    }, [keywords, pages, skipPages]);

    // ── Clear results ─────────────────────────────────────
    const clearResults = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setLeads([]);
        setSummary(null);
        setEstimate(null);
        setStats({ scanned: 0, leads: 0, skipped: 0, elapsed: "—" });
    }, []);

    const value = {
        // form
        keywords, setKeywords,
        pages, setPages,
        skipPages, setSkipPages,
        // run
        isRunning, phase, phaseMsg,
        leads, stats,
        // progress
        kwProgress, scanProgress, verifyProgress,
        estimate, summary,
        // actions
        handleStart, clearResults,
    };

    return (
        <ScraperContext.Provider value={value}>
            {children}
        </ScraperContext.Provider>
    );
}

export function useScraper() {
    const ctx = useContext(ScraperContext);
    if (!ctx) throw new Error("useScraper must be used inside <ScraperProvider>");
    return ctx;
}