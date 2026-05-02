import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Zap, Gift, Star, Trophy, MessageCircle, Heart, Users, Image as ImageIcon, Video, Music, Edit, Play, Pause, Minus, UserMinus, UserPlus, Camera, Send, ImagePlus, Share2, FileText, Calendar, Plus, MoreVertical } from "lucide-react";
import { Link } from "wouter";
import { useState, useRef, useEffect } from "react";
import { useAudioPlayer, type Song } from "@/components/audio-player";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/App";
import { useUpload } from "@/hooks/use-upload";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMention } from "@/hooks/use-mention";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { MentionDropdown } from "@/components/mention-dropdown";
import { MentionText } from "@/components/mention-text";
import { shareVibyngContent, buildContentShareUrl } from "@/lib/share-content";
import type { User, ArtistPhoto, ArtistVideo, ArtistGoal, Post } from "@shared/schema";

function getCurrentUserId(): number {
  try {
    const stored = localStorage.getItem("vibyng-user");
    if (stored) return JSON.parse(stored).id || 1;
  } catch {}
  return 1;
}
type AppLanguage = "it" | "en";

const MB = 1024 * 1024;

const MAX_PHOTO_SIZE_MB = 40;
const MAX_VIDEO_SIZE_MB = 500;
const MAX_AUDIO_SIZE_MB = 20;

const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * MB;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * MB;
const MAX_AUDIO_SIZE_BYTES = MAX_AUDIO_SIZE_MB * MB;

const pointsTranslations = {
  it: {
    commentPlaceholder: "Scrivi un commento...",
    vpointsFetchError: "Errore nel recupero dei VibyngPoints",

    avatarUpdatedTitle: "Foto profilo aggiornata!",
    avatarUpdatedDescription: "La tua immagine è stata salvata",
    avatarUploadError: "Non è stato possibile caricare l'immagine",

    profileAvatarUpdatedTitle: "Foto profilo aggiornata",
    profileAvatarUpdatedDescription: "La tua nuova immagine è stata salvata",

    postPublishedTitle: "Post pubblicato!",
    postPublishedDescription: "Il tuo post è stato condiviso con la community",
    postPublishError: "Non è stato possibile pubblicare il post",

    shareToFeed: "Condividi nel feed",
    writeSomething: "Scrivi qualcosa...",
    dontShare: "Non condividere",

    photoUploadError: "Non è stato possibile caricare la foto",
    videoUploadError: "Non è stato possibile caricare il video",
    songUploadError: "Non è stato possibile salvare la canzone",

    videoUploadedTitle: "Video caricato!",

    fileTooLargeTitle: "File troppo grande",
    photoTooLargeDescription: "La foto deve essere inferiore a 40MB",
    videoTooLargeDescription: "Il video deve essere inferiore a 500MB",
    mp3TooLargeDescription: "Il file MP3 deve essere inferiore a 20MB",

    songUploadedTitle: "Canzone caricata!",
    songUploadedDescription: "La tua canzone è ora visibile nel tuo profilo",

    removedFromPlaylistTitle: "Rimosso dalla playlist",
    removedFromPlaylistDescription: "è stato rimosso dalla tua playlist",

    unfollowTitle: "Non segui più",
    unfollowDescription: "Hai smesso di seguire",

    roleArtist: "Artista",
    roleRehearsalStudio: "Sala Prove",
    roleRecordingStudio: "Studio di Registrazione",
    roleRecordLabel: "Casa Discografica",
    roleFan: "Fan",

    follower: "follower",
    postPlaceholder: "A cosa stai pensando?",
    publish: "Pubblica",

    music: "Musica",
    photos: "Foto",
    videos: "Video",
    posts: "Post",
    events: "Eventi",
    connections: "Connessioni",

goals: "Obiettivi",
followers: "Follower",
following: "Seguiti",
noGoals: "Nessun obiettivo ancora",
addGoal: "Aggiungi obiettivo",
goalTitle: "Titolo obiettivo *",
goalDescription: "Descrizione obiettivo",
goalTargetAmount: "Importo obiettivo *",
goalCreatedTitle: "Obiettivo creato!",
target: "Obiettivo",
raised: "Raccolto",  
goalDeletedTitle: "Obiettivo eliminato",
goalDeleteError: "Non è stato possibile eliminare l'obiettivo",    

noSongs: "Nessuna canzone disponibile",
noPhotos: "Nessuna foto disponibile",
noVideos: "Nessun video disponibile",
noPosts: "Nessun post ancora.",
noEvents: "Nessun evento in programma",
noFollowers: "Nessun follower ancora",
noFollowing: "Non segui ancora nessuno",

comments: "Commenti",
share: "Condividi",
copied: "Link copiato!",
untitledPhoto: "Foto",
untitledVideo: "Video",
delete: "Elimina",
reportContentTitle: "Segnala contenuto",
reportContentDescription: "Aiutaci a capire cosa non va in questo contenuto.",
reportComment: "Segnala commento",
reportReason: "Motivo della segnalazione",
reportDetails: "Dettagli opzionali",
reportDetailsPlaceholder: "Aggiungi dettagli utili alla verifica...",
reportSubmit: "Invia segnalazione",
reportSuccessTitle: "Segnalazione inviata",
reportSuccessDescription: "Grazie, analizzeremo la segnalazione.",
reportErrorDescription: "Non è stato possibile inviare la segnalazione.",
reportReasonOffensive: "Contenuto offensivo",
reportReasonViolent: "Contenuto violento",
reportReasonPornographic: "Contenuto pornografico",
reportReasonHarassment: "Molestie",
reportReasonHate: "Odio o discriminazione",
reportReasonSpam: "Spam",
reportReasonFakeProfile: "Profilo falso",
reportReasonOther: "Altro",
    

photoDescriptionPlaceholder: "Scrivi una descrizione per la foto...",
videoDescriptionPlaceholder: "Scrivi una descrizione per il video...",
publishPhoto: "Pubblica foto",
publishVideo: "Pubblica video",
cancel: "Annulla",

add: "Aggiungi",
eventName: "Nome evento *",
eventDate: "Data e ora",
city: "Città",
venue: "Venue / Locale",
eventDescription: "Descrizione (opzionale)",
ticketUrl: "Link biglietti (opzionale)",
save: "Salva",
attend: "Partecipo",
buyTickets: "Acquista biglietti",
eventRequiredError: "Compila nome e data",
eventAddedTitle: "Evento aggiunto!",
eventDeletedTitle: "Evento eliminato",
eventAttendTitle: "Partecipi all'evento! 🎉",

error: "Errore",
  },

  en: {
    commentPlaceholder: "Write a comment...",
    vpointsFetchError: "Error fetching VibyngPoints",

    avatarUpdatedTitle: "Profile photo updated!",
    avatarUpdatedDescription: "Your image has been saved",
    avatarUploadError: "Unable to upload the image",

    profileAvatarUpdatedTitle: "Profile photo updated",
    profileAvatarUpdatedDescription: "Your new image has been saved",

    postPublishedTitle: "Post published!",
    postPublishedDescription: "Your post has been shared with the community",
    postPublishError: "Unable to publish the post",

    shareToFeed: "Share to feed",
    writeSomething: "Write something...",
    dontShare: "Don't share",

    photoUploadError: "Unable to upload the photo",
    videoUploadError: "Unable to upload the video",
    songUploadError: "Unable to save the song",

    videoUploadedTitle: "Video uploaded!",
    
    fileTooLargeTitle: "File too large",
    photoTooLargeDescription: "The photo must be under 40MB",
    videoTooLargeDescription: "The video must be under 500MB",
    mp3TooLargeDescription: "The MP3 file must be under 20MB",
    
    songUploadedTitle: "Song uploaded!",
    songUploadedDescription: "Your song is now visible on your profile",

    removedFromPlaylistTitle: "Removed from playlist",
    removedFromPlaylistDescription: "has been removed from your playlist",

    unfollowTitle: "No longer following",
    unfollowDescription: "You stopped following",

    roleArtist: "Artist",
    roleRehearsalStudio: "Rehearsal Studio",
    roleRecordingStudio: "Recording Studio",
    roleRecordLabel: "Record Label",
    roleFan: "Fan",

    follower: "followers",
    postPlaceholder: "What's on your mind?",
    publish: "Publish",

    music: "Music",
    photos: "Photos",
    videos: "Videos",
    posts: "Posts",
    events: "Events",
    connections: "Connections",

goals: "Goals",
followers: "Followers",
following: "Following",
noGoals: "No goals yet",
addGoal: "Add goal",
goalTitle: "Goal title *",
goalDescription: "Goal description",
goalTargetAmount: "Goal amount *",
goalCreatedTitle: "Goal created!",
target: "Target",
raised: "Raised",
goalDeletedTitle: "Goal deleted",
goalDeleteError: "Unable to delete the goal",    

noSongs: "No songs available",
noPhotos: "No photos available",
noVideos: "No videos available",
noPosts: "No posts yet.",
noEvents: "No upcoming events",
noFollowers: "No followers yet",
noFollowing: "You are not following anyone yet",

comments: "Comments",
share: "Share",
copied: "Link copied!",
untitledPhoto: "Photo",
untitledVideo: "Video",
delete: "Delete",
reportContentTitle: "Report content",
reportContentDescription: "Help us understand what is wrong with this content.",
reportComment: "Report comment",
reportReason: "Report reason",
reportDetails: "Optional details",
reportDetailsPlaceholder: "Add useful details for review...",
reportSubmit: "Submit report",
reportSuccessTitle: "Report submitted",
reportSuccessDescription: "Thank you, we will review this report.",
reportErrorDescription: "Unable to submit the report.",
reportReasonOffensive: "Offensive content",
reportReasonViolent: "Violent content",
reportReasonPornographic: "Pornographic content",
reportReasonHarassment: "Harassment",
reportReasonHate: "Hate or discrimination",
reportReasonSpam: "Spam",
reportReasonFakeProfile: "Fake profile",
reportReasonOther: "Other",
    
photoDescriptionPlaceholder: "Write a description for the photo...",
videoDescriptionPlaceholder: "Write a description for the video...",
publishPhoto: "Publish photo",
publishVideo: "Publish video",
cancel: "Cancel",

add: "Add",
eventName: "Event name *",
eventDate: "Date and time",
city: "City",
venue: "Venue / Venue name",
eventDescription: "Description (optional)",
ticketUrl: "Ticket link (optional)",
save: "Save",
attend: "Attend",
buyTickets: "Buy tickets",
eventRequiredError: "Please enter name and date",
eventAddedTitle: "Event added!",
eventDeletedTitle: "Event deleted",
eventAttendTitle: "You are attending the event! 🎉",

error: "Error",
  },
} as const;

