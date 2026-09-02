import clsx from "clsx";

/**
 * A plain horizontal bar chart, drawn with layout rather than a charting
 * library — it stays legible, themable and dependency-free. The underlying
 * figures are also present as text, so the chart is not the only source.
 */
export function UtilisationChart({
  rows,
}: {
  rows: { id: string; name: string; registered: number; capacity: number }[];
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-[0.8125rem] text-ink-400">No upcoming sessions.</p>;
  }

  return (
    <ul className="flex list-none flex-col gap-3.5">
      {rows.map((row) => {
        const ratio = row.capacity > 0 ? Math.min(1, row.registered / row.capacity) : 0;
        const percent = Math.round(ratio * 100);
        const tone =
          ratio >= 1 ? "bg-rose-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-emerald-500";

        return (
          <li key={row.id}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-[0.8125rem] font-medium text-ink-700">{row.name}</p>
              <p className="tabular shrink-0 text-[0.8125rem] text-ink-500">
                {row.registered}/{row.capacity}
                <span className="ml-2 text-ink-400">{percent}%</span>
              </p>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-100">
              <div
                className={clsx("h-full rounded-full", tone)}
                style={{ width: `${Math.max(percent, row.registered > 0 ? 2 : 0)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
