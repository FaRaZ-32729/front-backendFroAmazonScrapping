  
import { useRef } from "react";
  import {
    PanelLeftClose, PanelLeft, Clock, CheckCircle, Loader
  } from "lucide-react";
  import { useState } from "react";

  import { useScraper } from "../context/scrapperContext.jsx";
  import SearchForm from "../components/SearchForm.jsx";
  import StatsBar from "../components/StatsBar.jsx";
  import LeadCard from "../components/LeadCard.jsx";
  import ProgressBar from "../components/ProgressBar.jsx";
  import ExportButton from "../components/ExportButton.jsx";

  export default function ScraperPage() {

    const {
      keywords, setKeywords,
      pages, setPages,
      skipPages, setSkipPages,
      isRunning, phase, phaseMsg,
      leads, stats,
      kwProgress, scanProgress, verifyProgress,
      estimate, summary,
      handleStart, clearResults,
    } = useScraper();

    const [sidebar, setSidebar] = useState(true);

    const kwList = keywords.split(/[\n,]+/).map(k => k.trim()).filter(Boolean);

    return (
      <div className="max-w-screen-xl mx-auto px-5 py-6 flex gap-5">

        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebar(v => !v)}
          className="fixed bottom-5 left-5 z-40 p-2.5 rounded-xl bg-panel border border-border
                            text-dim hover:text-text transition-colors shadow-md md:hidden"
        >
          {sidebar ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
        </button>

        {/* ── Sidebar ──────────────────────────────────── */}
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
                  keywords={keywords} setKeywords={setKeywords}
                  pages={pages} setPages={setPages}
                  skipPages={skipPages} setSkipPages={setSkipPages}
                  onStart={handleStart} isRunning={isRunning}
                />
              </div>

              {/* ── Progress panel ──────────────────────────
                              Stays visible whenever the backend is active
                              OR a run has been started this session.
                              Navigation cannot destroy this panel because
                              the context (and state) lives above the router.
                          ─────────────────────────────────────────────── */}
              {(isRunning || scanProgress.total > 0 || verifyProgress.total > 0) && (
                <div className="bg-panel border border-border rounded-xl p-5 space-y-4">

                  {/* Phase header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest">
                      {phase === "scraping" && (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse-dot" />
                          <span className="text-green">Scraping</span>
                        </>
                      )}
                      {phase === "verifying" && (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-blue animate-pulse-dot" />
                          <span className="text-blue">Verifying</span>
                        </>
                      )}
                      {phase === "idle" && summary && (
                        <>
                          <CheckCircle size={10} className="text-green" />
                          <span className="text-green">Complete</span>
                        </>
                      )}
                      {/* Show "In progress" label if running but no leads shown yet */}
                      {isRunning && !phaseMsg && (
                        <>
                          <Loader size={10} className="text-amber animate-spin" />
                          <span className="text-amber">In progress</span>
                        </>
                      )}
                    </div>

                    {verifyProgress.eta && (
                      <span className="text-[10px] font-mono text-dim flex items-center gap-1">
                        <Clock size={9} />
                        {verifyProgress.eta.replace("·", "").trim()}
                      </span>
                    )}
                  </div>

                  {/* Phase message */}
                  {phaseMsg && (
                    <p className="text-[10px] font-mono text-dim truncate">{phaseMsg}</p>
                  )}

                  {/* Keyword progress bar (only if >1 keyword) */}
                  {kwProgress.total > 1 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-dim">
                        <span className="truncate max-w-[160px]">
                          {kwProgress.keyword || "—"}
                        </span>
                        <span className="tabular-nums shrink-0">
                          {kwProgress.current}/{kwProgress.total} kw
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber transition-all duration-500"
                          style={{
                            width: `${kwProgress.total > 0
                              ? Math.round((kwProgress.current / kwProgress.total) * 100)
                              : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Scan bar */}
                  {scanProgress.total > 0 && (
                    <ProgressBar
                      current={scanProgress.current}
                      total={scanProgress.total}
                      isRunning={phase === "scraping"}
                      color="green"
                      label="Products"
                    />
                  )}

                  {/* Verify bar */}
                  {verifyProgress.total > 0 && (
                    <ProgressBar
                      current={verifyProgress.current}
                      total={verifyProgress.total}
                      isRunning={phase === "verifying"}
                      color="blue"
                      label="Verifying"
                    />
                  )}

                  {/* Live leads count during run (since cards are hidden until done) */}
                  {isRunning && stats.leads > 0 && (
                    <p className="text-[10px] font-mono text-dim">
                      <span className="text-green font-semibold">{stats.leads}</span>
                      {" "}leads found so far — will appear when complete
                    </p>
                  )}

                </div>
              )}

            </div>
          </aside>
        )}

        {/* ── Main content ──────────────────────────────── */}
        <main className="flex-1 min-w-0 space-y-5">

          {!sidebar && (
            <button
              onClick={() => setSidebar(true)}
              className="flex items-center gap-2 text-xs font-mono text-dim hover:text-text transition-colors"
            >
              <PanelLeft size={13} />Show controls
            </button>
          )}

          <StatsBar stats={stats} isRunning={isRunning} />

          {/* ── Time estimate panel ── */}
          {estimate && !summary && (
            <div className="bg-panel border border-border rounded-xl p-4">
              <p className="text-[10px] font-mono text-dim uppercase tracking-widest mb-3 flex items-center gap-2">
                <Clock size={10} />Time Estimate
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <TimeCell label="Scraping" value={estimate.estScrapeTime} color="text-green" />
                <TimeCell label="Verification" value={estimate.estVerifyTime} color="text-blue" />
                <TimeCell label="Total" value={estimate.estTotalTime} color="text-bright" />
              </div>
              <p className="text-[10px] font-mono text-dim mt-3">
                ~{estimate.estLeads} estimated leads across{" "}
                {estimate.keywords} keyword{estimate.keywords > 1 ? "s" : ""}
              </p>
            </div>
          )}

          {/* ── Running state — no lead cards yet ── */}
          {isRunning && (
            <div className="flex flex-col items-center justify-center py-24 gap-5">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center">
                  <Loader size={22} className="text-green animate-spin" />
                </div>
              </div>
              <div className="text-center space-y-1.5">
                <p className="font-display font-semibold text-bright text-base">
                  {phase === "scraping" ? "Scraping Amazon..." : "Verifying leads..."}
                </p>
                <p className="text-xs font-mono text-dim max-w-xs">
                  {phaseMsg || "Leads will appear here when the run completes"}
                </p>
                {stats.leads > 0 && (
                  <p className="text-xs font-mono text-green">
                    {stats.leads} lead{stats.leads !== 1 ? "s" : ""} found so far
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Summary banner (shown after run completes) ── */}
          {summary && (
            <div className="bg-green/5 border border-green/20 rounded-xl p-4">
              <p className="text-[10px] font-mono text-dim uppercase tracking-widest mb-3 flex items-center gap-2">
                <CheckCircle size={10} className="text-green" />Completed
              </p>
              <div className="grid grid-cols-3 gap-3 text-center mb-3">
                <TimeCell label="Scraping" value={summary.scrapeTime} color="text-green" />
                <TimeCell label="Verification" value={summary.verifyTime} color="text-blue" />
                <TimeCell label="Total" value={summary.totalTime} color="text-bright" />
              </div>
              <div className="flex gap-5 text-[11px] font-mono text-dim">
                <span><span className="text-green  font-semibold">{summary.totalLeads}</span> leads</span>
                <span><span className="text-blue   font-semibold">{summary.verified}</span> verified</span>
                <span><span className="text-amber  font-semibold">{summary.failed}</span> not found</span>
              </div>
            </div>
          )}

          {/* ── Actions row ── */}
          {!isRunning && leads.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono text-dim">
                <span className="text-bright font-semibold">{leads.length}</span> leads found
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={clearResults}
                  className="text-[10px] font-mono text-dim hover:text-red transition-colors"
                >
                  Clear
                </button>
                {/* <ExportButton leads={leads} /> */}
              </div>
            </div>
          )}

          {/* ── Lead cards — only shown after run completes ── */}
          {!isRunning && leads.length > 0 && (
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

          {/* ── Empty state ── */}
          {!isRunning && leads.length === 0 && !summary && (
            <EmptyState />
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

  function EmptyState() {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-panel border border-border flex items-center justify-center">
          <span className="text-2xl">🎯</span>
        </div>
        <div>
          <p className="font-display font-semibold text-bright text-base">Ready to harvest</p>
          <p className="text-xs font-mono text-dim mt-1 max-w-xs mx-auto">
            Enter keywords on the left and hit Start Scraping
          </p>
        </div>
      </div>
    );
  }
