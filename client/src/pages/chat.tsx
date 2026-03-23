import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

export default function Chat() {
  const params = useParams<{ artistId: string }>();
  const artistId = Number(params.artistId);
  const CURRENT_USER_ID = getCurrentUserId();
  const [newMessage, setNewMessage] = useState("");

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
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", "/api/messages", {
        senderId: CURRENT_USER_ID,
        receiverId: artistId,
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", CURRENT_USER_ID, artistId] });
      setNewMessage("");
    },
  });

  const handleSend = () => {
    if (newMessage.trim()) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
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
          <span className="text-muted-foreground">Caricamento...</span>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-muted-foreground">Artista non trovato</p>
        <Link href="/messages">
          <Button variant="outline">Torna ai messaggi</Button>
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

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages && messages.length > 0 ? (
            messages.map((msg) => {
              const isCurrentUser = msg.senderId === CURRENT_USER_ID;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                  data-testid={`message-${msg.id}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      isCurrentUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <span className={`text-xs ${isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"} mt-1 block`}>
                      {msg.createdAt && new Date(msg.createdAt).toLocaleTimeString("it-IT", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                Nessun messaggio ancora.
              </p>
              <p className="text-sm text-muted-foreground">
                Inizia una conversazione con {artist.displayName}!
              </p>
            </div>
          )}
        </CardContent>

        <div className="p-4 border-t">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Scrivi un messaggio..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1"
              data-testid="input-message"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
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
