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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Music2, Trophy, Heart, Zap, Video, Music, Play, Pause, Users, MessageCircle, Plus, Check, Camera, Send, ImagePlus, UserPlus, UserMinus, ImageIcon, FileText, Calendar, Share2, Ban, MoreVertical, Flag } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { useState, useRef, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMention } from "@/hooks/use-mention";
import { MentionDropdown } from "@/components/mention-dropdown";
import { MentionText } from "@/components/mention-text";
import { useToast } from "@/hooks/use-toast";
import { shareVibyngContent, buildContentShareUrl } from "@/lib/share-content";
import { useAudioPlayer, type Song } from "@/components/audio-player";
import type { User, ArtistGoal, ArtistPhoto, ArtistVideo, ArtistSong, Post, Event } from "@shared/schema";

function getCurrentUserId(): number {
  try {
    const stored = localStorage.getItem("vibyng-user");
    if (stored) return JSON.parse(stored).id || 1;
  } catch {}
  return 1;
}

type AppLanguage = "it" | "en";

const artistProfileTranslations = {
  it: {
    loading: "Caricamento...",
    commentPlaceholder: "Scrivi un commento...",
    postPlaceholder: "A cosa stai pensando?",
    publish: "Pubblica",

    posts: "Post",
    photos: "Foto",
    videos: "Video",
    messages: "Messaggi",
    songs: "Canzoni",
    events: "Eventi",
    connections: "Connessioni",
    comments: "Commenti",

    roleArtist: "Artista",
    roleRehearsalStudio: "Sala Prove",
    roleRecordingStudio: "Studio di Registrazione",
    roleRecordLabel: "Casa Discografica",
    roleFan: "Fan",

    follower: "follower",
    follow: "Segui",
    unfollow: "Non seguire più",

    followTitle: "Ora segui",
    followDescription: "Stai seguendo",
    unfollowTitle: "Non segui più",
    unfollowDescription: "Hai smesso di seguire",

    avatarUpdatedTitle: "Foto profilo aggiornata!",
    postPublishedTitle: "Post pubblicato!",
    error: "Errore",

    supportThanksTitle: "Grazie per il supporto!",
    supportThanksDescription: "Hai guadagnato 50 VibyngPoints",
    supportErrorDescription: "Non è stato possibile completare il supporto",
    copied: "Link copiato!",
    share: "Condividi",

alreadyInPlaylistTitle: "Già nella playlist",
alreadyInPlaylistDescription: "è già nella tua playlist",
addedToPlaylistTitle: "Aggiunto alla playlist!",
addedToPlaylistDescription: "è stato aggiunto",

supportArtist: "Supporta l'artista",
supportArtistDescriptionPrefix: "Aiuta",
supportArtistDescriptionSuffix: "a raggiungere i suoi obiettivi!",
supportButton: "Supporta",
supportReward: "Riceverai 50 VibyngPoints per il tuo supporto!",

supportThisGoal: "Supporta questo obiettivo",
openSupportModal: "Apri supporto",
oneTimeSupport: "Una tantum",
monthlySupport: "Mensile",
monthlySupportTitle: "Supporter mensile",
monthlySupportPrice: "€4,99 / mese",
monthlySupportDescription: "Sostieni questo artista ogni mese",
customAmount: "Importo libero",
continueToStripe: "Continua con Stripe",
secureStripePayment: "Pagamento sicuro gestito da Stripe",
invalidSupportAmount: "Inserisci un importo valido",
stripeCheckoutError: "Non è stato possibile aprire il pagamento Stripe",    

noPosts: "Nessun post ancora.",
noPhotos: "Nessuna foto disponibile",
noVideos: "Nessun video disponibile",
noSongs: "Nessuna canzone disponibile",
noEvents: "Nessun evento in programma",
noFollowers: "Nessun follower ancora",
noFollowing: "Non segue ancora nessuno",

untitledPhoto: "Foto",
untitledVideo: "Video",
photoShareText: "Foto su Vibyng",
videoShareText: "Video su Vibyng",

postBy: "Post di",
postDeletedTitle: "Post eliminato",

add: "Aggiungi",
cancel: "Annulla",
save: "Salva",
eventName: "Nome evento *",
city: "Città",
venue: "Venue / Locale",
eventDescription: "Descrizione (opzionale)",
ticketUrl: "Link biglietti (opzionale)",
eventRequiredError: "Compila nome e data",
eventAddedTitle: "Evento aggiunto!",
eventDeletedTitle: "Evento eliminato",
attend: "Partecipo",
eventAttendTitle: "Partecipi all'evento! 🎉",
buyTickets: "Acquista biglietti",
eventsAttending: "Eventi a cui partecipa",

messageWith: "Messaggi con",
privateMessageDescription: "Invia un messaggio privato per interagire direttamente!",
startConversation: "Inizia una conversazione",
blockProfile: "Blocca profilo",
unblockProfile: "Sblocca profilo",
profileBlockedTitle: "Profilo bloccato",
profileBlockedDescription: "Questo profilo non potrà più inviarti messaggi.",
profileUnblockedTitle: "Profilo sbloccato",
profileUnblockedDescription: "Questo profilo può nuovamente interagire con te.",
blockErrorDescription: "Non è stato possibile aggiornare il blocco.",
profileActions: "Azioni profilo",
profileActionsDescription: "Gestisci le interazioni con questo profilo.",
profileUnavailableTitle: "Profilo non disponibile",
profileUnavailableDescriptionChecking: "Verifica disponibilità del profilo...",
profileUnavailableDescriptionBlockedByViewer: "Hai bloccato questo profilo. Sbloccalo dal menu in alto a destra per tornare a visualizzare i contenuti.",
profileUnavailableDescriptionBlockedViewer: "Questo profilo non è disponibile.",    
reportProfile: "Segnala profilo",
reportContentTitle: "Segnala contenuto",
reportContentDescription: "Aiutaci a capire cosa non va in questo contenuto.",
reportPost: "Segnala post",
reportPhoto: "Segnala foto",
reportVideo: "Segnala video",
reportComment: "Segnala commento",    
reportProfileTitle: "Segnala profilo",
reportProfileDescription: "Aiutaci a capire cosa non va in questo profilo.",
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

activeGoal: "Obiettivo Attivo",
goalReached: "raggiunto",
goals: "Obiettivi",
noGoals: "Nessun obiettivo disponibile",
raised: "Raccolto",
target: "Obiettivo",    
  },

  en: {
    loading: "Loading...",
    commentPlaceholder: "Write a comment...",
    postPlaceholder: "What's on your mind?",
    publish: "Publish",

    posts: "Posts",
    photos: "Photos",
    videos: "Videos",
    messages: "Messages",
    songs: "Songs",
    events: "Events",
    connections: "Connections",
    comments: "Comments",

    roleArtist: "Artist",
    roleRehearsalStudio: "Rehearsal Studio",
    roleRecordingStudio: "Recording Studio",
    roleRecordLabel: "Record Label",
    roleFan: "Fan",

    follower: "followers",
    follow: "Follow",
    unfollow: "Unfollow",

    followTitle: "Now following",
    followDescription: "You are following",
    unfollowTitle: "No longer following",
    unfollowDescription: "You stopped following",

    avatarUpdatedTitle: "Profile photo updated!",
    postPublishedTitle: "Post published!",
    error: "Error",

    supportThanksTitle: "Thanks for your support!",
    supportThanksDescription: "You earned 50 VibyngPoints",
    supportErrorDescription: "Unable to complete the support",
    copied: "Link copied!",
share: "Share",

alreadyInPlaylistTitle: "Already in playlist",
alreadyInPlaylistDescription: "is already in your playlist",
addedToPlaylistTitle: "Added to playlist!",
addedToPlaylistDescription: "has been added",

supportArtist: "Support artist",
supportArtistDescriptionPrefix: "Help",
supportArtistDescriptionSuffix: "reach their goals!",
supportButton: "Support",
supportReward: "You will receive 50 VibyngPoints for your support!",

supportThisGoal: "Support this goal",
openSupportModal: "Open support",
oneTimeSupport: "One-time",
monthlySupport: "Monthly",
monthlySupportTitle: "Monthly supporter",
monthlySupportPrice: "€4.99 / month",
monthlySupportDescription: "Support this artist every month",
customAmount: "Custom amount",
continueToStripe: "Continue with Stripe",
secureStripePayment: "Secure payment powered by Stripe",
invalidSupportAmount: "Enter a valid amount",
stripeCheckoutError: "Unable to open Stripe payment",    

noPosts: "No posts yet.",
noPhotos: "No photos available",
noVideos: "No videos available",
noSongs: "No songs available",
noEvents: "No upcoming events",
noFollowers: "No followers yet",
noFollowing: "Not following anyone yet",

untitledPhoto: "Photo",
untitledVideo: "Video",
photoShareText: "Photo on Vibyng",
videoShareText: "Video on Vibyng",

postBy: "Post by",
postDeletedTitle: "Post deleted",

add: "Add",
cancel: "Cancel",
save: "Save",
eventName: "Event name *",
city: "City",
venue: "Venue / Venue name",
eventDescription: "Description optional",
ticketUrl: "Ticket link optional",
eventRequiredError: "Please enter name and date",
eventAddedTitle: "Event added!",
eventDeletedTitle: "Event deleted",
attend: "Attend",
eventAttendTitle: "You are attending the event! 🎉",
buyTickets: "Buy tickets",
eventsAttending: "Events this user attends",

messageWith: "Messages with",
privateMessageDescription: "Send a private message to interact directly!",
startConversation: "Start a conversation",
blockProfile: "Block profile",
unblockProfile: "Unblock profile",
profileBlockedTitle: "Profile blocked",
profileBlockedDescription: "This profile can no longer send you messages.",
profileUnblockedTitle: "Profile unblocked",
profileUnblockedDescription: "This profile can interact with you again.",
profileUnavailableTitle: "Profile unavailable",
profileUnavailableDescriptionChecking: "Checking profile availability...",
profileUnavailableDescriptionBlockedByViewer: "You blocked this profile. Unblock it from the top-right menu to view its content again.",
profileUnavailableDescriptionBlockedViewer: "This profile is unavailable.",    
blockErrorDescription: "Unable to update block status.",
profileActions: "Profile actions",
profileActionsDescription: "Manage your interactions with this profile.",
reportProfile: "Report profile",
reportContentTitle: "Report content",
reportContentDescription: "Help us understand what is wrong with this content.",
reportPost: "Report post",
reportPhoto: "Report photo",
reportVideo: "Report video",
reportComment: "Report comment",    
reportProfileTitle: "Report profile",
reportProfileDescription: "Help us understand what is wrong with this profile.",
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

activeGoal: "Active Goal",
goalReached: "reached",
goals: "Goals",
noGoals: "No goals available",
raised: "Raised",
target: "Target",    
  },
} as const;

