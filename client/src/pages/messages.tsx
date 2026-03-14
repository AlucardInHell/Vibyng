import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { User } from "@shared/schema";

export default function Messages() {
  const { data: artists, isLoading } = useQuery<User[]>({
    queryKey: ["/api/artists"],
  });

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
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">Messaggi</h1>
      </div>

      <Card data-testid="card-messages-intro">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Connettiti direttamente con i tuoi artisti preferiti attraverso messaggi privati.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Conversazioni</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {artists && artists.length > 0 ? (
            artists.map((artist) => (
              <Link key={artist.id} href={`/chat/${artist.id}`}>
                <div
                  className="flex items-center gap-3 p-3 rounded-lg hover-elevate cursor-pointer"
                  data-testid={`chat-artist-${artist.id}`}
                >
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
          ) : (
            <p className="text-center text-muted-foreground py-4">
              Nessun artista disponibile
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
