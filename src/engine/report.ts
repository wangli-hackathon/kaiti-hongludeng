import { quoteBlock } from "./text.ts";
import { DAY_LABELS, LIGHT_LABEL, type Analysis, type ProposalInput } from "./types.ts";

export function toMarkdown(analysis: Analysis, input: ProposalInput): string {
  const dimensionBlocks = analysis.dimensions
    .map((item) => {
      const signals = item.signals.map((signal) => `- ${signal}`).join("\n");
      return `### ${item.title} · ${LIGHT_LABEL[item.light]}\n\n${item.reason}\n\n依据：\n\n${signals}`;
    })
    .join("\n\n");

  const questions = analysis.questions
    .map(
      (item, index) =>
        `${index + 1}. ${item.question}\n   - 针对：${item.targetTitle}\n   - 为什么问：${item.why}`,
    )
    .join("\n");

  const plan = analysis.plan
    .map(
      (item) =>
        `### 第${DAY_LABELS[item.day - 1]}天 · ${item.title}\n\n${item.task}\n\n完成标准：${item.doneWhen}`,
    )
    .join("\n\n");

  return `# 开题自查报告

- 总体：${LIGHT_LABEL[analysis.overall]}
- 引擎：规则引擎 v${analysis.meta.version}（离线，灯色不由大模型改写）
- 文献年份基准：${analysis.meta.currentYear}

## 草稿

### 研究问题

${quoteBlock(input.question)}

### 摘要

${quoteBlock(input.abstract)}

### 参考文献

${quoteBlock(input.references)}

## 总判

${analysis.headline}

${analysis.summary}

## 八项红绿灯

${dimensionBlocks}

## 导师反问

${questions}

## 七天行动

${plan}

## 说明

本报告由浏览器内的规则引擎生成。它是开题自查，不是评审结论，也不能代替导师。未配置模型时，文本不会离开这台设备。
`;
}
