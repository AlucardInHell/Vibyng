import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Gift, Star, Trophy, Heart, MessageCircle, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

function getCurrentUserId(): number {
  try {
    const stored = localStorage.getItem("vibyng-user");
    if (stored) return JSON.parse(stored).id || 1;
  } catch {}
  return 1;
}

type RewardItem = {
  code: string;
  label: string;
  description: string;
  cost: number;
};

type PointsTransaction = {
  id: number;
  action: string;
  points: number;
  referenceType: string;
  referenceId: number;
  createdAt: string;
};

type PointsRedemption = {
  id: number;
  rewardCode: string;
  pointsSpent: number;
  createdAt: string;
};

type VPointsStatus = {
  balance: number;
  todayEarned: number;
  dailyCap: number;
  remainingToday: number;
  userRole: string;
  rewards: RewardItem[];
  recentTransactions: PointsTransaction[];
  recentRedemptions: PointsRedemption[];
};

const ACTION_LABELS: Record<string, string> = {
  post_create: "Pubblicazione post",
  comment_post: "Commento a un post",
  comment_photo: "Commento a una foto",
  comment_video: "Commento a un video",
  follow_artist: "Nuovo profilo seguito",
  attend_event: "Partecipazione a un evento",
  support_sent: "Supporto dato a un artista",
  support_received: "Supporto ricevuto",
};

