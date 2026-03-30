import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import { Target, Zap, Database } from "lucide-react";

import ScraperPage from "./pages/ScraperPage.jsx";
import LeadsPage from "./pages/LeadsPage.jsx";
import { ScraperProvider } from "./context/scrapperContext.jsx";

const NAV = [
  { path: "/", label: "Scraper", icon: Zap },
  { path: "/leads", label: "All Leads", icon: Database }
];

export default function App() {
  return (
    <Router>
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
                Prace leadGen
              </span>
              <span className="text-dim font-mono text-xs hidden sm:block">
                / Amazon UK
              </span>
            </div>

            {/* Nav tabs */}
            <nav className="flex items-center gap-1 flex-1">
              {NAV.map(({ path, label, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === "/"}
                  className={({ isActive }) => `
                    flex items-center gap-2 px-4 py-3 text-xs font-mono font-medium
                    border-b-2 transition-colors duration-150
                    ${isActive
                      ? "border-green text-green"
                      : "border-transparent text-dim hover:text-text"
                    }
                  `}
                >
                  <Icon size={13} />
                  {label}
                </NavLink>
              ))}
            </nav>

          </div>
        </header>

        {/* ── Routes ── */}
        <ScraperProvider>
          <Routes>
            <Route path="/" element={<ScraperPage />} />
            <Route path="/leads" element={<LeadsPage />} />
          </Routes>
        </ScraperProvider>

      </div>
    </Router>
  );
}