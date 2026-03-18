import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Zap, Gift, Star, Trophy, MessageCircle, Heart, Users, Image as ImageIcon, Video, Music, Edit, Play, Pause, Minus, UserMinus, UserPlus, Camera, Send, ImagePlus, Share2 } from "lucide-react";
import { Link } from "wouter";
import { useState, useRef } from "react";
import { useAudioPlayer, type Song } from "@/components/audio-player";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/App";
import { useUpload } from "@/hooks/use-upload";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User, ArtistPhoto, ArtistVideo, Post } from "@shared/schema";

function getCurrentUserId(): number {
  try {
    const stored = localStorage.getItem("vibyng-user");
    if (stored) return JSON.parse(stored).id || 1;
  } catch {}
  return 1;
}
const CURRENT_USER_ID = getCurrentUserId();

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function Points() {
  const { playSong, currentSong, isPlaying, togglePlay } = useAudioPlayer();
  const { toast } = useToast();
  const { profileData, updateProfile } = useProfile();
 const [myPlaylist, setMyPlaylist] = useState<Song[]>([]);
  const [postText, setPostText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<ArtistPhoto | null>(null);
  const [photoLikes, setPhotoLikes] = useState<Record<number, boolean>>({});
  const [photoComments, setPhotoComments] = useState<Record<number, string[]>>({});
  const [commentInput, setCommentInput] = useState("");

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users", CURRENT_USER_ID],
  });

  const { data: followedArtists = [] } = useQuery<User[]>({
    queryKey: ["/api/users", CURRENT_USER_ID, "following"],
  });

  const { data: myPhotos = [] } = useQuery<ArtistPhoto[]>({
    queryKey: ["/api/users", CURRENT_USER_ID, "photos"],
  });

  const { data: myVideos = [] } = useQuery<ArtistVideo[]>({
    queryKey: ["/api/users", CURRENT_USER_ID, "videos"],
  });

  const { data: myPosts = [] } = useQuery<(Post & { author: User })[]>({
    queryKey: ["/api/users", CURRENT_USER_ID, "posts"],
  });

  const unfollowMutation = useMutation({
    mutationFn: async (artistId: number) => {
      return apiRequest("DELETE", `/api/users/${CURRENT_USER_ID}/follow/${artistId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", CURRENT_USER_ID, "following"] });
    },
  });

  const { uploadFile, isUploading } = useUpload({
    onSuccess: async (response) => {
      const newAvatarUrl = response.objectPath;
      await updateProfile({ avatarUrl: newAvatarUrl });
      toast({
        title: "Foto profilo aggiornata",
        description: "La tua nuova immagine è stata salvata",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Non è stato possibile caricare l'immagine",
        variant: "destructive",
      });
    },
  });

  const handlePublishPost = async () => {
    if (!postText.trim()) {
      toast({
        title: "Post vuoto",
        description: "Scrivi qualcosa prima di pubblicare",
        variant: "destructive",
      });
      return;
    }
    try {
      await apiRequest("POST", "/api/posts", { authorId: CURRENT_USER_ID, content: postText });
      queryClient.invalidateQueries({ queryKey: ["/api/users", CURRENT_USER_ID, "posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Post pubblicato!",
        description: "Il tuo post è stato condiviso con la community",
      });
      setPostText("");
    } catch {
      toast({ title: "Errore", description: "Non è stato possibile pubblicare il post", variant: "destructive" });
    }
  };

 const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          body: JSON.stringify({ imageData, userId: CURRENT_USER_ID }),
        });
        await updateProfile({ avatarUrl: imageData });
        toast({ title: "Foto profilo aggiornata!", description: "La tua immagine è stata salvata" });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  } catch {
    toast({ title: "Errore", description: "Non è stato possibile caricare l'immagine", variant: "destructive" });
  }
};

 const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingType("photo");
    try {
      const imageData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX = 800;
            const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.7));
          };
          img.onerror = reject;
          img.src = reader.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await apiRequest("POST", `/api/users/${CURRENT_USER_ID}/photos`, {
        title: file.name.replace(/\.[^/.]+$/, ""),
        imageUrl: imageData,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users", CURRENT_USER_ID, "photos"] });
      await apiRequest("POST", "/api/posts", { authorId: CURRENT_USER_ID, content: "Ho condiviso una nuova foto!", mediaUrl: imageData });
      queryClient.invalidateQueries({ queryKey: ["/api/users", CURRENT_USER_ID, "posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({ title: "Foto caricata!", description: "La tua foto è stata aggiunta alla galleria e al feed" });
    } catch {
      toast({ title: "Errore", description: "Non è stato possibile caricare la foto", variant: "destructive" });
    } finally {
      setUploadingType(null);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingType("video");
    try {
      const presignRes = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      const { uploadURL, objectPath } = await presignRes.json();
      await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      await apiRequest("POST", `/api/users/${CURRENT_USER_ID}/videos`, {
        title: file.name.replace(/\.[^/.]+$/, ""),
        videoUrl: objectPath,
        thumbnailUrl: objectPath,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users", CURRENT_USER_ID, "videos"] });
      await apiRequest("POST", "/api/posts", { authorId: CURRENT_USER_ID, content: "Ho condiviso un nuovo video!", mediaUrl: objectPath });
      queryClient.invalidateQueries({ queryKey: ["/api/users", CURRENT_USER_ID, "posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({ title: "Video caricato!", description: "Il tuo video è stato aggiunto e condiviso nel feed" });
    } catch {
      toast({ title: "Errore", description: "Non è stato possibile caricare il video", variant: "destructive" });
    } finally {
      setUploadingType(null);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingType("music");
    try {
      const presignRes = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      const { uploadURL, objectPath } = await presignRes.json();
      await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      const newSong: Song = { id: Date.now(), title: file.name.replace(/\.[^/.]+$/, ""), artist: profileData.displayName, audioUrl: objectPath };
      setMyPlaylist(prev => [newSong, ...prev]);
      await apiRequest("POST", "/api/posts", { authorId: CURRENT_USER_ID, content: "Ho condiviso una nuova canzone!", mediaUrl: objectPath });
      queryClient.invalidateQueries({ queryKey: ["/api/users", CURRENT_USER_ID, "posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({ title: "Canzone caricata!", description: "La tua canzone è stata aggiunta alla playlist e al feed" });
    } catch {
      toast({ title: "Errore", description: "Non è stato possibile caricare la canzone", variant: "destructive" });
    } finally {
      setUploadingType(null);
      if (musicInputRef.current) musicInputRef.current.value = "";
    }
  };

  const handlePlaySong = (song: Song) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      playSong(song, myPlaylist);
    }
  };

  const handleRemoveFromPlaylist = (songId: number, songTitle: string) => {
    setMyPlaylist(prev => prev.filter(s => s.id !== songId));
    toast({
      title: "Rimosso dalla playlist",
      description: `"${songTitle}" è stato rimosso dalla tua playlist`,
    });
  };

  const handleUnfollowArtist = async (artistId: number, artistName: string) => {
    try {
      await unfollowMutation.mutateAsync(artistId);
      toast({
        title: "Non segui più",
        description: `Hai smesso di seguire ${artistName}`,
      });
    } catch {
      toast({ title: "Errore", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card data-testid="card-my-profile">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-3">
              <Avatar className="w-20 h-20" data-testid="avatar-me">
                {profileData.avatarUrl && <AvatarImage src={profileData.avatarUrl} alt={profileData.displayName} />}
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {profileData.displayName.charAt(0)}
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
            <h1 className="text-xl font-bold" data-testid="text-my-name">{profileData.displayName}</h1>
            <span className="text-sm text-muted-foreground">@{profileData.username}</span>
            <Badge variant="outline" className="mt-2" data-testid="badge-role">
              Fan
            </Badge>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium" data-testid="text-following">
                  {followedArtists.length} seguiti
                </span>
              </div>
              <div className="flex items-center gap-1 text-primary">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium" data-testid="text-my-points">{currentUser?.vibyngPoints ?? 0} VibyngPoints</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4 text-center" data-testid="text-my-bio">
            {profileData.bio}
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-write-post">
        <CardContent className="pt-4 pb-3">
          <div className="flex gap-3">
            <Avatar className="w-10 h-10 flex-shrink-0">
              {profileData.avatarUrl && <AvatarImage src={profileData.avatarUrl} alt={profileData.displayName} />}
              <AvatarFallback className="bg-primary/10 text-primary">
                {profileData.displayName.charAt(0)}
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
                  <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" data-testid="input-photo-upload" />
                  <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" data-testid="input-video-upload" />
                  <input ref={musicInputRef} type="file" accept="audio/*" onChange={handleMusicUpload} className="hidden" data-testid="input-music-upload" />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => photoInputRef.current?.click()} disabled={uploadingType === "photo"} data-testid="button-add-photo">
                    <ImagePlus className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => videoInputRef.current?.click()} disabled={uploadingType === "video"} data-testid="button-add-video">
                    <Video className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => musicInputRef.current?.click()} disabled={uploadingType === "music"} data-testid="button-add-music">
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
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="songs" className="px-1 text-xs" data-testid="tab-songs">
            <Music className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Musica</span>
          </TabsTrigger>
          <TabsTrigger value="photos" className="px-1 text-xs" data-testid="tab-photos">
            <ImageIcon className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Foto</span>
          </TabsTrigger>
          <TabsTrigger value="videos" className="px-1 text-xs" data-testid="tab-videos">
            <Video className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Video</span>
          </TabsTrigger>
          <TabsTrigger value="posts" className="px-1 text-xs" data-testid="tab-posts">
            <MessageCircle className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Post</span>
          </TabsTrigger>
          <TabsTrigger value="vpoints" className="px-1 text-xs" data-testid="tab-vpoints">
            <Zap className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">VPoints</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="songs" className="mt-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">Le tue canzoni preferite ({myPlaylist.length})</p>
              {myPlaylist.length > 0 ? (
                myPlaylist.map((song) => (
                  <Card key={song.id} className="hover-elevate" data-testid={`card-song-${song.id}`}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                          <Music className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate" data-testid={`text-song-title-${song.id}`}>{song.title}</h4>
                        <span className="text-xs text-muted-foreground">{song.artist} {song.duration ? `- ${formatDuration(song.duration)}` : ""}</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveFromPlaylist(song.id, song.title)}
                        data-testid={`button-remove-${song.id}`}
                      >
                        <Minus className="w-5 h-5 text-red-500" />
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
                <p className="text-center text-muted-foreground py-8">La tua playlist è vuota. Aggiungi canzoni dai profili degli artisti!</p>
              )}
            </div>

            <Card data-testid="card-followed-artists">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" />
                  Artisti che segui ({followedArtists.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {followedArtists.length > 0 ? (
                  followedArtists.map((artist) => (
                    <div key={artist.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30" data-testid={`item-followed-${artist.id}`}>
                      <Link href={`/artist/${artist.id}`}>
                        <Avatar className="w-10 h-10 cursor-pointer hover-elevate">
                          {artist.avatarUrl && <AvatarImage src={artist.avatarUrl} alt={artist.displayName} />}
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {artist.displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <Link href={`/artist/${artist.id}`} className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm hover:text-primary cursor-pointer">{artist.displayName}</h4>
                        <span className="text-xs text-muted-foreground">{artist.genre || "Artista"}</span>
                      </Link>
                      <Link href={`/chat/${artist.id}`}>
                        <Button size="icon" variant="ghost" data-testid={`button-chat-${artist.id}`}>
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => handleUnfollowArtist(artist.id, artist.displayName)}
                        data-testid={`button-unfollow-${artist.id}`}
                      >
                        <UserMinus className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4 text-sm">Non segui ancora nessun artista</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

       <TabsContent value="photos" className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">Le tue foto salvate ({myPhotos.length})</p>
          {myPhotos.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {myPhotos.map((photo) => (
                <Card key={photo.id} className="overflow-hidden hover-elevate cursor-pointer" onClick={() => setSelectedPhoto(photo)} data-testid={`card-photo-${photo.id}`}>
                  <img src={photo.imageUrl ?? undefined} alt={photo.title} className="w-full h-32 object-cover" />
                  <CardContent className="p-2">
                    <p className="text-xs text-muted-foreground truncate">{photo.title}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nessuna foto. Usa l'icona foto per caricare!</p>
          )}

          {selectedPhoto && (
            <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={() => setSelectedPhoto(null)}>
              <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
                <div className="w-full max-w-lg bg-background rounded-xl overflow-hidden">
                  <img src={selectedPhoto.imageUrl ?? undefined} alt={selectedPhoto.title} className="w-full max-h-[60vh] object-contain bg-black" />
                  <div className="p-4">
                    <p className="font-medium mb-3">{selectedPhoto.title}</p>
                    <div className="flex items-center gap-4 mb-4 border-b pb-3">
                      <button
                        className={`flex items-center gap-1 text-sm ${photoLikes[selectedPhoto.id] ? "text-red-500" : "text-muted-foreground"}`}
                        onClick={() => setPhotoLikes(prev => ({ ...prev, [selectedPhoto.id]: !prev[selectedPhoto.id] }))}
                      >
                        <Heart className={`w-5 h-5 ${photoLikes[selectedPhoto.id] ? "fill-red-500" : ""}`} />
                        {photoLikes[selectedPhoto.id] ? "Mi piace" : "Like"}
                      </button>
                      <button
                        className="flex items-center gap-1 text-sm text-muted-foreground"
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({ title: selectedPhoto.title, text: "Guarda questa foto su Vibyng!" });
                          } else {
                            navigator.clipboard.writeText(window.location.href);
                            toast({ title: "Link copiato!" });
                          }
                        }}
                      >
                        <Share2 className="w-5 h-5" />
                        Condividi
                      </button>
                      <button className="ml-auto text-muted-foreground text-lg" onClick={() => setSelectedPhoto(null)}>✕</button>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto mb-3">
                      {(photoComments[selectedPhoto.id] || []).map((c, i) => (
                        <p key={i} className="text-sm bg-muted rounded-lg px-3 py-1">{c}</p>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 text-sm border rounded-lg px-3 py-1 bg-background"
                        placeholder="Scrivi un commento..."
                        value={commentInput}
                        onChange={e => setCommentInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && commentInput.trim()) {
                            setPhotoComments(prev => ({ ...prev, [selectedPhoto.id]: [...(prev[selectedPhoto.id] || []), commentInput.trim()] }));
                            setCommentInput("");
                          }
                        }}
                      />
                      <button
                        className="text-sm text-primary font-medium px-2"
                        onClick={() => {
                          if (commentInput.trim()) {
                            setPhotoComments(prev => ({ ...prev, [selectedPhoto.id]: [...(prev[selectedPhoto.id] || []), commentInput.trim()] }));
                            setCommentInput("");
                          }
                        }}
                      >
                        Invia
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="videos" className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">I tuoi video salvati ({myVideos.length})</p>
          {myVideos.length > 0 ? (
            <div className="flex flex-col gap-3">
              {myVideos.map((video) => (
                <Card key={video.id} className="overflow-hidden hover-elevate" data-testid={`card-video-${video.id}`}>
                  <div className="relative">
                    {video.videoUrl ? (
                      <video src={video.videoUrl} controls className="w-full h-40 object-cover" />
                    ) : (
                      <>
                        <img src={video.thumbnailUrl ?? undefined} alt={video.title} className="w-full h-40 object-cover" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                            <Play className="w-6 h-6 text-primary ml-1" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h4 className="font-medium" data-testid={`text-video-title-${video.id}`}>{video.title}</h4>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nessun video. Usa l'icona video per caricare!</p>
          )}
        </TabsContent>

        <TabsContent value="posts" className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">I tuoi post ({myPosts.length})</p>
          {myPosts.length > 0 ? (
            <div className="flex flex-col gap-3">
              {myPosts.map((post) => (
                <Card key={post.id} className="hover-elevate" data-testid={`card-my-post-${post.id}`}>
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
                        <p className="text-sm mt-1" data-testid={`text-post-content-${post.id}`}>{post.content}</p>
                        <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                          <span className="flex items-center gap-1 text-xs">
                            <Heart className="w-3 h-3" />
                            {post.likesCount}
                          </span>
                          {post.isExclusive && (
                            <Badge variant="secondary" className="text-xs">Esclusivo</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Non hai ancora pubblicato nessun post. Scrivi il tuo primo post in alto!</p>
          )}
        </TabsContent>

        <TabsContent value="vpoints" className="mt-4">
          <div className="space-y-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20" data-testid="card-points-balance">
              <CardContent className="pt-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="w-8 h-8 text-primary" />
                  <span className="text-4xl font-bold text-primary" data-testid="text-total-points">{currentUser?.vibyngPoints ?? 0}</span>
                </div>
                <p className="text-sm text-muted-foreground">I tuoi VibyngPoints</p>
              </CardContent>
            </Card>

            <Card data-testid="card-earn-points">
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

            <Card data-testid="card-rewards">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
