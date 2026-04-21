import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Search } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { serializeSharedContentMessage, type SharedContentMessagePayload } from "@/lib/shared-content-message";
import type { User } from "@shared/schema";

function getCurrentUserId(): number {
  try {
    const stored = localStorage.getItem("vibyng-user");
    if (stored) return JSON.parse(stored).id || 1;
  } catch {}
  return 1;
}

type ShareToVibyngDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: SharedContentMessagePayload | null;
};

export function ShareToVibyngDialog({
  open,
  onOpenChange,
  payload,
}: ShareToVibyngDialogProps) {
  const CURRENT_USER_ID = getCurrentUserId();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: conversations = [] } = useQuery<User[]>({
    queryKey: ["/api/users", CURRENT_USER_ID, "conversations"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${CURRENT_USER_ID}/conversations`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const { data: searchedUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/search", searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&role=all`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open && searchQuery.trim().length >= 2,
  });

  const sendSharedContentMutation = useMutation({
    mutationFn: async (receiverId: number) => {
      if (!payload) throw new Error("Payload mancante");

      return apiRequest("POST", "/api/messages", {
        senderId: CURRENT_USER_ID,
        receiverId,
        content: serializeSharedContentMessage(payload),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/users", CURRENT_USER_ID, "conversations"] });
      toast({
        title: "Contenuto inviato",
        description: "Il contenuto è stato condiviso in chat.",
      });
      setSearchQuery("");
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Non è stato possibile inviare il contenuto.",
        variant: "destructive",
      });
    },
  });

  const list =
    searchQuery.trim().length >= 2
      ? searchedUsers.filter((user) => user.id !== CURRENT_USER_ID)
      : conversations.filter((user) => user.id !== CURRENT_USER_ID);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSearchQuery("");
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invia su Vibyng</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cerca un utente o una conversazione..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto space-y-2">
          {list.length > 0 ? (
            list.map((user) => (
              <button
                key={user.id}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                onClick={() => sendSharedContentMutation.mutate(user.id)}
                disabled={sendSharedContentMutation.isPending}
              >
                <Avatar className="w-10 h-10">
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.displayName} />}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user.displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                </div>

                <Send className="w-4 h-4 text-muted-foreground" />
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              {searchQuery.trim().length >= 2
                ? "Nessun utente trovato."
                : "Nessuna conversazione disponibile."}
            </p>
          )}
        </div>

        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Chiudi
        </Button>
      </DialogContent>
    </Dialog>
  );
}
