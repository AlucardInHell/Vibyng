type ShareVibyngContentInput = {
  title: string;
  text?: string | null;
  mediaUrl?: string | null;
  fallbackUrl?: string | null;
  shareUrl?: string | null;
  fileName?: string;
};

function getExtension(mediaUrl: string, mimeType: string) {
  const cleanUrl = mediaUrl.split("?")[0].split("#")[0];
  const fromUrl = cleanUrl.split(".").pop()?.toLowerCase();

  if (fromUrl && fromUrl.length <= 5) return fromUrl;

  if (mimeType.startsWith("image/")) return mimeType.replace("image/", "");
  if (mimeType.startsWith("video/")) return mimeType.replace("video/", "");
  if (mimeType.startsWith("audio/")) return mimeType.replace("audio/", "");

  return "bin";
}

async function fileFromUrl(mediaUrl: string, fileName?: string): Promise<File> {
  const response = await fetch(mediaUrl);
  if (!response.ok) throw new Error("Impossibile scaricare il file da condividere");

  const blob = await response.blob();
  const extension = getExtension(mediaUrl, blob.type || "");
  const finalName = fileName
    ? (fileName.includes(".") ? fileName : `${fileName}.${extension}`)
    : `vibyng-${Date.now()}.${extension}`;

  return new File([blob], finalName, {
    type: blob.type || undefined,
  });
}

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
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };

const normalizedText = text?.trim() || title;
const permalink = shareUrl?.trim() || fallbackUrl || mediaUrl;
const shareText = [normalizedText, shareUrl].filter(Boolean).join("\n\n");
const fallbackText = [normalizedText, permalink].filter(Boolean).join("\n\n");

  if (typeof navigator !== "undefined" && "share" in navigator && mediaUrl) {
    try {
      const file = await fileFromUrl(mediaUrl, fileName);

      if (!nav.canShare || nav.canShare({ files: [file] })) {
        await navigator.share({
          title,
          text: shareText || normalizedText,
          files: [file],
        });
        return "shared";
      }
    } catch {
      // fallback sotto
    }
  }

  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await navigator.share({
        title,
        text: fallbackText || normalizedText,
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
