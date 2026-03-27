import { useState } from "react";
import { Target, Zap, Database } from "lucide-react";

import ScraperPage from "./pages/ScraperPage.jsx";
import LeadsPage from "./pages/LeadsPage.jsx";

const NAV = [
  { key: "scraper", label: "Scraper", icon: Zap },
  { key: "leads", label: "All Leads", icon: Database }
];

export default function App() {

  const [page, setPage] = useState("scraper");

  return (
    <div className="noise grid-bg min-h-screen">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-ink/80 backdrop-blur-md">
        <div className="max-w-screen-xl mx-auto px-5 py-0 flex items-center gap-6">

          {/* Logo */}
          <div className="flex items-center gap-2 py-3 shrink-0">
            <div className="w-6 h-6 rounded-md bg-green/10 border border-green/20 flex items-center justify-center">
              <Target size={12} className="text-green" />
            </div>
            <span className="font-display font-bold text-bright text-sm tracking-wide">
              LeadHarvest
            </span>
            <span className="text-dim font-mono text-xs hidden sm:block">/ Amazon UK</span>
          </div>

          {/* Nav tabs */}
          <nav className="flex items-center gap-1 flex-1">
            {NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setPage(key)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-xs font-mono font-medium
                  border-b-2 transition-colors duration-150
                  ${page === key
                    ? "border-green text-green"
                    : "border-transparent text-dim hover:text-text"
                  }
                `}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </nav>

        </div>
      </header>

      {/* ── Page ── */}
      {page === "scraper" && <ScraperPage />}
      {page === "leads" && <LeadsPage />}

    </div>
  );
}