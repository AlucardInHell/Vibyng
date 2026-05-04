import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Zap, Heart, Bookmark, Share2, MessageCircle, Volume2, VolumeX, Sparkles, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MentionDropdown } from "@/components/mention-dropdown";
import { MentionText } from "@/components/mention-text";
import { useMention } from "@/hooks/use-mention";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { buildContentShareUrl, shareVibyngContent } from "@/lib/share-content";
import type { ArtistVideo, User } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

function getCurrentUserId(): number {
  try {
    const stored = localStorage.getItem("vibyng-user");
    if (stored) return JSON.parse(stored).id || 1;
  } catch {}
  return 1;
}

type FlowTab = "for-you" | "emerging" | "trend" | "live";
type AppLanguage = "it" | "en";

const flowTranslations = {
  it: {
    loading: "Caricamento Flow...",
    empty: "Nessun video disponibile nel Flow",
    forYou: "Per Te",
    emerging: "Emergenti",
    trend: "Trend",
    live: "Live",
    liveEmpty: "Nessuna live in corso",
    liveEmptyDescription: "Le dirette degli artisti appariranno qui appena saranno disponibili.",
    liveOnAir: "In diretta",
    liveViewers: "spettatori",
    liveMockNotice: "Live attiva. Il player streaming sarà collegato nel prossimo step.",
    untitled: "Senza titolo",
    copied: "Link copiato!",
    noComments: "Ancora nessun commento.",
    commentPlaceholder: "Scrivi un commento...",
    loadArtistsError: "Errore nel caricamento artisti",
    flowShareText: "Flow su Vibyng",
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
  },
  en: {
    loading: "Loading Flow...",
    empty: "No videos available in Flow",
    forYou: "For You",
    emerging: "Emerging",
    trend: "Trend",
    live: "Live",
    liveEmpty: "No live streams right now",
    liveEmptyDescription: "Artist live streams will appear here as soon as they are available.",
    liveOnAir: "Live now",
    liveViewers: "viewers",
    liveMockNotice: "Live is active. The streaming player will be connected in the next step.",
    untitled: "Untitled",
    copied: "Link copied!",
    noComments: "No comments yet.",
    commentPlaceholder: "Write a comment...",
    loadArtistsError: "Error loading artists",
    flowShareText: "Flow on Vibyng",
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
  },
} as const;

function getStoredLanguage(): AppLanguage {
  try {
    const stored = localStorage.getItem("vibyng-language");
    if (stored === "it" || stored === "en") return stored;
  } catch {}
  return "it";
}
type FlowItem = {
  type: "video" | "photo" | "song";
  id: number;
  artistId: number;
  title: string;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
  coverUrl?: string | null;
  duration?: number | null;
  description?: string | null;
  likesCount?: number | null;
  commentsCount?: number | null;
  createdAt?: string | null;
  artist: User;
};

type FlowVideo = ArtistVideo & {
  type: "video";
  flowKey: string;
  mediaUrl?: string;
  commentsCount?: number | null;
  artist: User;
};

type FlowPhoto = {
  type: "photo";
  flowKey: string;
  id: number;
  artistId: number;
  title: string;
  mediaUrl: string;
  imageUrl: string;
  description?: string | null;
  likesCount?: number | null;
  commentsCount?: number | null;
  createdAt?: string | null;
  artist: User;
};

type FlowSong = {
  type: "song";
  flowKey: string;
  id: number;
  artistId: number;
  title: string;
  mediaUrl: string;
  audioUrl: string;
  coverUrl?: string | null;
  duration?: number | null;
  likesCount?: number | null;
  commentsCount?: number | null;
  createdAt?: string | null;
  artist: User;
};

type FlowContent = FlowVideo | FlowPhoto | FlowSong;

type ActiveLiveStream = {
  id: number;
  artistId: number;
  title: string;
  status: "live" | "ended";
  provider: string;
  roomName: string;
  providerRoomId?: string | null;
  playbackUrl?: string | null;
  ingestUrl?: string | null;
  viewerCount: number;
  startedAt?: string | null;
  createdAt?: string | null;
  artist: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    role: string;
  };
};

export default function Artists() {
  const currentUserId = getCurrentUserId();
  const [language, setLanguage] = useState<AppLanguage>(getStoredLanguage);
  const t = flowTranslations[language];
  const { toast } = useToast();
  const { mentionQuery, showMentions, handleTextChange, insertMention, closeMentions } = useMention();

  const [activeTab, setActiveTab] = useState<FlowTab>("for-you");
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentsOpenId, setCommentsOpenId] = useState<number | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [commentsOpenType, setCommentsOpenType] = useState<"video" | "photo" | "song" | null>(null);
  const [savedVideoIds, setSavedVideoIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem("flow-saved-videos");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [pausedVideoIds, setPausedVideoIds] = useState<Set<number>>(new Set());
  const [flowMuted, setFlowMuted] = useState(true);
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});
  const [likedMap, setLikedMap] = useState<Record<number, boolean>>({});
  const [likeStatusReady, setLikeStatusReady] = useState<Record<number, boolean>>({});
  const [likePendingMap, setLikePendingMap] = useState<Record<number, boolean>>({});
  const [photoLikedMap, setPhotoLikedMap] = useState<Record<number, boolean>>({});
  const [photoLikeCounts, setPhotoLikeCounts] = useState<Record<number, number>>({});
  const [photoLikeReadyMap, setPhotoLikeReadyMap] = useState<Record<number, boolean>>({});
  const [photoLikePendingMap, setPhotoLikePendingMap] = useState<Record<number, boolean>>({});
  const [songLikedMap, setSongLikedMap] = useState<Record<number, boolean>>({});
  const [songLikeCounts, setSongLikeCounts] = useState<Record<number, number>>({});
  const [songLikeReadyMap, setSongLikeReadyMap] = useState<Record<number, boolean>>({});
  const [songLikePendingMap, setSongLikePendingMap] = useState<Record<number, boolean>>({});
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
  
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const flowAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playingFlowSongKey, setPlayingFlowSongKey] = useState<string | null>(null);
  useEffect(() => {
  return () => {
    if (flowAudioRef.current) {
      flowAudioRef.current.pause();
      flowAudioRef.current.currentTime = 0;
      flowAudioRef.current = null;
    }
  };
}, []);
  
  useEffect(() => {
  const handleFlowRefresh = () => {
    setActiveTab("for-you");
    setActiveIndex(0);
    setCommentsOpenId(null);
    setCommentsOpenType(null);
    setCommentInput("");
    setPausedVideoIds(new Set());
    closeMentions();

    queryClient.invalidateQueries({ queryKey: ["/api/artists"] });
    queryClient.invalidateQueries({ queryKey: ["/api/flow/client"], exact: false });

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  };

  window.addEventListener("vibyng-flow-refresh", handleFlowRefresh);

  return () => {
    window.removeEventListener("vibyng-flow-refresh", handleFlowRefresh);
  };
}, [closeMentions]);
  
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
  
  const { data: artists = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/artists"],
    queryFn: async () => {
      const res = await fetch("/api/artists");
      if (!res.ok) throw new Error(t.loadArtistsError);
      return res.json();
    },
  });

  const { data: flowItems = [], isLoading: flowLoading } = useQuery<FlowItem[]>({
  queryKey: ["/api/flow/client", activeTab],
  enabled: activeTab !== "live",
  queryFn: async () => {
    const res = await fetch(`/api/flow/client?tab=${activeTab}`);

    if (!res.ok) {
      throw new Error(t.loadArtistsError);
    }

    return res.json();
  },
});

