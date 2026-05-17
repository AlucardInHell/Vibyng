type ShareVibyngContentInput = {
  title: string;
  text?: string | null;
  mediaUrl?: string | null;
  fallbackUrl?: string | null;
  shareUrl?: string | null;
  fileName?: string;
};

export function buildContentShareUrl(
  type: "post" | "photo" | "video",
  id: string | number
): string {
  const path = `/content/${type}/${id}`;
  return typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
}

export async function shareVibyngContent({
  title,
  text,
  mediaUrl,
  fallbackUrl,
  shareUrl,
  fileName,
}: ShareVibyngContentInput): Promise<"shared" | "copied" | "cancelled"> {

  const normalizedText = text?.trim() || title;
  const permalink = shareUrl?.trim() || fallbackUrl || mediaUrl;
  const shareText = [normalizedText, shareUrl].filter(Boolean).join("\n\n");
  const fallbackText = [normalizedText, permalink].filter(Boolean).join("\n\n");

  try {
    const { Share } = await import('@capacitor/share');
    await Share.share({
      title,
      text: fallbackText || normalizedText,
      url: shareUrl || fallbackUrl || undefined,
      dialogTitle: title,
    });
    return "shared";
  } catch (error: any) {
    if (error?.message?.includes("cancel") || error?.name === "AbortError") return "cancelled";
  }

  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await navigator.share({
        title,
        text: fallbackText || normalizedText,
        url: shareUrl || fallbackUrl || undefined,
      });
      return "shared";
    } catch (error: any) {
      if (error?.name === "AbortError") return "cancelled";
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(fallbackText || normalizedText);
    return "copied";
  }

  return "cancelled";
}
