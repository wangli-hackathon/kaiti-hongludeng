import { describe, expect, it } from "vitest";
import { SAMPLES } from "../samples.ts";
import { analyzeProposal } from "./analyze.ts";
import { toMarkdown } from "./report.ts";
import type { Analysis, DimensionId, Light, ProposalInput } from "./types.ts";

function lightsOf(analysis: Analysis): Record<DimensionId, Light> {
  return Object.fromEntries(analysis.dimensions.map((item) => [item.id, item.light])) as Record<DimensionId, Light>;
}

function sampleInput(id: string): ProposalInput {
  const sample = SAMPLES.find((item) => item.id === id);
  if (!sample) throw new Error(id);
  return { question: sample.question, abstract: sample.abstract, references: sample.references };
}

describe("analyzeProposal", () => {
  it("marks an empty draft red and still returns five questions and seven days", () => {
    const analysis = analyzeProposal({ question: "", abstract: "", references: "" });
    expect(analysis.overall).toBe("red");
    expect(lightsOf(analysis).clarity).toBe("red");
    expect(lightsOf(analysis).references).toBe("red");
    expect(analysis.questions).toHaveLength(5);
    expect(new Set(analysis.questions.map((item) => item.question)).size).toBe(5);
    expect(analysis.plan.map((item) => item.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(analysis.dimensions.every((item) => item.reason && item.signals.length > 0)).toBe(true);
  });

  it("keeps the education sample on yellow, with a causal question parked at survey methods", () => {
    const analysis = analyzeProposal(sampleInput("short-video"));
    expect(lightsOf(analysis)).toEqual({
      clarity: "green",
      novelty: "yellow",
      feasibility: "green",
      methodFit: "yellow",
      data: "yellow",
      ethics: "yellow",
      scope: "green",
      references: "green",
    });
    expect(analysis.overall).toBe("yellow");
    expect(analysis.meta.newestYear).toBe(2024);
    expect(analysis.meta.oldestYear).toBe(2009);
    expect(analysis.meta.recentReferenceCount).toBeGreaterThanOrEqual(3);
  });

  it("lets the GitHub observation study pass without a red light", () => {
    const analysis = analyzeProposal(sampleInput("github-review"));
    const lights = lightsOf(analysis);
    expect(lights.clarity).toBe("green");
    expect(lights.methodFit).toBe("green");
    expect(lights.data).toBe("green");
    expect(lights.ethics).toBe("green");
    expect(lights.feasibility).toBe("green");
    expect(lights.scope).toBe("green");
    expect(lights.references).toBe("green");
    expect(lights.novelty).toBe("green");
    expect(analysis.overall).toBe("green");
    expect(analysis.questions.some((item) => item.question.includes("？"))).toBe(true);
  });

  it("stops the vague rural-health draft on red for ethics, scope, data and references", () => {
    const analysis = analyzeProposal(sampleInput("elder-health"));
    const lights = lightsOf(analysis);
    expect(lights.clarity).toBe("red");
    expect(lights.novelty).toBe("red");
    expect(lights.feasibility).toBe("red");
    expect(lights.methodFit).toBe("red");
    expect(lights.data).toBe("red");
    expect(lights.ethics).toBe("red");
    expect(lights.scope).toBe("red");
    expect(lights.references).toBe("red");
    expect(analysis.overall).toBe("red");
    expect(analysis.questions.some((item) => item.question.includes("病历"))).toBe(true);
  });

  it("is deterministic and does not leak a secret into the markdown", () => {
    const input = sampleInput("short-video");
    const once = analyzeProposal(input);
    const twice = analyzeProposal(input);
    expect(JSON.stringify(once)).toBe(JSON.stringify(twice));
    const markdown = toMarkdown(once, input);
    expect(markdown).toContain("## 导师反问");
    expect(markdown).toContain("## 七天行动");
    expect(markdown).toContain("完成标准：");
    expect(markdown).toContain("黄灯");
    expect(markdown).not.toContain("sk-");
    expect(markdown).not.toContain("apiKey");
  });

  it("gives a causal claim with only a questionnaire a yellow method light", () => {
    const analysis = analyzeProposal({
      question: "线上办公是否会降低某互联网公司新员工的离职意愿？",
      abstract:
        "在一所公司用问卷测量 120 名入职不满一年的员工，做回归分析。研究在一学期内完成。现有研究较少讨论入职第一年。",
      references: "甲. 离职研究[J]. 2023.\n乙. 组织行为[M]. 2022.\n丙. 综述[J]. 2019.\n丁. 补充[J]. 2024.\n戊. 经典[M]. 2012.",
    });
    expect(lightsOf(analysis).methodFit).toBe("yellow");
    expect(lightsOf(analysis).ethics).toBe("yellow");
  });
});