function getStoredLanguage(): AppLanguage {
  try {
    const stored = localStorage.getItem("vibyng-language");
    if (stored === "it" || stored === "en") return stored;
  } catch {}
  return "it";
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

type VPointsStatus = {
  balance: number;
  todayEarned: number;
  dailyCap: number;
  remainingToday: number;
  rewards: Array<{
    code: string;
    label: string;
    description: string;
    cost: number;
  }>;
  recentTransactions: Array<{
    id: number;
    action: string;
    points: number;
    referenceType: string;
    referenceId: number;
    createdAt: string;
  }>;
  recentRedemptions: Array<{
    id: number;
    rewardCode: string;
    pointsSpent: number;
    createdAt: string;
  }>;
};

function CommentAuthorName({
  comment,
  className = "",
}: {
  comment: any;
  className?: string;
}) {
  const currentUserId = getCurrentUserId();

  const authorId = Number(
    comment.authorId ??
      comment.author_id ??
      comment.author?.id ??
      comment.userId ??
      comment.user_id ??
      0
  );

  const displayName =
    comment.author?.displayName ??
    comment.display_name ??
    comment.displayName ??
    comment.username ??
    "Profilo";

  if (!authorId || Number.isNaN(authorId)) {
    return <span className={className}>{displayName}</span>;
  }

  const href = authorId === currentUserId ? "/me" : `/artist/${authorId}`;

  return (
    <Link href={href}>
      <span
        className={`${className} cursor-pointer hover:text-primary transition-colors`}
        onClick={(e) => e.stopPropagation()}
      >
        {displayName}
      </span>
    </Link>
  );
}

function MePostComments({
  postId,
  postAuthorId,
  commentPlaceholder,
  onReportComment,
}: {
  postId: number;
  postAuthorId: number;
  commentPlaceholder: string;
  onReportComment: (comment: any) => void;
}) {
  const [newComment, setNewComment] = useState("");
  const currentUserId = getCurrentUserId();

  const { data: comments = [], refetch } = useQuery<any[]>({
  queryKey: ["/api/posts", postId, "comments", currentUserId],
  queryFn: async () => {
    const res = await fetch(`/api/posts/${postId}/comments?userId=${currentUserId}`);
    return res.json();
  },
});

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    await apiRequest("POST", `/api/posts/${postId}/comments`, {
      authorId: currentUserId,
      content: newComment.trim(),
    });
    setNewComment("");
    await refetch();
    await queryClient.invalidateQueries({ queryKey: ["/api/vpoints", currentUserId, "status"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId] });
  };

  return (
    <div className="border-t pt-3 mt-2 space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            placeholder={commentPlaceholder}
            value={newComment}
            onChange={(e) => {
              setNewComment(e.target.value);
            }}
            className="flex-1 w-full"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />
        </div>
        <Button size="icon" onClick={handleSubmit} disabled={!newComment.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {comments.map((comment: any) => (
        <div key={comment.id} className="flex gap-2">
          <Avatar className="w-8 h-8">
            {comment.author?.avatarUrl && (
              <AvatarImage src={comment.author.avatarUrl} alt={comment.author.displayName} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {comment.author?.displayName?.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 bg-muted rounded-lg px-3 py-2">
  <div className="flex items-start justify-between gap-2">
    <CommentAuthorName
  comment={comment}
  className="block text-sm font-semibold min-w-0 truncate"
/>

    {Number(
      comment.authorId ??
      comment.author_id ??
      comment.author?.id ??
      comment.userId ??
      comment.user_id
    ) !== Number(currentUserId) && (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full shrink-0 -mt-1 -mr-1"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onReportComment(comment);
        }}
        aria-label="Segnala commento"
      >
        <MoreVertical className="w-4 h-4" />
      </Button>
    )}
  </div>

  <p className="text-sm whitespace-pre-wrap break-words">
    <MentionText text={comment.content} />
  </p>

            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                {comment.createdAt &&
                  new Date(comment.createdAt).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
              </span>

              <div className="flex items-center gap-2">
                {(Number(comment.authorId) === Number(currentUserId) ||
                  Number(postAuthorId) === Number(currentUserId)) && (
                  <button
                    className="text-xs text-red-400 hover:text-red-600"
                    onClick={async () => {
                      await apiRequest("DELETE", `/api/comments/${comment.id}`);
                      await refetch();
                    }}
                  >
                    🗑️
                  </button>
                )}

                {Number(
  comment.authorId ??
  comment.author_id ??
  comment.author?.id ??
  comment.userId ??
  comment.user_id
) !== Number(currentUserId) && (
  <button
    className={`flex items-center gap-1 text-xs hover:text-red-500 ${
      comment.likedByMe ? "text-red-500" : "text-muted-foreground"
    }`}
    onClick={async () => {
      if (comment.likedByMe) {
        await apiRequest("POST", `/api/comments/${comment.id}/unlike`, {
          userId: currentUserId,
        });
      } else {
        await apiRequest("POST", `/api/comments/${comment.id}/like`, {
          userId: currentUserId,
        });
      }

      await refetch();
    }}
  >
    <Heart
      className={`w-3 h-3 ${
        comment.likedByMe ? "fill-red-500 text-red-500" : ""
      }`}
    />
    <span>{comment.likesCount ?? 0}</span>
  </button>
)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
export default function Points() {
  const currentUserId = getCurrentUserId();
  const { playSong, currentSong, isPlaying, togglePlay } = useAudioPlayer();
  const [language, setLanguage] = useState<AppLanguage>(getStoredLanguage);
  const t = pointsTranslations[language];
  const { toast } = useToast();
  const { profileData, updateProfile } = useProfile();
  const [myPlaylist, setMyPlaylist] = useState<Song[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [openCommentsPosts, setOpenCommentsPosts] = useState<Set<number>>(new Set());
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
  targetType: "comment";
  targetId: string;
  targetOwnerId: number | null;
  title: string;
  description: string;
} | null>(null);
const [reportReason, setReportReason] = useState("offensive");
const [reportDetails, setReportDetails] = useState("");
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
  useEffect(() => {
  const handleLanguageChange = (event: Event) => {
    const customEvent = event as CustomEvent<AppLanguage>;
    if (customEvent.detail === "it" || customEvent.detail === "en") {
      setLanguage(customEvent.detail);
    }
  };

  window.addEventListener("vibyng-language-change", handleLanguageChange);

  return () => {
    window.removeEventListener("vibyng-language-change", handleLanguageChange);
  };
}, []);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<ArtistPhoto | null>(null);
  const [selectedPhotoIsTall, setSelectedPhotoIsTall] = useState(false);

useEffect(() => {
  if (!selectedPhoto?.imageUrl) {
    setSelectedPhotoIsTall(false);
    return;
  }

  const img = new Image();
  img.onload = () => {
    const ratio = img.naturalHeight / img.naturalWidth;
    setSelectedPhotoIsTall(ratio >= 1.55);
  };
  img.src = selectedPhoto.imageUrl;
}, [selectedPhoto]);
  const [photoCommentsOpen, setPhotoCommentsOpen] = useState(false);
  const [photoLikes, setPhotoLikes] = useState<Record<number, boolean>>({});
  const [photoComments, setPhotoComments] = useState<Record<number, string[]>>({});
  const [commentInput, setCommentInput] = useState("");
  const { data: selectedPhotoLiveData } = useQuery<any>({
    queryKey: ["/api/photos", selectedPhoto?.id, "livedata"],
    queryFn: async () => {
      if (!selectedPhoto?.id) return null;
      const res = await fetch(`/api/users/${currentUserId}/photos?t=${Date.now()}`);
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
  const res = await fetch(`/api/photos/${selectedPhoto.id}/comments?userId=${currentUserId}`);
      return res.json();
    },
    enabled: !!selectedPhoto?.id,
    staleTime: 0,
  });
  const [pendingPhoto, setPendingPhoto] = useState<{ imageData: string; title: string } | null>(null);
  const [pendingPostText, setPendingPostText] = useState("");
  const [pendingVideo, setPendingVideo] = useState<{
  videoFile: File;
  previewUrl: string;
  title: string;
} | null>(null);
  useEffect(() => {
  return () => {
    if (pendingVideo?.previewUrl) {
      URL.revokeObjectURL(pendingVideo.previewUrl);
    }
  };
}, [pendingVideo?.previewUrl]);
  const [pendingVideoText, setPendingVideoText] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [videoCommentInput, setVideoCommentInput] = useState("");
  const [videoLikeCount, setVideoLikeCount] = useState<Record<number, number>>({});
  const { data: videoCommentsList = [], refetch: refetchVideoComments } = useQuery<any[]>({
  queryKey: ["/api/videos", selectedVideo?.id, "comments", currentUserId],
  queryFn: async () => {
    if (!selectedVideo?.id) return [];
    const res = await fetch(`/api/videos/${selectedVideo.id}/comments?userId=${currentUserId}`);
    return res.json();
  },
    enabled: !!selectedVideo?.id,
    staleTime: 0,
  });
  const { data: videoLikeData, refetch: refetchVideoLike } = useQuery<{ liked: boolean }>({
  queryKey: ["/api/videos", selectedVideo?.id, "liked", currentUserId],
  queryFn: async () => {
    if (!selectedVideo?.id) return { liked: false };
    const res = await fetch(`/api/videos/${selectedVideo.id}/liked/${currentUserId}`);
    return res.json();
  },
  enabled: !!selectedVideo?.id,
  staleTime: 0,
});

  const isVideoLiked = videoLikeData?.liked ?? false;

  useBodyScrollLock(Boolean(selectedVideo || selectedPhoto || photoCommentsOpen));
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({ name: "", eventDate: "", city: "", venue: "", description: "", ticketUrl: "" });
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [connectionsTab, setConnectionsTab] = useState<"followers" | "following">("followers");

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({
  title: "",
  description: "",
  targetAmount: "",
 });
  
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users", currentUserId],
  });

  const { data: vPointsStatus } = useQuery<VPointsStatus>({
    queryKey: ["/api/vpoints", currentUserId, "status"],
    queryFn: async () => {
      const res = await fetch(`/api/vpoints/${currentUserId}/status`);
      if (!res.ok) {
        throw new Error(t.vpointsFetchError);
      }
      return res.json();
    },
  });

  const { data: followedArtists = [] } = useQuery<User[]>({
    queryKey: ["/api/users", currentUserId, "following"],
  });
  const { data: followersData } = useQuery<{ count: number }>({
    queryKey: [`/api/artists/${currentUserId}/followers/count`],
  });
  const { data: myPhotos = [] } = useQuery<ArtistPhoto[]>({
    queryKey: ["/api/users", currentUserId, "photos"],
  });

  const { data: followersList = [] } = useQuery<User[]>({
    queryKey: ["/api/users", currentUserId, "followers"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${currentUserId}/followers`);
      return res.json();
    },
  });

  const { data: myArtistEvents = [] } = useQuery<any[]>({
    queryKey: [`/api/artists/${currentUserId}/events`],
    enabled: true,
  });
  const { data: attendingEvents = [] } = useQuery<{ event: any }[]>({
    queryKey: ["/api/users", currentUserId, "events/attending"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${currentUserId}/events/attending`);
      return res.json();
    },
  });
  
  const { data: myVideos = [] } = useQuery<ArtistVideo[]>({
    queryKey: ["/api/users", currentUserId, "videos"],
  });

  const { data: myPosts = [] } = useQuery<(Post & { author: User })[]>({
    queryKey: ["/api/users", currentUserId, "posts"],
  });

const { data: likedPostIds = [], refetch: refetchLikes } = useQuery<number[]>({
    queryKey: ["/api/likes", currentUserId, "posts"],
    queryFn: async () => {
      if (!myPosts || myPosts.length === 0) return [];
      const results = await Promise.all(
        myPosts.map(async (post) => {
          const res = await fetch(`/api/posts/${post.id}/liked/${currentUserId}`);
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
    queryKey: [`/api/artists/${currentUserId}/songs`],
    enabled: true,
  });

  const { data: myArtistGoals = [] } = useQuery<ArtistGoal[]>({
  queryKey: [`/api/artists/${currentUserId}/goals`],
  enabled: currentUser?.role === "artist",
  });
  
  const unfollowMutation = useMutation({
    mutationFn: async (artistId: number) => {
      return apiRequest("DELETE", `/api/users/${currentUserId}/follow/${artistId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId, "following"] });
    },
  });

  const { uploadFile, isUploading } = useUpload({
    onSuccess: async (response) => {
      const newAvatarUrl = response.objectPath;
      await updateProfile({ avatarUrl: newAvatarUrl });
      toast({
  title: t.profileAvatarUpdatedTitle,
  description: t.profileAvatarUpdatedDescription,
});
    },
    onError: () => {
      toast({
  title: t.error,
  description: t.avatarUploadError,
  variant: "destructive",
});
    },
  });

 const handlePublishPost = async () => {
  if (!postText.trim()) return;
  try {
    await apiRequest("POST", "/api/posts", {
      authorId: currentUserId,
      content: postText,
    });
    await queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId, "posts"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/posts", currentUserId] });
    await queryClient.invalidateQueries({ queryKey: ["/api/vpoints", currentUserId, "status"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId] });
    toast({
  title: t.postPublishedTitle,
  description: t.postPublishedDescription,
});
    setPostText("");
  } catch {
    toast({
  title: t.error,
  description: t.postPublishError,
  variant: "destructive",
});
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
          body: JSON.stringify({ imageData, userId: currentUserId }),
        });
        await updateProfile({ avatarUrl: imageData });
        toast({ title: t.avatarUpdatedTitle, description: t.avatarUpdatedDescription });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  } catch {
    toast({ title: t.error, description: t.avatarUploadError, variant: "destructive" });
  }
};

 const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
if (!file) return;

if (file.size > MAX_PHOTO_SIZE_BYTES) {
  toast({
    title: t.fileTooLargeTitle,
    description: t.photoTooLargeDescription,
    variant: "destructive",
  });
  if (photoInputRef.current) photoInputRef.current.value = "";
  return;
}

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
      toast({ title: t.error, description: t.photoUploadError, variant: "destructive" });
    } finally {
      setUploadingType(null);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

const uploadVideoDirectToCloudinary = async (file: File): Promise<string> => {
  const signRes = await fetch("/api/cloudinary/sign-video-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: currentUserId }),
  });

  if (!signRes.ok) {
    throw new Error("Impossibile preparare l'upload video");
  }

  const signData = await signRes.json();

  const chunkSize = 20 * MB;
  const uploadId = `${currentUserId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let finalResult: any = null;

  for (let start = 0; start < file.size; start += chunkSize) {
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append("file", chunk, file.name);
    formData.append("api_key", signData.apiKey);
    formData.append("timestamp", String(signData.timestamp));
    formData.append("signature", signData.signature);
    formData.append("folder", signData.folder);
    formData.append("public_id", signData.publicId);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${signData.cloudName}/video/upload`,
      {
        method: "POST",
        headers: {
          "X-Unique-Upload-Id": uploadId,
          "Content-Range": `bytes ${start}-${end - 1}/${file.size}`,
        },
        body: formData,
      }
    );

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      throw new Error(errorText || "Upload video non riuscito");
    }

    finalResult = await uploadRes.json();
  }

  if (!finalResult?.secure_url) {
    throw new Error("Cloudinary non ha restituito l'URL del video");
  }

  return finalResult.secure_url;
};
  
 const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    toast({
      title: t.fileTooLargeTitle,
      description: t.videoTooLargeDescription,
      variant: "destructive",
    });

    if (videoInputRef.current) videoInputRef.current.value = "";
    return;
  }

  try {
    const previewUrl = URL.createObjectURL(file);

    setPendingVideo({
      videoFile: file,
      previewUrl,
      title: file.name.replace(/\.[^/.]+$/, ""),
    });
  } catch {
    toast({
      title: t.error,
      description: t.videoUploadError,
      variant: "destructive",
    });
  } finally {
    if (videoInputRef.current) videoInputRef.current.value = "";
  }
};

 const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AUDIO_SIZE_BYTES) {
  toast({
    title: t.fileTooLargeTitle,
    description: t.mp3TooLargeDescription,
    variant: "destructive",
  });
  if (musicInputRef.current) musicInputRef.current.value = "";
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
            body: JSON.stringify({ audioData, title: file.name.replace(/\.[^/.]+$/, ""), artistId: currentUserId }),
          });
         const { url } = await uploadRes.json();
          await apiRequest("POST", `/api/artists/${currentUserId}/songs`, {
            title: file.name.replace(/\.[^/.]+$/, ""),
            audioUrl: url,
            artistId: currentUserId,
            duration: audioDuration,
          });
          queryClient.invalidateQueries({ queryKey: [`/api/artists/${currentUserId}/songs`] });
          toast({ title: t.songUploadedTitle, description: t.songUploadedDescription });
        } catch {
          toast({ title: t.error, description: t.songUploadError, variant: "destructive" });
        } finally {
          setUploadingType(null);
          if (musicInputRef.current) musicInputRef.current.value = "";
        }
      };
      reader.readAsDataURL(file);
    } catch {
     toast({ title: t.error, variant: "destructive" });
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
  title: t.removedFromPlaylistTitle,
  description: `"${songTitle}" ${t.removedFromPlaylistDescription}`,
});
  };

const openReport = (target: {
  targetType: "comment";
  targetId: string;
  targetOwnerId: number | null;
  title: string;
  description: string;
}) => {
  setReportTarget(target);
  setReportReason("offensive");
  setReportDetails("");
  setReportOpen(true);
};

const reportMutation = useMutation({
  mutationFn: async () => {
    if (!reportTarget) {
      throw new Error("Target segnalazione mancante");
    }

    return apiRequest("POST", "/api/reports", {
      reporterId: currentUserId,
      targetType: reportTarget.targetType,
      targetId: reportTarget.targetId,
      targetOwnerId: reportTarget.targetOwnerId,
      reason: reportReason,
      details: reportDetails.trim() || null,
    });
  },
  onSuccess: () => {
    setReportOpen(false);
    setReportTarget(null);
    setReportReason("offensive");
    setReportDetails("");

    toast({
      title: t.reportSuccessTitle,
      description: t.reportSuccessDescription,
    });
  },
  onError: () => {
    toast({
      title: t.error,
      description: t.reportErrorDescription,
      variant: "destructive",
    });
  },
});
  
  const handleUnfollowArtist = async (artistId: number, artistName: string) => {
    try {
      await unfollowMutation.mutateAsync(artistId);
      toast({
  title: t.unfollowTitle,
  description: `${t.unfollowDescription} ${artistName}`,
});
    } catch {
      toast({ title: t.error, variant: "destructive" });
    }
  };

  return (
  <div className="flex flex-col gap-4">
    <Dialog open={reportOpen} onOpenChange={setReportOpen}>
      <DialogContent className="z-[130]">
        <DialogHeader>
          <DialogTitle>{reportTarget?.title || t.reportContentTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {reportTarget?.description || t.reportContentDescription}
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t.reportReason}</label>

            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            >
              <option value="offensive">{t.reportReasonOffensive}</option>
              <option value="violent">{t.reportReasonViolent}</option>
              <option value="pornographic">{t.reportReasonPornographic}</option>
              <option value="harassment">{t.reportReasonHarassment}</option>
              <option value="hate">{t.reportReasonHate}</option>
              <option value="spam">{t.reportReasonSpam}</option>
              <option value="fake_profile">{t.reportReasonFakeProfile}</option>
              <option value="other">{t.reportReasonOther}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t.reportDetails}</label>

            <Textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder={t.reportDetailsPlaceholder}
              rows={4}
            />
          </div>

          <Button
            className="w-full"
            onClick={() => reportMutation.mutate()}
            disabled={reportMutation.isPending}
          >
            {t.reportSubmit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
              {currentUser?.role === "artist" ? t.roleArtist :
 currentUser?.role === "rehearsal_studio" ? t.roleRehearsalStudio :
 currentUser?.role === "recording_studio" ? t.roleRecordingStudio :
 currentUser?.role === "record_label" ? t.roleRecordLabel : t.roleFan}
            </Badge>
            <div className="flex items-center justify-center gap-3 mt-3">
            {currentUser?.role === "artist" ? (
  <button
    className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
    onClick={() => {
      setConnectionsTab("followers");
      setConnectionsOpen(true);
    }}
  >
    <Users className="w-4 h-4" />
    <span className="text-sm font-medium">
      {t.connections}
    </span>
  </button>
) : (
  <div className="flex items-center gap-1 text-muted-foreground">
    <Users className="w-4 h-4" />
    <span className="text-sm font-medium" data-testid="text-followers">
      {followersData?.count ?? 0} {t.follower}
    </span>
  </div>
)}
             <Link href="/vpoints">
  <div className="flex items-center gap-1 text-primary cursor-pointer hover:opacity-80 min-w-0">
    <Zap className="w-4 h-4 shrink-0" />
    <span
      className="text-[12px] font-medium leading-none whitespace-nowrap"
      data-testid="text-my-points"
    >
      {vPointsStatus?.balance ?? currentUser?.vibyngPoints ?? 0} VibyngPoints
    </span>
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
                  placeholder={t.postPlaceholder}
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
                  {t.publish}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="songs" className="w-full">
       <TabsList className="w-full grid grid-cols-6">
          <TabsTrigger value="songs" className="px-1 text-xs" data-testid="tab-songs">
            <Music className="w-4 h-4 sm:mr-1" />
           <span className="hidden sm:inline">{t.music}</span>
          </TabsTrigger>
          <TabsTrigger value="photos" className="px-1 text-xs" data-testid="tab-photos">
            <ImageIcon className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">{t.photos}</span>
          </TabsTrigger>
          <TabsTrigger value="videos" className="px-1 text-xs" data-testid="tab-videos">
            <Video className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">{t.videos}</span>
          </TabsTrigger>
         <TabsTrigger value="posts" className="px-1 text-xs" data-testid="tab-posts">
            <FileText className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">{t.posts}</span>
          </TabsTrigger>
        <TabsTrigger value="events" className="px-1 text-xs">
            <Calendar className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">{t.events}</span>
          </TabsTrigger>
        <TabsTrigger value={currentUser?.role === "artist" ? "goals" : "connections"} className="px-1 text-xs">
  {currentUser?.role === "artist" ? (
    <Trophy className="w-4 h-4 sm:mr-1" />
  ) : (
    <Users className="w-4 h-4 sm:mr-1" />
  )}
  <span className="hidden sm:inline">
    {currentUser?.role === "artist" ? t.goals : t.connections}
  </span>
</TabsTrigger>
          
        </TabsList>

        <TabsContent value="songs" className="mt-4">
          <div className="flex flex-col gap-2">
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
                            queryClient.invalidateQueries({ queryKey: [`/api/artists/${currentUserId}/songs`] });
                            toast({ title: "Canzone eliminata" });
                          } else {
                            await apiRequest("DELETE", `/api/users/${currentUserId}/playlist/${song.id}`);
                            queryClient.invalidateQueries({ queryKey: [`/api/artists/${currentUserId}/songs`] });
                            toast({ title: "Rimossa dalla playlist" });
                          }
                        } catch {
                         toast({ title: t.error, variant: "destructive" });
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
          {myPhotos.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {myPhotos.map((photo) => (
                <Card
  key={photo.id}
  className="overflow-hidden hover-elevate cursor-pointer"
  onClick={() => {
    setSelectedPhoto(photo);
    setPhotoCommentsOpen(false);
  }}
  data-testid={`card-photo-${photo.id}`}
>
                  <img src={photo.imageUrl ?? undefined} alt={photo.title} className="w-full h-32 object-cover" />
               {photo.title && photo.title !== t.untitledPhoto && (
                    <CardContent className="p-2">
                      <p className="text-xs text-muted-foreground truncate">
  <MentionText text={photo.title} />
</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nessuna foto. Usa l'icona foto per caricare!</p>
          )}

          {selectedPhoto && (
  <>
    <div
      className="fixed inset-0 z-[80] bg-black/95 flex flex-col"
      onClick={() => {
        setSelectedPhoto(null);
        setPhotoCommentsOpen(false);
      }}
    >
      <div
        className="relative flex-1 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 z-20 text-white text-2xl"
          onClick={() => {
            setSelectedPhoto(null);
            setPhotoCommentsOpen(false);
          }}
        >
          ✕
        </button>

        <div
  className={
    selectedPhotoIsTall
      ? "flex-1 flex items-center justify-center px-0 pt-12 pb-0"
      : "flex-1 flex items-center justify-center px-2 pt-12 pb-24"
  }
>
          <img
  src={selectedPhoto.imageUrl ?? undefined}
  alt={selectedPhoto.title}
  className={
    selectedPhotoIsTall
      ? "w-full h-full max-h-[calc(100dvh-9rem)] object-contain"
      : "w-full h-full max-h-[72dvh] sm:max-h-[78vh] object-contain"
  }
  />
        </div>

       <div
 className={
  selectedPhotoIsTall
    ? "absolute inset-x-0 bottom-0 z-20 bg-black/90 px-4 pt-4 pb-4"
    : "px-4 pb-4"
}
>
          {selectedPhoto.title && selectedPhoto.title !== "Foto" && (
            <p className="text-white font-medium whitespace-pre-wrap break-words mb-1">
              <MentionText text={selectedPhoto.title} />
            </p>
          )}

          <p className="text-xs text-white/70 mb-3">
            {selectedPhoto.createdAt &&
              (() => {
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

          <div className="mt-3 flex items-center gap-4 border-t border-white/10 pt-3">
            <button
              className="flex items-center gap-1 text-sm text-white/80 opacity-50 cursor-not-allowed"
              disabled={true}
            >
              <Heart className="w-5 h-5" />
              <span>{selectedPhotoLiveData?.likesCount ?? selectedPhoto.likesCount ?? 0}</span>
            </button>

            <button
              className="flex items-center gap-1 text-sm text-white/80"
              onClick={() => setPhotoCommentsOpen(true)}
            >
              <MessageCircle className="w-5 h-5" />
              {t.comments}
            </button>
<button
  className="flex items-center gap-1 text-sm text-white/80"
  onClick={async (e) => {
    e.stopPropagation();

    const shareUrl = buildContentShareUrl("photo", selectedPhoto.id);

    const result = await shareVibyngContent({
      title: selectedPhoto.title || "Foto",
      text: selectedPhoto.title || "Foto su Vibyng",
      mediaUrl: selectedPhoto.imageUrl ?? undefined,
      fallbackUrl: shareUrl,
      shareUrl,
      fileName: `foto-${selectedPhoto.id}`,
    });

    if (result === "copied") {
     toast({ title: t.copied });
    }
  }}
>
  <Share2 className="w-5 h-5" />
{t.share}
</button>
            <button
              className="flex items-center gap-1 text-sm text-red-400 ml-auto"
              onClick={async () => {
                try {
                  await apiRequest("DELETE", `/api/users/${currentUserId}/photos/${selectedPhoto.id}`);
                  queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId, "photos"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/posts", currentUserId] });
                  setSelectedPhoto(null);
                  setPhotoCommentsOpen(false);
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
          </div>
        </div>
      </div>
    </div>

    <Sheet open={photoCommentsOpen} onOpenChange={setPhotoCommentsOpen}>
      <SheetContent side="bottom" className="h-[75vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{t.comments}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex flex-col h-[calc(75vh-5rem)]">
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
  <div className="flex items-start justify-between gap-2">
    <CommentAuthorName
  comment={comment}
  className="block text-sm font-semibold min-w-0 truncate"
/>

    {Number(c.author_id) !== Number(currentUserId) && (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full shrink-0 -mt-1 -mr-1"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();

          openReport({
            targetType: "comment",
            targetId: String(c.id),
            targetOwnerId: Number(c.author_id),
            title: t.reportComment,
            description: t.reportContentDescription,
          });
        }}
        aria-label={t.reportComment}
      >
        <MoreVertical className="w-4 h-4" />
      </Button>
    )}
  </div>

  <p className="text-sm whitespace-pre-wrap break-words">
    <MentionText text={c.content} />
  </p>

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
                      {(Number(c.author_id) === Number(currentUserId) ||
                        Number(selectedPhoto.artistId) === Number(currentUserId)) && (
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
                          Number(c.author_id) === currentUserId
                            ? "opacity-50 cursor-not-allowed text-muted-foreground"
                            : c.likedByMe
                              ? "text-red-500"
                              : "text-muted-foreground hover:text-red-500"
                        }`}
                        disabled={Number(c.author_id) === currentUserId}
                        onClick={async () => {
                          if (c.likedByMe) {
                            await apiRequest(
                              "POST",
                              `/api/photos/${selectedPhoto.id}/comments/${c.id}/unlike/${currentUserId}`
                            );
                          } else {
                            await apiRequest(
                              "POST",
                              `/api/photos/${selectedPhoto.id}/comments/${c.id}/like/${currentUserId}`
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

          <div className="mt-3 pt-3 border-t bg-background shrink-0">
            <div className="relative">
              <input
                className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                placeholder={t.commentPlaceholder}
                value={commentInput}
                onChange={(e) => {
                  setCommentInput(e.target.value);
                  handlePhotoCommentTextChange(e.target.value, e.target.selectionStart || 0);
                }}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && commentInput.trim()) {
                    await apiRequest("POST", `/api/photos/${selectedPhoto.id}/comments`, {
  authorId: currentUserId,
  content: commentInput.trim(),
});
setCommentInput("");
closePhotoCommentMentions();
await refetchPhotoComments();
await queryClient.invalidateQueries({ queryKey: ["/api/vpoints", currentUserId, "status"] });
await queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId] });
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
      </SheetContent>
    </Sheet>
  </>
)}
        </TabsContent>
        <TabsContent value="videos" className="mt-4">
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
      {video.title && video.title !== t.untitledVideo && (
        <h4 className="font-medium whitespace-pre-wrap break-words" data-testid={`text-video-title-${video.id}`}>
  <MentionText text={video.title} />
</h4>
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
                        <p className="text-sm mt-1 whitespace-pre-wrap break-words" data-testid={`text-post-content-${post.id}`}>
  <MentionText text={post.content} />
</p>
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
                       <button
  className="flex items-center gap-1 text-xs text-muted-foreground"
  onClick={async () => {
    const shareUrl = buildContentShareUrl("post", post.id);

    const result = await shareVibyngContent({
      title: `Post di ${post.author.displayName}`,
      text: post.content,
      mediaUrl: post.mediaUrl ?? undefined,
      fallbackUrl: shareUrl,
      shareUrl,
      fileName: `post-${post.id}`,
    });

    if (result === "copied") {
     toast({ title: t.copied });
    }
  }}
>
  <Share2 className="w-3 h-3" />
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
                            queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId, "posts"] });
                            queryClient.invalidateQueries({ queryKey: ["/api/posts", currentUserId] });
                            queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId, "photos"] });
                            toast({ title: "Post eliminato" });
                          } catch {
                           toast({ title: t.error, variant: "destructive" });
                          }
                        }}
                      >🗑️</button>
                   </div>
                  </CardContent>
                  {openCommentsPosts.has(post.id) && (
                    <CardContent className="pt-0">
                      <MePostComments
  postId={post.id}
  postAuthorId={post.author.id}
  commentPlaceholder={t.commentPlaceholder}
  onReportComment={(comment) => {
    const commentOwnerId = Number(
      comment.authorId ??
      comment.author_id ??
      comment.author?.id ??
      comment.userId ??
      comment.user_id
    );

    openReport({
      targetType: "comment",
      targetId: String(comment.id),
      targetOwnerId: Number.isFinite(commentOwnerId) ? commentOwnerId : null,
      title: t.reportComment,
      description: t.reportContentDescription,
    });
  }}
/>
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
                <Button size="sm" variant="outline" onClick={() => setShowEventForm(!showEventForm)}>
                  <Plus className="w-4 h-4 mr-1" />
                  {t.add}
                </Button>
              </div>
              {showEventForm && (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <Input placeholder={t.eventName} value={eventForm.name} onChange={e => setEventForm(p => ({ ...p, name: e.target.value }))} />
                    <Input type="datetime-local" value={eventForm.eventDate} onChange={e => setEventForm(p => ({ ...p, eventDate: e.target.value }))} />
                    <Input placeholder={t.city} value={eventForm.city} onChange={e => setEventForm(p => ({ ...p, city: e.target.value }))} />
                    <Input placeholder={t.venue} value={eventForm.venue} onChange={e => setEventForm(p => ({ ...p, venue: e.target.value }))} />
                    <Textarea placeholder={t.eventDescription} value={eventForm.description} onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))} rows={2} />
                    <Input placeholder={t.ticketUrl} value={eventForm.ticketUrl} onChange={e => setEventForm(p => ({ ...p, ticketUrl: e.target.value }))} />
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setShowEventForm(false)}>{t.cancel}</Button>
                      <Button className="flex-1" onClick={async () => {
                        if (!eventForm.name || !eventForm.eventDate) {
                          toast({ title: t.eventRequiredError, variant: "destructive" });
                          return;
                        }
                        try {
                         await apiRequest("POST", `/api/artists/${currentUserId}/events`, { ...eventForm, eventDate: new Date(eventForm.eventDate).toISOString() });
                          queryClient.invalidateQueries({ queryKey: [`/api/artists/${currentUserId}/events`] });
                          queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId, "events/attending"] });
                          setShowEventForm(false);
                          setEventForm({ name: "", eventDate: "", city: "", venue: "", description: "", ticketUrl: "" });
                          toast({ title: t.eventAddedTitle });
                        } catch {
                          toast({ title: t.error, variant: "destructive" });
                        }
                      }}>{t.save}</Button>
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
                                queryClient.invalidateQueries({ queryKey: [`/api/artists/${currentUserId}/events`] });
                                toast({ title: t.eventDeletedTitle });
                              } catch {
                                toast({ title: t.error, variant: "destructive" });
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
     ) : null}
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
                            await apiRequest("DELETE", `/api/events/${event.id}/attend`, { userId: currentUserId });
                            queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId, "events/attending"] });
                            toast({ title: "Evento rimosso" });
                          } catch {
                            toast({ title: t.error, variant: "destructive" });
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

{currentUser?.role === "artist" && (
  <TabsContent value="goals" className="mt-4">
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t.goals} ({myArtistGoals.length})
        </p>
        <Button size="sm" variant="outline" onClick={() => setShowGoalForm(!showGoalForm)}>
          <Plus className="w-4 h-4 mr-1" />
          {t.addGoal}
        </Button>
      </div>

      {showGoalForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder={t.goalTitle}
              value={goalForm.title}
              onChange={(e) => setGoalForm((prev) => ({ ...prev, title: e.target.value }))}
            />

            <Textarea
              placeholder={t.goalDescription}
              value={goalForm.description}
              onChange={(e) => setGoalForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
            />

            <Input
              type="number"
              min="1"
              placeholder={t.goalTargetAmount}
              value={goalForm.targetAmount}
              onChange={(e) => setGoalForm((prev) => ({ ...prev, targetAmount: e.target.value }))}
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowGoalForm(false);
                  setGoalForm({ title: "", description: "", targetAmount: "" });
                }}
              >
                {t.cancel}
              </Button>

              <Button
                className="flex-1"
                onClick={async () => {
                  if (!goalForm.title.trim() || !goalForm.targetAmount.trim()) {
                    toast({ title: t.eventRequiredError, variant: "destructive" });
                    return;
                  }

                  try {
                    await apiRequest("POST", "/api/goals", {
                      artistId: currentUserId,
                      title: goalForm.title.trim(),
                      description: goalForm.description.trim(),
                      targetAmount: goalForm.targetAmount,
                    });

                    await queryClient.invalidateQueries({
                      queryKey: [`/api/artists/${currentUserId}/goals`],
                    });

                    setShowGoalForm(false);
                    setGoalForm({ title: "", description: "", targetAmount: "" });
                    toast({ title: t.goalCreatedTitle });
                  } catch {
                    toast({ title: t.error, variant: "destructive" });
                  }
                }}
              >
                {t.save}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {myArtistGoals.length > 0 ? (
        <div className="flex flex-col gap-3">
          {myArtistGoals.map((goal) => {
            const current = Number(goal.currentAmount ?? 0);
            const target = Number(goal.targetAmount ?? 0);
            const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;

            return (
              <Card key={goal.id}>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
  <div className="min-w-0">
    <h4 className="font-medium break-words">{goal.title}</h4>

    {goal.description && (
      <p className="text-sm text-muted-foreground mt-1 break-words">
        {goal.description}
      </p>
    )}
  </div>

  <button
    className="text-xs text-red-400 hover:text-red-600 shrink-0"
    onClick={async () => {
      try {
        await apiRequest("DELETE", `/api/goals/${goal.id}`, {
          artistId: currentUserId,
        });

        await queryClient.invalidateQueries({
          queryKey: [`/api/artists/${currentUserId}/goals`],
        });

        toast({ title: t.goalDeletedTitle });
      } catch {
        toast({
          title: t.error,
          description: t.goalDeleteError,
          variant: "destructive",
        });
      }
    }}
  >
    🗑️
  </button>
</div>
                  </div>

                  <Progress value={progress} className="h-2" />

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t.raised}: €{current.toFixed(2)}</span>
                    <span>{t.target}: €{target.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-8">{t.noGoals}</p>
      )}
    </div>
  </TabsContent>
)}

        
{currentUser?.role !== "artist" && (
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
       )}
     </Tabs>

      {currentUser?.role === "artist" && (
  <Dialog open={connectionsOpen} onOpenChange={setConnectionsOpen}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle className="text-center">{t.connections}</DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          className={`py-2 rounded-xl text-sm font-medium transition ${
            connectionsTab === "followers"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
          onClick={() => setConnectionsTab("followers")}
        >
          {t.followers} ({followersList.length})
        </button>

        <button
          className={`py-2 rounded-xl text-sm font-medium transition ${
            connectionsTab === "following"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
          onClick={() => setConnectionsTab("following")}
        >
          {t.following} ({followedArtists.length})
        </button>
      </div>

      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
        {connectionsTab === "followers" ? (
          followersList.length > 0 ? (
            followersList.map((user) => (
              <Link key={user.id} href={`/artist/${user.id}`}>
                <div
                  className="flex items-center gap-3 p-2 rounded-lg hover-elevate cursor-pointer"
                  onClick={() => setConnectionsOpen(false)}
                >
                  <Avatar className="w-10 h-10">
                    {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.displayName} />}
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {user.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-4 text-sm">{t.noFollowers}</p>
          )
        ) : followedArtists.length > 0 ? (
          followedArtists.map((user) => (
            <Link key={user.id} href={`/artist/${user.id}`}>
              <div
                className="flex items-center gap-3 p-2 rounded-lg hover-elevate cursor-pointer"
                onClick={() => setConnectionsOpen(false)}
              >
                <Avatar className="w-10 h-10">
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.displayName} />}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user.displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <p className="text-center text-muted-foreground py-4 text-sm">{t.noFollowing}</p>
        )}
      </div>
    </DialogContent>
  </Dialog>
)}
      
      {pendingVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl w-full max-w-sm p-4 space-y-3">
            <h3 className="font-semibold">{t.shareToFeed}</h3>
            <video src={pendingVideo.previewUrl} controls className="w-full rounded-lg max-h-48 object-cover" />
            <div className="relative">
             <div className="relative">
              <textarea
                className="w-full p-3 rounded-lg bg-muted border-0 text-sm outline-none resize-none"
                placeholder={t.writeSomething}
                rows={3}
                value={pendingVideoText}
                onChange={e => { setPendingVideoText(e.target.value); handleVideoTextChange(e.target.value, e.target.selectionStart || 0); }}
              />
              <MentionDropdown query={videoMentionQuery} visible={showVideoMentions} onSelect={(username) => { setPendingVideoText(insertVideoMention(pendingVideoText, username)); closeVideoMentions(); }} />
            </div>
            <div className="flex gap-2">
              <Button
  variant="outline"
  className="flex-1"
  onClick={() => {
    setPendingVideo(null);
    setPendingVideoText("");
  }}
>
  {t.dontShare}
</Button>
              
              <Button className="flex-1" disabled={uploadingType === "uploading-video"} onClick={async () => {
                setUploadingType("uploading-video");
                try {
                  const url = await uploadVideoDirectToCloudinary(pendingVideo.videoFile);

await apiRequest("POST", `/api/users/${currentUserId}/videos`, {
  title: pendingVideoText || t.untitledVideo,
  videoUrl: url,
  thumbnailUrl: url,
});
                 queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId, "videos"] });
                 queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
                 toast({ title: t.videoUploadedTitle });
                } catch {
                  toast({ title: t.error, variant: "destructive" });
                } finally {
                  setUploadingType(null);
                  setPendingVideo(null);
                  setPendingVideoText("");
                }
              }}>
                {t.publish}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={() => setSelectedVideo(null)}>
          <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            <div className="w-full max-w-lg bg-background rounded-xl overflow-hidden h-[calc(100dvh-8rem)] max-h-[88dvh] flex flex-col">
              <video
  src={selectedVideo.videoUrl}
  controls
  className="w-full max-h-[34vh] sm:max-h-[42vh] object-contain bg-black shrink-0"
/>
              <div className="p-4 flex flex-col flex-1 min-h-0 overflow-hidden">
                {selectedVideo.title && selectedVideo.title !== "Video" && <p className="font-medium whitespace-pre-wrap break-words">
  <MentionText text={selectedVideo.title} />
</p>}
                <p className="text-xs text-muted-foreground mb-3">
                  {selectedVideo.createdAt && new Date(selectedVideo.createdAt).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
                <div className="flex items-center gap-4 mb-1 border-b pb-2 shrink-0">
                  <button
  className="flex items-center gap-1 text-sm text-muted-foreground opacity-50 cursor-not-allowed"
  disabled={true}
>
  <Heart className="w-5 h-5" />
  <span>{videoLikeCount[selectedVideo.id] ?? Number((selectedVideo as any).likesCount ?? 0)}</span>
</button>
                 <button
  className="flex items-center gap-1 text-sm text-muted-foreground"
  onClick={async (e) => {
    e.stopPropagation();

    const shareUrl = buildContentShareUrl("video", selectedVideo.id);

    const result = await shareVibyngContent({
      title: selectedVideo.title || t.untitledVideo,
      text: selectedVideo.title || t.untitledVideo,
      mediaUrl: selectedVideo.videoUrl ?? undefined,
      fallbackUrl: shareUrl,
      shareUrl,
      fileName: `video-${selectedVideo.id}`,
    });

    if (result === "copied") {
      toast({ title: t.copied });
    }
  }}
>
 <Share2 className="w-5 h-5" />
{t.share}
</button>
                  <button
                    className="flex items-center gap-1 text-sm text-red-500"
                    onClick={async () => {
                      try {
                        await apiRequest("DELETE", `/api/videos/${selectedVideo.id}`);
                        queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId, "videos"] });
                        setSelectedVideo(null);
                        toast({ title: "Video eliminato" });
                      } catch {
                        toast({ title: t.error, variant: "destructive" });
                      }
                    }}
                  >
                    🗑️
                  </button>
                  <button className="ml-auto text-muted-foreground text-lg" onClick={() => setSelectedVideo(null)}>✕</button>
                </div>
                <div className="mt-0 pt-2 px-4 pb-0 flex flex-col flex-1 min-h-0 overflow-hidden">
  <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1 pb-2">
    {videoCommentsList.map((c: any) => (
      <div key={c.id} className="flex items-start gap-3">
        <Avatar className="w-9 h-9 flex-shrink-0">
          {c.avatar_url && <AvatarImage src={c.avatar_url} alt={c.display_name} />}
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {c.display_name?.charAt(0)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 bg-muted rounded-xl px-4 py-3 min-w-0">
  <div className="flex items-start justify-between gap-2">
   <CommentAuthorName
  comment={comment}
  className="block text-sm font-semibold min-w-0 truncate"
/>

    {Number(c.author_id) !== Number(currentUserId) && (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full shrink-0 -mt-1 -mr-1"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();

          openReport({
            targetType: "comment",
            targetId: String(c.id),
            targetOwnerId: Number(c.author_id),
            title: t.reportComment,
            description: t.reportContentDescription,
          });
        }}
        aria-label={t.reportComment}
      >
        <MoreVertical className="w-4 h-4" />
      </Button>
    )}
  </div>

  <p className="text-sm whitespace-pre-wrap break-words">
    <MentionText text={c.content} />
  </p>

          <div className="flex items-center justify-between mt-2">
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
              {(Number(c.author_id) === Number(currentUserId) ||
                Number(selectedVideo.artistId) === Number(currentUserId)) && (
                <button
                  className="text-xs text-red-400 hover:text-red-600"
                  onClick={async () => {
                    await apiRequest("DELETE", `/api/videos/${selectedVideo.id}/comments/${c.id}`);
                    await refetchVideoComments();
                  }}
                >
                  🗑️
                </button>
              )}

              <button
                className={`flex items-center gap-1 text-xs ${
                  Number(c.author_id) === Number(currentUserId)
                    ? "opacity-50 cursor-not-allowed text-muted-foreground"
                    : c.likedByMe
                      ? "text-red-500"
                      : "text-muted-foreground hover:text-red-500"
                }`}
                disabled={Number(c.author_id) === Number(currentUserId)}
                onClick={async () => {
                  if (c.likedByMe) {
                    await apiRequest("POST", `/api/videos/${selectedVideo.id}/comments/${c.id}/unlike`, {
                      userId: currentUserId,
                    });
                  } else {
                    await apiRequest("POST", `/api/videos/${selectedVideo.id}/comments/${c.id}/like`, {
                      userId: currentUserId,
                    });
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

  <div className="pt-2 mt-2 border-t shrink-0 bg-background pb-1">
    <div className="flex items-center gap-2 rounded-xl border bg-background/95 px-3 py-2">
      <div className="relative flex-1">
        <input
          className="w-full h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 text-base placeholder:text-[14px]"
          placeholder={t.commentPlaceholder}
          value={videoCommentInput}
          onChange={e => {
            setVideoCommentInput(e.target.value);
            handleVideoCommentTextChange(e.target.value, e.target.selectionStart || 0);
          }}
          onKeyDown={async e => {
            if (e.key === "Enter" && videoCommentInput.trim()) {
              await apiRequest("POST", `/api/videos/${selectedVideo.id}/comments`, {
                authorId: currentUserId,
                content: videoCommentInput.trim(),
              });
              setVideoCommentInput("");
              closeVideoCommentMentions();
              await refetchVideoComments();
              await queryClient.invalidateQueries({ queryKey: ["/api/vpoints", currentUserId, "status"] });
              await queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId] });
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

      <Button
        size="icon"
        className="shrink-0"
        onClick={async () => {
          if (!videoCommentInput.trim()) return;
          await apiRequest("POST", `/api/videos/${selectedVideo.id}/comments`, {
            authorId: currentUserId,
            content: videoCommentInput.trim(),
          });
          setVideoCommentInput("");
          closeVideoCommentMentions();
          await refetchVideoComments();
          await queryClient.invalidateQueries({ queryKey: ["/api/vpoints", currentUserId, "status"] });
          await queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId] });
        }}
        disabled={!videoCommentInput.trim()}
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  </div>
</div>
              </div>
            </div>
          </div>
        </div>
      )}
      {pendingPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl w-full max-w-sm p-4 space-y-3">
            <h3 className="font-semibold">{t.shareToFeed}</h3>
            <img src={pendingPhoto.imageData} alt="preview" className="w-full h-48 object-cover rounded-lg" />
           <div className="relative">
              <textarea
                className="w-full p-3 rounded-lg bg-muted border-0 text-sm outline-none resize-none"
                placeholder={t.writeSomething}
                rows={3}
                value={pendingPostText}
                onChange={e => { setPendingPostText(e.target.value); handlePhotoTextChange(e.target.value, e.target.selectionStart || 0); }}
              />
              <MentionDropdown query={photoMentionQuery} visible={showPhotoMentions} onSelect={(username) => { setPendingPostText(insertPhotoMention(pendingPostText, username)); closePhotoMentions(); }} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setPendingPhoto(null); setPendingPostText(""); }}>
               {t.dontShare}
              </Button>
              <Button className="flex-1" disabled={uploadingType === "publishing"} onClick={async () => {
                setUploadingType("publishing");
                try {
                 await apiRequest("POST", `/api/users/${currentUserId}/photos`, {
                    title: pendingPostText || t.untitledPhoto,
                    imageUrl: pendingPhoto.imageData,
                    description: pendingPostText,
                  });
                  queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId, "photos"] });
                  await queryClient.refetchQueries({ queryKey: ["/api/posts", currentUserId] });
                  toast({ title: t.postPublishedTitle });
                } catch {
                  toast({ title: t.error, variant: "destructive" });
                } finally {
                  setUploadingType(null);
                  setPendingPhoto(null);
                  setPendingPostText("");
                }
              }}>
                {t.publish}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
