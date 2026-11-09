import { describe, expect, it } from "vitest";
import { chatCompletionsUrl, parseEnrichmentPayload } from "./llm.ts";

describe("llm helpers", () => {
  it("builds an OpenAI-compatible chat completions url", () => {
    expect(chatCompletionsUrl("https://dashscope.aliyuncs.com/compatible-mode/v1")).toBe(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    );
    expect(chatCompletionsUrl("https://example.com/v1/chat/completions/")).toBe(
      "https://example.com/v1/chat/completions",
    );
    expect(() => chatCompletionsUrl("dashscope.aliyuncs.com")).toThrow(/http/);
  });

  it("reads fenced JSON and keeps five questions", () => {
    const enrichment = parseEnrichmentPayload(
      "说明如下\n```json\n{\"advisorNote\":\"先改动词。\",\"reasons\":{\"methodFit\":\"动词是降低，证据是相关。\"},\"questions\":[\"一？\",\"二？\",\"三？\",\"四？\",\"五？\"]}\n```",
    );
    expect(enrichment.advisorNote).toBe("先改动词。");
    expect(enrichment.reasons.methodFit).toContain("降低");
    expect(enrichment.questions).toEqual(["一？", "二？", "三？", "四？", "五？"]);
  });

  it("drops a question list that is not exactly five", () => {
    const enrichment = parseEnrichmentPayload('{"advisorNote":"只看这一句。","questions":["只有一条"]}');
    expect(enrichment.questions).toBeNull();
    expect(enrichment.advisorNote).toBe("只看这一句。");
  });

  it("rejects prose with no object", () => {
    expect(() => parseEnrichmentPayload("我觉得可以。")).toThrow(/JSON/);
  });
});
