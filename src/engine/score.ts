import { parseReferences, referenceStats } from "./references.ts";
import { charCount, clamp, lightFromScore, matchedTerms, normalize } from "./text.ts";
import {
  CURRENT_YEAR,
  DIMENSION_TITLES,
  type DimensionId,
  type DimensionResult,
  type Light,
  type ProposalInput,
  type ReferenceItem,
  type ReferenceStats,
} from "./types.ts";

export type Intent =
  | "causal"
  | "associational"
  | "mechanism"
  | "comparative"
  | "design"
  | "descriptive"
  | "unclear";

export type MethodKind =
  | "experiment"
  | "quasi"
  | "survey"
  | "interview"
  | "secondary"
  | "content"
  | "build"
  | "theory"
  | "none";

export const INTENT_LABEL: Record<Intent, string> = {
  causal: "因果",
  associational: "相关或观察",
  mechanism: "机制",
  comparative: "比较",
  design: "设计或开发",
  descriptive: "描述",
  unclear: "含糊",
};

export const METHOD_LABEL: Record<MethodKind, string> = {
  experiment: "实验",
  quasi: "准实验",
  survey: "问卷或回归",
  interview: "访谈",
  secondary: "二手或公开数据",
  content: "内容编码",
  build: "系统或产品",
  theory: "理论或综述",
  none: "未写方法",
};

export interface ScoreContext {
  question: string;
  abstract: string;
  body: string;
  intent: Intent;
  methods: MethodKind[];
  references: ReferenceItem[];
  stats: ReferenceStats;
}

function result(
  id: DimensionId,
  score: number,
  leads: string[],
  evidence: string[],
  force?: Light,
): DimensionResult {
  const cleanLeads = leads.filter(Boolean);
  const cleanEvidence = evidence.filter(Boolean);
  const signals = [...cleanLeads, ...cleanEvidence];
  const reasonSource = cleanLeads.length ? cleanLeads : cleanEvidence;
  return {
    id,
    title: DIMENSION_TITLES[id],
    score: clamp(score),
    light: force ?? lightFromScore(clamp(score)),
    reason: reasonSource.slice(0, 2).join(""),
    signals,
  };
}

export function detectIntent(text: string): Intent {
  if (/不做因果|并非因果|不是因果|只讨论相关|是否相关/.test(text)) return "associational";
  if (/机制|中介|调节效应|影响路径/.test(text)) return "mechanism";
  if (/是否会|导致|因果|干预|降低|提高了|提升了|是否影响|会影响/.test(text)) return "causal";
  if (/开发一个|开发一套|构建一个|小程序|设计并实现/.test(text)) return "design";
  if (/差异|比较|高于|低于/.test(text)) return "comparative";
  if (/现状|特征|哪些|是什么|画像|如何|怎样/.test(text)) return "descriptive";
  return "unclear";
}

export function detectMethods(text: string): MethodKind[] {
  const found: MethodKind[] = [];
  if (/实验|随机对照|用户测试|消融/.test(text)) found.push("experiment");
  if (/双重差分|工具变量|断点回归|倾向得分|准实验/.test(text)) found.push("quasi");
  if (/问卷|量表|回归|相关分析/.test(text)) found.push("survey");
  if (/访谈|半结构/.test(text)) found.push("interview");
  if (/公开数据|二手数据|GitHub|统计年鉴|可下载|开源/.test(text)) found.push("secondary");
  if (/内容分析|人工编码|编码手册|评论编码/.test(text)) found.push("content");
  if (/小程序|开发一个|开发一套|构建一个|算法模型/.test(text)) found.push("build");
  if (/文献综述|理论分析|思辨/.test(text)) found.push("theory");
  return found.length ? found : ["none"];
}

