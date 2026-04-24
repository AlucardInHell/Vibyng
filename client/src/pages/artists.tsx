import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Zap, Heart, Bookmark, Share2, MessageCircle, Volume2, VolumeX, Sparkles } from "lucide-react";
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

function getCurrentUserId(): number {
  try {
    const stored = localStorage.getItem("vibyng-user");
    if (stored) return JSON.parse(stored).id || 1;
  } catch {}
  return 1;
}

type FlowTab = "for-you" | "emerging" | "trend";
type AppLanguage = "it" | "en";

const flowTranslations = {
  it: {
    loading: "Caricamento Flow...",
    empty: "Nessun video disponibile nel Flow",
    forYou: "Per Te",
    emerging: "Emergenti",
    trend: "Trend",
    untitled: "Senza titolo",
    copied: "Link copiato!",
    noComments: "Ancora nessun commento.",
    commentPlaceholder: "Scrivi un commento...",
    loadArtistsError: "Errore nel caricamento artisti",
    flowShareText: "Flow su Vibyng",
  },
  en: {
    loading: "Loading Flow...",
    empty: "No videos available in Flow",
    forYou: "For You",
    emerging: "Emerging",
    trend: "Trend",
    untitled: "Untitled",
    copied: "Link copied!",
    noComments: "No comments yet.",
    commentPlaceholder: "Write a comment...",
    loadArtistsError: "Error loading artists",
    flowShareText: "Flow on Vibyng",
  },
} as const;

