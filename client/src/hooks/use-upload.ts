import { useState, useCallback } from "react";

interface UploadResponse {
  uploadURL: string;
  objectPath: string;
  metadata: { name: string; size: number; contentType: string };
}

interface UseUploadOptions {
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

export function useUpload(options: UseUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  const uploadFile = useCallback(async (file: File): Promise<UploadResponse | null> => {
    setIsUploading(true);
    setError(null);
    setProgress(0);
    try {
      setProgress(30);
      const imageData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX = 800;
            const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.7));
          };
          img.onerror = reject;
          img.src = reader.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setProgress(70);
      const response = await fetch("/api/uploads/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData }),
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      setProgress(100);
      const result: UploadResponse = {
        uploadURL: "",
        objectPath: data.objectPath,
        metadata: { name: file.name, size: file.size, contentType: file.type },
      };
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Upload failed");
      setError(error);
      options.onError?.(error);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [options]);

  const getUploadParameters = useCallback(async (file: any) => {
    return { method: "PUT" as const, url: "", headers: {} };
  }, []);

  return { uploadFile, getUploadParameters, isUploading, error, progress };
}
