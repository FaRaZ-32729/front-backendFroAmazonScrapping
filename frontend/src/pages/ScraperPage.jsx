// import { useState, useRef, useCallback, useEffect } from "react";
// import { PanelLeftClose, PanelLeft } from "lucide-react";

// import SearchForm from "../components/SearchForm.jsx";
// import StatsBar from "../components/StatsBar.jsx";
// import LiveLog from "../components/LiveLog.jsx";
// import LeadCard from "../components/LeadCard.jsx";
// import ProgressBar from "../components/ProgressBar.jsx";
// import ExportButton from "../components/ExportButton.jsx";

// function now() {
//   return new Date().toLocaleTimeString("en-GB", { hour12: false });
// }

// function addLog(setLogs, message, type = "info") {
//   setLogs(prev => [...prev, { message, type, time: now() }]);
// }

// export default function ScraperPage() {

//   const [keyword, setKeyword] = useState("");
//   const [pages, setPages] = useState(3);
//   const [isRunning, setIsRunning] = useState(false);
//   const [phase, setPhase] = useState("idle"); // "idle" | "scraping" | "verifying"
//   const [leads, setLeads] = useState([]);
//   const [logs, setLogs] = useState([]);
//   const [stats, setStats] = useState({ scanned: 0, leads: 0, skipped: 0, elapsed: "—" });
//   const [progress, setProgress] = useState({ current: 0, total: 0 });
//   const [verifyProgress, setVerifyProgress] = useState({ current: 0, total: 0 });
//   const [sidebar, setSidebar] = useState(true);

//   const esRef = useRef(null);
//   const startRef = useRef(null);
//   const timerRef = useRef(null);

//   useEffect(() => () => {
//     esRef.current?.close();
//     clearInterval(timerRef.current);
//   }, []);

//   function startTimer() {
//     startRef.current = Date.now();
//     timerRef.current = setInterval(() => {
//       const s = ((Date.now() - startRef.current) / 1000).toFixed(0);
//       setStats(p => ({ ...p, elapsed: `${s}s` }));
//     }, 1000);
//   }

//   function stopTimer() {
//     clearInterval(timerRef.current);
//     const s = ((Date.now() - startRef.current) / 1000).toFixed(1);
//     setStats(p => ({ ...p, elapsed: `${s}s` }));
//   }

//   const handleStart = useCallback(() => {

//     setLeads([]);
//     setLogs([]);
//     setStats({ scanned: 0, leads: 0, skipped: 0, elapsed: "0s" });
//     setProgress({ current: 0, total: 0 });
//     setVerifyProgress({ current: 0, total: 0 });
//     setPhase("scraping");
//     setIsRunning(true);

//     startTimer();
//     addLog(setLogs, `Keyword: "${keyword}" — pages: ${pages}`, "info");

//     const url = `/api/scrape/stream?keyword=${encodeURIComponent(keyword)}&pages=${pages}`;
//     const es = new EventSource(url);
//     esRef.current = es;

//     es.addEventListener("log", e => {
//       const d = JSON.parse(e.data);
//       addLog(setLogs, d.message, d.type || "info");
//     });

//     es.addEventListener("product_count", e => {
//       const { total } = JSON.parse(e.data);
//       setProgress(p => ({ ...p, total }));
//     });

//     es.addEventListener("scanning", e => {
//       const { index, total } = JSON.parse(e.data);
//       setProgress({ current: index, total });
//       setStats(p => ({ ...p, scanned: index }));
//     });

//     es.addEventListener("lead", e => {
//       const lead = JSON.parse(e.data);
//       setLeads(p => [lead, ...p]);
//       setStats(p => ({ ...p, leads: p.leads + 1 }));
//       addLog(setLogs, `Lead: ${lead.businessName || lead.sellerName} — ${lead.postcode || "?"}`, "success");
//     });

//     es.addEventListener("skip", e => {
//       const { reason } = JSON.parse(e.data);
//       setStats(p => ({ ...p, skipped: p.skipped + 1 }));
//       addLog(setLogs, reason, "warn");
//     });

