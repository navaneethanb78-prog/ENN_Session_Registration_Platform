const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const fromExcelSerial = (n: number) => new Date((n - 25569) * 86400000);

export interface ParsedDate {
  /** First day of the programme, as a UTC calendar date. */
  date: Date;
  /** How many distinct days the cell listed. */
  days: number;
  how: "serial" | "numeric" | "text";
}

/**
 * Parse the spreadsheet's "Conducted on" cell.
 *
 * The column is free text recorded by hand over three years, and appears as:
 *   - an Excel date serial            45646
 *   - a single numeric date           23.04.24
 *   - several numeric dates           3-11-25,4-11-25
 *   - days sharing a trailing month   25,26/09/2025
 *   - written-out dates               23rd, 24th & 25th July 2024
 *
 * Multi-day programmes return the earliest day. The sibling "Month" column is
 * deliberately ignored: it was built as month-plus-a-fixed-day and drifted a
 * year out of step with the real dates, so it cannot be trusted.
 */
export function parseConductedOn(raw: string): ParsedDate | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;

  if (/^\d+$/.test(text) && Number(text) > 40000) {
    return { date: fromExcelSerial(Number(text)), days: 1, how: "serial" };
  }

  const full = [...text.matchAll(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/g)];
  if (full.length > 0) {
    const dates: { at: number; d: Date }[] = [];
    for (const m of full) {
      const year = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
      dates.push({ at: m.index ?? 0, d: new Date(Date.UTC(year, Number(m[2]) - 1, Number(m[1]))) });
    }

    // A bare day number borrows the month and year of the next full date, which
    // is how "25,26/09/2025" and "19,20,21-11-25" are written.
    const consumed = new Set<number>();
    for (const m of full) {
      for (let i = m.index ?? 0; i < (m.index ?? 0) + m[0].length; i++) consumed.add(i);
    }
    for (const bare of text.matchAll(/\d{1,2}/g)) {
      const at = bare.index ?? 0;
      if (consumed.has(at)) continue;
      const day = Number(bare[0]);
      if (day < 1 || day > 31) continue;
      const reference = dates.find((x) => x.at > at) ?? dates[0];
      if (!reference) continue;
      dates.push({
        at,
        d: new Date(Date.UTC(reference.d.getUTCFullYear(), reference.d.getUTCMonth(), day)),
      });
    }

    const unique = [...new Map(dates.map((x) => [x.d.getTime(), x.d])).values()].sort(
      (a, b) => a.getTime() - b.getTime(),
    );
    const first = unique[0];
    if (!first) return null;
    return { date: first, days: unique.length, how: "numeric" };
  }

  const cleaned = text.replace(/(\d+)(st|nd|rd|th)/gi, "$1");
  const monthWord = (cleaned.match(/[A-Za-z]+/g) ?? [])
    .map((w) => w.toLowerCase().slice(0, 3))
    .find((w) => w in MONTHS);
  if (monthWord === undefined) return null;

  const numbers = [...cleaned.matchAll(/\d+/g)].map((m) => Number(m[0]));
  const last = numbers[numbers.length - 1];
  if (last === undefined) return null;

  const hasYear = last > 1900 || (numbers.length > 1 && last >= 20 && last <= 40);
  const year = hasYear ? (last > 1900 ? last : 2000 + last) : null;
  const dayNumbers = (hasYear ? numbers.slice(0, -1) : numbers).filter((n) => n >= 1 && n <= 31);
  const day = dayNumbers[0];
  if (year === null || day === undefined) return null;

  const month = MONTHS[monthWord];
  if (month === undefined) return null;
  return { date: new Date(Date.UTC(year, month, day)), days: dayNumbers.length, how: "text" };
}
