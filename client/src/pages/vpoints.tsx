import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Gift, Star, Trophy, Heart, MessageCircle, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { User } from "@shared/schema";

function getCurrentUserId(): number {
  try {
    const stored = localStorage.getItem("vibyng-user");
    if (stored) return JSON.parse(stored).id || 1;
  } catch {}
  return 1;
}

export default function VPoints() {
  const userId = getCurrentUserId();
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users", userId],
  });

  return (
    <div className="flex flex-col gap-4">
     <div className="flex items-center gap-2 mb-2">
        <h1 className="text-xl font-semibold">VibyngPoints</h1>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="w-8 h-8 text-primary" />
            <span className="text-4xl font-bold text-primary">{currentUser?.vibyngPoints ?? 0}</span>
          </div>
          <p className="text-sm text-muted-foreground">I tuoi VibyngPoints</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            Come guadagnare
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
            <div className="p-2 rounded-full bg-primary/10">
              <MessageCircle className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm">Commenta i post</span>
              <p className="text-xs text-muted-foreground">Interagisci con la community</p>
            </div>
            <Badge variant="secondary" className="text-primary">+5</Badge>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
            <div className="p-2 rounded-full bg-primary/10">
              <Heart className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm">Supporta un artista</span>
              <p className="text-xs text-muted-foreground">Fai una donazione</p>
            </div>
            <Badge variant="secondary" className="text-primary">+50</Badge>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
            <div className="p-2 rounded-full bg-primary/10">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm">Invita amici</span>
              <p className="text-xs text-muted-foreground">Porta nuovi utenti</p>
            </div>
            <Badge variant="secondary" className="text-primary">+100</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Premi disponibili
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
            <div className="p-2 rounded-full bg-primary/10">
              <Gift className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm">Contenuti esclusivi</span>
              <p className="text-xs text-muted-foreground">Accedi a demo e backstage</p>
            </div>
            <Badge variant="outline">500 pts</Badge>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
            <div className="p-2 rounded-full bg-primary/10">
              <Trophy className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm">Badge Supporter</span>
              <p className="text-xs text-muted-foreground">Mostra il tuo supporto</p>
            </div>
            <Badge variant="outline">1000 pts</Badge>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
            <div className="p-2 rounded-full bg-primary/10">
              <Star className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm">Early access</span>
              <p className="text-xs text-muted-foreground">Nuove release in anteprima</p>
            </div>
            <Badge variant="outline">2000 pts</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
