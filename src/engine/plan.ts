import { snippet } from "./text.ts";
import type { DayPlan, DimensionResult, ProposalInput, ReferenceStats } from "./types.ts";

function lightOf(dimensions: DimensionResult[], id: DimensionResult["id"]) {
  return dimensions.find((item) => item.id === id)?.light ?? "yellow";
}

export function buildPlan(input: ProposalInput, dimensions: DimensionResult[], stats: ReferenceStats): DayPlan[] {
  const topic = snippet(input.question, 24);
  const quoted = topic ? `「${topic}」` : "当前这句问题";
  const clarity = lightOf(dimensions, "clarity");
  const method = lightOf(dimensions, "methodFit");
  const data = lightOf(dimensions, "data");
  const ethics = lightOf(dimensions, "ethics");
  const scope = lightOf(dimensions, "scope");

  return [
    {
      day: 1,
      title: "把问题收成一句",
      task:
        clarity === "green"
          ? `把${quoted}抄到纸上，标出对象、范围、关系和你不声称的部分。多余的从句删掉。`
          : `不要沿用现在的问法。重写一句：谁、在哪、看什么、不看什么。写完读出来，让另一位同学复述${quoted}。`,
      doneWhen: "纸上只剩一个问号，对方能复述对象和结果。",
    },
    {
      day: 2,
      title: "对准最接近的一篇",
      task:
        stats.recentCount >= 2
          ? "从近五年文献里挑 5 篇做成表：对象、数据、方法、结论、和你的差别。差别写不出的那篇，不能用来支撑新颖性。"
          : "用中英文关键词各检索一次近五年文献，把检索式存下来。精读 5 篇，每篇只记「它已经回答了什么」。",
      doneWhen: "有一张 5 行对照表，并且写得出最接近的一篇标题。",
    },
    {
      day: 3,
      title: "让方法和问题用同一个动词",
      task:
        method === "green"
          ? "把问题里的动词和方法段的动词对齐。列两栏：可以说的结论，不能说的结论。"
          : "问题和证据现在不是同一个主张。改其中一边：要么把因果动词改成相关，要么补上能识别因果或完成评估的设计。只改摘要里的动词也算完成。",
      doneWhen: "摘要里的动词，方法段能原样接住。",
    },
    {
      day: 4,
      title: "确认第一批数据拿得到",
      task:
        data === "red"
          ? "写下数据名称。若是病历或内部数据，写批准人；写不出，今天就改成公开数据或自采小样本，并回头改问题。"
          : "写下来源、数量、拿到第一批的日期，以及拿不到时的备选数据。",
      doneWhen: "来源、数量、日期、备选，四行都有字。",
    },
    {
      day: 5,
      title: "把伦理写成三句",
      task:
        ethics === "red"
          ? "先写知情同意、退出权和数据保存期限。写不出，就不要联系受试者，也不要申请病历。"
          : ethics === "yellow"
            ? "补三句：如何告知、能否退出、数据存多久以及谁能看。放进摘要末尾。"
            : "检查会不会接触可识别的人。若会，补匿名规则；若不会，写明只使用哪些公开字段。",
      doneWhen: "另一个人只看这三句，能说出对方如何退出。",
    },
    {
      day: 6,
      title: "砍到一项交付",
      task:
        scope === "red"
          ? "把摘要里要做的事逐条列出，只留一件八周内能交的。删掉的写进不做清单。"
          : "写八周日程，每周一个交付物：检索式、对照表、编码手册或问卷初稿、试做、一页正文。超出来的删掉。",
      doneWhen: "不做清单至少三行，留下的那件事八周内交得出。",
    },
    {
      day: 7,
      title: "用反问预演一遍",
      task: "把五条反问各写四句回答，连同改过的问题、文献对照和能说的结论，合成一页纸。只带这一页去找导师。",
      doneWhen: "这一页能独立阅读：一句问题、一张文献对照、能说和不能说的结论、数据来源、伦理三句。",
    },
  ];
}
