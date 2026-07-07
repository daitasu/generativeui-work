import { useMemo, useRef, useState } from "react";
import { MessageProcessor } from "@a2ui/web_core/v0_9";
import { A2uiSurface, MarkdownContext } from "@a2ui/react/v0_9";
import { renderMarkdown } from "@a2ui/markdown-it";
import { weatherCatalog } from "./weather/catalog";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text?: string;
  surfaceId?: string;
  status?: "streaming" | "done" | "error";
  ops?: string[];
}

let seq = 0;

export default function App() {
  const processor = useMemo(
    () =>
      new MessageProcessor([weatherCatalog], (action) => {
        // ponytail: アクションはログのみ。双方向連携が必要になったらここからサーバーへ送る
        console.log("a2ui action:", action);
      }),
    [],
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  // surface 作成/更新のタイミングで再レンダーさせるためのバージョンカウンタ
  const [, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function send() {
    const prompt = input.trim();
    if (!prompt || busy) return;
    setInput("");
    setBusy(true);

    const surfaceId = `s-${++seq}-${Date.now()}`;
    const assistantId = `a-${surfaceId}`;
    setMessages((m) => [
      ...m,
      { id: `u-${surfaceId}`, role: "user", text: prompt },
      { id: assistantId, role: "assistant", surfaceId, status: "streaming" },
    ]);

    const sub = processor.onSurfaceCreated(bump);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, surfaceId }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      // JSONL を行単位でパースし、完成した行=1つの A2UI メッセージとして処理する
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const ops: string[] = [];
      // LLM から届いた行を「そのまま」ログへ流す(パースの成否に関わらず実態を表示する)
      const logRaw = (line: string) => {
        const t = line.trim();
        if (!t) return;
        ops.push(t);
        setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, ops: [...ops] } : x)));
      };
      const processLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith("{")) return;
        try {
          const msg = JSON.parse(trimmed);
          if (msg.error) throw new Error(msg.error);
          processor.processMessages([msg]);
          bump();
        } catch (e) {
          console.warn("skipped line:", trimmed, e);
        }
      };
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          logRaw(line);
          processLine(line);
        }
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
      if (buffer) {
        logRaw(buffer);
        processLine(buffer);
      }
      setMessages((m) =>
        m.map((msg) => (msg.id === assistantId ? { ...msg, status: "done" } : msg)),
      );
    } catch (e) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantId ? { ...msg, status: "error", text: String(e) } : msg,
        ),
      );
    } finally {
      sub.unsubscribe();
      setBusy(false);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  // 入力欄下のログには「最新のアシスタント応答」で受信したメッセージを出す
  const lastOps = [...messages].reverse().find((m) => m.role === "assistant")?.ops ?? [];

  return (
    <MarkdownContext.Provider value={renderMarkdown}>
    <div className="chat-app">
      <header className="chat-header">
        <h1>a2ui × 天気エージェント</h1>
        <span className="chat-sub">A2UI v0.9 メッセージ (JSONL) をストリーム描画</span>
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
                {(() => {
                  const surface = msg.surfaceId
                    ? processor.model.surfacesMap.get(msg.surfaceId)
                    : undefined;
                  if (msg.status === "error") return <div className="chat-error">{msg.text}</div>;
                  if (!surface) return <div className="chat-loading">UI を生成中…</div>;
                  return <A2uiSurface surface={surface} />;
                })()}
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
        <div className="ops-dock-title">受信した A2UI メッセージ ({lastOps.length})</div>
        <ol className="ops-list">
          {lastOps.map((op, i) => (
            <li key={i}>
              <code>{op}</code>
            </li>
          ))}
        </ol>
      </section>
    </div>
    </MarkdownContext.Provider>
  );
}
