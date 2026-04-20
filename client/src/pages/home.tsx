import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Share2, Sparkles, Music, Send, Megaphone, ExternalLink, Plus, X, ChevronLeft, ChevronRight, Search, ImageIcon, Loader2, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect, useRef, useMemo } from "react";
import { shareVibyngContent, buildContentShareUrl } from "@/lib/share-content";
import type { Post, User, Comment, Story } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpload } from "@/hooks/use-upload";
import { useMention } from "@/hooks/use-mention";
import { MentionDropdown } from "@/components/mention-dropdown";
import { MentionText } from "@/components/mention-text";

const studioImage = "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80";
const djImage = "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80";
const acousticImage = "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&q=80";
const beatImage = "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80";
const concertImage = "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80";

type PostWithAuthor = Post & { author: User };
type CommentWithAuthor = Comment & { author: User };
type StoryWithUser = Story & { user: User };

function getCurrentUserId(): number {
  try {
    const stored = localStorage.getItem("vibyng-user");
    if (stored) return JSON.parse(stored).id || 1;
  } catch {}
  return 1;
}
const CURRENT_USER_ID = getCurrentUserId();

interface StoryUserGroup {
  userId: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  hasUnseenStory: boolean;
  stories: {
  id: number;
  content: string | null;
  imageUrl: string;
  timestamp: string;
  likesCount: number;
  likedByMe: boolean;
}[];
}

function formatStoryTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "ora";
  if (hours === 1) return "1h";
  return `${hours}h`;
}

function groupStoriesByUser(stories: StoryWithUser[]): StoryUserGroup[] {
  const groups: Record<number, StoryUserGroup> = {};
  
  for (const story of stories) {
    if (!groups[story.userId]) {
      groups[story.userId] = {
        userId: story.userId,
        username: story.user.username,
        displayName: story.user.displayName,
        avatarUrl: story.user.avatarUrl,
        hasUnseenStory: true,
        stories: [],
      };
    }
    groups[story.userId].stories.push({
  id: story.id,
  content: story.content,
  imageUrl: story.imageUrl,
  timestamp: formatStoryTime(new Date(story.createdAt!)),
  likesCount: Number((story as any).likesCount ?? 0),
  likedByMe: Boolean((story as any).likedByMe),
});
  }
  
  return Object.values(groups);
}

const STORY_DURATION = 5000;

