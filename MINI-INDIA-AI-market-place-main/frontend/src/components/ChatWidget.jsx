import { useState, useRef, useEffect } from "react";
import { Sparkle, X, PaperPlaneRight } from "@phosphor-icons/react";
import { API } from "@/lib/api";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    { role: "assistant", content: "Hi! I'm Mira ✨ — ask me anything about our products, orders, or shipping." },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const scrollRef = useRef();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs]);

  const send = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;
    setInput(""); setStreaming(true);
    setMsgs((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);

    try {
      const res = await fetch(`${API}/chat/stream`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ session_id: sessionId, message: text }),
      });
      if (!res.body) throw new Error("no stream");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n"); buf = parts.pop();
        for (const p of parts) {
          if (!p.startsWith("data:")) continue;
          try {
            const j = JSON.parse(p.slice(5).trim());
            if (j.delta) {
              setMsgs((m) => {
                const c = [...m]; c[c.length - 1] = { role: "assistant", content: c[c.length - 1].content + j.delta };
                return c;
              });
            }
            if (j.session_id) setSessionId(j.session_id);
            if (j.error) throw new Error(j.error);
          } catch { /* ignore parse */ }
        }
      }
    } catch (err) {
      setMsgs((m) => {
        const c = [...m]; c[c.length - 1] = { role: "assistant", content: "Sorry, I ran into an issue. Please try again." };
        return c;
      });
    } finally { setStreaming(false); }
  };

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} data-testid="chat-toggle"
          className="chat-widget fixed bottom-5 right-5 z-50 flex items-center gap-2 px-5 py-3 rounded-full bg-brand-green text-white font-medium hover:bg-brand-orange transition-colors">
          <Sparkle size={20} weight="fill" />
          <span className="hidden sm:inline">Ask Mira</span>
        </button>
      )}
      {open && (
        <div className="chat-widget fixed bottom-5 right-5 z-50 w-[92vw] sm:w-[380px] h-[540px] bg-white dark:bg-neutral-900 rounded-sm border border-border flex flex-col overflow-hidden"
             data-testid="chat-window">
          <div className="flex items-center justify-between px-4 py-3 bg-brand-green text-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkle size={16} weight="fill" />
              </div>
              <div>
                <div className="text-sm font-bold">Mira</div>
                <div className="text-[10px] opacity-80 uppercase tracking-widest">AI Shopping Assistant</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} data-testid="chat-close" className="p-1 hover:bg-white/10 rounded-sm"><X size={18}/></button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/30">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-sm text-sm ${
                  m.role === "user"
                    ? "bg-brand-green text-white"
                    : "bg-white dark:bg-neutral-800 border border-border"
                }`}>
                  {m.content || (streaming && i === msgs.length - 1 ? <span className="inline-block w-2 h-4 bg-primary animate-pulse"/> : "")}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={send} className="flex gap-2 p-3 border-t border-border">
            <input value={input} onChange={(e) => setInput(e.target.value)}
              data-testid="chat-input"
              disabled={streaming}
              placeholder="Ask about products, shipping…"
              className="flex-1 px-3 py-2 rounded-sm border border-border bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            <button type="submit" disabled={streaming || !input.trim()} data-testid="chat-send"
              className="btn-primary p-2 rounded-sm disabled:opacity-50"><PaperPlaneRight size={18} weight="fill"/></button>
          </form>
        </div>
      )}
    </>
  );
}