//     // scrape phase finished — verification starting automatically
//     es.addEventListener("scrape_done", e => {
//       const { totalLeads, timeTaken } = JSON.parse(e.data);
//       addLog(setLogs, `Scraping done — ${totalLeads} leads in ${timeTaken}`, "success");
//       setPhase("verifying");
//       setProgress({ current: 0, total: 0 });
//     });

//     es.addEventListener("verify_total", e => {
//       const { count } = JSON.parse(e.data);
//       addLog(setLogs, `Verifying ${count} leads via Companies House...`, "info");
//       setVerifyProgress({ current: 0, total: count });
//     });

//     es.addEventListener("verify_progress", e => {
//       const { index, total, name } = JSON.parse(e.data);
//       setVerifyProgress({ current: index, total });
//       addLog(setLogs, `[${index}/${total}] ${name}`, "dim");
//     });

//     es.addEventListener("verify_done_lead", e => {
//       const d = JSON.parse(e.data);
//       // patch owner into the lead card instantly
//       setLeads(prev => prev.map(l =>
//         l._id === d.leadId || l.sellerId === d.leadId
//           ? { ...l, ownerName: d.ownerName, ownerRole: d.ownerRole }
//           : l
//       ));
//       const matchIcon = d.addressMatch === "match" ? "✓" : d.addressMatch === "partial" ? "~" : "✗";
//       addLog(setLogs, `${matchIcon} ${d.name} → ${d.ownerName} (${d.ownerRole}) [${d.addressMatch}]`, "success");
//     });

//     es.addEventListener("verify_not_found", e => {
//       const { name } = JSON.parse(e.data);
//       addLog(setLogs, `— ${name}: no Companies House record`, "warn");
//     });

//     // final done — both scrape + verify complete
//     es.addEventListener("done", e => {
//       const { totalLeads, timeTaken, verified, failed } = JSON.parse(e.data);
//       addLog(setLogs, `All done — ${totalLeads} leads scraped · ${verified} verified · ${failed} not found`, "success");
//       setIsRunning(false);
//       setPhase("idle");
//       stopTimer();
//       es.close();
//     });

//     es.addEventListener("error_event", e => {
//       const { message } = JSON.parse(e.data);
//       addLog(setLogs, `Error: ${message}`, "error");
//       setIsRunning(false);
//       stopTimer();
//       es.close();
//     });

//     es.onerror = () => {
//       addLog(setLogs, "Connection lost", "error");
//       setIsRunning(false);
//       stopTimer();
//       es.close();
//     };

//   }, [keyword, pages]);

//   return (
//     <div className="max-w-screen-xl mx-auto px-5 py-6 flex gap-5">

//       {/* ── Sidebar toggle ── */}
//       <button
//         onClick={() => setSidebar(v => !v)}
//         className="fixed bottom-5 left-5 z-40 p-2.5 rounded-xl bg-panel border border-border
//                    text-dim hover:text-text transition-colors shadow-lg md:hidden"
//       >
//         {sidebar ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
//       </button>

//       {/* ── Sidebar ── */}
//       {sidebar && (
//         <aside className="w-72 shrink-0 animate-fade-in">
//           <div className="sticky top-16 space-y-4">

//             <div className="bg-panel border border-border rounded-xl p-5 space-y-5">
//               <div className="flex items-center justify-between">
//                 <p className="text-[10px] font-mono text-dim uppercase tracking-widest">
//                   Configuration
//                 </p>
//                 <button
//                   onClick={() => setSidebar(false)}
//                   className="hidden md:block text-dim hover:text-text transition-colors"
//                 >
//                   <PanelLeftClose size={13} />
//                 </button>
//               </div>
//               <SearchForm
//                 keyword={keyword}
//                 setKeyword={setKeyword}
//                 pages={pages}
//                 setPages={setPages}
//                 onStart={handleStart}
//                 isRunning={isRunning}
//               />
//             </div>

//             {(isRunning || progress.total > 0 || verifyProgress.total > 0) && (
//               <div className="bg-panel border border-border rounded-xl p-5 space-y-3">

//                 {/* phase label */}
//                 <p className="text-[10px] font-mono text-dim uppercase tracking-widest flex items-center gap-2">
//                   {phase === "scraping" && <><span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse-dot" />Scraping</>}
//                   {phase === "verifying" && <><span className="w-1.5 h-1.5 rounded-full bg-blue animate-pulse-dot" />Verifying</>}
//                   {phase === "idle" && <>Complete</>}
//                 </p>