function scoreClarity(ctx: ScoreContext): DimensionResult {
  const question = normalize(ctx.question);
  const length = charCount(question);
  if (!question) {
    return result("clarity", 8, ["一票红灯：研究问题是空的。"], ["空问题不会因为摘要写得长而被放过。"], "red");
  }

  let score = 48;
  const leads: string[] = [];
  const evidence: string[] = [`研究问题约 ${length} 字。`];
  const interrogative = /[？?]|是否|如何|为何|为什么|哪些|何种|有何|多大|多少|能否/;
  const vague = /一些|某些|相关研究|研究一下|更好地|赋能|若干|等等/;
  const population = /大学生|研究生|教师|学生|老年人|老人|儿童|患者|企业|农民|农村|用户|开发者|评审|学校|高校|医院|社区|仓库|GitHub|Pull Request/;
  const outcome = /是否相关|相关关系|有何关系|差异|效应|机制|预测|改善|降低|提高|缺陷|投入|意愿|行为|条数|是否影响/;

  if (length < 12) {
    score -= 28;
    leads.push("问题短到说不清对象和结果。");
  } else if (length <= 90) {
    score += 14;
    evidence.push("长度能在一句里读完。");
  } else if (length <= 180) {
    score += 4;
    evidence.push("问题偏长，口试时可能讲不完一句。");
  } else {
    score -= 12;
    leads.push("问题写成了段落，主句被埋住了。");
  }

  if (interrogative.test(question)) {
    score += 16;
    evidence.push("带有疑问形式，能听出在问一件事。");
  } else {
    score -= 8;
    leads.push("没有问句形式，更像口号而不是研究问题。");
  }

  if (population.test(ctx.body)) {
    score += 10;
    evidence.push("写到了具体人群或场域。");
  } else {
    score -= 8;
    leads.push("没写清研究谁、在哪一类情境里。");
  }

  if (outcome.test(question)) {
    score += 8;
    evidence.push("问题里有可观察的结果或关系。");
  } else {
    score -= 6;
    leads.push("看不出要观察的结果是什么。");
  }

  if (vague.test(question)) {
    score -= 18;
    leads.push("问题里有含糊词，边界是软的。");
  } else if (interrogative.test(question) && population.test(ctx.body) && outcome.test(question)) {
    leads.unshift("这是一句问话，对象和结果都露出来了。");
  }

  const questionMarks = question.match(/[？?]/g)?.length ?? 0;
  if (questionMarks >= 3) {
    score -= 12;
    leads.push("一句里塞了多个问号，还不是单一问题。");
  }

  let force: Light | undefined;
  if (length < 22 && vague.test(question) && !interrogative.test(question)) {
    force = "red";
    leads.unshift("一票红灯：又短、又虚、又不是问句。");
  }

  return result("clarity", score, leads, evidence, force);
}

function scoreNovelty(ctx: ScoreContext): DimensionResult {
  const abstractLength = charCount(ctx.abstract);
  const gap = /尚不|尚无|较少|很少有|缺乏|空白|争议|尚未|少有|现有研究多|既有研究|忽略|未讨论/;
  const contrast = /不同于|区别于|本文只|本研究只|只使用|只讨论|不做/;
  const buzz = /赋能|新时代|高质量发展|深度融合|创新点/;
  let score = 34;
  const leads: string[] = [];
  const evidence: string[] = [];

  if (abstractLength < 40) {
    score -= 18;
    leads.push("摘要太短，看不出你和已有研究差在哪里。");
  } else if (abstractLength >= 80) {
    score += 10;
    evidence.push("摘要有足够篇幅安放缺口。");
  }

  if (gap.test(ctx.body)) {
    score += 24;
    evidence.push("出现了缺口表述，例如较少、缺乏或现有研究多。");
  }

  if (contrast.test(ctx.body)) {
    score += 20;
    evidence.push("写了和相近工作的差别，或写明了自己不做的部分。");
  }

  if (/本文只|只使用|只讨论|不做/.test(ctx.body)) {
    score += 12;
  }

  if (buzz.test(ctx.body) && !gap.test(ctx.body)) {
    score -= 16;
    leads.push("用了「赋能」或「创新点」，但没有对到一篇相近研究。");
  }

  if (!gap.test(ctx.body) && !contrast.test(ctx.body)) {
    score = Math.min(score, 44);
    leads.push("没有写已有研究的缺口，也没有写和别人的差别。");
  } else if (gap.test(ctx.body) && !contrast.test(ctx.body)) {
    score = Math.min(score, 68);
    leads.unshift("提到了缺口，但还没点名你和最接近的那篇差在哪里。");
  } else if (contrast.test(ctx.body)) {
    leads.unshift("差别写出来了，新颖性有抓手。");
  }

  let force: Light | undefined;
  if (buzz.test(ctx.body) && !gap.test(ctx.body) && !contrast.test(ctx.body)) {
    force = "red";
    leads.unshift("一票红灯：新颖性只停留在「综合」或「赋能」。");
  }

  return result("novelty", score, leads, evidence, force);
}

