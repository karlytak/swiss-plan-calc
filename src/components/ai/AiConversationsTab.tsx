import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, ChevronDown, ChevronUp, Bot, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateShort } from "@/lib/i18n/format";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

export function AiConversationsTab({ clientId }: { clientId: string }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["ai-conversations", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("client_id", clientId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Conversation[];
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  if (conversations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium">Aucune conversation IA pour ce client</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Les conversations avec l'assistant IA apparaîtront ici automatiquement.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {conversations.length} conversation{conversations.length > 1 ? "s" : ""} enregistrée{conversations.length > 1 ? "s" : ""}
      </p>
      {conversations.map((conv) => {
        const msgs = Array.isArray(conv.messages) ? conv.messages as Message[] : [];
        const preview = msgs.find(m => m.role === "user")?.content ?? "Conversation vide";
        const isOpen = openId === conv.id;
        return (
          <div key={conv.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              onClick={() => setOpenId(isOpen ? null : conv.id)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/30"
            >
              <div className="flex items-center gap-3 min-w-0">
                <MessageSquare className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{preview.slice(0, 80)}{preview.length > 80 ? "..." : ""}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateShort(conv.updated_at)} · {msgs.length} message{msgs.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </button>
            {isOpen && (
              <div className="border-t border-border p-4 space-y-3 bg-muted/10">
                {msgs.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs
                      ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {msg.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                    </div>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm
                      ${msg.role === "user" ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-muted/60 text-foreground"}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
