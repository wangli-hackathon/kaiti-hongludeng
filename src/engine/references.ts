import { CURRENT_YEAR, type ReferenceItem, type ReferenceStats } from "./types.ts";

const YEAR_PATTERN = /(?:19|20)\d{2}/g;

function uniqueYears(line: string, currentYear: number): number[] {
  return [...new Set([...line.matchAll(YEAR_PATTERN)].map((match) => Number(match[0])))].filter(
    (year) => year >= 1900 && year <= currentYear + 1,
  );
}

export function parseReferences(raw: string, currentYear = CURRENT_YEAR): ReferenceItem[] {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  let chunks = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(参考文献|references?)\s*[:：]?$/i.test(line));

  if (chunks.length === 1) {
    const only = chunks[0] ?? "";
    const numbered = only.match(/\[\d+\]/g) ?? [];
    const semicolons = only.match(/[;；]/g) ?? [];
    if (numbered.length >= 2) {
      chunks = only
        .split(/(?=\[\d+\])/)
        .map((part) => part.trim())
        .filter(Boolean);
    } else if (semicolons.length >= 2) {
      chunks = only
        .split(/[;；]/)
        .map((part) => part.trim())
        .filter(Boolean);
    }
  }

  return chunks
    .map((line) => line.replace(/^\s*(?:\[\d+\]|\d+[.、)])\s*/, "").trim())
    .filter((line) => line.length >= 4)
    .map((line) => {
      const years = uniqueYears(line, currentYear);
      return {
        raw: line,
        years,
        year: years.length ? Math.max(...years) : null,
      };
    });
}

export function referenceStats(items: ReferenceItem[], currentYear = CURRENT_YEAR): ReferenceStats {
  const dated = items.filter((item) => item.year !== null);
  const years = dated.map((item) => item.year as number);
  const recentCutoff = currentYear - 5;
  const recentCount = years.filter((year) => year >= recentCutoff).length;
  return {
    count: items.length,
    datedCount: dated.length,
    recentCount,
    oldestYear: years.length ? Math.min(...years) : null,
    newestYear: years.length ? Math.max(...years) : null,
    recentRatio: dated.length ? recentCount / dated.length : 0,
    missingYearRatio: items.length ? (items.length - dated.length) / items.length : 1,
  };
}