function Stories() {
  const { toast } = useToast();
  const [viewedStories, setViewedStories] = useState<Set<number>>(new Set());
  const [activeStory, setActiveStory] = useState<StoryUserGroup | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isReplyFocused, setIsReplyFocused] = useState(false);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [storyContent, setStoryContent] = useState("");
  const {
  mentionQuery: storyMentionQuery,
  showMentions: showStoryMentions,
  handleTextChange: handleStoryTextChange,
  insertMention: insertStoryMention,
  closeMentions: closeStoryMentions,
} = useMention();
  const {
  mentionQuery: storyReplyMentionQuery,
  showMentions: showStoryReplyMentions,
  handleTextChange: handleStoryReplyTextChange,
  insertMention: insertStoryReplyMention,
  closeMentions: closeStoryReplyMentions,
} = useMention();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useUpload();
  
  const { data: storiesFromDb = [] } = useQuery<StoryWithUser[]>({
  queryKey: ["/api/stories", CURRENT_USER_ID],
  queryFn: async () => {
    const res = await fetch(`/api/stories?userId=${CURRENT_USER_ID}&t=${Date.now()}`);
    return res.json();
  },
  refetchInterval: 5000,
  staleTime: 0,
  refetchOnWindowFocus: true,
});
  
  const storiesData = useMemo(() => groupStoriesByUser(storiesFromDb), [storiesFromDb]);
  useEffect(() => {
  if (!activeStory) return;

  const currentStoryId = activeStory.stories[activeStoryIndex]?.id;
  if (!currentStoryId) return;

  const refreshedStoryGroup = storiesData.find(
    (story) => story.userId === activeStory.userId
  );

  if (!refreshedStoryGroup) {
    closeStory();
    return;
  }

  const refreshedIndex = refreshedStoryGroup.stories.findIndex(
    (story) => story.id === currentStoryId
  );

  if (refreshedIndex === -1) {
    setActiveStory(refreshedStoryGroup);
    return;
  }

  const currentStory = activeStory.stories[activeStoryIndex];
  const updatedStory = refreshedStoryGroup.stories[refreshedIndex];

  const hasChanged =
    currentStory?.likedByMe !== updatedStory?.likedByMe ||
    currentStory?.likesCount !== updatedStory?.likesCount ||
    currentStory?.content !== updatedStory?.content ||
    currentStory?.imageUrl !== updatedStory?.imageUrl ||
    activeStory.stories.length !== refreshedStoryGroup.stories.length;

  if (hasChanged) {
    setActiveStory(refreshedStoryGroup);

    if (refreshedIndex !== activeStoryIndex) {
      setActiveStoryIndex(refreshedIndex);
    }
  }
}, [storiesData]);
  
  const createStoryMutation = useMutation({
  mutationFn: async (data: { userId: number; imageUrl: string; content: string }) => {
    return await apiRequest("POST", "/api/stories", data);
  },
});

  const deleteStoryMutation = useMutation({
  mutationFn: async (storyId: number) => {
    return await apiRequest("DELETE", `/api/stories/${storyId}/${CURRENT_USER_ID}`);
  },
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
    closeStory();
    toast({
      title: "Storia eliminata",
      description: "La storia è stata rimossa con successo",
    });
  },
  onError: () => {
    toast({
      title: "Errore",
      description: "Impossibile eliminare la storia",
      variant: "destructive",
    });
  },
});
 
  useEffect(() => {
    if (activeStory && !isPaused && !isReplying && !isReplyFocused) {
      setProgress(0);
      const startTime = Date.now();
      
      progressInterval.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = (elapsed / STORY_DURATION) * 100;
        
        if (newProgress >= 100) {
          nextStory();
        } else {
          setProgress(newProgress);
        }
      }, 50);

      return () => {
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      };
    }
  }, [activeStory, activeStoryIndex, isPaused]);

  const openStory = (story: StoryUserGroup) => {
    setActiveStory(story);
    setActiveStoryIndex(0);
    setProgress(0);
    setViewedStories(prev => new Set(Array.from(prev).concat(story.userId)));
  };

  const closeStory = () => {
  setActiveStory(null);
  setActiveStoryIndex(0);
  setProgress(0);
  setReplyText("");
  setIsPaused(false);
  setIsReplying(false);
  setIsReplyFocused(false);
  if (progressInterval.current) {
    clearInterval(progressInterval.current);
  }
};

  const nextStory = () => {
    if (!activeStory) return;
    setProgress(0);
    if (activeStoryIndex < activeStory.stories.length - 1) {
      setActiveStoryIndex(prev => prev + 1);
    } else {
      const currentIndex = storiesData.findIndex(s => s.userId === activeStory.userId);
      if (currentIndex < storiesData.length - 1) {
        const nextUser = storiesData[currentIndex + 1];
        setActiveStory(nextUser);
        setActiveStoryIndex(0);
        setViewedStories(prev => new Set(Array.from(prev).concat(nextUser.userId)));
      } else {
        closeStory();
      }
    }
  };

  const prevStory = () => {
    if (!activeStory) return;
    setProgress(0);
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(prev => prev - 1);
    } else {
      const currentIndex = storiesData.findIndex(s => s.userId === activeStory.userId);
      if (currentIndex > 0) {
        const prevUser = storiesData[currentIndex - 1];
        setActiveStory(prevUser);
        setActiveStoryIndex(prevUser.stories.length - 1);
      }
    }
  };

  const handleAddStory = () => {
    setShowAddDialog(true);
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
 const handlePublishStory = async () => {
  if (!selectedFile) {
    toast({
      title: "Seleziona un'immagine",
      description: "Devi selezionare un'immagine per la storia",
      variant: "destructive",
    });
    return;
  }

  try {
    const uploadResult = await uploadFile(selectedFile);

    if (!uploadResult) {
      toast({
        title: "Errore upload",
        description: "Impossibile caricare l'immagine",
        variant: "destructive",
      });
      return;
    }

    await createStoryMutation.mutateAsync({
      userId: CURRENT_USER_ID,
      imageUrl: uploadResult.objectPath,
      content: storyContent,
    });

    await queryClient.invalidateQueries({ queryKey: ["/api/stories"] });

    toast({
      title: "Storia pubblicata!",
      description: "La tua storia sarà visibile per 24 ore",
    });

    setShowAddDialog(false);
    setStoryContent("");
    setPreviewImage(null);
    setSelectedFile(null);
  } catch {
    toast({
      title: "Errore",
      description: "Impossibile pubblicare la storia",
      variant: "destructive",
    });
  }
};

 const handleLikeStory = async () => {
  if (!activeStory) return;

  const currentStory = activeStory.stories[activeStoryIndex];
  if (!currentStory?.id) return;

  const wasLiked = currentStory.likedByMe;

  setActiveStory((prev) => {
    if (!prev) return prev;

    return {
      ...prev,
      stories: prev.stories.map((story, index) =>
        index === activeStoryIndex
          ? {
              ...story,
              likedByMe: !wasLiked,
              likesCount: Math.max(0, (story.likesCount ?? 0) + (wasLiked ? -1 : 1)),
            }
          : story
      ),
    };
  });

  try {
    if (wasLiked) {
      await apiRequest("POST", `/api/stories/${currentStory.id}/unlike`, {
        userId: CURRENT_USER_ID,
      });
    } else {
      await apiRequest("POST", `/api/stories/${currentStory.id}/like`, {
        userId: CURRENT_USER_ID,
      });
    }

    await queryClient.refetchQueries({ queryKey: ["/api/stories", CURRENT_USER_ID] });
  } catch {
    setActiveStory((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        stories: prev.stories.map((story, index) =>
          index === activeStoryIndex
            ? {
                ...story,
                likedByMe: wasLiked,
                likesCount: Math.max(0, (story.likesCount ?? 0) + (wasLiked ? 1 : -1)),
              }
            : story
        ),
      };
    });

    toast({
      title: "Errore",
      description: "Non è stato possibile aggiornare il like",
      variant: "destructive",
    });
  }
};

 const handleSendReply = async () => {
  if (!activeStory) return;

  const currentStory = activeStory.stories[activeStoryIndex];
  const trimmedReply = replyText.trim();

  if (!currentStory?.id || !trimmedReply) return;

  try {
    await apiRequest("POST", `/api/stories/${currentStory.id}/reply`, {
      senderId: CURRENT_USER_ID,
      content: trimmedReply,
    });

    toast({
      title: "Messaggio inviato",
      description: `Hai risposto a ${activeStory.displayName}`,
    });

    setReplyText("");
    setIsReplying(false);
    setIsReplyFocused(false);
    setIsPaused(false);
  } catch {
    toast({
      title: "Errore",
      description: "Non è stato possibile inviare la risposta",
      variant: "destructive",
    });
  }
};

  return (
    <>
     <div className="flex gap-3 overflow-x-auto -mx-4 px-4 scrollbar-hide [&::-webkit-scrollbar]:hidden" style={{msOverflowStyle: "none", scrollbarWidth: "none"}} data-testid="stories-container">
        <button
          onClick={handleAddStory}
          className="flex flex-col items-center gap-1 flex-shrink-0"
          data-testid="button-add-story"
        >
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center bg-muted/30">
            <Plus className="w-6 h-6 text-muted-foreground" />
          </div>
          <span className="text-xs text-muted-foreground">La tua</span>
        </button>

        {storiesData.map((story) => {
          const hasUnseen = story.hasUnseenStory && !viewedStories.has(story.userId);
          return (
            <button
              key={story.userId}
              onClick={() => openStory(story)}
              className="flex flex-col items-center gap-1 flex-shrink-0"
              data-testid={`story-${story.userId}`}
            >
              <div
                className={`w-16 h-16 rounded-full p-[2px] ${
                  hasUnseen
                    ? "bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-400"
                    : "bg-muted-foreground/30"
                }`}
              >
                <div className="w-full h-full rounded-full bg-background p-[2px]">
                  <Avatar className="w-full h-full">
                    {story.avatarUrl && <AvatarImage src={story.avatarUrl} alt={story.displayName} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {story.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <span className="text-xs truncate w-16 text-center">{story.username.split("_")[0]}</span>
            </button>
          );
        })}
      </div>

      <Dialog open={!!activeStory} onOpenChange={() => closeStory()}>
       <DialogContent className="max-w-md p-0 overflow-hidden bg-black border-0 [&::-webkit-scrollbar]:hidden [&>button]:hidden" data-testid="dialog-story">
          {activeStory && (
            <div 
              className="relative w-full aspect-[9/16] max-h-[80vh]"
              onMouseDown={() => setIsPaused(true)}
              onMouseUp={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
            >
              <img 
                src={activeStory.stories[activeStoryIndex]?.imageUrl} 
                alt="Story"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

              <div className="absolute top-3 left-0 right-0 flex gap-1 px-3">
                {activeStory.stories.map((_, idx) => (
                  <div key={idx} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
                    <div 
                      className="h-full bg-white transition-all duration-100 ease-linear"
                      style={{ 
                        width: idx < activeStoryIndex ? '100%' : 
                               idx === activeStoryIndex ? `${progress}%` : '0%' 
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="absolute top-7 left-0 right-0 flex items-center justify-between px-3 pt-2">
  <Link href={`/artist/${activeStory.userId}`} onClick={closeStory}>
    <div className="flex items-center gap-2">
      <Avatar className="w-9 h-9 border-2 border-white">
        <AvatarFallback className="bg-white/20 text-white text-sm">
          {activeStory.displayName.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-white text-sm font-semibold">{activeStory.displayName}</span>
        <span className="text-white/70 text-xs">{activeStory.stories[activeStoryIndex]?.timestamp}</span>
      </div>
    </div>
  </Link>

  <div className="flex items-center gap-2">
    <button onClick={closeStory} className="text-white p-1" data-testid="button-close-story">
      <X className="w-6 h-6" />
    </button>
  </div>
</div>

<div
  className="absolute bottom-24 left-0 right-0 px-4 z-50 pointer-events-auto"
  onClick={(e) => e.stopPropagation()}
  onMouseDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}
  onTouchEnd={(e) => e.stopPropagation()}
>
  <p className="text-white text-lg font-medium drop-shadow-lg whitespace-pre-wrap break-words">
    <MentionText
      text={activeStory.stories[activeStoryIndex]?.content}
      mentionClassName="text-white underline font-semibold cursor-pointer"
    />
  </p>
</div>

             {activeStory.userId !== CURRENT_USER_ID && (
                <div className="absolute bottom-4 left-0 right-0 px-3 flex items-center gap-2">
                 <div className="relative flex-1">
  <Input
    placeholder={`Rispondi a ${activeStory.displayName}...`}
    value={replyText}
    onChange={(e) => {
      const value = e.target.value;
      setReplyText(value);
      setIsReplying(value.trim().length > 0);
      handleStoryReplyTextChange(value, e.target.selectionStart || 0);
    }}
    onFocus={() => {
      setIsPaused(true);
      setIsReplyFocused(true);
    }}
    onBlur={() => {
      setIsPaused(false);
      setIsReplyFocused(false);
      setIsReplying(replyText.trim().length > 0);
    }}
    className="w-full bg-transparent border-white/30 text-white placeholder:text-white/50 rounded-full"
    data-testid="input-story-reply"
  />
  <MentionDropdown
    query={storyReplyMentionQuery}
    visible={showStoryReplyMentions}
    onSelect={(username) => {
      setReplyText(insertStoryReplyMention(replyText, username));
      closeStoryReplyMentions();
    }}
  />
</div>
                  {replyText.trim() ? (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={handleSendReply}
                      className="text-white"
                      data-testid="button-send-reply"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  ) : (
                    <Button
  variant="ghost"
  onClick={handleLikeStory}
  className="text-white flex items-center gap-1 px-2"
  data-testid="button-like-story"
>
  <Heart
    className={`w-6 h-6 ${
      activeStory?.stories[activeStoryIndex]?.likedByMe
        ? "fill-red-500 text-red-500"
        : ""
    }`}
  />
  <span className="text-sm">
    {activeStory?.stories[activeStoryIndex]?.likesCount ?? 0}
  </span>
</Button>
                  )}
                </div>
              )}

            <button
  onClick={prevStory}
  className="absolute left-0 top-16 bottom-36 w-1/3 z-10"
  data-testid="button-prev-story"
/>
<button
  onClick={nextStory}
  className="absolute right-0 top-16 bottom-36 w-2/3 z-10"
  data-testid="button-next-story"
/>

{activeStory.userId === CURRENT_USER_ID && activeStory.stories[activeStoryIndex]?.id && (
  <button
    onClick={() => deleteStoryMutation.mutate(activeStory.stories[activeStoryIndex].id)}
    className="absolute bottom-4 right-4 z-20 text-white bg-black/40 hover:bg-black/60 rounded-full p-3"
    data-testid="button-delete-story"
  >
    <Trash2 className="w-5 h-5" />
  </button>
)}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md" data-testid="dialog-add-story">
          <DialogHeader>
            <DialogTitle>Aggiungi una storia</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-story-image"
            />
            
            {previewImage ? (
              <div className="relative aspect-[9/16] max-h-[300px] rounded-md overflow-hidden bg-black">
                <img 
                  src={previewImage} 
                  alt="Anteprima" 
                  className="w-full h-full object-contain"
                />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setPreviewImage(null);
                    setSelectedFile(null);
                  }}
                  data-testid="button-remove-image"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-video rounded-md border-2 border-dashed border-muted-foreground/50 flex flex-col items-center justify-center gap-2 bg-muted/30 hover-elevate"
                data-testid="button-select-image"
              >
                <ImageIcon className="w-10 h-10 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Seleziona un'immagine</span>
              </button>
            )}
            
            <div className="relative">
  <Textarea
    placeholder="Scrivi qualcosa per la tua storia..."
    value={storyContent}
    onChange={(e) => {
      setStoryContent(e.target.value);
      handleStoryTextChange(e.target.value, e.target.selectionStart || 0);
    }}
    className="resize-none"
    rows={3}
    data-testid="input-story-content"
  />
  <MentionDropdown
    query={storyMentionQuery}
    visible={showStoryMentions}
    onSelect={(username) => {
      setStoryContent(insertStoryMention(storyContent, username));
      closeStoryMentions();
    }}
  />
</div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowAddDialog(false);
                  setPreviewImage(null);
                  setSelectedFile(null);
                  setStoryContent("");
                }}
                data-testid="button-cancel-story"
              >
                Annulla
              </Button>
              <Button
                className="flex-1"
                onClick={handlePublishStory}
                disabled={!selectedFile || isUploading || createStoryMutation.isPending}
                data-testid="button-publish-story"
              >
                {(isUploading || createStoryMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Pubblicando...
                  </>
                ) : (
                  "Pubblica"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PhotoComments({ photoId, photoAuthorId }: { photoId: number; photoAuthorId: number }) {
  const [newComment, setNewComment] = useState("");
  const CURRENT_USER_ID_LOCAL = getCurrentUserId();
  const { mentionQuery, showMentions, handleTextChange, insertMention, closeMentions } = useMention();

  const { data: comments = [], refetch } = useQuery<any[]>({
  queryKey: ["/api/photos", photoId, "comments", CURRENT_USER_ID_LOCAL],
  queryFn: async () => {
    const res = await fetch(`/api/photos/${photoId}/comments?userId=${CURRENT_USER_ID_LOCAL}`);
    return res.json();
  },
})

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    await apiRequest("POST", `/api/photos/${photoId}/comments`, {
      authorId: CURRENT_USER_ID_LOCAL,
      content: newComment.trim(),
    });
    setNewComment("");
    refetch();
  };

  return (
    <div className="border-t pt-3 mt-3 space-y-3">
     <div className="flex items-center gap-2">
  <div className="relative flex-1">
    <Input
      placeholder="Scrivi un commento..."
      value={newComment}
      onChange={e => {
        setNewComment(e.target.value);
        handleTextChange(e.target.value, e.target.selectionStart || 0);
      }}
      onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
      className="w-full"
    />
    <MentionDropdown
      query={mentionQuery}
      visible={showMentions}
      onSelect={(username) => {
        setNewComment(insertMention(newComment, username));
        closeMentions();
      }}
    />
  </div>
  <Button size="icon" onClick={handleSubmit} disabled={newComment.length === 0}>
    <Send className="w-4 h-4" />
  </Button>
</div>
      {comments.map((c: any) => (
        <div key={c.id} className="flex gap-2">
              <Link href={`/artist/${c.author_id}`}>
                <Avatar className="w-8 h-8 cursor-pointer flex-shrink-0">
                  {c.avatar_url && <AvatarImage src={c.avatar_url} alt={c.display_name} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">{c.display_name?.charAt(0)}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 bg-muted rounded-lg px-3 py-2">
                <p className="text-sm font-semibold">{c.display_name}</p>
                <p className="text-sm whitespace-pre-wrap break-words">
  <MentionText text={c.content} />
</p>
        <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">
                    {c.created_at && new Date(c.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div className="flex items-center gap-2">
         {(Number(c.author_id) === Number(CURRENT_USER_ID_LOCAL) || Number(photoAuthorId) === Number(CURRENT_USER_ID_LOCAL)) && (
  <button
    className="text-xs text-red-400 hover:text-red-600"
    onClick={async () => {
      await apiRequest("DELETE", `/api/photos/${photoId}/comments/${c.id}`);
      await refetch();
    }}
  >
    🗑️
  </button>
)}

<button
  className={`flex items-center gap-1 text-xs ${
    Number(c.author_id) === Number(CURRENT_USER_ID_LOCAL)
      ? "opacity-50 cursor-not-allowed text-muted-foreground"
      : c.likedByMe
        ? "text-red-500"
        : "text-muted-foreground hover:text-red-500"
  }`}
  disabled={Number(c.author_id) === Number(CURRENT_USER_ID_LOCAL)}
  onClick={async () => {
    if (c.likedByMe) {
      await apiRequest("POST", `/api/photos/${photoId}/comments/${c.id}/unlike/${CURRENT_USER_ID_LOCAL}`);
    } else {
      await apiRequest("POST", `/api/photos/${photoId}/comments/${c.id}/like/${CURRENT_USER_ID_LOCAL}`);
    }
    await refetch();
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
    );
}

function VideoComments({ videoId, videoAuthorId }: { videoId: number; videoAuthorId: number }) {
  const [newComment, setNewComment] = useState("");
  const CURRENT_USER_ID_LOCAL = getCurrentUserId();
  const { mentionQuery, showMentions, handleTextChange, insertMention, closeMentions } = useMention();

  const { data: comments = [], refetch } = useQuery<any[]>({
  queryKey: ["/api/videos", videoId, "comments", CURRENT_USER_ID_LOCAL],
  queryFn: async () => {
    const res = await fetch(`/api/videos/${videoId}/comments?userId=${CURRENT_USER_ID_LOCAL}`);
    return res.json();
  },
});

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    await apiRequest("POST", `/api/videos/${videoId}/comments`, {
      authorId: CURRENT_USER_ID_LOCAL,
      content: newComment.trim(),
    });
    setNewComment("");
    refetch();
  };

  return (
    <div className="border-t pt-3 mt-3 space-y-3">
     <div className="flex items-center gap-2">
  <div className="relative flex-1">
    <Input
      placeholder="Scrivi un commento..."
      value={newComment}
      onChange={e => {
        setNewComment(e.target.value);
        handleTextChange(e.target.value, e.target.selectionStart || 0);
      }}
      onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
      className="w-full"
    />
    <MentionDropdown
      query={mentionQuery}
      visible={showMentions}
      onSelect={(username) => {
        setNewComment(insertMention(newComment, username));
        closeMentions();
      }}
    />
  </div>
  <Button size="icon" onClick={handleSubmit} disabled={newComment.length === 0}>
    <Send className="w-4 h-4" />
  </Button>
</div>

      {comments.map((c: any) => (
        <div key={c.id} className="flex gap-2">
          <Link href={`/artist/${c.author_id}`}>
            <Avatar className="w-8 h-8 cursor-pointer flex-shrink-0">
              {c.avatar_url && <AvatarImage src={c.avatar_url} alt={c.display_name} />}
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {c.display_name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 bg-muted rounded-lg px-3 py-2">
            <p className="text-sm font-semibold">{c.display_name}</p>
            <p className="text-sm whitespace-pre-wrap break-words">
  <MentionText text={c.content} />
</p>

            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                {c.created_at && new Date(c.created_at).toLocaleDateString("it-IT", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>

              <div className="flex items-center gap-2">
                {(Number(c.author_id) === Number(CURRENT_USER_ID_LOCAL) || Number(videoAuthorId) === Number(CURRENT_USER_ID_LOCAL)) && (
                  <button
                    className="text-xs text-red-400 hover:text-red-600"
                    onClick={async () => {
                      await apiRequest("DELETE", `/api/videos/${videoId}/comments/${c.id}`);
                      refetch();
                    }}
                  >
                    🗑️
                  </button>
                )}

                <button
  className={`flex items-center gap-1 text-xs ${
    Number(c.author_id) === Number(CURRENT_USER_ID_LOCAL)
      ? "opacity-50 cursor-not-allowed text-muted-foreground"
      : c.likedByMe
        ? "text-red-500"
        : "text-muted-foreground hover:text-red-500"
  }`}
  disabled={Number(c.author_id) === Number(CURRENT_USER_ID_LOCAL)}
  onClick={async () => {
    if (c.likedByMe) {
      await apiRequest("POST", `/api/videos/${videoId}/comments/${c.id}/unlike`, { userId: CURRENT_USER_ID_LOCAL });
    } else {
      await apiRequest("POST", `/api/videos/${videoId}/comments/${c.id}/like`, { userId: CURRENT_USER_ID_LOCAL });
    }
    await refetch();
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
  );
}

function PostComments({ postId, postAuthorId }: { postId: number; postAuthorId: number }) {
  const { mentionQuery, showMentions, handleTextChange, insertMention, closeMentions } = useMention();
  const [newComment, setNewComment] = useState("");

  const { data: comments, isLoading } = useQuery<CommentWithAuthor[]>({
    queryKey: ["/api/posts", postId, "comments"],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postId}/comments?userId=${CURRENT_USER_ID}`);
      return res.json();
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/posts/${postId}/comments`, {
        authorId: CURRENT_USER_ID,
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "comments"] });
      setNewComment("");
    },
  });

  const handleSubmit = () => {
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t pt-3 mt-3 space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Scrivi un commento..."
            value={newComment}
            onChange={(e) => {
              setNewComment(e.target.value);
              handleTextChange(e.target.value, e.target.selectionStart || 0);
            }}
            onKeyDown={handleKeyPress}
            className="w-full"
            data-testid={`input-comment-${postId}`}
          />
          <MentionDropdown
            query={mentionQuery}
            visible={showMentions}
            onSelect={(username) => {
              setNewComment(insertMention(newComment, username));
              closeMentions();
            }}
          />
        </div>
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!newComment.trim() || addCommentMutation.isPending}
          data-testid={`button-submit-comment-${postId}`}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-2">
          Caricamento commenti...
        </div>
      ) : comments && comments.length > 0 ? (
       <div className="space-y-3 max-h-60 overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2" data-testid={`comment-${comment.id}`}>
              <Link href={`/artist/${comment.authorId}`}>
                <Avatar className="w-8 h-8 cursor-pointer">
                  {comment.author.avatarUrl && (
                    <AvatarImage src={comment.author.avatarUrl} alt={comment.author.displayName} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {comment.author.displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 bg-muted rounded-lg px-3 py-2">
                <p className="text-sm font-semibold">{comment.author.displayName}</p>
                <p className="text-sm whitespace-pre-wrap break-words">
  <MentionText text={comment.content} />
</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">
                    {comment.createdAt && new Date(comment.createdAt).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    {(comment.authorId === CURRENT_USER_ID || postAuthorId === CURRENT_USER_ID) && (
                      <button
                        className="text-xs text-red-400 hover:text-red-600"
                        onClick={async () => {
                          await apiRequest("DELETE", `/api/comments/${comment.id}`);
                          queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "comments"] });
                        }}
                      >🗑️</button>
                    )}
                  <button
                      className={`flex items-center gap-1 text-xs ${comment.authorId === CURRENT_USER_ID ? "opacity-50 cursor-not-allowed text-muted-foreground" : comment.likedByMe ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
                      disabled={comment.authorId === CURRENT_USER_ID}
                      onClick={async () => {
                        if (comment.likedByMe) {
                          await apiRequest("POST", `/api/comments/${comment.id}/unlike`, { userId: CURRENT_USER_ID });
                        } else {
                          await apiRequest("POST", `/api/comments/${comment.id}/like`, { userId: CURRENT_USER_ID });
                        }
                        await queryClient.refetchQueries({ queryKey: ["/api/posts", postId, "comments"] });
                      }}
                    >
                      <Heart className={`w-3 h-3 ${comment.likedByMe ? "fill-red-500" : ""}`} />
                      <span>{comment.likesCount ?? 0}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">
          Nessun commento ancora. Sii il primo a commentare!
        </p>
      )}
    </div>
  );
}

const searchableUsers: { id: number; username: string; displayName: string; genre: string | null; role: string }[] = [];

export default function Home() {
  const { toast } = useToast();
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const pendingLikesRef = useRef<Set<string>>(new Set());
  const likedPostsRef = useRef<Set<any>>(new Set());
  const [openComments, setOpenComments] = useState<Set<string | number>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [searchOpen, setSearchOpen] = useState(false);
const [searchQuery, setSearchQuery] = useState("");
const [searchResults, setSearchResults] = useState<typeof searchableUsers>([]);
const searchInputRef = useRef<HTMLInputElement>(null);

const filteredUsers = searchResults;

useEffect(() => {
  if (!searchOpen) return;
  const timer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&role=all`);
      const data = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    }
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery, searchOpen]);
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const { data: posts, isLoading } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/posts", CURRENT_USER_ID],
    queryFn: async () => {
      const res = await fetch(`/api/posts?userId=${CURRENT_USER_ID}`);
      return res.json();
    },
    refetchInterval: 30000,
    staleTime: 0,
  });

  useEffect(() => {
    if (posts && posts.length > 0) {
      const initial: Record<string, number> = {};
      posts.forEach((p: any) => {
        initial[String(p.id)] = p.likesCount ?? 0;
      });
      setLikeCounts(initial);
    }
  }, [posts]);

 const { data: likedPostIds = [], refetch: refetchLikes } = useQuery<(number | string)[]>({
    queryKey: ["/api/likes", CURRENT_USER_ID],
    queryFn: async () => {
      if (!posts) return [];
      const results = await Promise.all(
        posts.map(async (post) => {
  const isPhoto = String(post.id).startsWith("photo_");
  const isVideo = String(post.id).startsWith("video_");

  const url = isPhoto
    ? `/api/photos/${String(post.id).replace("photo_", "")}/liked/${CURRENT_USER_ID}`
    : isVideo
      ? `/api/videos/${String(post.id).replace("video_", "")}/liked/${CURRENT_USER_ID}`
      : `/api/posts/${post.id}/liked/${CURRENT_USER_ID}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.liked) return null;

  if (isPhoto) return `photo_${Number(String(post.id).replace("photo_", ""))}`;
  if (isVideo) return `video_${Number(String(post.id).replace("video_", ""))}`;
  return Number(post.id);
})
      );
      return results.filter(Boolean) as number[];
    },
    enabled: !!posts && posts.length > 0,
    staleTime: 0,
  });

useEffect(() => {
  const likedSet = new Set<string | number>();

 likedPostIds.forEach((id) => {
  if (typeof id === "string" && (id.startsWith("photo_") || id.startsWith("video_"))) {
    likedSet.add(id);
  } else {
    likedSet.add(Number(id));
  }
});

  setLikedPosts(likedSet as Set<any>);
  likedPostsRef.current = likedSet as Set<any>;
}, [likedPostIds]);
const toggleComments = (postId: number) => {
    const newOpen = new Set(openComments);
    if (newOpen.has(postId)) {
      newOpen.delete(postId);
    } else {
      newOpen.add(postId);
    }
    setOpenComments(newOpen);
  };
  
const handleLike = async (postId: string | number) => {
    const key = String(postId);
    if (pendingLikesRef.current.has(key)) return;
    pendingLikesRef.current.add(key);
    const isPhoto = String(postId).startsWith("photo_");
const isVideo = String(postId).startsWith("video_");

const isLiked = (isPhoto || isVideo)
  ? likedPostsRef.current.has(String(postId))
  : likedPostsRef.current.has(Number(postId));

if (isLiked) {
  if (isPhoto || isVideo) {
    likedPostsRef.current.delete(String(postId));
  } else {
    likedPostsRef.current.delete(Number(postId));
  }
} else {
  if (isPhoto || isVideo) {
    likedPostsRef.current.add(String(postId));
  } else {
    likedPostsRef.current.add(Number(postId));
  }
}
    const newLiked = new Set(likedPostsRef.current);
    setLikedPosts(newLiked);
    const currentCount = likeCounts[String(postId)] ?? (posts?.find(p => String(p.id) === String(postId))?.likesCount ?? 0);
    setLikeCounts(prev => ({
      ...prev,
      [String(postId)]: Math.max(0, currentCount + (isLiked ? -1 : 1))
    }));
   if (isPhoto) {
  const photoId = String(postId).replace("photo_", "");
  await apiRequest("POST", `/api/photos/${photoId}/${isLiked ? "unlike" : "like"}`, { userId: CURRENT_USER_ID });
} else if (isVideo) {
  const videoId = String(postId).replace("video_", "");
  await apiRequest("POST", `/api/videos/${videoId}/${isLiked ? "unlike" : "like"}`, { userId: CURRENT_USER_ID });
} else {
  await apiRequest("POST", `/api/posts/${postId}/${isLiked ? "unlike" : "like"}`, { userId: CURRENT_USER_ID });
}

await refetchLikes();
queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    pendingLikesRef.current.delete(key);
  };
  const handleShare = async (post: PostWithAuthor) => {
  const rawId = String(post.id);
  const shareType =
    rawId.startsWith("photo_")
      ? "photo"
      : rawId.startsWith("video_")
        ? "video"
        : "post";

  const shareId = shareType === "post" ? rawId : rawId.split("_")[1];
  const shareUrl = buildContentShareUrl(shareType, shareId);

  const shareTitle =
    shareType === "photo"
      ? `Foto di ${post.author.displayName}`
      : shareType === "video"
        ? `Video di ${post.author.displayName}`
        : `Post di ${post.author.displayName}`;

  const result = await shareVibyngContent({
    title: shareTitle,
    text: post.content || `${shareTitle} su Vibyng`,
    mediaUrl: post.mediaUrl ?? undefined,
    fallbackUrl: shareUrl,
    shareUrl,
    fileName: `${shareType}-${shareId}`,
  });

  if (result === "copied") {
    toast({
      title: "Contenuto copiato!",
      description: "Il link diretto è stato copiato negli appunti.",
    });
  }
};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <Music className="w-8 h-8 text-primary" />
          <span className="text-muted-foreground">Caricamento...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">Feed</h1>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setSearchOpen(!searchOpen)}
          data-testid="button-search"
        >
          <Search className="w-5 h-5" />
        </Button>
      </div>

      {searchOpen && (
        <Card className="p-3" data-testid="card-search">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Cerca utenti, artisti, generi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
              data-testid="input-search"
            />
            {searchQuery && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSearchQuery("")}
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <Link 
                  key={user.id} 
                  href={`/artist/${user.id}`}
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery("");
                  }}
                >
                  <div 
                    className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                    data-testid={`search-result-${user.id}`}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{user.displayName}</span>
                        {user.role === "artist" && (
                          <Badge variant="secondary" className="text-xs">Artista</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">@{user.username}</span>
                        {user.genre && (
                          <span className="text-xs text-muted-foreground">• {user.genre}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-center text-muted-foreground text-sm py-4">
                Nessun risultato per "{searchQuery}"
              </p>
            )}
          </div>
        </Card>
      )}

      <Stories />

      {posts?.map((post, index) => (
        <div key={post.id} className="contents">
          <Card className="overflow-visible" data-testid={`card-post-${post.id}`}>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Link href={`/artist/${post.authorId}`}>
                <Avatar className="w-14 h-14 cursor-pointer hover:ring-2 hover:ring-primary transition-all" data-testid={`avatar-author-${post.authorId}`}>
                  {post.author.avatarUrl && <AvatarImage src={post.author.avatarUrl} alt={post.author.displayName} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {post.author.displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/artist/${post.authorId}`}>
                    <span className="font-medium truncate cursor-pointer hover:text-primary transition-colors" data-testid={`text-author-${post.authorId}`}>
                      {post.author.displayName}
                    </span>
                  </Link>
                  {post.author.role === "artist" && (
                    <Badge variant="secondary" className="text-xs" data-testid={`badge-artist-${post.authorId}`}>
                      Artista
                    </Badge>
                  )}
                  {post.isExclusive && (
                    <Badge className="text-xs bg-primary" data-testid={`badge-exclusive-${post.id}`}>
                      Esclusivo
                    </Badge>
                  )}
                </div>
            <span className="text-xs text-muted-foreground">@{post.author.username}</span>
                  <span className="text-xs text-muted-foreground block">
                    {post.createdAt && (() => {
  const dateStr = post.createdAt.toString().replace(' ', 'T') + (post.createdAt.toString().includes('Z') ? '' : 'Z');
  return new Date(dateStr).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
})()}
                  </span>
            </div>
            {post.authorId === CURRENT_USER_ID && (
              <button className="text-xs text-red-400 hover:text-red-600 ml-auto self-start pt-1"
                onClick={async () => {
                  try {
                   if (String(post.id).startsWith("photo_")) {
                      const photoId = String(post.id).replace("photo_", "");
                      await apiRequest("DELETE", `/api/users/${CURRENT_USER_ID}/photos/${photoId}`);
                    } else {
                      await apiRequest("DELETE", `/api/posts/${post.id}`);
                    }
                    queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/users", CURRENT_USER_ID, "photos"] });
                    toast({ title: "Post eliminato" });
                  } catch {
                    toast({ title: "Errore", variant: "destructive" });
                  }
                }}
              >🗑️</button>
            )}
          </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm mb-3 whitespace-pre-wrap break-words" data-testid={`text-content-${post.id}`}>
  <MentionText text={post.content} />
</p>
              {post.mediaUrl && (
                <div className="mb-3 rounded-lg overflow-hidden">
                  {post.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img src={post.mediaUrl} alt="Post media" className="w-full max-h-80 object-cover" data-testid={`img-media-${post.id}`} />
                  ) : post.mediaUrl.match(/\.(mp4|webm|mov)$/i) ? (
                    <video src={post.mediaUrl} controls className="w-full max-h-80" data-testid={`video-media-${post.id}`} />
                  ) : post.mediaUrl.match(/\.(mp3|wav|ogg|m4a)$/i) ? (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                        <Music className="w-6 h-6 text-primary" />
                      </div>
                      <audio src={post.mediaUrl} controls className="flex-1" data-testid={`audio-media-${post.id}`} />
                    </div>
                  ) : (
                    <img src={post.mediaUrl} alt="Post media" className="w-full max-h-80 object-cover" data-testid={`img-media-${post.id}`} />
                  )}
                </div>
              )}
              <div className="flex items-center gap-1">
             <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleLike(String(post.id))}
                 className={(String(post.id).startsWith("photo_") || String(post.id).startsWith("video_")) ? (likedPosts.has(String(post.id) as any) ? "text-red-500" : "") : (likedPosts.has(Number(post.id)) ? "text-red-500" : "")}
                  data-testid={`button-like-${post.id}`}
                  key={`like-${post.id}-${likeCounts[String(post.id)] ?? post.likesCount}`}
                  disabled={post.authorId === CURRENT_USER_ID}
                >
                <Heart className={`w-4 h-4 ${(String(post.id).startsWith("photo_") || String(post.id).startsWith("video_")) ? (likedPosts.has(String(post.id) as any) ? "fill-red-500 text-red-500" : "") : (likedPosts.has(Number(post.id)) ? "fill-red-500 text-red-500" : "")}`} />
              <span className="text-xs ml-1">{likeCounts[String(post.id)] ?? post.likesCount ?? 0}</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => toggleComments(post.id)}
                  className={openComments.has(post.id) ? "text-primary" : ""}
                  data-testid={`button-comment-${post.id}`}
                >
                  <MessageCircle className={`w-4 h-4 ${openComments.has(post.id) ? "fill-current" : ""}`} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleShare(post)}
                  data-testid={`button-share-${post.id}`}
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>

             {openComments.has(post.id) && (
  String(post.id).startsWith("photo_") ? (
    <PhotoComments
      photoId={Number(String(post.id).replace("photo_", ""))}
      photoAuthorId={post.authorId}
    />
  ) : String(post.id).startsWith("video_") ? (
    <VideoComments
      videoId={Number(String(post.id).replace("video_", ""))}
      videoAuthorId={post.authorId}
    />
  ) : (
    <PostComments postId={post.id as number} postAuthorId={post.authorId} />
  )
)}
            </CardContent>
         </Card>
        </div>
      ))}
    </div>
  );
}