//                 {/* scraping bar */}
//                 {progress.total > 0 && (
//                   <ProgressBar
//                     current={progress.current}
//                     total={progress.total}
//                     isRunning={phase === "scraping"}
//                     color="green"
//                     label="Scraping"
//                   />
//                 )}

//                 {/* verification bar */}
//                 {verifyProgress.total > 0 && (
//                   <ProgressBar
//                     current={verifyProgress.current}
//                     total={verifyProgress.total}
//                     isRunning={phase === "verifying"}
//                     color="blue"
//                     label="Verifying"
//                   />
//                 )}

//               </div>
//             )}

//             <LiveLog logs={logs} isRunning={isRunning} />

//           </div>
//         </aside>
//       )}

//       {/* ── Main ── */}
//       <main className="flex-1 min-w-0 space-y-5">

//         {/* Sidebar open button when closed */}
//         {!sidebar && (
//           <button
//             onClick={() => setSidebar(true)}
//             className="flex items-center gap-2 text-xs font-mono text-dim hover:text-text transition-colors"
//           >
//             <PanelLeft size={13} />
//             Show controls
//           </button>
//         )}

//         <StatsBar stats={stats} isRunning={isRunning} />

//         <div className="flex justify-end">
//           <ExportButton leads={leads} />
//         </div>

//         {leads.length === 0 ? (
//           <EmptyState isRunning={isRunning} keyword={keyword} />
//         ) : (
//           <div className="flex flex-col gap-3">
//             {leads.map((lead, i) => (
//               <LeadCard
//                 key={lead.sellerId || `${lead.sellerName}-${i}`}
//                 lead={lead}
//                 index={i}
//               />
//             ))}
//           </div>
//         )}

//       </main>

//     </div>
//   );
// }

// function EmptyState({ isRunning, keyword }) {
//   return (
//     <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
//       <div className="w-14 h-14 rounded-2xl bg-panel border border-border flex items-center justify-center">
//         <span className="text-2xl">🎯</span>
//       </div>
//       <div>
//         <p className="font-display font-semibold text-text text-base">
//           {isRunning ? "Scanning Amazon..." : keyword ? "No UK leads found yet" : "Ready to harvest"}
//         </p>
//         <p className="text-xs font-mono text-dim mt-1 max-w-xs mx-auto">
//           {isRunning
//             ? "Leads appear here as they are found"
//             : "Enter a keyword on the left and hit Start"
//           }
//         </p>
//       </div>
//     </div>
//   );
// }

import { useState, useRef, useCallback, useEffect } from "react";
import { PanelLeftClose, PanelLeft, ChevronDown, ChevronUp, Clock, CheckCircle } from "lucide-react";

import SearchForm from "../components/SearchForm.jsx";
import StatsBar from "../components/StatsBar.jsx";
import LiveLog from "../components/LiveLog.jsx";
import LeadCard from "../components/LeadCard.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import ExportButton from "../components/ExportButton.jsx";

function now() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

function addLog(setLogs, message, type = "info") {
  setLogs(prev => [...prev, { message, type, time: now() }]);
}