function getStoredLanguage(): AppLanguage {
  try {
    const stored = localStorage.getItem("vibyng-language");
    if (stored === "it" || stored === "en") return stored;
  } catch {}
  return "it";
}
type FlowVideo = ArtistVideo & {
  artist: User;
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
  const [savedVideoIds, setSavedVideoIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem("flow-saved-videos");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [pausedVideoIds, setPausedVideoIds] = useState<Set<number>>(new Set());
  const [mutedVideoIds, setMutedVideoIds] = useState<Set<number>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});
  const [likedMap, setLikedMap] = useState<Record<number, boolean>>({});

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
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

  const { data: flowVideos = [] } = useQuery<FlowVideo[]>({
    queryKey: ["/api/flow/client", artists.map((a) => a.id).join(",")],
    enabled: artists.length > 0,
    queryFn: async () => {
      const all = await Promise.all(
        artists.map(async (artist) => {
          const res = await fetch(`/api/users/${artist.id}/videos`);
          if (!res.ok) return [] as FlowVideo[];
          const videos: ArtistVideo[] = await res.json();
          return videos
            .filter((video) => !!video.videoUrl)
            .map((video) => ({
              ...video,
              artist,
            }));
        })
      );

      return all
        .flat()
        .sort(
          (a, b) =>
            new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime()
        );
    },
  });

  useEffect(() => {
    localStorage.setItem("flow-saved-videos", JSON.stringify(savedVideoIds));
  }, [savedVideoIds]);

  useEffect(() => {
    if (!flowVideos.length) return;
    setLikeCounts((prev) => {
      const next = { ...prev };
      flowVideos.forEach((video) => {
        if (next[video.id] === undefined) {
          next[video.id] = Number((video as any).likesCount ?? 0);
        }
      });
      return next;
    });
  }, [flowVideos]);

  const forYouVideos = useMemo(() => {
    return [...flowVideos].sort(
      (a, b) =>
        new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime()
    );
  }, [flowVideos]);

  const emergingVideos = useMemo(() => {
    return [...flowVideos].sort((a, b) => {
      const aLikes = Number((a as any).likesCount ?? 0);
      const bLikes = Number((b as any).likesCount ?? 0);
      return aLikes - bLikes || new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime();
    });
  }, [flowVideos]);

  const trendVideos = useMemo(() => {
    return [...flowVideos].sort((a, b) => {
      const aLikes = Number((a as any).likesCount ?? 0);
      const bLikes = Number((b as any).likesCount ?? 0);
      return bLikes - aLikes || new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime();
    });
  }, [flowVideos]);

  const activeList = useMemo(() => {
    if (activeTab === "emerging") return emergingVideos;
    if (activeTab === "trend") return trendVideos;
    return forYouVideos;
  }, [activeTab, emergingVideos, trendVideos, forYouVideos]);

  const activeVideo = activeList[activeIndex] ?? null;

  const { data: activeLikedData, refetch: refetchActiveLiked } = useQuery<{ liked: boolean }>({
    queryKey: ["/api/videos", activeVideo?.id, "liked", currentUserId],
    enabled: !!activeVideo?.id,
    queryFn: async () => {
      const res = await fetch(`/api/videos/${activeVideo!.id}/liked/${currentUserId}`);
      return res.json();
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (activeVideo?.id && activeLikedData) {
      setLikedMap((prev) => ({ ...prev, [activeVideo.id]: activeLikedData.liked }));
    }
  }, [activeLikedData, activeVideo]);

  const { data: comments = [], refetch: refetchComments } = useQuery<any[]>({
    queryKey: ["/api/videos", commentsOpenId, "comments", currentUserId],
    enabled: commentsOpenId !== null,
    queryFn: async () => {
      const res = await fetch(`/api/videos/${commentsOpenId}/comments?userId=${currentUserId}`);
      return res.json();
    },
    staleTime: 0,
  });

  useEffect(() => {
  activeList.forEach((video, index) => {
    const el = videoRefs.current[video.id];
    if (!el) return;

    if (index === activeIndex && !pausedVideoIds.has(video.id)) {
      el.muted = mutedVideoIds.has(video.id);
      el.playsInline = true;
      el.preload = "auto";

      const tryPlay = () => el.play().catch(() => {});
      tryPlay();
      requestAnimationFrame(tryPlay);
      setTimeout(tryPlay, 120);
    } else {
      el.pause();
    }
  });
}, [activeIndex, activeList, mutedVideoIds, pausedVideoIds, activeTab]);

  useEffect(() => {
    setActiveIndex(0);
    setCommentsOpenId(null);
  }, [activeTab]);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    const slideHeight = container.clientHeight;
    const nextIndex = Math.round(container.scrollTop / slideHeight);
    if (nextIndex !== activeIndex) {
      setActiveIndex(nextIndex);
      setCommentsOpenId(null);
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
    const next = new Set(mutedVideoIds);
    if (mutedVideoIds.has(videoId)) {
      next.delete(videoId);
    } else {
      next.add(videoId);
    }
    setMutedVideoIds(next);
    const el = videoRefs.current[videoId];
    if (el) {
      el.muted = next.has(videoId);
    }
  };

  const toggleSave = (videoId: number) => {
    setSavedVideoIds((prev) =>
      prev.includes(videoId) ? prev.filter((id) => id !== videoId) : [...prev, videoId]
    );
  };

  const handleLike = async (video: FlowVideo) => {
    const isLiked = likedMap[video.id] ?? false;
    const currentCount = likeCounts[video.id] ?? Number((video as any).likesCount ?? 0);

    if (isLiked) {
      await apiRequest("POST", `/api/videos/${video.id}/unlike`, { userId: currentUserId });
      setLikedMap((prev) => ({ ...prev, [video.id]: false }));
      setLikeCounts((prev) => ({ ...prev, [video.id]: Math.max(0, currentCount - 1) }));
    } else {
      await apiRequest("POST", `/api/videos/${video.id}/like`, { userId: currentUserId });
      setLikedMap((prev) => ({ ...prev, [video.id]: true }));
      setLikeCounts((prev) => ({ ...prev, [video.id]: currentCount + 1 }));
    }

    await refetchActiveLiked();
    await queryClient.invalidateQueries({ queryKey: ["/api/users", video.artist.id, "videos"] });
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

  const handleSubmitComment = async () => {
    if (!commentsOpenId || !commentInput.trim()) return;

    await apiRequest("POST", `/api/videos/${commentsOpenId}/comments`, {
      authorId: currentUserId,
      content: commentInput.trim(),
    });

    setCommentInput("");
    closeMentions();
    await refetchComments();
    await queryClient.invalidateQueries({ queryKey: ["/api/vpoints", currentUserId, "status"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary" />
          <span className="text-muted-foreground">{t.loading}</span>
        </div>
      </div>
    );
  }

  if (!activeList.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2">
        <Sparkles className="w-8 h-8 text-muted-foreground" />
        <p className="text-muted-foreground">{t.empty}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold">Flow</h1>
      </div>

      <div className="flex items-center gap-3 sticky top-0 z-20 bg-background/95 backdrop-blur py-2">
        <button
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            activeTab === "for-you" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("for-you")}
        >
          {t.forYou}
        </button>
        <button
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            activeTab === "emerging" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("emerging")}
        >
          {t.emerging}
        </button>
        <button
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            activeTab === "trend" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("trend")}
        >
          {t.trend}
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-[calc(100dvh-16rem)] sm:h-[calc(100dvh-14rem)] overflow-y-auto snap-y snap-mandatory"
      >
        {activeList.map((video, index) => {
          const isActive = index === activeIndex;
          const isMuted = mutedVideoIds.has(video.id);
          const isSaved = savedVideoIds.includes(video.id);
          const isLiked = likedMap[video.id] ?? false;
          const likesCount = likeCounts[video.id] ?? Number((video as any).likesCount ?? 0);
          const commentsOpen = commentsOpenId === video.id;

          return (
            <section
              key={video.id}
              className="h-[calc(100dvh-16rem)] sm:h-[calc(100dvh-14rem)] snap-start py-1"
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
        el.muted = mutedVideoIds.has(video.id);
        el.playsInline = true;
        el.preload = "auto";

        const tryPlay = () => el.play().catch(() => {});
        requestAnimationFrame(tryPlay);
        setTimeout(tryPlay, 120);
      }
    }}
    src={video.videoUrl ?? undefined}
    playsInline
    loop
    autoPlay
    muted={isMuted}
    preload="auto"
    className="w-full h-full object-cover"
    onLoadedData={() => {
      const el = videoRefs.current[video.id];
      if (el && index === activeIndex && !pausedVideoIds.has(video.id)) {
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

                    <div className="flex flex-col items-center gap-4 text-white">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(video);
                        }}
                        className="flex flex-col items-center gap-2"
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setCommentsOpenId(commentsOpen ? null : video.id);
                          setCommentInput("");
                        }}
                        className="flex flex-col items-center gap-2"
                      >
                        <MessageCircle className="w-7 h-7" />
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
  <p className="text-sm font-semibold">{comment.display_name}</p>

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
