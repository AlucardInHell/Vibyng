import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Music2, ChevronRight, Search, X } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import type { User } from "@shared/schema";

export default function Artists() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const { data: artists, isLoading } = useQuery<User[]>({
    queryKey: ["/api/artists"],
  });

  const filtered = artists?.filter(a =>
    a.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.genre && a.genre.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <Music2 className="w-8 h-8 text-primary" />
          <span className="text-muted-foreground">Caricamento artisti...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">Artisti</h1>
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
            placeholder="Cerca artisti..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-muted border-0 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {filtered?.map((artist) => (
        <Link key={artist.id} href={`/artist/${artist.id}`}>
          <Card className="overflow-visible hover-elevate cursor-pointer" data-testid={`card-artist-${artist.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-14 h-14" data-testid={`avatar-artist-${artist.id}`}>
                  {artist.avatarUrl && <AvatarImage src={artist.avatarUrl} alt={artist.displayName} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {artist.displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate" data-testid={`text-name-${artist.id}`}>
                      {artist.displayName}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground block">@{artist.username}</span>
                  {artist.genre && (
                    <Badge variant="outline" className="text-xs mt-1" data-testid={`badge-genre-${artist.id}`}>
                      {artist.genre}
                    </Badge>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
              {artist.bio && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2" data-testid={`text-bio-${artist.id}`}>
                  {artist.bio}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}

      {filtered?.length === 0 && searchQuery && (
        <p className="text-center text-muted-foreground py-8">Nessun artista trovato per "{searchQuery}"</p>
      )}
    </div>
  );
}