const REWARD_LABELS: Record<string, string> = {
  exclusive_content: "Contenuto esclusivo",
  supporter_badge: "Badge Supporter",
  early_access: "Early access",
  partner_perk: "Vantaggio partner",
  sponsored_profile_feed: "Profilo sponsorizzato nel feed",
  sponsored_video_flow: "Video sponsorizzato in Flow",
  partner_discount_25: "Sconto partner 25%",
  indie_single_recording: "Registrazione singolo",
};

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VPoints() {
  const userId = getCurrentUserId();
  const { toast } = useToast();

  const { data: status, isLoading } = useQuery<VPointsStatus>({
    queryKey: ["/api/vpoints", userId, "status"],
    queryFn: async () => {
      const res = await fetch(`/api/vpoints/${userId}/status`);
      if (!res.ok) {
        throw new Error("Errore nel recupero dei VibyngPoints");
      }
      return res.json();
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async (rewardCode: string) => {
      const res = await apiRequest("POST", "/api/vpoints/redeem", {
        userId,
        rewardCode,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vpoints", userId, "status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId] });
      toast({
        title: "Premio riscattato!",
        description: "I tuoi VibyngPoints sono stati aggiornati.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Riscatto non riuscito",
        description: err?.message || "Non è stato possibile completare il riscatto.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !status) {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="animate-pulse flex flex-col items-center gap-2">
              <Zap className="w-8 h-8 text-primary" />
              <span className="text-muted-foreground">Caricamento VibyngPoints...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <h1 className="text-xl font-semibold">VibyngPoints</h1>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="w-8 h-8 text-primary" />
            <span className="text-4xl font-bold text-primary">{status.balance}</span>
          </div>
          <p className="text-sm text-muted-foreground">I tuoi VibyngPoints</p>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
  <div className="rounded-lg bg-background/70 border px-2 py-3 min-h-[110px] flex flex-col justify-center min-w-0">
    <p className="text-[11px] sm:text-xs leading-tight text-muted-foreground break-words">
      Oggi
    </p>
    <p className="font-semibold text-2xl leading-none mt-3">{status.todayEarned}</p>
  </div>

  <div className="rounded-lg bg-background/70 border px-2 py-3 min-h-[110px] flex flex-col justify-center min-w-0">
    <p className="text-[11px] sm:text-xs leading-tight text-muted-foreground break-words">
      Cap giornaliero
    </p>
    <p className="font-semibold text-2xl leading-none mt-3">{status.dailyCap}</p>
  </div>

  <div className="rounded-lg bg-background/70 border px-2 py-3 min-h-[110px] flex flex-col justify-center min-w-0">
    <p className="text-[11px] sm:text-xs leading-tight text-muted-foreground break-words">
      Ancora disponibili
    </p>
    <p className="font-semibold text-2xl leading-none mt-3">{status.remainingToday}</p>
  </div>
</div>

          <p className="text-xs text-muted-foreground mt-3">
            Puoi accumulare al massimo {status.dailyCap} punti al giorno.
          </p>
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
              <Star className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm">Pubblica un post</span>
              <p className="text-xs text-muted-foreground">Massimo 1 ricompensa al giorno</p>
            </div>
            <Badge variant="secondary" className="text-primary">+10</Badge>
          </div>

          <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
            <div className="p-2 rounded-full bg-primary/10">
              <MessageCircle className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm">Commenta post, foto o video</span>
              <p className="text-xs text-muted-foreground">Commenti validi, massimo 6 premiati al giorno</p>
            </div>
            <Badge variant="secondary" className="text-primary">+5</Badge>
          </div>

          <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
            <div className="p-2 rounded-full bg-primary/10">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm">Segui un profilo</span>
              <p className="text-xs text-muted-foreground">Massimo 5 follow premiati al giorno</p>
            </div>
            <Badge variant="secondary" className="text-primary">+3</Badge>
          </div>

          <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
            <div className="p-2 rounded-full bg-primary/10">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm">Partecipa a un evento</span>
              <p className="text-xs text-muted-foreground">Massimo 2 eventi premiati al giorno</p>
            </div>
            <Badge variant="secondary" className="text-primary">+10</Badge>
          </div>

          {status.userRole === "artist" ? (
  <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
    <div className="p-2 rounded-full bg-primary/10">
      <Trophy className="w-4 h-4 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <span className="font-medium text-sm">Ricevi un supporto</span>
      <p className="text-xs text-muted-foreground">Massimo 2 supporti premiati al giorno</p>
    </div>
    <Badge variant="secondary" className="text-primary">+25</Badge>
  </div>
) : (
  <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
    <div className="p-2 rounded-full bg-primary/10">
      <Heart className="w-4 h-4 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <span className="font-medium text-sm">Supporta un artista</span>
      <p className="text-xs text-muted-foreground">Massimo 1 supporto premiato al giorno</p>
    </div>
    <Badge variant="secondary" className="text-primary">+50</Badge>
  </div>
)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
  <Gift className="w-5 h-5 text-primary" />
  {status.userRole === "artist" ? "Premi disponibili per artisti" : "Premi disponibili per fan"}
</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {status.rewards.map((reward) => {
            const canRedeem = status.balance >= reward.cost;

            return (
              <div
                key={reward.code}
                className="flex items-center gap-3 p-3 rounded-md bg-muted/50 border"
              >
                <div className="p-2 rounded-full bg-primary/10">
                  <Gift className="w-4 h-4 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">{reward.label}</span>
                  <p className="text-xs text-muted-foreground">{reward.description}</p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline">{reward.cost} pts</Badge>
                  <Button
                    size="sm"
                    disabled={!canRedeem || redeemMutation.isPending}
                    onClick={() => redeemMutation.mutate(reward.code)}
                  >
                    Riscatta
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Attività recente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {status.recentTransactions.length > 0 ? (
            status.recentTransactions.slice(0, 8).map((item) => (
              <div key={`tx-${item.id}`} className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                <div>
                  <p className="text-sm font-medium">
                    {ACTION_LABELS[item.action] || item.action}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                </div>
                <Badge variant="secondary" className="text-primary">
                  +{item.points}
                </Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nessuna attività punti registrata ancora.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Riscatti recenti</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {status.recentRedemptions.length > 0 ? (
            status.recentRedemptions.slice(0, 8).map((item) => (
              <div key={`rd-${item.id}`} className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                <div>
                  <p className="text-sm font-medium">
                    {REWARD_LABELS[item.rewardCode] || item.rewardCode}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                </div>
                <Badge variant="outline">-{item.pointsSpent}</Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Non hai ancora riscattato premi.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
