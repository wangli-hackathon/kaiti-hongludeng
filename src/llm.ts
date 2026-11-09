import { DIMENSION_ORDER, LIGHT_LABEL, type Analysis, type DimensionId, type ProposalInput } from "./engine/types.ts";

export const LLM_STORAGE_KEY = "kaiti-hongludeng-llm-v1";

export interface LlmSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface LlmEnrichment {
  advisorNote: string;
  reasons: Partial<Record<DimensionId, string>>;
  questions: string[] | null;
}

const EMPTY_SETTINGS: LlmSettings = {
  baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  apiKey: "",
  model: "qwen-plus",
};

export function defaultSettings(): LlmSettings {
  return { ...EMPTY_SETTINGS };
}

export function loadSettings(): LlmSettings {
  if (typeof localStorage === "undefined") return defaultSettings();
  try {
    const raw = localStorage.getItem(LLM_STORAGE_KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw) as Partial<LlmSettings>;
    return {
      baseUrl: typeof parsed.baseUrl === "string" && parsed.baseUrl.trim() ? parsed.baseUrl : EMPTY_SETTINGS.baseUrl,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      model: typeof parsed.model === "string" && parsed.model.trim() ? parsed.model : EMPTY_SETTINGS.model,
    };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings: LlmSettings): void {
  localStorage.setItem(
    LLM_STORAGE_KEY,
    JSON.stringify({
      baseUrl: settings.baseUrl.trim(),
      apiKey: settings.apiKey.trim(),
      model: settings.model.trim(),
    }),
  );
}

export function clearSettings(): void {
  localStorage.removeItem(LLM_STORAGE_KEY);
}

export function chatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("接口地址需要以 http:// 或 https:// 开头。");
  }
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  return `${trimmed}/chat/completions`;
}

function clip(value: string, max: number): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length <= max ? compact : `${compact.slice(0, max)}…`;
}

function stripKey(text: string, apiKey: string): string {
  if (!apiKey) return text;
  return text.split(apiKey).join("［密钥］");
}

export function parseEnrichmentPayload(text: string): LlmEnrichment {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("模型没有返回 JSON。规则版反问仍然有效。");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    throw new Error("模型返回的 JSON 无法解析。规则版反问仍然有效。");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("模型返回的不是对象。规则版反问仍然有效。");
  }
  const record = parsed as Record<string, unknown>;
  const advisorNote = typeof record.advisorNote === "string" ? clip(record.advisorNote, 400) : "";
  const reasons: Partial<Record<DimensionId, string>> = {};
  if (record.reasons && typeof record.reasons === "object") {
    const bag = record.reasons as Record<string, unknown>;
    for (const id of DIMENSION_ORDER) {
      const value = bag[id];
      if (typeof value === "string" && value.trim()) reasons[id] = clip(value, 280);
    }
  }
  let questions: string[] | null = null;
  if (Array.isArray(record.questions)) {
    const cleaned = record.questions
      .filter((item): item is string => typeof item === "string")
      .map((item) => clip(item, 240))
      .filter(Boolean);
    if (cleaned.length === 5) questions = cleaned;
  }
  if (!advisorNote && !questions && Object.keys(reasons).length === 0) {
    throw new Error("模型没有给出可用的评语。规则版结果仍然有效。");
  }
  return { advisorNote, reasons, questions };
}

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

async function postChat(settings: LlmSettings, messages: ChatMessage[], maxTokens: number): Promise<string> {
  const apiKey = settings.apiKey.trim();
  if (!apiKey) throw new Error("还没有填写 API 密钥。不填也能使用完整的规则报告。");
  const model = settings.model.trim();
  if (!model) throw new Error("还没有填写模型名。");
  const url = chatCompletionsUrl(settings.baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          max_tokens: maxTokens,
          messages,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("模型请求超时。规则报告不受影响。");
      }
      throw new Error("浏览器没有拿到接口响应。多数是跨域限制：不少兼容接口默认不给网页直接调用。规则报告不受影响。");
    }
    const body = await response.text();
    if (!response.ok) {
      let detail = stripKey(body, apiKey).replace(/\s+/g, " ").slice(0, 180);
      try {
        const parsed = JSON.parse(body) as { error?: { message?: string } };
        if (parsed.error?.message) detail = clip(stripKey(parsed.error.message, apiKey), 180);
      } catch {
        detail = clip(detail, 180);
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error(`接口拒绝了密钥（HTTP ${response.status}）。${detail}`);
      }
      throw new Error(`接口返回 HTTP ${response.status}。${detail}`);
    }
    let content = "";
    try {
      const parsed = JSON.parse(body) as { choices?: { message?: { content?: string } }[] };
      content = parsed.choices?.[0]?.message?.content ?? "";
    } catch {
      throw new Error("接口返回的不是 Chat Completions JSON。");
    }
    if (!content.trim()) throw new Error("模型返回了空内容。");
    return content;
  } finally {
    clearTimeout(timer);
  }
}

function enrichmentPrompt(input: ProposalInput, analysis: Analysis): ChatMessage[] {
  const lights = analysis.dimensions
    .map((item) => `- ${item.id} ${item.title} ${LIGHT_LABEL[item.light]}：${item.reason}`)
    .join("\n");
  return [
    {
      role: "system",
      content:
        "你是一位尖刻但具体的开题导师。灯色已经由规则引擎判定，你不能改灯，也不能劝用户忽略红灯。只许对着草稿里的原词补写。禁止空话，禁止「加强创新」。只输出 JSON，对象含 advisorNote（120字内）、reasons（八个维度 id 到一句评语的对象，可缺项）、questions（恰好 5 条字符串）。维度 id 只能是 clarity, novelty, feasibility, methodFit, data, ethics, scope, references。",
    },
    {
      role: "user",
      content: `研究问题：\n${input.question}\n\n摘要：\n${input.abstract}\n\n参考文献：\n${input.references}\n\n规则判定：\n${lights}`,
    },
  ];
}

export async function enrichWithLlm(
  settings: LlmSettings,
  input: ProposalInput,
  analysis: Analysis,
): Promise<LlmEnrichment> {
  const content = await postChat(settings, enrichmentPrompt(input, analysis), 1200);
  return parseEnrichmentPayload(content);
}

export async function pingLlm(settings: LlmSettings): Promise<string> {
  const content = await postChat(
    settings,
    [
      { role: "system", content: "只回复两个字母 ok，不要解释。" },
      { role: "user", content: "ping" },
    ],
    16,
  );
  return clip(content, 80);
}
