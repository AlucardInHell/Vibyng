import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, MessageCircle, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MentionText } from "@/components/mention-text";
import { useMention } from "@/hooks/use-mention";
import { MentionDropdown } from "@/components/mention-dropdown";
import { parseSharedContentMessage } from "@/lib/shared-content-message";
import type { User, Message } from "@shared/schema";

function getCurrentUserId(): number {
  try {
    const stored = localStorage.getItem("vibyng-user");
    if (stored) return JSON.parse(stored).id || 1;
  } catch {}
  return 1;
}
const CURRENT_USER_ID = getCurrentUserId();

type MessageWithSender = Message & { sender: User };
type StoryReplyMessagePayload = {
  type: "story_reply";
  storyId: number;
  storyImageUrl: string;
  storyContent: string;
  reply: string;
};

type AppLanguage = "it" | "en";

const chatTranslations = {
  it: {
    loading: "Caricamento...",
    userNotFound: "Artista non trovato",
    backToMessages: "Torna ai messaggi",
    storyAlt: "Storia",
    storyReplyLabel: "Risposta alla storia",
    sharedContentLabel: "Contenuto condiviso",
    openContent: "Apri contenuto",
    noMessages: "Nessun messaggio ancora.",
    startConversationPrefix: "Inizia una conversazione con",
    messagePlaceholder: "Scrivi un messaggio...",
    blockedConversationTitle: "Conversazione non disponibile",
    blockedConversationDescription: "Non puoi visualizzare o inviare messaggi perché tra voi esiste un blocco.",
    messageBlockedError: "Non puoi inviare messaggi a questo profilo perché tra voi esiste un blocco.",
  },

  en: {
    loading: "Loading...",
    userNotFound: "User not found",
    backToMessages: "Back to messages",
    storyAlt: "Story",
    storyReplyLabel: "Story reply",
    sharedContentLabel: "Shared content",
    openContent: "Open content",
    noMessages: "No messages yet.",
    startConversationPrefix: "Start a conversation with",
    messagePlaceholder: "Write a message...",
    blockedConversationTitle: "Conversation unavailable",
    blockedConversationDescription: "You cannot view or send messages because one of you has blocked the other.",
    messageBlockedError: "You cannot send messages to this profile because one of you has blocked the other.",
  },
} as const;

function getStoredLanguage(): AppLanguage {
  try {
    const stored = localStorage.getItem("vibyng-language");
    if (stored === "it" || stored === "en") return stored;
  } catch {}
  return "it";
}

function parseStoryReplyMessage(content: string | null | undefined): StoryReplyMessagePayload | null {
  if (!content || !content.startsWith("__STORY_REPLY__")) return null;

  try {
    const parsed = JSON.parse(content.replace("__STORY_REPLY__", ""));
    return parsed?.type === "story_reply" ? parsed : null;
  } catch {
    return null;
  }
}

function getInternalShareHref(shareUrl: string): string {
  if (!shareUrl) return "/";

  try {
    const url = new URL(shareUrl);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return shareUrl.replace(window.location.origin, "");
  }
}