const flowContent = useMemo<FlowContent[]>(() => {
  return flowItems
    .filter(
  (item) =>
    (item.type === "video" || item.type === "photo" || item.type === "song") &&
    !!item.mediaUrl
)
    .map((item) => {
    if (item.type === "song") {
  return {
    type: "song",
    flowKey: `song-${item.id}`,
    id: item.id,
    artistId: item.artistId,
    title: item.title || "Brano",
    mediaUrl: item.mediaUrl,
    audioUrl: item.audioUrl || item.mediaUrl,
    coverUrl: item.coverUrl,
    duration: item.duration,
    likesCount: item.likesCount ?? 0,
    commentsCount: item.commentsCount ?? 0,
    createdAt: item.createdAt,
    artist: item.artist,
  };
}

      if (item.type === "photo") {
        return {
          type: "photo",
          flowKey: `photo-${item.id}`,
          id: item.id,
          artistId: item.artistId,
          title: item.title || "Foto",
          mediaUrl: item.mediaUrl,
          imageUrl: item.imageUrl || item.mediaUrl,
          description: item.description,
          likesCount: item.likesCount ?? 0,
          commentsCount: item.commentsCount ?? 0,
          createdAt: item.createdAt,
          artist: item.artist,
        };
      }

      return {
        id: item.id,
        artistId: item.artistId,
        title: item.title || "Video",
        videoUrl: item.mediaUrl,
        thumbnailUrl: item.thumbnailUrl || item.mediaUrl,
        likesCount: item.likesCount ?? 0,
        commentsCount: item.commentsCount ?? 0,
        createdAt: item.createdAt as any,
        type: "video",
        flowKey: `video-${item.id}`,
        mediaUrl: item.mediaUrl,
        artist: item.artist,
      };
    }) as FlowContent[];
}, [flowItems]);

const flowVideos = useMemo<FlowVideo[]>(() => {
  return flowContent.filter((item): item is FlowVideo => item.type === "video");
}, [flowContent]);

const flowPhotos = useMemo<FlowPhoto[]>(() => {
  return flowContent.filter((item): item is FlowPhoto => item.type === "photo");
}, [flowContent]);

const flowSongs = useMemo<FlowSong[]>(() => {
  return flowContent.filter((item): item is FlowSong => item.type === "song");
}, [flowContent]);
 
const { data: activeLiveStreams = [], isLoading: livesLoading } = useQuery<ActiveLiveStream[]>({
  queryKey: ["/api/lives/active"],
  enabled: activeTab === "live",
  refetchInterval: activeTab === "live" ? 10000 : false,
  queryFn: async () => {
    const res = await fetch("/api/lives/active");

    if (!res.ok) {
      throw new Error("Errore nel caricamento delle live attive");
    }

    return res.json();
  },
});
  
  useEffect(() => {
    localStorage.setItem("flow-saved-videos", JSON.stringify(savedVideoIds));
  }, [savedVideoIds]);

 const forYouContent = useMemo(() => {
  return [...flowContent].sort(
    (a, b) =>
      new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime()
  );
}, [flowContent]);

const emergingContent = useMemo(() => {
  return [...flowContent].sort((a, b) => {
    const aLikes = Number((a as any).likesCount ?? 0);
    const bLikes = Number((b as any).likesCount ?? 0);

    return (
      aLikes - bLikes ||
      new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime()
    );
  });
}, [flowContent]);

const trendContent = useMemo(() => {
  return [...flowContent].sort((a, b) => {
    const aLikes = Number((a as any).likesCount ?? 0);
    const bLikes = Number((b as any).likesCount ?? 0);

    return (
      bLikes - aLikes ||
      new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime()
    );
  });
}, [flowContent]);
  
 const activeList = useMemo<FlowContent[]>(() => {
  if (activeTab === "live") return [];
  if (activeTab === "emerging") return emergingContent;
  if (activeTab === "trend") return trendContent;
  return forYouContent;
}, [activeTab, emergingContent, trendContent, forYouContent]);
  const activeVideo = activeList[activeIndex] ?? null;

useEffect(() => {
  if (!flowPhotos.length || !currentUserId) return;

  let cancelled = false;

  const loadPhotoLikedStatuses = async () => {
    try {
      const entries = await Promise.all(
        flowPhotos.map(async (photo) => {
          const res = await fetch(`/api/photos/${photo.id}/liked/${currentUserId}`);

          if (!res.ok) {
            return [photo.id, false] as const;
          }

          const data = await res.json();
          return [photo.id, Boolean(data?.liked)] as const;
        })
      );

      if (cancelled) return;

      setPhotoLikedMap((prev) => {
        const next = { ...prev };

        entries.forEach(([photoId, liked]) => {
          next[photoId] = liked;
        });

        return next;
      });

      setPhotoLikeReadyMap((prev) => {
        const next = { ...prev };

        entries.forEach(([photoId]) => {
          next[photoId] = true;
        });

        return next;
      });
    } catch {
      // Non blocchiamo il Flow se lo stato like foto non viene caricato.
    }
  };

  loadPhotoLikedStatuses();

  return () => {
    cancelled = true;
  };
}, [flowPhotos, currentUserId]);

useEffect(() => {
  if (!flowSongs.length || !currentUserId) return;

  let cancelled = false;

  const loadSongLikedStatuses = async () => {
    try {
      const entries = await Promise.all(
        flowSongs.map(async (song) => {
          const res = await fetch(`/api/songs/${song.id}/liked/${currentUserId}`);

          if (!res.ok) {
            return [song.id, false] as const;
          }

          const data = await res.json();
          return [song.id, Boolean(data?.liked)] as const;
        })
      );

      if (cancelled) return;

      setSongLikedMap((prev) => {
        const next = { ...prev };

        entries.forEach(([songId, liked]) => {
          next[songId] = liked;
        });

        return next;
      });

      setSongLikeReadyMap((prev) => {
        const next = { ...prev };

        entries.forEach(([songId]) => {
          next[songId] = true;
        });

        return next;
      });
    } catch {
      // Non blocchiamo il Flow se lo stato like song non viene caricato.
    }
  };

  loadSongLikedStatuses();

  return () => {
    cancelled = true;
  };
}, [flowSongs, currentUserId]);  

