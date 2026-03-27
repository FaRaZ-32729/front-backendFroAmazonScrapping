export default function ProgressBar({ current, total, isRunning, color = "green", label = "Scanning" }) {

  const pct = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;

  const barColor = isRunning
    ? "shimmer"
    : color === "blue" ? "bg-blue" : "bg-green";

  const dotColor = color === "blue" ? "bg-blue" : "bg-green";
  const textColor = color === "blue" ? "text-blue" : "text-green";

  return (
    <div className="space-y-1.5">

      <div className="flex justify-between text-[10px] font-mono text-dim">
        <span className={isRunning ? textColor : ""}>
          {isRunning ? `${label}...` : total > 0 ? "Complete" : "Ready"}
        </span>
        <span className="tabular-nums">{total > 0 ? `${current} / ${total}` : "—"}</span>
      </div>

      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {total > 0 && (
        <div className="text-right text-[10px] font-mono text-dim tabular-nums">{pct}%</div>
      )}

    </div>
  );
}