function scoreFeasibility(ctx: ScoreContext): DimensionResult {
  let score = 56;
  const leads: string[] = [];
  const evidence: string[] = [];
  const methodHit = /问卷|访谈|实验|回归|案例|内容分析|编码|公开数据|二手数据|用户测试|文献综述|理论分析/.test(ctx.body);
  const mega = matchedTerms(ctx.body, /全国|跨省|多中心|多年追踪|纵向追踪|随机对照|医院推广|开发一个小程序|开发一套/);
  const tinyTime = /两周|一周|三天|几天/.test(ctx.body);

  if (methodHit) {
    score += 14;
    evidence.push("点名了可以动手的方法。");
    if (mega.length === 0) leads.unshift("方法写了，范围没有同时铺开。");
  } else {
    score -= 26;
    leads.push("没有点名可执行的方法，工期无法估计。");
  }

  if (/\d+\s*(名|人|份|条|所|家)/.test(ctx.body) || /约\s*\d+/.test(ctx.body)) {
    score += 8;
    evidence.push("写了数量，工作量开始能算。");
  }

  if (/一所|本校|八周|一学期|四周|单人|只使用|仅限/.test(ctx.body)) {
    score += 12;
    evidence.push("范围或期限有边界。");
  }

  if (mega.length >= 2) {
    score -= 30;
    leads.push(`范围词叠了：${mega.join("、")}。以个人工期看不现实。`);
  } else if (mega.length === 1) {
    score -= 10;
    leads.push(`出现了较重的任务「${mega[0]}」，需要单独证明你做得到。`);
  }

  let force: Light | undefined;
  if (tinyTime && mega.length >= 1) {
    force = "red";
    leads.unshift("一票红灯：时间写成一两周，任务却是铺开、开发或推广。");
  } else if (!methodHit) {
    force = "red";
  }

  return result("feasibility", score, leads, evidence, force);
}

function scoreMethod(ctx: ScoreContext): DimensionResult {
  const labels = ctx.methods.map((method) => METHOD_LABEL[method]).join("、");
  const evidence = [`问题倾向记为「${INTENT_LABEL[ctx.intent]}」，做法：${labels}。`];
  const set = new Set(ctx.methods);
  const causalCapable = set.has("experiment") || set.has("quasi");
  const associative = set.has("survey") || set.has("secondary") || set.has("content") || set.has("interview");

  if (ctx.methods.length === 1 && ctx.methods[0] === "none") {
    return result("methodFit", 18, ["一票红灯：没有能接住问题的方法。"], evidence, "red");
  }

  if (ctx.intent === "associational" && associative) {
    return result(
      "methodFit",
      84,
      ["问题谈的是相关或观察，方法也停在观察、编码或二手数据，两边一致。"],
      evidence,
    );
  }

  if (ctx.intent === "causal" && causalCapable) {
    return result("methodFit", 82, ["问题在问影响或干预，文本里有实验或准实验路径。"], evidence);
  }

  if (ctx.intent === "causal" && associative && !causalCapable) {
    return result(
      "methodFit",
      55,
      ["问题用了「降低、影响、导致」这类因果口吻，方法却是问卷、访谈或回归。"],
      ["黄灯不是否定问卷，而是要求把结论停在相关，或改设计。", ...evidence],
      "yellow",
    );
  }

  if (ctx.intent === "design" && set.has("build")) {
    const hasEval = /评估|用户测试|实验|消融|指标/.test(ctx.body);
    if ((set.has("interview") || set.has("survey")) && !hasEval) {
      return result(
        "methodFit",
        28,
        ["一票红灯：又要做产品又要访谈，但没有评估设计，方法接不住问题。"],
        evidence,
        "red",
      );
    }
    if (!hasEval) {
      return result("methodFit", 52, ["有构建意图，但没写如何判断它是否有效。"], evidence, "yellow");
    }
    return result("methodFit", 78, ["构建之外写了评估，设计问题有落点。"], evidence);
  }

  if (ctx.intent === "unclear") {
    return result("methodFit", 32, ["问题本身含糊，方法即使写了也无从匹配。"], evidence, "red");
  }

  if (ctx.intent === "mechanism" && !/中介|调节|路径|结构方程/.test(ctx.body)) {
    return result("methodFit", 50, ["问题提到机制或路径，方法里还没有对应的检验。"], evidence, "yellow");
  }

  if ((ctx.intent === "descriptive" || ctx.intent === "comparative") && associative) {
    return result("methodFit", 78, ["描述或比较问题，与问卷、访谈或内容分析可以接上。"], evidence);
  }

  return result(
    "methodFit",
    58,
    ["方法和问题大致沾边，但主路径还不够硬。"],
    evidence,
    "yellow",
  );
}

