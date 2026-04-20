import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, Heart, UserPlus, MessageCircle, Music, Check } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MentionText } from "@/components/mention-text";
import { useToast } from "@/hooks/use-toast";
import type { Notification } from "@shared/schema";
import { useState, useEffect } from "react";

function getCurrentUserId(): number {
  try {
    const stored = localStorage.getItem("vibyng-user");
    if (stored) return JSON.parse(stored).id || 1;
  } catch {}
  return 1;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "like": return <Heart className="w-4 h-4 text-red-500" />;
    case "follow": return <UserPlus className="w-4 h-4 text-primary" />;
    case "comment": return <MessageCircle className="w-4 h-4 text-blue-500" />;
    case "message": return <MessageCircle className="w-4 h-4 text-blue-500" />;
    case "new_post": return <Music className="w-4 h-4 text-primary" />;
    default: return <Bell className="w-4 h-4 text-muted-foreground" />;
  }
}

type StoryReplyNotificationPayload = {
  type: "story_reply_notification";
  senderName: string;
  storyId: number;
  storyImageUrl: string;
  storyContent: string;
  reply: string;
};

function parseStoryReplyNotification(message: string | null | undefined): StoryReplyNotificationPayload | null {
  if (!message || !message.startsWith("__STORY_REPLY_NOTIFICATION__")) return null;

  try {
    const parsed = JSON.parse(message.replace("__STORY_REPLY_NOTIFICATION__", ""));
    return parsed?.type === "story_reply_notification" ? parsed : null;
  } catch {
    return null;
  }
}

function timeAgo(date: Date | string | null): string {
  if (!date) return "";
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "adesso";
  if (diff < 3600) return `${Math.floor(diff / 60)}m fa`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h fa`;
  return `${Math.floor(diff / 86400)}g fa`;
}

export default function Notifications() {
  const userId = getCurrentUserId();
  const { toast } = useToast();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", userId],
    queryFn: async () => {
      const res = await fetch(`/api/notifications/${userId}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/notifications/${userId}/read-all`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
      toast({ title: "Tutte le notifiche segnate come lette" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest("POST", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
    },
  });

const [swipingId, setSwipingId] = useState<number | null>(null);
const [swipeStartX, setSwipeStartX] = useState(0);
const [swipeOffsets, setSwipeOffsets] = useState<Record<number, number>>({});
const [swipeStartY, setSwipeStartY] = useState(0);
const [isHorizontalSwipe, setIsHorizontalSwipe] = useState(false);

const deleteNotificationMutation = useMutation({
  mutationFn: async (notificationId: number) => {
    return apiRequest("DELETE", `/api/notifications/${notificationId}?userId=${userId}`);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
  },
});

const handleSwipeStart = (notificationId: number, clientX: number, clientY: number) => {
  setSwipingId(notificationId);
  setSwipeStartX(clientX);
  setSwipeStartY(clientY);
  setIsHorizontalSwipe(false);
};
  
const handleSwipeMove = (clientX: number, clientY: number) => {
  if (swipingId === null) return;

  const deltaX = clientX - swipeStartX;
  const deltaY = clientY - swipeStartY;

  if (!isHorizontalSwipe) {
    if (Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }

    if (Math.abs(deltaX) < 12 || Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }

    setIsHorizontalSwipe(true);
  }

  const nextOffset = Math.max(Math.min(deltaX, 0), -96);
  setSwipeOffsets((prev) => ({ ...prev, [swipingId]: nextOffset }));
};

  const handleSwipeEnd = (notificationId: number) => {
  const currentOffset = swipeOffsets[notificationId] ?? 0;

  if (isHorizontalSwipe && currentOffset <= -72) {
    setSwipeOffsets((prev) => ({ ...prev, [notificationId]: -96 }));
    deleteNotificationMutation.mutate(notificationId);
  } else {
    setSwipeOffsets((prev) => ({ ...prev, [notificationId]: 0 }));
  }

  setSwipingId(null);
  setSwipeStartX(0);
  setSwipeStartY(0);
  setIsHorizontalSwipe(false);
};
useEffect(() => {
  setSwipeOffsets({});
  setSwipingId(null);
  setSwipeStartX(0);
}, [notifications]);
  
const unreadCount = notifications.filter(n => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <Bell className="w-8 h-8 text-primary" />
          <span className="text-muted-foreground">Caricamento...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
     <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">Notifiche</h1>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <Check className="w-4 h-4 mr-1" />
            Segna tutte come lette
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <Bell className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground">Nessuna notifica</p>
          <p className="text-xs text-muted-foreground">Le tue notifiche appariranno qui</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
         {notifications.map((notification) => {
  const offset = swipeOffsets[notification.id] ?? 0;

  return (
    <div key={notification.id} className="relative overflow-hidden rounded-xl">
      <div className="absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-center text-white text-sm font-medium">
        Elimina
      </div>

      <div
        className="relative z-10"
        style={{
          transform: `translateX(${offset}px)`,
          transition: swipingId === notification.id ? "none" : "transform 0.2s ease",
        }}
        onTouchStart={(e) => handleSwipeStart(notification.id, e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => handleSwipeMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={() => handleSwipeEnd(notification.id)}
        onTouchCancel={() => handleSwipeEnd(notification.id)}
      >
        <Card
          className={`hover-elevate cursor-pointer transition-colors ${!notification.isRead ? "border-primary/30 bg-primary/5" : ""}`}
          onClick={() => {
            if (!notification.isRead) {
              markReadMutation.mutate(notification.id);
            }
          }}
        >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                 <div className="flex-1 min-w-0">
  {(() => {
    const storyReplyNotification = parseStoryReplyNotification(notification.message);

    if (storyReplyNotification) {
      return (
        <div className="space-y-2">
          <p className="text-sm">
            <span className="font-medium">{storyReplyNotification.senderName}</span> ha risposto alla tua storia
          </p>

          <div className="flex items-start gap-3">
            {storyReplyNotification.storyImageUrl && (
              <img
                src={storyReplyNotification.storyImageUrl}
                alt="Anteprima storia"
                className="w-14 h-20 rounded-md object-cover flex-shrink-0"
              />
            )}

            <div className="min-w-0">
             {storyReplyNotification.storyContent && (
  <p className="text-xs text-muted-foreground mb-1 whitespace-pre-wrap break-words">
    <MentionText text={storyReplyNotification.storyContent} />
  </p>
)}
              <p className="text-sm whitespace-pre-wrap break-words">
  <MentionText text={storyReplyNotification.reply} />
</p>
            </div>
          </div>
        </div>
      );
    }

   return (
  <p className="text-sm whitespace-pre-wrap break-words">
    <MentionText text={notification.message} />
  </p>
);
  })()}

  <span className="text-xs text-muted-foreground">
    {timeAgo(notification.createdAt)}
  </span>
</div>
                  {!notification.isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  )}
                </div>
              </CardContent>
           </Card>
      </div>
    </div>
  );
})}
        </div>
      )}
    </div>
  );
}
