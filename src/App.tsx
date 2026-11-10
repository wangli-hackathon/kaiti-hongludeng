import { useCallback, useEffect, useMemo, useState } from "react";
import { analyzeProposal } from "./engine/analyze.ts";
import { parseReferences } from "./engine/references.ts";
import { toMarkdown } from "./engine/report.ts";
import { charCount } from "./engine/text.ts";
import type { Analysis, ProposalInput } from "./engine/types.ts";
import { enrichWithLlm, loadSettings, type LlmEnrichment } from "./llm.ts";
import { SAMPLES } from "./samples.ts";
import { ReportView } from "./components/ReportView.tsx";
import { RulesDialog } from "./components/RulesDialog.tsx";
import { SettingsDialog } from "./components/SettingsDialog.tsx";
import { ArrowIcon, BookIcon, GearIcon, Logo, ShieldIcon } from "./components/Icons.tsx";

const sampleLights: Record<string, Analysis["overall"]> = Object.fromEntries(
  SAMPLES.map((sample) => [
    sample.id,
    analyzeProposal({ question: sample.question, abstract: sample.abstract, references: sample.references }).overall,
  ]),
);

function sameInput(left: ProposalInput | null, right: ProposalInput): boolean {
  return Boolean(left && left.question === right.question && left.abstract === right.abstract && left.references === right.references);
}

