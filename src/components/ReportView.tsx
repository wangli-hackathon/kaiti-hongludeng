import { DAY_LABELS, LIGHT_LABEL, RULE_BRIEFS, type Analysis, type ProposalInput } from "../engine/types.ts";
import type { LlmEnrichment } from "../llm.ts";
import { CheckIcon, CopyIcon, LightIcon, PrintIcon, SparkIcon } from "./Icons.tsx";

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

const RING_R = 50;
const RING_C = 2 * Math.PI * RING_R;
const RING_GAP = 5;

function LightRing({ analysis }: { analysis: Analysis }) {
  const total = analysis.dimensions.length;
  const seg = RING_C / total;
  const greens = count(analysis, "green");
  return (
    <div
      className={`ring ${analysis.overall}`}
      role="img"
      aria-label={`八项中 ${greens} 项绿灯，总判${LIGHT_LABEL[analysis.overall]}`}
    >
      <svg viewBox="0 0 120 120" width="136" height="136" aria-hidden="true">
        <circle className="ring-track" cx="60" cy="60" r={RING_R} />
        {analysis.dimensions.map((item, index) => (
          <circle
            key={item.id}
            className={`ring-seg ${item.light}`}
            cx="60"
            cy="60"
            r={RING_R}
            strokeDasharray={`${seg - RING_GAP} ${RING_C - seg + RING_GAP}`}
            strokeDashoffset={-index * seg}
            transform="rotate(-90 60 60)"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <title>{`${item.title} · ${LIGHT_LABEL[item.light]}`}</title>
          </circle>
        ))}
      </svg>
      <div className="ring-label">
        <strong>
          {greens}
          <small>/{total}</small>
        </strong>
        <span>项绿灯</span>
      </div>
    </div>
  );
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
      <section className="card empty" id="report" aria-labelledby="empty-title">
        <div className="card-head">
          <div>
            <h2 id="empty-title">八个维度，逐项亮灯</h2>
            <p className="hint">选左边一份示例，或贴上你自己的草稿。所有灯色都在这台浏览器里算完。</p>
          </div>
        </div>
        <div className="legend" aria-label="灯色含义">
          <span className="chip green"><LightIcon light="green" size={13} />绿灯 · 可以去谈</span>
          <span className="chip yellow"><LightIcon light="yellow" size={13} />黄灯 · 会被追问</span>
          <span className="chip red"><LightIcon light="red" size={13} />红灯 · 先补再谈</span>
        </div>
        <div className="empty-grid">
          {RULE_BRIEFS.map((rule, index) => (
            <article key={rule.id}>
              <span className="empty-index">{String(index + 1).padStart(2, "0")}</span>
              <h3>{rule.title}</h3>
              <p>{rule.body}</p>
            </article>
          ))}
        </div>
      </section>
    );
  }

  const total = analysis.dimensions.length;

  return (
    <section className="report" id="report" aria-live="polite">
      <div className={`card report-card verdict ${analysis.overall}`}>
        <div className="verdict-top">
          <LightRing analysis={analysis} />
          <div className="verdict-copy">
            <span className={`chip lg ${analysis.overall}`}>
              <LightIcon light={analysis.overall} size={15} />
              总判 · {LIGHT_LABEL[analysis.overall]}
            </span>
            <h2>{analysis.headline}</h2>
            <p className="summary">{analysis.summary}</p>
          </div>
        </div>

        <div className="tally" aria-label="灯色分布">
          <div className="tally-bar" aria-hidden="true">
            {(["green", "yellow", "red"] as const).map((light) =>
              count(analysis, light) ? (
                <span key={light} className={light} style={{ flexGrow: count(analysis, light) }} />
              ) : null,
            )}
          </div>
          <div className="tally-legend">
            <span><i className="dot green" />绿灯 {count(analysis, "green")}</span>
            <span><i className="dot yellow" />黄灯 {count(analysis, "yellow")}</span>
            <span><i className="dot red" />红灯 {count(analysis, "red")}</span>
            <span className="tally-sep">共 {total} 项</span>
            <span>文献 {analysis.meta.referenceCount} 条 · 近五年 {analysis.meta.recentReferenceCount}</span>
          </div>
        </div>

        {stale ? <p className="banner">草稿已经改过，下面仍是上一版。重新生成后灯色才会跟着变。</p> : null}

        <div className="verdict-foot">
          <div className="actions no-print">
            <button type="button" className="btn primary" onClick={onCopy}>
              <CopyIcon size={15} />
              {copied ? "已复制 Markdown" : "复制 Markdown"}
            </button>
            <button type="button" className="btn ghost" onClick={onPrint}>
              <PrintIcon size={15} />
              打印 / 导出 PDF
            </button>
            <button type="button" className="btn ghost" onClick={onEnrich} disabled={llmBusy || !hasKey}>
              <SparkIcon size={15} />
              {llmBusy ? "正在请模型补写…" : "让模型把评语写尖一点"}
            </button>
          </div>
          <p className="meta">
            规则引擎 v{analysis.meta.version} · 以 {analysis.meta.currentYear} 年判断文献新旧 · 问题 {analysis.meta.questionChars} 字 · 摘要{" "}
            {analysis.meta.abstractChars} 字
          </p>
        </div>
        {!hasKey ? <p className="hint no-print">未配置模型。上面的灯、反问和七天计划已经完整，不依赖密钥。</p> : null}
        {llmError ? <p className="banner error">{llmError}</p> : null}
        {enrichment?.advisorNote ? (
          <div className="callout">
            <strong>模型补写 · 灯色未改</strong>
            <p>{enrichment.advisorNote}</p>
          </div>
        ) : null}
      </div>

      <div className="card report-card" style={{ animationDelay: "60ms" }}>
        <div className="card-head">
          <h2 className="panel-title">八项清单</h2>
          <span className="meta">条形为该项规则得分</span>
        </div>
        <div className="dim-grid">
          {analysis.dimensions.map((item) => (
            <article key={item.id} className={`dim ${item.light}`}>
              <div className="dim-head">
                <h3>{item.title}</h3>
                <span className={`chip ${item.light}`}>
                  <LightIcon light={item.light} size={13} />
                  {LIGHT_LABEL[item.light]}
                </span>
              </div>
              <div className="meter" aria-label={`得分 ${item.score}`}>
                <span className={item.light} style={{ width: `${item.score}%` }} />
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
            </article>
          ))}
        </div>
      </div>

      <div className="card report-card" style={{ animationDelay: "120ms" }}>
        <div className="card-head">
          <h2 className="panel-title">导师会问的五句</h2>
          <span className="meta">先自己答一遍</span>
        </div>
        <ol className="q-list">
          {analysis.questions.map((item, index) => (
            <li key={item.id}>
              <span className="index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p>{item.question}</p>
                <p className="why"><span className="why-tag">{item.targetTitle}</span>{item.why}</p>
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
                  <span className="index">{String(index + 1).padStart(2, "0")}</span>
                  <p>{question}</p>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>

      <div className="card report-card" style={{ animationDelay: "160ms" }}>
        <div className="card-head">
          <h2 className="panel-title">接下来七天，每天一件事</h2>
          <span className="meta">按红灯优先排序</span>
        </div>
        <ol className="days">
          {analysis.plan.map((item) => (
            <li key={item.day}>
              <span className="day-badge">
                <small>Day</small>
                {item.day}
              </span>
              <div>
                <h3><span className="day-cn">第{DAY_LABELS[item.day - 1]}天</span>{item.title}</h3>
                <p>{item.task}</p>
                <p className="done"><CheckIcon size={14} />完成标准：{item.doneWhen}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="card report-card draft-card" style={{ animationDelay: "200ms" }}>
        <div className="card-head">
          <h2 className="panel-title">这份草稿</h2>
        </div>
        <article className="draft-body">
          <h3>研究问题</h3>
          <p className="reason">{input.question.trim() || "（空）"}</p>
          <h3>摘要</h3>
          <p className="reason">{input.abstract.trim() || "（空）"}</p>
          <h3>参考文献</h3>
          <p className="reason" style={{ whiteSpace: "pre-wrap" }}>{input.references.trim() || "（空）"}</p>
        </article>
        <p className="meta print-note">打印时选择「另存为 PDF」。复制出去的 Markdown 只含规则版报告，不含密钥。</p>
      </div>
    </section>
  );
}