export default function ScraperPage() {

  // ── Config ────────────────────────────────────────────
  const [keywords, setKeywords] = useState("");
  const [pages, setPages] = useState(1);
  const [skipPages, setSkipPages] = useState(0);

  // ── Run state ─────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | scraping | verifying
  const [leads, setLeads] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ scanned: 0, leads: 0, skipped: 0, elapsed: "—" });

  // ── Progress ──────────────────────────────────────────
  const [kwProgress, setKwProgress] = useState({ current: 0, total: 0, keyword: "" });
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [verifyProgress, setVerifyProgress] = useState({ current: 0, total: 0, eta: "" });

  // ── Estimates (from backend) ──────────────────────────
  const [estimate, setEstimate] = useState(null);

  // ── Summary (after done) ──────────────────────────────
  const [summary, setSummary] = useState(null);

  // ── UI ────────────────────────────────────────────────
  const [sidebar, setSidebar] = useState(true);
  const [logsOpen, setLogsOpen] = useState(true);

  const esRef = useRef(null);
  const startRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => () => {
    esRef.current?.close();
    clearInterval(timerRef.current);
  }, []);

  function startTimer() {
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const s = ((Date.now() - startRef.current) / 1000).toFixed(0);
      setStats(p => ({ ...p, elapsed: `${s}s` }));
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerRef.current);
    const s = ((Date.now() - startRef.current) / 1000).toFixed(1);
    setStats(p => ({ ...p, elapsed: `${s}s` }));
  }

  const handleStart = useCallback(() => {

    const kwList = keywords.split(/[\n,]+/).map(k => k.trim()).filter(Boolean);
    if (kwList.length === 0) return;

    setLeads([]);
    setLogs([]);
    setSummary(null);
    setEstimate(null);
    setStats({ scanned: 0, leads: 0, skipped: 0, elapsed: "0s" });
    setKwProgress({ current: 0, total: kwList.length, keyword: "" });
    setScanProgress({ current: 0, total: 0 });
    setVerifyProgress({ current: 0, total: 0, eta: "" });
    setPhase("scraping");
    setIsRunning(true);
    setLogsOpen(true);

    startTimer();

    const encoded = encodeURIComponent(kwList.join(","));
    const url = `/api/scrape/stream?keywords=${encoded}&pages=${pages}&skipPages=${skipPages}`;
    const es = new EventSource(url);
    esRef.current = es;

    // ── estimate from backend ──────────────────────────
    es.addEventListener("estimate", e => {
      setEstimate(JSON.parse(e.data));
    });

    es.addEventListener("log", e => {
      const d = JSON.parse(e.data);
      addLog(setLogs, d.message, d.type || "info");
    });

    // ── keyword progress ───────────────────────────────
    es.addEventListener("keyword_start", e => {
      const d = JSON.parse(e.data);
      setKwProgress({ current: d.index, total: d.total, keyword: d.keyword });
      setScanProgress({ current: 0, total: 0 });
    });

    es.addEventListener("keyword_done", e => {
      const d = JSON.parse(e.data);
      addLog(setLogs, `"${d.keyword}" — ${d.leads} leads in ${d.timeTaken} · ${d.remaining} keyword${d.remaining !== 1 ? "s" : ""} left`, "success");
    });

    // ── product scanning ───────────────────────────────
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
      const lead = JSON.parse(e.data);
      setLeads(p => [lead, ...p]);
      setStats(p => ({ ...p, leads: p.leads + 1 }));
      addLog(setLogs, `Lead: ${lead.businessName || lead.sellerName} — ${lead.postcode || "?"}`, "success");
    });

    es.addEventListener("skip", e => {
      const { reason } = JSON.parse(e.data);
      setStats(p => ({ ...p, skipped: p.skipped + 1 }));
      addLog(setLogs, reason, "warn");
    });

    // ── scrape done → verify phase ─────────────────────
    es.addEventListener("scrape_done", e => {
      const d = JSON.parse(e.data);
      addLog(setLogs, `Scraping complete — ${d.totalLeads} leads in ${d.timeTaken} · Verifying ${d.toVerify} leads (est. ${d.estVerifyTime})`, "success");
      setPhase("verifying");
      setScanProgress({ current: 0, total: 0 });
    });

    es.addEventListener("verify_total", e => {
      const { count } = JSON.parse(e.data);
      setVerifyProgress({ current: 0, total: count, eta: "" });
    });

    es.addEventListener("verify_progress", e => {
      const { index, total, eta } = JSON.parse(e.data);
      setVerifyProgress({ current: index, total, eta: eta || "" });
    });

    es.addEventListener("verify_done_lead", e => {
      const d = JSON.parse(e.data);
      setLeads(prev => prev.map(l =>
        l._id === d.leadId || l.sellerId === d.leadId
          ? { ...l, ownerName: d.ownerName, ownerRole: d.ownerRole }
          : l
      ));
      const icon = d.addressMatch === "match" ? "✓" : d.addressMatch === "partial" ? "~" : "✗";
      addLog(setLogs, `${icon} ${d.name} → ${d.ownerName} (${d.ownerRole}) [${d.addressMatch}]`, "success");
    });

    es.addEventListener("verify_not_found", e => {
      const { name } = JSON.parse(e.data);
      addLog(setLogs, `— ${name}: no Companies House record`, "warn");
    });

    // ── all done ───────────────────────────────────────
    es.addEventListener("done", e => {
      const d = JSON.parse(e.data);
      setSummary(d);
      addLog(setLogs, `✓ Done — ${d.totalLeads} leads · ${d.verified} verified · ${d.failed} not found · total time ${d.totalTime}`, "success");
      setIsRunning(false);
      setPhase("idle");
      stopTimer();
      es.close();
    });

    es.addEventListener("error_event", e => {
      const { message } = JSON.parse(e.data);
      addLog(setLogs, `Error: ${message}`, "error");
      setIsRunning(false);
      setPhase("idle");
      stopTimer();
      es.close();
    });

    es.onerror = () => {
      addLog(setLogs, "Connection lost", "error");
      setIsRunning(false);
      setPhase("idle");
      stopTimer();
      es.close();
    };

  }, [keywords, pages, skipPages]);

  const kwList = keywords.split(/[\n,]+/).map(k => k.trim()).filter(Boolean);

  return (
    <div className="max-w-screen-xl mx-auto px-5 py-6 flex gap-5">

      {/* ── Mobile sidebar toggle ── */}
      <button
        onClick={() => setSidebar(v => !v)}
        className="fixed bottom-5 left-5 z-40 p-2.5 rounded-xl bg-panel border border-border
                   text-dim hover:text-text transition-colors shadow-lg md:hidden"
      >
        {sidebar ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
      </button>

      {/* ── Sidebar ── */}
      {sidebar && (
        <aside className="w-72 shrink-0 animate-fade-in">
          <div className="sticky top-16 space-y-4">

            {/* Config panel */}
            <div className="bg-panel border border-border rounded-xl p-5 space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-mono text-dim uppercase tracking-widest">
                  Configuration
                </p>
                <button
                  onClick={() => setSidebar(false)}
                  className="hidden md:block text-dim hover:text-text transition-colors"
                >
                  <PanelLeftClose size={13} />
                </button>
              </div>
              <SearchForm
                keywords={keywords}
                setKeywords={setKeywords}
                pages={pages}
                setPages={setPages}
                skipPages={skipPages}
                setSkipPages={setSkipPages}
                onStart={handleStart}
                isRunning={isRunning}
              />
            </div>

            {/* Progress panel */}
            {(isRunning || scanProgress.total > 0 || verifyProgress.total > 0) && (
              <div className="bg-panel border border-border rounded-xl p-5 space-y-3">

                {/* phase badge */}
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-mono text-dim uppercase tracking-widest flex items-center gap-2">
                    {phase === "scraping" && <><span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse-dot" />Scraping</>}
                    {phase === "verifying" && <><span className="w-1.5 h-1.5 rounded-full bg-blue  animate-pulse-dot" />Verifying</>}
                    {phase === "idle" && <><CheckCircle size={10} className="text-green" />Complete</>}
                  </p>
                  {verifyProgress.eta && (
                    <span className="text-[10px] font-mono text-dim flex items-center gap-1">
                      <Clock size={9} />{verifyProgress.eta.replace("·", "").trim()}
                    </span>
                  )}
                </div>

                {/* keyword progress */}
                {kwProgress.total > 1 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-dim">
                      <span className="truncate max-w-[160px]">{kwProgress.keyword || "—"}</span>
                      <span className="tabular-nums shrink-0">{kwProgress.current}/{kwProgress.total} kw</span>
                    </div>
                    <div className="h-0.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber transition-all duration-500"
                        style={{ width: `${kwProgress.total > 0 ? Math.round((kwProgress.current / kwProgress.total) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* scan bar */}
                {scanProgress.total > 0 && (
                  <ProgressBar
                    current={scanProgress.current}
                    total={scanProgress.total}
                    isRunning={phase === "scraping"}
                    color="green"
                    label="Products"
                  />
                )}

                {/* verify bar */}
                {verifyProgress.total > 0 && (
                  <ProgressBar
                    current={verifyProgress.current}
                    total={verifyProgress.total}
                    isRunning={phase === "verifying"}
                    color="blue"
                    label="Verifying"
                  />
                )}

              </div>
            )}

            {/* ── Collapsible live log ── */}
            {logs.length > 0 && (
              <div className="bg-panel border border-border rounded-xl overflow-hidden">

                {/* accordion header */}
                <button
                  onClick={() => setLogsOpen(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5
                             text-[10px] font-mono text-dim uppercase tracking-widest
                             hover:text-text transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse-dot" />}
                    Live Log
                    <span className="text-dim normal-case">({logs.length})</span>
                  </span>
                  {logsOpen
                    ? <ChevronUp size={12} />
                    : <ChevronDown size={12} />
                  }
                </button>

                {/* log body */}
                {logsOpen && (
                  <div className="border-t border-border">
                    <LiveLog logs={logs} isRunning={isRunning} />
                  </div>
                )}

              </div>
            )}

          </div>
        </aside>
      )}

      {/* ── Main area ── */}
      <main className="flex-1 min-w-0 space-y-5">

        {!sidebar && (
          <button
            onClick={() => setSidebar(true)}
            className="flex items-center gap-2 text-xs font-mono text-dim hover:text-text transition-colors"
          >
            <PanelLeft size={13} />
            Show controls
          </button>
        )}

        <StatsBar stats={stats} isRunning={isRunning} />

        {/* ── Pre-run estimate ── */}
        {estimate && !summary && (
          <div className="bg-panel border border-border rounded-xl p-4">
            <p className="text-[10px] font-mono text-dim uppercase tracking-widest mb-3 flex items-center gap-2">
              <Clock size={10} />
              Time Estimate
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <TimeCell label="Scraping" value={estimate.estScrapeTime} color="text-green" />
              <TimeCell label="Verification" value={estimate.estVerifyTime} color="text-blue" />
              <TimeCell label="Total" value={estimate.estTotalTime} color="text-text" />
            </div>
            <p className="text-[10px] font-mono text-dim mt-3">
              ~{estimate.estLeads} estimated leads across {estimate.keywords} keyword{estimate.keywords > 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* ── Post-run summary ── */}
        {summary && (
          <div className="bg-panel border border-green/20 rounded-xl p-4">
            <p className="text-[10px] font-mono text-dim uppercase tracking-widest mb-3 flex items-center gap-2">
              <CheckCircle size={10} className="text-green" />
              Completed
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <TimeCell label="Scraping" value={summary.scrapeTime} color="text-green" />
              <TimeCell label="Verification" value={summary.verifyTime} color="text-blue" />
              <TimeCell label="Total" value={summary.totalTime} color="text-text" />
            </div>
            <div className="flex gap-4 mt-3 text-[10px] font-mono text-dim">
              <span><span className="text-green font-semibold">{summary.totalLeads}</span> leads</span>
              <span><span className="text-blue  font-semibold">{summary.verified}</span> verified</span>
              <span><span className="text-amber font-semibold">{summary.failed}</span> not found</span>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <ExportButton leads={leads} />
        </div>

        {leads.length === 0 ? (
          <EmptyState isRunning={isRunning} hasKeywords={kwList.length > 0} />
        ) : (
          <div className="flex flex-col gap-3">
            {leads.map((lead, i) => (
              <LeadCard
                key={lead.sellerId || `${lead.sellerName}-${i}`}
                lead={lead}
                index={i}
              />
            ))}
          </div>
        )}

      </main>

    </div>
  );
}

function TimeCell({ label, value, color }) {
  return (
    <div className="space-y-0.5">
      <p className={`text-sm font-mono font-semibold ${color}`}>{value}</p>
      <p className="text-[10px] font-mono text-dim">{label}</p>
    </div>
  );
}

function EmptyState({ isRunning, hasKeywords }) {
  return (
    <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-panel border border-border flex items-center justify-center">
        <span className="text-2xl">🎯</span>
      </div>
      <div>
        <p className="font-display font-semibold text-text text-base">
          {isRunning ? "Scanning Amazon..." : hasKeywords ? "No UK leads found yet" : "Ready to harvest"}
        </p>
        <p className="text-xs font-mono text-dim mt-1 max-w-xs mx-auto">
          {isRunning
            ? "Leads appear here as they are found"
            : "Enter keywords on the left and hit Start"
          }
        </p>
      </div>
    </div>
  );
}