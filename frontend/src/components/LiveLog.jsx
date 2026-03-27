import { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";

const TYPE_COLOR = {
  info:    "text-text",
  success: "text-green",
  warn:    "text-amber",
  error:   "text-red",
  dim:     "text-dim"
};

const TYPE_PREFIX = {
  info:    "›",
  success: "✓",
  warn:    "⚠",
  error:   "✕",
  dim:     "·"
};

export default function LiveLog({ logs, isRunning }) {

  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="bg-panel border border-border rounded-xl overflow-hidden flex flex-col" style={{ height: "280px" }}>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-ink shrink-0">
        <Terminal size={12} className="text-dim" />
        <span className="text-[10px] font-mono text-dim uppercase tracking-widest">Live Log</span>
        {isRunning && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse-dot" />
            <span className="text-[10px] font-mono text-green">live</span>
          </div>
        )}
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-0.5">
        {logs.length === 0 ? (
          <p className="text-dim text-xs font-mono pt-1">
            Awaiting start<span className="blink">_</span>
          </p>
        ) : logs.map((log, i) => (
          <div key={i} className="flex gap-2 text-[11px] font-mono leading-5 animate-fade-in">
            <span className={`shrink-0 ${TYPE_COLOR[log.type] || "text-text"}`}>
              {TYPE_PREFIX[log.type] || "›"}
            </span>
            <span className="text-dim shrink-0 tabular-nums">{log.time}</span>
            <span className={TYPE_COLOR[log.type] || "text-text"}>{log.message}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

    </div>
  );
}