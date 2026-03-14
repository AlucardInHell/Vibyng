import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music2, Target, Heart, Zap, ArrowLeft, Image, Video, Music, Play, Pause, Users, MessageCircle, Plus, Check, Camera, Send, ImagePlus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { useState, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { useAudioPlayer, type Song } from "@/components/audio-player";
import type { User, ArtistGoal, ArtistPhoto, ArtistVideo, ArtistSong } from "@shared/schema";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function ArtistProfile() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { playSong, currentSong, isPlaying, togglePlay } = useAudioPlayer();
  const [supportAmount, setSupportAmount] = useState("5");
  const [addedSongs, setAddedSongs] = useState<Set<number>>(new Set());
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [postText, setPostText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePublishPost = () => {
    if (!postText.trim()) {
      toast({
        title: "Post vuoto",
        description: "Scrivi qualcosa prima di pubblicare",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Post pubblicato!",
      description: "Il tuo post è stato condiviso con la community",
    });
    setPostText("");
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarUrl(event.target?.result as string);
        toast({
          title: "Foto profilo aggiornata",
          description: "La tua nuova immagine è stata caricata",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddToPlaylist = (songId: number, songTitle: string) => {
    if (addedSongs.has(songId)) {
      toast({
        title: "Già nella playlist",
        description: `"${songTitle}" è già nella tua playlist`,
      });
      return;
    }
    setAddedSongs(prev => new Set(prev).add(songId));
    toast({
      title: "Aggiunto alla playlist",
      description: `"${songTitle}" è stato aggiunto alla tua playlist`,
    });
  };

  const { data: artist, isLoading: artistLoading } = useQuery<User>({
    queryKey: [`/api/users/${id}`],
  });

  const { data: goals, isLoading: goalsLoading } = useQuery<ArtistGoal[]>({
    queryKey: [`/api/artists/${id}/goals`],
  });

  const { data: photos } = useQuery<ArtistPhoto[]>({
    queryKey: [`/api/artists/${id}/photos`],
  });

  const { data: videos } = useQuery<ArtistVideo[]>({
    queryKey: [`/api/artists/${id}/videos`],
  });

  const { data: songs } = useQuery<ArtistSong[]>({
    queryKey: [`/api/artists/${id}/songs`],
  });

  const { data: followersData } = useQuery<{ count: number }>({
    queryKey: [`/api/artists/${id}/followers/count`],
  });

  const supportMutation = useMutation({
    mutationFn: async (amount: string) => {
      return apiRequest("POST", "/api/supports", {
        fanId: 4,
        artistId: Number(id),
        amount: amount,
        message: "Supporto dall'app Vibyng",
        isSubscription: false,
      });
    },
    onSuccess: () => {
      toast({
        title: "Grazie per il supporto!",
        description: `Hai guadagnato 50 VibyngPoints`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/artists/${id}/goals`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${id}`] });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Non è stato possibile completare il supporto",
        variant: "destructive",
      });
    },
  });

  const handlePlaySong = (song: ArtistSong) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      const playlist: Song[] = (songs || []).map(s => ({
        id: s.id,
        title: s.title,
        artist: artist?.displayName || "Artista",
        audioUrl: s.audioUrl,
        coverUrl: s.coverUrl || undefined,
        duration: s.duration || undefined,
      }));
      
      playSong({
        id: song.id,
        title: song.title,
        artist: artist?.displayName || "Artista",
        audioUrl: song.audioUrl,
        coverUrl: song.coverUrl || undefined,
        duration: song.duration || undefined,
      }, playlist);
    }
  };

  if (artistLoading || goalsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <Music2 className="w-8 h-8 text-primary" />
          <span className="text-muted-foreground">Caricamento...</span>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <span className="text-muted-foreground">Artista non trovato</span>
        <Link href="/artists">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna agli artisti
          </Button>
        </Link>
      </div>
    );
  }

  const activeGoal = goals?.find((g) => !g.isCompleted);
  const progress = activeGoal
    ? (Number(activeGoal.currentAmount) / Number(activeGoal.targetAmount)) * 100
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <Link href="/artists">
        <Button variant="ghost" size="sm" className="mb-2" data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Indietro
        </Button>
      </Link>

      <Card data-testid="card-artist-profile">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-3">
              <Avatar className="w-20 h-20" data-testid="avatar-artist">
                {(avatarUrl || artist.avatarUrl) && (
                  <AvatarImage src={avatarUrl ?? artist.avatarUrl ?? undefined} alt={artist.displayName} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {artist.displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                data-testid="input-avatar-upload"
              />
              <Button
                size="icon"
                variant="secondary"
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-change-avatar"
              >
                <Camera className="w-3.5 h-3.5" />
              </Button>
            </div>
            <h1 className="text-xl font-bold" data-testid="text-artist-name">{artist.displayName}</h1>
            <span className="text-sm text-muted-foreground">@{artist.username}</span>
            {artist.genre && (
              <Badge variant="outline" className="mt-2" data-testid="badge-genre">
                {artist.genre}
              </Badge>
            )}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium" data-testid="text-followers">
                  {followersData?.count ?? 0} follower
                </span>
              </div>
              <div className="flex items-center gap-1 text-primary">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium" data-testid="text-points">{artist.vibyngPoints} VibyngPoints</span>
              </div>
            </div>
          </div>
          {artist.bio && (
            <p className="text-sm text-muted-foreground mt-4 text-center" data-testid="text-bio">
              {artist.bio}
            </p>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-write-post">
        <CardContent className="pt-4 pb-3">
          <div className="flex gap-3">
            <Avatar className="w-10 h-10 flex-shrink-0">
              {(avatarUrl || artist.avatarUrl) && (
                <AvatarImage src={avatarUrl ?? artist.avatarUrl ?? undefined} alt={artist.displayName} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary">
                {artist.displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea
                placeholder="A cosa stai pensando?"
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                className="resize-none border-0 bg-muted/50 focus-visible:ring-1"
                rows={2}
                data-testid="textarea-new-post"
              />
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" data-testid="button-add-photo">
                    <ImagePlus className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" data-testid="button-add-video">
                    <Video className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" data-testid="button-add-music">
                    <Music className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
                <Button 
                  size="sm" 
                  onClick={handlePublishPost}
                  disabled={!postText.trim()}
                  data-testid="button-publish-post"
                >
                  <Send className="w-4 h-4 mr-1" />
                  Pubblica
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="songs" className="w-full">
        <TabsList className="w-full grid grid-cols-4 p-1">
          <TabsTrigger value="songs" className="text-xs" data-testid="tab-songs">
            Canzoni
          </TabsTrigger>
          <TabsTrigger value="photos" className="text-xs" data-testid="tab-photos">
            Foto
          </TabsTrigger>
          <TabsTrigger value="videos" className="text-xs" data-testid="tab-videos">
            Video
          </TabsTrigger>
          <TabsTrigger value="messages" className="text-xs" data-testid="tab-messages">
            Messaggi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="songs" className="mt-4">
          <div className="flex flex-col gap-2">
            {songs && songs.length > 0 ? (
              songs.map((song) => (
                <Card key={song.id} className="hover-elevate" data-testid={`card-song-${song.id}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                      {song.coverUrl ? (
                        <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                          <Music className="w-6 h-6 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate" data-testid={`text-song-title-${song.id}`}>{song.title}</h4>
                      {song.duration && (
                        <span className="text-xs text-muted-foreground">{formatDuration(song.duration)}</span>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleAddToPlaylist(song.id, song.title)}
                      data-testid={`button-add-${song.id}`}
                    >
                      {addedSongs.has(song.id) ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <Plus className="w-5 h-5" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handlePlaySong(song)}
                      data-testid={`button-play-${song.id}`}
                    >
                      {currentSong?.id === song.id && isPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">Nessuna canzone disponibile</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="photos" className="mt-4">
          <div className="grid grid-cols-2 gap-2">
            {photos && photos.length > 0 ? (
              photos.map((photo) => (
                <Card key={photo.id} className="overflow-hidden hover-elevate" data-testid={`card-photo-${photo.id}`}>
                  <img src={photo.imageUrl} alt={photo.title || "Foto"} className="w-full h-32 object-cover" />
                  {photo.title && (
                    <CardContent className="p-2">
                      <p className="text-xs text-muted-foreground truncate">{photo.title}</p>
                    </CardContent>
                  )}
                </Card>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8 col-span-2">Nessuna foto disponibile</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="videos" className="mt-4">
          <div className="flex flex-col gap-3">
            {videos && videos.length > 0 ? (
              videos.map((video) => (
                <Card key={video.id} className="overflow-hidden hover-elevate" data-testid={`card-video-${video.id}`}>
                  <div className="relative">
                    {video.thumbnailUrl ? (
                      <img src={video.thumbnailUrl} alt={video.title} className="w-full h-40 object-cover" />
                    ) : (
                      <div className="w-full h-40 bg-primary/10 flex items-center justify-center">
                        <Video className="w-12 h-12 text-primary" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                        <Play className="w-6 h-6 text-primary ml-1" />
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <h4 className="font-medium" data-testid={`text-video-title-${video.id}`}>{video.title}</h4>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">Nessun video disponibile</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <Card data-testid="card-messages">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center py-8">
                <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Messaggi con {artist.displayName}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Invia un messaggio privato all'artista per interagire direttamente!
                </p>
                <Link href={`/chat/${artist.id}`}>
                  <Button data-testid="button-start-chat">
                    Inizia una conversazione
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {activeGoal && (
        <Card data-testid="card-goal">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Obiettivo Attivo</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="font-medium mb-1" data-testid="text-goal-title">{activeGoal.title}</h3>
            {activeGoal.description && (
              <p className="text-sm text-muted-foreground mb-3" data-testid="text-goal-description">
                {activeGoal.description}
              </p>
            )}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span data-testid="text-goal-current">{Number(activeGoal.currentAmount).toFixed(2)}</span>
                <span data-testid="text-goal-target">{Number(activeGoal.targetAmount).toFixed(2)}</span>
              </div>
              <Progress value={progress} className="h-2" data-testid="progress-goal" />
              <p className="text-xs text-muted-foreground text-center">
                {progress.toFixed(1)}% raggiunto
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {id !== "4" && (
        <Card data-testid="card-support">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Supporta l'artista</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Aiuta {artist.displayName} a raggiungere i suoi obiettivi!
            </p>
            <div className="flex gap-2 mb-3">
              {["5", "10", "25", "50"].map((amount) => (
                <Button
                  key={amount}
                  variant={supportAmount === amount ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSupportAmount(amount)}
                  data-testid={`button-amount-${amount}`}
                >
                  {amount}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                value={supportAmount}
                onChange={(e) => setSupportAmount(e.target.value)}
                min="1"
                className="flex-1"
                data-testid="input-custom-amount"
              />
              <Button
                onClick={() => supportMutation.mutate(supportAmount)}
                disabled={supportMutation.isPending}
                data-testid="button-support"
              >
                {supportMutation.isPending ? "..." : "Supporta"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Riceverai 50 VibyngPoints per il tuo supporto!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
