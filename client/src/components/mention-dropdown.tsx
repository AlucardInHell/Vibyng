import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MentionDropdownProps {
  query: string;
  onSelect: (username: string) => void;
  visible: boolean;
}

export function MentionDropdown({ query, onSelect, visible }: MentionDropdownProps) {
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users/search", query],
    queryFn: async () => {
      if (query.length === 0) return [];
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&role=all`);
      return res.json();
    },
    enabled: visible && query.length >= 0,
  });

  if (!visible || users.length === 0) return null;

return (
  <div className="absolute bottom-full left-0 mb-2 z-[999] w-full max-h-48 overflow-y-auto rounded-lg border bg-background shadow-lg">
    {users.slice(0, 5).map((user: any) => (
      <button
        key={user.id}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left"
        onMouseDown={e => {
          e.preventDefault();
          onSelect(user.username);
        }}
      >
        <Avatar className="w-7 h-7">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.displayName} />}
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {user.displayName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{user.displayName}</p>
          <p className="text-xs text-muted-foreground">@{user.username}</p>
        </div>
      </button>
    ))}
  </div>
);
}
