export const ENGINE_VERSION = "1";
export const CURRENT_YEAR = 2026;

export const DIMENSION_ORDER = [
  "clarity",
  "novelty",
  "feasibility",
  "methodFit",
  "data",
  "ethics",
  "scope",
  "references",
] as const;

export type DimensionId = (typeof DIMENSION_ORDER)[number];

export type Light = "green" | "yellow" | "red";

export interface ProposalInput {
  question: string;
  abstract: string;
  references: string;
}

export interface DimensionResult {
  id: DimensionId;
  title: string;
  light: Light;
  score: number;
  reason: string;
  signals: string[];
}

export interface AdvisorQuestion {
  id: string;
  question: string;
  why: string;
  target: DimensionId;
  targetTitle: string;
}

export interface DayPlan {
  day: number;
  title: string;
  task: string;
  doneWhen: string;
}

export interface ReferenceItem {
  raw: string;
  years: number[];
  year: number | null;
}

export interface ReferenceStats {
  count: number;
  datedCount: number;
  recentCount: number;
  oldestYear: number | null;
  newestYear: number | null;
  recentRatio: number;
  missingYearRatio: number;
}

export interface AnalysisMeta {
  questionChars: number;
  abstractChars: number;
  referenceCount: number;
  recentReferenceCount: number;
  datedReferenceCount: number;
  oldestYear: number | null;
  newestYear: number | null;
  engine: "rules";
  version: string;
  currentYear: number;
}

export interface Analysis {
  overall: Light;
  headline: string;
  summary: string;
  dimensions: DimensionResult[];
  questions: AdvisorQuestion[];
  plan: DayPlan[];
  meta: AnalysisMeta;
}

export const DIMENSION_TITLES: Record<DimensionId, string> = {
  clarity: "问题清晰度",
  novelty: "新颖性",
  feasibility: "可行性",
  methodFit: "方法与问题是否匹配",
  data: "数据可得性",
  ethics: "伦理",
  scope: "范围与时间",
  references: "文献质量",
};

export const LIGHT_LABEL: Record<Light, string> = {
  green: "绿灯",
  yellow: "黄灯",
  red: "红灯",
};

export const DAY_LABELS = ["一", "二", "三", "四", "五", "六", "七"] as const;

export interface RuleBrief {
  id: DimensionId;
  title: string;
  body: string;
}

export const RULE_BRIEFS: RuleBrief[] = [
  {
    id: "clarity",
    title: "问题清晰度",
    body: "看研究问题是不是一句问话：有没有对象、范围和可观察的结果，有没有「一些」「赋能」「相关研究」这类虚词，是不是塞进了多个问题。又短、又虚、又不是问句，直接红灯。",
  },
  {
    id: "novelty",
    title: "新颖性",
    body: "在问题和摘要里找缺口（较少、缺乏、现有研究多）和差别（不同于、本文只、不做）。只有「创新点」「赋能」而没有缺口或差别，给红灯。写了缺口但没有点名差别，停在黄灯。",
  },
  {
    id: "feasibility",
    title: "可行性",
    body: "看有没有点名方法、样本量或公开数据，以及有没有把范围收在一所学校、八周或一学期。全国、医院推广、开发小程序叠在一起，再写成一两周，直接红灯。",
  },
  {
    id: "methodFit",
    title: "方法与问题是否匹配",
    body: "先判断问题在问因果、相关、机制、比较、设计还是描述，再看方法是实验、问卷、访谈、公开数据、编码还是做产品。因果问题配问卷，黄灯。又做产品又访谈、却没有评估，红灯。写明「不做因果」且方法是观察或二手数据，绿灯。",
  },
  {
    id: "data",
    title: "数据可得性",
    body: "公开数据、GitHub、CFPS、统计年鉴这类来源加分。自己发问卷或编码，黄灯：路径清楚，但还没拿到。病历或内部数据却不写授权，红灯。完全不写数据从哪来，红灯。",
  },
  {
    id: "ethics",
    title: "伦理",
    body: "病历、未成年人、欺骗被试等敏感信号，文本里又没有知情同意或伦理审查，红灯。普通问卷或访谈没写同意、退出和匿名，黄灯。没有受试者，绿灯。",
  },
  {
    id: "scope",
    title: "范围与时间",
    body: "数连接词和野心词。写清「只做什么」、一所学校、八周或一学期，加分。一两周内又要全国铺开或开发推广，红灯。",
  },
  {
    id: "references",
    title: "文献质量",
    body: "按行识别文献，抽出 1900 年到明年之间的四位年份。少于 3 条，红灯。有年份、不少于 5 条、近五年（相对 2026 年，即 2021 及以后）占已标年份的三成以上，绿灯。最新文献过旧，往红灯打。",
  },
];
