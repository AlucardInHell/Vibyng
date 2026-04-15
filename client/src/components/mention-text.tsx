import { Fragment, useMemo } from "react";

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

  const parts = useMemo(() => {
    return safeText.split(/(@[A-Za-z0-9._-]+)/g);
  }, [safeText]);

  const handleMentionClick = async (
    e: React.MouseEvent<HTMLAnchorElement> | React.TouchEvent<HTMLAnchorElement>,
    rawMention: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const username = rawMention.replace(/^@/, "").trim().toLowerCase();
    if (!username) return;

    try {
      const res = await fetch(
        `/api/users/search?q=${encodeURIComponent(username)}&role=all`
      );
      const users = await res.json();

      const matchedUser = Array.isArray(users)
        ? users.find(
            (user: any) =>
              String(user.username || "").toLowerCase() === username
          )
        : null;

      if (matchedUser?.id) {
        window.location.assign(`/artist/${matchedUser.id}`);
      }
    } catch {}
  };

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (/^@[A-Za-z0-9._-]+$/.test(part)) {
          return (
            <a
              key={`${part}-${index}`}
              href="#"
              onClick={(e) => handleMentionClick(e, part)}
              onTouchEnd={(e) => handleMentionClick(e, part)}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className={
                mentionClassName ??
                "text-primary underline cursor-pointer"
              }
            >
              {part}
            </a>
          );
        }

        return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
      })}
    </span>
  );
}
