import { buildPlan } from "./plan.ts";
import { buildQuestions } from "./questions.ts";
import { scoreProposal } from "./score.ts";
import {
  CURRENT_YEAR,
  ENGINE_VERSION,
  type Analysis,
  type DimensionId,
  type DimensionResult,
  type Light,
  type ProposalInput,
} from "./types.ts";

const HARD_RED = new Set<DimensionId>(["clarity", "feasibility", "ethics", "methodFit"]);

function names(items: DimensionResult[]): string {
  return items.map((item) => item.title).join("、");
}

export function overallOf(dimensions: DimensionResult[]): Pick<Analysis, "overall" | "headline" | "summary"> {
  const reds = dimensions.filter((item) => item.light === "red");
  const yellows = dimensions.filter((item) => item.light === "yellow");
  const hardRed = reds.some((item) => HARD_RED.has(item.id));
  let overall: Light;
  if (hardRed || reds.length >= 3) overall = "red";
  else if (reds.length === 0 && yellows.length <= 2) overall = "green";
  else overall = "yellow";

  if (overall === "red") {
    return {
      overall,
      headline: "先别铺开做。红灯补上之前，找导师只会反复被问同一句。",
      summary: `红灯在：${names(reds)}。`,
    };
  }
  if (overall === "green") {
    return {
      overall,
      headline: "没有红灯。把下面的反问自己答一遍，再拿去跟导师对口径。",
      summary: yellows.length ? `还剩黄灯：${names(yellows)}。` : "八项都是绿灯。反问仍建议答一遍，绿灯不是免检。",
    };
  }
  return {
    overall,
    headline: "方向能谈，但黄灯会被追问。先改口径，再去收数据。",
    summary: `${reds.length ? `红灯：${names(reds)}。` : ""}${yellows.length ? `黄灯：${names(yellows)}。` : ""}`,
  };
}

export function analyzeProposal(input: ProposalInput, currentYear = CURRENT_YEAR): Analysis {
  const question = input.question ?? "";
  const abstract = input.abstract ?? "";
  const references = input.references ?? "";
  const scored = scoreProposal({ question, abstract, references }, currentYear);
  const verdict = overallOf(scored.dimensions);

  return {
    ...verdict,
    dimensions: scored.dimensions,
    questions: buildQuestions(
      { question, abstract, references },
      scored.dimensions,
      scored.intent,
      scored.methods,
      scored.stats.newestYear,
    ),
    plan: buildPlan({ question, abstract, references }, scored.dimensions, scored.stats),
    meta: {
      questionChars: question.replace(/\s+/g, "").length,
      abstractChars: abstract.replace(/\s+/g, "").length,
      referenceCount: scored.stats.count,
      recentReferenceCount: scored.stats.recentCount,
      datedReferenceCount: scored.stats.datedCount,
      oldestYear: scored.stats.oldestYear,
      newestYear: scored.stats.newestYear,
      engine: "rules",
      version: ENGINE_VERSION,
      currentYear,
    },
  };
}
