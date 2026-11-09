import { describe, expect, it } from "vitest";
import { parseReferences, referenceStats } from "./references.ts";

describe("parseReferences", () => {
  it("reads one publication year and ignores volume and pages", () => {
    const items = parseReferences("王小明. 题目[J]. 现代教育技术, 2022, 32(4): 45-52.");
    expect(items).toHaveLength(1);
    expect(items[0]?.year).toBe(2022);
    expect(items[0]?.years).toEqual([2022]);
  });

  it("splits a single line of numbered or semicolon-separated entries", () => {
    const numbered = parseReferences("[1] Alpha 2019 [2] Beta 2023");
    expect(numbered.map((item) => item.year)).toEqual([2019, 2023]);

    const semicolons = parseReferences("张三. 甲[J]. 2020; 李四. 乙[J]. 2024; 王五. 丙[J]. 2018.");
    expect(semicolons.map((item) => item.year)).toEqual([2020, 2024, 2018]);
  });

  it("drops a bare heading and keeps a lone old year", () => {
    const items = parseReferences("参考文献\n李强. 农村卫生[M]. 1998.");
    expect(items).toHaveLength(1);
    expect(items[0]?.year).toBe(1998);
  });

  it("counts recent literature against 2026", () => {
    const stats = referenceStats(parseReferences("A 2013.\nB 2022.\nC 2024.\nD 2018."));
    expect(stats.count).toBe(4);
    expect(stats.oldestYear).toBe(2013);
    expect(stats.newestYear).toBe(2024);
    expect(stats.recentCount).toBe(2);
  });

  it("returns nothing for blank input", () => {
    expect(parseReferences("  \n  ")).toEqual([]);
  });
});
