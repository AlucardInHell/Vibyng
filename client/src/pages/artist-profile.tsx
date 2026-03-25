import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music2, Target, Heart, Zap, Video, Music, Play, Pause, Users, MessageCircle, Plus, Check, Camera, Send, ImagePlus, UserPlus, UserMinus, ImageIcon, FileText, Calendar } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { useState, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAudioPlayer, type Song } from "@/components/audio-player";
import type { User, ArtistGoal, ArtistPhoto, ArtistVideo, ArtistSong, Post, Event } from "@shared/schema";

function getCurrentUserId(): number {
  try {
    const stored = localStorage.getItem("vibyng-user");
    if (stored) return JSON.parse(stored).id || 1;
  } catch {}
  return 1;
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "artist": return "Artista";
    case "rehearsal_studio": return "Sala Prove";
    case "recording_studio": return "Studio di Registrazione";
    case "record_label": return "Casa Discografica";
    default: return "Fan";
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function ArtistProfile() {
  const { id } = useParams<{ id: string }>();
  const artistId = Number(id);
  const currentUserId = getCurrentUserId();
  const isOwnProfile = artistId === currentUserId;

  const { toast } = useToast();
  const { playSong, currentSong, isPlaying, togglePlay } = useAudioPlayer();
  const [supportAmount, setSupportAmount] = useState("5");
  const [addedSongs, setAddedSongs] = useState<Set<number>>(new Set());
  const [postText, setPostText] = useState("");
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({ name: "", eventDate: "", city: "", venue: "", description: "", ticketUrl: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: artist, isLoading: artistLoading } = useQuery<User>({
    queryKey: [`/api/users/${id}`],
  });

  const { data: goals } = useQuery<ArtistGoal[]>({
    queryKey: [`/api/artists/${id}/goals`],
    enabled: !!artist && artist.role === "artist",
  });

  const { data: photos } = useQuery<ArtistPhoto[]>({
    queryKey: ["/api/users", artistId, "photos"],
  });

  const { data: videos } = useQuery<ArtistVideo[]>({
    queryKey: ["/api/users", artistId, "videos"],
  });

  const { data: songs } = useQuery<ArtistSong[]>({
    queryKey: [`/api/artists/${id}/songs`],
    enabled: !!artist && artist.role === "artist",
  });

  const { data: followersData } = useQuery<{ count: number }>({
    queryKey: [`/api/artists/${id}/followers/count`],
  });

  const { data: followingData } = useQuery<User[]>({
    queryKey: ["/api/users", artistId, "following"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${artistId}/following`);
      return res.json();
    },
  });

  const { data: followersList = [] } = useQuery<User[]>({
    queryKey: ["/api/users", artistId, "followers"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${artistId}/followers`);
      return res.json();
    },
  });

  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [connectionsTab, setConnectionsTab] = useState<"followers" | "following">("followers");

  const { data: isFollowingData } = useQuery<{ isFollowing: boolean }>({
    queryKey: ["/api/users", currentUserId, "following", artistId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${currentUserId}/following/${artistId}`);
      return res.json();
    },
    enabled: !isOwnProfile,
  });

  const { data: artistPosts = [] } = useQuery<(Post & { author: User })[]>({
    queryKey: ["/api/users", artistId, "posts"],
  });

  const { data: artistEvents = [] } = useQuery<Event[]>({
    queryKey: [`/api/artists/${id}/events`],
    enabled: !!artist && artist.role === "artist",
  });

const { data: profileAttendingEvents = [] } = useQuery<{ event: any }[]>({
    queryKey: ["/api/users", artistId, "events/attending"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${artistId}/events/attending`);
      return res.json();
    },
    enabled: !!artist && !isArtist,
  });
  
  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowingData?.isFollowing) {
        return apiRequest("DELETE", `/api/users/${currentUserId}/follow/${artistId}`);
      } else {
        return apiRequest("POST", `/api/users/${currentUserId}/follow/${artistId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId, "following", artistId] });
      queryClient.invalidateQueries({ queryKey: [`/api/artists/${id}/followers/count`] });
      toast({
        title: isFollowingData?.isFollowing ? "Non segui più" : "Ora segui",
        description: isFollowingData?.isFollowing
          ? `Hai smesso di seguire ${artist?.displayName}`
          : `Stai seguendo ${artist?.displayName}`,
      });
    },
  });

  const supportMutation = useMutation({
    mutationFn: async (amount: string) => {
      return apiRequest("POST", "/api/supports", {
        fanId: currentUserId,
        artistId: artistId,
        amount: amount,
        message: "Supporto dall'app Vibyng",
        isSubscription: false,
      });
    },
    onSuccess: () => {
      toast({ title: "Grazie per il supporto!", description: "Hai guadagnato 50 VibyngPoints" });
      queryClient.invalidateQueries({ queryKey: [`/api/artists/${id}/goals`] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Non è stato possibile completare il supporto", variant: "destructive" });
    },
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOwnProfile) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          const MAX = 400;
          const ratio = Math.min(MAX / img.width, MAX / img.height);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imageData = canvas.toDataURL("image/jpeg", 0.7);
          await fetch("/api/uploads/avatar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageData, userId: currentUserId }),
          });
          queryClient.invalidateQueries({ queryKey: [`/api/users/${id}`] });
          toast({ title: "Foto profilo aggiornata!" });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    } catch {
      toast({ title: "Errore", variant: "destructive" });
    }
  };

  const handlePublishPost = async () => {
    if (!postText.trim()) return;
    try {
      await apiRequest("POST", "/api/posts", { authorId: currentUserId, content: postText });
      queryClient.invalidateQueries({ queryKey: ["/api/users", artistId, "posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({ title: "Post pubblicato!" });
      setPostText("");
    } catch {
      toast({ title: "Errore", variant: "destructive" });
    }
  };

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

  const handleAddToPlaylist = (songId: number, songTitle: string) => {
    if (addedSongs.has(songId)) {
      toast({ title: "Già nella playlist", description: `"${songTitle}" è già nella tua playlist` });
      return;
    }
    setAddedSongs(prev => new Set(prev).add(songId));
    toast({ title: "Aggiunto alla playlist", description: `"${songTitle}" è stato aggiunto` });
  };

  if (artistLoading) {
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
    return null;
  }

  const isArtist = artist.role === "artist";
  const isFan = artist.role === "fan" || !artist.role;

  const activeGoal = goals?.find((g) => !g.isCompleted);
  const progress = activeGoal
    ? (Number(activeGoal.currentAmount) / Number(activeGoal.targetAmount)) * 100
    : 0;

  return (
    <div className="flex flex-col gap-4">

      {/* Card Profilo */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-3">
              <Avatar className="w-20 h-20">
                {artist.avatarUrl && <AvatarImage src={artist.avatarUrl} alt={artist.displayName} />}
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {artist.displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {isOwnProfile && (
                <>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
            <h1 className="text-xl font-bold">{artist.displayName}</h1>
            <span className="text-sm text-muted-foreground">@{artist.username}</span>
            <Badge variant="outline" className="mt-2">
              {getRoleLabel(artist.role || "fan")}
            </Badge>
            {artist.genre && (
              <Badge variant="secondary" className="mt-1">{artist.genre}</Badge>
            )}
           <div className="flex items-center gap-4 mt-3">
              <button
                className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                onClick={() => { setConnectionsTab("followers"); setConnectionsOpen(true); }}
              >
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">{(followersData?.count ?? 0) + (followingData?.length ?? 0)} connessioni</span>
              </button>
              <div className="flex items-center gap-1 text-primary">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">{artist.vibyngPoints} VibyngPoints</span>
              </div>
            </div>
            {!isOwnProfile && (
              <Button
                className="mt-3"
                variant={isFollowingData?.isFollowing ? "outline" : "default"}
                size="sm"
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
              >
                {isFollowingData?.isFollowing ? (
                  <><UserMinus className="w-4 h-4 mr-1" /> Non seguire più</>
                ) : (
                  <><UserPlus className="w-4 h-4 mr-1" /> Segui</>
                )}
              </Button>
            )}
          </div>
          {artist.bio && (
            <p className="text-sm text-muted-foreground mt-4 text-center">{artist.bio}</p>
          )}
        </CardContent>
      </Card>

      {/* Box scrivi post — solo sul proprio profilo */}
      {isOwnProfile && (
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex gap-3">
              <Avatar className="w-10 h-10 flex-shrink-0">
                {artist.avatarUrl && <AvatarImage src={artist.avatarUrl} alt={artist.displayName} />}
                <AvatarFallback className="bg-primary/10 text-primary">{artist.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea
                  placeholder="A cosa stai pensando?"
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  className="resize-none border-0 bg-muted/50 focus-visible:ring-1"
                  rows={2}
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <ImagePlus className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <Video className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <Music className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <Button size="sm" onClick={handlePublishPost} disabled={!postText.trim()}>
                    <Send className="w-4 h-4 mr-1" />
                    Pubblica
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full grid grid-cols-6 p-1">
          <TabsTrigger value="posts" className="px-1 text-xs">
            <FileText className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Post</span>
          </TabsTrigger>
          <TabsTrigger value="photos" className="px-1 text-xs">
            <ImageIcon className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Foto</span>
          </TabsTrigger>
          <TabsTrigger value="videos" className="px-1 text-xs">
            <Video className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Video</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="px-1 text-xs">
            <MessageCircle className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Messaggi</span>
          </TabsTrigger>
          {isFan && (
            <TabsTrigger value="following" className="px-1 text-xs">
              <Users className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Seguiti</span>
            </TabsTrigger>
          )}
          {isArtist && (
            <TabsTrigger value="songs" className="px-1 text-xs">
              <Music className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Canzoni</span>
            </TabsTrigger>
          )}
         <TabsTrigger value="events" className="px-1 text-xs">
            <Calendar className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Eventi</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Post */}
        <TabsContent value="posts" className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">Post ({artistPosts.length})</p>
          {artistPosts.length > 0 ? (
            <div className="flex flex-col gap-3">
              {artistPosts.map((post) => (
                <Card key={post.id} className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={post.author.avatarUrl || undefined} alt={post.author.displayName} />
                        <AvatarFallback>{post.author.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{post.author.displayName}</span>
                          <span className="text-xs text-muted-foreground">
                            {post.createdAt ? new Date(post.createdAt).toLocaleDateString("it-IT") : ""}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{post.content}</p>
                        {post.mediaUrl && (
                          <img src={post.mediaUrl} alt="media" className="w-full mt-2 rounded-lg max-h-60 object-cover" />
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <button
                            className={`flex items-center gap-1 text-xs ${likedPosts.has(post.id) ? "text-red-500" : "text-muted-foreground"}`}
                            onClick={async () => {
                              const newLiked = new Set(likedPosts);
                              if (newLiked.has(post.id)) {
                                newLiked.delete(post.id);
                                await apiRequest("POST", `/api/posts/${post.id}/unlike`);
                              } else {
                                newLiked.add(post.id);
                                await apiRequest("POST", `/api/posts/${post.id}/like`);
                              }
                              setLikedPosts(new Set(newLiked));
                              queryClient.invalidateQueries({ queryKey: ["/api/users", artistId, "posts"] });
                            }}
                          >
                            <Heart className={`w-3 h-3 ${likedPosts.has(post.id) ? "fill-red-500" : ""}`} />
                            {post.likesCount}
                          </button>
                          {isOwnProfile && (
                            <button
                              className="text-xs text-red-400 hover:text-red-600 ml-auto"
                              onClick={async () => {
                                try {
                                  await apiRequest("DELETE", `/api/posts/${post.id}`);
                                  queryClient.invalidateQueries({ queryKey: ["/api/users", artistId, "posts"] });
                                  queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
                                  toast({ title: "Post eliminato" });
                                } catch {
                                  toast({ title: "Errore", variant: "destructive" });
                                }
                              }}
                            >🗑️</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nessun post ancora.</p>
          )}
        </TabsContent>

        {/* Tab Foto */}
        <TabsContent value="photos" className="mt-4">
          <div className="grid grid-cols-2 gap-2">
            {photos && photos.length > 0 ? (
              photos.map((photo) => (
                <Card key={photo.id} className="overflow-hidden hover-elevate">
                  <img src={photo.imageUrl ?? undefined} alt={photo.title || "Foto"} className="w-full h-32 object-cover" />
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

        {/* Tab Video */}
        <TabsContent value="videos" className="mt-4">
          <div className="flex flex-col gap-3">
            {videos && videos.length > 0 ? (
              videos.map((video) => (
                <Card key={video.id} className="overflow-hidden hover-elevate">
                  <div className="relative">
                    {video.videoUrl ? (
                      <video src={video.videoUrl} controls className="w-full h-40 object-cover" />
                    ) : video.thumbnailUrl ? (
                      <img src={video.thumbnailUrl} alt={video.title} className="w-full h-40 object-cover" />
                    ) : (
                      <div className="w-full h-40 bg-primary/10 flex items-center justify-center">
                        <Video className="w-12 h-12 text-primary" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h4 className="font-medium">{video.title}</h4>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">Nessun video disponibile</p>
            )}
          </div>
        </TabsContent>

        {/* Tab Canzoni — solo Artista */}
        {isArtist && (
          <TabsContent value="songs" className="mt-4">
            <div className="flex flex-col gap-2">
              {songs && songs.length > 0 ? (
                songs.map((song) => (
                  <Card key={song.id} className="hover-elevate">
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
                        <h4 className="font-medium truncate">{song.title}</h4>
                        {song.duration && <span className="text-xs text-muted-foreground">{formatDuration(song.duration)}</span>}
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => handleAddToPlaylist(song.id, song.title)}>
                        {addedSongs.has(song.id) ? <Check className="w-5 h-5 text-green-500" /> : <Plus className="w-5 h-5" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handlePlaySong(song)}>
                        {currentSong?.id === song.id && isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">Nessuna canzone disponibile</p>
              )}
            </div>
          </TabsContent>
        )}

        {/* Tab Seguiti — solo Fan */}
        {isFan && (
          <TabsContent value="following" className="mt-4">
            <p className="text-center text-muted-foreground py-8">Profili seguiti da {artist.displayName}</p>
          </TabsContent>
        )}

        {/* Tab Eventi — solo Artista */}
          <TabsContent value="events" className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Eventi ({artistEvents.length})</p>
              {isOwnProfile && (
                <Button size="sm" variant="outline" onClick={() => setShowEventForm(!showEventForm)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Aggiungi
                </Button>
              )}
            </div>
            {isOwnProfile && showEventForm && (
              <Card className="mb-3">
                <CardContent className="p-4 space-y-3">
                  <Input placeholder="Nome evento *" value={eventForm.name} onChange={e => setEventForm(p => ({ ...p, name: e.target.value }))} />
                  <Input type="datetime-local" value={eventForm.eventDate} onChange={e => setEventForm(p => ({ ...p, eventDate: e.target.value }))} />
                  <Input placeholder="Città" value={eventForm.city} onChange={e => setEventForm(p => ({ ...p, city: e.target.value }))} />
                  <Input placeholder="Venue / Locale" value={eventForm.venue} onChange={e => setEventForm(p => ({ ...p, venue: e.target.value }))} />
                  <Textarea placeholder="Descrizione (opzionale)" value={eventForm.description} onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))} rows={2} />
                  <Input placeholder="Link biglietti (opzionale)" value={eventForm.ticketUrl} onChange={e => setEventForm(p => ({ ...p, ticketUrl: e.target.value }))} />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setShowEventForm(false)}>Annulla</Button>
                    <Button className="flex-1" onClick={async () => {
                      if (!eventForm.name || !eventForm.eventDate) {
                        toast({ title: "Compila nome e data", variant: "destructive" });
                        return;
                      }
                      try {
                        await apiRequest("POST", `/api/artists/${id}/events`, { ...eventForm, eventDate: new Date(eventForm.eventDate).toISOString() });
                        queryClient.invalidateQueries({ queryKey: [`/api/artists/${id}/events`] });
                        setShowEventForm(false);
                        setEventForm({ name: "", eventDate: "", city: "", venue: "", description: "", ticketUrl: "" });
                        toast({ title: "Evento aggiunto!" });
                      } catch {
                        toast({ title: "Errore", variant: "destructive" });
                      }
                    }}>Salva</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {artistEvents.length > 0 ? (
              <div className="flex flex-col gap-3">
                {artistEvents.map((event) => (
                  <Card key={event.id} className="hover-elevate">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium">{event.name}</h4>
                          <p className="text-sm text-primary mt-1">
                            {new Date(event.eventDate).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                          {(event.city || event.venue) && (
                            <p className="text-sm text-muted-foreground mt-1">
                              📍 {[event.venue, event.city].filter(Boolean).join(" — ")}
                            </p>
                          )}
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
                          )}
                          {event.ticketUrl && (
                            <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline mt-2 inline-block">
                              🎟️ Acquista biglietti
                            </a>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {!isOwnProfile && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                 await apiRequest("POST", `/api/events/${event.id}/attend`, { userId: currentUserId });
                                  queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId, "events/attending"] });
                                  toast({ title: "Partecipi all'evento! 🎉" });
                                } catch {
                                  toast({ title: "Errore", variant: "destructive" });
                                }
                              }}
                            >
                              <Calendar className="w-3 h-3 mr-1" />
                              Partecipo
                            </Button>
                          )}
                          {isOwnProfile && (
                            <button
                              className="text-xs text-red-400 hover:text-red-600"
                              onClick={async () => {
                                try {
                                  await apiRequest("DELETE", `/api/events/${event.id}`);
                                  queryClient.invalidateQueries({ queryKey: [`/api/artists/${id}/events`] });
                                  toast({ title: "Evento eliminato" });
                                } catch {
                                  toast({ title: "Errore", variant: "destructive" });
                                }
                              }}
                            >🗑️</button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              {!isArtist && profileAttendingEvents.length > 0 ? (
                <div className="flex flex-col gap-3 mt-2">
                  <p className="text-sm text-muted-foreground">Eventi a cui partecipa</p>
                  {profileAttendingEvents.map(({ event }) => (
                    <Card key={event.id} className="hover-elevate">
                      <CardContent className="p-4">
                        <h4 className="font-medium">{event.name}</h4>
                        <p className="text-sm text-primary mt-1">
                          {new Date(event.eventDate).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                        {(event.city || event.venue) && (
                          <p className="text-sm text-muted-foreground mt-1">
                            📍 {[event.venue, event.city].filter(Boolean).join(" — ")}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nessun evento in programma</p>
              )}
            )}
          </TabsContent>

        {/* Tab Messaggi */}
        <TabsContent value="messages" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center py-8">
                <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Messaggi con {artist.displayName}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Invia un messaggio privato per interagire direttamente!
                </p>
                <Link href={`/chat/${artist.id}`}>
                  <Button>Inizia una conversazione</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Obiettivo attivo — solo Artista */}
      {isArtist && activeGoal && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Obiettivo Attivo</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="font-medium mb-1">{activeGoal.title}</h3>
            {activeGoal.description && (
              <p className="text-sm text-muted-foreground mb-3">{activeGoal.description}</p>
            )}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{Number(activeGoal.currentAmount).toFixed(2)}</span>
                <span>{Number(activeGoal.targetAmount).toFixed(2)}</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">{progress.toFixed(1)}% raggiunto</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supporto — solo Artista e non il proprio profilo */}
      {isArtist && !isOwnProfile && (
        <Card>
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
                >
                  {amount}€
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
              />
              <Button
                onClick={() => supportMutation.mutate(supportAmount)}
                disabled={supportMutation.isPending}
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
   <Dialog open={connectionsOpen} onOpenChange={setConnectionsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Connessioni</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-4">
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${connectionsTab === "followers" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              onClick={() => setConnectionsTab("followers")}
            >
              Follower ({followersList.length})
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${connectionsTab === "following" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              onClick={() => setConnectionsTab("following")}
            >
              Seguiti ({followingData?.length ?? 0})
            </button>
          </div>
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {connectionsTab === "followers" ? (
              followersList.length > 0 ? followersList.map(user => (
                <Link key={user.id} href={`/artist/${user.id}`} onClick={() => setConnectionsOpen(false)}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover-elevate cursor-pointer">
                    <Avatar className="w-10 h-10">
                      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.displayName} />}
                      <AvatarFallback className="bg-primary/10 text-primary">{user.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{user.displayName}</p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                  </div>
                </Link>
              )) : <p className="text-center text-muted-foreground py-4 text-sm">Nessun follower ancora</p>
            ) : (
              followingData && followingData.length > 0 ? followingData.map(user => (
                <Link key={user.id} href={`/artist/${user.id}`} onClick={() => setConnectionsOpen(false)}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover-elevate cursor-pointer">
                    <Avatar className="w-10 h-10">
                      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.displayName} />}
                      <AvatarFallback className="bg-primary/10 text-primary">{user.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{user.displayName}</p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                  </div>
                </Link>
              )) : <p className="text-center text-muted-foreground py-4 text-sm">Non segue ancora nessuno</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