useEffect(() => {
  if (!flowVideos.length || !currentUserId) return;

  let cancelled = false;

  const loadLikedStatuses = async () => {
    try {
      const entries = await Promise.all(
        flowVideos.map(async (video) => {
          const res = await fetch(`/api/videos/${video.id}/liked/${currentUserId}`);

          if (!res.ok) {
            return [video.id, false] as const;
          }

          const data = await res.json();
          return [video.id, Boolean(data?.liked)] as const;
        })
      );

      if (cancelled) return;

      setLikedMap((prev) => {
        const next = { ...prev };

        entries.forEach(([videoId, liked]) => {
          next[videoId] = liked;
        });

        return next;
      });

      setLikeStatusReady((prev) => {
        const next = { ...prev };

        entries.forEach(([videoId]) => {
          next[videoId] = true;
        });

        return next;
      });
    } catch {
      // Non blocchiamo il Flow se uno stato like non viene caricato.
    }
  };

  loadLikedStatuses();

  return () => {
    cancelled = true;
  };
}, [flowVideos, currentUserId]);

  const { data: comments = [], refetch: refetchComments } = useQuery<any[]>({
  queryKey: ["/api/flow/comments", commentsOpenType, commentsOpenId, currentUserId],
  enabled: commentsOpenId !== null && commentsOpenType !== null,
  queryFn: async () => {
    const endpoint =
  commentsOpenType === "photo"
    ? `/api/photos/${commentsOpenId}/comments?userId=${currentUserId}`
    : commentsOpenType === "song"
      ? `/api/songs/${commentsOpenId}/comments?userId=${currentUserId}`
      : `/api/videos/${commentsOpenId}/comments?userId=${currentUserId}`;

    const res = await fetch(endpoint);
    return res.json();
  },
  staleTime: 0,
});
  useEffect(() => {
  const timers: number[] = [];

  activeList.forEach((video, index) => {
  if (video.type !== "video") return;

  const el = videoRefs.current[video.id];
  if (!el) return;

    if (index !== activeIndex) {
      el.pause();
      return;
    }

    if (pausedVideoIds.has(video.id)) {
      el.pause();
      return;
    }

    el.muted = flowMuted;
    el.defaultMuted = flowMuted;
    el.playsInline = true;
    el.autoplay = true;
    el.preload = "auto";

    const tryPlay = () => {
      el.play().catch(() => {});
    };

    tryPlay();
    requestAnimationFrame(tryPlay);

    timers.push(window.setTimeout(tryPlay, 120));
    timers.push(window.setTimeout(tryPlay, 350));
  });

  return () => {
    timers.forEach((timer) => window.clearTimeout(timer));
  };
}, [activeIndex, activeList, flowMuted, pausedVideoIds, activeTab]);

  useEffect(() => {
    setActiveIndex(0);
    setCommentsOpenId(null);
    setCommentsOpenType(null);
  }, [activeTab]);

  useEffect(() => {
  const activeItem = activeList[activeIndex];

  if (!activeItem || activeItem.type !== "song" || activeItem.flowKey !== playingFlowSongKey) {
    stopFlowSong();
  }
}, [activeIndex, activeTab]);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    const slideHeight = container.clientHeight;
    const nextIndex = Math.round(container.scrollTop / slideHeight);
    if (nextIndex !== activeIndex) {
      setActiveIndex(nextIndex);
      setCommentsOpenId(null);
      setCommentsOpenType(null);
      setCommentInput("");
    }
  };

  const togglePause = (videoId: number) => {
    const el = videoRefs.current[videoId];
    if (!el) return;

    const next = new Set(pausedVideoIds);
    if (pausedVideoIds.has(videoId)) {
      next.delete(videoId);
      el.play().catch(() => {});
    } else {
      next.add(videoId);
      el.pause();
    }
    setPausedVideoIds(next);
  };

  const toggleMute = (videoId: number) => {
  const nextMuted = !flowMuted;

  setFlowMuted(nextMuted);

  const el = videoRefs.current[videoId];
  if (el) {
    el.muted = nextMuted;
    el.defaultMuted = nextMuted;

    if (!pausedVideoIds.has(videoId)) {
      el.play().catch(() => {});
    }
  }
};

  const toggleSave = (videoId: number) => {
    setSavedVideoIds((prev) =>
      prev.includes(videoId) ? prev.filter((id) => id !== videoId) : [...prev, videoId]
    );
  };

  const handleLike = async (video: FlowVideo) => {
  if (Number(video.artist.id) === Number(currentUserId)) return;

  const videoId = Number(video.id);

  if (!likeStatusReady[videoId] || likePendingMap[videoId]) {
    return;
  }

  setLikePendingMap((prev) => ({ ...prev, [videoId]: true }));

  try {
    const isLiked = likedMap[videoId] ?? false;

    const res = isLiked
      ? await apiRequest("POST", `/api/videos/${videoId}/unlike`, {
          userId: currentUserId,
        })
      : await apiRequest("POST", `/api/videos/${videoId}/like`, {
          userId: currentUserId,
        });

    const data = await res.json().catch(() => null);

    setLikedMap((prev) => ({
      ...prev,
      [videoId]: !isLiked,
    }));

    if (typeof data?.likesCount === "number") {
      setLikeCounts((prev) => ({
        ...prev,
        [videoId]: Number(data.likesCount),
      }));
    }

    const likedRes = await fetch(`/api/videos/${videoId}/liked/${currentUserId}`);
    if (likedRes.ok) {
      const likedData = await likedRes.json();

      setLikedMap((prev) => ({
        ...prev,
        [videoId]: Boolean(likedData?.liked),
      }));
    }

    await queryClient.invalidateQueries({
      queryKey: ["/api/users", video.artist.id, "videos"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["/api/flow/client"],
      exact: false,
    });

    await queryClient.invalidateQueries({
      queryKey: ["/api/posts"],
    });
  } finally {
    setLikePendingMap((prev) => ({
      ...prev,
      [videoId]: false,
    }));
  }
};

const handlePhotoLike = async (photo: FlowPhoto) => {
  if (Number(photo.artist.id) === Number(currentUserId)) return;

  const photoId = Number(photo.id);

  if (!photoLikeReadyMap[photoId] || photoLikePendingMap[photoId]) {
    return;
  }

  setPhotoLikePendingMap((prev) => ({ ...prev, [photoId]: true }));

  try {
    const isLiked = photoLikedMap[photoId] ?? false;

    const res = isLiked
      ? await apiRequest("POST", `/api/photos/${photoId}/unlike/${currentUserId}`)
      : await apiRequest("POST", `/api/photos/${photoId}/like/${currentUserId}`);

    const data = await res.json().catch(() => null);

    setPhotoLikedMap((prev) => ({
      ...prev,
      [photoId]: !isLiked,
    }));

    if (typeof data?.likesCount === "number") {
      setPhotoLikeCounts((prev) => ({
        ...prev,
        [photoId]: Number(data.likesCount),
      }));
    } else {
      setPhotoLikeCounts((prev) => ({
        ...prev,
        [photoId]: Math.max(
          0,
          Number(prev[photoId] ?? photo.likesCount ?? 0) + (isLiked ? -1 : 1)
        ),
      }));
    }

    await queryClient.invalidateQueries({
      queryKey: ["/api/flow/client"],
      exact: false,
    });
  } finally {
    setPhotoLikePendingMap((prev) => ({
      ...prev,
      [photoId]: false,
    }));
  }
};

const handleSongLike = async (song: FlowSong) => {
  if (Number(song.artist.id) === Number(currentUserId)) return;

  const songId = Number(song.id);

  if (!songLikeReadyMap[songId] || songLikePendingMap[songId]) {
    return;
  }

  setSongLikePendingMap((prev) => ({ ...prev, [songId]: true }));

  try {
    const isLiked = songLikedMap[songId] ?? false;

    const res = isLiked
      ? await apiRequest("POST", `/api/songs/${songId}/unlike/${currentUserId}`)
      : await apiRequest("POST", `/api/songs/${songId}/like/${currentUserId}`);

    const data = await res.json().catch(() => null);

    setSongLikedMap((prev) => ({
      ...prev,
      [songId]: Boolean(data?.liked ?? !isLiked),
    }));

    if (typeof data?.likesCount === "number") {
      setSongLikeCounts((prev) => ({
        ...prev,
        [songId]: Number(data.likesCount),
      }));
    }

    const likedRes = await fetch(`/api/songs/${songId}/liked/${currentUserId}`);
    if (likedRes.ok) {
      const likedData = await likedRes.json();

      setSongLikedMap((prev) => ({
        ...prev,
        [songId]: Boolean(likedData?.liked),
      }));

      if (typeof likedData?.likesCount === "number") {
        setSongLikeCounts((prev) => ({
          ...prev,
          [songId]: Number(likedData.likesCount),
        }));
      }
    }

    await queryClient.invalidateQueries({
      queryKey: ["/api/flow/client"],
      exact: false,
    });
  } finally {
    setSongLikePendingMap((prev) => ({
      ...prev,
      [songId]: false,
    }));
  }
};
  
  const pauseAllFlowVideos = () => {
  Object.values(videoRefs.current).forEach((videoEl) => {
    videoEl?.pause();
  });

  setPausedVideoIds((prev) => {
    const next = new Set(prev);

    activeList.forEach((item) => {
      if (item.type === "video") {
        next.add(item.id);
      }
    });

    return next;
  });
};

const stopFlowSong = () => {
  if (flowAudioRef.current) {
    flowAudioRef.current.pause();
    flowAudioRef.current.currentTime = 0;
    flowAudioRef.current = null;
  }

  setPlayingFlowSongKey(null);
};

const handlePlayFlowSong = (song: FlowSong) => {
  pauseAllFlowVideos();

  if (playingFlowSongKey === song.flowKey && flowAudioRef.current) {
    flowAudioRef.current.pause();
    setPlayingFlowSongKey(null);
    return;
  }

  if (flowAudioRef.current) {
    flowAudioRef.current.pause();
    flowAudioRef.current.currentTime = 0;
  }

  const audio = new Audio(song.audioUrl);
  flowAudioRef.current = audio;

  audio.onended = () => {
    setPlayingFlowSongKey(null);
    flowAudioRef.current = null;
  };

  audio
    .play()
    .then(() => {
      setPlayingFlowSongKey(song.flowKey);
    })
    .catch(() => {
      setPlayingFlowSongKey(null);
      flowAudioRef.current = null;
    });
};
  
  const handleShare = async (video: FlowVideo) => {
    const shareUrl = buildContentShareUrl("video", video.id);

    const result = await shareVibyngContent({
      title: video.title || "Video",
      text: `${video.artist.displayName} • ${video.title || t.flowShareText}`,
      mediaUrl: video.videoUrl ?? undefined,
      fallbackUrl: shareUrl,
      shareUrl,
      fileName: `video-${video.id}`,
    });

    if (result === "copied") {
      toast({ title: t.copied });
    }
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
      title: t.reportContentTitle,
      description: t.reportErrorDescription,
      variant: "destructive",
    });
  },
});

  const toggleFlowComments = (type: "video" | "photo" | "song", id: number) => {
  const alreadyOpen = commentsOpenType === type && commentsOpenId === id;

  if (alreadyOpen) {
    setCommentsOpenType(null);
    setCommentsOpenId(null);
    setCommentInput("");
    closeMentions();
    return;
  }

  setCommentsOpenType(type);
  setCommentsOpenId(id);
  setCommentInput("");
  closeMentions();
};
  
  const handleSubmitComment = async () => {
  if (!commentsOpenId || !commentsOpenType || !commentInput.trim()) return;

 const endpoint =
  commentsOpenType === "photo"
    ? `/api/photos/${commentsOpenId}/comments`
    : commentsOpenType === "song"
      ? `/api/songs/${commentsOpenId}/comments`
      : `/api/videos/${commentsOpenId}/comments`;

  await apiRequest("POST", endpoint, {
    authorId: currentUserId,
    content: commentInput.trim(),
  });

  setCommentInput("");
  closeMentions();

  await refetchComments();

  await queryClient.invalidateQueries({
    queryKey: ["/api/flow/client"],
    exact: false,
  });

  await queryClient.invalidateQueries({ queryKey: ["/api/vpoints", currentUserId, "status"] });
  await queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId] });
};

  if (isLoading || flowLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary" />
          <span className="text-muted-foreground">{t.loading}</span>
        </div>
      </div>
    );
  }

  if (!activeList.length && activeTab !== "live") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2">
        <Sparkles className="w-8 h-8 text-muted-foreground" />
        <p className="text-muted-foreground">{t.empty}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
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
        onClick={() => reportMutation.mutate()}
        disabled={reportMutation.isPending}
      >
        {t.reportSubmit}
      </Button>
    </div>
  </DialogContent>
