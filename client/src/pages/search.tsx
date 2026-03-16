import { useState, useRef, useEffect } from "react";
import type { User } from "@shared/schema";
import { Search, X, ArrowLeft, Music, Users, Building2, Store, Home, Disc3, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useLocation } from "wouter";

type RoleFilter = "all" | "artist" | "fan" | "business" | "rehearsal_room" | "music_store" | "record_label";

const roleLabels: Record<RoleFilter, string> = {
  all: "Tutti",
  artist: "Artisti",
  fan: "Fan",
  business: "Aziende",
  rehearsal_room: "Sale Prove",
  music_store: "Negozi",
  record_label: "Etichette",
};

const roleIcons: Record<string, typeof Music> = {
  artist: Music,
  fan: Users,
  business: Building2,
  rehearsal_room: Home,
  music_store: Store,
  record_label: Disc3,
};

const roleBadgeColors: Record<string, string> = {
  artist: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  fan: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  business: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  rehearsal_room: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  music_store: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  record_label: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
};

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<RoleFilter>("all");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setHasSearched(true);
      try {
        const url = `/api/users/search?q=${encodeURIComponent(searchQuery)}&role=${activeFilter}`;
        const res = await fetch(url);
        const data = await res.json();
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeFilter]);

  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      artist: "Artista",
      fan: "Fan",
      business: "Azienda",
      rehearsal_room: "Sala Prove",
      music_store: "Negozio Musica",
      record_label: "Etichetta",
    };
    return labels[role] || role;
  };

  const getProfileUrl = (user: User): string => {
    if (user.role === "artist") return `/artist/${user.id}`;
    return `/me`;
  };

  const RoleIcon = ({ role }: { role: string }) => {
    const Icon = roleIcons[role] || Users;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-background" data-testid="page-search">
      <div className="sticky top-0 z-40 bg-background border-b">
        <div className="flex items-center gap-2 p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-search-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Cerca artisti, fan, negozi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
              data-testid="input-search-query"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => { setSearchQuery(""); setSearchResults([]); setHasSearched(false); }}
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="px-3 pb-2 overflow-x-auto">
          <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as RoleFilter)}>
            <TabsList className="h-9 w-full justify-start overflow-x-auto" data-testid="tabs-role-filter">
              {(Object.entries(roleLabels) as [RoleFilter, string][]).map(([key, label]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="text-xs px-3"
                  data-testid={`tab-filter-${key}`}
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="p-3 pb-20">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : searchResults.length > 0 ? (
          <div className="space-y-2">
            {searchResults.map((user) => (
              <Link key={user.id} href={getProfileUrl(user)}>
                <Card className="hover-elevate cursor-pointer" data-testid={`search-result-${user.id}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.displayName} />}
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user.displayName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{user.displayName}</h3>
                          <Badge variant="secondary" className={`text-xs shrink-0 ${roleBadgeColors[user.role] || ""}`}>
                            <RoleIcon role={user.role} />
                            <span className="ml-1">{getRoleLabel(user.role)}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                        {user.genre && <p className="text-xs text-muted-foreground truncate">{user.genre}</p>}
                        {user.city && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />{user.city}
                          </p>
                        )}
                      </div>
                    </div>
                    {user.bio && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{user.bio}</p>}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : hasSearched ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">Nessun risultato</h3>
            <p className="text-sm text-muted-foreground">Nessun risultato per "{searchQuery}"</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">Cerca su Vibyng</h3>
            <p className="text-sm text-muted-foreground">Trova artisti, fan, sale prove, negozi di musica e altro</p>
          </div>
        )}
      </div>
    </div>
  );
}