export default function Chat() {
  const params = useParams<{ artistId: string }>();
  const artistId = Number(params.artistId);
  const CURRENT_USER_ID = getCurrentUserId();
  const [language, setLanguage] = useState<AppLanguage>(getStoredLanguage);
  const t = chatTranslations[language];
  const timeLocale = language === "it" ? "it-IT" : "en-US";
  const [newMessage, setNewMessage] = useState("");
  const [isConversationBlocked, setIsConversationBlocked] = useState(false);
  const {
  mentionQuery,
  showMentions,
  handleTextChange,
  insertMention,
  closeMentions,
} = useMention();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
  const syncLanguage = () => {
    setLanguage(getStoredLanguage());
  };

  const handleLanguageChange = (event: Event) => {
    const customEvent = event as CustomEvent<AppLanguage>;
    if (customEvent.detail === "it" || customEvent.detail === "en") {
      setLanguage(customEvent.detail);
      return;
    }

    syncLanguage();
  };

  syncLanguage();

  window.addEventListener("vibyng-language-change", handleLanguageChange);
  window.addEventListener("storage", syncLanguage);
  window.addEventListener("focus", syncLanguage);
  window.addEventListener("pageshow", syncLanguage);

  return () => {
    window.removeEventListener("vibyng-language-change", handleLanguageChange);
    window.removeEventListener("storage", syncLanguage);
    window.removeEventListener("focus", syncLanguage);
    window.removeEventListener("pageshow", syncLanguage);
  };
}, []);

  const { data: artist, isLoading: artistLoading } = useQuery<User>({
    queryKey: ["/api/users", artistId],
  });
  
  useEffect(() => {
    const timer = setTimeout(() => {
      apiRequest("POST", `/api/messages/read/${CURRENT_USER_ID}/${artistId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread", CURRENT_USER_ID] });
    }, 2000);
    return () => clearTimeout(timer);
  }, []);
  
    const { data: messages = [], isLoading: messagesLoading } = useQuery<MessageWithSender[]>({
    queryKey: ["/api/messages", CURRENT_USER_ID, artistId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/${CURRENT_USER_ID}/${artistId}`);

      if (res.status === 403) {
        setIsConversationBlocked(true);
        return [];
      }

      setIsConversationBlocked(false);

      if (!res.ok) return [];
      return res.json();
    },
   refetchInterval: isConversationBlocked ? false : 2000,
    staleTime: 0,
  });

useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", "/api/messages", {
        senderId: CURRENT_USER_ID,
        receiverId: artistId,
        content,
      });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/messages", CURRENT_USER_ID, artistId] });
      setNewMessage("");
    },
    onError: () => {
      setIsConversationBlocked(true);
    },
  });

  const handleSend = () => {
    if (isConversationBlocked) return;

    if (newMessage.trim()) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
  if (showMentions) return;

  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

  if (artistLoading || messagesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <MessageCircle className="w-8 h-8 text-primary" />
          <span className="text-muted-foreground">{t.loading}</span>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-muted-foreground">{t.userNotFound}</p>
        <Link href="/messages">
          <Button variant="outline">{t.backToMessages}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-center gap-3 pb-3 border-b">
          <Link href="/messages">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <Avatar className="w-10 h-10">
            {artist.avatarUrl && <AvatarImage src={artist.avatarUrl} alt={artist.displayName} />}
            <AvatarFallback className="bg-primary/10 text-primary">
              {artist.displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate" data-testid="text-chat-artist-name">
              {artist.displayName}
            </h2>
            <span className="text-xs text-muted-foreground">@{artist.username}</span>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide [&::-webkit-scrollbar]:hidden">
          {isConversationBlocked ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <MessageCircle className="w-12 h-12 text-muted-foreground/50 mb-3" />
              <p className="font-semibold text-foreground">
                {t.blockedConversationTitle}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t.blockedConversationDescription}
              </p>
            </div>
          ) : messages && messages.length > 0 ? (
            messages.map((msg) => {
              const isCurrentUser = msg.senderId === CURRENT_USER_ID;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                  data-testid={`message-${msg.id}`}
                >
                 <div
  className={`max-w-[75%] rounded-2xl overflow-hidden ${
    isCurrentUser
      ? "bg-primary text-primary-foreground"
      : "bg-muted"
  }`}
>
  {(() => {
    const storyReply = parseStoryReplyMessage(msg.content);

    if (storyReply) {
      return (
        <div>
          {storyReply.storyImageUrl && (
            <img
              src={storyReply.storyImageUrl}
              alt={t.storyAlt}
              className="w-full h-32 object-cover"
            />
          )}
          <div className="px-4 py-3">
            <p className={`text-xs mb-2 ${isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
              {t.storyReplyLabel}
            </p>

            {storyReply.storyContent && (
  <p className={`text-xs mb-2 whitespace-pre-wrap break-words ${isCurrentUser ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
    <MentionText
      text={storyReply.storyContent}
      mentionClassName={isCurrentUser ? "underline font-semibold cursor-pointer text-primary-foreground" : "text-primary underline font-semibold cursor-pointer"}
    />
  </p>
)}

            <p className="text-sm whitespace-pre-wrap break-words">
  <MentionText
    text={storyReply.reply}
    mentionClassName={isCurrentUser ? "underline font-semibold cursor-pointer text-primary-foreground" : "text-primary underline font-semibold cursor-pointer"}
  />
</p>
          </div>
        </div>
      );
    }

const sharedContent = parseSharedContentMessage(msg.content);

    if (sharedContent) {
      const href = getInternalShareHref(sharedContent.shareUrl);
      const isImage = !!sharedContent.mediaUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

      return (
        <div>
          {isImage && sharedContent.mediaUrl && (
            <img
              src={sharedContent.mediaUrl}
              alt={sharedContent.title}
              className="w-full h-32 object-cover"
            />
          )}

          <div className="px-4 py-3 space-y-2">
            <p className={`text-xs ${isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
              {t.sharedContentLabel}
            </p>

            <p className="text-sm font-semibold whitespace-pre-wrap break-words">
              {sharedContent.title}
            </p>

            {!!sharedContent.text && (
              <p className={`text-xs whitespace-pre-wrap break-words ${isCurrentUser ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                <MentionText
                  text={sharedContent.text}
                  mentionClassName={
                    isCurrentUser
                      ? "underline font-semibold cursor-pointer text-primary-foreground"
                      : "text-primary underline font-semibold cursor-pointer"
                  }
                />
              </p>
            )}

            <Link href={href}>
              <button
                className={`inline-flex items-center gap-1 text-xs font-medium ${
                  isCurrentUser ? "text-primary-foreground" : "text-primary"
                }`}
              >
                {t.openContent}
                <ExternalLink className="w-3 h-3" />
              </button>
            </Link>
          </div>
        </div>
      );
    }
  
    return (
     <div className="px-4 py-2">
  <p className="text-sm whitespace-pre-wrap break-words">
    <MentionText
      text={msg.content}
      mentionClassName={isCurrentUser ? "underline font-semibold cursor-pointer text-primary-foreground" : "text-primary underline font-semibold cursor-pointer"}
    />
  </p>
</div>
    );
  })()}

  <div className="px-4 pb-2">
    <span className={`text-xs ${isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"} mt-1 block`}>
      {msg.createdAt && new Date(msg.createdAt).toLocaleTimeString(timeLocale, {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  </div>
</div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {t.noMessages}
              </p>
              <p className="text-sm text-muted-foreground">
                {t.startConversationPrefix} {artist.displayName}!
              </p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        <div className="p-4 border-t">
          <div className="flex items-center gap-2">
  <div className="relative flex-1">
    <Input
      placeholder={isConversationBlocked ? t.messageBlockedError : t.messagePlaceholder}
      value={newMessage}
      onChange={(e) => {
        setNewMessage(e.target.value);
        handleTextChange(e.target.value, e.target.selectionStart || 0);
      }}
      onKeyDown={handleKeyPress}
      className="w-full"
      disabled={isConversationBlocked}
      data-testid="input-message"
    />
    <MentionDropdown
      query={mentionQuery}
      visible={showMentions}
      onSelect={(username) => {
        setNewMessage(insertMention(newMessage, username));
        closeMentions();
      }}
    />
  </div>

  <Button
    size="icon"
    onClick={handleSend}
    disabled={isConversationBlocked || !newMessage.trim() || sendMessageMutation.isPending}
    data-testid="button-send"
  >
    <Send className="w-4 h-4" />
  </Button>
</div>
        </div>
      </Card>
    </div>
  );
}