</Dialog> 
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold">Flow</h1>
      </div>

      <div className="flex items-center gap-1 sticky top-0 z-20 bg-background/95 backdrop-blur py-1 overflow-x-auto scrollbar-hide">
        <button
          className={`px-2.5 py-1.5 rounded-full text-[12px] font-medium transition whitespace-nowrap shrink-0 ${
            activeTab === "for-you" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("for-you")}
        >
          {t.forYou}
        </button>
        <button
          className={`px-2.5 py-1.5 rounded-full text-[12px] font-medium transition whitespace-nowrap shrink-0 ${
            activeTab === "emerging" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("emerging")}
        >
          {t.emerging}
        </button>
        <button
 className={`px-2.5 py-1.5 rounded-full text-[12px] font-medium transition whitespace-nowrap shrink-0 ${
    activeTab === "trend" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
  }`}
  onClick={() => setActiveTab("trend")}
>
  {t.trend}
</button>

<button
  className={`px-2.5 py-1.5 rounded-full text-[12px] font-medium transition whitespace-nowrap shrink-0 ${
    activeTab === "live" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
  }`}
  onClick={() => {
    setActiveTab("live");
    queryClient.invalidateQueries({ queryKey: ["/api/lives/active"] });
  }}
>
  {t.live}
</button>
</div>

{activeTab === "live" && (
  <div className="h-[calc(100dvh-16rem)] sm:h-[calc(100dvh-14rem)] overflow-y-auto snap-y snap-mandatory">
    {livesLoading ? (
      <section className="h-[calc(100dvh-16rem)] sm:h-[calc(100dvh-14rem)] snap-start py-0">
        <div className="h-full rounded-[28px] border border-border/60 bg-card flex flex-col items-center justify-center text-center px-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4 animate-pulse">
            <span className="text-2xl">🔴</span>
          </div>

          <p className="text-sm text-muted-foreground">
            Caricamento live...
          </p>
        </div>
      </section>
    ) : activeLiveStreams.length === 0 ? (
      <section className="h-[calc(100dvh-16rem)] sm:h-[calc(100dvh-14rem)] snap-start py-0">
        <div className="h-full rounded-[28px] border border-border/60 bg-card flex flex-col items-center justify-center text-center px-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
            <span className="text-2xl">🔴</span>
          </div>

          <h2 className="text-xl font-semibold mb-2">
            {t.liveEmpty}
          </h2>

          <p className="text-sm text-muted-foreground max-w-xs">
            {t.liveEmptyDescription}
          </p>
        </div>
      </section>
    ) : (
      activeLiveStreams.map((live) => (
        <section
          key={live.id}
          className="h-[calc(100dvh-16rem)] sm:h-[calc(100dvh-14rem)] snap-start py-0"
        >
          <div className="h-full rounded-[28px] border border-border/60 overflow-hidden bg-black relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center px-6">
                <div className="text-6xl mb-4">🎥</div>

                <p className="text-white text-xl font-semibold">
                  {live.title || t.live}
                </p>

                <p className="text-white/60 text-sm mt-2 max-w-xs">
                  {t.liveMockNotice}
                </p>
              </div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/20 pointer-events-none" />

            <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-red-500 text-white text-xs font-semibold shadow-lg">
              ● LIVE
            </div>

            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/50 text-white text-xs border border-white/10">
              {live.viewerCount ?? 0} {t.liveViewers}
            </div>

            <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between">
              <Link href={`/artist/${live.artist.id}`}>
                <div className="flex items-end gap-2 min-w-0 max-w-[75%] cursor-pointer">
                  <Avatar className="w-11 h-11 border-2 border-red-500/80">
                    {live.artist.avatarUrl && (
                      <AvatarImage
                        src={live.artist.avatarUrl}
                        alt={live.artist.displayName}
                      />
                    )}

                    <AvatarFallback className="bg-primary/20 text-white">
                      {live.artist.displayName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <p className="text-white text-lg font-semibold leading-tight truncate">
                      {live.artist.displayName}
                    </p>

                    <p className="text-white text-lg font-semibold leading-tight truncate">
                      {live.title || t.live}
                    </p>

                    <p className="text-white/70 text-sm truncate">
                      @{live.artist.username}
                    </p>
                  </div>
                </div>
              </Link>

              <div className="flex flex-col items-center gap-3 text-white">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg">👥</span>
                  <span className="text-[11px]">
                    {live.viewerCount ?? 0}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg">🔴</span>
                  <span className="text-[11px]">
                    {t.liveOnAir}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))
    )}
  </div>
)}

<div
  ref={scrollRef}
  onScroll={handleScroll}
  className={`${activeTab === "live" ? "hidden" : ""} h-[calc(100dvh-16rem)] sm:h-[calc(100dvh-14rem)] overflow-y-auto snap-y snap-mandatory`}
>
        {activeList.map((item, index) => {
  if (item.type === "song") {
  const hasCover = !!item.coverUrl;

  return (
    <section
      key={item.flowKey}
      className="h-[calc(100dvh-16rem)] sm:h-[calc(100dvh-14rem)] snap-start py-0"
    >
      <div className="h-full rounded-[28px] border border-border/60 overflow-hidden bg-black relative">
        {hasCover ? (
          <img
            src={item.coverUrl || ""}
            alt={item.title || "Brano"}
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-70"
            loading={index === activeIndex ? "eager" : "lazy"}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-black to-primary/40" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/35 pointer-events-none" />

        <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-primary/80 text-white text-xs font-semibold border border-white/10 shadow-lg">
          SONG   
        </div>

        {commentsOpenType === "song" && commentsOpenId === item.id && (
  <div className="absolute inset-x-0 bottom-0 h-[72%] rounded-t-3xl bg-black/95 border-t border-white/10 backdrop-blur z-50 flex flex-col overflow-hidden shadow-2xl">
    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
      <p className="text-white text-sm font-semibold">
        {t.comments}
      </p>

      <button
        type="button"
        className="text-white/60 text-sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setCommentsOpenType(null);
          setCommentsOpenId(null);
          setCommentInput("");
          closeMentions();
        }}
      >
        ✕
      </button>
    </div>

    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
      {comments.length === 0 ? (
        <p className="text-white/55 text-sm text-center py-4">
          {t.noComments}
        </p>
      ) : (
        comments.map((comment: any) => (
          <div key={comment.id} className="flex items-start gap-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              {comment.avatar_url && (
                <AvatarImage
                  src={comment.avatar_url}
                  alt={comment.display_name || "Profilo"}
                />
              )}

              <AvatarFallback className="bg-primary/20 text-white text-xs">
                {(comment.display_name || comment.username || "P").charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 bg-white/10 rounded-2xl px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-white text-sm font-semibold truncate">
                  {comment.display_name || comment.username || "Profilo"}
                </p>

                {Number(comment.author_id) !== Number(currentUserId) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-white/60 hover:text-white hover:bg-white/10 shrink-0"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      openReport({
                        targetType: "comment",
                        targetId: String(comment.id),
                        targetOwnerId: Number(comment.author_id),
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

              <p className="text-white/90 text-sm whitespace-pre-wrap break-words">
                <MentionText text={comment.content} />
              </p>

              <div className="flex items-center justify-between mt-2">
                <span className="text-white/45 text-xs">
                  {comment.created_at &&
                    new Date(comment.created_at).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                </span>

                <div className="flex items-center gap-2">
                  {(Number(comment.author_id) === Number(currentUserId) ||
                    Number(item.artist.id) === Number(currentUserId)) && (
                    <button
                      type="button"
                      className="text-xs text-red-400 hover:text-red-500"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        await apiRequest(
                          "DELETE",
                          `/api/songs/${item.id}/comments/${comment.id}?userId=${currentUserId}`
                        );

                        await refetchComments();

                        await queryClient.invalidateQueries({
                          queryKey: ["/api/flow/client"],
                          exact: false,
                        });
                      }}
                    >
                      🗑️
                    </button>
                  )}

                  {Number(comment.author_id) !== Number(currentUserId) && (
                    <button
                      type="button"
                      className={`flex items-center gap-1 text-xs ${
                        comment.likedByMe
                          ? "text-red-500"
                          : "text-white/55 hover:text-red-500"
                      }`}
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        if (comment.likedByMe) {
                          await apiRequest(
                            "POST",
                            `/api/songs/${item.id}/comments/${comment.id}/unlike/${currentUserId}`
                          );
                        } else {
                          await apiRequest(
                            "POST",
                            `/api/songs/${item.id}/comments/${comment.id}/like/${currentUserId}`
                          );
                        }

                        await refetchComments();
                      }}
                    >
                      <Heart
                        className={`w-3 h-3 ${
                          comment.likedByMe ? "fill-red-500 text-red-500" : ""
                        }`}
                      />
                      <span>{comment.likes_count ?? 0}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>

    <div className="border-t border-white/10 px-3 py-3 shrink-0 bg-black/80">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            value={commentInput}
            placeholder={t.commentPlaceholder}
            className="w-full bg-white/10 border-white/10 text-white placeholder:text-white/40"
            onChange={(e) => {
              setCommentInput(e.target.value);
              handleTextChange(e.target.value, e.target.selectionStart || 0);
            }}
            onKeyDown={async (e) => {
              if (e.key !== "Enter") return;

              e.preventDefault();
              e.stopPropagation();

              await handleSubmitComment();
            }}
          />

          <MentionDropdown
            query={mentionQuery}
            visible={showMentions}
            onSelect={(username) => {
              setCommentInput(insertMention(commentInput, username));
              closeMentions();
            }}
          />
        </div>

        <Button
          size="icon"
          disabled={!commentInput.trim()}
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();

            await handleSubmitComment();
          }}
        >
          <MessageCircle className="w-4 h-4" />
        </Button>
      </div>
    </div>
  </div>
)}
        
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <div className="relative">
            {hasCover ? (
              <img
                src={item.coverUrl || ""}
                alt={item.title || "Brano"}
                className="w-44 h-44 sm:w-52 sm:h-52 rounded-3xl object-cover shadow-2xl border border-white/15"
                loading={index === activeIndex ? "eager" : "lazy"}
              />
            ) : (
              <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-3xl bg-black/40 border border-white/15 shadow-2xl flex items-center justify-center">
                <span className="text-7xl">♪</span>
              </div>
            )}

           <button
  type="button"
  className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-white/20 backdrop-blur border border-white/30 text-white text-3xl flex items-center justify-center shadow-xl"
  aria-label={playingFlowSongKey === item.flowKey ? "Pausa brano" : "Play brano"}
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    handlePlayFlowSong(item);
  }}
>
  {playingFlowSongKey === item.flowKey ? "❚❚" : "▶"}
</button>
          </div>

          <div className="mt-6 max-w-[80%]">
            <p className="text-white text-2xl font-bold leading-tight truncate">
              {item.title || "Brano"}
            </p>

            <p className="text-white/75 text-sm mt-2 truncate">
              {item.artist.displayName}
            </p>

            <p className="text-white/45 text-xs mt-1 truncate">
              @{item.artist.username}
            </p>
          </div>

          <div className="mt-5 flex items-center gap-1 opacity-70">
            <span className="w-1 h-4 rounded-full bg-white/60" />
            <span className="w-1 h-7 rounded-full bg-white/80" />
            <span className="w-1 h-5 rounded-full bg-white/60" />
            <span className="w-1 h-9 rounded-full bg-white/90" />
            <span className="w-1 h-4 rounded-full bg-white/60" />
            <span className="w-1 h-6 rounded-full bg-white/80" />
            <span className="w-1 h-3 rounded-full bg-white/50" />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between">
          <Link href={`/artist/${item.artist.id}`}>
            <div className="flex items-end gap-2 min-w-0 max-w-[70%] cursor-pointer">
              <Avatar className="w-11 h-11 border-2 border-primary/80">
                {item.artist.avatarUrl && (
                  <AvatarImage
                    src={item.artist.avatarUrl}
                    alt={item.artist.displayName}
                  />
                )}

                <AvatarFallback className="bg-primary/20 text-white">
                  {item.artist.displayName?.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p className="text-white text-lg font-semibold leading-tight truncate">
                  {item.artist.displayName}
                </p>

                <p className="text-white/70 text-xs truncate">
                  Brano musicale
                </p>
              </div>
            </div>
          </Link>

          <div className="flex flex-col items-center gap-4 text-white">
  <button
    type="button"
    className={`flex flex-col items-center gap-1 ${
      Number(item.artist.id) === Number(currentUserId)
        ? "opacity-50 cursor-not-allowed"
        : songLikedMap[item.id]
          ? "text-red-500"
          : "text-white"
    }`}
    disabled={
      Number(item.artist.id) === Number(currentUserId) ||
      !songLikeReadyMap[item.id] ||
      songLikePendingMap[item.id]
    }
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      handleSongLike(item);
    }}
  >
    <Heart
      className={`w-7 h-7 ${
        songLikedMap[item.id] ? "fill-red-500 text-red-500" : ""
      }`}
    />
    <span className="text-[11px]">
      {songLikeCounts[item.id] ?? item.likesCount ?? 0}
    </span>
  </button>

  <button
    type="button"
    className={`flex flex-col items-center gap-1 ${
      commentsOpenType === "song" && commentsOpenId === item.id
        ? "text-primary"
        : "text-white opacity-80"
    }`}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFlowComments("song", item.id);
    }}
  >
    <MessageCircle className="w-7 h-7" />
    <span className="text-[11px]">
      {commentsOpenType === "song" && commentsOpenId === item.id
        ? comments.length
        : Number((item as any).commentsCount ?? 0)}
    </span>
  </button>
</div>
          </div>

{commentsOpenType === "photo" && commentsOpenId === item.id && (
  <div className="absolute inset-x-0 bottom-0 h-[72%] rounded-t-3xl bg-black/95 border-t border-white/10 backdrop-blur z-50 flex flex-col overflow-hidden shadow-2xl">
    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
      <p className="text-white text-sm font-semibold">
        {t.comments}
      </p>

      <button
        type="button"
        className="text-white/60 text-sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setCommentsOpenType(null);
          setCommentsOpenId(null);
          setCommentInput("");
          closeMentions();
        }}
      >
        ✕
      </button>
    </div>

  <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
      {comments.length === 0 ? (
        <p className="text-white/55 text-sm text-center py-4">
          {t.noComments}
        </p>
      ) : (
        comments.map((comment: any) => {
          const displayName =
            comment.author?.displayName ??
            comment.display_name ??
            comment.displayName ??
            comment.username ??
            "Profilo";

          const avatarUrl =
            comment.author?.avatarUrl ??
            comment.author?.avatar_url ??
            comment.avatarUrl ??
            comment.avatar_url ??
            null;

          const commentAuthorId =
           comment.author?.id ??
           comment.author_id ??
           comment.authorId ??
           null;

          const commentLikedByMe = Boolean(comment.likedByMe);

          const commentLikesCount = Number(comment.likes_count ?? comment.likesCount ?? 0);

          const canDeleteComment =
          Number(commentAuthorId) === Number(currentUserId) ||
          Number(item.artist.id) === Number(currentUserId);
          
          return (
            <div key={comment.id} className="flex gap-2">
              <Avatar className="w-8 h-8 shrink-0">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                <AvatarFallback className="bg-primary/20 text-white text-xs">
                  {displayName?.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 rounded-2xl bg-white/10 px-3 py-2">
  <div className="flex items-start justify-between gap-2">
    <p className="text-white text-xs font-semibold truncate">
      {displayName}
    </p>

    {Number(commentAuthorId) !== Number(currentUserId) && (
      <button
        type="button"
        className="text-white/45 hover:text-white shrink-0"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();

          openReport({
            targetType: "comment",
            targetId: String(comment.id),
            targetOwnerId: commentAuthorId ? Number(commentAuthorId) : null,
            title: t.reportComment,
            description: t.reportContentDescription,
          });
        }}
        aria-label={t.reportComment}
      >
        <MoreVertical className="w-4 h-4" />
      </button>
    )}
  </div>

  <p className="text-white/85 text-sm whitespace-pre-wrap break-words mt-0.5">
    <MentionText text={comment.content} />
  </p>

  <div className="flex items-center justify-between gap-2 mt-2">
    <span className="text-[11px] text-white/45">
      {comment.created_at || comment.createdAt
        ? new Date(comment.created_at ?? comment.createdAt).toLocaleDateString("it-IT", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : ""}
    </span>

    <div className="flex items-center gap-3">
      {canDeleteComment && (
        <button
          type="button"
          className="text-[11px] text-red-300 hover:text-red-400"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();

            await apiRequest(
              "DELETE",
              `/api/photos/${item.id}/comments/${comment.id}`
            );

            await refetchComments();

            await queryClient.invalidateQueries({
              queryKey: ["/api/flow/client"],
              exact: false,
            });
          }}
        >
          🗑️
        </button>
      )}

      <button
        type="button"
        className={`flex items-center gap-1 text-[11px] ${
          Number(commentAuthorId) === Number(currentUserId)
            ? "opacity-50 cursor-not-allowed text-white/35"
            : commentLikedByMe
              ? "text-red-400"
              : "text-white/55 hover:text-red-400"
        }`}
        disabled={Number(commentAuthorId) === Number(currentUserId)}
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();

          if (commentLikedByMe) {
            await apiRequest(
              "POST",
              `/api/photos/${item.id}/comments/${comment.id}/unlike/${currentUserId}`
            );
          } else {
            await apiRequest(
              "POST",
              `/api/photos/${item.id}/comments/${comment.id}/like/${currentUserId}`
            );
          }

          await refetchComments();
        }}
      >
        <Heart
          className={`w-3 h-3 ${
            commentLikedByMe ? "fill-red-400 text-red-400" : ""
          }`}
        />
        <span>{commentLikesCount}</span>
      </button>
    </div>
  </div>
</div>
            </div>
          );
        })
      )}
    </div>

    <div className="p-3 border-t border-white/10 flex gap-2">
      <div className="relative flex-1">
        <Input
          value={commentInput}
          placeholder={t.commentPlaceholder}
          className="bg-white/10 border-white/10 text-white placeholder:text-white/45"
          onChange={(e) => {
            setCommentInput(e.target.value);
            handleTextChange(e.target.value, e.target.selectionStart || 0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSubmitComment();
            }
          }}
        />

        <MentionDropdown
          query={mentionQuery}
          visible={showMentions}
          onSelect={(username) => {
            setCommentInput(insertMention(commentInput, username));
            closeMentions();
          }}
        />
      </div>

      <Button
        size="icon"
        onClick={handleSubmitComment}
        disabled={!commentInput.trim()}
      >
        <MessageCircle className="w-4 h-4" />
      </Button>
    </div>
  </div>
)}              
          
        </div>
      </section>
    );
  }

  if (item.type === "photo") {
  return (
    <section
      key={item.flowKey}
      className="h-[calc(100dvh-16rem)] sm:h-[calc(100dvh-14rem)] snap-start py-0"
    >
      <div className="h-full rounded-[28px] border border-border/60 overflow-hidden bg-black relative">
        <img
          src={item.imageUrl || item.mediaUrl}
          alt={item.title || "Foto"}
          className="absolute inset-0 w-full h-full object-cover"
          loading={index === activeIndex ? "eager" : "lazy"}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/20 pointer-events-none" />

        <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/50 text-white text-xs font-semibold border border-white/10">
          FOTO
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between">
          <Link href={`/artist/${item.artist.id}`}>
            <div className="flex items-end gap-2 min-w-0 max-w-[75%] cursor-pointer">
              <Avatar className="w-11 h-11 border-2 border-white/70">
                {item.artist.avatarUrl && (
                  <AvatarImage
                    src={item.artist.avatarUrl}
                    alt={item.artist.displayName}
                  />
                )}

                <AvatarFallback className="bg-primary/20 text-white">
                  {item.artist.displayName?.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p className="text-white text-lg font-semibold leading-tight truncate">
                  {item.artist.displayName}
                </p>

                <p className="text-white/90 text-sm leading-tight truncate">
                  {item.title || "Foto"}
                </p>

                {item.description && (
                  <p className="text-white/70 text-xs leading-tight truncate mt-1">
                    {item.description}
                  </p>
                )}

                <p className="text-white/60 text-xs truncate mt-1">
                  @{item.artist.username}
                </p>
              </div>
            </div>
          </Link>

          <div className="flex flex-col items-center gap-4 text-white">
            <button
              type="button"
              className={`flex flex-col items-center gap-1 ${
                Number(item.artist.id) === Number(currentUserId)
                  ? "opacity-50 cursor-not-allowed"
                  : photoLikedMap[item.id]
                    ? "text-red-500"
                    : "text-white"
              }`}
              disabled={
                Number(item.artist.id) === Number(currentUserId) ||
                !photoLikeReadyMap[item.id] ||
                photoLikePendingMap[item.id]
              }
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePhotoLike(item);
              }}
            >
              <Heart
                className={`w-7 h-7 ${
                  photoLikedMap[item.id] ? "fill-red-500 text-red-500" : ""
                }`}
              />
              <span className="text-[11px]">
                {photoLikeCounts[item.id] ?? item.likesCount ?? 0}
              </span>
            </button>

            <button
              type="button"
              className={`flex flex-col items-center gap-1 ${
                commentsOpenType === "photo" && commentsOpenId === item.id
                  ? "text-primary"
                  : "text-white opacity-80"
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFlowComments("photo", item.id);
              }}
            >
              <MessageCircle className="w-7 h-7" />
              <span className="text-[11px]">
                {commentsOpenType === "photo" && commentsOpenId === item.id
                  ? comments.length
                  : Number((item as any).commentsCount ?? 0)}
              </span>
            </button>
          </div>
        </div>

        {commentsOpenType === "photo" && commentsOpenId === item.id && (
          <div className="absolute inset-x-0 bottom-0 h-[72%] rounded-t-3xl bg-black/95 border-t border-white/10 backdrop-blur z-50 flex flex-col overflow-hidden shadow-2xl">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <p className="text-white text-sm font-semibold">
                Commenti
              </p>

              <button
                type="button"
                className="text-white/60 text-sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCommentsOpenType(null);
                  setCommentsOpenId(null);
                  setCommentInput("");
                  closeMentions();
                }}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
              {comments.length === 0 ? (
                <p className="text-white/55 text-sm text-center py-4">
                  {t.noComments}
                </p>
              ) : (
                comments.map((comment: any) => (
                  <div key={comment.id} className="flex items-start gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      {comment.avatar_url && (
                        <AvatarImage
                          src={comment.avatar_url}
                          alt={comment.display_name || "Profilo"}
                        />
                      )}

                      <AvatarFallback className="bg-primary/20 text-white text-xs">
                        {(comment.display_name || comment.username || "P").charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 bg-white/10 rounded-2xl px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-white text-sm font-semibold truncate">
                          {comment.display_name || comment.username || "Profilo"}
                        </p>

                        {Number(comment.author_id) !== Number(currentUserId) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-white/60 hover:text-white hover:bg-white/10 shrink-0"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();

                              openReport({
                                targetType: "comment",
                                targetId: String(comment.id),
                                targetOwnerId: Number(comment.author_id),
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

                      <p className="text-white/90 text-sm whitespace-pre-wrap break-words">
                        <MentionText text={comment.content} />
                      </p>

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-white/45 text-xs">
                          {comment.created_at &&
                            new Date(comment.created_at).toLocaleDateString("it-IT", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                        </span>

                        <div className="flex items-center gap-2">
                          {(Number(comment.author_id) === Number(currentUserId) ||
                            Number(item.artist.id) === Number(currentUserId)) && (
                            <button
                              type="button"
                              className="text-xs text-red-400 hover:text-red-500"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();

                                await apiRequest(
                                  "DELETE",
                                  `/api/photos/${item.id}/comments/${comment.id}`
                                );

                                await refetchComments();

                                await queryClient.invalidateQueries({
                                  queryKey: ["/api/flow/client"],
                                  exact: false,
                                });
                              }}
                            >
                              🗑️
                            </button>
                          )}

                          {Number(comment.author_id) !== Number(currentUserId) && (
                            <button
                              type="button"
                              className={`flex items-center gap-1 text-xs ${
                                comment.likedByMe
                                  ? "text-red-500"
                                  : "text-white/55 hover:text-red-500"
                              }`}
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();

                                if (comment.likedByMe) {
                                  await apiRequest(
                                    "POST",
                                    `/api/photos/${item.id}/comments/${comment.id}/unlike/${currentUserId}`
                                  );
                                } else {
                                  await apiRequest(
                                    "POST",
                                    `/api/photos/${item.id}/comments/${comment.id}/like/${currentUserId}`
                                  );
                                }

                                await refetchComments();
                              }}
                            >
                              <Heart
                                className={`w-3 h-3 ${
                                  comment.likedByMe ? "fill-red-500 text-red-500" : ""
                                }`}
                              />
                              <span>{comment.likes_count ?? 0}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-white/10 px-3 py-3 shrink-0 bg-black/80">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    value={commentInput}
                    placeholder={t.commentPlaceholder}
                    className="w-full bg-white/10 border-white/10 text-white placeholder:text-white/40"
                    onChange={(e) => {
                      setCommentInput(e.target.value);
                      handleTextChange(e.target.value, e.target.selectionStart || 0);
                    }}
                    onKeyDown={async (e) => {
                      if (e.key !== "Enter") return;

                      e.preventDefault();
                      e.stopPropagation();

                      await handleSubmitComment();
                    }}
                  />

                  <MentionDropdown
                    query={mentionQuery}
                    visible={showMentions}
                    onSelect={(username) => {
                      setCommentInput(insertMention(commentInput, username));
                      closeMentions();
                    }}
                  />
                </div>

                <Button
                  size="icon"
                  disabled={!commentInput.trim()}
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    await handleSubmitComment();
                  }}
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
  
  const video = item;
          const isActive = index === activeIndex;
          const isMuted = flowMuted;
          const isSaved = savedVideoIds.includes(video.id);
          const isLiked = likedMap[video.id] ?? false;
          const likesCount = likeCounts[video.id] ?? Number((video as any).likesCount ?? 0);
          const commentsOpen = commentsOpenType === "video" && commentsOpenId === video.id;
          const isOwnVideo = Number(video.artist.id) === Number(currentUserId);

          return (
            <section
              key={video.flowKey}
              className="h-[calc(100dvh-16rem)] sm:h-[calc(100dvh-14rem)] snap-start py-0"
            >
              <div className="h-full rounded-[28px] border border-border/60 overflow-hidden bg-black relative">
              <div
  className={`relative ${commentsOpen ? "h-[48%]" : "h-full"} transition-all duration-300`}
  onClick={() => togglePause(video.id)}
>
  <video
    ref={(el) => {
      videoRefs.current[video.id] = el;
      if (el && index === activeIndex && !pausedVideoIds.has(video.id)) {
  el.muted = flowMuted;
  el.defaultMuted = flowMuted;
  el.playsInline = true;
  el.autoplay = true;
  el.preload = "auto";

  const tryPlay = () => el.play().catch(() => {});
  requestAnimationFrame(tryPlay);
  setTimeout(tryPlay, 120);
  setTimeout(tryPlay, 350);
}
    }}
    src={video.videoUrl ?? undefined}
    playsInline
    loop
    autoPlay
    muted={isMuted}
    defaultMuted
    preload="auto"
    className="w-full h-full object-cover"
    onLoadedData={() => {
  const el = videoRefs.current[video.id];

  if (el && index === activeIndex && !pausedVideoIds.has(video.id)) {
    el.muted = flowMuted;
    el.defaultMuted = flowMuted;
    el.playsInline = true;
    el.play().catch(() => {});
  }
}}
  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/10 pointer-events-none" />

                 <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between">
                   <div className="flex items-end gap-2 min-w-0 max-w-[70%]">
                      <Link href={`/artist/${video.artist.id}`}>
                        <Avatar className="w-11 h-11 border-2 border-primary/80">
                          {video.artist.avatarUrl && (
                            <AvatarImage src={video.artist.avatarUrl} alt={video.artist.displayName} />
                          )}
                          <AvatarFallback className="bg-primary/20 text-white">
                            {video.artist.displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </Link>

                      <div className="min-w-0">
                        <p className="text-white text-lg font-semibold leading-tight truncate">
                          {video.artist.displayName}
                        </p>
                        <p className="text-white text-lg font-semibold leading-tight truncate">
                          {video.title || t.untitled}
                        </p>
                       <p className="text-white/70 text-sm truncate">@{video.artist.username}</p>

                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-3 text-white">
                      <button
  disabled={isOwnVideo || !likeStatusReady[video.id] || likePendingMap[video.id]}
  onClick={(e) => {
    e.stopPropagation();
    if (isOwnVideo) return;
    handleLike(video);
  }}
  className={`flex flex-col items-center gap-2 ${
  isOwnVideo || !likeStatusReady[video.id] || likePendingMap[video.id]
    ? "opacity-50 cursor-not-allowed"
    : ""
}`}
>
                        <Heart className={`w-7 h-7 ${isLiked ? "fill-red-400 text-red-400" : ""}`} />
                       <span className="text-[11px]">{likesCount >= 1000 ? `${(likesCount / 1000).toFixed(1)}K` : likesCount}</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSave(video.id);
                        }}
                        className="flex flex-col items-center gap-2"
                      >
                        <Bookmark className={`w-7 h-7 ${isSaved ? "fill-white" : ""}`} />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(video);
                        }}
                        className="flex flex-col items-center gap-2"
                      >
                        <Share2 className="w-7 h-7" />
                      </button>

                      <button
  type="button"
  className={`flex flex-col items-center gap-1 ${
    commentsOpenType === "video" && commentsOpenId === video.id
      ? "text-primary"
      : "text-white"
  }`}
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFlowComments("video", video.id);
  }}
>
  <MessageCircle className="w-6 h-6" />
 <span className="text-[11px]">
  {commentsOpenType === "video" && commentsOpenId === video.id
    ? comments.length
    : Number((video as any).commentsCount ?? 0)}
</span>
</button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMute(video.id);
                        }}
                      >
                        {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                      </button>
                    </div>
                  </div>

                 <div className="absolute top-4 left-4">
<div className="px-2.5 py-1 rounded-full bg-black/50 text-white text-[11px] border border-white/10">
    {activeTab === "for-you" ? t.forYou : activeTab === "emerging" ? t.emerging : t.trend}
  </div>
</div>
                </div>

                {commentsOpen && (
  <div className="h-[52%] bg-background border-t border-border/70 flex flex-col">
    <div className="space-y-4 flex-1 overflow-y-auto px-4 pt-4 pr-3">
      {comments.length > 0 ? (
        comments.map((comment: any) => (
          <div key={comment.id} className="flex items-start gap-3">
            <Avatar className="w-9 h-9 flex-shrink-0">
              {comment.avatar_url && <AvatarImage src={comment.avatar_url} alt={comment.display_name} />}
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {comment.display_name?.charAt(0)}
              </AvatarFallback>
            </Avatar>

           <div className="flex-1 bg-muted rounded-xl px-4 py-3 min-w-0">
  <div className="flex items-start justify-between gap-2">
    <p className="text-sm font-semibold min-w-0 truncate">
      {comment.display_name}
    </p>

    {Number(comment.author_id) !== Number(currentUserId) && (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full shrink-0 -mt-1 -mr-1"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();

          openReport({
            targetType: "comment",
            targetId: String(comment.id),
            targetOwnerId: Number(comment.author_id),
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
    <MentionText text={comment.content} />
  </p>

  <div className="flex items-center justify-between mt-2">
    <span className="text-xs text-muted-foreground">
      {comment.created_at &&
        new Date(comment.created_at).toLocaleDateString("it-IT", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
    </span>

    <div className="flex items-center gap-2">
      {(Number(comment.author_id) === Number(currentUserId) ||
        Number(video.artist.id) === Number(currentUserId)) && (
        <button
          className="text-xs text-red-400 hover:text-red-600"
          onClick={async (e) => {
            e.stopPropagation();
            await apiRequest("DELETE", `/api/videos/${video.id}/comments/${comment.id}`);
            await refetchComments();
          }}
        >
          🗑️
        </button>
      )}

      <button
        className={`flex items-center gap-1 text-xs ${
          Number(comment.author_id) === Number(currentUserId)
            ? "opacity-50 cursor-not-allowed text-muted-foreground"
            : comment.likedByMe
              ? "text-red-500"
              : "text-muted-foreground hover:text-red-500"
        }`}
        disabled={Number(comment.author_id) === Number(currentUserId)}
        onClick={async (e) => {
          e.stopPropagation();

          if (comment.likedByMe) {
            await apiRequest(
              "POST",
              `/api/videos/${video.id}/comments/${comment.id}/unlike`,
              { userId: currentUserId }
            );
          } else {
            await apiRequest(
              "POST",
              `/api/videos/${video.id}/comments/${comment.id}/like`,
              { userId: currentUserId }
            );
          }

          await refetchComments();
        }}
      >
        <Heart className={`w-3 h-3 ${comment.likedByMe ? "fill-red-500" : ""}`} />
        <span>{comment.likes_count ?? 0}</span>
      </button>
    </div>
  </div>
</div>
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground px-4">{t.noComments}</p>
      )}
    </div>

    <div className="pt-3 mt-2 border-t px-4 pb-4 bg-background shrink-0">
      <div className="flex items-center gap-2 rounded-xl border bg-background/95 px-3 py-2">
        <div className="relative flex-1">
          <Input
            value={commentInput}
           placeholder={t.commentPlaceholder}
            className="w-full h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 text-base placeholder:text-[14px]"
            onChange={(e) => {
              setCommentInput(e.target.value);
              handleTextChange(e.target.value, e.target.selectionStart || 0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmitComment();
            }}
          />
          <MentionDropdown
            query={mentionQuery}
            visible={showMentions}
            onSelect={(username) => {
              setCommentInput(insertMention(commentInput, username));
              closeMentions();
            }}
          />
        </div>

        <Button
          size="icon"
          className="shrink-0"
          onClick={handleSubmitComment}
          disabled={!commentInput.trim()}
        >
          <MessageCircle className="w-4 h-4" />
        </Button>
      </div>
    </div>
  </div>
)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
