import { Database, Clock, ScanLine, SkipForward } from "lucide-react";

const STATS = [
  { key: "scanned", icon: ScanLine,    label: "Scanned",    color: "text-blue"  },
  { key: "leads",   icon: Database,    label: "UK Leads",   color: "text-green" },
  { key: "skipped", icon: SkipForward, label: "Skipped",    color: "text-amber" },
  { key: "elapsed", icon: Clock,       label: "Elapsed",    color: "text-dim"   }
];

export default function StatsBar({ stats, isRunning }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {STATS.map(({ key, icon: Icon, label, color }) => (
        <div key={key} className="bg-panel border border-border rounded-xl px-4 py-3">
          <div className={`flex items-center gap-1.5 ${color} mb-1`}>
            <Icon size={12} />
            <span className="text-[10px] font-mono uppercase tracking-widest">{label}</span>
          </div>
          <div className={`font-mono font-bold text-2xl ${color}`}>
            {isRunning && key !== "elapsed"
              ? <span className="animate-pulse">{stats[key]}</span>
              : stats[key]
            }
          </div>
        </div>
      ))}
    </div>
  );
}