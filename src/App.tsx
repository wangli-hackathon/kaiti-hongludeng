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
      <header className="wrap topbar">
        <div>
          <div className="brand">
            <div className="housing" aria-hidden="true">
              <span className="bulb lit-green" />
              <span className="bulb lit-amber" />
              <span className="bulb lit-red" />
            </div>
            <div>
              <p className="eyebrow">StudyHack · 开题自查</p>
              <h1>开题红绿灯</h1>
            </div>
          </div>
          <p className="pitch">
            把研究问题、摘要和文献贴进来。八个维度打成绿、黄、红，附上导师会问的五句话，和一份只干七件事的行动单。
          </p>
        </div>
        <div className="top-actions no-print">
          <button type="button" className="btn ghost" onClick={() => setRulesOpen(true)}>灯怎么打</button>
          <button type="button" className="btn secondary" onClick={() => setSettingsOpen(true)}>
            {hasKey ? "模型已配置" : "模型设置"}
          </button>
        </div>
      </header>

      <main className="wrap layout">
        <div className="stack no-print">
          <section className="card" aria-labelledby="sample-title">
            <h2 id="sample-title">三份示例卷宗</h2>
            <p className="hint" style={{ margin: "6px 0 10px" }}>不同学科，灯色不一样。载入会覆盖当前草稿。</p>
            <div className="samples">
              {SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  className={activeSample === sample.id ? "sample active" : "sample"}
                  onClick={() =>
                    publish(
                      { question: sample.question, abstract: sample.abstract, references: sample.references },
                      sample.id,
                    )
                  }
                >
                  <strong>{sample.discipline} · {sample.title}</strong>
                  <span>{sample.blurb}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card" aria-labelledby="draft-title">
            <h2 id="draft-title">你的草稿</h2>
            <div className="field" style={{ marginTop: 12 }}>
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
            <div className="field" style={{ marginTop: 12 }}>
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
            <div className="field" style={{ marginTop: 12 }}>
              <div className="field-label">
                <label htmlFor="references">参考文献（可选）</label>
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
            {formError ? <p className="banner" style={{ marginTop: 12 }}>{formError}</p> : null}
            <div className="actions" style={{ marginTop: 14 }}>
              <button type="button" className="btn" onClick={() => publish(draft, activeSample)}>
                {analysis ? "重新生成自查报告" : "生成自查报告"}
              </button>
              <span className="hint">Ctrl 或 ⌘ + Enter</span>
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
