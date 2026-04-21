export type SharedContentType = "post" | "photo" | "video";

export type SharedContentMessagePayload = {
  type: "shared_content";
  contentType: SharedContentType;
  contentId: number | string;
  shareUrl: string;
  title: string;
  text?: string | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  authorId?: number | null;
  authorDisplayName?: string | null;
};

const SHARED_CONTENT_PREFIX = "__SHARED_CONTENT__";

export function serializeSharedContentMessage(payload: SharedContentMessagePayload): string {
  return `${SHARED_CONTENT_PREFIX}${JSON.stringify(payload)}`;
}

export function parseSharedContentMessage(
  content: string | null | undefined
): SharedContentMessagePayload | null {
  if (!content || !content.startsWith(SHARED_CONTENT_PREFIX)) return null;

  try {
    const parsed = JSON.parse(content.replace(SHARED_CONTENT_PREFIX, ""));
    return parsed?.type === "shared_content" ? parsed : null;
  } catch {
    return null;
  }
}
