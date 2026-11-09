import { useEffect, useRef, useState } from "react";
import { clearSettings, defaultSettings, loadSettings, pingLlm, saveSettings, type LlmSettings } from "../llm.ts";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [settings, setSettings] = useState<LlmSettings>(defaultSettings);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setSettings(loadSettings());
      setMessage(null);
      setError(null);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  async function testConnection() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const reply = await pingLlm(settings);
      setMessage(`连上了。模型回复：${reply}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "连接失败。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="sheet"
      aria-labelledby="settings-title"
      onClose={onClose}
    >
      <form
        className="sheet-body"
        onSubmit={(event) => {
          event.preventDefault();
          saveSettings(settings);
          setMessage("已保存在这台浏览器的 localStorage。");
          setError(null);
          onClose();
        }}
      >
        <h2 id="settings-title">模型增强（可选）</h2>
        <p className="hint">
          兼容 OpenAI Chat Completions。通义千问可填接口
          https://dashscope.aliyuncs.com/compatible-mode/v1 ，模型 qwen-plus。密钥只写在本机，不进仓库，也没有我们的服务器可收。灯色始终由规则引擎决定。
        </p>
        <label>
          接口根路径
          <input
            value={settings.baseUrl}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setSettings({ ...settings, baseUrl: event.target.value })}
          />
        </label>
        <label>
          API 密钥
          <input
            type="password"
            value={settings.apiKey}
            autoComplete="off"
            spellCheck={false}
            placeholder="不会写入报告"
            onChange={(event) => setSettings({ ...settings, apiKey: event.target.value })}
          />
        </label>
        <label>
          模型名
          <input
            value={settings.model}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setSettings({ ...settings, model: event.target.value })}
          />
        </label>
        {message ? <p className="banner">{message}</p> : null}
        {error ? <p className="banner error">{error}</p> : null}
        <div className="actions">
          <button type="submit" className="btn">保存</button>
          <button type="button" className="btn secondary" disabled={busy} onClick={() => void testConnection()}>
            {busy ? "测试中…" : "测试连接"}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              clearSettings();
              setSettings(defaultSettings());
              setMessage("本机密钥已清除。");
              setError(null);
            }}
          >
            清除
          </button>
          <button type="button" className="btn ghost" onClick={onClose}>关闭</button>
        </div>
      </form>
    </dialog>
  );
}
