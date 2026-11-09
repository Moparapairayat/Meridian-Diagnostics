export interface ResultRow {
  id: string;
  analyte: string;
  value: number;
  unit: string;
  ref_low: number;
  ref_high: number;
  flag: string;
  source: string;
  correction_reason: string | null;
}

const FLAG_TEXT: Record<string, string> = { L: 'Low', N: 'Normal', H: 'High' };

/** Result values with flags. The flag is always written in text, not colour only. */
export function ResultsTable({
  caption,
  rows,
  renderAction,
}: {
  caption: string;
  rows: ResultRow[];
  renderAction?: (row: ResultRow) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-border text-ink-muted">
          <tr>
            <th scope="col" className="py-2 pr-3 font-semibold">Analyte</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Value</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Unit</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Reference</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Flag</th>
            {renderAction && <th scope="col" className="py-2 font-semibold"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.id} className="align-top">
              <td className="py-2 pr-3">{r.analyte}</td>
              <td className={`py-2 pr-3 font-semibold ${r.flag !== 'N' ? 'text-danger' : ''}`}>{r.value}</td>
              <td className="py-2 pr-3">{r.unit}</td>
              <td className="py-2 pr-3">
                {r.ref_low}–{r.ref_high}
              </td>
              <td className="py-2 pr-3">
                <span className="font-semibold">{r.flag}</span> <span className="text-ink-muted">({FLAG_TEXT[r.flag] ?? r.flag})</span>
                {r.source === 'manual_correction' && (
                  <span className="block text-xs text-ink-muted">Corrected: {r.correction_reason}</span>
                )}
              </td>
              {renderAction && <td className="py-2">{renderAction(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const RESULT_COLUMNS = 'id, analyte, value, unit, ref_low, ref_high, flag, source, correction_reason' as const;
