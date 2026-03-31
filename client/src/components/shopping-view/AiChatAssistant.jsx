import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSelector } from "react-redux";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ai-chat-history";
const MAX_MESSAGES = 50;

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(messages) {
  try {
    const toSave = messages.slice(-MAX_MESSAGES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    /* ignore */
  }
}

export default function AiChatAssistant() {
  const { user } = useSelector((state) => state.auth);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState(loadHistory);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamContent, scrollToBottom]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  const chatApiUrl = import.meta.env.VITE_CHAT_API_URL || "/reco-api/api/chat";

  async function handleSend(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;

    const userMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStreaming(true);
    setStreamContent("");

    try {
      const res = await fetch(chatApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          userId: user?.id || "",
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `Request failed: ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data:")) {
              try {
                const data = JSON.parse(line.slice(5).trim());
                if (data.type === "text" && data.content) {
                  fullText += data.content;
                  setStreamContent(fullText);
                }
                if (data.type === "error") {
                  throw new Error(data.content);
                }
              } catch (parseErr) {
                if (parseErr instanceof SyntaxError) continue;
                throw parseErr;
              }
            }
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: fullText || "No response." },
      ]);
      setStreamContent("");
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, something went wrong: ${err?.message || "Unknown error"}`,
        },
      ]);
      setStreamContent("");
    } finally {
      setStreaming(false);
    }
  }

  const displayMessages = streamContent
    ? [
        ...messages,
        { role: "assistant", content: streamContent, isStreaming: true },
      ]
    : messages;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => {
          setOpen(true);
          setMinimized(false);
        }}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all",
          "bg-primary text-primary-foreground hover:scale-105",
          open && "opacity-0 pointer-events-none"
        )}
        aria-label="Open AI assistant"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Chat window */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-2xl border bg-card shadow-xl transition-all duration-300",
          "w-[380px]",
          open ? (minimized ? "h-14" : "h-[500px]") : "h-0 w-0 opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
          <span className="font-semibold text-foreground">AI Shopping Assistant</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMinimized(!minimized)}
              aria-label="Minimize"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        {!minimized && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {displayMessages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Hi! I can help you find products, answer questions, and suggest combinations. What are you looking for?
            </p>
          )}
          {displayMessages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                )}
              >
                <span className="whitespace-pre-wrap">{msg.content}</span>
                {msg.isStreaming && (
                  <span className="inline-block w-2 h-4 ml-0.5 bg-current animate-pulse" />
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        )}

        {/* Input */}
        {!minimized && (
        <form onSubmit={handleSend} className="border-t p-3">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about products..."
              className="flex-1 rounded-xl"
              disabled={streaming}
            />
            <Button type="submit" size="sm" className="rounded-xl" disabled={streaming}>
              Send
            </Button>
          </div>
        </form>
        )}
      </div>
    </>
  );
}
