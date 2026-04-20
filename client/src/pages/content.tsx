import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Share2, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MentionText } from "@/components/mention-text";
import { shareVibyngContent, buildContentShareUrl } from "@/lib/share-content";

type ContentResponse = {
  type: "post" | "photo" | "video";
  id: number;
  authorId: number;
  content: string;
  mediaUrl: string | null;
  createdAt: string | null;
  likesCount: number;
  author: {
    id: number;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    role?: string | null;
  } | null;
};

function renderMedia(mediaUrl: string | null) {
  if (!mediaUrl) return null;

  if (mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return <img src={mediaUrl} alt="Contenuto" className="w-full rounded-lg max-h-[70vh] object-contain bg-black/5" />;
  }

  if (mediaUrl.match(/\.(mp4|webm|mov)$/i)) {
    return <video src={mediaUrl} controls className="w-full rounded-lg max-h-[70vh] bg-black" />;
  }

  if (mediaUrl.match(/\.(mp3|wav|ogg|m4a)$/i)) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
        <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
          <Music className="w-6 h-6 text-primary" />
        </div>
        <audio src={mediaUrl} controls className="flex-1" />
      </div>
    );
  }

  return <img src={mediaUrl} alt="Contenuto" className="w-full rounded-lg max-h-[70vh] object-contain bg-black/5" />;
}

export default function ContentPage() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<ContentResponse>({
    queryKey: ["/api/content", type, id],
    queryFn: async () => {
      const res = await fetch(`/api/content/${type}/${id}`);
      if (!res.ok) throw new Error("Contenuto non trovato");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <span className="text-muted-foreground">Caricamento...</span>
      </div>
    );
  }

  if (!data || !data.author) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <span className="text-muted-foreground">Contenuto non disponibile</span>
      </div>
    );
  }

  const shareUrl = buildContentShareUrl(data.type, data.id);
  const shareTitle =
    data.type === "photo"
      ? `Foto di ${data.author.displayName}`
      : data.type === "video"
        ? `Video di ${data.author.displayName}`
        : `Post di ${data.author.displayName}`;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <Link href={`/artist/${data.author.id}`}>
          <Avatar className="w-12 h-12 cursor-pointer">
            {data.author.avatarUrl && <AvatarImage src={data.author.avatarUrl} alt={data.author.displayName} />}
            <AvatarFallback className="bg-primary/10 text-primary">
              {data.author.displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/artist/${data.author.id}`}>
              <span className="font-medium cursor-pointer hover:text-primary">
                {data.author.displayName}
              </span>
            </Link>
            {data.author.role === "artist" && <Badge variant="secondary" className="text-xs">Artista</Badge>}
          </div>
          <span className="text-xs text-muted-foreground">@{data.author.username}</span>
          {data.createdAt && (
            <span className="text-xs text-muted-foreground block">
              {new Date(data.createdAt).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {data.content && (
          <p className="text-sm whitespace-pre-wrap break-words">
            <MentionText text={data.content} />
          </p>
        )}

        {renderMedia(data.mediaUrl)}

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled className="opacity-60">
            <Heart className="w-4 h-4" />
            <span className="text-xs ml-1">{data.likesCount ?? 0}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const result = await shareVibyngContent({
                title: shareTitle,
                text: data.content || shareTitle,
                mediaUrl: data.mediaUrl ?? undefined,
                fallbackUrl: shareUrl,
                shareUrl,
                fileName: `${data.type}-${data.id}`,
              });

              if (result === "copied") {
                toast({ title: "Link copiato!" });
              }
            }}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