function scoreData(ctx: ScoreContext): DimensionResult {
  let score = 40;
  const leads: string[] = [];
  const evidence: string[] = [];
  const publicSource = /GitHub|CFPS|CGSS|CHARLS|CHFS|PISA|统计年鉴|Kaggle|公开数据|公开的|可下载|开源/;
  const selfCollect = /用问卷|发放问卷|问卷调查|访谈|人工编码|内容分析/;
  const locked = /病历|内部数据|公司数据|未公开|机密/;
  const allowed = /已授权|已批准|伦理委员会|公开/;

  if (publicSource.test(ctx.body)) {
    score += 36;
    leads.push("点名了可以下载或公开核验的数据。");
  }
  if (selfCollect.test(ctx.body)) {
    score += 18;
    if (publicSource.test(ctx.body)) {
      evidence.push("除了公开数据，还要自己编码或采集，工时要单列。");
    } else {
      leads.push("数据要自己采，文本还没写何时能拿到第一批。");
    }
  }

  let force: Light | undefined;
  if (locked.test(ctx.body) && !allowed.test(ctx.body)) {
    force = "red";
    score = Math.min(score, 24);
    leads.unshift("一票红灯：要用病历或内部数据，却没有写谁授权。");
  } else if (!publicSource.test(ctx.body) && !selfCollect.test(ctx.body)) {
    force = "red";
    score = 22;
    leads.push("没有写数据从哪里来。");
  }

  return result("data", score, leads, evidence, force);
}

function scoreEthics(ctx: ScoreContext): DimensionResult {
  const highRisk = /病历|未成年人|儿童|中学生|小学生|自杀|自伤|基因数据|人脸识别|隐瞒研究目的|欺骗被试/;
  const human = /用问卷|发放问卷|问卷调查|访谈|被试|受试|老年人|老人|大学生|患者|医生/;
  const mitigation = /知情同意|伦理审查|伦理委员会|匿名|脱敏|自愿|可退出|监护人/;
  const formalReview = /伦理审查|伦理委员会/;

  if (highRisk.test(ctx.body) && !mitigation.test(ctx.body)) {
    return result(
      "ethics",
      16,
      ["一票红灯：涉及病历或敏感对象，文本里没有知情同意、匿名或伦理审查。"],
      ["敏感信号命中后，不因其他段落写得具体而放行。"],
      "red",
    );
  }

  if (highRisk.test(ctx.body) && mitigation.test(ctx.body)) {
    return result(
      "ethics",
      formalReview.test(ctx.body) ? 80 : 60,
      [
        formalReview.test(ctx.body)
          ? "敏感数据写到了伦理审查，还要核对审查是否已经拿到。"
          : "写了同意或匿名，但敏感数据仍建议走伦理审查，所以先给黄灯。",
      ],
      [],
      formalReview.test(ctx.body) ? undefined : "yellow",
    );
  }

  if (human.test(ctx.body) && !mitigation.test(ctx.body)) {
    return result(
      "ethics",
      58,
      ["有受试者，但没写知情同意、自愿退出或匿名。"],
      ["这通常是黄灯：不一定做不成，导师会先问这句。"],
      "yellow",
    );
  }

  if (human.test(ctx.body)) {
    return result("ethics", 84, ["受试者相关的同意或匿名写到了。"], []);
  }

  return result(
    "ethics",
    86,
    ["没有发现受试者或敏感数据信号。"],
    ["若后来加入访谈或可识别账号，再补同意和保存期限。"],
  );
}

