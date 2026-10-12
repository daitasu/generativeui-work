import { useRef, useState } from "react";
import { createSpecStreamCompiler, type Spec } from "@json-render/core";
import { JSONUIProvider, Renderer } from "@json-render/react";
import { registry } from "./render/registry";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text?: string;
  spec?: Spec;
  status?: "streaming" | "done" | "error";
  ops?: string[];
}

let seq = 0;

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function patchMessage(id: string, patch: Partial<ChatMessage>) {
    setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, ...patch } : msg)));
  }

  async function send() {
    const prompt = input.trim();
    if (!prompt || busy) return;
    setInput("");
    setBusy(true);

    const id = `m-${++seq}-${Date.now()}`;
    const assistantId = `a-${id}`;
    setMessages((m) => [
      ...m,
      { id: `u-${id}`, role: "user", text: prompt },
      { id: assistantId, role: "assistant", status: "streaming" },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      // SpecStream(JSON Patch の JSONL)をインクリメンタルに spec へコンパイル
      const compiler = createSpecStreamCompiler<Spec>({ elements: {} });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      let lineBuf = "";
      const ops: string[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        raw += chunk;
        const { result, newPatches } = compiler.push(chunk);
        // 到着した JSONL 行(=発火したオペレーション)を到着順にログへ蓄積
        lineBuf += chunk;
        const lines = lineBuf.split("\n");
        lineBuf = lines.pop() ?? "";
        for (const ln of lines) {
          const t = ln.trim();
          if (t) ops.push(t);
        }
        if (newPatches.length > 0 || lines.length > 0) {
          patchMessage(assistantId, { spec: result, ops: [...ops] });
        }
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
      if (lineBuf.trim()) ops.push(lineBuf.trim());
      const finalSpec = compiler.getResult();
      if (finalSpec.root) {
        patchMessage(assistantId, { spec: finalSpec, status: "done", ops: [...ops] });
      } else {
        // パッチが1つも来なかった場合は生テキストをそのまま表示(エラー含む)
        patchMessage(assistantId, { text: raw || "(応答なし)", status: "error", ops: [...ops] });
      }
    } catch (e) {
      patchMessage(assistantId, { text: String(e), status: "error" });
    } finally {
      setBusy(false);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  // 入力欄下のログには「最新のアシスタント応答」で受信したオペレーションを出す
  const lastOps = [...messages].reverse().find((m) => m.role === "assistant")?.ops ?? [];

  return (
    <div className="chat-app">
      <header className="chat-header">
        <h1>Jev + json-render × 天気エージェント</h1>
        <span className="chat-sub">Jev が判断 → コードが JSON Patch (JSONL) を組んで即描画</span>
      </header>
      <main className="chat-log">
        {messages.length === 0 && (
          <div className="chat-empty">「東京の天気は？」「大阪の週間予報を見せて」などと聞いてみてや</div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-msg chat-msg-${msg.role}`}>
            {msg.role === "user" ? (
              <div className="chat-bubble">{msg.text}</div>
            ) : (
              <div className="chat-surface">
                {msg.status === "error" ? (
                  <div className="chat-error">{msg.text}</div>
                ) : msg.spec?.root && msg.spec.elements?.[msg.spec.root] ? (
                  <JSONUIProvider registry={registry} initialState={msg.spec.state ?? {}}>
                    <Renderer spec={msg.spec} registry={registry} />
                  </JSONUIProvider>
                ) : (
                  <div className="chat-loading">UI を生成中…</div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </main>
      <footer className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && send()}
          placeholder="天気について聞く…"
          disabled={busy}
        />
        <button onClick={send} disabled={busy || !input.trim()}>
          送信
        </button>
      </footer>
      <section className="ops-dock">
        <div className="ops-dock-title">受信した JSON Patch ({lastOps.length})</div>
        <ol className="ops-list">
          {lastOps.map((op, i) => (
            <li key={i}>
              <code>{op}</code>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
