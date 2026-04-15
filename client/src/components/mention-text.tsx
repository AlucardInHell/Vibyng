import { Fragment, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

type MentionTextProps = {
  text?: string | null;
  className?: string;
  mentionClassName?: string;
};

export function MentionText({
  text,
  className,
  mentionClassName,
}: MentionTextProps) {
  const safeText = text ?? "";
  const [, setLocation] = useLocation();

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const usernameToId = useMemo(() => {
    const map = new Map<string, number>();
    users.forEach((user) => {
      if (user.username) {
        map.set(user.username.toLowerCase(), user.id);
      }
    });
    return map;
  }, [users]);

  const parts = useMemo(() => {
    return safeText.split(/(@[A-Za-z0-9._-]+)/g);
  }, [safeText]);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (/^@[A-Za-z0-9._-]+$/.test(part)) {
          const username = part.slice(1).toLowerCase();
          const userId = usernameToId.get(username);

          if (userId) {
            const goToProfile = (e: React.SyntheticEvent) => {
              e.preventDefault();
              e.stopPropagation();
              setLocation(`/artist/${userId}`);
            };

            return (
              <span
                key={`${part}-${index}`}
                role="link"
                tabIndex={0}
                onClick={goToProfile}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    goToProfile(e);
                  }
                }}
                className={
                  mentionClassName ??
                  "text-primary hover:underline cursor-pointer"
                }
              >
                {part}
              </span>
            );
          }
        }

        return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
      })}
    </span>
  );
}
