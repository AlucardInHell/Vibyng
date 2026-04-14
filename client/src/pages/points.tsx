import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Zap, Gift, Star, Trophy, MessageCircle, Heart, Users, Image as ImageIcon, Video, Music, Edit, Play, Pause, Minus, UserMinus, UserPlus, Camera, Send, ImagePlus, Share2, FileText, Calendar, Plus } from "lucide-react";
import { Link } from "wouter";
import { useState, useRef } from "react";
import { useAudioPlayer, type Song } from "@/components/audio-player";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/App";
import { useUpload } from "@/hooks/use-upload";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMention } from "@/hooks/use-mention";
import { MentionDropdown } from "@/components/mention-dropdown";
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

function MePostComments({ postId, postAuthorId }: { postId: number; postAuthorId: number }) {
  const [newComment, setNewComment] = useState("");

  const { data: comments = [], refetch } = useQuery<any[]>({
    queryKey: ["/api/posts", postId, "comments"],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postId}/comments`);
      return res.json();
    },
  });

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    await apiRequest("POST", `/api/posts/${postId}/comments`, { authorId: CURRENT_USER_ID, content: newComment.trim() });
    setNewComment("");
    refetch();
  };

  return (
    <div className="border-t pt-3 mt-2 space-y-3">
      <div className="flex items-center gap-2">
       <div className="relative flex-1">
          <Input placeholder="Scrivi un commento..." value={newComment} onChange={e => { setNewComment(e.target.value); }} className="flex-1 w-full" onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }} />
        </div>
        <Button size="icon" onClick={handleSubmit} disabled={!newComment.trim()}><Send className="w-4 h-4" /></Button>
      </div>
      {comments.map((comment: any) => (
        <div key={comment.id} className="flex gap-2">
          <Avatar className="w-8 h-8">
            {comment.author?.avatarUrl && <AvatarImage src={comment.author.avatarUrl} alt={comment.author.displayName} />}
            <AvatarFallback className="bg-primary/10 text-primary text-xs">{comment.author?.displayName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 bg-muted rounded-lg px-3 py-2">
            <p className="text-sm font-semibold">{comment.author?.displayName}</p>
            <p className="text-sm">{comment.content}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                {comment.createdAt && new Date(comment.createdAt).toLocaleDateString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
              <div className="flex items-center gap-2">
                {(Number(comment.authorId) === Number(CURRENT_USER_ID) || Number(postAuthorId) === Number(CURRENT_USER_ID)) && (
                  <button className="text-xs text-red-400 hover:text-red-600" onClick={async () => { await apiRequest("DELETE", `/api/comments/${comment.id}`); refetch(); }}>🗑️</button>
                )}
                <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500" onClick={async () => { await apiRequest("POST", `/api/comments/${comment.id}/like`); refetch(); }}>
                  <Heart className="w-3 h-3" /><span>{comment.likesCount ?? 0}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Points() {
  const { playSong, currentSong, isPlaying, togglePlay } = useAudioPlayer();
  const { toast } = useToast();
  const { profileData, updateProfile } = useProfile();
  const [myPlaylist, setMyPlaylist] = useState<Song[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [openCommentsPosts, setOpenCommentsPosts] = useState<Set<number>>(new Set());
  const [postText, setPostText] = useState("");
  const { mentionQuery, showMentions, handleTextChange, insertMention, closeMentions } = useMention();
  const { mentionQuery: commentMentionQuery, showMentions: showCommentMentions, handleTextChange: handleCommentTextChange, insertMention: insertCommentMention, closeMentions: closeCommentMentions } = useMention();
  const { mentionQuery: photoMentionQuery, showMentions: showPhotoMentions, handleTextChange: handlePhotoTextChange, insertMention: insertPhotoMention, closeMentions: closePhotoMentions } = useMention();
  const { mentionQuery: videoMentionQuery, showMentions: showVideoMentions, handleTextChange: handleVideoTextChange, insertMention: insertVideoMention, closeMentions: closeVideoMentions } = useMention();
  const { mentionQuery: photoCommentMentionQuery, showMentions: showPhotoCommentMentions, handleTextChange: handlePhotoCommentTextChange, insertMention: insertPhotoCommentMention, closeMentions: closePhotoCommentMentions } = useMention();
  const { mentionQuery: videoCommentMentionQuery, showMentions: showVideoCommentMentions, handleTextChange: handleVideoCommentTextChange, insertMention: insertVideoCommentMention, closeMentions: closeVideoCommentMentions } = useMention();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<ArtistPhoto | null>(null);
  const [photoLikes, setPhotoLikes] = useState<Record<number, boolean>>({});
  const [photoComments, setPhotoComments] = useState<Record<number, string[]>>({});
  const [commentInput, setCommentInput] = useState("");
  const { data: selectedPhotoLiveData } = useQuery<any>({
    queryKey: ["/api/photos", selectedPhoto?.id, "livedata"],
    queryFn: async () => {
      if (!selectedPhoto?.id) return null;
      const res = await fetch(`/api/users/${CURRENT_USER_ID}/photos?t=${Date.now()}`);
      const photos = await res.json();
      return photos.find((p: any) => p.id === selectedPhoto.id) || null;
    },
    enabled: !!selectedPhoto?.id,
    refetchInterval: 10000,
    staleTime: 0,
  });
  const { data: photoCommentsList = [], refetch: refetchPhotoComments } = useQuery<any[]>({
    queryKey: ["/api/photos", selectedPhoto?.id, "comments"],
    queryFn: async () => {
      if (!selectedPhoto?.id) return [];
  const res = await fetch(`/api/photos/${selectedPhoto.id}/comments?userId=${CURRENT_USER_ID}`);
      return res.json();
    },
    enabled: !!selectedPhoto?.id,
    staleTime: 0,
  });
  const [pendingPhoto, setPendingPhoto] = useState<{ imageData: string; title: string } | null>(null);
  const [pendingPostText, setPendingPostText] = useState("");
  const [pendingVideo, setPendingVideo] = useState<{ videoData: string; title: string; url?: string } | null>(null);
  const [pendingVideoText, setPendingVideoText] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [videoCommentInput, setVideoCommentInput] = useState("");
  const [videoLikeCount, setVideoLikeCount] = useState<Record<number, number>>({});
  const { data: videoCommentsList = [], refetch: refetchVideoComments } = useQuery<any[]>({
  queryKey: ["/api/videos", selectedVideo?.id, "comments", CURRENT_USER_ID],
  queryFn: async () => {
    if (!selectedVideo?.id) return [];
    const res = await fetch(`/api/videos/${selectedVideo.id}/comments?userId=${CURRENT_USER_ID}`);
    return res.json();
  },
    enabled: !!selectedVideo?.id,
    staleTime: 0,
  });
  const { data: videoLikeData, refetch: refetchVideoLike } = useQuery<{ liked: boolean }>({
  queryKey: ["/api/videos", selectedVideo?.id, "liked", CURRENT_USER_ID],
  queryFn: async () => {
    if (!selectedVideo?.id) return { liked: false };
    const res = await fetch(`/api/videos/${selectedVideo.id}/liked/${CURRENT_USER_ID}`);
    return res.json();
  },
  enabled: !!selectedVideo?.id,
  staleTime: 0,
});

const isVideoLiked = videoLikeData?.liked ?? false;
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({ name: "", eventDate: "", city: "", venue: "", description: "", ticketUrl: "" });
  
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users", CURRENT_USER_ID],
  });

  const { data: followedArtists = [] } = useQuery<User[]>({
    queryKey: ["/api/users", CURRENT_USER_ID, "following"],
  });
  const { data: followersData } = useQuery<{ count: number }>({
    queryKey: [`/api/artists/${CURRENT_USER_ID}/followers/count`],
  });
  const { data: myPhotos = [] } = useQuery<ArtistPhoto[]>({
    queryKey: ["/api/users", CURRENT_USER_ID, "photos"],
  });

  const { data: followersList = [] } = useQuery<User[]>({
    queryKey: ["/api/users", CURRENT_USER_ID, "followers"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${CURRENT_USER_ID}/followers`);
      return res.json();
    },
  });

  const { data: myArtistEvents = [] } = useQuery<any[]>({
    queryKey: [`/api/artists/${CURRENT_USER_ID}/events`],
    enabled: true,
  });
  const { data: attendingEvents = [] } = useQuery<{ event: any }[]>({
    queryKey: ["/api/users", CURRENT_USER_ID, "events/attending"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${CURRENT_USER_ID}/events/attending`);
      return res.json();
    },
  });
  
  const { data: myVideos = [] } = useQuery<ArtistVideo[]>({
    queryKey: ["/api/users", CURRENT_USER_ID, "videos"],
  });

  const { data: myPosts = [] } = useQuery<(Post & { author: User })[]>({
    queryKey: ["/api/users", CURRENT_USER_ID, "posts"],
  });

const { data: likedPostIds = [], refetch: refetchLikes } = useQuery<number[]>({
    queryKey: ["/api/likes", CURRENT_USER_ID, "posts"],
    queryFn: async () => {
      if (!myPosts || myPosts.length === 0) return [];
      const results = await Promise.all(
        myPosts.map(async (post) => {
          const res = await fetch(`/api/posts/${post.id}/liked/${CURRENT_USER_ID}`);
          const data = await res.json();
          return data.liked ? Number(post.id) : null;
        })
      );
      return results.filter(Boolean) as number[];
    },
    enabled: myPosts.length > 0,
    staleTime: 0,
  });
  
  const { data: mySongs = [] } = useQuery<any[]>({
    queryKey: [`/api/artists/${CURRENT_USER_ID}/songs`],
    enabled: true,
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
      queryClient.invalidateQueries({ queryKey: ["/api/posts", CURRENT_USER_ID] });
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
      if (!pendingPhoto) {
        setPendingPhoto({ imageData, title: file.name.replace(/\.[^/.]+$/, "") });
      }
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
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "File troppo grande", description: "Il video deve essere inferiore a 50MB", variant: "destructive" });
      return;
    }
    setUploadingType("video");
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
    const videoData = reader.result as string;
          setPendingVideo({ videoData, title: file.name.replace(/\.[^/.]+$/, "") });
        } catch {
          toast({ title: "Errore", description: "Non è stato possibile caricare il video", variant: "destructive" });
        } finally {
          setUploadingType(null);
          if (videoInputRef.current) videoInputRef.current.value = "";
        }
      };
      reader.readAsDataURL(file);
    } catch {
      toast({ title: "Errore", variant: "destructive" });
      setUploadingType(null);
    }
  };

 const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File troppo grande", description: "Il file MP3 deve essere inferiore a 10MB", variant: "destructive" });
      return;
    }
    setUploadingType("music");
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const audioData = reader.result as string;
          const audioDuration = await new Promise<number>((resolve) => {
            const audio = new Audio();
            audio.src = audioData;
            audio.onloadedmetadata = () => resolve(Math.round(audio.duration));
            audio.onerror = () => resolve(0);
          });
          const uploadRes = await fetch("/api/uploads/audio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audioData, title: file.name.replace(/\.[^/.]+$/, ""), artistId: CURRENT_USER_ID }),
          });
         const { url } = await uploadRes.json();
          await apiRequest("POST", `/api/artists/${CURRENT_USER_ID}/songs`, {
            title: file.name.replace(/\.[^/.]+$/, ""),
            audioUrl: url,
            artistId: CURRENT_USER_ID,
            duration: audioDuration,
          });
          queryClient.invalidateQueries({ queryKey: [`/api/artists/${CURRENT_USER_ID}/songs`] });
          toast({ title: "Canzone caricata!", description: "La tua canzone è ora visibile nel tuo profilo" });
        } catch {
          toast({ title: "Errore", description: "Non è stato possibile salvare la canzone", variant: "destructive" });
        } finally {
          setUploadingType(null);
          if (musicInputRef.current) musicInputRef.current.value = "";
        }
      };
      reader.readAsDataURL(file);
    } catch {
      toast({ title: "Errore", variant: "destructive" });
      setUploadingType(null);
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
              {currentUser?.role === "artist" ? "Artista" : 
               currentUser?.role === "rehearsal_studio" ? "Sala Prove" :
               currentUser?.role === "recording_studio" ? "Studio di Registrazione" :
               currentUser?.role === "record_label" ? "Casa Discografica" : "Fan"}
            </Badge>
            <div className="flex items-center gap-4 mt-3">
             <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium" data-testid="text-followers">
                  {followersData?.count ?? 0} follower
                </span>
              </div>
             <Link href="/vpoints">
                <div className="flex items-center gap-1 text-primary cursor-pointer hover:opacity-80">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-medium" data-testid="text-my-points">{currentUser?.vibyngPoints ?? 0} VibyngPoints</span>
                </div>
              </Link>
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
              <div className="relative">
                <Textarea
                  placeholder="A cosa stai pensando?"
                  value={postText}
                  onChange={(e) => {
                    setPostText(e.target.value);
                    handleTextChange(e.target.value, e.target.selectionStart || 0);
                  }}
                  className="resize-none border-0 bg-muted/50 focus-visible:ring-1"
                  rows={2}
                  data-testid="textarea-new-post"
                />
                <MentionDropdown
                  query={mentionQuery}
                  visible={showMentions}
                  onSelect={(username) => {
                    setPostText(insertMention(postText, username));
                    closeMentions();
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept={currentUser?.role === "artist" ? "image/*,video/*,audio/*" : "image/*,video/*"}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.type.startsWith("image/")) {
                        handlePhotoUpload(e as any);
                      } else if (file.type.startsWith("video/")) {
                        handleVideoUpload(e as any);
                      } else if (file.type.startsWith("audio/")) {
                        handleMusicUpload(e as any);
                      }
                    }}
                    className="hidden"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingType === "photo" || uploadingType === "video"}
                  >
                    <ImagePlus className="w-4 h-4 text-muted-foreground" />
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
       <TabsList className={`w-full grid ${currentUser?.role === "artist" ? "grid-cols-6" : "grid-cols-6"} `}>
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
            <FileText className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Post</span>
          </TabsTrigger>
        <TabsTrigger value="events" className="px-1 text-xs">
            <Calendar className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Eventi</span>
          </TabsTrigger>
         <TabsTrigger value="connections" className="px-1 text-xs">
            <Users className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Connessioni</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="songs" className="mt-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Le tue canzoni ({mySongs.length})</p>
            {mySongs.length > 0 ? (
              mySongs.map((song: any) => (
                <Card key={song.id} className="hover-elevate">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center">
                      {song.coverUrl ? (
                        <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                      ) : (
                        <Music className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{song.title}</h4>
                      {song.duration && <span className="text-xs text-muted-foreground">{formatDuration(song.duration)}</span>}
                    </div>
                 <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          if (currentUser?.role === "artist") {
                            await apiRequest("DELETE", `/api/songs/${song.id}`);
                            queryClient.invalidateQueries({ queryKey: [`/api/artists/${CURRENT_USER_ID}/songs`] });
                            toast({ title: "Canzone eliminata" });
                          } else {
                            await apiRequest("DELETE", `/api/users/${CURRENT_USER_ID}/playlist/${song.id}`);
                            queryClient.invalidateQueries({ queryKey: [`/api/artists/${CURRENT_USER_ID}/songs`] });
                            toast({ title: "Rimossa dalla playlist" });
                          }
                        } catch {
                          toast({ title: "Errore", variant: "destructive" });
                        }
                      }}
                    >
                      <Minus className="w-5 h-5 text-red-500" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        const s = { id: song.id, title: song.title, artist: profileData.displayName, audioUrl: song.audioUrl, coverUrl: song.coverUrl, duration: song.duration };
                        if (currentSong?.id === song.id) { togglePlay(); } else { playSong(s, mySongs.map((x: any) => ({ id: x.id, title: x.title, artist: profileData.displayName, audioUrl: x.audioUrl }))); }
                      }}
                    >
                      {currentSong?.id === song.id && isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">Nessuna canzone ancora.</p>
            )}
          </div>
        </TabsContent>

       <TabsContent value="photos" className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">Le tue foto salvate ({myPhotos.length})</p>
          {myPhotos.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {myPhotos.map((photo) => (
                <Card key={photo.id} className="overflow-hidden hover-elevate cursor-pointer" onClick={() => setSelectedPhoto(photo)} data-testid={`card-photo-${photo.id}`}>
                  <img src={photo.imageUrl ?? undefined} alt={photo.title} className="w-full h-32 object-cover" />
               {photo.title && photo.title !== "Foto" && (
                    <CardContent className="p-2">
                      <p className="text-xs text-muted-foreground truncate">{photo.title}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nessuna foto. Usa l'icona foto per caricare!</p>
          )}

          {selectedPhoto && (
  <div className="fixed inset-0 z-[80] bg-black/90 flex flex-col" onClick={() => setSelectedPhoto(null)}>
    <div className="flex-1 flex items-start justify-center p-2 sm:p-4" onClick={e => e.stopPropagation()}>
      <div
        className="w-full max-w-lg bg-background rounded-xl overflow-hidden h-[100dvh] sm:h-auto sm:max-h-[90dvh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={selectedPhoto.imageUrl ?? undefined}
          alt={selectedPhoto.title}
          className="w-full max-h-[32dvh] sm:max-h-[40vh] object-contain bg-black flex-shrink-0"
        />

        <div className="p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
          {selectedPhoto.title && selectedPhoto.title !== "Foto" && (
            <p className="font-medium">{selectedPhoto.title}</p>
          )}

          <p className="text-xs text-muted-foreground mb-3">
            {selectedPhoto.createdAt && (() => {
              const dateStr =
                selectedPhoto.createdAt.toString().replace(" ", "T") +
                (selectedPhoto.createdAt.toString().includes("Z") ? "" : "Z");
              return new Date(dateStr).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
            })()}
          </p>

          <div className="flex items-center gap-4 mb-4 border-b pb-3">
            <button
              className="flex items-center gap-1 text-sm text-muted-foreground opacity-50 cursor-not-allowed"
              disabled={true}
            >
              <Heart className="w-5 h-5" />
              <span>{selectedPhotoLiveData?.likesCount ?? selectedPhoto.likesCount ?? 0}</span>
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

            <button
              className="flex items-center gap-1 text-sm text-red-500"
              onClick={async () => {
                try {
                  await apiRequest("DELETE", `/api/users/${CURRENT_USER_ID}/photos/${selectedPhoto.id}`);
                  queryClient.invalidateQueries({ queryKey: ["/api/users", CURRENT_USER_ID, "photos"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/posts", CURRENT_USER_ID] });
                  setSelectedPhoto(null);
                  toast({ title: "Foto eliminata" });
                } catch {
                  toast({
                    title: "Errore",
                    description: "Non è stato possibile eliminare la foto",
                    variant: "destructive",
                  });
                }
              }}
            >
              🗑️
            </button>

            <button className="ml-auto text-muted-foreground text-lg" onClick={() => setSelectedPhoto(null)}>
              ✕
            </button>
          </div>

         <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
            {photoCommentsList.map((c: any) => (
              <div key={c.id} className="flex gap-2">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  {c.avatar_url && <AvatarImage src={c.avatar_url} alt={c.display_name} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {c.display_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 bg-muted rounded-lg px-3 py-2">
                  <p className="text-sm font-semibold">{c.display_name}</p>
                  <p className="text-sm">{c.content}</p>

                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      {c.created_at &&
                        new Date(c.created_at).toLocaleDateString("it-IT", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                    </span>

                    <div className="flex items-center gap-2">
                      {(Number(c.author_id) === Number(CURRENT_USER_ID) ||
                        Number(selectedPhoto.artistId) === Number(CURRENT_USER_ID)) && (
                        <button
                          className="text-xs text-red-400 hover:text-red-600"
                          onClick={async () => {
                            await apiRequest("DELETE", `/api/photos/${selectedPhoto.id}/comments/${c.id}`);
                            refetchPhotoComments();
                          }}
                        >
                          🗑️
                        </button>
                      )}

                      <button
                        className={`flex items-center gap-1 text-xs ${
                          Number(c.author_id) === CURRENT_USER_ID
                            ? "opacity-50 cursor-not-allowed text-muted-foreground"
                            : c.likedByMe
                              ? "text-red-500"
                              : "text-muted-foreground hover:text-red-500"
                        }`}
                        disabled={Number(c.author_id) === CURRENT_USER_ID}
                        onClick={async () => {
                          if (c.likedByMe) {
                            await apiRequest(
                              "POST",
                              `/api/photos/${selectedPhoto.id}/comments/${c.id}/unlike/${CURRENT_USER_ID}`
                            );
                          } else {
                            await apiRequest(
                              "POST",
                              `/api/photos/${selectedPhoto.id}/comments/${c.id}/like/${CURRENT_USER_ID}`
                            );
                          }
                          await refetchPhotoComments();
                        }}
                      >
                        <Heart className={`w-3 h-3 ${c.likedByMe ? "fill-red-500" : ""}`} />
                        <span>{c.likes_count ?? 0}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="sticky bottom-0 mt-auto pt-3 pb-[calc(env(safe-area-inset-bottom)+4.5rem)] border-t bg-background shrink-0">
  <div className="relative">
    <input
      className="w-full text-sm border rounded-lg px-3 py-1 bg-background"
      placeholder="Scrivi un commento..."
      value={commentInput}
      onChange={e => {
        setCommentInput(e.target.value);
        handlePhotoCommentTextChange(e.target.value, e.target.selectionStart || 0);
      }}
      onKeyDown={async e => {
        if (e.key === "Enter" && commentInput.trim()) {
          await apiRequest("POST", `/api/photos/${selectedPhoto.id}/comments`, {
            authorId: CURRENT_USER_ID,
            content: commentInput.trim(),
          });
          setCommentInput("");
          closePhotoCommentMentions();
          refetchPhotoComments();
        }
      }}
    />
    <MentionDropdown
      query={photoCommentMentionQuery}
      visible={showPhotoCommentMentions}
      onSelect={(username) => {
        setCommentInput(insertPhotoCommentMention(commentInput, username));
        closePhotoCommentMentions();
      }}
    />
  </div>
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
  <Card
    key={video.id}
    className="overflow-hidden hover-elevate cursor-pointer"
    onClick={() => {
      setSelectedVideo(video);
      setVideoLikeCount(prev => ({
        ...prev,
        [video.id]: Number((video as any).likesCount ?? 0),
      }));
    }}
    data-testid={`card-video-${video.id}`}
  >
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
      {video.title && video.title !== "Video" && (
        <h4 className="font-medium" data-testid={`text-video-title-${video.id}`}>{video.title}</h4>
      )}
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
                        <button
                            className="flex items-center gap-1 text-xs text-muted-foreground opacity-50 cursor-not-allowed"
                            disabled={true}
                          >
                            <Heart className="w-3 h-3" />
                            {post.likesCount}
                          </button>
                        <button
                            className={`flex items-center gap-1 text-xs ${openCommentsPosts.has(post.id) ? "text-primary" : "text-muted-foreground"}`}
                            onClick={() => {
                              const newOpen = new Set(openCommentsPosts);
                              if (newOpen.has(post.id)) { newOpen.delete(post.id); } else { newOpen.add(post.id); }
                              setOpenCommentsPosts(newOpen);
                            }}
                          >
                            <MessageCircle className={`w-3 h-3 ${openCommentsPosts.has(post.id) ? "fill-current" : ""}`} />
                          </button>
                         {post.isExclusive && (
                            <Badge variant="secondary" className="text-xs">Esclusivo</Badge>
                          )}
                        </div>
                      </div>
                      <button className="text-xs text-red-400 hover:text-red-600 self-start"
                        onClick={async () => {
                          try {
                            await apiRequest("DELETE", `/api/posts/${post.id}`);
                            queryClient.invalidateQueries({ queryKey: ["/api/users", CURRENT_USER_ID, "posts"] });
                            queryClient.invalidateQueries({ queryKey: ["/api/posts", CURRENT_USER_ID] });
                            queryClient.invalidateQueries({ queryKey: ["/api/users", CURRENT_USER_ID, "photos"] });
                            toast({ title: "Post eliminato" });
                          } catch {
                            toast({ title: "Errore", variant: "destructive" });
                          }
                        }}
                      >🗑️</button>
                   </div>
                  </CardContent>
                  {openCommentsPosts.has(post.id) && (
                    <CardContent className="pt-0">
                      <MePostComments postId={post.id} postAuthorId={CURRENT_USER_ID} />
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Non hai ancora pubblicato nessun post. Scrivi il tuo primo post in alto!</p>
          )}
        </TabsContent>

       <TabsContent value="events" className="mt-4">
          {currentUser?.role === "artist" ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
               <p className="text-sm text-muted-foreground">I tuoi eventi ({myArtistEvents.length})</p>
                <Button size="sm" variant="outline" onClick={() => setShowEventForm(!showEventForm)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Aggiungi
                </Button>
              </div>
              {showEventForm && (
                <Card>
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
                         await apiRequest("POST", `/api/artists/${CURRENT_USER_ID}/events`, { ...eventForm, eventDate: new Date(eventForm.eventDate).toISOString() });
                          queryClient.invalidateQueries({ queryKey: [`/api/artists/${CURRENT_USER_ID}/events`] });
                          queryClient.invalidateQueries({ queryKey: ["/api/users", CURRENT_USER_ID, "events/attending"] });
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
              {myArtistEvents.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {myArtistEvents.map((event: any) => (
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
                          </div>
                          <button
                            className="text-xs text-red-400 hover:text-red-600"
                            onClick={async () => {
                              try {
                                await apiRequest("DELETE", `/api/events/${event.id}`);
                                queryClient.invalidateQueries({ queryKey: [`/api/artists/${CURRENT_USER_ID}/events`] });
                                toast({ title: "Evento eliminato" });
                              } catch {
                                toast({ title: "Errore", variant: "destructive" });
                              }
                            }}
                          >🗑️</button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nessun evento creato ancora</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-2">Eventi a cui partecipi ({attendingEvents.length})</p>
          )}
          {attendingEvents.length > 0 ? (
            <div className="flex flex-col gap-3">
              {attendingEvents.map(({ event }) => (
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
                      </div>
                      <button
                        className="text-xs text-red-400 hover:text-red-600"
                        onClick={async () => {
                          try {
                            await apiRequest("DELETE", `/api/events/${event.id}/attend`, { userId: CURRENT_USER_ID });
                            queryClient.invalidateQueries({ queryKey: ["/api/users", CURRENT_USER_ID, "events/attending"] });
                            toast({ title: "Evento rimosso" });
                          } catch {
                            toast({ title: "Errore", variant: "destructive" });
                          }
                        }}
                      >🗑️</button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Non partecipi ancora a nessun evento</p>
          )}
        </TabsContent>
        
<TabsContent value="connections" className="mt-4">
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm font-medium mb-2">Follower ({followersList.length})</p>
              {followersList.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {followersList.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
                      <Link href={`/artist/${user.id}`}>
                        <Avatar className="w-10 h-10 cursor-pointer hover-elevate">
                          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.displayName} />}
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {user.displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <Link href={`/artist/${user.id}`} className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm hover:text-primary cursor-pointer">{user.displayName}</h4>
                        <span className="text-xs text-muted-foreground">@{user.username}</span>
                      </Link>
                      <Link href={`/chat/${user.id}`}>
                        <Button size="icon" variant="ghost">
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4 text-sm">Nessun follower ancora</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Profili che seguo ({followedArtists.length})</p>
              {followedArtists.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {followedArtists.map((artist) => (
                    <div key={artist.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
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
                        <span className="text-xs text-muted-foreground">{artist.genre || "@" + artist.username}</span>
                      </Link>
                      <Link href={`/chat/${artist.id}`}>
                        <Button size="icon" variant="ghost">
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button size="icon" variant="ghost" onClick={() => handleUnfollowArtist(artist.id, artist.displayName)}>
                        <UserMinus className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4 text-sm">Non segui ancora nessun profilo</p>
              )}
            </div>
          </div>
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
      {pendingVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl w-full max-w-sm p-4 space-y-3">
            <h3 className="font-semibold">Condividi nel feed</h3>
            <video src={pendingVideo.videoData} controls className="w-full rounded-lg max-h-48 object-cover" />
            <div className="relative">
             <div className="relative">
              <textarea
                className="w-full p-3 rounded-lg bg-muted border-0 text-sm outline-none resize-none"
                placeholder="Scrivi qualcosa..."
                rows={3}
                value={pendingVideoText}
                onChange={e => { setPendingVideoText(e.target.value); handleVideoTextChange(e.target.value, e.target.selectionStart || 0); }}
              />
              <MentionDropdown query={videoMentionQuery} visible={showVideoMentions} onSelect={(username) => { setPendingVideoText(insertVideoMention(pendingVideoText, username)); closeVideoMentions(); }} />
            </div>
              <MentionDropdown query={photoMentionQuery} visible={showPhotoMentions} onSelect={(username) => { setPendingPostText(insertPhotoMention(pendingPostText, username)); closePhotoMentions(); }} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setPendingVideo(null); setPendingPostText(""); }}>
                Non condividere
              </Button>
              <Button className="flex-1" disabled={uploadingType === "uploading-video"} onClick={async () => {
                setUploadingType("uploading-video");
                try {
                  const uploadRes = await fetch("/api/uploads/video", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ videoData: pendingVideo.videoData, userId: CURRENT_USER_ID }),
                  });
                  const { url } = await uploadRes.json();
                  await apiRequest("POST", `/api/users/${CURRENT_USER_ID}/videos`, {
                    title: pendingVideoText || "Video",
                    videoUrl: url,
                    thumbnailUrl: url,
                  });
                 queryClient.invalidateQueries({ queryKey: ["/api/users", CURRENT_USER_ID, "videos"] });
                 queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
                 toast({ title: "Video caricato!" });
                } catch {
                  toast({ title: "Errore", variant: "destructive" });
                } finally {
                  setUploadingType(null);
                  setPendingVideo(null);
                  setPendingVideoText("");
                }
              }}>
                Pubblica
              </Button>
            </div>
          </div>
        </div>
      )}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={() => setSelectedVideo(null)}>
          <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            <div className="w-full max-w-lg bg-background rounded-xl overflow-y-auto max-h-[90vh]">
              <video src={selectedVideo.videoUrl} controls className="w-full max-h-[40vh] object-contain bg-black" />
              <div className="p-4">
                {selectedVideo.title && selectedVideo.title !== "Video" && <p className="font-medium">{selectedVideo.title}</p>}
                <p className="text-xs text-muted-foreground mb-3">
                  {selectedVideo.createdAt && new Date(selectedVideo.createdAt).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
                <div className="flex items-center gap-4 mb-4 border-b pb-3">
                  <button
  className="flex items-center gap-1 text-sm text-muted-foreground opacity-50 cursor-not-allowed"
  disabled={true}
>
  <Heart className="w-5 h-5" />
  <span>{videoLikeCount[selectedVideo.id] ?? Number((selectedVideo as any).likesCount ?? 0)}</span>
</button>
                  <button
                    className="flex items-center gap-1 text-sm text-muted-foreground"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: selectedVideo.title, text: "Guarda questo video su Vibyng!" });
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                        toast({ title: "Link copiato!" });
                      }
                    }}
                  >
                    <Share2 className="w-5 h-5" />
                    Condividi
                  </button>
                  <button
                    className="flex items-center gap-1 text-sm text-red-500"
                    onClick={async () => {
                      try {
                        await apiRequest("DELETE", `/api/videos/${selectedVideo.id}`);
                        queryClient.invalidateQueries({ queryKey: ["/api/users", CURRENT_USER_ID, "videos"] });
                        setSelectedVideo(null);
                        toast({ title: "Video eliminato" });
                      } catch {
                        toast({ title: "Errore", variant: "destructive" });
                      }
                    }}
                  >
                    🗑️
                  </button>
                  <button className="ml-auto text-muted-foreground text-lg" onClick={() => setSelectedVideo(null)}>✕</button>
                </div>
                <div className="space-y-2 max-h-24 overflow-y-auto mb-3">
                  {videoCommentsList.map((c: any) => (
                    <div key={c.id} className="flex gap-2">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        {c.avatar_url && <AvatarImage src={c.avatar_url} alt={c.display_name} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">{c.display_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-muted rounded-lg px-3 py-2">
                        <p className="text-sm font-semibold">{c.display_name}</p>
                        <p className="text-sm">{c.content}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">
                            {c.created_at && new Date(c.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <div className="flex items-center gap-2">
                            {(Number(c.author_id) === Number(CURRENT_USER_ID) || Number(selectedVideo.artistId) === Number(CURRENT_USER_ID)) && (
                              <button className="text-xs text-red-400 hover:text-red-600" onClick={async () => { await apiRequest("DELETE", `/api/videos/${selectedVideo.id}/comments/${c.id}`); refetchVideoComments(); }}>🗑️</button>
                            )}
                            <button
  className={`flex items-center gap-1 text-xs ${
    Number(c.author_id) === Number(CURRENT_USER_ID)
      ? "opacity-50 cursor-not-allowed text-muted-foreground"
      : c.likedByMe
        ? "text-red-500"
        : "text-muted-foreground hover:text-red-500"
  }`}
  disabled={Number(c.author_id) === Number(CURRENT_USER_ID)}
  onClick={async () => {
    if (c.likedByMe) {
      await apiRequest("POST", `/api/videos/${selectedVideo.id}/comments/${c.id}/unlike`, { userId: CURRENT_USER_ID });
    } else {
      await apiRequest("POST", `/api/videos/${selectedVideo.id}/comments/${c.id}/like`, { userId: CURRENT_USER_ID });
    }
    await refetchVideoComments();
  }}
>
  <Heart className={`w-3 h-3 ${c.likedByMe ? "fill-red-500" : ""}`} />
  <span>{c.likes_count ?? 0}</span>
</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="relative">
  <input
    className="w-full text-sm border rounded-lg px-3 py-1 bg-background"
    placeholder="Scrivi un commento..."
    value={videoCommentInput}
    onChange={e => {
      setVideoCommentInput(e.target.value);
      handleVideoCommentTextChange(e.target.value, e.target.selectionStart || 0);
    }}
    onKeyDown={async e => {
      if (e.key === "Enter" && videoCommentInput.trim()) {
        await apiRequest("POST", `/api/videos/${selectedVideo.id}/comments`, {
          authorId: CURRENT_USER_ID,
          content: videoCommentInput.trim(),
        });
        setVideoCommentInput("");
        closeVideoCommentMentions();
        refetchVideoComments();
      }
    }}
  />
  <MentionDropdown
    query={videoCommentMentionQuery}
    visible={showVideoCommentMentions}
    onSelect={(username) => {
      setVideoCommentInput(insertVideoCommentMention(videoCommentInput, username));
      closeVideoCommentMentions();
    }}
  />
</div>
              </div>
            </div>
          </div>
        </div>
      )}
      {pendingPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl w-full max-w-sm p-4 space-y-3">
            <h3 className="font-semibold">Condividi nel feed</h3>
            <img src={pendingPhoto.imageData} alt="preview" className="w-full h-48 object-cover rounded-lg" />
           <div className="relative">
              <textarea
                className="w-full p-3 rounded-lg bg-muted border-0 text-sm outline-none resize-none"
                placeholder="Scrivi qualcosa..."
                rows={3}
                value={pendingPostText}
                onChange={e => { setPendingPostText(e.target.value); handlePhotoTextChange(e.target.value, e.target.selectionStart || 0); }}
              />
              <MentionDropdown query={photoMentionQuery} visible={showPhotoMentions} onSelect={(username) => { setPendingPostText(insertPhotoMention(pendingPostText, username)); closePhotoMentions(); }} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setPendingPhoto(null); setPendingPostText(""); }}>
                Non condividere
              </Button>
              <Button className="flex-1" disabled={uploadingType === "publishing"} onClick={async () => {
                setUploadingType("publishing");
                try {
                 await apiRequest("POST", `/api/users/${CURRENT_USER_ID}/photos`, {
                    title: pendingPostText || "Foto",
                    imageUrl: pendingPhoto.imageData,
                    description: pendingPostText,
                  });
                  queryClient.invalidateQueries({ queryKey: ["/api/users", CURRENT_USER_ID, "photos"] });
                  await queryClient.refetchQueries({ queryKey: ["/api/posts", CURRENT_USER_ID] });
                  toast({ title: "Post pubblicato!" });
                } catch {
                  toast({ title: "Errore", variant: "destructive" });
                } finally {
                  setUploadingType(null);
                  setPendingPhoto(null);
                  setPendingPostText("");
                }
              }}>
                Pubblica
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
