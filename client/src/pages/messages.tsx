import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import type { User } from "@shared/schema";

export default function Messages() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const { data: artists, isLoading } = useQuery<User[]>({
    queryKey: ["/api/artists"],
  });

  const filtered = artists?.filter(a =>
    a.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.username.toLowerCase().includes(searchQuery.toLowerCase())
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
          {filtered && filtered.length > 0 ? (
            filtered.map((artist) => (
              <Link key={artist.id} href={`/chat/${artist.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-lg hover-elevate cursor-pointer" data-testid={`chat-artist-${artist.id}`}>
                  <Avatar className="w-10 h-10">
                    {artist.avatarUrl && <AvatarImage src={artist.avatarUrl} alt={artist.displayName} />}
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {artist.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate" data-testid={`text-chat-name-${artist.id}`}>
                      {artist.displayName}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      Clicca per inviare un messaggio
                    </p>
                  </div>
                  <MessageCircle className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
            ))
          ) : searchQuery ? (
            <p className="text-center text-muted-foreground py-4">Nessuna conversazione trovata per "{searchQuery}"</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
