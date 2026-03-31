import { useState, useCallback } from "react";

export function useMention() {
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const [showMentions, setShowMentions] = useState(false);

  const handleTextChange = useCallback((text: string, cursorPosition: number) => {
    const textBeforeCursor = text.substring(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    
    if (atIndex !== -1) {
      const query = textBeforeCursor.substring(atIndex + 1);
      if (!query.includes(" ") && query.length >= 0) {
        setMentionQuery(query);
        setMentionStart(atIndex);
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
    setMentionQuery("");
    setMentionStart(-1);
  }, []);

  const insertMention = useCallback((text: string, username: string) => {
    if (mentionStart === -1) return text;
    const before = text.substring(0, mentionStart);
    const after = text.substring(mentionStart + mentionQuery.length + 1);
    return `${before}@${username} ${after}`;
  }, [mentionStart, mentionQuery]);

  const closeMentions = useCallback(() => {
    setShowMentions(false);
    setMentionQuery("");
    setMentionStart(-1);
  }, []);

  return { mentionQuery, showMentions, handleTextChange, insertMention, closeMentions };
}