function getStoredLanguage(): AppLanguage {
  try {
    const stored = localStorage.getItem("vibyng-language");
    if (stored === "it" || stored === "en") return stored;
  } catch {}
  return "it";
}

function getRoleLabel(role: string, t: typeof artistProfileTranslations.it): string {
  switch (role) {
    case "artist": return t.roleArtist;
    case "rehearsal_studio": return t.roleRehearsalStudio;
    case "recording_studio": return t.roleRecordingStudio;
    case "record_label": return t.roleRecordLabel;
    default: return t.roleFan;
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function ArtistPostComments({
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
  const { mentionQuery, showMentions, handleTextChange, insertMention, closeMentions } = useMention();
  const currentUserId = getCurrentUserId();

  const { data: comments = [], isLoading, refetch } = useQuery<any[]>({
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
  await queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUserId}`] });
};

  return (
    <div className="border-t pt-3 mt-2 space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
         <Input placeholder={commentPlaceholder} value={newComment} onChange={e => { setNewComment(e.target.value); handleTextChange(e.target.value, e.target.selectionStart || 0); }} onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }} className="w-full" />
          <MentionDropdown query={mentionQuery} visible={showMentions} onSelect={(username) => { setNewComment(insertMention(newComment, username)); closeMentions(); }} />
        </div>
        <Button size="icon" onClick={handleSubmit} disabled={!newComment.trim()}><Send className="w-4 h-4" /></Button>
      </div>
      {comments.map((comment: any) => (
        <div key={comment.id} className="flex gap-2">
          <Link href={`/artist/${comment.authorId}`}>
            <Avatar className="w-8 h-8 cursor-pointer">
              {comment.author?.avatarUrl && <AvatarImage src={comment.author.avatarUrl} alt={comment.author.displayName} />}
              <AvatarFallback className="bg-primary/10 text-primary text-xs">{comment.author?.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 bg-muted rounded-lg px-3 py-2">
  <div className="flex items-start justify-between gap-2">
    <p className="text-sm font-semibold min-w-0 truncate">
      {comment.author?.displayName}
    </p>

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
                {comment.createdAt && new Date(comment.createdAt).toLocaleDateString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
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
export default function ArtistProfile() {
  const { id } = useParams<{ id: string }>();
  const artistId = Number(id);
  const currentUserId = getCurrentUserId();
  const [language, setLanguage] = useState<AppLanguage>(getStoredLanguage);
  const t = artistProfileTranslations[language];
  const isOwnProfile = artistId === currentUserId;

  const { toast } = useToast();
  const { playSong, currentSong, isPlaying, togglePlay } = useAudioPlayer();
  const { mentionQuery, showMentions, handleTextChange, insertMention, closeMentions } = useMention();
  const { mentionQuery: photoCommentMentionQuery, showMentions: showPhotoCommentMentions, handleTextChange: handlePhotoCommentTextChange, insertMention: insertPhotoCommentMention, closeMentions: closePhotoCommentMentions } = useMention();
  const { mentionQuery: videoCommentMentionQuery, showMentions: showVideoCommentMentions, handleTextChange: handleVideoCommentTextChange, insertMention: insertVideoCommentMention, closeMentions: closeVideoCommentMentions } = useMention();
  const [supportAmount, setSupportAmount] = useState("5");
  const [supportOpen, setSupportOpen] = useState(false);
  const [profileActionsOpen, setProfileActionsOpen] = useState(false);
  const [reportProfileOpen, setReportProfileOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
  targetType: "user" | "post" | "photo" | "video" | "comment";
  targetId: string;
  targetOwnerId: number | null;
  title: string;
  description: string;
} | null>(null);
const [reportReason, setReportReason] = useState("offensive");
const [reportDetails, setReportDetails] = useState("");
  const [supportMode, setSupportMode] = useState<"one_time" | "monthly">("one_time");
  const [supportGoalId, setSupportGoalId] = useState<number | null>(null);
  const [addedSongs, setAddedSongs] = useState<Set<number>>(new Set());
  const [postText, setPostText] = useState("");
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});
  const [openComments, setOpenComments] = useState<Set<number>>(new Set());
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  const [selectedPhotoIsTall, setSelectedPhotoIsTall] = useState(false);
  const [photoCommentsOpen, setPhotoCommentsOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);

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
  
  const [videoCommentInput, setVideoCommentInput] = useState("");
  const [videoLikeCount, setVideoLikeCount] = useState<Record<number, number>>({});
  const { data: videoCommentsList = [], refetch: refetchVideoComments } = useQuery<any[]>({
  queryKey: ["/api/videos", selectedVideo?.id, "comments", currentUserId],
  queryFn: async () => {
    if (!selectedVideo?.id) return [];
    const res = await fetch(`/api/videos/${selectedVideo.id}/comments?userId=${currentUserId}`);
    return res.json();
  },
    enabled: !!selectedVideo,
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
  const [photoLikes, setPhotoLikes] = useState<Record<number, boolean>>({});
  const [photoComments, setPhotoComments] = useState<Record<number, string[]>>({});
  const [commentInput, setCommentInput] = useState("");
  const { data: selectedPhotoData } = useQuery<any>({
    queryKey: ["/api/photos", selectedPhoto?.id, "data"],
    queryFn: async () => {
      if (!selectedPhoto?.id) return null;
      const res = await fetch(`/api/users/${artistId}/photos?t=${Date.now()}`);
      const photos = await res.json();
      return photos.find((p: any) => p.id === selectedPhoto.id) || null;
    },
    enabled: !!selectedPhoto?.id,
    refetchInterval: 10000,
    staleTime: 0,
  });
  const { data: photoLikeData, refetch: refetchPhotoLike } = useQuery<{ liked: boolean }>({
    queryKey: ["/api/photos", selectedPhoto?.id, "liked", currentUserId],
    queryFn: async () => {
      if (!selectedPhoto?.id) return { liked: false };
      const res = await fetch(`/api/photos/${selectedPhoto.id}/liked/${currentUserId}`);
      return res.json();  
    },
    enabled: !!selectedPhoto?.id,
    staleTime: 0,
  });
  const isPhotoLiked = photoLikeData?.liked ?? false;
  const [photoLikeCount, setPhotoLikeCount] = useState<Record<number, number>>({});
  const { data: photoCommentsList = [], refetch: refetchPhotoComments } = useQuery<any[]>({
  queryKey: ["/api/photos", selectedPhoto?.id, "comments", currentUserId],
  queryFn: async () => {
    if (!selectedPhoto?.id) return [];
    const res = await fetch(`/api/photos/${selectedPhoto.id}/comments?userId=${currentUserId}`);
    return res.json();
  },
  enabled: !!selectedPhoto?.id,
 });
  const [attendingEventIds, setAttendingEventIds] = useState<Set<number>>(new Set());
  const [eventForm, setEventForm] = useState({ name: "", eventDate: "", city: "", venue: "", description: "", ticketUrl: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const { data: artist, isLoading: artistLoading } = useQuery<User>({
    queryKey: [`/api/users/${id}`],
  });

  const { data: goals } = useQuery<ArtistGoal[]>({
    queryKey: [`/api/artists/${id}/goals`],
    enabled: !!artist && artist.role === "artist",
  });

 const { data: photos } = useQuery<ArtistPhoto[]>({
    queryKey: ["/api/users", artistId, "photos"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${artistId}/photos?t=${Date.now()}`);
      return res.json();
    },
    refetchInterval: 30000,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    if (selectedPhoto && photos) {
      const updated = photos.find((p: any) => p.id === selectedPhoto.id);
      if (updated && updated.likesCount !== selectedPhoto.likesCount) {
        setSelectedPhoto(updated);
      }
    }
  }, [photos]);

  const { data: videos } = useQuery<ArtistVideo[]>({
    queryKey: ["/api/users", artistId, "videos"],
  });

  const { data: songs } = useQuery<ArtistSong[]>({
    queryKey: [`/api/artists/${id}/songs`],
    enabled: !!artist && artist.role === "artist",
  });

  const { data: myPlaylistSongs = [] } = useQuery<ArtistSong[]>({
  queryKey: [`/api/artists/${currentUserId}/songs`],
  enabled: !!currentUserId,
});

  const isSongAlreadyInPlaylist = (song: ArtistSong): boolean => {
  return (
    addedSongs.has(song.id) ||
    myPlaylistSongs.some((playlistSong: ArtistSong) => {
      const sameAudio = playlistSong.audioUrl && playlistSong.audioUrl === song.audioUrl;
      const sameTitleAndDuration =
        playlistSong.title === song.title &&
        Number(playlistSong.duration ?? 0) === Number(song.duration ?? 0);

      return Boolean(sameAudio || sameTitleAndDuration);
    })
  );
};

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
  const [activeTab, setActiveTab] = useState("posts");

  const { data: isFollowingData } = useQuery<{ isFollowing: boolean }>({
    queryKey: ["/api/users", currentUserId, "following", artistId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${currentUserId}/following/${artistId}`);
      return res.json();
    },
    enabled: !isOwnProfile,
  });

const { data: blockStatus, refetch: refetchBlockStatus } = useQuery<{
  blockedByViewer: boolean;
  blockedViewer: boolean;
  anyBlock: boolean;
}>({
  queryKey: ["/api/users", currentUserId, "blocked", artistId],
  queryFn: async () => {
    const res = await fetch(`/api/users/${currentUserId}/blocked/${artistId}`);
    return res.json();
  },
  enabled: !isOwnProfile,
  refetchInterval: !isOwnProfile ? 1000 : false,
  refetchOnWindowFocus: true,
  staleTime: 0,
});
  
  const { data: artistPosts = [] } = useQuery<(Post & { author: User })[]>({
    queryKey: ["/api/users", artistId, "posts"],
    refetchInterval: 30000,
    staleTime: 0,
  });

  const { data: likedPostIds = [] } = useQuery<number[]>({
    queryKey: ["/api/likes", currentUserId, artistId],
    queryFn: async () => {
      if (!artistPosts || artistPosts.length === 0) return [];
      const results = await Promise.all(
        artistPosts.map(async (post: any) => {
          const res = await fetch(`/api/posts/${post.id}/liked/${currentUserId}`);
          const data = await res.json();
          return data.liked ? Number(post.id) : null;
        })
      );
      return results.filter(Boolean) as number[];
    },
    enabled: !!artistPosts && artistPosts.length > 0,
    staleTime: 0,
  });

  useEffect(() => {
    if (likedPostIds.length > 0) {
      setLikedPosts(new Set(likedPostIds.map(Number)));
    }
  }, [likedPostIds]);
  
  const { data: artistEvents = [] } = useQuery<Event[]>({
    queryKey: [`/api/artists/${id}/events`],
    enabled: !!artist && artist.role === "artist",
  });

  const { data: myAttendingEvents = [] } = useQuery<{ event: any }[]>({
    queryKey: ["/api/users", currentUserId, "events/attending"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${currentUserId}/events/attending`);
      return res.json();
    },
    staleTime: 0,
  });