export default function App() {
  const [question, setQuestion] = useState("");
  const [abstractText, setAbstractText] = useState("");
  const [references, setReferences] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [snapshot, setSnapshot] = useState<ProposalInput | null>(null);
  const [activeSample, setActiveSample] = useState<string | null>(null);
  const [enrichment, setEnrichment] = useState<LlmEnrichment | null>(null);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [llmBusy, setLlmBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasKey, setHasKey] = useState(() => Boolean(loadSettings().apiKey.trim()));
  const [formError, setFormError] = useState<string | null>(null);

  const draft = useMemo<ProposalInput>(
    () => ({ question, abstract: abstractText, references }),
    [question, abstractText, references],
  );
  const referenceCount = useMemo(() => parseReferences(references).length, [references]);

  function refreshKey() {
    setHasKey(Boolean(loadSettings().apiKey.trim()));
  }

  const publish = useCallback((input: ProposalInput, sampleId: string | null) => {
    const result = analyzeProposal(input);
    setQuestion(input.question);
    setAbstractText(input.abstract);
    setReferences(input.references);
    setAnalysis(result);
    setSnapshot(input);
    setActiveSample(sampleId);
    setEnrichment(null);
    setLlmError(null);
    setCopied(false);
    setFormError(
      input.question.trim() || input.abstract.trim()
        ? null
        : "问题和摘要都是空的。下面仍给出红灯底线，方便你看规则怎么处理缺失。",
    );
    window.setTimeout(() => {
      if (window.matchMedia("(max-width: 960px)").matches) {
        document.getElementById("report")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 30);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        publish(draft, null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft, publish]);

  async function copyReport() {
    if (!analysis || !snapshot) return;
    const markdown = toMarkdown(analysis, snapshot);
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      const area = document.createElement("textarea");
      area.value = markdown;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function enrich() {
    if (!analysis || !snapshot) return;
    setLlmBusy(true);
    setLlmError(null);
    try {
      const result = await enrichWithLlm(loadSettings(), snapshot, analysis);
      setEnrichment(result);
    } catch (caught) {
      setLlmError(caught instanceof Error ? caught.message : "模型请求失败。规则报告仍然有效。");
    } finally {
      setLlmBusy(false);
    }
  }

  return (
    <>
      <nav className="nav no-print" aria-label="站点">
        <div className="wrap nav-inner">
          <div className="nav-brand">
            <Logo size={30} />
            <span className="nav-name">开题红绿灯</span>
            <span className="nav-tag">StudyHack</span>
          </div>
          <div className="nav-actions">
            <button type="button" className="btn ghost sm" onClick={() => setRulesOpen(true)}>
              <BookIcon size={15} />
              灯怎么打
            </button>
            <button type="button" className={hasKey ? "btn ghost sm configured" : "btn ghost sm"} onClick={() => setSettingsOpen(true)}>
              <GearIcon size={15} />
              {hasKey ? "模型已配置" : "模型设置"}
            </button>
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="wrap hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">
              <ShieldIcon size={14} />
              开题自查 · 规则引擎在本机运行
            </p>
            <h1>
              见导师之前，
              <br />
              先给开题<span className="accent-text">过一遍灯</span>
            </h1>
            <p className="pitch">
              把研究问题、摘要和文献贴进来。八个维度打成绿、黄、红，附上导师会问的五句话，和一份只干七件事的行动单。
            </p>
          </div>
          <dl className="hero-stats">
            <div>
              <dt>8</dt>
              <dd>项维度体检</dd>
            </div>
            <div>
              <dt>5</dt>
              <dd>句导师反问</dd>
            </div>
            <div>
              <dt>7</dt>
              <dd>天行动清单</dd>
            </div>
          </dl>
        </div>
      </header>

      <main className="wrap layout">
        <div className="stack no-print">
          <section className="card" aria-labelledby="sample-title">
            <div className="card-head">
              <h2 id="sample-title">示例卷宗</h2>
              <span className="meta">载入会覆盖当前草稿</span>
            </div>
            <div className="samples">
              {SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  className={activeSample === sample.id ? "sample active" : "sample"}
                  aria-pressed={activeSample === sample.id}
                  onClick={() =>
                    publish(
                      { question: sample.question, abstract: sample.abstract, references: sample.references },
                      sample.id,
                    )
                  }
                >
                  <span className={`sample-dot ${sampleLights[sample.id]}`} aria-hidden="true" />
                  <span className="sample-text">
                    <span className="sample-kicker">{sample.discipline}</span>
                    <strong>{sample.title}</strong>
                    <span className="sample-blurb">{sample.blurb}</span>
                  </span>
                  <ArrowIcon size={16} className="sample-arrow" />
                </button>
              ))}
            </div>
          </section>

          <section className="card" aria-labelledby="draft-title">
            <div className="card-head">
              <h2 id="draft-title">你的草稿</h2>
              <span className="meta">不上传服务器</span>
            </div>
            <div className="field">
              <div className="field-label">
                <label htmlFor="question">研究问题</label>
                <span className="meta">{charCount(question)} 字</span>
              </div>
              <textarea
                id="question"
                className="question-box"
                value={question}
                placeholder="例如：在一所高校里，短视频使用时长与深度学习投入是否相关？"
                onChange={(event) => {
                  setQuestion(event.target.value);
                  setActiveSample(null);
                }}
              />
            </div>
            <div className="field">
              <div className="field-label">
                <label htmlFor="abstract">摘要</label>
                <span className="meta">{charCount(abstractText)} 字</span>
              </div>
              <textarea
                id="abstract"
                className="abstract-box"
                value={abstractText}
                placeholder="写清对象、已有研究缺了什么、你准备怎么做、明确不做什么。"
                onChange={(event) => {
                  setAbstractText(event.target.value);
                  setActiveSample(null);
                }}
              />
            </div>
            <div className="field">
              <div className="field-label">
                <label htmlFor="references">参考文献<span className="optional">可选</span></label>
                <span className="meta">{referenceCount} 条</span>
              </div>
              <textarea
                id="references"
                className="refs-box"
                value={references}
                placeholder={"一条一行，尽量带年份。\n张三. 题目[J]. 期刊, 2024."}
                onChange={(event) => {
                  setReferences(event.target.value);
                  setActiveSample(null);
                }}
              />
            </div>
            {formError ? <p className="banner">{formError}</p> : null}
            <div className="submit-row">
              <button type="button" className="btn primary block" onClick={() => publish(draft, activeSample)}>
                {analysis ? "重新生成自查报告" : "生成自查报告"}
                <ArrowIcon size={16} />
              </button>
              <span className="kbd-hint"><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>Enter</kbd></span>
            </div>
          </section>
        </div>

        <ReportView
          analysis={analysis}
          input={snapshot}
          enrichment={enrichment}
          llmError={llmError}
          llmBusy={llmBusy}
          hasKey={hasKey}
          stale={Boolean(analysis && !sameInput(snapshot, draft))}
          copied={copied}
          onCopy={() => void copyReport()}
          onPrint={() => window.print()}
          onEnrich={() => void enrich()}
        />
      </main>

      <footer className="wrap footer no-print">
        <Logo size={18} />
        自查工具，不能代替导师。规则在浏览器里运行；只有你在设置里填写并点击模型补写时，草稿才会发到那个接口。
      </footer>
      <p className="sr-only" aria-live="polite">
        {analysis ? `自查完成，总判${analysis.overall === "green" ? "绿灯" : analysis.overall === "yellow" ? "黄灯" : "红灯"}` : ""}
      </p>
      <SettingsDialog
        open={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          refreshKey();
        }}
      />
      <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </>
  );
}
