import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Loader2, PanelRightClose } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useSoniaChat } from "@/contexts/SoniaChatContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import soniaAvatar from "@/assets/sonia-avatar.png";
import { useAiAccess } from "@/hooks/useAiAccess";

type Msg = { role: "user" | "assistant"; content: string };

const SONIA_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sonia-chat`;

interface SoniaChatProps {
  companyId?: string | null;
  sstManagerId?: string | null;
  contextType?: string;
}

export default function SoniaChat({ companyId, sstManagerId, contextType = "dashboard" }: SoniaChatProps) {
  // Assistente SOnIA desativada globalmente — nada é renderizado.
  return null;
}

function SoniaChatDisabled({ companyId, sstManagerId, contextType = "dashboard" }: SoniaChatProps) {
  const { isOpen: open, setIsOpen: setOpen } = useSoniaChat();
  const { hasAccess: aiEnabled, isLoading: aiLoading } = useAiAccess();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Olá! Sou a **SOnIA**, sua assistente de inteligência artificial para gestão de riscos psicossociais. 🧠\n\nComo posso ajudar você hoje? Posso:\n- 📊 Analisar dados da empresa\n- 📋 Explicar metodologias (HSE-IT, COPSOQ, Burnout)\n- 💡 Sugerir ações preventivas\n- 📖 Orientar sobre a NR-01"
      }]);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const allMessages = [...messages.filter(m => m.role !== "assistant" || messages.indexOf(m) !== 0), userMsg];

    try {
      const resp = await fetch(SONIA_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          company_id: companyId,
          sst_manager_id: sstManagerId,
          context_type: contextType,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro de conexão" }));
        setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${err.error || "Erro ao processar sua mensagem."}` }]);
        setIsLoading(false);
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && prev.length > 1) {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error("SoniaChat error:", e);
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Ocorreu um erro de conexão. Tente novamente." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!aiLoading && !aiEnabled) return null;

  return (
    <>
      {/* Vertical tab on right edge - full height */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-0 top-0 bottom-0 z-40 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-primary to-accent text-primary-foreground w-10 hover:w-12 transition-all duration-300 ai-glow"
          title="Abrir SOnIA"
        >
          <Sparkles className="h-5 w-5 animate-pulse" />
          <Avatar className="h-8 w-8 border-2 border-white/30">
            <AvatarImage src={soniaAvatar} alt="SOnIA" />
            <AvatarFallback>S</AvatarFallback>
          </Avatar>
          <span className="text-xs font-bold tracking-widest [writing-mode:vertical-lr] rotate-180">SOnIA</span>
        </button>
      )}

      {/* Side panel - no overlay */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-40 w-[50vw] bg-background border-l border-border/50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-primary to-accent text-primary-foreground shrink-0">
          <Avatar className="h-9 w-9 border-2 border-white/30">
            <AvatarImage src={soniaAvatar} alt="SOnIA" />
            <AvatarFallback>S</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-base">SOnIA</p>
            <p className="text-[11px] opacity-80">IA de Riscos Psicossociais</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-white/20"
            onClick={() => setOpen(false)}
            title="Recolher"
          >
            <PanelRightClose className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-5" ref={scrollRef as any}>
          <div className="space-y-4 max-w-2xl mx-auto">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start gap-2"}`}>
                {msg.role === "assistant" && (
                  <Avatar className="h-7 w-7 shrink-0 mt-1 border border-primary/30">
                    <AvatarImage src={soniaAvatar} alt="SOnIA" />
                    <AvatarFallback>S</AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border/50 bg-background/80 shrink-0">
          <form onSubmit={e => { e.preventDefault(); send(); }} className="flex gap-2 max-w-2xl mx-auto">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Pergunte à SOnIA..."
              className="flex-1 h-10 text-sm rounded-xl border-border/50 bg-muted/50"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" className="h-10 w-10 rounded-xl" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
