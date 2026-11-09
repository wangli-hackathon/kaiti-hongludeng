import type { Light } from "./types.ts";

export function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function charCount(text: string): number {
  return text.replace(/\s+/g, "").length;
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function lightFromScore(score: number): Light {
  if (score >= 72) return "green";
  if (score >= 46) return "yellow";
  return "red";
}

export function snippet(text: string, max = 32): string {
  const compact = normalize(text);
  if (!compact) return "";
  return compact.length <= max ? compact : `${compact.slice(0, max)}…`;
}

export function matchedTerms(text: string, pattern: RegExp): string[] {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const copy = new RegExp(pattern.source, flags);
  return [...new Set([...text.matchAll(copy)].map((match) => match[0]))];
}

export function quoteBlock(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n").map((line) => line.trimEnd());
  if (!lines.some((line) => line.trim())) return "> （空）";
  return lines.map((line) => `> ${line}`.trimEnd()).join("\n");
}