const { data: profileAttendingEvents = [] } = useQuery<{ event: any }[]>({
    queryKey: ["/api/users", artistId, "events/attending"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${artistId}/events/attending`);
      return res.json();
    },
    enabled: !!artist && artist.role !== "artist",
  });

const openReport = (target: {
  targetType: "user" | "post" | "photo" | "video" | "comment";
  targetId: string;
  targetOwnerId: number | null;
  title: string;
  description: string;
}) => {
  setReportTarget(target);
  setReportReason("offensive");
  setReportDetails("");
  setProfileActionsOpen(false);
  setReportProfileOpen(true);
};
  
const blockMutation = useMutation({
  mutationFn: async () => {
    if (blockStatus?.blockedByViewer) {
      return apiRequest("DELETE", `/api/users/${currentUserId}/block/${artistId}`);
    }

    return apiRequest("POST", `/api/users/${currentUserId}/block/${artistId}`);
  },
  onSuccess: async () => {
    const wasBlockedByViewer = Boolean(blockStatus?.blockedByViewer);
    const isNowBlocking = !wasBlockedByViewer;

    queryClient.setQueryData(
  ["/api/users", currentUserId, "blocked", artistId],
  {
    blockedByViewer: isNowBlocking,
    blockedViewer: false,
    anyBlock: isNowBlocking,
  }
);

await refetchBlockStatus();

if (isNowBlocking) {
  queryClient.setQueryData(
    ["/api/users", currentUserId, "following", artistId],
    { isFollowing: false }
  );
}

    await queryClient.invalidateQueries({
      queryKey: ["/api/users", currentUserId, "following", artistId],
    });

    await queryClient.invalidateQueries({
      queryKey: [`/api/artists/${id}/followers/count`],
    });

    await queryClient.invalidateQueries({
      queryKey: ["/api/users", artistId, "followers"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["/api/users", currentUserId, "following"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["/api/messages", currentUserId, artistId],
    });

    await queryClient.invalidateQueries({
  queryKey: ["/api/users", currentUserId, "blocked", artistId],
});

await queryClient.invalidateQueries({
  queryKey: ["/api/users", artistId, "posts"],
});

await queryClient.invalidateQueries({
  queryKey: ["/api/users", artistId, "photos"],
});

await queryClient.invalidateQueries({
  queryKey: ["/api/users", artistId, "videos"],
});

await queryClient.invalidateQueries({
  queryKey: [`/api/artists/${id}/songs`],
});

await queryClient.invalidateQueries({
  queryKey: [`/api/artists/${id}/goals`],
});

await queryClient.invalidateQueries({
  queryKey: [`/api/artists/${id}/events`],
});

    setProfileActionsOpen(false);

    toast({
      title: wasBlockedByViewer ? t.profileUnblockedTitle : t.profileBlockedTitle,
      description: wasBlockedByViewer
        ? t.profileUnblockedDescription
        : t.profileBlockedDescription,
    });
  },
  onError: () => {
    toast({
      title: t.error,
      description: t.blockErrorDescription,
      variant: "destructive",
    });
  },
});

const reportProfileMutation = useMutation({
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
    setReportProfileOpen(false);
    setProfileActionsOpen(false);
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
  
  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowingData?.isFollowing) {
        return apiRequest("DELETE", `/api/users/${currentUserId}/follow/${artistId}`);
      } else {
        return apiRequest("POST", `/api/users/${currentUserId}/follow/${artistId}`);
      }
    },
    onSuccess: async () => {
  await queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId, "following", artistId] });
  await queryClient.invalidateQueries({ queryKey: [`/api/artists/${id}/followers/count`] });
  await queryClient.invalidateQueries({ queryKey: ["/api/vpoints", currentUserId, "status"] });
  await queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId] });
  await queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUserId}`] });

  toast({
  title: isFollowingData?.isFollowing ? t.unfollowTitle : t.followTitle,
  description: isFollowingData?.isFollowing
    ? `${t.unfollowDescription} ${artist?.displayName}`
    : `${t.followDescription} ${artist?.displayName}`,
});
},
  });

  const supportMutation = useMutation({
  mutationFn: async ({
    mode,
    amount,
    goalId,
  }: {
    mode: "one_time" | "monthly";
    amount: string;
    goalId: number | null;
  }) => {
    const numericAmount = Number(amount);

    if (mode === "one_time" && (!numericAmount || numericAmount < 1)) {
      throw new Error(t.invalidSupportAmount);
    }

    const res = await apiRequest("POST", "/api/stripe/create-support-checkout-session", {
      fanId: currentUserId,
      artistId,
      goalId,
      mode,
      amount: mode === "monthly" ? 4.99 : numericAmount,
    });

    return res.json();
  },

  onSuccess: (data: { url?: string }) => {
    if (!data?.url) {
      toast({
        title: t.error,
        description: t.stripeCheckoutError,
        variant: "destructive",
      });
      return;
    }

    window.location.href = data.url;
  },

 onError: (error: any) => {
    toast({
      title: t.error,
      description: error?.message || t.stripeCheckoutError,
      variant: "destructive",
    });

    console.error("[stripe-checkout-frontend]", error);
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
          toast({ title: t.avatarUpdatedTitle });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    } catch {
      toast({ title: t.error, variant: "destructive" });
    }
  };

 const handlePublishPost = async () => {
  if (!postText.trim()) return;
  try {
    await apiRequest("POST", "/api/posts", { authorId: currentUserId, content: postText });
    await queryClient.invalidateQueries({ queryKey: ["/api/users", artistId, "posts"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/vpoints", currentUserId, "status"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId] });
    await queryClient.invalidateQueries({ queryKey: [`/api/users/${id}`] });
    toast({ title: t.postPublishedTitle });
    setPostText("");
  } catch {
    toast({ title: t.error, variant: "destructive" });
  }
};

  const handlePlaySong = (song: ArtistSong) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      const playlist: Song[] = (songs || []).map(s => ({
        id: s.id,
        title: s.title,
        artist: artist?.displayName || t.roleArtist,
        audioUrl: s.audioUrl,
        coverUrl: s.coverUrl || undefined,
        duration: s.duration || undefined,
      }));
      playSong({
        id: song.id,
        title: song.title,
        artist: artist?.displayName || t.roleArtist,
        audioUrl: song.audioUrl,
        coverUrl: song.coverUrl || undefined,
        duration: song.duration || undefined,
      }, playlist);
    }
  };

const handleAddToPlaylist = async (song: ArtistSong) => {
  if (isSongAlreadyInPlaylist(song)) {
    toast({
      title: t.alreadyInPlaylistTitle,
      description: `"${song.title}" ${t.alreadyInPlaylistDescription}`,
    });
    return;
  }

  try {
    await apiRequest("POST", `/api/artists/${currentUserId}/songs`, {
      artistId: currentUserId,
      title: song.title,
      audioUrl: song.audioUrl,
      coverUrl: song.coverUrl,
      duration: song.duration,
    });

    await queryClient.invalidateQueries({
      queryKey: [`/api/artists/${currentUserId}/songs`],
    });

    setAddedSongs((prev) => new Set(prev).add(song.id));

    toast({
      title: t.addedToPlaylistTitle,
      description: `"${song.title}" ${t.addedToPlaylistDescription}`,
    });
  } catch {
    toast({ title: t.error, variant: "destructive" });
  }
};

  if (artistLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <Music2 className="w-8 h-8 text-primary" />
          <span className="text-muted-foreground">{t.loading}</span>
        </div>
      </div>
    );
  }

  if (!artist) {
    return null;
  }

const isArtist = artist.role === "artist";
const isFan = artist.role === "fan" || !artist.role;

const profileBlockCheckPending = !isOwnProfile && blockStatus === undefined;
const profileAccessBlocked = !isOwnProfile && Boolean(blockStatus?.anyBlock);
const shouldHideProfileContent = profileBlockCheckPending || profileAccessBlocked;

return (
    <div className="flex flex-col gap-4">
    <Dialog open={profileActionsOpen} onOpenChange={setProfileActionsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{t.profileActions}</DialogTitle>
    </DialogHeader>

    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t.profileActionsDescription}
      </p>

      <Button
        variant={blockStatus?.blockedByViewer ? "secondary" : "destructive"}
        className="w-full justify-start gap-2"
        onClick={() => blockMutation.mutate()}
        disabled={blockMutation.isPending}
      >
        <Ban className="w-4 h-4" />
        {blockStatus?.blockedByViewer ? t.unblockProfile : t.blockProfile}
      </Button>

      <Button
  variant="outline"
  className="w-full justify-start gap-2"
  onClick={() => {
    openReport({
      targetType: "user",
      targetId: String(artistId),
      targetOwnerId: artistId,
      title: t.reportProfileTitle,
      description: t.reportProfileDescription,
    });
  }}
>
  <Flag className="w-4 h-4" />
  {t.reportProfile}
</Button>
    </div>
  </DialogContent>
</Dialog>

<Dialog open={reportProfileOpen} onOpenChange={setReportProfileOpen}>
<DialogContent className="z-[130]">
    <DialogHeader>
     <DialogTitle>{reportTarget?.title || t.reportContentTitle}</DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {reportTarget?.description || t.reportContentDescription}
      </p>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          {t.reportReason}
        </label>

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
        <label className="text-sm font-medium">
          {t.reportDetails}
        </label>

        <Textarea
          value={reportDetails}
          onChange={(e) => setReportDetails(e.target.value)}
          placeholder={t.reportDetailsPlaceholder}
          rows={4}
        />
      </div>

      <Button
        className="w-full"
        onClick={() => reportProfileMutation.mutate()}
        disabled={reportProfileMutation.isPending}
      >
        {t.reportSubmit}
      </Button>
    </div>
  </DialogContent>
</Dialog>

      {/* Card Profilo */}
     <Card className="relative">
        <CardContent className="pt-6">
      {!isOwnProfile && (
  <div className="flex justify-end -mt-2 mb-1">
    <Button
      variant="ghost"
      size="icon"
      className="h-12 w-12 rounded-full"
      onClick={() => setProfileActionsOpen(true)}
      aria-label={t.profileActions}
    >
      <MoreVertical className="w-7 h-7" />
    </Button>
  </div>
)}    
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
              {getRoleLabel(artist.role || "fan", t)}
            </Badge>
            {artist.genre && (
              <Badge variant="secondary" className="mt-1">{artist.genre}</Badge>
            )}
           <div className="flex items-center justify-center gap-3 mt-3">
              {isArtist && !isOwnProfile ? (
                <button
                  className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => { setConnectionsTab("followers"); setConnectionsOpen(true); }}
                >
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">{followersData?.count ?? 0} {t.follower}</span>
                </button>
              ) : (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">{followersData?.count ?? 0} {t.follower}</span>
                </div>
              )}
             <div className="flex items-center gap-1 text-primary min-w-0">
  <Zap className="w-4 h-4 shrink-0" />
  <span className="text-[12px] font-medium leading-none whitespace-nowrap">
    {artist.vibyngPoints} VibyngPoints
  </span>
</div>
            </div>
         {!isOwnProfile && !shouldHideProfileContent && (
  <div className="mt-3 flex flex-wrap justify-center gap-2">
    <Button
      variant={isFollowingData?.isFollowing ? "outline" : "default"}
      size="sm"
      onClick={() => followMutation.mutate()}
      disabled={followMutation.isPending}
    >
      {isFollowingData?.isFollowing ? (
        <><UserMinus className="w-4 h-4 mr-1" /> {t.unfollow}</>
      ) : (
        <><UserPlus className="w-4 h-4 mr-1" /> {t.follow}</>
      )}
    </Button>
  </div>
)}
          </div>
          {artist.bio && (
            <p className="text-sm text-muted-foreground mt-4 text-center">{artist.bio}</p>
          )}
        </CardContent>
      </Card>

{shouldHideProfileContent && (
  <Card>
    <CardContent className="py-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Ban className="h-6 w-6 text-muted-foreground" />
      </div>

      <h2 className="text-base font-semibold">
        {t.profileUnavailableTitle}
      </h2>

      <p className="mt-2 text-sm text-muted-foreground">
        {profileBlockCheckPending
          ? t.profileUnavailableDescriptionChecking
          : blockStatus?.blockedByViewer
            ? t.profileUnavailableDescriptionBlockedByViewer
            : t.profileUnavailableDescriptionBlockedViewer}
      </p>
    </CardContent>
  </Card>
)}
      
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
                  placeholder={t.postPlaceholder}
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
                    {t.publish}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      {!shouldHideProfileContent && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`w-full grid ${isArtist ? "grid-cols-7" : "grid-cols-6"} p-1`}>
  <TabsTrigger value="posts" className="px-1 text-xs">
    <FileText className="w-4 h-4 sm:mr-1" />
    <span className="hidden sm:inline">{t.posts}</span>
  </TabsTrigger>

  <TabsTrigger value="photos" className="px-1 text-xs">
    <ImageIcon className="w-4 h-4 sm:mr-1" />
    <span className="hidden sm:inline">{t.photos}</span>
  </TabsTrigger>

  <TabsTrigger value="videos" className="px-1 text-xs">
    <Video className="w-4 h-4 sm:mr-1" />
    <span className="hidden sm:inline">{t.videos}</span>
  </TabsTrigger>

  <TabsTrigger value="messages" className="px-1 text-xs">
    <MessageCircle className="w-4 h-4 sm:mr-1" />
    <span className="hidden sm:inline">{t.messages}</span>
  </TabsTrigger>

  {isArtist && (
  <TabsTrigger value="songs" className="px-1 text-xs">
    <Music className="w-4 h-4 sm:mr-1" />
    <span className="hidden sm:inline">{t.songs}</span>
  </TabsTrigger>
)}
          
  {isArtist && (
    <TabsTrigger value="goals" className="px-1 text-xs">
      <Trophy className="w-4 h-4 sm:mr-1" />
      <span className="hidden sm:inline">{t.goals}</span>
    </TabsTrigger>
  )}

  <TabsTrigger value="events" className="px-1 text-xs">
    <Calendar className="w-4 h-4 sm:mr-1" />
    <span className="hidden sm:inline">{t.events}</span>
  </TabsTrigger>

  {isFan && (
    <TabsTrigger value="connections" className="px-1 text-xs">
      <Users className="w-4 h-4 sm:mr-1" />
      <span className="hidden sm:inline">{t.connections}</span>
    </TabsTrigger>
  )}
</TabsList>

        {/* Tab Post */}
        <TabsContent value="posts" className="mt-4">
          {artistPosts.length > 0 ? (
            <div className="flex flex-col gap-3">
              {artistPosts.map((post, index) => (
  <>
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
                    <p className="text-sm mt-1 whitespace-pre-wrap break-words">
  <MentionText text={post.content} />
</p>
                        {post.mediaUrl && (
                          <img src={post.mediaUrl} alt="media" className="w-full mt-2 rounded-lg max-h-60 object-cover" />
                        )}
                        <div className="flex items-center gap-3 mt-2">
                        <button
                            className={`flex items-center gap-1 text-xs ${!isOwnProfile && likedPosts.has(post.id) ? "text-red-500" : "text-muted-foreground"} ${isOwnProfile ? "opacity-50 cursor-not-allowed" : ""}`}
                            disabled={isOwnProfile}
                            onClick={async () => {
                              if (isOwnProfile) return;
                              const isLiked = likedPosts.has(post.id);
                              const newLiked = new Set(likedPosts);
                              if (isLiked) {
                                newLiked.delete(post.id);
                                await apiRequest("POST", `/api/posts/${post.id}/unlike`, { userId: currentUserId });
                              } else {
                                newLiked.add(post.id);
                                await apiRequest("POST", `/api/posts/${post.id}/like`, { userId: currentUserId });
                              }
                              setLikedPosts(new Set(newLiked));
                              const currentCount = likeCounts[post.id] ?? post.likesCount ?? 0;
                              setLikeCounts(prev => ({ ...prev, [post.id]: currentCount + (isLiked ? -1 : 1) }));
                            }}
                          >
                            <Heart className={`w-3 h-3 ${!isOwnProfile && likedPosts.has(post.id) ? "fill-red-500" : ""}`} />
                          {likeCounts[post.id] !== undefined ? likeCounts[post.id] : post.likesCount}
                          </button>
                          <button
                            className={`flex items-center gap-1 text-xs ${openComments.has(post.id) ? "text-primary" : "text-muted-foreground"}`}
                            onClick={() => {
                              const newOpen = new Set(openComments);
                              if (newOpen.has(post.id)) { newOpen.delete(post.id); } else { newOpen.add(post.id); }
                              setOpenComments(newOpen);
                            }}
                          >
                            <MessageCircle className={`w-3 h-3 ${openComments.has(post.id) ? "fill-current" : ""}`} />
                          </button>
                         <button
  className="flex items-center gap-1 text-xs text-muted-foreground"
  onClick={async () => {
    const shareUrl = buildContentShareUrl("post", post.id);

    const result = await shareVibyngContent({
      title: `${t.postBy} ${post.author.displayName}`,
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
                          {isOwnProfile && (
                            <button
                              className="text-xs text-red-400 hover:text-red-600 ml-auto"
                              onClick={async () => {
                                try {
                                  await apiRequest("DELETE", `/api/posts/${post.id}`);
                                  queryClient.invalidateQueries({ queryKey: ["/api/users", artistId, "posts"] });
                                  queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
                                  toast({ title: t.postDeletedTitle });
                                } catch {
                                  toast({ title: t.error, variant: "destructive" });
                                }
                              }}
                            >🗑️</button>
                          )}
                        </div>
                      </div>

                      {Number(post.authorId ?? post.author?.id) !== Number(currentUserId) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-full shrink-0 -mt-1 -mr-1"
                          onClick={() => {
                            openReport({
                              targetType: "post",
                              targetId: String(post.id),
                              targetOwnerId: Number(post.authorId ?? post.author?.id),
                              title: t.reportPost,
                              description: t.reportContentDescription,
                            });
                          }}
                          aria-label={t.reportPost}
                        >
                          <MoreVertical className="w-6 h-6" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                  {openComments.has(post.id) && (
                    <CardContent className="pt-0">
                     <ArtistPostComments
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
           </>
        ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">{t.noPosts}</p>
          )}
        </TabsContent>

        {/* Tab Foto */}
        <TabsContent value="photos" className="mt-4">
          <div className="grid grid-cols-2 gap-2">
            {photos && photos.length > 0 ? (
  photos.map((photo) => (
  <Card
    key={photo.id}
    className="overflow-hidden hover-elevate cursor-pointer"
    onClick={() => {
      setSelectedPhoto(photo);
      setPhotoLikeCount(prev => ({ ...prev, [photo.id]: photo.likesCount ?? 0 }));
    }}
  >
    <img
      src={photo.imageUrl ?? undefined}
      alt={photo.title || t.untitledPhoto}
      className="w-full h-32 object-cover"
    />

    {photo.title && photo.title !== t.untitledPhoto && (
      <CardContent className="p-2">
        <p className="text-xs text-muted-foreground truncate">
          <MentionText text={photo.title} />
        </p>
      </CardContent>
    )}
  </Card>
))
) : (
              <p className="text-center text-muted-foreground py-8 col-span-2">{t.noPhotos}</p>
            )}
          </div>
        </TabsContent>

        {/* Tab Video */}
        <TabsContent value="videos" className="mt-4">
          <div className="flex flex-col gap-3">
           {videos && videos.length > 0 ? (
  videos.map((video) => (
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
    >
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
        {video.title && video.title !== t.untitledVideo && (
  <h4 className="font-medium whitespace-pre-wrap break-words">
  <MentionText text={video.title} />
</h4>
        )}
      </CardContent>
    </Card>
  ))
) : (
  <p className="text-center text-muted-foreground py-8">{t.noVideos}</p>
)}
          </div>
        </TabsContent>

       {selectedVideo && (
  <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={() => setSelectedVideo(null)}>
    <div className="absolute inset-x-0 top-4 z-30 flex justify-end gap-2 px-4">
      {Number(selectedVideo.artistId) !== Number(currentUserId) && (
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            openReport({
              targetType: "video",
              targetId: String(selectedVideo.id),
              targetOwnerId: Number(selectedVideo.artistId),
              title: t.reportVideo,
              description: t.reportContentDescription,
            });
          }}
          aria-label={t.reportVideo}
        >
          <MoreVertical className="w-6 h-6" />
        </Button>
      )}

      <button
        className="h-10 w-10 rounded-full bg-black/40 text-white text-2xl hover:bg-black/60 flex items-center justify-center"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setSelectedVideo(null);
        }}
      >
        ✕
      </button>
    </div>

    <div className="flex-1 flex items-center justify-center p-4 pt-16" onClick={e => e.stopPropagation()}>
    <div className="w-full max-w-lg bg-background rounded-xl overflow-y-auto max-h-[90vh]">
              <video
  src={selectedVideo.videoUrl}
  controls
  className="w-full max-h-[34vh] sm:max-h-[42vh] object-contain bg-black"
/>
              <div className="p-4">
                {selectedVideo.title && selectedVideo.title !== t.untitledVideo && <p className="font-medium whitespace-pre-wrap break-words">
  <MentionText text={selectedVideo.title} />
</p>}
                <p className="text-xs text-muted-foreground mb-3">
                  {selectedVideo.createdAt && new Date(selectedVideo.createdAt).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
                <div className="flex items-center gap-4 mb-4 border-b pb-3">
                 <button
  className={`flex items-center gap-1 text-sm ${isVideoLiked ? "text-red-500" : "text-muted-foreground"} ${artistId === currentUserId ? "opacity-50 cursor-not-allowed" : ""}`}
  disabled={artistId === currentUserId}
  onClick={async () => {
    if (artistId === currentUserId) return;

    const currentCount =
      videoLikeCount[selectedVideo.id] ??
      Number((selectedVideo as any).likesCount ?? 0);

    if (isVideoLiked) {
      await apiRequest("POST", `/api/videos/${selectedVideo.id}/unlike`, { userId: currentUserId });
      setVideoLikeCount(prev => ({
        ...prev,
        [selectedVideo.id]: Math.max(0, currentCount - 1),
      }));
    } else {
      await apiRequest("POST", `/api/videos/${selectedVideo.id}/like`, { userId: currentUserId });
      setVideoLikeCount(prev => ({
        ...prev,
        [selectedVideo.id]: currentCount + 1,
      }));
    }

    await refetchVideoLike();
    queryClient.invalidateQueries({ queryKey: ["/api/users", artistId, "videos"] });
    queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
  }}
>
  <Heart className={`w-5 h-5 ${isVideoLiked ? "fill-red-500" : ""}`} />
  <span>{videoLikeCount[selectedVideo.id] ?? Number((selectedVideo as any).likesCount ?? 0)}</span>
</button>
                  <button
  className="flex items-center gap-1 text-sm text-muted-foreground"
  onClick={async () => {
    const shareUrl = buildContentShareUrl("video", selectedVideo.id);

    const result = await shareVibyngContent({
     title: selectedVideo.title || t.untitledVideo,
     text: selectedVideo.title || t.videoShareText,
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
                </div>
               <div className="mt-4 border-t pt-4 px-4 pb-4">
                <div className="space-y-4 max-h-[26vh] overflow-y-auto pr-1">
  {videoCommentsList.map((c: any) => (
    <div key={c.id} className="flex items-start gap-3">
      <Link href={`/artist/${c.author_id}`}>
        <Avatar className="w-9 h-9 cursor-pointer flex-shrink-0">
          {c.avatar_url && <AvatarImage src={c.avatar_url} alt={c.display_name} />}
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {c.display_name?.charAt(0)}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 bg-muted rounded-xl px-4 py-3 min-w-0">
  <div className="flex items-start justify-between gap-2">
    <p className="text-sm font-semibold min-w-0 truncate">
      {c.display_name}
    </p>

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
              Number(selectedVideo?.artistId ?? selectedVideo?.authorId ?? 0) === Number(currentUserId)) && (
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
                  await apiRequest("POST", `/api/videos/${selectedVideo.id}/comments/${c.id}/unlike/${currentUserId}`);
                } else {
                  await apiRequest("POST", `/api/videos/${selectedVideo.id}/comments/${c.id}/like/${currentUserId}`);
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

<div className="pt-3 mt-2 border-t">
  <div className="flex items-center gap-2 rounded-xl border bg-background/95 px-3 py-2">
    <div className="relative flex-1">
      <input
        className="w-full h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 text-base placeholder:text-sm"
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
            await queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUserId}`] });
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
        await queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUserId}`] });
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
                     {!isOwnProfile && (
  <Button
    size="icon"
    variant="ghost"
    onClick={() => handleAddToPlaylist(song)}
    disabled={isSongAlreadyInPlaylist(song)}
  >
    {isSongAlreadyInPlaylist(song) ? (
      <Check className="w-5 h-5 text-green-500" />
    ) : (
      <Plus className="w-5 h-5" />
    )}
  </Button>
)}
                      <Button size="icon" variant="ghost" onClick={() => handlePlaySong(song)}>
                        {currentSong?.id === song.id && isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">{t.noSongs}</p>
              )}
            </div>
          </TabsContent>
        )}

{/* Tab Obiettivi — solo Artista */}
{isArtist && (
  <TabsContent value="goals" className="mt-4">
    <div className="flex flex-col gap-3">
      {goals && goals.length > 0 ? (
        goals.map((goal) => {
          const current = Number(goal.currentAmount ?? 0);
          const target = Number(goal.targetAmount ?? 0);
          const goalProgress = target > 0 ? Math.min(100, (current / target) * 100) : 0;

          return (
            <Card key={goal.id} className="hover-elevate">
              <CardContent className="p-4 space-y-3">
                <div>
                  <h4 className="font-medium">{goal.title}</h4>

                  {goal.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {goal.description}
                    </p>
                  )}
                </div>

                <Progress value={goalProgress} className="h-2" />

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t.raised}: €{current.toFixed(2)}</span>
                  <span>{t.target}: €{target.toFixed(2)}</span>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  {goalProgress.toFixed(1)}% {t.goalReached}
                </p>
                {!isOwnProfile && (
  <Button
    variant="outline"
    size="sm"
    className="w-full"
    onClick={() => {
      setSupportGoalId(goal.id);
      setSupportMode("one_time");
      setSupportAmount("5");
      setSupportOpen(true);
    }}
  >
    {t.supportThisGoal}
  </Button>
)}
              </CardContent>
            </Card>
          );
        })
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <Trophy className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t.noGoals}</p>
          </CardContent>
        </Card>
      )}

      {!isOwnProfile && (
  <Card className="mt-1">
    <CardHeader className="pb-2">
      <div className="flex items-center gap-2">
        <Heart className="w-5 h-5 text-primary" />
        <CardTitle className="text-lg">{t.supportArtist}</CardTitle>
      </div>
    </CardHeader>

    <CardContent className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t.supportArtistDescriptionPrefix} {artist.displayName} {t.supportArtistDescriptionSuffix}
      </p>

      <Button
        className="w-full"
        onClick={() => {
          setSupportGoalId(null);
          setSupportMode("one_time");
          setSupportAmount("5");
          setSupportOpen(true);
        }}
      >
        <Heart className="w-4 h-4 mr-2" />
        {t.openSupportModal}
      </Button>
    </CardContent>
  </Card>
)}
    </div>
  </TabsContent>
)}

        
        {/* Tab Eventi — solo Artista */}
          <TabsContent value="events" className="mt-4">
            <div className="flex items-center justify-between mb-2">
              {isOwnProfile && (
                <Button size="sm" variant="outline" onClick={() => setShowEventForm(!showEventForm)}>
                  <Plus className="w-4 h-4 mr-1" />
                  {t.add}
                </Button>
              )}
            </div>
            {isOwnProfile && showEventForm && (
              <Card className="mb-3">
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
                        await apiRequest("POST", `/api/artists/${id}/events`, { ...eventForm, eventDate: new Date(eventForm.eventDate).toISOString() });
                        queryClient.invalidateQueries({ queryKey: [`/api/artists/${id}/events`] });
                        setShowEventForm(false);
                        setEventForm({ name: "", eventDate: "", city: "", venue: "", description: "", ticketUrl: "" });
                        toast({ title: t.eventAddedTitle });
                      } catch {
                        toast({ title: "Errore", variant: "destructive" });
                      }
                    }}>{t.save}</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {artistEvents.length > 0 ? (
              <div className="flex flex-col gap-3">
                {artistEvents.map((event, index) => (
  <>
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
                              🎟️ {t.buyTickets}
                            </a>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                         {!isOwnProfile && !attendingEventIds.has(event.id) && !myAttendingEvents.some(({ event: e }: any) => e.id === event.id) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
  try {
    await apiRequest("POST", `/api/events/${event.id}/attend`, { userId: currentUserId });
    setAttendingEventIds(prev => new Set(prev).add(event.id));
    await queryClient.refetchQueries({ queryKey: ["/api/users", currentUserId, "events/attending"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/vpoints", currentUserId, "status"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId] });
    await queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUserId}`] });
    toast({ title: t.eventAttendTitle });
  } catch {
    toast({ title: t.error, variant: "destructive" });
  }
}}
                            >
                              <Calendar className="w-3 h-3 mr-1" />
                              {t.attend}
                            </Button>
                          )}
                          {isOwnProfile && (
                            <button
                              className="text-xs text-red-400 hover:text-red-600"
                              onClick={async () => {
                                try {
                                  await apiRequest("DELETE", `/api/events/${event.id}`);
                                  queryClient.invalidateQueries({ queryKey: [`/api/artists/${id}/events`] });
                                  toast({ title: t.eventDeletedTitle });
                                } catch {
                                  toast({ title: t.error, variant: "destructive" });
                                }
                              }}
                            >🗑️</button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                 </Card>
                 </>
               ))}
              </div>
            ) : (!isArtist && profileAttendingEvents.length > 0) ? (
                <div className="flex flex-col gap-3 mt-2">
                  <p className="text-sm text-muted-foreground">{t.eventsAttending}</p>
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
              <p className="text-center text-muted-foreground py-8">{t.noEvents}</p>
            )}
          </TabsContent>

       {/* Tab Connessioni — solo Fan */}
        {isFan && (
          <TabsContent value="connections" className="mt-4">
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-sm font-medium mb-2">Follower ({followersList.length})</p>
                {followersList.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {followersList.map(user => (
                      <Link key={user.id} href={`/artist/${user.id}`}>
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
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4 text-sm">{t.noFollowers}</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Seguiti ({followingData?.length ?? 0})</p>
                {followingData && followingData.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {followingData.map(user => (
                      <Link key={user.id} href={`/artist/${user.id}`}>
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
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4 text-sm">{t.noFollowing}</p>
                )}
              </div>
            </div>
          </TabsContent>
        )}
        
        {/* Tab Messaggi */}
        <TabsContent value="messages" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center py-8">
                <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">{t.messageWith} {artist.displayName}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t.privateMessageDescription}
                </p>
                <Link href={`/chat/${artist.id}`}>
  <Button>{t.startConversation}</Button>
</Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
            )}
      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
  <DialogContent className="max-w-sm">
    <DialogHeader>
      <DialogTitle>{t.supportArtist}</DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t.supportArtistDescriptionPrefix} {artist.displayName} {t.supportArtistDescriptionSuffix}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={supportMode === "one_time" ? "default" : "outline"}
          onClick={() => setSupportMode("one_time")}
        >
          {t.oneTimeSupport}
        </Button>

        <Button
          variant={supportMode === "monthly" ? "default" : "outline"}
          onClick={() => setSupportMode("monthly")}
        >
          {t.monthlySupport}
        </Button>
      </div>

      {supportMode === "one_time" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
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

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t.customAmount}</p>
            <Input
              type="number"
              min="1"
              value={supportAmount}
              onChange={(e) => setSupportAmount(e.target.value)}
            />
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <h4 className="font-semibold">{t.monthlySupportTitle}</h4>
            </div>

            <p className="text-lg font-bold">{t.monthlySupportPrice}</p>

            <p className="text-sm text-muted-foreground">
              {t.monthlySupportDescription}
            </p>
          </CardContent>
        </Card>
      )}

      <Button
        className="w-full"
        disabled={supportMutation.isPending}
        onClick={() => {
          supportMutation.mutate({
            mode: supportMode,
            amount: supportMode === "monthly" ? "4.99" : supportAmount,
            goalId: supportGoalId,
          });
        }}
      >
        {supportMutation.isPending ? "..." : t.continueToStripe}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        {t.secureStripePayment}
      </p>
    </div>
  </DialogContent>
</Dialog>
      
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
        <div
          className="absolute inset-x-0 top-4 z-[100] flex justify-end gap-2 px-4 pointer-events-none"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {Number(selectedPhoto.artistId) !== Number(currentUserId) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white pointer-events-auto"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

               openReport({
  targetType: "photo",
  targetId: String(selectedPhoto.id),
  targetOwnerId: Number(selectedPhoto.artistId),
  title: t.reportPhoto,
  description: t.reportContentDescription,
});
              }}
              aria-label={t.reportPhoto}
            >
              <MoreVertical className="w-6 h-6" />
            </Button>
          )}

          <button
            className="h-10 w-10 rounded-full bg-black/40 text-white text-2xl hover:bg-black/60 flex items-center justify-center pointer-events-auto"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedPhoto(null);
              setPhotoCommentsOpen(false);
            }}
          >
            ✕
          </button>
        </div>

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
                ? "w-full h-full max-h-[calc(100dvh-3rem)] object-contain"
                : "w-full h-full max-h-[62dvh] sm:max-h-[68vh] object-contain"
            }
          />
        </div>

        <div
          className={
            selectedPhotoIsTall
              ? "absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-4 pt-16 pb-4"
              : "px-4 pb-4"
          }
        >
          {selectedPhoto.title && selectedPhoto.title !== t.untitledPhoto && (
            <p className="text-white font-medium whitespace-pre-wrap break-words mb-1">
              <MentionText text={selectedPhoto.title} />
            </p>
          )}

          <p className="text-xs text-white/70 mb-3">
            {selectedPhoto.createdAt &&
              new Date(selectedPhoto.createdAt).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
          </p>

          <div className="flex items-center gap-4 border-t border-white/10 pt-3">
            <button
              className={`flex items-center gap-1 text-sm ${
                isPhotoLiked ? "text-red-500" : "text-white/80"
              } ${artistId === currentUserId ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={artistId === currentUserId}
              onClick={async () => {
                const currentCount =
                  photoLikeCount[selectedPhoto.id] ??
                  selectedPhotoData?.likesCount ??
                  selectedPhoto.likesCount ??
                  0;

                if (isPhotoLiked) {
                  await apiRequest("POST", `/api/photos/${selectedPhoto.id}/unlike`, {
                    userId: currentUserId,
                  });
                  setPhotoLikeCount((prev) => ({
                    ...prev,
                    [selectedPhoto.id]: Math.max(0, currentCount - 1),
                  }));
                } else {
                  await apiRequest("POST", `/api/photos/${selectedPhoto.id}/like`, {
                    userId: currentUserId,
                  });
                  setPhotoLikeCount((prev) => ({
                    ...prev,
                    [selectedPhoto.id]: currentCount + 1,
                  }));
                }

                await refetchPhotoLike();
              }}
            >
              <Heart className={`w-5 h-5 ${isPhotoLiked ? "fill-red-500" : ""}`} />
              <span>
                {photoLikeCount[selectedPhoto.id] !== undefined
                  ? photoLikeCount[selectedPhoto.id]
                  : (selectedPhotoData?.likesCount ?? selectedPhoto.likesCount ?? 0)}
              </span>
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
              onClick={async () => {
                const shareUrl = buildContentShareUrl("photo", selectedPhoto.id);

                const result = await shareVibyngContent({
                  title: selectedPhoto.title || t.untitledPhoto,
                  text: selectedPhoto.title || t.photoShareText,
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
          </div>
        </div>
      </div>
    </div>

    <Sheet open={photoCommentsOpen} onOpenChange={setPhotoCommentsOpen}>
      <SheetContent side="bottom" className="h-[75vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Commenti</SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex flex-col h-[calc(75vh-5rem)]">
          <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
            {photoCommentsList.map((c: any) => (
              <div key={c.id} className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt={c.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-primary font-medium">
                      {c.display_name?.charAt(0)}
                    </span>
                  )}
                </div>

                <div className="flex-1 bg-muted rounded-lg px-3 py-2">
  <div className="flex items-start justify-between gap-2">
    <p className="text-sm font-semibold min-w-0 truncate">
      {c.display_name}
    </p>

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
                        Number(artistId) === Number(currentUserId)) && (
                        <button
                          className="text-xs text-red-400 hover:text-red-600"
                          onClick={async () => {
                            await apiRequest("DELETE", `/api/photos/${selectedPhoto.id}/comments/${c.id}`);
                            await refetchPhotoComments();
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
    await queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUserId}`] });
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
              )) : <p className="text-center text-muted-foreground py-4 text-sm">{t.noFollowers}</p>
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
              )) : <p className="text-center text-muted-foreground py-4 text-sm">{t.noFollowing}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
