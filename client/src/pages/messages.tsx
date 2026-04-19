import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import type { User } from "@shared/schema";

function getCurrentUserId(): number {
  try {
    const stored = localStorage.getItem("vibyng-user");
    if (stored) return JSON.parse(stored).id || 1;
  } catch {}
  return 1;
}

export default function Messages() {
  const userId = getCurrentUserId();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const { data: conversations = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users", userId, "conversations"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/conversations`);
      return res.json();
    },
  });

  const { data: unreadPerUser = {} } = useQuery<Record<number, number>>({
    queryKey: ["/api/messages/unread-per-user", userId],
    queryFn: async () => {
      const counts: Record<number, number> = {};
      await Promise.all(
        conversations.map(async (user) => {
          const res = await fetch(`/api/messages/unread-from/${user.id}/${userId}?t=${Date.now()}`);
          const count = await res.json();
          counts[user.id] = count;
        })
      );
      return counts;
    },
    enabled: conversations.length > 0,
    refetchInterval: 5000,
  });

  const filtered = conversations
  .map((u: any) => ({
    ...u,
    displayName: u.displayName ?? u.display_name ?? "",
    username: u.username ?? "",
    avatarUrl: u.avatarUrl ?? u.avatar_url ?? "",
  }))
  .filter((u) =>
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <MessageCircle className="w-8 h-8 text-primary" />
          <span className="text-muted-foreground">Caricamento...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Messaggi</h1>
        </div>
        <button onClick={() => { setShowSearch(!showSearch); setSearchQuery(""); }} className="p-2 rounded-full hover:bg-muted transition-colors">
          {showSearch ? <X className="w-5 h-5 text-muted-foreground" /> : <Search className="w-5 h-5 text-muted-foreground" />}
        </button>
      </div>

      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            autoFocus
            type="text"
            placeholder="Cerca conversazioni..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-muted border-0 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Conversazioni</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {filtered.length > 0 ? (
            filtered.map((user) => {
              const unread = unreadPerUser[user.id] ?? 0;
              return (
                <Link key={user.id} href={`/chat/${user.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-lg hover-elevate cursor-pointer">
                    <Avatar className="w-10 h-10">
                      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.displayName} />}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium truncate ${unread > 0 ? "text-primary" : ""}`}>{user.displayName}</h3>
                      <p className="text-xs text-muted-foreground truncate">Clicca per aprire la chat</p>
                    </div>
                <MessageCircle className={`w-5 h-5 ${unread > 0 ? "text-red-500" : "text-muted-foreground"}`} />
                  </div>
                </Link>
              );
            })
          ) : searchQuery ? (
            <p className="text-center text-muted-foreground py-4">Nessuna conversazione trovata per "{searchQuery}"</p>
          ) : (
            <p className="text-center text-muted-foreground py-8 text-sm">Nessuna conversazione ancora. Vai sul profilo di un utente e inizia a chattare!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
