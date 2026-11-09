import type { Intent, MethodKind } from "./score.ts";
import { charCount, snippet } from "./text.ts";
import {
  DIMENSION_TITLES,
  type AdvisorQuestion,
  type DimensionId,
  type DimensionResult,
  type ProposalInput,
} from "./types.ts";

interface Candidate {
  priority: number;
  id: string;
  question: string;
  why: string;
  target: DimensionId;
}

function boost(dimensions: DimensionResult[], id: DimensionId, base: number): number {
  const light = dimensions.find((item) => item.id === id)?.light;
  if (light === "red") return base + 30;
  if (light === "yellow") return base + 15;
  return base;
}

function causalVerb(question: string): string | null {
  return question.match(/降低|提高|影响|导致|干预/)?.[0] ?? null;
}

export function buildQuestions(
  input: ProposalInput,
  dimensions: DimensionResult[],
  intent: Intent,
  methods: MethodKind[],
  newestYear: number | null,
): AdvisorQuestion[] {
  const topic = snippet(input.question, 28);
  const quoted = topic ? `「${topic}」` : "这句问题";
  const verb = causalVerb(input.question);
  const methodList = methods.filter((method) => method !== "none");
  const alreadyAQuestion =
    charCount(input.question) > 0 &&
    charCount(input.question) <= 90 &&
    /[？?]|是否|如何|为何|为什么/.test(input.question);
  const candidates: Candidate[] = [
    {
      priority: boost(dimensions, "clarity", 80),
      id: "clarity-one-sentence",
      target: "clarity",
      why: "问题不单一，后面的方法和数据都会跟着漂。",
      question: !topic
        ? "研究问题还是空的。先写一句：谁、在什么范围、看什么关系、不声称什么。"
        : alreadyAQuestion
          ? `把${quoted}拆成四格：谁、范围、关系、不声称什么。哪一格填不满，下一稿就补哪一格。`
          : `如果只允许留一个问号，你留的是哪一句？把${quoted}改成「谁、在什么范围、看什么关系、不声称什么」。`,
    },
    {
      priority: boost(dimensions, "methodFit", 74),
      id: "method-verb",
      target: "methodFit",
      why: "导师听的是动词。问题和证据用的不是同一个动词，结论站不住。",
      question:
        intent === "causal" && !methodList.some((method) => method === "experiment" || method === "quasi")
          ? `问题在用「${verb ?? "降低或影响"}」，方法却接不住因果。你是把摘要改成「相关」，还是改设计？两句都要写出来，留下一句。`
          : intent === "design"
            ? "摘要里同时有做产品和找人访谈。哪一条是主路径？另一条写进不做清单。若留下产品，谁来用、看哪个指标？"
            : "方法的主路径是什么？数据不如预期时，哪一项分析可以不做，问题仍然成立？",
    },
    {
      priority: boost(dimensions, "ethics", 68),
      id: "ethics-exit",
      target: "ethics",
      why: "没有退出权和保存期限，后面的样本都算提前开工。",
      question: /病历|未成年人|儿童|患者/.test(`${input.question}\n${input.abstract}`)
        ? "这里碰到病历或敏感对象。知情同意、退出权和数据保存期限写在哪一节？写不出就先不要约访，也不要申请数据。"
        : /问卷|访谈|大学生|老年人|老人/.test(`${input.question}\n${input.abstract}`)
          ? "受试者如何知情、能否中途退出、原始回答存多久、谁能看？请写成能放进摘要的三句。"
          : "如果后来要联系真人，或引用能认出身份的账号，公开数据的边界在哪里？现在就写上你不碰的字段。",
    },
    {
      priority: boost(dimensions, "novelty", 62),
      id: "novelty-closest",
      target: "novelty",
      why: "缺口不落到一篇文献上，就只是形容词。",
      question: /较少|缺乏|现有研究|不同于|本文只|不做/.test(`${input.question}\n${input.abstract}`)
        ? "近五年最接近的一篇是什么？你和它只差在哪一个变量，或哪一类对象？差不出那一格，新颖性就还没成立。"
        : "摘要里还没有「别人做过什么」。举出一篇最接近的文献，并用一句话说你不做他们已经做完的那部分。",
    },
    {
      priority: boost(dimensions, "data", 58),
      id: "data-first-batch",
      target: "data",
      why: "拿不到第一批数据，时间表是空的。",
      question: /病历|内部数据|未公开|机密/.test(`${input.question}\n${input.abstract}`)
        ? "这批数据谁批准、哪一天能看到第一条？写不出批准人，今天就换公开数据，并回头改问题。"
        : "第一批数据的名称、数量和日期是什么？拿不到时，备选数据是哪一个？",
    },
    {
      priority: boost(dimensions, "scope", 54),
      id: "scope-cut",
      target: "scope",
      why: "开题死于同时做三件事。",
      question: "按现在的摘要，八周后唯一的交付物是什么？请列出不做清单，至少删掉三件你本来想做的事。",
    },
    {
      priority: boost(dimensions, "references", 48),
      id: "references-recent",
      target: "references",
      why: "文献停在旧年份，导师会认为你没检索。",
      question:
        newestYear === null
          ? "请补五篇文献：两篇奠基、三篇近五年，每篇用半句写它和你的差别。没有年份的条目不算数。"
          : `文献最新到 ${newestYear} 年。近五年有没有直接竞争的工作？写出检索式，以及你排除它们的理由。`,
    },
    {
      priority: boost(dimensions, "feasibility", 44),
      id: "feasibility-hours",
      target: "feasibility",
      why: "做不到的设计，写得再完整也是红灯。",
      question: "如果只有你一个人、每周六个小时，八周后交得出什么？写不出交付物，范围就还是太大。",
    },
  ];

  return candidates
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      question: item.question,
      why: item.why,
      target: item.target,
      targetTitle: DIMENSION_TITLES[item.target],
    }));
}
