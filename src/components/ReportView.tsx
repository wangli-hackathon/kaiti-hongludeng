import { DAY_LABELS, LIGHT_LABEL, RULE_BRIEFS, type Analysis, type ProposalInput } from "../engine/types.ts";
import type { LlmEnrichment } from "../llm.ts";

interface ReportViewProps {
  analysis: Analysis | null;
  input: ProposalInput | null;
  enrichment: LlmEnrichment | null;
  llmError: string | null;
  llmBusy: boolean;
  hasKey: boolean;
  stale: boolean;
  copied: boolean;
  onCopy: () => void;
  onPrint: () => void;
  onEnrich: () => void;
}

function count(analysis: Analysis, light: Analysis["overall"]): number {
  return analysis.dimensions.filter((item) => item.light === light).length;
}

export function ReportView({
  analysis,
  input,
  enrichment,
  llmError,
  llmBusy,
  hasKey,
  stale,
  copied,
  onCopy,
  onPrint,
  onEnrich,
}: ReportViewProps) {
  if (!analysis || !input) {
    return (
      <section className="card" id="report" aria-labelledby="empty-title">
        <h2 id="empty-title">先看一份卷宗，或贴上你自己的</h2>
        <p className="hint" style={{ marginTop: 8 }}>
          八项灯色都在这台浏览器里算完。没有服务器，未配置模型时草稿不会上传。
        </p>
        <div className="empty-grid">
          {RULE_BRIEFS.map((rule) => (
            <article key={rule.id}>
              <h3>{rule.title}</h3>
              <p>{rule.body}</p>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="card" id="report" aria-live="polite">
      <div className={`verdict ${analysis.overall}`}>
        <div className={`housing ${analysis.overall}`} aria-hidden="true">
          <span className={`bulb ${analysis.overall === "green" ? "lit-green" : ""}`} />
          <span className={`bulb ${analysis.overall === "yellow" ? "lit-amber" : ""}`} />
          <span className={`bulb ${analysis.overall === "red" ? "lit-red" : ""}`} />
        </div>
        <div>
          <p className="kicker">总判 · {LIGHT_LABEL[analysis.overall]}</p>
          <h2>{analysis.headline}</h2>
          <p className="summary">{analysis.summary}</p>
        </div>
      </div>

      <div className="section-gap">
        {stale ? <p className="banner">草稿已经改过，下面仍是上一版。重新生成后灯色才会跟着变。</p> : null}
        <div className="counts">
          <span className="pill green">绿 {count(analysis, "green")}</span>
          <span className="pill yellow">黄 {count(analysis, "yellow")}</span>
          <span className="pill red">红 {count(analysis, "red")}</span>
          <span className="pill">文献 {analysis.meta.referenceCount} 条 · 近五年 {analysis.meta.recentReferenceCount}</span>
        </div>
        <p className="meta">
          规则引擎 v{analysis.meta.version} · 以 {analysis.meta.currentYear} 年判断文献新旧 · 问题 {analysis.meta.questionChars} 字 · 摘要{" "}
          {analysis.meta.abstractChars} 字
        </p>
        <div className="actions no-print">
          <button type="button" className="btn" onClick={onCopy}>
            {copied ? "已复制 Markdown" : "复制 Markdown"}
          </button>
          <button type="button" className="btn secondary" onClick={onPrint}>
            打印 / 导出 PDF
          </button>
          <button type="button" className="btn ghost" onClick={onEnrich} disabled={llmBusy || !hasKey}>
            {llmBusy ? "正在请模型补写…" : "让模型把评语写尖一点"}
          </button>
        </div>
        {!hasKey ? <p className="hint">未配置模型。上面的灯、反问和七天计划已经完整，不依赖密钥。</p> : null}
        {llmError ? <p className="banner error">{llmError}</p> : null}
        {enrichment?.advisorNote ? (
          <div className="callout">
            <strong>模型补写 · 灯色未改</strong>
            <p>{enrichment.advisorNote}</p>
          </div>
        ) : null}
      </div>

      <div className="section-gap">
        <h2 className="panel-title">八项清单</h2>
        {analysis.dimensions.map((item) => (
          <article key={item.id} className="dim">
            <span className={`lamp ${item.light}`} aria-hidden="true" />
            <div>
              <div className="dim-head">
                <h3>{item.title}</h3>
                <span className={`tag ${item.light}`}>{LIGHT_LABEL[item.light]}</span>
              </div>
              <p className="reason">{item.reason}</p>
              {item.signals.some((signal) => !item.reason.includes(signal)) ? (
                <ul className="signals">
                  {item.signals
                    .filter((signal) => !item.reason.includes(signal))
                    .map((signal) => (
                      <li key={signal}>{signal}</li>
                    ))}
                </ul>
              ) : null}
              {enrichment?.reasons[item.id] ? <p className="model-note">模型补写：{enrichment.reasons[item.id]}</p> : null}
            </div>
          </article>
        ))}
      </div>

      <div className="section-gap">
        <h2 className="panel-title">导师会问的五句</h2>
        <ol className="q-list">
          {analysis.questions.map((item, index) => (
            <li key={item.id}>
              <span className="index">{index + 1}</span>
              <div>
                <p>{item.question}</p>
                <p className="why">针对{item.targetTitle}。{item.why}</p>
              </div>
            </li>
          ))}
        </ol>
        {enrichment?.questions ? (
          <div className="callout">
            <strong>模型改写的五句</strong>
            <ol className="q-list" style={{ marginTop: 8 }}>
              {enrichment.questions.map((question, index) => (
                <li key={question}>
                  <span className="index">{index + 1}</span>
                  <p>{question}</p>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>

      <div className="section-gap">
        <h2 className="panel-title">接下来七天，每天一件事</h2>
        <ol className="days">
          {analysis.plan.map((item) => (
            <li key={item.day}>
              <span className="index">{DAY_LABELS[item.day - 1]}</span>
              <div>
                <h3>第{DAY_LABELS[item.day - 1]}天 · {item.title}</h3>
                <p>{item.task}</p>
                <p className="done">完成标准：{item.doneWhen}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="section-gap">
        <h2 className="panel-title">这份草稿</h2>
        <article>
          <h3>研究问题</h3>
          <p className="reason">{input.question.trim() || "（空）"}</p>
          <h3>摘要</h3>
          <p className="reason">{input.abstract.trim() || "（空）"}</p>
          <h3>参考文献</h3>
          <p className="reason" style={{ whiteSpace: "pre-wrap" }}>{input.references.trim() || "（空）"}</p>
        </article>
        <p className="meta">打印时选择「另存为 PDF」。复制出去的 Markdown 只含规则版报告，不含密钥。</p>
      </div>
    </section>
  );
}