function scoreScope(ctx: ScoreContext): DimensionResult {
  let score = 62;
  const leads: string[] = [];
  const evidence: string[] = [];
  const linkers = matchedTerms(ctx.body, /同时|以及|并且|也可以|最好能|另外/);
  const ambition = matchedTerms(ctx.body, /全国|跨省|多中心|多年追踪|医院推广|小程序|开发一个|政策建议/);

  if (linkers.length >= 2) {
    score -= 18;
    leads.push("连接词叠在一起，读起来像好几项研究绑在一份开题里。");
  } else if (linkers.length === 0) {
    score += 4;
  }

  if (ambition.length >= 3) {
    score -= 24;
    leads.push(`野心词包括${ambition.join("、")}，超出一次开题的时间盒。`);
  } else if (ambition.length === 2) {
    score -= 12;
    leads.push(`同时碰到${ambition.join("和")}，范围要主动砍。`);
  } else if (ambition.length === 1) {
    score -= 4;
  }

  if (/一所|只使用|只讨论|不做因果|八周|一学期|单人|本校/.test(ctx.body)) {
    score += 16;
    evidence.push("写了地点、期限或「只做什么」。");
  }

  let force: Light | undefined;
  if (/两周|一周|三天/.test(ctx.body) && ambition.length >= 1) {
    force = "red";
    leads.unshift("一票红灯：只留了一两周，任务里却有铺开、开发或推广。");
  }

  if (!leads.length && !force) {
    leads.push(score >= 72 ? "范围收得住，时间盒也写了。" : "范围还要再砍一刀，才能放进一个学期。");
  }

  return result("scope", score, leads, evidence, force);
}

function scoreReferences(stats: ReferenceStats, currentYear: number): DimensionResult {
  if (stats.count === 0) {
    return result(
      "references",
      10,
      ["一票红灯：没有参考文献。"],
      ["开题至少要能拿出近五年的直接竞争文献。"],
      "red",
    );
  }

  if (stats.count < 3) {
    const yearNote = stats.newestYear ? `能识别的最新年份是 ${stats.newestYear} 年。` : "没有识别出年份。";
    return result(
      "references",
      28,
      [`一票红灯：只有 ${stats.count} 条文献，撑不起缺口。`],
      [yearNote],
      "red",
    );
  }

  let score = 50;
  const leads: string[] = [];
  const evidence = [
    `识别到 ${stats.count} 条，其中 ${stats.datedCount} 条有年份。`,
    stats.newestYear
      ? `年份从 ${stats.oldestYear} 到 ${stats.newestYear}，近五年 ${stats.recentCount} 条。`
      : "这些条目里没有识别出四位年份。",
  ];

  if (stats.missingYearRatio > 0.5) {
    score -= 16;
    leads.push("超过一半的条目没有年份，无法判断新旧。");
  } else {
    score += 8;
  }

  if (stats.recentCount >= 2 && stats.recentRatio >= 0.3) {
    score += 16;
    leads.push("近五年文献够用，能拿来对比，而不是只引用教科书。");
  } else if (stats.newestYear && stats.newestYear < currentYear - 8) {
    score -= 20;
    leads.push(`最新文献停在 ${stats.newestYear} 年，很难说明这个问题今天还成立。`);
  } else {
    score -= 6;
    leads.push("近年文献偏少。");
  }

  if (stats.count >= 5) score += 8;

  const hasClassic = (stats.oldestYear ?? currentYear) <= currentYear - 10;
  if (hasClassic && stats.recentCount >= 2) {
    score += 6;
    evidence.push("既有较早的奠基文献，也有近五年的工作。");
  }

  let force: Light | undefined;
  if (stats.recentCount === 0 && stats.newestYear !== null && stats.newestYear < currentYear - 12) {
    force = "red";
    leads.unshift("一票红灯：文献全部过旧。");
  }

  return result("references", score, leads, evidence, force);
}

export function scoreProposal(input: ProposalInput, currentYear = CURRENT_YEAR): ScoreContext & { dimensions: DimensionResult[] } {
  const question = input.question ?? "";
  const abstract = input.abstract ?? "";
  const body = normalize(`${question}\n${abstract}`);
  const references = parseReferences(input.references ?? "", currentYear);
  const stats = referenceStats(references, currentYear);
  const ctx: ScoreContext = {
    question,
    abstract,
    body,
    intent: detectIntent(body),
    methods: detectMethods(body),
    references,
    stats,
  };

  const dimensions = [
    scoreClarity(ctx),
    scoreNovelty(ctx),
    scoreFeasibility(ctx),
    scoreMethod(ctx),
    scoreData(ctx),
    scoreEthics(ctx),
    scoreScope(ctx),
    scoreReferences(stats, currentYear),
  ];

  return { ...ctx, dimensions };
}
